import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../services/api';
import { isAdminUser } from './AdminGuard';

/**
 * Aplica en toda la web los ajustes globales del panel de administración
 * (GET /config/public, sin sesión):
 *
 *  - Modo mantenimiento: los visitantes ven una pantalla de mantenimiento. Los
 *    administradores siguen navegando (con un aviso) y /login y /admin quedan
 *    accesibles para poder desactivarlo.
 *  - Pasarela de pagos apagada: aviso visible de que los pagos en línea están
 *    suspendidos.
 *
 * Si el backend no responde se asume operación normal (no se bloquea la web).
 */
export function PlatformStatusGate({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      fetch(`${API_BASE}/config/public`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (vivo && d) setEstado(d); })
        .catch(() => {});
    cargar();
    const t = setInterval(cargar, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [pathname]);

  const esAdmin = isAdminUser(user);
  const rutaLibre = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/restablecer-contrasena');

  if (estado?.maintenanceMode && !esAdmin && !rutaLibre) {
    return (
      <main id="contenido-principal" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: '#f5f7fa' }}>
        <div style={{ maxWidth: 520, textAlign: 'center', background: '#fff', border: '1px solid #e7e7e7', borderRadius: 12, padding: '40px 28px', boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛠️</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem', color: '#003b95' }}>Estamos en mantenimiento</h1>
          <p style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.5 }}>
            Booking Ecuador está realizando tareas de mantenimiento programado. Vuelve a intentarlo en unos minutos.
          </p>
          <Link to="/login" style={{ color: '#006ce4', fontWeight: 600, fontSize: '0.9rem' }}>Acceso para administradores</Link>
        </div>
      </main>
    );
  }

  const avisos = [];
  if (estado?.maintenanceMode && esAdmin) avisos.push({ color: '#d32f2f', texto: '🛠️ Modo mantenimiento ACTIVO: los visitantes ven la pantalla de mantenimiento. Tú lo ves porque eres administrador.' });
  if (estado && estado.paymentsEnabled === false) avisos.push({ color: '#e8650a', texto: '💳 Los pagos en línea están suspendidos temporalmente. Puedes explorar, pero no completar pagos por ahora.' });

  return (
    <>
      {avisos.map((a) => (
        <div key={a.texto} role="status" style={{ background: a.color, color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}>{a.texto}</div>
      ))}
      {children}
    </>
  );
}
