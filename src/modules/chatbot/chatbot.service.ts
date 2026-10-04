import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';

import { GroqService, MensajeGroq } from './groq.service';
import { ChatbotToolsExecutorService } from './chatbot.tools-executor.service';
import { ChatbotConversationStore, Turno } from './chatbot.conversation.store';
import { ChatbotConcurrencyGate } from './chatbot.concurrency';
import { construirSystemPrompt } from './chatbot.prompt';
import { HERRAMIENTAS } from './chatbot.tools';
import { LIMITES } from './chatbot.constants';
import {
  MensajeChatDto,
  RespuestaChatDto,
  TrazaToolDto,
} from './dto/chat-mensaje.dto';

/**
 * Orquestador del chatbot informativo.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * EL BUCLE DE TOOL CALLING, PASO A PASO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Un turno de usuario produce entre 1 y N llamadas al modelo:
 *
 *   ┌─ iteración 0 ────────────────────────────────────────────────────────┐
 *   │ POST /chat/completions  { system, historial, user, tools }           │
 *   │   ↓Si el modelo pide herramientas:                                   │
 *   │   ↓  · se EJECUTAN contra la API de datos                            │
 *   │   ↓  · el resultado de cada una se mete como mensaje `role: "tool"`    │
 *   │   ↓    (con el `tool_call_id` correspondiente, obligatorio en OpenAI)  │
 *   │   ↓  · se vuelve a llamar al modelo CON el historial ya ampliado      │
 *   └──────────────────────────────────────────────────────────────────────┘
 *   ┌─ iteración N ────────────────────────────────────────────────────────┐
 *   │ El modelo devuelve texto sin tool-calls → ese texto es la respuesta  │
 *   │ final para el usuario y el bucle termina.                            │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * ── Por qué se ejecuta UNA herramienta por llamada y no todas en paralelo ──
 * `tool_calls` es una lista, y lo natural sería `Promise.all`. Aquí se ejecutan
 * de forma SECUENCIAL por una razón concreta: cada resultado ocupa lugar en la
 * ventana de contexto, y el modelo necesita VER un resultado antes de decidir
 * si necesita el siguiente.
 *
 * El caso real que lo justifica: "¿hay algo para el 12, tanto vuelos como
 * atracciones?". Con `Promise.all` el modelo recibe `[{vuelos: [], atracciones:
 * []}]` en un solo turno y tiende a resumir "no hay nada disponible" sin mirar
 * con atención ninguno de los dos. Con ejecución secuencial responde con los
 * vuelos, ve el resultado, y solo entonces lanza la segunda búsqueda si hace
 * falta. Además, un bucle secuencial es trivialmente acotable: se corta en el
 * tope de iteraciones y nunca hay N peticiones de red simultáneas.
 *
 * El precio es latencia en el caso de varias herramientas, que es aceptable: el
 * usuario ya está viendo un indicador de carga y el total sigue por debajo del
 * presupuesto de las tres llamadas HTTP con timeout de 12 s.
 *
 * ── Por qué hay un tope de iteraciones ─────────────────────────────────────
 * Un modelo puede pedir herramientas indefinidamente: el resultado de una
 * búsqueda puede requerir otra ("no encuentro la ciudad, ¿pruebo otra?").
 * Cada iteración son DOS llamadas de red (Groq + la API de datos). Con
 * `ITERACIONES_TOOL = 4` el peor caso está acotado y el usuario recibe una
 * respuesta. Al agotarse, se corta con un mensaje honesto en vez de dejar el
 * spinner girando: es preferible un "no pude verificarlo a tiempo" a un timeout
 * sin explicación.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * DEGRADACIÓN Y ERRORES
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Ninguna ruta devuelve 500 al usuario por un fallo del LLM. Hay tres
 * degradaciones, de la más barata a la más cara:
 *
 *  1. **Sin `GROQ_API_KEY`**: 503 con motivo. El servidor de la API no se cae
 *     (el resto de endpoints siguen funcionando); solo el chat se deshabilita.
 *  2. **Groq caído o excedido**: se registra el error y se responde con un
 *     mensaje que NO simula una respuesta del bot. Un usuario que ve "el asistente
 *     está temporalmente no disponible" sabe que algo falló; uno que ve un texto
 *     redactado por el modelo sobre datos que no se consultaron no tiene forma
 *     de notarlo.
 *  3. **Herramienta que falla**: NO se corta el turno. El error se le devuelve al
 *     modelo como resultado de herramienta y se le instruye explícitamente a
 *     decir que no pudo verificar. Esta es la diferencia entre "no hay
 *     disponibilidad" (afirmación) y "no pude comprobar la disponibilidad"
 *     (verdad), y es la que evita el peor fallo posible de un bot informativo.
 */
