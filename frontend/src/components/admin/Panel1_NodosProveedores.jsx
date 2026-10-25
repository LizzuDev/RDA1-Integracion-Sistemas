import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel1_NodosProveedores() {
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState('');

  const fetchNodos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/nodes');
      setNodos(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      // Mock fallback con nodos estándar si backend está offline
      setNodos([
        { id: 'nodo-atracciones-1', codigo: 'MS_ATR', nombre: 'Microservicio Atracciones (REST OpenAPI v2)', url: 'http://localhost:3000/api/v2/atracciones', latenciaMs: 42, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
        { id: 'nodo-autos-2', codigo: 'MS_AUT', nombre: 'Microservicio Autos (Flota & Cooldown 2h)', url: 'http://localhost:3000/api/v2/autos', latenciaMs: 65, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
        { id: 'nodo-alojamientos-3', codigo: 'MS_ALO', nombre: 'Microservicio Alojamientos (Check-in 14:00)', url: 'http://localhost:3000/api/v2/alojamientos', latenciaMs: 88, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
        { id: 'nodo-vuelos-4', codigo: 'MS_VUE', nombre: 'Microservicio Vuelos (Boarding Pass)', url: 'http://localhost:3000/api/v2/vuelos', latenciaMs: 110, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
        { id: 'nodo-pagos-5', codigo: 'MS_PAG', nombre: 'Pasarela Pagos SOA (Idempotency-Key)', url: 'http://localhost:3000/api/v1/pagos', latenciaMs: 35, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
        { id: 'nodo-stock-6', codigo: 'MS_STK', nombre: 'Inventario gRPC Stream (TCP 50051)', url: 'grpc://localhost:50051', latenciaMs: 12, estado: 'OPERATIVO', killSwitchActivo: false, failCount: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodos();
    const interval = setInterval(fetchNodos, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (nodoId) => {
    const nodo = nodos.find((item) => item.id === nodoId);
    const codigoNodo = nodo?.codigo_nodo || nodo?.codigo;
    if (!codigoNodo) {
      setToggleError('No se pudo identificar el nodo para cambiar su Kill-Switch.');
      return;
    }

    setTogglingId(nodoId);
    setToggleError('');
    try {
      await api.post(`/admin/nodes/${codigoNodo}/toggle-killswitch`);
      await fetchNodos();
    } catch (error) {
      setToggleError(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'No se pudo cambiar el Kill-Switch. Verifica tu sesión y permisos.',
      );
    } finally {
      setTogglingId(null);
    }
  };

  const getLedColor = (nodo) => {
    if (nodo.killSwitchActivo || nodo.estado === 'APAGADO') return '#ef4444'; // Rojo
    if (nodo.latenciaMs > 300 || nodo.estado === 'DEGRADADO') return '#f59e0b'; // Amarillo
    return '#10b981'; // Verde
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚦</span> Panel 1: Monitor de Nodos y Kill-Switches (EDA)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Control en vivo de la topología distribuida de microservicios con semáforo LED y conmutación de emergencia (Cátedra RDA2 §2, §7).
          </p>
        </div>
        <button 
          onClick={fetchNodos}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}
        >
          🔄 Actualizar Estado
        </button>
      </div>

      {loading && nodos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Sondeando topología de nodos...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {toggleError && (
            <div role="alert" style={{ gridColumn: '1 / -1', color: '#991b1b', background: '#fef2f2', padding: '10px 12px', borderRadius: '6px' }}>
              {toggleError}
            </div>
          )}
          {nodos.map((nodo) => {
            const led = getLedColor(nodo);
            const isOff = nodo.killSwitchActivo || nodo.estado === 'APAGADO';

            return (
              <div 
                key={nodo.id}
                style={{
                  border: isOff ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  background: isOff ? '#fef2f2' : '#ffffff',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: led,
                          boxShadow: `0 0 8px ${led}`,
                          display: 'inline-block'
                        }}
                      />
                      <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{nodo.codigo}</strong>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: isOff ? '#fee2e2' : '#dcfce7',
                        color: isOff ? '#991b1b' : '#166534',
                      }}
                    >
                      {isOff ? 'DESCONECTADO' : 'OPERATIVO'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: 500 }}>
                    {nodo.nombre}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '6px', borderRadius: '4px', marginBottom: '12px', wordBreak: 'break-all' }}>
                    {nodo.url}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                    <span>Latencia: <strong style={{ color: led }}>{nodo.latenciaMs ?? 25} ms</strong></span>
                    <span>Fallos seguidos: <strong>{nodo.failCount ?? 0}</strong></span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Kill-Switch:</span>
                  <button
                    onClick={() => handleToggle(nodo.id)}
                    disabled={togglingId === nodo.id}
                    style={{
                      background: isOff ? '#10b981' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {togglingId === nodo.id ? 'Cambiando...' : isOff ? '🟢 Encender Nodo' : '🔴 Activar Kill-Switch'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
