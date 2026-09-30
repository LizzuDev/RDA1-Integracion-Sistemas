/**
 * Política de Privacidad — Módulo de Vuelos
 *
 * Página estática. Todo el contenido se renderiza como texto de React.
 * NO se usa dangerouslySetInnerHTML en ningun punto, por lo que esta pagina
 * no es vulnerable a XSS. Ver seccion 3 del FRONTEND_IMPLEMENTATION_PLAN.md.
 */
import { Link } from 'react-router-dom';

const SECCIONES = [
  {
    id: 'responsable',
    titulo: '1. Responsable del tratamiento',
    cuerpo: [
      'Booking Prototipo es una plataforma de reservas de vuelos, alojamiento, atracciones y vehiculos. El proyecto es el responsable del tratamiento de los datos personales aqui descritos.',
      'Frente a las aerolineas y a los proveedores de inventario, la plataforma actua como ENCARGADA: recibe los datos del usuario y los transmite unicamente para completar la reserva solicitada.',
    ],
  },
  {
    id: 'datos',
    titulo: '2. Datos que se recolectan',
    cuerpo: [
      'Para completar una reserva de vuelos, la plataforma trata las siguientes categorias de datos:',
    ],
    lista: [
      'Datos identificatorios: nombre, apellido, tipo y numero de documento de identidad o pasaporte de cada pasajero.',
      'Datos de contacto: correo electronico y numero de telefono.',
      'Fecha de nacimiento y nacionalidad, exigidas por las aerolineas y por las normas de seguridad aeroportuaria.',
      'Datos de la reserva: itinerarios, segmentos, asientos, preferencias de cabina y referencia de pago.',
    ],
    nota:
      'La plataforma NO almacena tarjetas de credito, numeros completos de tarjeta ni codigos de seguridad (CVV). El pago lo procesa exclusivamente la pasarela externa, y aqui solo se conserva una referencia opaca de la operacion.',
  },
  {
    id: 'finalidad',
    titulo: '3. Finalidad del tratamiento',
    cuerpo: ['Los datos personales se tratan con estas finalidades:'],
    lista: [
      'Gestionar la busqueda, la cotizacion, la emision y el seguimiento de la reserva.',
      'Transmitir a la aerolinea los datos indispensable para emitir el pasaje.',
      'Cumplir obligaciones legales, tributarias y regulatorias de seguridad aeruginosa.',
      'Atender solicitudes de soporte y postventa: cambios de fecha, equipaje, cancelaciones y reembolsos.',
    ],
  },
  {
    id: 'base-legal',
    titulo: '4. Base legal',
    cuerpo: ['El tratamiento se sustenta en las siguientes bases legales:'],
    lista: [
      'Consentimiento explicito del titular, otorgado en el Banner de Cookies y en la casilla de aceptacion de Terminos durante el pago.',
      'Ejecucion del contrato de reserva, del que el titular es parte.',
      'Cumplimiento de una obligacion legal o regulatoria.',
      'Interes legitimo, solo para la seguridad de la plataforma y la prevencion de fraude.',
    ],
  },
  {
    id: 'derechos',
    titulo: '5. Derechos del titular',
    cuerpo: [
      'El titular puede ejercer en cualquier momento los derechos de acceso, rectificacion, supresion y oposicion, asi como los de portabilidad y no tratamiento automatizado, conforme a la Ley Organica de Proteccion de Datos Personales (LOPDP) y su reglamento.',
      'Las solicitudes se atienden por los canales de atencion de la plataforma, dentro de los plazos previstos por la normativa. En pedidos de supresion que afecten a reservas ya emitidas pueden existir obligaciones legales de conservacion que impidan el borrado inmediato de ciertos registros.',
    ],
  },
  {
    id: 'seguridad',
    titulo: '6. Seguridad de la informacion',
    cuerpo: [
      'La plataforma aplica medidas tecnicas y organizativas razonables: transmision cifrada con TLS, control de acceso mediante OAuth2 y JWT con tokens de acceso de corta duracion, y aislamiento logico de los datos de cada usuario mediante Row Level Security en la base de datos.',
      'Ninguna medida es infalible. Si el usuario detecta un incidente que afecta a sus datos, debe notificarlo para que se adopten medidas correctivas.',
    ],
  },
  {
    id: 'cookies',
    titulo: '7. Cookies',
    cuerpo: [
      'La plataforma usa cookies con dos finalidades: mantener la sesion y preservar su seguridad mediante tokens, y medir el uso de forma agregada, esto ultimo solo si el usuario ha dado su consentimiento.',
      'El consentimiento puede retirarse en cualquier momento desde el enlace "Preferencias de cookies" del pie de pagina. Bloquear las cookies desde el navegador puede impedir el uso adecuado de la sesion.',
    ],
  },
  {
    id: 'menores',
    titulo: '8. Menores de edad',
    cuerpo: [
      'La plataforma se dirige a personas mayores de 18 anos. La reserva de pasajes para infantes se realiza solo a peticion de un adulto responsable, que actua como titular de la reserva y responde por la exactitud de los datos del menor.',
    ],
  },
];

export function PrivacidadPage() {
  return (
    <main className="main-content" id="contenido-principal">
      <article className="legal-doc">
        <header className="legal-doc-header">
          <h1 className="legal-doc-title">Politica de Privacidad</h1>
          <p className="legal-doc-meta">
            Ultima actualizacion: 1 de enero de 2026 · Version 1.0
          </p>
        </header>

        <nav className="legal-toc" aria-label="Indice de la Politica de Privacidad">
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
            {s.nota && (
              <p className="legal-callout">
                <strong>Importante:</strong> {s.nota}
              </p>
            )}
          </section>
        ))}

        <footer className="legal-doc-footer">
          <p>
            Consulta tambien nuestros <Link to="/terminos">Terminos de Uso</Link>.
          </p>
        </footer>
      </article>
    </main>
  );
}
