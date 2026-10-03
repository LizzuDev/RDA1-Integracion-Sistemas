import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export function Navbar() {
  const location = useLocation();
  const isAutos = location.pathname.startsWith('/autos');
  const { user } = useAuth();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // States for Profile Edit
  const [nombre, setNombre] = useState(user?.user_metadata?.nombre || '');
  const [apellido, setApellido] = useState(user?.user_metadata?.apellido || '');
  const [telefono, setTelefono] = useState(user?.user_metadata?.telefono || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    
    try {
      const cleanEmail = email.trim();
      const updates = { data: { nombre: nombre.trim(), apellido: apellido.trim(), telefono: telefono.trim() } };
      
      // Si cambia el correo
      if (cleanEmail !== user.email) {
        updates.email = cleanEmail;
      }
      
      // Si quiere cambiar contraseña, exigimos re-autenticar con la actual
      if (newPassword) {
        if (!currentPassword) {
           setProfileError('Debes ingresar tu contraseña actual para poder cambiarla.');
           return;
        }
        
        // Re-autenticación por seguridad
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });
        
        if (authError) {
          throw new Error('La contraseña actual que ingresaste es incorrecta.');
        }
        
        updates.password = newPassword;
      }
      
      const { data, error } = await supabase.auth.updateUser(updates);
      
      if (error) {
        // Mejorar los mensajes de error comunes de Supabase
        if (error.message.includes('Email address') && error.message.includes('invalid')) {
          throw new Error('El correo ingresado tiene un formato inválido o no está permitido por el servidor.');
        }
        throw error;
      }
      
      setProfileMsg('¡Perfil actualizado con éxito!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setProfileError(err.message);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          Booking<span>.com</span>
        </div>
        <div className="navbar-actions">
          <span className="nav-currency">USD</span>
          <span className="nav-flag">🇪🇨</span>
          <span className="nav-help">?</span>
          {user ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Link to="/mis-reservas" className="navbar-btn outline" style={{textDecoration: 'none', marginRight: '10px'}}>Mis reservas</Link>
              
              <div 
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
                  background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', color: 'white'
                }}
              >
                <div style={{ width: '32px', height: '32px', background: '#006ce4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid white' }}>
                  {user.user_metadata?.nombre ? user.user_metadata.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  {user.user_metadata?.nombre || 'Usuario'}
                </span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </div>

              {showDropdown && (
                <div style={{ position: 'absolute', top: '120%', right: 0, background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '200px', zIndex: 100 }}>
                  <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>{user.user_metadata?.nombre} {user.user_metadata?.apellido}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{user.email}</div>
                  </div>
                  <div 
                    onClick={() => { setShowProfileModal(true); setShowDropdown(false); }}
                    style={{ padding: '12px 15px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>👤</span> Editar cuenta
                  </div>
                  <div 
                    onClick={handleLogout}
                    style={{ padding: '12px 15px', color: '#d32f2f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #eee' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>🚪</span> Cerrar sesión
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/register" className="navbar-btn outline" style={{textDecoration: 'none'}}>Regístrate</Link>
              <Link to="/login" className="navbar-btn solid" style={{textDecoration: 'none'}}>Iniciar sesión</Link>
            </>
          )}
        </div>
      </div>
      <div className="navbar-secondary">
        <div className="navbar-links">
          <Link to="/">🛏️ Hospedajes</Link>
          <Link to="/vuelos">✈️ Vuelos</Link>
          <Link to="/autos" className={isAutos ? 'active' : ''}>🚗 Renta de autos</Link>
          <Link to="/" className={!isAutos ? 'active' : ''}>🎡 Atracciones</Link>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PERFIL */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '500px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: '#006ce4', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>👤 Editar Perfil</h2>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '30px' }}>
              {profileMsg && <div style={{ padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '15px' }}>{profileMsg}</div>}
              {profileError && <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>{profileError}</div>}
              
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Nombre</label>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Apellido</label>
                    <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Teléfono</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Correo Electrónico</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
                
                <h3 style={{ fontSize: '1rem', color: '#333', margin: '0' }}>Cambiar Contraseña</h3>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 10px 0' }}>Deja los campos vacíos si no deseas cambiarla.</p>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Contraseña Actual</label>
                  <input type="password" placeholder="Requerida para guardar nueva contraseña" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#333' }}>Nueva Contraseña</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowProfileModal(false)} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #006ce4', background: 'transparent', color: '#006ce4', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', background: '#006ce4', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
