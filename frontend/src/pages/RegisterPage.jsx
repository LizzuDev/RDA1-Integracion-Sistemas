import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

export function RegisterPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: '',
    email: '',
    password: '',
    general: ''
  });

  const [invalidFlash, setInvalidFlash] = useState({
    nombre: false,
    apellido: false,
    cedula: false,
    telefono: false
  });

  const triggerFlash = (field) => {
    setInvalidFlash(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setInvalidFlash(prev => ({ ...prev, [field]: false }));
    }, 400); // El fondo rojo durará 400ms
  };

  // Validadores
  const validarCedulaEcuatoriana = (ced) => {
    if (ced.length !== 10) return false;
    const digitoRegion = parseInt(ced.substring(0, 2), 10);
    if (digitoRegion < 1 || digitoRegion > 24) return false;
    const tercerDigito = parseInt(ced.substring(2, 3), 10);
    if (tercerDigito >= 6) return false;
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const verificador = parseInt(ced.substring(9, 10), 10);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = parseInt(ced.charAt(i), 10) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }
    const digitoCalculado = (Math.ceil(suma / 10) * 10) - suma;
    return digitoCalculado === verificador;
  };

  // Requisitos de contraseña
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const newErrors = { nombre: '', apellido: '', cedula: '', telefono: '', email: '', password: '', general: '' };
    let hasError = false;

    if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 letras.';
      hasError = true;
    }
    if (apellido.trim().length < 3) {
      newErrors.apellido = 'El apellido debe tener al menos 3 letras.';
      hasError = true;
    }
    if (!validarCedulaEcuatoriana(cedula)) {
      newErrors.cedula = 'La cédula es inválida (verifique los 10 dígitos).';
      hasError = true;
    }
    if (telefono.length < 9) {
      newErrors.telefono = 'El teléfono debe tener al menos 9 dígitos.';
      hasError = true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Por favor ingresa un correo electrónico válido.';
      hasError = true;
    }
    if (!reqLength || !reqUpper || !reqLower || !reqNumber || !reqSpecial) {
      newErrors.password = 'La contraseña no cumple con los requisitos de seguridad.';
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre.trim(), apellido: apellido.trim(), cedula, telefono }
      }
    });

    if (error) {
      setErrors(prev => ({ ...prev, general: error.message }));
    } else {
      navigate('/', { replace: true });
    }
    setLoading(false);
  };

  // Sanitizadores con detector de intentos inválidos
  const handleNombreChange = (e) => {
    const rawValue = e.target.value;
    let val = rawValue.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    
    if (rawValue !== val) {
      triggerFlash('nombre');
    }
    
    if (val.length <= 50) {
      setNombre(val);
      setErrors(prev => ({ ...prev, nombre: '' }));
    }
  };

  const handleApellidoChange = (e) => {
    const rawValue = e.target.value;
    let val = rawValue.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    
    if (rawValue !== val) {
      triggerFlash('apellido');
    }

    if (val.length <= 50) {
      setApellido(val);
      setErrors(prev => ({ ...prev, apellido: '' }));
    }
  };

  const handleCedulaChange = (e) => {
    const rawValue = e.target.value;
    const val = rawValue.replace(/\D/g, '');
    
    if (rawValue !== val) {
      triggerFlash('cedula');
    }

    if (val.length <= 10) {
      setCedula(val);
      setErrors(prev => ({ ...prev, cedula: '' }));
    }
  };

  const handleTelefonoChange = (e) => {
    const rawValue = e.target.value;
    const val = rawValue.replace(/\D/g, '');
    
    if (rawValue !== val) {
      triggerFlash('telefono');
    }

    if (val.length <= 15) {
      setTelefono(val);
      setErrors(prev => ({ ...prev, telefono: '' }));
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setErrors(prev => ({ ...prev, password: '' }));
  };

  const inputStyle = (errorField, isFlashing) => ({
    width: '100%', 
    padding: '0.75rem', 
    borderRadius: '4px', 
    border: errorField || isFlashing ? '2px solid #d93025' : '1px solid #ccc',
    backgroundColor: errorField || isFlashing ? '#fce8e6' : '#fff', // Fondo rojo si hay error o intento inválido
    outline: 'none',
    transition: 'background-color 0.2s, border-color 0.2s'
  });

  const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: '500' };
  const errorMsgStyle = { color: '#d93025', fontSize: '0.8rem', marginTop: '4px', fontWeight: '500' };

  return (
    <main className="main-content" id="contenido-principal">
      <div className="state-container" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
        <h1 className="state-title" style={{ textAlign: 'center' }}>Crear una cuenta</h1>
        
        {errors.general && <div style={{ color: '#d93025', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#fce8e6', padding: '10px', borderRadius: '4px', fontWeight: '500' }}>{errors.general}</div>}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input 
              type="text" 
              required 
              value={nombre} 
              onChange={handleNombreChange}
              placeholder="Ej. Juan"
              style={inputStyle(errors.nombre, invalidFlash.nombre)}
            />
            {errors.nombre && <div style={errorMsgStyle}>{errors.nombre}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Apellido</label>
            <input 
              type="text" 
              required 
              value={apellido} 
              onChange={handleApellidoChange}
              placeholder="Ej. Pérez"
              style={inputStyle(errors.apellido, invalidFlash.apellido)}
            />
            {errors.apellido && <div style={errorMsgStyle}>{errors.apellido}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Cédula</label>
            <input 
              type="text" 
              required 
              value={cedula} 
              onChange={handleCedulaChange}
              placeholder="10 dígitos"
              style={inputStyle(errors.cedula, invalidFlash.cedula)}
            />
            {errors.cedula && <div style={errorMsgStyle}>{errors.cedula}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input 
              type="tel" 
              required 
              value={telefono} 
              onChange={handleTelefonoChange}
              placeholder="Ej. 0912345678"
              style={inputStyle(errors.telefono, invalidFlash.telefono)}
            />
            {errors.telefono && <div style={errorMsgStyle}>{errors.telefono}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={handleEmailChange}
              placeholder="ejemplo@correo.com"
              style={inputStyle(errors.email, false)}
            />
            {errors.email && <div style={errorMsgStyle}>{errors.email}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={handlePasswordChange}
              placeholder="Crea una contraseña segura"
              style={{ ...inputStyle(errors.password, false), marginBottom: '8px' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: reqLength ? '#1e8e3e' : '#777' }}>{reqLength ? '✓' : '○'} Al menos 8 caracteres</span>
              <span style={{ color: reqUpper ? '#1e8e3e' : '#777' }}>{reqUpper ? '✓' : '○'} Al menos 1 mayúscula</span>
              <span style={{ color: reqLower ? '#1e8e3e' : '#777' }}>{reqLower ? '✓' : '○'} Al menos 1 minúscula</span>
              <span style={{ color: reqNumber ? '#1e8e3e' : '#777' }}>{reqNumber ? '✓' : '○'} Al menos 1 número</span>
              <span style={{ color: reqSpecial ? '#1e8e3e' : '#777' }}>{reqSpecial ? '✓' : '○'} Al menos 1 símbolo especial (!@#$%^&*)</span>
            </div>
            {errors.password && <div style={{...errorMsgStyle, marginTop: '8px'}}>{errors.password}</div>}
          </div>
          
          <button 
            type="submit" 
            className="retry-btn" 
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', background: '#006ce4', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
          >
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#006ce4', fontWeight: '600', textDecoration: 'none' }}>Inicia sesión aquí</Link>
        </p>
      </div>
    </main>
  );
}
