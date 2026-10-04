/**
 * Boarding pass / pase de abordar de un ticket.
 *
 * ── Tres estados, no uno ────────────────────────────────────────────────────
 * `boleto.estado` es una maquina de estados de verdad (PENDING, ISSUING,
 * ISSUED, FAILED, VOIDED, REFUNDED) y el DDL obliga a que `ISSUED` y
 * "tiene numero de boleto + fecha de emision" sean la MISMA cosa:
 *
 *     CHECK ((bol_estado = 'ISSUED') = (bol_numeroboleto IS NOT NULL
 *                                         AND bol_fechaemision IS NOT NULL))
 *
 * Por eso el componente NO oculta el pase cuando no esta `ISSUED`: lo muestra
 * en estado atenuado con el estado real. Un usuario con un boleto en `ISSUING`
 * necesita saber que existe y en que estado, no un hueco.
 *
 * ── Accesibilidad ───────────────────────────────────────────────────────────
 * · Es una `<article>` con `aria-labelledby` propio: cada pase es un elemento
 *   navegable por teclado y localizable por un lector de pantalla.
 * · Los datos en monoespaciado (numero de boleto, cupon) se separan con
 *   espacios porque se dictan por telefono.
 * · El estado va en texto Y con color, nunca solo con color.
 */
const ESTADOS_ES = {
  PENDING: { texto: 'Pendiente de emisión', tono: 'pendiente' },
  ISSUING: { texto: 'En proceso de emisión', tono: 'proceso' },
  ISSUED: { texto: 'Emitido', tono: 'emitido' },
  FAILED: { texto: 'Emisión fallida', tono: 'fallido' },
  VOIDED: { texto: 'Anulado', tono: 'fallido' },
  REFUNDED: { texto: 'Reembolsado', tono: 'fallido' },
};

/** `2026-11-03T11:10:00.000Z` -> `11:10`. Trabaja sobre la cadena, no sobre un Date. */
function hora(iso) {
  if (!iso) return '--:--';
  const m = String(iso).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '--:--';
}

