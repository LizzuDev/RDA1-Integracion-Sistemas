import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem('register_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nombre) setNombre(parsed.nombre);
        if (parsed.apellido) setApellido(parsed.apellido);
        if (parsed.cedula) setCedula(parsed.cedula);
        if (parsed.telefono) setTelefono(parsed.telefono);
        if (parsed.email) setEmail(parsed.email);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('register_form', JSON.stringify({
      nombre, apellido, cedula, telefono, email
    }));
  }, [nombre, apellido, cedula, telefono, email]);
  
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
    if (telefono.length < 10 || !telefono.startsWith('09') || /^09(\d)\1{7}$/.test(telefono)) {
      newErrors.telefono = 'El celular debe ser válido (10 dígitos, iniciar con 09).';
      hasError = true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 30) {
      newErrors.email = 'Por favor ingresa un correo electrónico válido.';
      hasError = true;
    }
    if (!reqLength || !reqUpper || !reqLower || !reqNumber || !reqSpecial || password.length > 30) {
      newErrors.password = 'La contraseña no cumple con los requisitos de seguridad.';
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    setLoading(true);
    let sessionEstablished = false;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre.trim(), apellido: apellido.trim(), cedula, telefono }
      }
    });

    if (data?.session) {
      sessionEstablished = true;
    } else if (data?.user?.id) {
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
        } catch (err) {
          console.warn('Auto confirm error:', err);
        }
      }
    } else if (error && (error.status === 429 || error.message?.includes('rate limit')) && supabaseAdmin) {
      try {
        const adminRes = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre: nombre.trim(), apellido: apellido.trim(), cedula, telefono }
        });
        if (adminRes.error) {
          setErrors(prev => ({ ...prev, general: adminRes.error.message }));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Admin create error:', err);
      }
    } else if (error) {
      setErrors(prev => ({ ...prev, general: error.message }));
      setLoading(false);
      return;
    }

    if (!sessionEstablished) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginData?.session) {
        sessionEstablished = true;
      } else if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          setErrors(prev => ({ ...prev, general: 'El correo ya está registrado. Por favor, inicia sesión con tu contraseña original.' }));
        } else {
          setErrors(prev => ({ ...prev, general: loginError.message }));
        }
        setLoading(false);
        return;
      }
    }

    if (sessionEstablished) {
      window.location.href = '/';
    }
    setLoading(false);
  };

  // Sanitizadores con mensajes de error en tiempo real
  const handleNombreChange = (e) => {
    const rawValue = e.target.value;
    const hasInvalid = /[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/.test(rawValue);
    const hasSpaces = /\s{2,}/.test(rawValue) || /^\s/.test(rawValue);

    let val = rawValue.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, nombre: 'Solo se permiten letras, sin números ni símbolos.' }));
    } else if (hasSpaces) {
      setErrors(prev => ({ ...prev, nombre: 'No se permiten espacios al inicio ni consecutivos.' }));
    } else {
      setErrors(prev => ({ ...prev, nombre: '' }));
    }

    if (val.length <= 50) setNombre(val);
  };

  const handleApellidoChange = (e) => {
    const rawValue = e.target.value;
    const hasInvalid = /[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/.test(rawValue);
    const hasSpaces = /\s{2,}/.test(rawValue) || /^\s/.test(rawValue);

    let val = rawValue.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, apellido: 'Solo se permiten letras, sin números ni símbolos.' }));
    } else if (hasSpaces) {
      setErrors(prev => ({ ...prev, apellido: 'No se permiten espacios al inicio ni consecutivos.' }));
    } else {
      setErrors(prev => ({ ...prev, apellido: '' }));
    }

    if (val.length <= 50) setApellido(val);
  };

  const handleCedulaChange = (e) => {
    const rawValue = e.target.value;
    const hasInvalid = /\D/.test(rawValue);
    const val = rawValue.replace(/\D/g, '');

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, cedula: 'La cédula solo puede contener números.' }));
    } else {
      setErrors(prev => ({ ...prev, cedula: '' }));
    }

    if (val.length <= 10) {
      setCedula(val);
      if (val.length === 10 && !validarCedulaEcuatoriana(val)) {
        setErrors(prev => ({ ...prev, cedula: 'La cédula ingresada no es válida (Módulo 10).' }));
      }
    }
  };

  const handleTelefonoChange = (e) => {
    const rawValue = e.target.value;
    const hasInvalid = /\D/.test(rawValue);
    const val = rawValue.replace(/\D/g, '');

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, telefono: 'El teléfono solo puede contener números.' }));
    } else {
      setErrors(prev => ({ ...prev, telefono: '' }));
    }

    if (val.length <= 10) {
      setTelefono(val);
      if (val.length === 10) {
        if (!val.startsWith('09')) {
          setErrors(prev => ({ ...prev, telefono: 'El celular debe iniciar con 09.' }));
        } else if (/^09(\d)\1{7}$/.test(val)) {
          setErrors(prev => ({ ...prev, telefono: 'Número de celular inválido (dígitos repetidos).' }));
        }
      } else if (val.length > 0 && !val.startsWith('0')) {
        setErrors(prev => ({ ...prev, telefono: 'El celular debe iniciar con 09.' }));
      }
    }
  };

  const handleEmailChange = (e) => {
    const rawValue = e.target.value;
    const hasInvalid = /[^a-zA-Z0-9.@_-]/.test(rawValue);
    const val = rawValue.replace(/[^a-zA-Z0-9.@_-]/g, '');

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, email: 'Caracteres inválidos para correo electrónico.' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
    
    if (val.length <= 30) setEmail(val);
  };

  const handlePasswordChange = (e) => {
    const rawValue = e.target.value;
    const hasSpaces = /\s/.test(rawValue);
    const val = rawValue.replace(/\s/g, '');

    if (hasSpaces) {
      setErrors(prev => ({ ...prev, password: 'La contraseña no puede contener espacios.' }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }
    setPassword(val);
  };

  const inputStyle = (errorField) => ({
    width: '100%', 
    padding: '0.75rem', 
    borderRadius: '4px', 
    border: errorField ? '2px solid #d93025' : '1px solid #ccc',
    backgroundColor: errorField ? '#fce8e6' : '#fff', // Fondo rojo si hay error
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
              style={inputStyle(errors.nombre)}
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
              style={inputStyle(errors.apellido)}
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
              style={inputStyle(errors.cedula)}
            />
            {errors.cedula && <div style={errorMsgStyle}>{errors.cedula}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input 
              type="tel" 
              required 
              maxLength={10}
              value={telefono} 
              onChange={handleTelefonoChange}
              placeholder="Ej. 0912345678"
              style={inputStyle(errors.telefono)}
            />
            {errors.telefono && <div style={errorMsgStyle}>{errors.telefono}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input 
              type="email" 
              required 
              maxLength={30}
              value={email} 
              onChange={handleEmailChange}
              placeholder="ejemplo@correo.com"
              style={inputStyle(errors.email)}
            />
            {errors.email && <div style={errorMsgStyle}>{errors.email}</div>}
          </div>
          
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input 
              type="password" 
              required 
              maxLength={30}
              value={password} 
              onChange={handlePasswordChange}
              placeholder="Crea una contraseña segura"
              style={{ ...inputStyle(errors.password), marginBottom: '8px' }}
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
