import { useCallback } from 'react';
import { API_BASE } from '../services/api';

// Generador rápido de UUID para la sesión del navegador
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('telemetry_session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('telemetry_session_id', sessionId);
  }
  return sessionId;
};

export const useTelemetry = () => {
  const trackEvent = useCallback(async (eventName, vertical = 'global', properties = {}) => {
    try {
      const payload = {
        event_name: eventName,
        session_id: getSessionId(),
        vertical,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        properties
      };
      
      // keepalive: true permite que el request se envíe incluso si el usuario cierra la pestaña o cambia de página
      await fetch(`${API_BASE}/telemetry/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {
      console.error('Error enviando telemetría:', e);
    }
  }, []);

  return { trackEvent };
};
