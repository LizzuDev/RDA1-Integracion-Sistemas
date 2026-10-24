import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function Panel3_ArbolCategoriasAtracciones() {
  const [arbol, setArbol] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevaCat, setNuevaCat] = useState({
    nombre: '',
    parentId: '',
    incluye_comida: false,
    incluye_transporte: false,
    incluye_guia: true,
  });
  const [guardando, setGuardando] = useState(false);

  const fetchArbol = async () => {
    try {
      setLoading(true);
      const res = await api.get('/atracciones/categorias/arbol');
      setArbol(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      // Mock inicial si el endpoint remoto no está disponible
      setArbol([
        {
          id: 'cat-1',
          nombre: 'Turismo y Aventura de Montaña',
          incluye_comida: true,
          incluye_transporte: true,
          incluye_guia: true,
          hijos: [
            {
              id: 'cat-1-1',
              nombre: 'Ascenso a Volcanes de los Andes (Cotopaxi / Chimborazo)',
              incluye_comida: true,
              incluye_transporte: true,
              incluye_guia: true,
              hijos: []
            },
            {
              id: 'cat-1-2',
              nombre: 'Trekking en Lagunas de Altura (Quilotoa)',
              incluye_comida: false,
              incluye_transporte: true,
              incluye_guia: true,
              hijos: []
            }
          ]
        },
        {
          id: 'cat-2',
          nombre: 'Patrimonio Cultural y Centros Históricos',
          incluye_comida: false,
          incluye_transporte: false,
          incluye_guia: true,
          hijos: [
            {
              id: 'cat-2-1',
              nombre: 'Ruta Colonial y Monasterios del Centro de Quito',
              incluye_comida: true,
              incluye_transporte: false,
              incluye_guia: true,
              hijos: []
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArbol();
  }, []);

  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCat.nombre.trim()) return;

    setGuardando(true);
    try {
      await api.post('/atracciones/categorias', {
        nombre: nuevaCat.nombre.trim(),
        parent_id: nuevaCat.parentId || null,
        incluye_comida: nuevaCat.incluye_comida,
        incluye_transporte: nuevaCat.incluye_transporte,
        incluye_guia: nuevaCat.incluye_guia,
      });
      setNuevaCat({ nombre: '', parentId: '', incluye_comida: false, incluye_transporte: false, incluye_guia: true });
      await fetchArbol();
    } catch (err) {
      // Simulación local si backend no responde
      const nuevoNodo = {
        id: `cat-${Date.now()}`,
        nombre: nuevaCat.nombre,
        incluye_comida: nuevaCat.incluye_comida,
        incluye_transporte: nuevaCat.incluye_transporte,
        incluye_guia: nuevaCat.incluye_guia,
        hijos: []
      };
      setArbol(prev => [...prev, nuevoNodo]);
      setNuevaCat({ nombre: '', parentId: '', incluye_comida: false, incluye_transporte: false, incluye_guia: true });
    } finally {
      setGuardando(false);
    }
  };

  const renderNodo = (nodo, nivel = 0) => {
    return (
      <div key={nodo.id} style={{ marginLeft: `${nivel * 24}px`, marginTop: '8px' }}>
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: nivel === 0 ? '#f8fafc' : '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: nivel === 0 ? '4px solid #006ce4' : '3px solid #94a3b8',
            padding: '10px 14px',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>{nivel === 0 ? '📁' : '↳ 📄'}</span>
            <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{nodo.nombre}</strong>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {nodo.incluye_comida && (
              <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                🍴 Comida
              </span>
            )}
            {nodo.incluye_transporte && (
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                🚌 Transporte
              </span>
            )}
            {nodo.incluye_guia && (
              <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                🧭 Guía Oficial
              </span>
            )}
          </div>
        </div>

        {nodo.hijos && nodo.hijos.length > 0 && (
          <div style={{ borderLeft: '1px dashed #cbd5e1', marginLeft: '12px', paddingLeft: '8px' }}>
            {nodo.hijos.map(hijo => renderNodo(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌲</span> Panel 3: Árbol Jerárquico Recursivo de Atracciones (RDA2 §6)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Gestión de categorías multicapa con los 3 flags de inclusión obligatorios de Cátedra: Comida, Transporte y Guía turístico.
          </p>
        </div>
        <button 
          onClick={fetchArbol}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🔄 Refrescar Árbol
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* VISTA DEL ÁRBOL */}
        <div>
          <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: '12px' }}>Jerarquía Actual de Categorías</h3>
          {loading && arbol.length === 0 ? (
            <div style={{ color: '#64748b', padding: '20px' }}>Cargando árbol de categorías...</div>
          ) : (
            <div>{arbol.map(nodo => renderNodo(nodo, 0))}</div>
          )}
        </div>

        {/* FORMULARIO DE NUEVA CATEGORÍA */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 14px 0' }}>Nueva Categoría / Subcategoría</h3>
          <form onSubmit={handleCrearCategoria}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Nombre de la Categoría:
              </label>
              <input 
                type="text" 
                value={nuevaCat.nombre} 
                onChange={(e) => setNuevaCat({ ...nuevaCat, nombre: e.target.value })}
                placeholder="Ej. Ecoturismo y Cascadas" 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.82rem', color: '#334155', display: 'block', marginBottom: '8px' }}>
                Flags de Inclusión Requeridos:
              </strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={nuevaCat.incluye_comida} 
                  onChange={(e) => setNuevaCat({ ...nuevaCat, incluye_comida: e.target.checked })}
                />
                🍴 Incluye Alimentos / Degustación
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={nuevaCat.incluye_transporte} 
                  onChange={(e) => setNuevaCat({ ...nuevaCat, incluye_transporte: e.target.checked })}
                />
                🚌 Incluye Transporte / Recogida
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={nuevaCat.incluye_guia} 
                  onChange={(e) => setNuevaCat({ ...nuevaCat, incluye_guia: e.target.checked })}
                />
                🧭 Guía Turístico Oficial Certificado
              </label>
            </div>

            <button 
              type="submit" 
              disabled={guardando}
              style={{ width: '100%', background: '#006ce4', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {guardando ? 'Guardando...' : '➕ Agregar al Árbol'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
