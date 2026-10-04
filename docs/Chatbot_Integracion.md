# Chatbot informativo (Groq + Function Calling)

Módulo de consulta que responde preguntas de disponibilidad de **vuelos, autos y
atracciones** consultando la API de este mismo proyecto. Es **100 % informativo**:
no crea reservas, no procesa pagos y no modifica ningún dato.

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│  ChatbotFlotante.jsx  (componente global, minimizado)           │
│        │  POST /api/v1/chatbot/mensaje                           │
└────────┼─────────────────────────────────────────────────────────┘
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND (NestJS) — src/modules/chatbot/                        │
│                                                                  │
│  chatbot.controller.ts    HTTP + Swagger                         │
│  chatbot.service.ts       bucle de tool-calling, historial      │
│  chatbot.concurrency.ts   semáforo (1 turno a la vez)           │
│  chatbot.conversation.store.ts  historial en memoria            │
│  groq.service.ts          cliente HTTP de Groq                  │
│  chatbot.tools.ts         DEFINICIÓN de las 6 herramientas      │
│  chatbot.tools-executor   EJECUCIÓN contra la API + normaliz.   │
│  chatbot.prompt.ts        system prompt (fecha + catálogo)       │
└────────┼─────────────────────────────────────────────────────────┘
         │  HTTP  (axios, baseURL = CHATBOT_API_BASE_URL)
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  API DE DATOS (la misma, por HTTP)                              │
│  POST /api/v1/vuelos/search                                     │
│  POST /api/v1/autos/search                                      │
│  GET  /api/v1/atracciones                                       │
│  GET  /api/v1/atracciones/:id/availability                      │
│  GET  /api/v1/vuelos/flights/:numero/status                     │
│  GET  /api/v1/atracciones/health                                │
└──────────────────────────────────────────────────────────────────┘
```

### Por qué el bot consume la API por HTTP y no importa los módulos de Nest

Es una decisión deliberada, no una comodidad:

- **Reproduce la condición real de uso.** El bot es un cliente más de la API,
  igual que lo sería un integrador externo. No tiene acceso privilegiado al
  TypeORM.
- **Desacopla el chatbot de las entidades.** Si `Auto` cambia de tabla o
  `Vuelo` renombra una columna, este módulo no se entera.
- **Permite moverlo sin tocar código.** Apuntando `CHATBOT_API_BASE_URL` a una
  URL externa, el bot funciona como proceso separado (que es el paso natural hacia
  la arquitectura por microservicios del Reto 2).

El coste es una llamada HTTP extra dentro del propio proceso, irrelevante frente
a la latencia de Groq.

---

## 2. Endpoints

| Método | Ruta                            | Descripción                          |
|--------|---------------------------------|--------------------------------------|
| `POST` | `/api/v1/chatbot/mensaje`       | Envía un mensaje y recibe la respuesta |
| `POST` | `/api/v1/chatbot/nueva-conversacion` | Reinicia el historial            |
| `GET`  | `/api/v1/chatbot/estado`        | Diagnóstico (credencial, cola, herramientas) |
| `GET`  | `/api/v1/chatbot/alcance`       | Qué puede y qué no puede hacer       |

### `POST /chatbot/mensaje`

```jsonc
{
  "mensaje": "¿Hay vuelos de Quito a Guayaquil el 6 de octubre?",
  "sessionId": "a1b2c3d4-...",   // opcional; el cliente lo genera y lo persiste
  "idioma": "es",                 // opcional: "es" | "en" (por defecto "es")
  "historial": [ /* opcional, solo si no hay sessionId */ ]
}
```

Respuesta:

```jsonc
{
  "sessionId": "a1b2c3d4-...",
  "respuesta": "Hay un vuelo disponible de Quito (UIO) a Guayaquil (GYE)...",
  "estado": "ok",                       // ok | degradado | sin_llm
  "herramientas": [                      // traza: de dónde salió cada dato
    { "herramienta": "consultar_vuelos",
      "argumentos": { "origen": "UIO", "destino": "GYE", "fecha": "2026-10-06" } }
  ],
  "historial": [ /* ... */ ]
}
```

`herramientas` está en la respuesta a propósito: es la evidencia de que la
respuesta viene de los datos y no del modelo. Sirve para depurar y para
demostrarlo en una defensa.

---

## 3. Variables de entorno

```ini
# Obligatoria. Sin ella el servidor ARRANCA igual y solo el chat devuelve 503.
GROQ_API_KEY=gsk_...

