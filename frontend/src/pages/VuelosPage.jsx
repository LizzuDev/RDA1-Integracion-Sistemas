import { useCallback, useState } from 'react';
import { FormularioBusquedaVuelos } from '../components/FormularioBusquedaVuelos';
import { VueloGroupCard } from '../components/VueloGroupCard';
import { ResumenViaje } from '../components/ResumenViaje';
import { FormularioReserva } from '../components/FormularioReserva';
import { crearHold, agregarEquipaje } from '../services/vuelosApi';
import { PantallaReservaConfirmada } from '../components/PantallaReservaConfirmada';
import { formatearFecha, obtenerHuellaDispositivo } from '../services/formato';
import { buscarVuelos } from '../services/vuelosApi';

/**
 * Pagina de Busqueda de Vuelos (Fase 4) + Bloqueo de Cupos (Fase 6).
 *
 * ── Endpoint ────────────────────────────────────────────────────────────────
 * Llama a `POST /vuelos/search`, NO a `GET /offers`: ese endpoint no existe en
 * `contracts/vuelos-openapi.yaml`. Las unicas rutas `/offers/*` del contrato son
 * `/offers/{offerId}/seatmap`, `/offers/hold` y `/offers/hold/{holdId}`.
 *
 * Nota de enrutado: el prefijo `/vuelos` se mantiene en TODAS las rutas aunque el
 * contrato las declare en la raiz (`POST /search`, `/offers/hold`). Es una
 * decision del Auditor: el contrato asume un microservicio de vuelos solo, y este
 * proyecto es un monolito modular que tambien sirve Atracciones y Autos, donde
 * `/search` en la raiz colisionaria.
 */
