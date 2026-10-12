import { useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { crearTipoHabitacion, actualizarTipoHabitacion, eliminarTipoHabitacion } from '../../services/alojamientosApi';
import { C, Campo, estiloInput, estiloBoton, erroresPorCampo, mensajeDe, Dialogo, Aviso } from './alojamientosUi';

/**
 * Tipos de habitación de un alojamiento (Booking: "room types"): cada uno con su
 * precio, capacidad, cupo, régimen y política de cancelación. El precio "desde",
 * las habitaciones y la capacidad del alojamiento se calculan a partir de ellos.
 */
const REGIMENES = [
  ['SOLO_ALOJAMIENTO', 'Solo alojamiento'],
  ['DESAYUNO', 'Desayuno incluido'],
  ['MEDIA_PENSION', 'Media pensión'],
  ['PENSION_COMPLETA', 'Pensión completa'],
  ['TODO_INCLUIDO', 'Todo incluido'],
];

const TIPO_VACIO = {
  nombre: '', codigo: '', descripcion: '', capacidadAdultos: 2, capacidadNinos: 0, camas: 1, descripcionCamas: '',
  tamanoM2: '', precioPorNoche: '', cantidad: 1, regimen: 'SOLO_ALOJAMIENTO', reembolsable: true, horasCancelacion: 48, amenidades: '',
};

const aFormulario = (t) => ({
  nombre: t.nombre, codigo: t.codigo, descripcion: t.descripcion || '', capacidadAdultos: t.capacidad_adultos,
  capacidadNinos: t.capacidad_ninos ?? 0, camas: t.camas ?? 1, descripcionCamas: t.descripcion_camas || '', tamanoM2: t.tamano_m2 ?? '',
  precioPorNoche: t.precio_noche, cantidad: t.cantidad, regimen: t.regimen,
  reembolsable: t.cancelacion_gratuita_horas !== null && t.cancelacion_gratuita_horas !== undefined,
  horasCancelacion: t.cancelacion_gratuita_horas ?? 48, amenidades: (t.amenidades || []).join(', '),
});

function aContrato(f, editando) {
  const texto = (v) => (String(v ?? '').trim() === '' ? undefined : String(v).trim());
  return {
    nombre: f.nombre.trim(),
    // El código identifica el tipo para los proveedores: solo se fija al crearlo.
    ...(!editando && texto(f.codigo) ? { codigo: texto(f.codigo) } : {}),
    descripcion: texto(f.descripcion),
    capacidadAdultos: Number(f.capacidadAdultos),
    capacidadNinos: Number(f.capacidadNinos) || 0,
    camas: Number(f.camas) || 1,
    descripcionCamas: texto(f.descripcionCamas),
    ...(texto(f.tamanoM2) ? { tamanoM2: Number(f.tamanoM2) } : {}),
    precioPorNoche: Number(f.precioPorNoche),
    cantidad: Number(f.cantidad),
    regimen: f.regimen,
    cancelacionGratuitaHoras: f.reembolsable ? Number(f.horasCancelacion) || 0 : null,
    amenidades: f.amenidades.split(',').map((x) => x.trim()).filter(Boolean),
  };
}

function FormularioTipo({ alojamiento, editando, onCancelar, onGuardado }) {
  const [f, setF] = useState(editando ? aFormulario(editando) : TIPO_VACIO);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiar = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [campo]: valor }));
    setErrores((x) => ({ ...x, [campo]: undefined }));
  };
  const input = (campo, props = {}) => (
    <input id={`gt-${campo}`} value={f[campo]} onChange={cambiar(campo)} aria-invalid={Boolean(errores[campo])}
      aria-describedby={errores[campo] ? `gt-${campo}-error` : undefined} style={estiloInput(errores[campo])} {...props} />
  );

  const guardar = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (f.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres.';
    if (!(Number(f.precioPorNoche) > 0)) e.precioPorNoche = 'Debe ser mayor que 0.';
    if (!(Number(f.capacidadAdultos) >= 1)) e.capacidadAdultos = 'Al menos 1.';
    if (!(Number(f.cantidad) >= 0)) e.cantidad = '0 o más.';
    if (!editando && f.codigo && !/^[A-Za-z0-9._-]{1,60}$/.test(f.codigo)) e.codigo = 'Solo letras, números, ".", "_" y "-".';
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    setMensaje('');
    try {
      const cuerpo = aContrato(f, editando);
      const res = editando
        ? await actualizarTipoHabitacion(alojamiento.id, editando.id, cuerpo)
        : await crearTipoHabitacion(alojamiento.id, cuerpo);
      onGuardado(res, editando ? 'actualizado' : 'creado');
    } catch (err) {
      const porCampo = erroresPorCampo(err, { cancelacionGratuitaHoras: 'horasCancelacion' });
      setErrores(porCampo);
      setMensaje(Object.keys(porCampo).length ? 'Revisa los campos marcados en rojo.' : mensajeDe(err, 'No se pudo guardar el tipo de habitación.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate aria-label={editando ? `Editar ${editando.nombre}` : 'Nuevo tipo de habitación'}
      style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, background: '#fafcff', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong style={{ color: C.darkBlue }}>{editando ? `Editar "${editando.nombre}"` : 'Nuevo tipo de habitación'}</strong>
      {mensaje && <div role="alert" style={{ color: C.red, fontWeight: 600, fontSize: '0.85rem' }}>{mensaje}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Campo id="gt-nombre" label="Nombre *" error={errores.nombre}>{input('nombre', { maxLength: 150, placeholder: 'Suite con vista al mar' })}</Campo>
        {editando ? (
          <Campo id="gt-codigo" label="Código"><input id="gt-codigo" value={f.codigo} disabled style={{ ...estiloInput(), background: '#f3f4f6' }} /></Campo>
        ) : (
          <Campo id="gt-codigo" label="Código (opcional)" error={errores.codigo}>{input('codigo', { maxLength: 60, placeholder: 'Se genera del nombre' })}</Campo>
        )}
        <Campo id="gt-precioPorNoche" label={`Precio / noche (${alojamiento.moneda || 'USD'}) *`} error={errores.precioPorNoche}>
          {input('precioPorNoche', { type: 'number', min: 0.01, step: 0.01, inputMode: 'decimal' })}
        </Campo>
        <Campo id="gt-cantidad" label="Habitaciones de este tipo *" error={errores.cantidad}>{input('cantidad', { type: 'number', min: 0 })}</Campo>
        <Campo id="gt-capacidadAdultos" label="Adultos por hab. *" error={errores.capacidadAdultos}>{input('capacidadAdultos', { type: 'number', min: 1, max: 30 })}</Campo>
        <Campo id="gt-capacidadNinos" label="Niños por hab." error={errores.capacidadNinos}>{input('capacidadNinos', { type: 'number', min: 0, max: 20 })}</Campo>
        <Campo id="gt-camas" label="Camas" error={errores.camas}>{input('camas', { type: 'number', min: 1 })}</Campo>
        <Campo id="gt-descripcionCamas" label="Detalle de camas" error={errores.descripcionCamas}>{input('descripcionCamas', { maxLength: 150, placeholder: '1 cama king' })}</Campo>
        <Campo id="gt-tamanoM2" label="Tamaño (m²)" error={errores.tamanoM2}>{input('tamanoM2', { type: 'number', min: 1, step: 0.1 })}</Campo>
        <Campo id="gt-regimen" label="Régimen" error={errores.regimen}>
          <select id="gt-regimen" value={f.regimen} onChange={cambiar('regimen')} style={estiloInput(errores.regimen)}>
            {REGIMENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Campo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600 }}>
            <input type="checkbox" checked={f.reembolsable} onChange={cambiar('reembolsable')} /> Cancelación gratuita
          </label>
          {f.reembolsable ? (
            <>
              <label htmlFor="gt-horasCancelacion" style={{ fontSize: '0.75rem', color: C.gray }}>Hasta cuántas horas antes</label>
              {input('horasCancelacion', { type: 'number', min: 0, max: 720 })}
              {errores.horasCancelacion && <span role="alert" style={{ fontSize: '0.75rem', color: C.red, fontWeight: 600 }}>{errores.horasCancelacion}</span>}
            </>
          ) : <span style={{ fontSize: '0.78rem', color: C.gray }}>No reembolsable</span>}
        </div>
        <Campo id="gt-amenidades" label="Servicios de la habitación (separados por comas)" error={errores.amenidades} ancho>
          {input('amenidades', { placeholder: 'Aire acondicionado, Minibar, Balcón' })}
        </Campo>
        <Campo id="gt-descripcion" label="Descripción" error={errores.descripcion} ancho>
          <textarea id="gt-descripcion" value={f.descripcion} onChange={cambiar('descripcion')} rows={2} maxLength={2000} style={estiloInput(errores.descripcion)} />
        </Campo>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onCancelar} style={estiloBoton()}>Cancelar</button>
        <button type="submit" disabled={guardando} style={estiloBoton(true)}>{guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear tipo'}</button>
      </div>
    </form>
  );
}

export function GestorTiposHabitacion({ alojamiento, onCerrar, onCambio }) {
  const ref = useRef(null);
  useFocusTrap(true, onCerrar, ref);
  const [tipos, setTipos] = useState(alojamiento.tipos_habitacion || []);
  const [formulario, setFormulario] = useState(null); // null | 'nuevo' | tipo
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const refrescar = (tipo) => {
    setTipos((lista) => {
      const i = lista.findIndex((t) => t.id === tipo.id);
      return i >= 0 ? lista.map((t) => (t.id === tipo.id ? tipo : t)) : [...lista, tipo];
    });
    onCambio();
  };

  const alternar = async (t) => {
    setOcupado(t.id);
    try {
      refrescar(await actualizarTipoHabitacion(alojamiento.id, t.id, { activo: !t.activo }));
      setAviso({ tipo: 'ok', texto: `"${t.nombre}" ${t.activo ? 'ya no se vende' : 'vuelve a estar a la venta'}.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDe(err, 'No se pudo cambiar el tipo de habitación.') });
    } finally {
      setOcupado(null);
    }
  };

  const borrar = async (t) => {
    if (!window.confirm(`¿Eliminar "${t.nombre}"? Si tiene reservas se desactivará para conservar el historial.`)) return;
    setOcupado(t.id);
    try {
      const { desactivado } = await eliminarTipoHabitacion(alojamiento.id, t.id);
      if (desactivado) refrescar({ ...t, activo: false });
      else {
        setTipos((lista) => lista.filter((x) => x.id !== t.id));
        onCambio();
      }
      setAviso({ tipo: 'ok', texto: desactivado ? `"${t.nombre}" tiene reservas: se desactivó (no se borra el historial).` : `"${t.nombre}" eliminado.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDe(err, 'No se pudo eliminar el tipo de habitación.') });
    } finally {
      setOcupado(null);
    }
  };

  const activos = tipos.filter((t) => t.activo && t.cantidad > 0);
  const desde = activos.length ? Math.min(...activos.map((t) => Number(t.precio_noche))) : null;

  return (
    <Dialogo titulo={`Tipos de habitación · ${alojamiento.nombre}`} idTitulo="gt-titulo" onCerrar={onCerrar} refContenedor={ref} ancho={880}>
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: C.gray }}>
          Cada tipo tiene su precio, capacidad, cupo, régimen y política de cancelación. El alojamiento muestra el precio
          {desde !== null ? <> «desde» <strong>{desde.toFixed(2)} {alojamiento.moneda}</strong></> : ' «desde»'} y{' '}
          <strong>{activos.reduce((s, t) => s + t.cantidad, 0)}</strong> habitaciones a la venta.
        </p>
        {alojamiento.proveedor_id && (
          <div role="note" style={{ background: '#fff7e6', border: '1px solid #f5c26b', color: C.orange, borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem' }}>
            Si el proveedor <strong>{alojamiento.proveedor_id}</strong> envía <code>tiposHabitacion</code> al sincronizar, reemplazará estos cambios.
          </div>
        )}
        <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Tipos de habitación</caption>
            <thead>
              <tr style={{ background: C.lightBlue }}>
                {['Tipo', 'Precio / noche', 'Cupo', 'Capacidad', 'Régimen y cancelación', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} scope="col" style={{ padding: '8px 10px', textAlign: 'left', color: C.darkBlue, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tipos.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: C.gray }}>Aún no hay tipos: se creará uno «estándar» con los datos del alojamiento.</td></tr>}
              {tipos.map((t) => (
                <tr key={t.id} style={{ borderTop: `1px solid ${C.border}`, opacity: t.activo ? 1 : 0.6 }}>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 700 }}>{t.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: C.gray, fontFamily: 'monospace' }}>{t.codigo}</div>
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{Number(t.precio_noche).toFixed(2)} {alojamiento.moneda}</td>
                  <td style={{ padding: '8px 10px' }}>{t.cantidad}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{t.capacidad_adultos} ad.{t.capacidad_ninos ? ` + ${t.capacidad_ninos} niños` : ''}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div>{t.regimen_texto}</div>
                    <div style={{ fontSize: '0.75rem', color: t.cancelacion_gratuita_horas === null ? C.orange : C.green }}>{t.cancelacion_texto}</div>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, background: t.activo ? '#e8f5e9' : '#fff3e0', color: t.activo ? C.green : C.orange }}>
                      {t.activo ? 'A la venta' : 'Desactivado'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={ocupado === t.id} onClick={() => setFormulario(t)} aria-label={`Editar ${t.nombre}`} title="Editar" style={{ ...estiloBoton(), padding: '4px 8px', marginRight: 4 }}>✏️</button>
                    <button type="button" disabled={ocupado === t.id} onClick={() => alternar(t)} aria-label={`${t.activo ? 'Desactivar' : 'Activar'} ${t.nombre}`} title={t.activo ? 'Desactivar' : 'Activar'} style={{ ...estiloBoton(), padding: '4px 8px', marginRight: 4 }}>{t.activo ? '⏸️' : '▶️'}</button>
                    <button type="button" disabled={ocupado === t.id} onClick={() => borrar(t)} aria-label={`Eliminar ${t.nombre}`} title="Eliminar" style={{ ...estiloBoton(), padding: '4px 8px' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {formulario ? (
          <FormularioTipo
            key={formulario === 'nuevo' ? 'nuevo' : formulario.id}
            alojamiento={alojamiento}
            editando={formulario === 'nuevo' ? null : formulario}
            onCancelar={() => setFormulario(null)}
            onGuardado={(tipo, accion) => {
              setFormulario(null);
              refrescar(tipo);
              setAviso({ tipo: 'ok', texto: `Tipo "${tipo.nombre}" ${accion}.` });
            }}
          />
        ) : (
          <div>
            <button type="button" onClick={() => setFormulario('nuevo')} style={estiloBoton(true)}>➕ Añadir tipo de habitación</button>
          </div>
        )}
      </div>
    </Dialogo>
  );
}
