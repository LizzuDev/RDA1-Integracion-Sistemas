import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

/**
 * Destino del enlace "Restablecer contraseña" que envía Supabase.
 * Al abrir el enlace, Supabase crea una sesión temporal de recuperación
 * (detectSessionInUrl) y aquí el usuario define su nueva contraseña.
 */
export function RestablecerContrasenaPage() {
  const navigate = useNavigate();
  const [listo, setListo] = useState(false);      // hay sesión de recuperación
  const [verificando, setVerificando] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const errorEnUrl = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description')
      || new URLSearchParams(window.location.search).get('error_description');
    if (errorEnUrl) {
      setError(`El enlace no es válido o ya expiró (${errorEnUrl.replace(/\+/g, ' ')}). Pide uno nuevo al administrador.`);
      setVerificando(false);
      return undefined;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      if (!vivo) return;
      if (session && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) {
        setListo(true);
        setVerificando(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (data?.session) setListo(true);
    });
    // Si en unos segundos no aparece sesión, el enlace no sirve
    const t = setTimeout(() => { if (vivo) setVerificando(false); }, 4000);
    return () => { vivo = false; clearTimeout(t); sub?.subscription?.unsubscribe(); };
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmacion) return setError('Las contraseñas no coinciden.');
    setGuardando(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (err) return setError(err.message);
    await supabase.auth.signOut();
    navigate('/login', { replace: true, state: { message: 'Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.' } });
  };

  const input = { width: '100%', padding: '10px 12px', border: '1px solid #c6c6c6', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };

  return (
    <main id="contenido-principal" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: '#f5f7fa' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #e7e7e7', borderRadius: 12, padding: '32px 28px', boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#003b95' }}>Restablecer contraseña</h1>

        {listo ? (
          <form onSubmit={guardar} noValidate>
            <p style={{ margin: '0 0 18px', color: '#555', fontSize: '0.9rem' }}>Escribe tu nueva contraseña.</p>
            <label htmlFor="nueva" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>Nueva contraseña</label>
            <input id="nueva" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...input, marginBottom: 14 }} />
            <label htmlFor="confirmar" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>Confirmar contraseña</label>
            <input id="confirmar" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} style={{ ...input, marginBottom: 14 }} />
            {error && <p role="alert" style={{ color: '#d32f2f', fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" disabled={guardando} style={{ width: '100%', padding: '11px', background: '#006ce4', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.95rem', cursor: guardando ? 'wait' : 'pointer' }}>
              {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        ) : verificando ? (
          <p style={{ color: '#555' }}>Verificando enlace…</p>
        ) : (
          <>
            <p role="alert" style={{ color: '#d32f2f', fontSize: '0.9rem' }}>
              {error || 'Este enlace no es válido o ya expiró. Pide al administrador que te envíe uno nuevo.'}
            </p>
            <Link to="/login" style={{ color: '#006ce4', fontWeight: 600 }}>Ir a iniciar sesión</Link>
          </>
        )}
      </div>
    </main>
  );
}
