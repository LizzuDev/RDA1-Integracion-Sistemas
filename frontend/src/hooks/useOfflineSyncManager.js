import { useEffect, useState } from 'react';
import { syncPendingReservations } from '../services/offlineSync';

export function useOfflineSyncManager() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Cuando vuelve la conexión, procesamos la cola de IndexedDB
      syncPendingReservations();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intentar sincronizar al cargar la app si hay conexión
    if (navigator.onLine) {
      syncPendingReservations();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline };
}
