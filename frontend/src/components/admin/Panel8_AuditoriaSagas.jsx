import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel8_AuditoriaSagas() {
  const [sagas, setSagas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaga, setSelectedSaga] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sagasRes, logsRes] = await Promise.all([
        api.get('/v2/esb/sagas').catch(() => []),
        api.get('/admin/audit').catch(() => []),
      ]);
      setSagas(Array.isArray(sagasRes) ? sagasRes : sagasRes.data || []);
      setLogs(Array.isArray(logsRes) ? logsRes : logsRes.data || []);
    } catch (e) {
      // Mock con demostración de Sagas LIFO y logs físicos de Winston
      setSagas([
        {
          id: 'saga-001',
          correlationId: 'SAGA-F82B14',
          sagaNombre: 'SAGA_CHECKOUT_MULTIDOMINIO',
          estado: 'COMPLETED',
          iniciadaAt: new Date(Date.now() - 3600000).toISOString(),
          finalizadaAt: new Date(Date.now() - 3590000).toISOString(),
          pasos: [
            { paso: 'HOLD_ATRACCIONES', estado: 'SUCCESS', compensado: false },
            { paso: 'HOLD_AUTOS', estado: 'SUCCESS', compensado: false },
            { paso: 'COBRO_PASARELA_SOA', estado: 'SUCCESS', compensado: false },
            { paso: 'EMISION_FACTURA_FISCAL', estado: 'SUCCESS', compensado: false },
          ]
        },
        {
          id: 'saga-002',
          correlationId: 'SAGA-A9C302',
          sagaNombre: 'SAGA_CHECKOUT_MULTIDOMINIO',
          estado: 'FAILED_COMPENSATED', // Rollback LIFO exitoso
          iniciadaAt: new Date(Date.now() - 1800000).toISOString(),
          finalizadaAt: new Date(Date.now() - 1795000).toISOString(),
          codigoCompensacion: 'REF-SAGA-A9C302-LIFO',
          pasos: [
            { paso: 'HOLD_ATRACCIONES', estado: 'COMPENSATED', compensado: true, detalle: 'Cupos restituidos en turno 10:00' },
            { paso: 'HOLD_AUTOS', estado: 'COMPENSATED', compensado: true, detalle: 'Bloqueo liberado para flota' },
            { paso: 'COBRO_PASARELA_SOA', estado: 'FAILED', compensado: false, detalle: 'HTTP 402 Fondos insuficientes' },
          ]
        }
      ]);

      setLogs([
        { timestamp: new Date().toISOString(), action: 'SAGA_CHECKOUT_ROLLBACK_COMPENSADO', correlation_id: 'SAGA-A9C302', status: 'FAILED_COMPENSATED', file: 'logs/audit-2026-10-21.log' },
        { timestamp: new Date(Date.now() - 120000).toISOString(), action: 'GRPC_STOCK_UPDATE_RECEIVED', correlation_id: 'CORR-GRPC-441', status: 'SYNCED', file: 'logs/audit-2026-10-21.log' },
        { timestamp: new Date(Date.now() - 300000).toISOString(), action: 'CHECKIN_ATRACCION_VALIDADO', correlation_id: 'CORR-CHK-881', status: 'SUCCESS', file: 'logs/audit-2026-10-21.log' },
        { timestamp: new Date(Date.now() - 600000).toISOString(), action: 'CHECKIN_DEVOLUCION_AUTO_COMPLETADO', correlation_id: 'CORR-AUT-102', status: 'COOLDOWN_2H_STARTED', file: 'logs/audit-2026-10-21.log' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡️</span> Panel 8: Auditoría Transaccional de Sagas LIFO y Logs Físicos Winston
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Trazabilidad de transacciones distribuidas en `schema_auditoria`, bitácora de compensaciones en orden inverso y streaming de archivos planos `logs/*.log`.
          </p>
        </div>
        <button 
          onClick={fetchData}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🔄 Refrescar Auditoría
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* MONITOR DE SAGAS */}
        <div>
          <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '12px' }}>
            Transacciones Distribuidas (Saga Orchestrator)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sagas.map((s) => {
              const isCompensated = s.estado === 'FAILED_COMPENSATED';

              return (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSaga(s)}
                  style={{
                    border: isCompensated ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    background: isCompensated ? '#fff5f5' : '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, color: '#003580', fontFamily: 'monospace' }}>{s.correlationId}</span>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: isCompensated ? '#fee2e2' : '#dcfce7',
                        color: isCompensated ? '#991b1b' : '#166534',
                      }}
                    >
                      {isCompensated ? '↺ SAGA ROLLBACK LIFO' : '✓ COMPLETADA'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                    {s.sagaNombre}
                  </div>

                  {s.codigoCompensacion && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginBottom: '6px' }}>
                      Compensación: {s.codigoCompensacion}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Inicio: {new Date(s.iniciadaAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VISOR DE LOGS FÍSICOS WINSTON */}
        <div>
          <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📜</span> Streaming de Archivos Planos Winston (CERO LOGS EN BD)
          </h3>
          <div style={{ background: '#0f172a', color: '#f8fafc', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.78rem', height: '340px', overflowY: 'auto' }}>
            <div style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '6px', marginBottom: '10px' }}>
              Archivo físico activo: logs/audit-2026-10-21.log
            </div>
            {logs.map((l, idx) => (
              <div key={idx} style={{ marginBottom: '10px', lineHeight: 1.4 }}>
                <span style={{ color: '#94a3b8' }}>[{new Date(l.timestamp).toLocaleTimeString()}]</span>{' '}
                <strong style={{ color: l.action?.includes('ROLLBACK') ? '#f87171' : '#4ade80' }}>
                  {l.action}
                </strong><br/>
                <span style={{ color: '#cbd5e1' }}>CorrID: {l.correlation_id} · Estado: {l.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
