import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { LIMITES } from './chatbot.constants';

/**
 * Semáforo que limita cuántos turnos de chatbot se procesan a la vez.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO BASTA CON EL REINTENTO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Medido contra la API real: un turno consume ~2 500 tokens de prompt por llamada
 * y hace DOS llamadas (el bucle de tool-calling), o sea ~5 000 tokens por turno. El
 * plan gratuito de Groq admite 8 000 tokens por minuto.
 *
 * · Un turno a la vez: 5 000 de 8 000. Cabe, con margen.
 * · Tres a la vez: 15 000 de 8 000. No cabe.
 *
 * Lanzando tres peticiones simultáneas, las TRES fallaron con 429 aunque el
 * reintento funcionara bien. La razón es que la ventana del límite dura UN MINUTO
 * y los dos reintentos juntos duran como máximo 12 s: esperar 12 s dentro de una
 * ventana de 60 s no la libera. El reintento arregla solapamientos breves (un
 * doble clic, dos usuarios que coinciden un segundo); no arregla una demanda
 * sostenida por encima del presupuesto.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * QUÉ HACE ESTE SEMÁFORO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * En vez de dejar que las peticiones compitan y todas fallen, se serializan: el
 * segundo usuario espera unos segundos y recibe su respuesta. El recurso escaso
 * son los tokens, así que la espera cae sobre quien llega después, que es el
 * intercambio correcto.
 *
 * Con un plan de pago con margen, subir `CONCURRENCIA_CHAT` a 2 o 3 es todo lo que
 * hace falta y no hay que tocar nada más.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO ES UN `Semaphore` DE `rxjs` NI UNA DEPENDENCIA NUEVA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Por dos razones concretas, no por gusto:
 *
 *  1. El trabajo que se serializa es un `await` sobre HTTP, así que el semáforo
 *     tiene que vivir alrededor de un `await`. `rxjs` y sus operadores son
 *     síncronos para este caso; `p-limit` sería una dependencia nueva para unas
 *     40 líneas de lógica.
 *  2. Hace falta el conteo de la COLA para poder rechazar con un 503 honesto
 *     cuando se llena, y un semáforo de tres líneas no lo expone.
 */
@Injectable()
export class ChatbotConcurrencyGate {
  private readonly logger = new Logger(ChatbotConcurrencyGate.name);

  /** Turnos EJECUTÁNDOSE ahora mismo. Nunca supera `capacidad`. */
  private activos = 0;

  /** Turnos esperando turno, en orden de llegada. */
  private cola: Array<() => void> = [];

  private get capacidad(): number {
    return LIMITES.CONCURRENCIA_CHAT;
  }

  private get esperando(): number {
    return this.cola.length;
  }

  /**
   * Ejecuta `tarea` respetando el límite de concurrencia.
   *
   * Si no hay cupo, espera su turno en la cola. Si la cola está llena, rechaza
   * con 503: la alternativa —esperar indefinidamente— convertiría un límite de
   * recursos en una petición colgada, y el usuario no podría distinguir "roto" de
   * "lento".
   */
  async ejecutar<T>(tarea: () => Promise<T>): Promise<T> {
    await this.adquirir();

    try {
      return await tarea();
    } finally {
      // El `finally` es obligatorio y no un `then`: si la tarea lanza, el cupo
      // tiene que liberarse igual. Sin esto, un único error cerraría el semáforo
      // para el resto de la vida del proceso.
      this.liberar();
    }
  }

  /** Reserva un cupo, esperando en cola si no hay ninguno libre. */
  private adquirir(): Promise<void> | void {
    if (this.activos < this.capacidad) {
      this.activos += 1;
      return;
    }

    if (this.cola.length >= LIMITES.COLA_CHAT_MAX) {
      this.logger.warn(
        `Cola de chatbot llena (${this.cola.length}). Se rechaza el turno para no dejar ` +
          'una petición colgada indefinidamente.',
      );
      throw new ServiceUnavailableException(
        'El asistente está ocupado en este momento. Inténtalo en unos segundos.',
      );
    }

    this.logger.debug(
      `Sin cupo (${this.activos}/${this.capacidad}). Turno a la cola ` +
        `(${this.cola.length + 1}/${LIMITES.COLA_CHAT_MAX}).`,
    );

    return new Promise<void>((resolve) => {
      this.cola.push(resolve);
    });
  }

  /**
   * Libera un cupo y lo cede al primero de la cola.
   *
   * ── Por qué el relevo NO toca el contador ────────────────────────────────
   *
   * Cuando hay alguien esperando, el cupo simplemente CAMBIA DE DUEÑO: el
   * contador no se toca. Dos motivos, y ambos son errores reales que se
   * cometieron al escribirlo de la forma obvia:
   *
   * · Si se hiciera `activos--` y luego `siguiente()`, habría una ventana entre
   *   ambas operaciones en la que `activos` está por debajo de la capacidad, y
   *   otra llamada puede colarse por ahí. Es una carrera real: el semáforo se
   *   anularía justo en el instante de más concurrencia, que es cuando importa.
   *
   * · Si se hiciera `activos++` al despertar al siguiente (para compensar),
   *   cada relevo sumaría un cupo que nadie va a liberar, y `activos` crecería sin
   *   límite. Con 20 turnos en cola acabaría en 19 y el semáforo quedaría
   *   inutilizado para siempre. Lo detectó la prueba que cuenta el máximo de
   *   tareas simultáneas.
   *
   * El contador solo baja cuando el turno termina y NO hay nadie a quien cedérselo.
   */
  private liberar(): void {
    const siguiente = this.cola.shift();

    if (siguiente) {
      // El cupo ya estaba contado: lo hereda el siguiente. Cero cambios en `activos`.
      siguiente();
      return;
    }

    this.activos = Math.max(0, this.activos - 1);
  }

  /** Estado, para el endpoint de diagnóstico. */
  get estado(): { activos: number; esperando: number; capacidad: number } {
    return {
      activos: this.activos,
      esperando: this.cola.length,
      capacidad: this.capacidad,
    };
  }
}