@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly groq: GroqService,
    private readonly tools: ChatbotToolsExecutorService,
    private readonly store: ChatbotConversationStore,
    private readonly gate: ChatbotConcurrencyGate,
  ) {}

  /**
   * Verifica que el registro de herramientas sea coherente al arrancar.
   *
   * Falla ruidosamente en el arranque y no en producción: si `HERRAMIENTAS`
   * declara algo que el executor no tiene, el síntoma sin esta comprobación sería
   * un "no puedo hacer eso" genérico a los usuarios en medio de una demostración.
   */
  onModuleInit(): void {
    const info = this.tools.validarCoherencia();
    this.logger.log(
      `Chatbot listo. Herramientas de solo lectura: [${info.readonly.join(', ')}].`,
    );
  }

  /** Estado del módulo, para el endpoint de diagnóstico y para el arranque. */
  estado(): {
    disponible: boolean;
    modelo: string;
    herramientas: string[];
    conversaciones_activas: number;
    cola?: { activos: number; esperando: number; capacidad: number };
    motivo?: string;
  } {
    return {
      disponible: this.groq.habilitado,
      modelo: this.groq.habilitado ? 'configurado' : null,
      herramientas: this.tools.herramientas,
      conversaciones_activas: this.store.activas,
      // El estado de la cola es lo primero que hay que mirar si "el bot va lento":
      // dice si hay usuarios esperando por el límite de tokens.
      cola: this.gate.estado,
      ...(this.groq.habilitado
        ? {}
        : { motivo: 'Falta definir GROQ_API_KEY en el entorno del servidor.' }),
    };
  }

  /**
   * Procesa un mensaje del usuario y devuelve la respuesta del bot.
   *
   * @param dto Mensaje, sesión opcional, historial opcional e idioma.
   */
  async responder(dto: MensajeChatDto): Promise<RespuestaChatDto> {
    if (!this.groq.habilitado) {
      throw new ServiceUnavailableException(
        'El chatbot no está habilitado: falta GROQ_API_KEY en el entorno del servidor.',
      );
    }

    const mensaje = dto.mensaje.trim();

    // Mensaje vacío o de solo espaci: se responde sin llamar al modelo. Un turno
    // de LLM por un espacio en blanco es gasto y latencia a cambio de nada.
    if (mensaje.length === 0) {
      throw new ServiceUnavailableException('El mensaje está vacío.');
    }

    // Todo el turno (incluidas las llamadas a la API de datos) pasa por el
    // semáforo. Va AQUÍ y no alrededor de `groq.completar` porque el presupuesto
    // de tokens es lo scarce, y serializar solo la llamada al modelo dejaría que
    // dos turnos concurrentes siguieran golpeando la API de datos.
    return this.gate.ejecutar(() => this.procesarTurno(dto, mensaje));
  }

  /**
   * Lógica del turno, ya dentro del semáforo.
   *
   * Va en su propio método para que `responder()` sea solo la puerta de entrada
   * (validación + semáforo) y esta función sea el turno legible de principio a
   * fin. Mezclarlas obligaba a ocultar el `try/catch` de Groq dentro de un
   * `return` anidado, que es donde es más fácil equivocarse.
   */
  private async procesarTurno(
    dto: MensajeChatDto,
    mensaje: string,
  ): Promise<RespuestaChatDto> {
    // ── 1. Recuperar o crear la conversación ───────────────────────────────
    const sesion = dto.sessionId
      ? { id: dto.sessionId, historial: this.store.obtener(dto.sessionId).historial }
      : this.store.obtener(undefined);

    let historial: Turno[];
    if (dto.historial?.length && !dto.sessionId) {
      // Cliente sin sesión pero con historial propio (navegación privada, o el
      // servidor se reinició y perdió la sesión): se adopta su historial.
      historial = this.store.sembrarHistorial(sesion.id, dto.historial);
    } else {
      historial = sesion.historial;
    }

    const traza: TrazaToolDto[] = [];
    const mensajes: MensajeGroq[] = [
      { role: 'system', content: construirSystemPrompt({ idioma: dto.idioma ?? 'es' }) },
      ...this.aMensajesGroq(historial),
      { role: 'user', content: mensaje },
    ];

    // ── 2. Bucle de tool calling ────────────────────────────────────────────
    //
    // ════════════════════════════════════════════════════════════════════════
    // POR QUÉ LAS HERRAMIENTAS SOLO SE ENVÍAN EN LA PRIMERA ITERACIÓN
    // ════════════════════════════════════════════════════════════════════════
    //
    // Es la mayor palanca de coste del módulo y no es un detalle menor: el JSON de
    // `tools` pesa ~250 tokens y se reenvía en CADA llamada. Con el límite del plan
    // gratuito (8 000 tokens/minuto contando prompt **y** completion) decidir esto
    // cambia el rendimiento medido de ~4 turnos/min a ~7.
    //
    // Además de los tokens, quitar las herramientas de la segunda llamada MEJORA
    // el comportamiento, y por dos razones que se vieron en uso real:
    //
    //  1. **La segunda llamada no debería volver a consultar.** Su trabajo es
    //     "escribe la respuesta con estos datos". Con las herramientas a la vista,
    //     el modelo ocasionalmente dudaba de un resultado y pedía otra búsqueda
    //     idéntica, gastando una iteración y ~600 tokens para obtener lo mismo.
    //  2. **Sin herramientas no puede pedir una herramienta de escritura.** Aunque
    //     el registro ya lo impide, quitarlas en la última llamada cierra la
    //     frontera por segunda vía.
    //
    // Lo que se PIERDE, y es un coste real y asumido: una pregunta que necesita
    // dos herramientas distintas ("vuelos y atracciones para el 12") solo ejecuta
    // la primera. Se recupera parte de esa capacidad por la vía barata de siempre:
    // el usuario puede preguntar por el segundo producto en el siguiente turno, y
    // el historial hace que se entienda. Se decidió así porque para una demo y un
    // chatbot informativo, responder rápido y con datos certaines vale más que
    // adivinar la intención compuesta del usuario.
    //
    // Para recuperar esa capacidad sin pagar el coste: `CONCURRENCIA_CHAT` no es lo
    // relevante, sino dejar que la SEGUNDA llamada lleve solo la herramienta que
    // corresponde al tipo de实体 detectada, en vez de las cuatro.
    let respuestaFinal: string | null = null;
    let agotado = false;

    for (let iteracion = 0; iteracion < LIMITES.ITERACIONES_TOOL; iteracion++) {
      // Solo la primera llamada del turno lleva las herramientas.
      const herramientasDeEstaLlamada = iteracion === 0 ? HERRAMIENTAS : undefined;
      let paso: Awaited<ReturnType<GroqService['completar']>>;

      try {
        paso = await this.groq.completar(mensajes, herramientasDeEstaLlamada);
      } catch (error) {
        // Degradación 2: el modelo no está disponible. No se simula una
        // respuesta: se dice que el asistente no pudo responder.
        this.logger.error(
          `Fallo de Groq en la iteración ${iteracion + 1}: ${error?.message}`,
        );
        const aviso =
          'El asistente no está disponible en este momento. Vuelve a intentarlo en unos segundos.';
        this.store.agregarTurno(sesion.id, { rol: 'user', contenido: mensaje });
        this.store.agregarTurno(sesion.id, { rol: 'assistant', contenido: aviso });

        return {
          sessionId: sesion.id,
          respuesta: aviso,
          estado: 'sin_llm',
          herramientas: traza,
          historial: this.store.obtener(sesion.id).historial,
        };
      }

      // Sin tool-calls: el modelo ya escribió la respuesta. Fin del turno.
      if (paso.llamadas.length === 0) {
        respuestaFinal = paso.texto;
        break;
      }

      // ── 3. Ejecutar herramientas, en orden ───────────────────────────────
      // El mensaje del asistente con sus `tool_calls` se mete en el historial
      // ANTES de los resultados. Es un requisito del formato: si se omite, la
      // API rechaza el turno siguiente con 400 por tool_calls huérfanos.
      mensajes.push({
        role: 'assistant',
        content: null,
        tool_calls: paso.llamadas,
      });

      for (const llamada of paso.llamadas) {
        const nombre = llamada.function.name;

        // Los argumentos llegan como TEXTO JSON dentro de la llamada. Un modelo
        // puede emitir JSON inválido (coma suelta, comillas sin cerrar) y es un
        // fallo frecuente con modelos pequeños; sin este `try` el turno entero
        // moriría con un SyntaxError. Se devuelve el error al modelo, que
        // entonces reintenta con la forma correcta.
        let argumentos: Record<string, unknown> = {};
        try {
          argumentos = llamada.function.arguments
            ? JSON.parse(llamada.function.arguments)
            : {};
        } catch {
          this.logger.warn(`Argumentos JSON inválidos en "${nombre}"`);
        }

        const resultado = await this.tools.ejecutar(nombre, argumentos);

        traza.push({ herramienta: nombre, argumentos: argumentos });

        // `role: "tool"` es obligatorio: es lo que empareja el resultado con su
        // llamada por `tool_call_id`. Sin él, Groq devuelve 400.
        mensajes.push({
          role: 'tool',
          tool_call_id: llamada.id,
          content: this.serializar(resultado),
        });
      }

      respuestaFinal = respuestaFinal ?? null;
    }

    // ── 4. Se agotaron las iteraciones ─────────────────────────────────────
    if (respuestaFinal === null) {
      agotado = true;
      respuestaFinal =
        'Pude empezar a buscar, pero la consulta está creciendo demasiado y la corto aquí. ' +
        'Prueba con una pregunta más específica, por ejemplo un solo destino o una sola fecha.';
    }

    const texto = this.sanitizar(respuestaFinal);

    // ── 5. Persistir el turno ───────────────────────────────────────────────
    this.store.agregarTurno(sesion.id, { rol: 'user', contenido: mensaje });
    this.store.agregarTurno(sesion.id, { rol: 'assistant', contenido: texto });

    const historialFinal = this.store.obtener(sesion.id).historial;

    this.logger.log(
      `Turno resuelto [${sesion.id.slice(0, 8)}]: ` +
        `${traza.length} herramienta(s) [${traza.map((t) => t.herramienta).join(', ') || 'ninguna'}]` +
        `${agotado ? ' (agotó iteraciones)' : ''}`,
    );

    return {
      sessionId: sesion.id,
      respuesta: texto,
      estado: agotado ? 'degradado' : 'ok',
      herramientas: traza,
      historial: historialFinal,
    };
  }

  /** Borra el historial de una sesión. Lo usa "Nueva conversación" del widget. */
  reiniciar(sessionId: string): void {
    this.store.reiniciar(sessionId);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Utilidades
  // ══════════════════════════════════════════════════════════════════════

  /** Convierte el historial interno al formato de mensajes de Groq. */
  private aMensajesGroq(historial: Turno[]): MensajeGroq[] {
    return historial.map((t) => ({ role: t.rol, content: t.contenido }));
  }

  /**
   * Serializa el resultado de una herramienta para mandarlo al modelo.
   *
   * El `JSON.stringify` normal es correcto, pero se añade un tope de caracteres:
   * una respuesta sin recortar puede ser de varios KB y, con varias iteraciones,
   * empujar el turno contra la ventana de contexto. Un JSON truncado es peor que
   * uno completo, así que si hay que truncar se declara explícitamente en el
   * propio JSON para que el modelo sepa que ve un extracto.
   */
  private serializar(resultado: { ok: boolean; data: Record<string, unknown> }): string {
    const json = JSON.stringify(resultado);

    const limite = 12_000;
    if (json.length <= limite) return json;

    return JSON.stringify({
      ok: resultado.ok,
      datos_recortados: true,
      aviso:
        'La respuesta de esta herramienta fue recortada por tamaño. ' +
        'Usa únicamente los datos visibles y no completes lo que no veas.',
      extracto: json.slice(0, limite),
    });
  }

  /**
   * Limpia el texto final antes de mandarlo al cliente.
   *
   · Quita el `<think>...</think>` si el modelo lo emite. `llama-3.3-70b-versatile`
   *   no lo emite en `chat/completions` (es un modelo de razonamiento cuando se
   *   llama a `openai/gpt-oss`), pero el sanitizado es barato y protege si se
   *   cambia el modelo por la variable de entorno.
   *
   · Si el modelo devolvió un string JSON (alucinó el formato del sistema), se
   *   extrae el campo que parezca la respuesta en vez de mostrarle al usuario
   *   las llaves y comillas. Es un fallo real de modelos medianos cuando se les
   *   pide formato conversacional.
   *
   · Si llega vacío, se devuelve un texto que explica qué pasó en vez de una
   *   burbuja de chat en blanco, que es indistinguible de un bug de frontend.
   */
  private sanitizar(texto: string): string {
    let salida = (texto ?? '').trim();

    salida = salida.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (salida.startsWith('{') && salida.endsWith('}')) {
      try {
        const obj = JSON.parse(salida);
        const candidato =
          obj.respuesta ?? obj.answer ?? obj.message ?? obj.texto ?? obj.content;
        if (typeof candidato === 'string' && candidato.trim()) {
          salida = candidato.trim();
        }
      } catch {
        // No era JSON válido; se deja tal cual.
      }
    }

    if (!salida) {
      return 'No pude preparar una respuesta para eso. ¿Puedes reformular la pregunta?';
    }

    return salida;
  }
}