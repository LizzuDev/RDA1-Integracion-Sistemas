import { useOfflineSyncManager } from '../hooks/useOfflineSyncManager';

export function OfflineBanner() {
  const { isOffline } = useOfflineSyncManager();

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#333',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <span role="img" aria-label="Sin conexión">📡</span>
      <div>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Estás sin conexión</p>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Tus reservas se guardarán y se enviarán al reconectar.</p>
      </div>
    </div>
  );
}
