import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  rotarClaveProveedor,
  eliminarProveedor,
} from '../../services/alojamientosApi';
import { C, Campo, estiloInput, estiloBoton, erroresPorCampo, mensajeDe, fmtFecha, Dialogo, Aviso } from './alojamientosUi';

/**
 * Proveedores de alojamientos (sistemas externos que sincronizan su inventario).
 * Sus API keys se guardan solo como hash: la clave se muestra UNA vez, al crear
 * el proveedor o al rotarla, y hay que copiarla en ese momento.
 */
function ClaveNueva({ clave, proveedor, onCerrar }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  };
  return (
    <div role="alert" style={{ background: '#fffbe6', border: '2px solid #f5c26b', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong style={{ color: C.orange }}>API key de {proveedor}: cópiala ahora, no se volverá a mostrar.</strong>
      <code style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.85rem', wordBreak: 'break-all' }}>{clave}</code>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={copiar} style={estiloBoton(true)}>{copiada ? '✔ Copiada' : '📋 Copiar'}</button>
        <button type="button" onClick={onCerrar} style={estiloBoton()}>Ya la guardé</button>
      </div>
      <span style={{ fontSize: '0.78rem', color: C.gray }}>Entrégala al proveedor por un canal privado. Debe enviarla en la cabecera <code>X-Api-Key</code>.</span>
    </div>
  );
}

export function ProveedoresAlojamiento({ onCerrar, onCambio }) {
  const ref = useRef(null);
  useFocusTrap(true, onCerrar, ref);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [clave, setClave] = useState(null); // { proveedor, clave }
  const [f, setF] = useState({ id: '', nombre: '', emailContacto: '' });
  const [errores, setErrores] = useState({});
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setLista(await getProveedores());
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDe(err, 'No se pudieron cargar los proveedores.') });
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!/^[a-z0-9-]{2,60}$/.test(f.id)) e.id = 'Minúsculas, números y "-" (2–60). Ej.: grupo3-alojamientos';
    if (f.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres.';
    setErrores(e);
    if (Object.keys(e).length) return;
    setOcupado('nuevo');
    try {
      const res = await crearProveedor({ id: f.id, nombre: f.nombre.trim(), ...(f.emailContacto.trim() ? { emailContacto: f.emailContacto.trim() } : {}) });
      setClave({ proveedor: res.id, clave: res.api_key });
      setF({ id: '', nombre: '', emailContacto: '' });
      setAviso({ tipo: 'ok', texto: `Proveedor "${res.nombre}" registrado.` });
      await cargar();
      onCambio?.();
    } catch (err) {
      const porCampo = erroresPorCampo(err);
      setErrores(porCampo);
      if (!Object.keys(porCampo).length) setAviso({ tipo: 'error', texto: mensajeDe(err, 'No se pudo registrar el proveedor.') });
    } finally {
      setOcupado(null);
    }
  };

  const accion = async (p, tipo) => {
    if (tipo === 'rotar' && !window.confirm(`¿Generar una API key nueva para "${p.nombre}"? La actual dejará de funcionar al instante.`)) return;
    if (tipo === 'desactivar' && !window.confirm(`¿Desactivar "${p.nombre}"? Su sistema no podrá sincronizar hasta que lo reactives. No se borra nada.`)) return;
    if (tipo === 'eliminar' && !window.confirm(`¿Eliminar "${p.nombre}"? Solo es posible si no tiene alojamientos.`)) return;
    setOcupado(p.id);
    try {
      if (tipo === 'rotar') {
        const res = await rotarClaveProveedor(p.id);
        setClave({ proveedor: p.id, clave: res.api_key });
      } else if (tipo === 'eliminar') {
        await eliminarProveedor(p.id);
        setAviso({ tipo: 'ok', texto: `"${p.nombre}" eliminado.` });
      } else {
        await actualizarProveedor(p.id, { activo: tipo === 'activar' });
        setAviso({ tipo: 'ok', texto: `"${p.nombre}" ${tipo === 'activar' ? 'activado' : 'desactivado'}.` });
      }
      await cargar();
      onCambio?.();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDe(err, 'No se pudo completar la acción.') });
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Dialogo titulo="Proveedores de alojamientos" idTitulo="gp-titulo" onCerrar={onCerrar} refContenedor={ref} ancho={900}>
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
        {clave && <ClaveNueva clave={clave.clave} proveedor={clave.proveedor} onCerrar={() => setClave(null)} />}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Proveedores registrados</caption>
            <thead>
              <tr style={{ background: C.lightBlue }}>
                {['Proveedor', 'Contacto', 'API key', 'Último uso', 'Alojamientos', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} scope="col" style={{ padding: '8px 10px', textAlign: 'left', color: C.darkBlue, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: C.gray }}>Cargando…</td></tr>}
              {!cargando && lista.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: C.gray }}>Todavía no hay proveedores.</td></tr>}
              {!cargando && lista.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, opacity: p.activo ? 1 : 0.65 }}>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: C.gray, fontFamily: 'monospace' }}>{p.id}</div>
                  </td>
                  <td style={{ padding: '8px 10px' }}>{p.email_contacto || <span style={{ color: C.gray }}>—</span>}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{p.tiene_api_key ? p.api_key_prefijo : <span style={{ color: C.orange }}>Sin clave</span>}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtFecha(p.ultimo_uso)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.alojamientos_activos}/{p.alojamientos}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, background: p.activo ? '#e8f5e9' : '#fff3e0', color: p.activo ? C.green : C.orange }}>
                      {p.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={ocupado === p.id} onClick={() => accion(p, 'rotar')} aria-label={`Generar nueva API key para ${p.nombre}`} title="Nueva API key" style={{ ...estiloBoton(), padding: '4px 8px', marginRight: 4 }}>🔑</button>
                    <button type="button" disabled={ocupado === p.id} onClick={() => accion(p, p.activo ? 'desactivar' : 'activar')} aria-label={`${p.activo ? 'Desactivar' : 'Activar'} ${p.nombre}`} title={p.activo ? 'Desactivar' : 'Activar'} style={{ ...estiloBoton(), padding: '4px 8px', marginRight: 4 }}>{p.activo ? '⏸️' : '▶️'}</button>
                    <button type="button" disabled={ocupado === p.id || p.alojamientos > 0} onClick={() => accion(p, 'eliminar')} aria-label={`Eliminar ${p.nombre}`} title={p.alojamientos > 0 ? 'Tiene alojamientos: desactívalo' : 'Eliminar'} style={{ ...estiloBoton(), padding: '4px 8px', opacity: p.alojamientos > 0 ? 0.4 : 1 }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={crear} noValidate aria-label="Registrar proveedor" style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ color: C.darkBlue }}>Registrar proveedor</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Campo id="gp-id" label="Id (no se puede cambiar) *" error={errores.id}>
              <input id="gp-id" value={f.id} onChange={(e) => { setF((x) => ({ ...x, id: e.target.value.toLowerCase() })); setErrores((x) => ({ ...x, id: undefined })); }}
                placeholder="grupo3-alojamientos" maxLength={60} aria-invalid={Boolean(errores.id)} aria-describedby={errores.id ? 'gp-id-error' : undefined} style={estiloInput(errores.id)} />
            </Campo>
            <Campo id="gp-nombre" label="Nombre *" error={errores.nombre}>
              <input id="gp-nombre" value={f.nombre} onChange={(e) => { setF((x) => ({ ...x, nombre: e.target.value })); setErrores((x) => ({ ...x, nombre: undefined })); }}
                placeholder="Grupo 3 · Sistema de Alojamientos" maxLength={150} aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'gp-nombre-error' : undefined} style={estiloInput(errores.nombre)} />
            </Campo>
            <Campo id="gp-emailContacto" label="Correo de contacto" error={errores.emailContacto}>
              <input id="gp-emailContacto" type="email" value={f.emailContacto} onChange={(e) => { setF((x) => ({ ...x, emailContacto: e.target.value })); setErrores((x) => ({ ...x, emailContacto: undefined })); }}
                placeholder="soporte@proveedor.com" maxLength={150} aria-invalid={Boolean(errores.emailContacto)} aria-describedby={errores.emailContacto ? 'gp-emailContacto-error' : undefined} style={estiloInput(errores.emailContacto)} />
            </Campo>
          </div>
          <div>
            <button type="submit" disabled={ocupado === 'nuevo'} style={estiloBoton(true)}>{ocupado === 'nuevo' ? 'Registrando…' : 'Registrar y generar API key'}</button>
          </div>
        </form>
      </div>
    </Dialogo>
  );
}