/** `2026-11-03T11:10:00.000Z` -> `03 nov`. */
function diaCorto(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${m[3]} ${meses[Number(m[2]) - 1]}`;
}

/**
 * @param ticket  El boleto de `GET /bookings/{id}/tickets`. Aporta numero de
 *                boleto, cupon, estado de emision y, si la reserva se compro con
 *                `assignedSeats`, la butaca.
 * @param pase    El pase de `GET /bookings/{id}/boarding-passes`, cuando ya hay
 *                check-in. Solo existe DESPUES del check-in, y es la unica fuente
 *                de la butaca definitiva y del codigo de barras: el boleto no los
 *                tiene.
 *
 * ── Por que el pase se pinta DENTRO del boleto y no aparte ────────────────────
 * Un pasaje real es un documento por pasajero y por segmento. Separar "boletos" y
 * "pases" en dos secciones obligaba al pasajero a cruzar dos listas mentalmente
 * para saber que va a volar y con que butaca. Ademas, mientras no haya check-in no
 * hay pase, y una seccion vacia al lado de una llena parece un fallo.
 *
 * Con el pase dentro, el pasaje se muestra con su butaca y su codigo en cuanto
 * existen, y sin ellos antes, con un aviso que explica por que.
 */
export function BoardingPass({ ticket, pase }) {
  if (!ticket) return null;

  const estado = ESTADOS_ES[ticket.status] ?? { texto: ticket.status, tono: 'pendiente' };
  const emitido = ticket.status === 'ISSUED';
  const segmento = ticket.segments?.[0];
  const conPase = Boolean(pase);

  return (
    <article
      className={`boarding boarding-${estado.tono} ${emitido ? 'es-emitido' : 'no-emitido'}`}
      aria-labelledby={`bp-${ticket.ticketId}`}
    >
      <header className="boarding-cabecera">
        <div>
          <span className="boarding-etiqueta">Pasaje de abordar</span>
          <h3 className="boarding-pasajero" id={`bp-${ticket.ticketId}`}>
            {ticket.passengerName}
          </h3>
        </div>
        <span className={`boarding-estado boarding-estado-${estado.tono}`}>
          {emitido ? '✓ ' : ''}
          {estado.texto}
        </span>
      </header>

      <div className="boarding-cuerpo">
        <div className="boarding-bloque boarding-bloque-ancho">
          <span className="boarding-dato-etiqueta">Pasajero</span>
          <span className="boarding-dato-valor">{ticket.passengerName}</span>
        </div>
        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Vuelo</span>
          <span className="boarding-dato-valor boarding-mono">
            {segmento?.flightNumber ?? '--'}
          </span>
        </div>
        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Fecha</span>
          <span className="boarding-dato-valor">
            {diaCorto(segmento?.departureAt) || '--'}
          </span>
        </div>

        <div className="boarding-ruta">
          <div className="boarding-aeropuerto">
            <span className="boarding-codigo">{segmento?.departureIataCode ?? '--'}</span>
            <span className="boarding-hora boarding-mono">{hora(segmento?.departureAt)}</span>
          </div>
          <div className="boarding-linea" aria-hidden="true">
            <span className="boarding-avion">✈</span>
            <span className="boarding-guion" />
          </div>
          <div className="boarding-aeropuerto">
            <span className="boarding-codigo">{segmento?.arrivalIataCode ?? '--'}</span>
            <span className="boarding-hora boarding-mono">{hora(segmento?.arrivalAt)}</span>
          </div>
        </div>

        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Nº de boleto</span>
          <span className="boarding-dato-valor boarding-mono boarding-destacado">
            {ticket.eTicketNumber ?? '—'}
          </span>
        </div>
        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Cupón</span>
          <span className="boarding-dato-valor boarding-mono">
            {segmento?.couponNumber ?? '—'}
          </span>
        </div>
        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Emitido</span>
          <span className="boarding-dato-valor">
            {ticket.issuedAt ? diaCorto(ticket.issuedAt) : '—'}
          </span>
        </div>
        <div className="boarding-bloque">
          <span className="boarding-dato-etiqueta">Segmento</span>
          <span className="boarding-dato-valor boarding-mono">{segmento?.status ?? '--'}</span>
        </div>
      </div>

      {/* ── Butaca y embarque: solo tras el check-in ─────────────────────────
          Vienen de `pase_abordar`, no del boleto. Se explica su ausencia en vez
          de dejar un "--" mudo: sin check-in no hay butaca, y el usuario tiene que
          saber que falta un paso, no que faltan datos. */}
      <div className="boarding-bloque boarding-bloque-ancho">
        {conPase ? (
          <>
            <span className="boarding-dato-etiqueta">
              Butaca · Embarque {pase.boardingGroup ?? '—'}
              {pase.boardingPosition ? ` · ${pase.boardingPosition}` : ''}
            </span>
            <span className="boarding-dato-valor boarding-mono boarding-destacado">
              {pase.seat} · {pase.barcodeType}
            </span>
            {/* El codigo de barras va como texto monoespaciado, no como imagen.
                Un lector de pantalla no puede leer un codigo de barras, y en el
                mostrador se teclea: el texto es lo util, y la maquina lo lee del
                papel que el usuario ya tiene. */}
            <span className="sr-only">
              Código de barras del pase: {pase.barcode}
            </span>
          </>
        ) : (
          <>
            <span className="boarding-dato-etiqueta">Butaca</span>
            <span className="boarding-dato-valor boarding-dato-pendiente">
              —
            </span>
          </>
        )}
      </div>

      {/* El talón: separacion punteada, como en un pasaje real. */}
      {emitido && conPase && (
        <div className="boarding-talon">
          <span className="boarding-talon-texto">
            Preséntese en el aeropuerto con este pasaje y su documento de viaje.
          </span>
        </div>
      )}
    </article>
  );
}