export function VuelosPage() {
  const [resultados, setResultados] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busquedaActiva, setBusquedaActiva] = useState(null);
  const [ofertaAbierta, setOfertaAbierta] = useState(null);
  const [holdActivo, setHoldActivo] = useState(null);
  const [creandoHold, setCreandoHold] = useState(false);
  const [reserva, setReserva] = useState(null);

  // ── NOTA: ningun `return` ANTES de la ultima llamada a un hook ─────────────
  // Este `return` estaba antes de los `useCallback` de mas abajo, y React
  // fallaba con el error minificado #300: en el primer render se ejecutaban
  // tres hooks y en los siguientes (con `reserva` ya puesta) no se ejecutaba
  // ninguno. React exige que el numero de hooks sea el MISMO en cada render,
  // porque los guarda en un array por posicion; saltarselo cambia el orden de
  // la memoria interna.
  //
  // Regla general: todos los hooks arriba, y a partir de ahi se puede devolver
  // lo que haga falta.

  async function manejarBusqueda(criterios) {
    setCargando(true);
    setError(null);
    setBusquedaActiva(criterios);

    try {
      const respuesta = await buscarVuelos(criterios, obtenerHuellaDispositivo());
      setResultados(respuesta);
    } catch (fallo) {
      setResultados(null);
      // ProblemDetails del contrato: { code, title, detail, status }.
      const cuerpo = fallo?.response?.data;
      setError({
        status: fallo?.response?.status ?? null,
        code: cuerpo?.code ?? null,
        title: cuerpo?.title ?? 'No se pudo completar la busqueda',
        detail: cuerpo?.detail ?? fallo?.message ?? null,
      });
    } finally {
      setCargando(false);
    }
  }

  const ofertas = resultados?.offers ?? [];

  // Agrupar ofertas por número de vuelo para el diseño de acordeón moderno
  const ofertasAgrupadas = Object.values(
    ofertas.reduce((acc, oferta) => {
      // Usamos los números de vuelo de todos los segmentos como clave de agrupación
      const key = oferta.itineraries?.[0]?.segments?.map(s => s.flightNumber).join('-');
      if (!acc[key]) acc[key] = [];
      acc[key].push(oferta);
      return acc;
    }, {})
  );

  // `useCallback` para que el `onSeleccionar` que se pasa a cada tarjeta sea
  // estable: si fuera una funcion nueva en cada render, las tarjetas del
  // grid se re-renderizarian cada vez que cambiara cualquier estado.
  const abrirBloqueo = useCallback((oferta, tarifa) => setOfertaAbierta({oferta, tarifa}), []);
  const cerrarBloqueo = useCallback(() => setOfertaAbierta(null), []);

  const confirmarResumen = useCallback(async (oferta, tarifa) => {
    setCreandoHold(true);
    setError(null);
    try {
      // El UUID lo creamos inline para idempotencia de esta transaccion
      const clave = crypto.randomUUID();
      const cabina = tarifa?.cabinClass || oferta.itineraries[0]?.pricingOptions[0]?.cabinClass || 'ECONOMY';
        const marca = tarifa?.fareBrand || 'STANDARD';
      const itinerarioId = oferta.itineraries[0]?.itineraryId;

      const respuesta = await crearHold(
        {
          offerId: oferta.offerId,
          itinerarySelections: [
            {
              itineraryId: itinerarioId,
              cabinClass: cabina,
              fareBrand: marca,
            },
          ],
          passengersBreakdown: busquedaActiva?.passengers,
        },
        clave,
        obtenerHuellaDispositivo(),
      );
      setHoldActivo(respuesta);
    } catch (error) {
      const detalle = error?.response?.data?.detail ?? 'No se pudo procesar tu selección. Inténtalo de nuevo.';
      setError({ title: 'Error al continuar', detail: detalle });
      setOfertaAbierta(null);
    } finally {
      setCreandoHold(false);
    }
  }, [busquedaActiva]);

  // El hold se guarda en la pagina y se pasa al formulario: asi el formulario
  // sabe el `holdId`, el TTL y el precio congelado sin tener que repetir la
  // llamada ni guardarlo en `localStorage` (que ademas es PII).
  const cerrarFormulario = useCallback(() => setHoldActivo(null), []);

  /**
   * Al confirmar el pago se cambia por completo de vista. Es una navegacion
   * DENTRO de la pagina, no un cambio de ruta: el flujo de reserva es de un
   * solo sentido, y volver atras con el boton del navegador dejaria al usuario
   * en un formulario cuyo hold ya esta CONSUMED, que no sirve de nada.
   *
   * Va DESPUES de todos los hooks a proposito (ver la nota de mas arriba).
   */
  if (reserva) {
    return (
      <PantallaReservaConfirmada
        reserva={reserva}
        onVolver={() => {
          setReserva(null);
          setHoldActivo(null);
          setResultados(null);
          setBusquedaActiva(null);
          setOfertaAbierta(null);
        }}
      />
    );
  }

  return (
    <main className="main-content main-content-vuelos" id="contenido-principal">
      <section aria-labelledby="vuelos-titulo">
        <h1 className="section-title" id="vuelos-titulo">
          Busqueda de vuelos
        </h1>
        <p className="section-subtitle">
          Indica el origen, el destino, la fecha y cuantos viajan.
        </p>

        <div className="card buscador-card">
          <div className="card-body">
            <FormularioBusquedaVuelos onBuscar={manejarBusqueda} cargando={cargando} />
          </div>
        </div>
      </section>

      {/*
        Region `aria-live="polite"`: los resultados aparecen SIN quitar el foco
        de donde estaba, y el screen reader anuncia el cambio de forma
        interruptiva solo cuando tiene sentido. Es lo que evita que un usuario
        de lector de pantalla pierda el contexto de la pagina.

        `aria-busy` comunica que la region se esta actualizando.
      */}
      <section
        className="vuelo-resultados"
        aria-labelledby="resultados-titulo"
        aria-live="polite"
        aria-busy={cargando}
      >
        <h2 className="section-title" id="resultados-titulo">
          Resultados
        </h2>

        {cargando && (
          <div className="state-container">
            <div className="spinner" aria-hidden="true" />
            <p className="state-subtitle" role="status">
              Buscando vuelos disponibles…
            </p>
          </div>
        )}

        {!cargando && error && (
          <div className="state-container" role="alert">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h3 className="state-title">{error.title}</h3>
            {error.code && (
              <p className="state-subtitle">
                Codigo de error: <code>{error.code}</code>
                {error.status ? ` (HTTP ${error.status})` : ''}
              </p>
            )}
            {error.detail && <p className="state-subtitle">{error.detail}</p>}
            {error.status === 404 && (
              <p className="state-subtitle">
                {error.status
                  ? `El servidor respondio con el estado ${error.status}.`
                  : 'No hubo respuesta del servidor.'}{' '}
                {error.detail ?? 'Revisa los datos e intentalo de nuevo.'}
              </p>
            )}
          </div>
        )}

        {!cargando && !error && resultados && ofertas.length === 0 && (
          <div className="state-container">
            <div className="error-icon" aria-hidden="true">
              🔎
            </div>
            <h3 className="state-title">No encontramos vuelos</h3>
            <p className="state-subtitle">
              No encontramos vuelos para esta ruta en la fecha seleccionada.<br/><br/>
              <b>💡 Consejo:</b> Intenta mover tu fecha de salida un día antes o un día después.
            </p>
          </div>
        )}

        {!cargando && !error && ofertas.length > 0 && (
          <>
            <p className="section-subtitle" role="status">
              {resultados.totalOffers}{' '}
              {resultados.totalOffers === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
              {busquedaActiva && (
                <>
                  {' '}
                  para{' '}
                  {busquedaActiva.itineraries[0].origin} →{' '}
                  {busquedaActiva.itineraries[0].destination} del{' '}
                  {formatearFecha(busquedaActiva.itineraries[0].departureDate)}
                </>
              )}
              .
            </p>

            {/* Tarjetas tipo ticket a ancho completo, apiladas verticalmente. */}
            <div className="atracciones-grid vuelo-grid">
              {ofertasAgrupadas.map((grupoOfertas, indice) => (
                <VueloGroupCard
                  key={indice}
                  ofertasGrupo={grupoOfertas}
                  onSeleccionarTarifa={abrirBloqueo}
                />
              ))}
            </div>
          </>
        )}

        {!cargando && !error && !resultados && (
          <div className="state-container">
            <p className="state-subtitle">
              Completa el formulario para ver las ofertas disponibles.
            </p>
          </div>
        )}
      </section>

      {/* Resumen de Viaje flotante al seleccionar una tarifa */}
      {ofertaAbierta && !holdActivo && (
        <ResumenViaje 
          oferta={ofertaAbierta?.oferta} 
          tarifaSeleccionada={ofertaAbierta?.tarifa}
          pasajeros={busquedaActiva?.passengers}
          onContinuar={(o) => confirmarResumen(o, ofertaAbierta.tarifa)} 
          onModificar={cerrarBloqueo} 
        />
      )}

      {/* Pantalla de carga superpuesta si estamos creando el hold */}
      {creandoHold && (
        <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="state-container" style={{ background: 'white', padding: '40px', borderRadius: '12px' }}>
            <div className="spinner" aria-hidden="true" />
            <h3 className="state-title">Preparando tu reserva...</h3>
            <p className="state-subtitle">Asegurando los mejores precios para ti.</p>
          </div>
        </div>
      )}

      {/* El formulario se abre cuando el hold se ha completado */}
      <FormularioReserva
        abierto={Boolean(holdActivo)}
        hold={holdActivo}
        pasajeros={busquedaActiva?.passengers}
        onCerrar={cerrarFormulario}
        onConfirmada={async (reservaData, pasajerosState) => {
          if (pasajerosState) {
            try {
              const itinerarioId = ofertaAbierta?.oferta?.itineraries?.[0]?.itineraryId;
              if (itinerarioId) {
                for (const p of pasajerosState) {
                  if (p.maletasExtra > 0) {
                    await agregarEquipaje(reservaData.bookingId, {
                      passengerId: p.passengerId,
                      itineraryId: itinerarioId,
                      quantity: p.maletasExtra,
                      payment: { paymentReference: 'EXTRABAG-UI' }
                    }, crypto.randomUUID());
                  }
                }
              }
            } catch(e) {
              console.error('Error al agregar maletas extra', e);
            }
          }
          setReserva(reservaData);
        }}
      />
    </main>
  );
}
