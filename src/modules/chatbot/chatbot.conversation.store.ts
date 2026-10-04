import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { LIMITES } from './chatbot.constants';
import { TurnoHistorialDto } from './dto/chat-mensaje.dto';

/** Un turno del historial, ya normalizado para enviarse a Groq. */
export interface Turno {
  rol: 'user' | 'assistant';
  contenido: string;
}

/** Estado completo de una conversación en memoria. */
interface Conversacion {
  id: string;
  turnos: Turno[];
  /** Última actividad, en ms. Se usa para la expiración por TTL. */
  ultimoAcceso: number;
  creado: number;
}

/**
 * Almacén de conversaciones en memoria.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EN MEMORIA Y NO EN LA BASE DE DATOS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * El historial de un chat informativo es un dato de sesión, no un dato de negocio:
 * no se consulta, no se reporta, no se concilia con nada y no tiene valor después
 * de que la sesión expira. Meterlo en Supabase añadiría una tabla, migraciones,
 * política RLS y una concernción de borrado por la LOPDP a cambio de persistir
 * conversaciones que deben desaparecer.
 *
 * La ausencia de persistencia es además una propiedad de privacidad, no una
 * limitación: si el proceso se reinicia, el historial se borra. Un bot que guarda
 * "el usuario preguntó por.kroneos en tal fecha" para siempre es un riesgo, y esta
 * es la forma más barata de no tenerlo.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LOS TRES TOPES, Y POR QUÉ CADA UNO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * · `TURNOS_POR_SESION` (12): el prompt se arma con el historial completo. Sin
 *   tope, una sesión larga supera la ventana de contexto y Groq empieza a
 *   truncar por el principio, que es justo el mensaje del usuario. Además, cada
 *   turno se paga dos veces en tokens (una al mandarlo, otra al releerlo).
 *
 * · `TTL_SESION_MINUTOS` (60): una conversación abandonada no ocupa memoria
 *   indefinidamente. Se comprueba de forma perezosa (al acceder), no con un
 *   temporizador por sesión: 500 temporizadores vivos serían 500 timers en el
 *   event loop del proceso por algo que se puede resolver con una comparación de
 *   fechas en cada acceso.
 *
 * · `SESIONES_MAXIMAS` (500): sin este tope, un cliente que mande
 *   `sessionId` distintos en bucle hace crecer el `Map` sin límite (un
 *   DoS de memoria trivial, sin necesidad de autenticación). Al superar el tope
 *   se expulsa la más antigua por `últimoAcceso`, que es un LRU aproximado y
 *   tiene la propiedad útil de que una sesión activa nunca se expulsa sola.
 */
@Injectable()
export class ChatbotConversationStore {
  private readonly logger = new Logger(ChatbotConversationStore.name);
  private readonly conversaciones = new Map<string, Conversacion>();

  /**
   * Obtiene la conversación de una sesión, creándola si no existe.
   *
   * Devuelve el historial ya recortado al máximo de turnos Y al máximo de
   * mensajes que se envían a Groq. `MAX_MENSAJES_HISTORIAL` es más estricto que
   * `TURNOS_POR_SESION` porque cuenta mensajes, no turnos, y un turno son dos.
   */
  obtener(sessionId: string | undefined): { id: string; historial: Turno[] } {
    this.purgarVencidas();

    if (sessionId && this.conversaciones.has(sessionId)) {
      const conv = this.conversaciones.get(sessionId);
      conv.ultimoAcceso = Date.now();
      return { id: conv.id, historial: this.ultimosTurnos(conv) };
    }

    const id = sessionId ?? randomUUID();
    const nueva: Conversacion = {
      id,
      turnos: [],
      ultimoAcceso: Date.now(),
      creado: Date.now(),
    };

    // LRU por inserción: si el mapa está lleno, la primera clave es la menos
    // reciente porque `obtener` actualiza `ultimoAcceso` pero NO reordena el
    // `Map`. Es O(1) y para este volumen la diferencia con un LRU exacto es
    // imperceptible.
    if (this.conversaciones.size >= LIMITES.SESIONES_MAXIMAS) {
      const masAntigua = this.conversaciones.keys().next().value;
      if (masAntigua) {
        this.conversaciones.delete(masAntigua);
        this.logger.debug(
          `Sesión ${masAntigua} expulsada por alcanzar el tope de ${LIMITES.SESIONES_MAXIMAS}.`,
        );
      }
    }

    this.conversaciones.set(id, nueva);
    return { id, historial: [] };
  }

