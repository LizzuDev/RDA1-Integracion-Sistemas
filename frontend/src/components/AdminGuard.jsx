import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ADMIN_EMAILS = ['admin@booking.com', 'alejandroflores@booking.com'];

/**
 * Protege rutas exclusivas de administrador.
 * - Si el auth todavía está cargando, muestra un spinner.
 * - Si no hay sesión, redirige a /login.
 * - Si el email no está en la lista de admins, redirige a / con un aviso.
 */
export function AdminGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#003b95',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Verificando sesión…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/admin', message: 'Debes iniciar sesión para acceder al panel de administración.' }} replace />;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return <Navigate to="/" state={{ message: 'No tienes permisos de administrador.' }} replace />;
  }

  return children;
}
