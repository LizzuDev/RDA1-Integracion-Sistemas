import { useId, useState, useRef, useEffect } from 'react';
import { hoyEnIso } from '../services/formato';

const AEROPUERTOS_ECUADOR = [
  { codigo: 'UIO', nombre: 'Quito (UIO)' },
  { codigo: 'GYE', nombre: 'Guayaquil (GYE)' },
  { codigo: 'CUE', nombre: 'Cuenca (CUE)' },
  { codigo: 'MEC', nombre: 'Manta (MEC)' },
  { codigo: 'OCC', nombre: 'Coca (OCC)' },
  { codigo: 'LOH', nombre: 'Loja (LOH)' },
  { codigo: 'GPS', nombre: 'Galápagos - Baltra (GPS)' },
  { codigo: 'SCY', nombre: 'Galápagos - San Cristóbal (SCY)' },
];

export function FormularioBusquedaVuelos({ onBuscar, cargando }) {
  const idBase = useId();

  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [tipoViaje, setTipoViaje] = useState('ida');
  const [fechaRegreso, setFechaRegreso] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [jovenes, setJovenes] = useState(0);
  const [ninos, setNinos] = useState(0);
  const [infantes, setInfantes] = useState(0);

  const [pasajerosAbierto, setPasajerosAbierto] = useState(false);
  const pasajerosRef = useRef(null);

  const [errores, setErrores] = useState({});

  useEffect(() => {
    function handleClickFuera(event) {
      if (pasajerosRef.current && !pasajerosRef.current.contains(event.target)) {
        setPasajerosAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const ids = {
    origen: `${idBase}-origen`,
    destino: `${idBase}-destino`,
    fecha: `${idBase}-fecha`,
    fechaRegreso: `${idBase}-fecha-regreso`,
  };

  const esIdaVuelta = tipoViaje === 'idaVuelta';
  const ISO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

  function validar() {
    const nuevos = {};

    if (!origen) nuevos.origen = 'El origen es obligatorio.';
    if (!destino) nuevos.destino = 'El destino es obligatorio.';
    if (origen && destino && origen === destino) nuevos.destino = 'El destino debe ser distinto del origen.';
    
    if (!fecha) {
      nuevos.fecha = 'La fecha de salida es obligatoria.';
    } else if (!ISO_FECHA.test(fecha)) {
      nuevos.fecha = 'La fecha debe tener el formato YYYY-MM-DD.';
    } else if (fecha < hoyEnIso()) {
      nuevos.fecha = 'La fecha de salida no puede ser anterior a hoy.';
    }

    if (esIdaVuelta) {
      if (!fechaRegreso) {
        nuevos.fechaRegreso = 'La fecha de regreso es obligatoria.';
      } else if (!ISO_FECHA.test(fechaRegreso)) {
        nuevos.fechaRegreso = 'La fecha debe tener el formato YYYY-MM-DD.';
      } else if (fecha && fechaRegreso < fecha) {
        nuevos.fechaRegreso = 'La fecha de regreso no puede ser anterior a la de salida.';
      }
    }

    if (adultos < 1) nuevos.adultos = 'Debe haber al menos 1 adulto.';
    
    const totalPasajeros = adultos + jovenes + ninos + infantes;
    if (totalPasajeros > 9) nuevos.adultos = 'Maximo 9 pasajeros.';

    setErrores(nuevos);
    return nuevos;
  }

  function alEnviar(evento) {
    evento.preventDefault();
    if (cargando) return;

    const encontrados = validar();

    if (Object.keys(encontrados).length > 0) return;

    const itinerarios = [
      {
        origin: origen,
        destination: destino,
        departureDate: fecha,
      },
    ];

    if (esIdaVuelta) {
      itinerarios.push({
        origin: destino,
        destination: origen,
        departureDate: fechaRegreso,
      });
    }

    onBuscar({
      itineraries: itinerarios,
      passengers: { adults: adultos, youths: jovenes, children: ninos, infants: infantes },
    });
  }

  function swapRutas() {
    const temp = origen;
    setOrigen(destino);
    setDestino(temp);
  }

  return (
    <form className="busq-vuelos-moderno" onSubmit={alEnviar} noValidate>
      <div className="busq-vuelos-header">
        <span className="busq-tipo-label">TIPO DE VIAJE</span>
        <div className="busq-pill-group">
          <button
            type="button"
            className={`busq-pill-btn ${esIdaVuelta ? 'activo' : ''}`}
            onClick={() => setTipoViaje('idaVuelta')}
          >
            Ida y Vuelta
          </button>
          <button
            type="button"
            className={`busq-pill-btn ${!esIdaVuelta ? 'activo' : ''}`}
            onClick={() => setTipoViaje('ida')}
          >
            Solo Ida
          </button>
        </div>
      </div>

      <div className="busq-ruta-row">
        {/* ORIGEN */}
        <div className={`busq-input-box ${errores.origen ? 'error' : ''}`}>
          <div className="busq-input-icon">✈️</div>
          <div className="busq-input-content">
            <label htmlFor={ids.origen}>Origen *</label>
            <select
              id={ids.origen}
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            >
              <option value="" disabled>Selecciona origen</option>
              {AEROPUERTOS_ECUADOR.map((a) => (
                <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
              ))}
            </select>
            <span className="busq-help">Aeropuerto de salida</span>
          </div>
        </div>

        {/* SWAP BUTTON */}
        <button type="button" className="busq-swap-btn" onClick={swapRutas} aria-label="Invertir ruta">
          ⇄
        </button>

        {/* DESTINO */}
        <div className={`busq-input-box ${errores.destino ? 'error' : ''}`}>
          <div className="busq-input-icon">🛬</div>
          <div className="busq-input-content">
            <label htmlFor={ids.destino}>Destino *</label>
            <select
              id={ids.destino}
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            >
              <option value="" disabled>Selecciona destino</option>
              {AEROPUERTOS_ECUADOR.map((a) => (
                <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
              ))}
            </select>
            <span className="busq-help">Aeropuerto de llegada</span>
          </div>
        </div>

        {/* FECHAS */}
        <div className={`busq-input-box ${errores.fecha ? 'error' : ''}`}>
          <div className="busq-input-icon">📅</div>
          <div className="busq-input-content">
            <label htmlFor={ids.fecha}>Fecha de salida *</label>
            <input
              type="date"
              id={ids.fecha}
              min={hoyEnIso()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <span className="busq-help">Formato YYYY-MM-DD</span>
          </div>
        </div>

        {esIdaVuelta && (
          <div className={`busq-input-box ${errores.fechaRegreso ? 'error' : ''}`}>
            <div className="busq-input-icon">📅</div>
            <div className="busq-input-content">
              <label htmlFor={ids.fechaRegreso}>Fecha de regreso *</label>
              <input
                type="date"
                id={ids.fechaRegreso}
                min={fecha || hoyEnIso()}
                value={fechaRegreso}
                onChange={(e) => setFechaRegreso(e.target.value)}
              />
              <span className="busq-help">Formato YYYY-MM-DD</span>
            </div>
          </div>
        )}
      </div>

      <div className="busq-pasajeros-row" ref={pasajerosRef}>
        <div 
          className={`busq-input-box busq-pasajeros-toggle ${errores.adultos ? 'error' : ''}`}
          onClick={() => setPasajerosAbierto(!pasajerosAbierto)}
        >
          <div className="busq-input-icon">👥</div>
          <div className="busq-input-content">
            <label>PASAJEROS</label>
            <div className="busq-pasajeros-summary">
              Adultos: {adultos} • Jóvenes: {jovenes} • Niños: {ninos} • Infantes: {infantes}
            </div>
            <span className="busq-help">Los infantes (menores de 2 años) viajan en brazos y no ocupan asiento.</span>
          </div>
          <div className="busq-caret">▼</div>
        </div>

        {pasajerosAbierto && (
          <div className="busq-pasajeros-dropdown">
            {[
              { label: 'Adultos', val: adultos, set: setAdultos, min: 1 },
              { label: 'Jóvenes', val: jovenes, set: setJovenes, min: 0 },
              { label: 'Niños', val: ninos, set: setNinos, min: 0 },
              { label: 'Infantes', val: infantes, set: setInfantes, min: 0 },
            ].map((p) => (
              <div className="busq-pasajeros-item" key={p.label}>
                <span>{p.label}</span>
                <div className="busq-pasajeros-ctrls">
                  <button type="button" onClick={() => p.set(Math.max(p.min, p.val - 1))}>-</button>
                  <span>{p.val}</span>
                  <button type="button" onClick={() => p.set(p.val + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="busq-vuelos-footer">
        {Object.values(errores).map((err, i) => (
          <div key={i} className="busq-error-msg">{err}</div>
        ))}
        <button className="busq-buscar-btn" type="submit" disabled={cargando}>
          {cargando ? 'Buscando...' : 'Buscar vuelos'}
        </button>
      </div>
    </form>
  );
}
