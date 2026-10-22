import React, { useState } from 'react';
import { api } from '../../services/api';

export function Panel6_SimuladorPagosSOA() {
  const [escenario, setEscenario] = useState('NORMAL'); // 'NORMAL' | 'RECHAZO_FONDOS' | 'TIMEOUT_RED'
  const [monto, setMonto] = useState(150.0);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleSimularPago = async () => {
    setProcesando(true);
    setResultado(null);

    const idempotencyKey = `SIM-PAG-${Date.now()}`;
    try {
      const res = await api.post('/pagos/procesar', {
        monto: Number(monto),
        moneda: 'USD',
        metodo_pago: 'TARJETA_CREDITO',
        numero_tarjeta: '4500123456789012',
        titular: 'Turista Simulado',
        escenario_simulado: escenario,
      }, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      setResultado({
        status: 'APROBADO',
        data: res,
        codigo_autorizacion: res.codigo_autorizacion || `AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        idempotency_key: idempotencyKey,
      });
    } catch (err) {
      const data = err.response?.data || {};
      setResultado({
        status: escenario === 'TIMEOUT_RED' ? 'TIMEOUT_RED' : 'RECHAZADO',
        error: data.detail || err.message,
        codigo_compensacion: data.codigo_compensacion || `REF-PAG-FAIL-${Date.now()}`,
        idempotency_key: idempotencyKey,
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💳</span> Panel 6: Simulador de Pasarela de Pagos SOA e Inyección de Fallos
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Configuración interactiva de escenarios para comprobar el comportamiento del Circuit Breaker y la compensación automática de Sagas distribuidas (Cátedra RDA2 §8).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* PANEL DE CONTROL DE INYECCIÓN DE FALLOS */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 16px 0' }}>Modo de Simulación Activo</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px', 
                borderRadius: '8px', 
                border: escenario === 'NORMAL' ? '2px solid #10b981' : '1px solid #cbd5e1',
                background: escenario === 'NORMAL' ? '#ecfdf5' : '#fff',
                cursor: 'pointer' 
              }}
            >
              <input 
                type="radio" 
                name="escenario" 
                value="NORMAL" 
                checked={escenario === 'NORMAL'} 
                onChange={(e) => setEscenario(e.target.value)} 
              />
              <div>
                <strong style={{ color: '#047857', display: 'block', fontSize: '0.9rem' }}>🟢 Escenario Normal (Aprobación Inmediata)</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Genera código de autorización fiscal `AUTH-XXXXXX` en 45ms.</span>
              </div>
            </label>

            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px', 
                borderRadius: '8px', 
                border: escenario === 'RECHAZO_FONDOS' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                background: escenario === 'RECHAZO_FONDOS' ? '#fef2f2' : '#fff',
                cursor: 'pointer' 
              }}
            >
              <input 
                type="radio" 
                name="escenario" 
                value="RECHAZO_FONDOS" 
                checked={escenario === 'RECHAZO_FONDOS'} 
                onChange={(e) => setEscenario(e.target.value)} 
              />
              <div>
                <strong style={{ color: '#b91c1c', display: 'block', fontSize: '0.9rem' }}>🔴 Rechazo por Fondos Insuficientes (HTTP 402)</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Dispara rollback compensatorio LIFO para liberar reservas turísticas previas.</span>
              </div>
            </label>

            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px', 
                borderRadius: '8px', 
                border: escenario === 'TIMEOUT_RED' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                background: escenario === 'TIMEOUT_RED' ? '#fffbeb' : '#fff',
                cursor: 'pointer' 
              }}
            >
              <input 
                type="radio" 
                name="escenario" 
                value="TIMEOUT_RED" 
                checked={escenario === 'TIMEOUT_RED'} 
                onChange={(e) => setEscenario(e.target.value)} 
              />
              <div>
                <strong style={{ color: '#b45309', display: 'block', fontSize: '0.9rem' }}>⏱️ Timeout Forzado de Red ({'>'} 6000 ms)</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Comprueba la apertura del Circuit Breaker y la anulación de la transacción.</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Monto a Transaccionar (USD):
            </label>
            <input 
              type="number" 
              value={monto} 
              onChange={(e) => setMonto(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }} 
            />
          </div>

          <button 
            onClick={handleSimularPago}
            disabled={procesando}
            style={{ 
              width: '100%', 
              background: '#006ce4', 
              color: '#fff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '1rem', 
              fontWeight: 700, 
              cursor: procesando ? 'not-allowed' : 'pointer' 
            }}
          >
            {procesando ? 'Procesando en Pasarela SOA...' : '⚡ Disparar Transacción de Prueba'}
          </button>
        </div>

        {/* RESPUESTA Y TRAZABILIDAD DE LA PASARELA */}
        <div style={{ background: '#0f172a', color: '#f8fafc', padding: '20px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px' }}>
            <span style={{ color: '#94a3b8' }}>Salida de Pasarela SOA (JSON)</span>
            <span style={{ color: resultado?.status === 'APROBADO' ? '#4ade80' : resultado ? '#f87171' : '#94a3b8' }}>
              {resultado ? `ESTADO: ${resultado.status}` : 'ESPERANDO PETICIÓN'}
            </span>
          </div>

          {resultado ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: resultado.status === 'APROBADO' ? '#86efac' : '#fca5a5' }}>
              {JSON.stringify(resultado, null, 2)}
            </pre>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
              Selecciona un escenario y presiona el botón para disparar la prueba de pago con Idempotency-Key.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