# Modelo. `llama-3.3-70b-versatile` ya NO existe en Groq (404) y no admite
# tool-calling estable: no usarlo.
GROQ_MODEL=openai/gpt-oss-120b

# low | medium | high. Solo modelos gpt-oss.
GROQ_REASONING=low

# Base de la API que consulta el bot. Por defecto, el propio servidor.
# CHATBOT_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

**Comprobar que está bien configurado:**

```bash
curl http://localhost:3000/api/v1/chatbot/estado
```

```json
{
  "disponible": true,
  "herramientas": ["catalogo_destinos", "consultar_vuelos", "..."],
  "cola": { "activos": 0, "esperando": 0, "capacidad": 1 }
}
```

Si `disponible` es `false`, viene con `motivo`. El resto de la API sigue
funcionando: el módulo no tumba el servidor por una variable ausente.

---

## 4. Herramientas (solo lectura)

| Herramienta | Endpoint que consume |
|---|---|
| `catalogo_destinos` | — (catálogo local `DESTINOS`) |
| `consultar_vuelos` | `POST /vuelos/search` |
| `consultar_autos` | `POST /autos/search` |
| `consultar_atracciones` | `GET /atracciones` |
| `consultar_disponibilidad_atraccion` | `GET /atracciones/:id/availability` |
| `estado_vuelo` | `GET /vuelos/flights/:numero/status` |

### Cómo se garantiza que es de solo lectura

**No es una instrucción del prompt.** El prompt dice que no reserve, y el modelo
lo obedece casi siempre; eso es una sugerencia, no una garantía. La garantía es
de **control de acceso**:

1. Las herramientas se declaran en un único array (`chatbot.tools.ts`).
2. El executor construye su mapa de ejecución **a partir de ese mismo array**.
3. Si un nombre no está en el array, no hay función a la que llamar: el modelo
   puede pedir `crear_reserva` y lo que obtiene es un error que dice que esa
   herramienta no existe, con la lista real para que se corrija.

Añadir una herramienta de escritura obliga a tocar `chatbot.tools.ts`, y ese
toque es visible en el diff. Además `onModuleInit` verifica que lo declarado y lo
implementado coincidan y **falla al arrancar** si no.

Los tests `frontera de solo lectura` bloquean el regreso si alguien añade una
herramienta de escritura.

### Cómo se evita que invente datos

El riesgo real de un bot así no es que diga tonterías, sino que diga algo
**indistinguible de la verdad**. Las defensas:

| Riesgo | Defensa |
|---|---|
| Traducir "Cuenca" a un IATA equivocado | `DESTINOS` es la fuente de verdad; el executor lo **recalcula** antes de llamar a la API. Un IATA inventado daría `totalOffers: 0`, indistinguible de "no hay vuelos". |
| Elegir una fecha que el usuario no dijo | Sin fecha válida, `consultar_vuelos` **no busca**: devuelve un error que instruye preguntar. Nunca devuelve "la primera disponible". |
| Fecha inexistente (`2026-02-31`) | Se valida contra el calendario antes de salir. Si llegara a Postgres, volvería como "no hay disponibilidad". |
| Inventar un `id` de atracción | `consultar_disponibilidad_atraccion` exige el `id` real devuelto por `consultar_atracciones`. Un id falso da error, que no es "no hay cupos". |
| Decir "no hay" cuando la API falló | El error se distingue de "sin resultados" y se le instruye decir **"no se pudo verificar"**. |
| Citar campos internos del JSON | Cada herramienta devuelve un resumen con solo lo que el bot puede decir en voz alta. |

---

## 5. Límite de tasa: lo que hay que saber antes de la demostración

