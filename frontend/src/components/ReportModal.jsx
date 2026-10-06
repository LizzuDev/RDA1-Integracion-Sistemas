import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export function ReportModal({ isOpen, onClose, entityName, pnrOrId, type }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('Media');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // validation
    if (!subject.trim()) { setError('El asunto es requerido.'); return; }
    if (subject.trim().length < 5) { setError('El asunto debe tener al menos 5 caracteres.'); return; }
    if (!description.trim()) { setError('La descripción es requerida.'); return; }
    if (description.trim().length < 15) { setError('La descripción debe tener al menos 15 caracteres.'); return; }
    
    const hasSymbols = /[^a-zA-Z0-9\s,.\-ñÑáéíóúÁÉÍÓÚ?]/.test(subject) || /[^a-zA-Z0-9\s,.\-ñÑáéíóúÁÉÍÓÚ?]/.test(description);
    if(hasSymbols) {
      setError('Solo se permiten letras, números y puntuación básica.');
      return;
    }

    const ticket = {
      id: `TK-${Math.floor(Math.random()*10000)}`,
      client_name: user?.user_metadata?.nombre ? `${user.user_metadata.nombre} ${user.user_metadata.apellido||''}` : 'Usuario',
      email: user?.email || 'desconocido@email.com',
      entity_name: entityName,
      pnr_or_id: pnrOrId,
      type,
      subject,
      priority,
      description,
      status: 'PENDING'
    };
    
    try {
      const { error: sbError } = await supabase.from('support_tickets').insert([ticket]);
      if (sbError) throw sbError;
      
      onClose();
    } catch (err) {
      console.error('Error guardando ticket en Supabase:', err);
      setError('Hubo un error al enviar el reporte. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ background: 'white', padding: 24, borderRadius: 8, width: 450, maxWidth: '90%' }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 15, color: '#333' }}>Reportar Problema</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 20 }}>
          Estás reportando: <strong>{entityName}</strong>
        </p>

        {error && <div style={{ background: '#ffebee', color: '#d32f2f', padding: '10px', borderRadius: 4, marginBottom: 15, fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 5 }}>Asunto</label>
            <input value={subject} onChange={e=>{setSubject(e.target.value);setError('');}} type="text" placeholder="Ej: Problema con la reserva" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', outline:'none' }} />
          </div>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 5 }}>Prioridad</label>
            <select value={priority} onChange={e=>setPriority(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', outline:'none' }}>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 5 }}>Descripción detallada</label>
            <textarea value={description} onChange={e=>{setDescription(e.target.value);setError('');}} rows={4} placeholder="Describe el inconveniente en detalle..." style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', outline:'none', resize:'vertical' }} />
          </div>
          
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            <button type="submit" style={{ padding: '8px 16px', background: '#006ce4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>Enviar Reporte</button>
          </div>
        </form>
      </div>
    </div>
  );
}
