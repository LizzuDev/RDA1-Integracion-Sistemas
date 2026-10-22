import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel5_ConsolaFiscalFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/facturas');
      setFacturas(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      // Mock de facturación con IVA al 15% (Ecuador)
      setFacturas([
        {
          id: 'fac-uuid-001',
          numero_factura: 'FAC-001-001-000000142',
          cliente_nombre: 'Dilan Flores',
          cliente_cedula: '1720000000',
          fecha_emision: '2026-10-21T14:30:00Z',
          subtotal: 100.0,
          iva_15pct: 15.0, // 15%
          total: 115.0,
          estado: 'EMITIDA',
          idempotency_key: 'idem-chk-998811',
          items: [
            { descripcion: 'Tour Volcán Cotopaxi (Adulto)', cantidad: 1, precio_unitario: 55.0, subtotal: 55.0 },
            { descripcion: 'Alquiler Chevrolet Tracker Turbo (1 día)', cantidad: 1, precio_unitario: 45.0, subtotal: 45.0 },
          ]
        },
        {
          id: 'fac-uuid-002',
          numero_factura: 'FAC-001-001-000000143',
          cliente_nombre: 'Maria Benitez',
          cliente_cedula: '1711223344',
          fecha_emision: '2026-10-21T16:15:00Z',
          subtotal: 160.0,
          iva_15pct: 24.0, // 15%
          total: 184.0,
          estado: 'EMITIDA',
          idempotency_key: 'idem-chk-998812',
          items: [
            { descripcion: 'Alojamiento Suite Dann Carlton (2 noches)', cantidad: 2, precio_unitario: 80.0, subtotal: 160.0 },
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧾</span> Panel 5: Consola Fiscal de Facturación e IVA 15% (RDA2)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Auditoría de comprobantes electrónicos correlativos emitidos por el integrador con desglose estricto del 15% de IVA.
          </p>
        </div>
        <button 
          onClick={fetchFacturas}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🔄 Actualizar Facturas
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px 10px' }}>N° Factura Correlativo</th>
            <th style={{ padding: '12px 10px' }}>Cliente / RUC</th>
            <th style={{ padding: '12px 10px' }}>Fecha Emisión</th>
            <th style={{ padding: '12px 10px' }}>Subtotal 0% / 15%</th>
            <th style={{ padding: '12px 10px' }}>IVA 15%</th>
            <th style={{ padding: '12px 10px' }}>Total Facturado</th>
            <th style={{ padding: '12px 10px' }}>Estado</th>
            <th style={{ padding: '12px 10px' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 10px', fontWeight: 700, color: '#003580', fontFamily: 'monospace' }}>
                {f.numero_factura}
              </td>
              <td style={{ padding: '12px 10px' }}>
                <strong>{f.cliente_nombre}</strong><br/>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>RUC: {f.cliente_cedula || 'Consumidor Final'}</span>
              </td>
              <td style={{ padding: '12px 10px', color: '#64748b' }}>
                {new Date(f.fecha_emision).toLocaleString()}
              </td>
              <td style={{ padding: '12px 10px' }}>${Number(f.subtotal).toFixed(2)}</td>
              <td style={{ padding: '12px 10px', color: '#b45309', fontWeight: 600 }}>+${Number(f.iva_15pct).toFixed(2)}</td>
              <td style={{ padding: '12px 10px', fontWeight: 800, color: '#047857' }}>${Number(f.total).toFixed(2)}</td>
              <td style={{ padding: '12px 10px' }}>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ✓ {f.estado}
                </span>
              </td>
              <td style={{ padding: '12px 10px' }}>
                <button 
                  onClick={() => setFacturaSeleccionada(f)}
                  style={{ background: '#006ce4', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                >
                  Ver Detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL DETALLE DE FACTURA */}
      {facturaSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '90%', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#003580' }}>Comprobante Fiscal Electrónico</h3>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div><strong>Secuencial:</strong> {facturaSeleccionada.numero_factura}</div>
              <div><strong>Cliente:</strong> {facturaSeleccionada.cliente_nombre} ({facturaSeleccionada.cliente_cedula})</div>
              <div><strong>Idempotency Key:</strong> {facturaSeleccionada.idempotency_key}</div>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Líneas de Detalle:</h4>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '16px', maxHeight: '150px', overflowY: 'auto' }}>
              {(facturaSeleccionada.items || []).map((it, idx) => (
                <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>{it.descripcion} x{it.cantidad}</span>
                  <strong>${Number(it.subtotal).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div>Subtotal: <strong>${Number(facturaSeleccionada.subtotal).toFixed(2)}</strong></div>
              <div>IVA 15%: <strong style={{ color: '#b45309' }}>+${Number(facturaSeleccionada.iva_15pct).toFixed(2)}</strong></div>
              <div style={{ fontSize: '1.2rem', color: '#047857', fontWeight: 800, marginTop: '4px' }}>
                Total: ${Number(facturaSeleccionada.total).toFixed(2)} USD
              </div>
            </div>

            <button 
              onClick={() => setFacturaSeleccionada(null)}
              style={{ width: '100%', background: '#334155', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar Consola
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