**Medido contra la API real**, no estimado:

- Un turno consume **~2 500 tokens de prompt por llamada** y hace **2 llamadas**
  (el bucle de tool-calling), o sea **~5 000 tokens por turno**.
- El plan gratuito de Groq admite **8 000 tokens por minuto**.

Consecuencia: el plan gratuito soporta **un turno a la vez, más o menos**.

Qué hace el código para esto:

1. **Reintento ante 429** (`groq.service.ts`). Groq dice cuántos segundos
   esperar en el mensaje (`Please try again in 3.3s`) y se respeta ese número.
   Arregla solapamientos breves: doble clic, dos usuarios que coinciden un
   segundo.
2. **Semáforo de concurrencia** (`chatbot.concurrency.ts`). Un turno a la vez;
   los demás esperan en cola. Comprobado lanzando 3 peticiones simultáneas:
   - sin semáforo: **0 de 3** respondían;
   - con semáforo: **2 de 3** respondían (y el tercero ya excede el techo).

**Para una demostración o un uso real con varias personas, hay que subir de
plan en [console.groq.com](https://console.groq.com/settings/billing).** Es un
límite del proveedor, no del código: no hay forma de servir 3 turnos/min con 8 000
tokens/min.

Con plan de pago, subir `LIMITES.CONCURRENCIA_CHAT` a 2–3 es todo lo que hace
falta.

---

## 6. Frontend

### Archivos

- `frontend/src/components/ChatbotFlotante.jsx` — el componente
- `frontend/src/components/chatbot.css` — estilos
- `frontend/src/services/chatbotApi.js` — cliente HTTP + `sessionId` persistente

Ya está montado en `App.jsx`, por encima del router visual. No hay que hacer nada
más para que aparezca en todas las pantallas.

### Comportamiento visual

- **Minimizado** (por defecto): óvalo de **44 × 44 px** en la esquina inferior
  derecha. 44 px es el objetivo táctil mínimo de las WCAG 2.2 (2.5.8): diminuto
  no significa inaccesible.
- **Hover o clic**: se despliega el panel (360 × 560 px). Es el mismo contenedor
  con otra clase, así que no hay salto visual entre "botón" y "cabecera".
- **Salida del puntero**: se repliega tras 12 s de inactividad, **solo si no hay
  nada escrito a medias**.

Ese último matiz es la diferencia entre "molesto" y "no estorba": un
`onMouseLeave` que cerrase en seco rompería la escritura cada vez que el ratón se
mueve hacia el campo de texto.

### Accesibilidad

- Botón real (`<button>`), alcanzable con Tab. No un `div` con `onClick`.
- `aria-live="polite"` en el área de mensajes; `aria-expanded` en el lanzador.
- Panel cerrado con `visibility: hidden` + `inert`: sale del árbol de
  accesibilidad y del orden de tabulación.
- `prefers-reduced-motion` desactiva transiciones y animaciones.
- `prefers-contrast: more` refuerza bordes.
- `Enter` envía, `Shift+Enter` salta de línea.

### Idioma

El componente lee `language` del `LanguageContext` y lo mapea a `es` / `en` (el
backend solo redacta esos dos). El bot responde en el mismo idioma que la
interfaz.

### Sesión

El `sessionId` se genera una vez y se guarda en `localStorage`
(`booking_chatbot_session`). Sin eso, recargar la página borraría la conversación
a mitad y el bot perdería el contexto. "Nueva conversación" **rota** el id en vez
de vaciarlo: el backend guarda el historial por sesión, y reutilizar el id con la
lista vacía dejaría al modelo hablando solo.

---

## 7. Historial

Se guarda **en memoria del proceso**, no en la base de datos:

- No se consulta, no se reporta, no se concilia: es estado de sesión.
- No persistirlo es además una **propiedad de privacidad**, no una carencia: si el
  proceso se reinicia, el historial se borra. Un bot que guarda "este usuario
  preguntó por X tal fecha" para siempre es un riesgo bajo la LOPDP.

Tres topes, cada uno con su motivo:

| Tope | Valor | Por qué |
|---|---|---|
| Turnos por sesión | 12 | Acota la ventana de contexto y el gasto en tokens. |
| TTL de sesión | 60 min | Sesión abandonada no ocupa memoria. Purgado perezoso, no con 500 timers. |
| Sesiones vivas | 500 | Sin tope, mandar `sessionId` distintos en bucle hace crecer el `Map` sin límite: un DoS de memoria trivial y sin autenticación. |

Al recortar, la lista **empieza siempre en un turno del usuario**. Un historial
que empieza con `assistant` hace que el modelo crea que él dijo esa línea, que es
la forma más común de que invente una respuesta completa.

---

## 8. Pruebas

```bash
npx jest src/modules/chatbot
```

47 pruebas. Las que importan de verdad:

- **Frontera de solo lectura**: ninguna herramienta es de escritura; el registro
  declarado y el implementado coinciden; los nombres inventados se rechazan.
- **Normalización**: ciudad fuera de catálogo, fecha inexistente, fecha ausente,
  `id` de atracción inventado.
- **Bucle**: ejecución de herramienta, inserción del mensaje `role: "tool"` con su
  `tool_call_id` (si se omite, Groq devuelve 400), argumentos JSON inválidos, corte
  por iteraciones, degradación sin 500.
- **Reintento 429**: reintenta, respeta los segundos que indica Groq, **no**
  reintenta un 401 ni un 400, se rinde en vez de bucear, y no filtra la clave.
- **Semáforo**: serializa, libera el cupo al fallar, rechaza con 503 si la cola se
  llena, y nunca supera la capacidad (ni en el relevo de cupo).

---

## 9. Errores reales encontrados al integrarlo

Se documentan porque explican por qué el código es como es:

1. **`llama-3.3-70b-versatile` ya no existe en Groq.** Devuelve 404. El modelo
   pedido no era usable y no se habría detectado sin llamar a la API. Ahora es
   `openai/gpt-oss-120b`.
2. **`GET /atracciones` no acepta `cities` ni `dates`.** Su DTO solo declara
   `page` y `limit`, y el `ValidationPipe` global corre con
   `forbidNonWhitelisted`. Mandarlos daba 400. El filtro por ciudad se aplica
   ahora en el bot, sobre el campo `ciudad` de los datos normalizados.
3. **El reintento era código muerto.** `unaVez` traducía el 429 a
   `ServiceUnavailableException` *antes* de que la capa de reintento la viera, y
   esa excepción no lleva `response.status`. El reintento nunca se ejecutaba y
   ninguna prueba de integración lo detectó, porque la petición sí salía. Ahora
   la traducción ocurre arriba del todo, ya descartado el reintento.
4. **La clave se filtraba en los mensajes de error.** `traducirError` incrustaba
   el mensaje crudo de axios, que puede traer el `Authorization` o la clave. Hay
   un sanitizador y un test que lo comprueba.
5. **El semáforo no limitaba nada.** Incrementaba `activos` también para las tareas
   en cola, así que no serializaba; y en el relevo sumaba un cupo que nadie
   liberaba. Detectado por un test que cuenta el máximo de tareas simultáneas.

---

## 10. Qué queda fuera

- **El módulo de autos no tiene datos.** `relation "autos" does not exist` en la
  base actual: `AutosService.search` falla con 500. Es un problema previo del
  proyecto, no del chatbot. El bot lo maneja como corresponde: dice *"No se pudo
  verificar la disponibilidad"* en vez de *"no hay autos"*.
- **Solo español e inglés.** El `LanguageContext` tiene 12 idiomas; el bot cae en
  inglés para el resto. Añadir un idioma es un `case` más en `TEXTOS` del
  componente y una plantilla más en `chatbot.prompt.ts`.
- **Idempotencia de `POST /vuelos/search`.** El servicio persiste ofertas, así que
  una consulta repetida actualiza filas existentes en vez de duplicarlas (tiene
  `UNIQUE (ofe_offerid)`). El bot no necesita clave de idempotencia porque no
  muta nada, pero conviene saberlo si algún día se le da esa capacidad.
