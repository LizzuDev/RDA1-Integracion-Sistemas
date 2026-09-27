/**
 * Terminos de Uso — Modulo de Vuelos
 *
 * Pagina estatica. Todo el contenido se renderiza como texto de React, sin
 * dangerouslySetInnerHTML. Ver seccion 3 del FRONTEND_IMPLEMENTATION_PLAN.md.
 */
import { Link } from 'react-router-dom';

const SECCIONES = [
  {
    id: 'aceptacion',
    titulo: '1. Aceptacion de los terminos',
    cuerpo: [
      'Al marcar la casilla de aceptacion durante el proceso de pago, o al utilizar la plataforma, el usuario declara haber leido, comprendido y aceptado estos Terminos de Uso junto con la Politica de Privacidad.',
      'Si el usuario no esta de acuerdo con alguno de estos terminos, no debe utilizar la plataforma. El uso continuo del servicio implica la aceptacion integra de las condiciones aqui recogidas.',
    ],
  },
  {
    id: 'servicio',
    titulo: '2. Descripcion del servicio',
    cuerpo: [
      'Booking Prototipo ofrece busqueda, cotizacion y reserva de pasajes de avion, asi como alojamiento, atracciones y alquiler de vehiculos.',
      'La plataforma es un intermediario. La relacion contractual de transporte es entre el usuario y la aerolinea que opera el vuelo. La plataforma facilita la informacion, manages la reserva y acts como intermediario en el cobro.',
    ],
  },
  {
    id: 'reservas',
    titulo: '3. Reservas y confirmacion',
    cuerpo: [
      'Una reserva se considera confirmada unicamente cuando la plataforma emite el pasaje y receives la confirmacion correspondiente. Las reservas pueden estar sujetas a un proceso asincrono de emision, en cuyo caso la plataforma informara al usuario cuando se complete.',
      'Los datos que el usuario proporciona deben ser exactos y verificables. Cualquier error en el nombre, el documento o la fecha de nacimiento puede dar lugar a la denegacion del embarque por parte de la aerolinea o de la autoridad de migracion, sin responsabilidad para la plataforma.',
    ],
  },
  {
    id: 'precios',
    titulo: '4. Precios y pagos',
    cuerpo: [
      'Los precios mostrados en la plataforma se expresan en la moneda indicada en cada oferta e incluyen los impuestos y tasas aplicados por el sistema, salvo indicacion expresa en contrario.',
      'El procesamiento de pagos es responsabilidad de la pasarela de pago externa. La plataforma no almacena datos de tarjetas. La reserva queda sujeta a la autorizacion efectiva del pago.',
      'Si el pago no se autoriza, la reserva no llega a confirmarse y el cupo retenido se libera de forma automatica.',
    ],
  },
  {
    id: 'cambios',
    titulo: '5. Cambios, cancelaciones y reembolsos',
    cuerpo: [
      'Las condiciones de cambio, cancelacion y reembolso dependen de la tarifa contratada y de las reglas de la aerolinea. El sistema muestra la cotizacion antes de confirmar cualquier operacion.',
      'Toda cancelacion esta sujeta a una cotizacion previa con vigencia limitada. Superado el plazo de vigencia, la cotizacion deja de ser valida y debera solicitarse una nueva. El importe del reembolso depende de las penalizaciones asociadas a la tarifa.',
    ],
  },
  {
    id: 'equipaje',
    titulo: '6. Equipaje y servicios adicionales',
    cuerpo: [
      'El equipaje incluido y las condiciones de este dependen de la tarifa y de la aerolinea. Las maletas adicionales contratadas a traves de la plataforma se rigen por las mismas condiciones de cambio y cancelacion que el pasaje.',
    ],
  },
  {
    id: 'uso',
    titulo: '7. Uso aceptable de la plataforma',
    cuerpo: [
      'El usuario se compromete a no utilizar la plataforma para actividades ilicitas, ni a intentar acceder a cuentas ajenas, ni a realizar consultas automatizadas que sobrecarguen el servicio.',
      'La plataforma se reserva el derecho de suspender el acceso en caso de uso abusivo o actividad fraudulenta, sin prejudice de las medidas legales que correspondan.',
    ],
  },
  {
    id: 'disponibilidad',
    titulo: '8. Disponibilidad y cambios en el servicio',
    cuerpo: [
      'Los horarios, precios y disponibilidad de los vuelos dependen de los sistemas de las aerolineas y pueden cambiar en cualquier momento. Una oferta puede dejar de ser valida antes de su fecha de expiracion.',
      'La plataforma puede modificar, suspender o discontinuar cualquier parte del servicio, procurando reducir el impacto sobre las reservas ya confirmadas.',
    ],
  },
  {
    id: 'responsabilidad',
    titulo: '9. Limitacion de responsabilidad',
    cuerpo: [
      'La plataforma no responde por cambios de horario, cancelaciones, sobreventa ni perturbaciones del servicio causadas por la aerolinea, que son materia del contrato de transporte entre el usuario y la aerolinea.',
      'La responsabilidad de la plataforma se limita al importe efectivamente pagado por los servicios contratados, salvo dolo o culpa grave.',
    ],
  },
  {
    id: 'ley',
    titulo: '10. Legislacion aplicable',
    cuerpo: [
      'Estos terminos se rigen por la legislacion vigente del Ecuador. Cualquier controversia se sometera a los jutices competentes de la ciudad de Guayaquil, renunciando las partes a otro fuero que pudiera corresponderles por sus domicilios presentes o futuros.',
    ],
  },
];

export function TerminosPage() {
  return (
    <main className="main-content" id="contenido-principal">
      <article className="legal-doc">
        <header className="legal-doc-header">
          <h1 className="legal-doc-title">Terminos de Uso</h1>
          <p className="legal-doc-meta">
            Ultima actualizacion: 1 de enero de 2026 · Version 1.0
          </p>
        </header>

        <nav className="legal-toc" aria-label="Indice de los Terminos de Uso">
          <h2 className="legal-toc-title">Contenido</h2>
          <ol className="legal-toc-list">
            {SECCIONES.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.titulo}</a>
              </li>
            ))}
          </ol>
        </nav>

        {SECCIONES.map((s) => (
          <section key={s.id} className="legal-section" id={s.id}>
            <h2 className="legal-section-title">{s.titulo}</h2>
            {s.cuerpo.map((p, i) => (
              <p key={i} className="legal-p">
                {p}
              </p>
            ))}
            {s.lista && (
              <ul className="legal-list">
                {s.lista.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <footer className="legal-doc-footer">
          <p>
            Consulta tambien nuestra{' '}
            <Link to="/privacidad">Politica de Privacidad</Link>.
          </p>
        </footer>
      </article>
    </main>
  );
}
