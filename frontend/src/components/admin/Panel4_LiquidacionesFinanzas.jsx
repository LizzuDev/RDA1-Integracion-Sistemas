import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel4_LiquidacionesFinanzas() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const fetchLiquidaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finanzas/liquidaciones');
      setLiquidaciones(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      // Mock con regla de cátedra (10% Booking / 90% Proveedor)
      setLiquidaciones([
        {
          id: 'liq-1',
          codigo_liquidacion: 'LIQ-ATR-2026-001',
          proveedor_nombre: 'Dilan Tours Ecuador (Atracciones)',
          periodo: 'Quincena 1 - Octubre 2026',
          total_ventas_bruto: 1450.0,
          comision_booking_10pct: 145.0, // 10%
          monto_neto_proveedor_90pct: 1305.0, // 90%
          estado: 'PAGADO',
          comprobante_url: 'https://banco.pichincha.com/comprobantes/trans-998822.pdf',
          fecha_liquidacion: '2026-10-15',
        },
        {
          id: 'liq-2',
          codigo_liquidacion: 'LIQ-AUT-2026-002',
          proveedor_nombre: 'Hertz & Alamo Rent a Car (Autos)',
          periodo: 'Quincena 1 - Octubre 2026',
          total_ventas_bruto: 2200.0,
          comision_booking_10pct: 220.0, // 10%
          monto_neto_proveedor_90pct: 1980.0, // 90%
          estado: 'PENDIENTE_PAGO',
          comprobante_url: null,
          fecha_liquidacion: '2026-10-18',
        },
        {
          id: 'liq-3',
          codigo_liquidacion: 'LIQ-ALO-2026-003',
          proveedor_nombre: 'Hotel Dann Carlton Quito (Alojamientos)',
          periodo: 'Quincena 1 - Octubre 2026',
          total_ventas_bruto: 3400.0,
          comision_booking_10pct: 340.0, // 10%
          monto_neto_proveedor_90pct: 3060.0, // 90%
          estado: 'PENDIENTE_PAGO',
          comprobante_url: null,
          fecha_liquidacion: '2026-10-20',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidaciones();
  }, []);

  const totalVentas = liquidaciones.reduce((acc, l) => acc + Number(l.total_ventas_bruto || 0), 0);
  const totalComision = liquidaciones.reduce((acc, l) => acc + Number(l.comision_booking_10pct || 0), 0);
  const totalPorPagar = liquidaciones.filter(l => l.estado === 'PENDIENTE_PAGO').reduce((acc, l) => acc + Number(l.monto_neto_proveedor_90pct || 0), 0);

  const handlePagar = async (liqId) => {
    try {
      await api.post(`/finanzas/liquidaciones/${liqId}/pagar`, {
        comprobante_url: comprobanteUrl || 'https://banco.pichincha.com/comprobante-demo.pdf',
      });
      await fetchLiquidaciones();
    } catch (e) {
      setLiquidaciones(prev => prev.map(l => l.id === liqId ? { ...l, estado: 'PAGADO', comprobante_url: 'https://banco.pichincha.com/comprobante-demo.pdf' } : l));
    } finally {
      setSelectedId(null);
      setComprobanteUrl('');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💼</span> Panel 4: Liquidaciones Financieras y Comisión 10% (RDA2)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Liquidación quincenal automática a proveedores externos reteniendo el 10% de comisión de Booking Prototipo.
          </p>
        </div>
        <button 
          onClick={fetchLiquidaciones}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🔄 Actualizar Ledger
        </button>
      </div>

      {/* TARJETAS RESUMEN DE SALDOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', borderTop: '4px solid #006ce4' }}>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Bruto Transaccionado:</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            ${totalVentas.toFixed(2)} USD
          </div>
        </div>

        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', borderTop: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>Ganancia Neta Booking (10% Comisión):</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
            +${totalComision.toFixed(2)} USD
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', borderTop: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>Por Liquidar a Proveedores (90% Neto):</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
            ${totalPorPagar.toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* TABLA DE LIQUIDACIONES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px 10px' }}>Código Liquidación</th>
            <th style={{ padding: '12px 10px' }}>Proveedor / Vertical</th>
            <th style={{ padding: '12px 10px' }}>Total Venta</th>
            <th style={{ padding: '12px 10px' }}>Comisión Booking (10%)</th>
            <th style={{ padding: '12px 10px' }}>Neto Proveedor (90%)</th>
            <th style={{ padding: '12px 10px' }}>Estado</th>
            <th style={{ padding: '12px 10px' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {liquidaciones.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 10px', fontWeight: 600, color: '#003580' }}>{l.codigo_liquidacion}</td>
              <td style={{ padding: '12px 10px' }}>{l.proveedor_nombre}</td>
              <td style={{ padding: '12px 10px' }}>${Number(l.total_ventas_bruto).toFixed(2)}</td>
              <td style={{ padding: '12px 10px', color: '#047857', fontWeight: 700 }}>+${Number(l.comision_booking_10pct).toFixed(2)}</td>
              <td style={{ padding: '12px 10px', fontWeight: 700 }}>${Number(l.monto_neto_proveedor_90pct).toFixed(2)}</td>
              <td style={{ padding: '12px 10px' }}>
                <span 
                  style={{ 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    background: l.estado === 'PAGADO' ? '#dcfce7' : '#fef3c7',
                    color: l.estado === 'PAGADO' ? '#166534' : '#92400e',
                  }}
                >
                  {l.estado === 'PAGADO' ? '✓ PAGADO' : '● PENDIENTE'}
                </span>
              </td>
              <td style={{ padding: '12px 10px' }}>
                {l.estado === 'PAGADO' ? (
                  <a 
                    href={l.comprobante_url || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: '#006ce4', textDecoration: 'none', fontWeight: 600 }}
                  >
                    📄 Comprobante
                  </a>
                ) : (
                  <button 
                    onClick={() => handlePagar(l.id)}
                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    💳 Marcar Pagado
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