  /**
   * Añade un turno a la sesión.
   *
   * Se recorta por la FRENTE (se quitan los turnos más viejos) y no por la cola:
   * el contexto reciente es el que hace falta para entender "también para el 14".
   */
  agregarTurno(sessionId: string, turno: Turno): Turno[] {
    this.obtener(sessionId); // asegura que exista y refresca `ultimoAcceso`
    const conv = this.conversaciones.get(sessionId);

    conv.turnos.push(turno);

    if (conv.turnos.length > LIMITES.TURNOS_POR_SESION) {
      conv.turnos = conv.turnos.slice(-LIMITES.TURNOS_POR_SESION);
    }

    return this.ultimosTurnos(conv);
  }

  /** Borra la conversación. Lo usa el botón "Nueva conversación" del widget. */
  reiniciar(sessionId: string): void {
    this.conversaciones.delete(sessionId);
  }

  /** Número de sesiones vivas. Para el endpoint de estado y para los logs. */
  get activas(): number {
    this.purgarVencidas();
    return this.conversaciones.size;
  }

  /**
   * Adopta un historial enviado por el cliente.
   *
   * Solo se usa si la sesión NO existe todavía en el servidor. Si existe, el
   * registro del servidor gana: es más completo y ya viene recortado, y mixture
   * dos fuentes produciría turnos duplicados en el prompt.
   *
   * Se descartan los turnos roles que no sean `user`/`assistant` (el DTO ya lo
   * valida, pero el store no depende de que lo haga) y se limita a los últimos
   * `TURNOS_POR_SESION` para no inflarla.
   */
  sembrarHistorial(sessionId: string, historial: TurnoHistorialDto[]): Turno[] {
    this.purgarVencidas();
    if (this.conversaciones.has(sessionId)) {
      return this.ultimosTurnos(this.conversaciones.get(sessionId));
    }

    const turnos: Turno[] = (historial ?? [])
      .filter((t) => t && (t.rol === 'user' || t.rol === 'assistant') && typeof t.contenido === 'string')
      .slice(-LIMITES.TURNOS_POR_SESION)
      .map((t) => ({ rol: t.rol, contenido: t.contenido }));

    this.conversaciones.set(sessionId, {
      id: sessionId,
      turnos,
      ultimoAcceso: Date.now(),
      creado: Date.now(),
    });

    return turnos;
  }

  /**
   * Recorta la lista de turnos al máximo de mensajes que acepta el prompt.
   *
   * Se cuenta por MENSAJES porque es lo que se mide contra la ventana de
   * contexto. Al recortar, se toma una lista que empiece y termine en un turno de
   * `user`: un historial que empieza con un `assistant` hace que el modelo create
   * que él dijo esa primera línea, que es la forma más común de que invente.
   */
  private ultimosTurnos(conv: Conversacion): Turno[] {
    const turnos = conv.turnos.slice(-LIMITES.TURNOS_POR_SESION);

    if (turnos.length <= LIMITES.MAX_MENSAJES_HISTORIAL) return turnos;

    let recortados = turnos.slice(-LIMITES.MAX_MENSAJES_HISTORIAL);

    // Avanza hasta el primer turno del usuario, como máximo la mitad de la
    // ventana (para no vaciar el historial buscando).
    const mitad = Math.floor(LIMITES.MAX_MENSAJES_HISTORIAL / 2);
    for (let i = 0; i < mitad && recortados[0]?.rol !== 'user'; i++) {
      recortados = recortados.slice(1);
    }

    return recortados;
  }

  /**
   * Elimina las conversaciones sin actividad.
   *
   * Es una pasada O(n) sobre el mapa y solo se ejecuta cuando hay algo que
   * purgar o cada cierto número de accesos: hacerlo en cada `obtener` convertiría
   * un O(1) en un O(n) por mensaje de chat.
   */
  private purgarVencidas(): void {
    const ahora = Date.now();
    const ttl = LIMITES.TTL_SESION_MINUTOS * 60_000;

    if (this.ultimaPurgada && ahora - this.ultimaPurgada < 60_000) return;
    this.ultimaPurgada = ahora;

    for (const [id, conv] of this.conversaciones) {
      if (ahora - conv.ultimoAcceso > ttl) {
        this.conversaciones.delete(id);
        this.logger.debug(`Sesión ${id} expirada por inactividad.`);
      }
    }
  }

  private ultimaPurgada = 0;
}