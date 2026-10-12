/**
 * Piezas compartidas del panel de Alojamientos: colores, campos con su error
 * accesible y traducción de errores del backend (RFC 7807 + invalidParams).
 */
export const C = {
  blue: '#006ce4', darkBlue: '#003b95', lightBlue: '#ebf3ff', green: '#008009',
  red: '#c62828', orange: '#b45309', gray: '#595959', border: '#e7e7e7', white: '#fff', text: '#1a1a1a',
};

/** Errores del backend → { campoDelFormulario: motivo }. */
export const CAMPO_DE = {
  'ubicacion.address': 'direccion', 'ubicacion.city': 'ciudad', 'ubicacion.country': 'pais',
  'politicas.checkin_desde': 'checkinDesde', 'politicas.checkout_hasta': 'checkoutHasta',
  'politicas.cancelacion': 'cancelacion',
};
export function erroresPorCampo(err, mapa = CAMPO_DE) {
  const lista = err?.response?.data?.invalidParams || [];
  const out = {};
  for (const p of lista) {
    const base = p.name.startsWith('photos') ? 'fotos' : p.name.startsWith('amenidades') ? 'amenidades' : (mapa[p.name] || p.name.split('.')[0]);
    if (!out[base]) out[base] = p.reason;
  }
  return out;
}
export const mensajeDe = (err, porDefecto) => {
  const d = err?.response?.data;
  if (err?.response?.status === 401) return 'Tu sesión caducó. Vuelve a iniciar sesión.';
  if (err?.response?.status === 403) return 'Tu usuario no tiene permisos de administrador.';
  return d?.detail || d?.message || (err?.response ? porDefecto : 'No se pudo conectar con el servidor.');
};

export const fmtFecha = (f) => (f ? new Date(f).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export function Campo({ id, label, error, children, ancho }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: ancho ? '1 / -1' : undefined }}>
      <label htmlFor={id} style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text }}>{label}</label>
      {children}
      {error && <span id={`${id}-error`} role="alert" style={{ fontSize: '0.75rem', color: C.red, fontWeight: 600 }}>{error}</span>}
    </div>
  );
}

export const estiloInput = (error) => ({
  padding: '8px 10px', border: `1px solid ${error ? C.red : '#c9c9c9'}`, borderRadius: 6, fontSize: '0.88rem', fontFamily: 'inherit', background: C.white, color: C.text,
});


export const estiloBoton = (primario = false) => ({
  background: primario ? C.blue : C.white, color: primario ? C.white : C.text,
  border: primario ? 'none' : `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
});

/** Fondo y caja de un diálogo modal del panel. */
export function Dialogo({ titulo, idTitulo, onCerrar, children, ancho = 760, refContenedor, comoFormulario, onSubmit }) {
  const Etiqueta = comoFormulario ? 'form' : 'div';
  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <Etiqueta ref={refContenedor} role="dialog" aria-modal="true" aria-labelledby={idTitulo} onClick={(e) => e.stopPropagation()}
        {...(comoFormulario ? { onSubmit, noValidate: true } : {})}
        style={{ background: C.white, borderRadius: 10, width: '100%', maxWidth: ancho, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id={idTitulo} style={{ margin: 0, fontSize: '1.1rem', color: C.darkBlue }}>{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </Etiqueta>
    </div>
  );
}

export function Aviso({ aviso, onCerrar }) {
  if (!aviso) return null;
  const error = aviso.tipo === 'error';
  return (
    <div role={error ? 'alert' : 'status'} style={{ background: error ? '#ffebee' : '#e8f5e9', color: error ? C.red : C.green, borderRadius: 6, padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{aviso.texto}</span>
      {onCerrar && <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>}
    </div>
  );
}
