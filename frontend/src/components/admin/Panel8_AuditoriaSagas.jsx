import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel8_AuditoriaSagas() {
  const [sagas, setSagas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaga, setSelectedSaga] = useState(null);
  const [searchCorrelationId, setSearchCorrelationId] = useState('');
  const [traceGraph, setTraceGraph] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sagasRes, logsRes] = await Promise.all([
        api.get('/v2/esb/sagas').catch(() => []),
        api.get('/admin/audit').catch(() => []),
      ]);
      const sagasList = Array.isArray(sagasRes) ? sagasRes : sagasRes.data || [];
      const logsList = Array.isArray(logsRes) ? logsRes : logsRes.data || [];

      if (sagasList.length > 0) {
        setSagas(sagasList);
        // Cargar por defecto la primera saga
        cargarTraza(sagasList[0].correlationId, sagasList[0]);
      } else {
        cargarMockSagas();
      }
      setLogs(logsList.length > 0 ? logsList : getMockLogs());
    } catch {
      cargarMockSagas();
      setLogs(getMockLogs());
    } finally {
      setLoading(false);
    }
  };

  const getMockLogs = () => [
    { timestamp: new Date().toISOString(), action: 'SAGA_CHECKOUT_ROLLBACK_COMPENSADO', correlation_id: 'SAGA-A9C302', status: 'FAILED_COMPENSATED', file: 'logs/audit-2026-10-25.log' },
    { timestamp: new Date(Date.now() - 120000).toISOString(), action: 'GRPC_STOCK_UPDATE_RECEIVED', correlation_id: 'CORR-GRPC-441', status: 'SYNCED', file: 'logs/audit-2026-10-25.log' },
    { timestamp: new Date(Date.now() - 300000).toISOString(), action: 'CHECKIN_ATRACCION_VALIDADO', correlation_id: 'CORR-CHK-881', status: 'SUCCESS', file: 'logs/audit-2026-10-25.log' },
    { timestamp: new Date(Date.now() - 600000).toISOString(), action: 'CHECKIN_DEVOLUCION_AUTO_COMPLETADO', correlation_id: 'CORR-AUT-102', status: 'COOLDOWN_2H_STARTED', file: 'logs/audit-2026-10-25.log' },
  ];

  const cargarMockSagas = () => {
    const mockList = [
      {
        id: 'saga-001',
        correlationId: 'SAGA-F82B14',
        sagaNombre: 'SAGA_CHECKOUT_MULTIDOMINIO',
        estado: 'COMPLETED',
        iniciadaAt: new Date(Date.now() - 3600000).toISOString(),
        finalizadaAt: new Date(Date.now() - 3590000).toISOString(),
        pasos: [
          { paso: 'HOLD_ATRACCIONES', estado: 'SUCCESS', compensado: false, duracionMs: 120 },
          { paso: 'HOLD_AUTOS', estado: 'SUCCESS', compensado: false, duracionMs: 145 },
          { paso: 'COBRO_PASARELA_SOA', estado: 'SUCCESS', compensado: false, duracionMs: 230 },
          { paso: 'EMISION_FACTURA_FISCAL', estado: 'SUCCESS', compensado: false, duracionMs: 95 },
        ],
      },
      {
        id: 'saga-002',
        correlationId: 'SAGA-A9C302',
        sagaNombre: 'SAGA_CHECKOUT_MULTIDOMINIO',
        estado: 'FAILED_COMPENSATED',
        iniciadaAt: new Date(Date.now() - 1800000).toISOString(),
        finalizadaAt: new Date(Date.now() - 1795000).toISOString(),
        codigoCompensacion: 'REF-SAGA-A9C302-LIFO',
        pasos: [
          { paso: 'HOLD_ATRACCIONES', estado: 'COMPENSATED', compensado: true, duracionMs: 110, detalle: 'Cupos restituidos en turno 10:00' },
          { paso: 'HOLD_AUTOS', estado: 'COMPENSATED', compensado: true, duracionMs: 135, detalle: 'Bloqueo liberado para flota' },
          { paso: 'COBRO_PASARELA_SOA', estado: 'FAILED', compensado: false, duracionMs: 80, error: 'HTTP 402 Fondos insuficientes' },
        ],
      },
    ];
    setSagas(mockList);
    cargarTraza(mockList[0].correlationId, mockList[0]);
  };

  const cargarTraza = async (correlationId, sagaObj = null) => {
    if (!correlationId) return;
    setLoadingTrace(true);
    if (sagaObj) setSelectedSaga(sagaObj);

    try {
      const res = await api.get(`/v2/observabilidad/trazas/${encodeURIComponent(correlationId)}`);
      setTraceGraph(res.data || res);
    } catch {
      // Reconstruir grafo sintético en fallback
      const found = sagas.find((s) => s.correlationId === correlationId) || sagaObj;
      if (found) {
        const isComp = found.estado?.includes('COMPENSAT') || found.estado === 'FAILED';
        setTraceGraph({
          correlation_id: found.correlationId,
          root_process: found.sagaNombre || 'CHECKOUT_MULTIVERTICAL_SAGA',
          overall_status: found.estado === 'COMPLETED' ? 'COMPLETED' : 'COMPENSATED',
          duration_ms: 590,
          nodes: [
            {
              id: 'span-orchestrator',
              label: 'API Gateway (Saga Orchestrator)',
              service: 'MS_ESB',
              status: found.estado === 'COMPLETED' ? 'SUCCESS' : 'COMPENSATED',
              color_led: found.estado === 'COMPLETED' ? '🟢' : '🟡',
              duration_ms: 590,
            },
            ...(found.pasos || []).map((p, idx) => ({
              id: `span-step-${idx}`,
              label: `${p.paso}`,
              service: p.paso?.includes('ATR') ? 'MS_ATR' : p.paso?.includes('AUT') ? 'MS_AUT' : 'MS_PAG',
              status: p.compensado ? 'COMPENSATED' : p.estado === 'FAILED' ? 'ERROR' : 'SUCCESS',
              color_led: p.compensado ? '🟡' : p.estado === 'FAILED' ? '🔴' : '🟢',
              duration_ms: p.duracionMs || 100,
              error_details: p.error || p.detalle || null,
            })),
            {
              id: 'span-broker',
              label: 'RabbitMQ (booking.events)',
              service: 'RABBITMQ',
              status: 'SUCCESS',
              color_led: '🟢',
              duration_ms: 15,
            },
          ],
          edges: (found.pasos || []).map((p, idx) => ({
            from: idx === 0 ? 'span-orchestrator' : `span-step-${idx - 1}`,
            to: `span-step-${idx}`,
            protocol: 'REST',
            kind: p.compensado ? 'compensación' : 'llamada',
            event_name: p.paso,
          })),
        });
      } else {
        setTraceGraph(null);
      }
    } finally {
      setLoadingTrace(false);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (searchCorrelationId.trim()) {
      cargarTraza(searchCorrelationId.trim());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> Panel 8: Observabilidad, Grafo de Trazas DAG y Sagas LIFO
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Monitoreo interactivo de la cátedra (Semana 8): grafo acíclico dirigido de spans, nodos verdes (🟢) y rojos (🔴), y bitácora física Winston.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Buscar por Correlation-ID..."
              value={searchCorrelationId}
              onChange={(e) => setSearchCorrelationId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                minWidth: '220px',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              🔍 Buscar
            </button>
          </form>
          <button
            onClick={fetchData}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* LISTA DE TRANSACCIONES SAGA RECIENTES */}
        <div>
          <h3 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Transacciones Saga Recientes</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{sagas.length} eventos</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {sagas.map((s) => {
              const isSelected = selectedSaga?.correlationId === s.correlationId;
              const isCompensated = s.estado?.includes('COMPENSAT') || s.estado === 'FAILED';

              return (
                <div
                  key={s.id || s.correlationId}
                  onClick={() => cargarTraza(s.correlationId, s)}
                  style={{
                    border: isSelected
                      ? '2px solid #0284c7'
                      : isCompensated
                      ? '1px solid #fecaca'
                      : '1px solid #e2e8f0',
                    background: isSelected
                      ? '#f0f9ff'
                      : isCompensated
                      ? '#fff5f5'
                      : '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#003580', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {s.correlationId}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        background: isCompensated ? '#fee2e2' : '#dcfce7',
                        color: isCompensated ? '#991b1b' : '#166534',
                      }}
                    >
                      {isCompensated ? '↺ ROLLBACK LIFO' : '✓ OK'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    {s.sagaNombre || 'SAGA_CHECKOUT'}
                  </div>

                  {s.codigoCompensacion && (
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                      Comp: {s.codigoCompensacion}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* GRAFO VISUAL DAG Y LÍNEA DE TIEMPO */}
        <div>
          {loadingTrace ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <span>⏳ Reconstruyendo grafo de trazas y leyendo archivos de log...</span>
            </div>
          ) : traceGraph ? (
            <div>
              {/* FICHA RESUMEN DEL PROCESO */}
              <div
                style={{
                  background: traceGraph.overall_status === 'COMPLETED' ? '#f0fdf4' : '#fef2f2',
                  border: traceGraph.overall_status === 'COMPLETED' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Correlation-ID: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{traceGraph.correlation_id}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {traceGraph.root_process}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Duración Total</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {traceGraph.duration_ms} ms
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      background: traceGraph.overall_status === 'COMPLETED' ? '#22c55e' : '#ef4444',
                      color: '#fff',
                    }}
                  >
                    {traceGraph.overall_status === 'COMPLETED' ? '🟢 EXITOSA' : '🔴 COMPENSADA'}
                  </div>
                </div>
              </div>

              {/* RENDERIZADO DEL GRAFO DAG (SVG INTERACTIVO) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa', padding: '16px', position: 'relative', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Grafo Acíclico Dirigido de Microservicios (Semana 8)</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pasa el cursor sobre un nodo para ver la latencia y error</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '180px', overflowX: 'auto', padding: '10px 0' }}>
                  <svg width="680" height="150" viewBox="0 0 680 150" style={{ maxWidth: '100%', overflow: 'visible' }}>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                      </marker>
                      <marker id="arrow-comp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                      </marker>
                    </defs>

                    {/* FLECHAS / ARISTAS */}
                    {traceGraph.nodes.map((node, i) => {
                      if (i === traceGraph.nodes.length - 1) return null;
                      const x1 = 70 + i * 150 + 45;
                      const y1 = 65;
                      const x2 = 70 + (i + 1) * 150 - 45;
                      const y2 = 65;
                      return (
                        <g key={`edge-${i}`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#94a3b8"
                            strokeWidth="2"
                            markerEnd="url(#arrow)"
                          />
                          <text x={(x1 + x2) / 2} y={y1 - 8} fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="600">
                            REST
                          </text>
                        </g>
                      );
                    })}

                    {/* NODOS DEL GRAFO */}
                    {traceGraph.nodes.map((node, i) => {
                      const cx = 70 + i * 150;
                      const cy = 65;
                      const isError = node.status === 'ERROR';
                      const isComp = node.status === 'COMPENSATED';
                      const strokeColor = isError ? '#ef4444' : isComp ? '#eab308' : '#22c55e';
                      const fillColor = isError ? '#fee2e2' : isComp ? '#fef9c3' : '#dcfce7';

                      return (
                        <g
                          key={node.id}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r="36"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="3"
                          />
                          <text x={cx} y={cy - 6} fontSize="14" textAnchor="middle">
                            {node.color_led || (isError ? '🔴' : isComp ? '🟡' : '🟢')}
                          </text>
                          <text x={cx} y={cy + 14} fontSize="10" textAnchor="middle" fontWeight="bold" fill="#0f172a">
                            {node.service}
                          </text>
                          <text x={cx} y={cy + 52} fontSize="9.5" textAnchor="middle" fill="#334155" fontWeight="600">
                            {node.duration_ms} ms
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* TOOLTIP / TARJETA DE INSPECCIÓN DEL NODO */}
                {hoveredNode && (
                  <div
                    style={{
                      background: '#0f172a',
                      color: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      marginTop: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                      <span>{hoveredNode.label}</span>
                      <span style={{ color: hoveredNode.status === 'ERROR' ? '#f87171' : hoveredNode.status === 'COMPENSATED' ? '#fde047' : '#4ade80' }}>
                        {hoveredNode.status} ({hoveredNode.duration_ms} ms)
                      </span>
                    </div>
                    {hoveredNode.error_details && (
                      <div style={{ color: '#fca5a5', marginTop: '4px' }}>
                        ⚠️ Fallo: {hoveredNode.error_details}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LÍNEA DE TIEMPO DE COMPENSACIONES LIFO (SI HUBO ROLLBACK) */}
              {traceGraph.overall_status === 'COMPENSATED' && (
                <div style={{ border: '1px solid #fecaca', background: '#fff5f5', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>↺</span> Secuencia de Compensación LIFO (Orden Inverso Estricto):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                    <div style={{ color: '#b91c1c' }}>
                      <strong>Paso 1 (Causa):</strong> Cobro en Pasarela falló ➔ Iniciando Rollback automático en orden inverso.
                    </div>
                    <div style={{ color: '#854d0e' }}>
                      <strong>Compensación A:</strong> Cancelación de bloqueo en Autos ejecutada exitosamente.
                    </div>
                    <div style={{ color: '#854d0e' }}>
                      <strong>Compensación B:</strong> Cancelación y restitución de cupos en Atracciones ejecutada exitosamente.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <span>No se ha seleccionado ninguna traza. Selecciona una saga de la izquierda o introduce un Correlation-ID.</span>
            </div>
          )}

          {/* VISOR DE ARCHIVOS FÍSICOS WINSTON */}
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📜</span> Streaming de Archivos Planos Winston (CERO LOGS EN BD — ADR-003)
            </h3>
            <div style={{ background: '#0f172a', color: '#f8fafc', padding: '14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.78rem', maxHeight: '180px', overflowY: 'auto' }}>
              {logs.map((l, idx) => (
                <div key={idx} style={{ marginBottom: '6px', lineHeight: 1.3 }}>
                  <span style={{ color: '#94a3b8' }}>[{new Date(l.timestamp).toLocaleTimeString()}]</span>{' '}
                  <strong style={{ color: l.action?.includes('ROLLBACK') ? '#f87171' : '#4ade80' }}>
                    {l.action}
                  </strong>{' '}
                  <span style={{ color: '#cbd5e1' }}>CorrID: {l.correlation_id} · Estado: {l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
