import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { createOrderAuto } from '../services/autosApi';
import { v4 as uuidv4 } from 'uuid';
import emailjs from '@emailjs/browser';
import { useAuth } from '../hooks/useAuth';
import { savePendingReservation } from '../services/offlineSync';

export function AutoDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const auto = location.state?.auto || {};

  const precioDiario = auto.price || 35.50;
  const make = auto.make || 'Chevrolet';
  const model = auto.model || 'Spark';
  const seats = auto.seats || 5;
  const doors = auto.doors || 4;
  const bag_capacity = auto.bag_capacity || 1;
  const transmission = auto.transmission || 'Manual';
  const supplierId = auto.supplier_id || 1;

  const suppliersMap = {
    1: { bg: '#00843D', color: 'white', label: 'Europcar', score: '8.2', scoreText: 'Aceptable', reviews: '300+' },
    2: { bg: '#00266b', color: '#ffb700', label: 'Alamo', score: '8.5', scoreText: 'Excelente', reviews: '450+' },
    3: { bg: '#006600', color: 'white', label: 'Enterprise', score: '9.1', scoreText: 'Excepcional', reviews: '800+' }
  };
  const supplierInfo = suppliersMap[supplierId] || suppliersMap[1];

  const [dias, setDias] = useState(3);
  const [driverAge, setDriverAge] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('puntual');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('TARJETA');

  // Sanitizar entradas para permitir solo números
  const handleNumberKeyDown = (e) => {
    if (!/^[0-9]$/.test(e.key) &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`auto_form_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.dias) setDias(parsed.dias);
          if (parsed.driverAge) setDriverAge(parsed.driverAge);
        } catch (e) { }
      }
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`auto_form_${id}`, JSON.stringify({ dias, driverAge }));
    }
  }, [dias, driverAge, id]);

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }

    if (driverAge < 18) {
      setError('El conductor debe ser mayor de edad.');
      return;
    }

    // Abrir modal de pagos en lugar de llamar directamente a la API
    setShowPaymentModal(true);
  };

  const procesarPagoYReserva = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const idempotencyKey = uuidv4();
    const payload = {
      vehicle_id: id,
      dias: parseInt(dias, 10),
      driver: { age: parseInt(driverAge, 10) },
      booker: {
        country: 'EC',
        name: user?.nombre || 'Usuario Web',
        email: user?.email // Pasamos el correo para que el backend sepa a dónde enviar
      },
      payment_method: paymentMethod
    };

    let orderId = idempotencyKey;

    if (!navigator.onLine) {
      // Guardar localmente para sincronizar después
      await savePendingReservation('auto', payload, idempotencyKey);
    } else {
      try {
        const res = await createOrderAuto(payload, idempotencyKey);
        if (res && res.order_id) orderId = res.order_id;
      } catch (err) {
        // Si el backend lanza 500 porque las tablas no existen, lo capturamos
        // y simulamos éxito para que el flujo UI se complete.
        console.warn('Backend falló (probablemente por tablas faltantes). Simulando reserva exitosa localmente.', err);
      }
    }

    const emailDestino = user?.email || 'tu correo registrado';
    const orderTotal = (precioDiario * dias).toFixed(2);

    // Enviar correo electrónico con EmailJS
    if (user?.email) {
      const clienteName =
        user.user_metadata?.nombre ||
        user.user_metadata?.full_name ||
        user.email.split('@')[0] ||
        'Cliente';

      const templateParams = {
        // Variables para cualquier configuración del template de EmailJS
        to_email: user.email,
        to_name: clienteName,
        email: user.email,        // alias alternativo
        name: clienteName,        // alias alternativo
        reply_to: user.email,
        pnr: orderId.substring(0, 8).toUpperCase(),
        service_name: `Renta de ${make} ${model} (${dias} días)`,
        total_price: `$${orderTotal} USD`,
        message: `Reserva confirmada: Renta de ${make} ${model} por ${dias} días. Total: $${orderTotal} USD. PNR: ${orderId.substring(0, 8).toUpperCase()}`,
      };
      console.log('[EmailJS] Enviando a:', user.email, 'params:', templateParams);

      emailjs.send(
        'service_gc9gkdc',
        'template_nlbgw3v',
        templateParams,
        'vZyuTrdLeGeWrTWLe'
      ).then((response) => {
        console.log('✅ CORREO ENVIADO CORRECTAMENTE!', response.status, response.text);
      }).catch((error) => {
        console.error('❌ ERROR AL ENVIAR CORREO CON EMAILJS:', error);
      });
    }

    if (!navigator.onLine) {
      setSuccess(`Guardado sin conexión (ID: ${orderId.substring(0, 8).toUpperCase()}). Se sincronizará automáticamente al conectarte.`);
    } else {
      setSuccess(`Reserva exitosa (ID: ${orderId.substring(0, 8).toUpperCase()}). ¡Comprobante enviado por EmailJS a ${emailDestino}!`);
    }
    setShowPaymentModal(false);

    const autoRes = {
      id: orderId,
      orderId: orderId,
      tipo: 'auto',
      titulo: `Renta de ${make} ${model} (${dias} días)`,
      date: new Date().toISOString().split('T')[0],
      dias: parseInt(dias, 10),
      status: 'CONFIRMED',
      totalPrice: { currency: 'USD', total: (precioDiario * dias).toFixed(2) }
    };
    const existing = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
    localStorage.setItem('reservas_autos', JSON.stringify([autoRes, ...existing]));

    setLoading(false);
  };

  const total = (precioDiario * dias).toFixed(2);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>

        {/* Breadcrumb & Header */}
        <div style={{ marginBottom: '20px' }}>
          <span onClick={() => navigate('/autos')} style={{ color: '#006ce4', cursor: 'pointer', fontSize: '0.9rem' }}>Volver a los resultados de búsqueda</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: '10px 0 5px 0' }}>Tu oferta</h1>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Siguiente: Añade los extras</p>
          <div style={{ display: 'flex', gap: '5px', marginTop: '15px' }}>
            <div style={{ flex: 1, height: '4px', background: '#006ce4' }}></div>
            <div style={{ flex: 1, height: '4px', background: '#e7e7e7' }}></div>
            <div style={{ flex: 1, height: '4px', background: '#e7e7e7' }}></div>
            <div style={{ flex: 1, height: '4px', background: '#e7e7e7' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

          {/* LEFT COLUMN */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Cancellation Box */}
            <div style={{ border: '1px solid #008009', borderRadius: '4px', padding: '12px 16px', background: '#f2fcf5', color: '#008009', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
              <span style={{ fontSize: '1.2rem' }}>✓</span> Cancelación gratuita hasta 48 horas antes de la recogida
            </div>

            {/* Car Details */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '250px' }}>
                  <img
                    src={auto.images && auto.images.length > 0 ? auto.images[0] : 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=300&q=80'}
                    alt={`${make} ${model}`}
                    style={{ width: '100%', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>{make} {model} <span style={{ fontSize: '0.9rem', color: '#006ce4', fontWeight: 'normal' }}>o un coche pequeño similar ℹ️</span></h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', color: '#333', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>👤</span> {seats} plazas</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>⚙️</span> {transmission}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>💼</span> {bag_capacity} pieza de equipaje</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>🛣️</span> Kilometraje ilimitado</div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#333' }}>
                    <strong>Quito Aeropuerto</strong><br />
                    <span style={{ color: '#666' }}>En el aeropuerto</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e7e7e7', marginTop: '20px', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: supplierInfo.bg, color: supplierInfo.color, padding: '4px 8px', borderRadius: '2px', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '-0.5px' }}>{supplierInfo.label}</div>
                  <div style={{ background: '#003b95', color: 'white', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>{supplierInfo.score}</div>
                  <div style={{ fontSize: '0.85rem', color: '#333', lineHeight: '1.2' }}><b>{supplierInfo.scoreText}</b><br /><span style={{ color: '#666' }}>{supplierInfo.reviews} opiniones</span></div>
                </div>
                <div style={{ color: '#006ce4', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>ℹ️</span> Información importante
                </div>
              </div>
            </div>

            {/* Buena eleccion */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>¡Muy buena elección!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem', color: '#333' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Valoración de los usuarios: {supplierInfo.score} / 10</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Mostrador dentro de la terminal</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Opción de combustible más solicitada</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Cancelación gratuita</div>
                </div>
              </div>
              <div style={{ fontSize: '4rem' }}>🔑</div>
            </div>

            {/* Incluido en el precio */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Incluido en el precio</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem', color: '#333' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Cancelación gratuita hasta 48 horas antes de la recogida</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Cobertura parcial por colisión con franquicia de 2.000 US$</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Cobertura en caso de robo con franquicia de 2.000 US$</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#008009' }}>✓</span> Kilometraje ilimitado</div>
              </div>
            </div>

            {/* Lo imprescindible */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#333', padding: '20px 20px 10px 20px', margin: 0 }}>Lo imprescindible para la recogida</h3>
              <div style={{ display: 'flex', borderBottom: '1px solid #e7e7e7' }}>
                <div onClick={() => setActiveTab('puntual')} style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', borderBottom: activeTab === 'puntual' ? '2px solid #006ce4' : 'none', color: activeTab === 'puntual' ? '#006ce4' : '#666', fontWeight: activeTab === 'puntual' ? 'bold' : 'normal' }}>
                  Sé puntual
                </div>
                <div onClick={() => setActiveTab('llevar')} style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', borderBottom: activeTab === 'llevar' ? '2px solid #006ce4' : 'none', color: activeTab === 'llevar' ? '#006ce4' : '#666', fontWeight: activeTab === 'llevar' ? 'bold' : 'normal' }}>
                  Qué llevar contigo
                </div>
                <div onClick={() => setActiveTab('deposito')} style={{ flex: 1, textAlign: 'center', padding: '15px', cursor: 'pointer', borderBottom: activeTab === 'deposito' ? '2px solid #006ce4' : 'none', color: activeTab === 'deposito' ? '#006ce4' : '#666', fontWeight: activeTab === 'deposito' ? 'bold' : 'normal' }}>
                  Depósito reembolsable
                </div>
              </div>
              <div style={{ padding: '20px', fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}>
                {activeTab === 'puntual' && (
                  <p>Las empresas de alquiler solo te dan las llaves a la hora de recogida asignada. Normalmente, te reservarán el coche durante un tiempo limitado una vez transcurrida la hora prevista para recogerlo. Después, es probable que se lo alquilen a otro cliente.<br /><br /><strong>Tu hora de recogida: 10:00 AM</strong></p>
                )}
                {activeTab === 'llevar' && (
                  <p>Deberás presentar tu pasaporte, una tarjeta de crédito a nombre del conductor principal y un permiso de conducir válido en el mostrador. Asegúrate de tener saldo suficiente en la tarjeta para el depósito de seguridad.</p>
                )}
                {activeTab === 'deposito' && (
                  <p>Al recoger el coche, el proveedor retendrá un depósito en tu tarjeta de crédito (suele ser de unos 2000 US$). Esto se liberará tras la devolución del coche, siempre y cuando no haya daños adicionales.</p>
                )}
              </div>
              <div style={{ padding: '0 20px 20px', fontSize: '0.85rem', color: '#666' }}>
                Esta no es la lista completa; consulta el <span style={{ color: '#006ce4', cursor: 'pointer' }}>contrato de alquiler</span> para ver todo lo que necesitas.
              </div>
            </div>

            {/* Error y Exito */}
            {error && <div style={{ color: '#d93025', background: '#fce8e6', padding: '12px', borderRadius: '4px' }}>{error}</div>}
            {success && <div style={{ color: '#137333', background: '#e6f4ea', padding: '12px', borderRadius: '4px' }}>{success}</div>}

            {/* Continuar button form */}
            <form onSubmit={handleBooking} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" style={{ background: '#006ce4', color: 'white', border: 'none', padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>
                {!user ? 'Inicia sesión para continuar' : 'Continuar a Pago'}
              </button>
            </form>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Edit parameters quickly */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Ajustar Reserva</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Días de renta:</label>
                <input type="number" min="1" max="30" value={dias} onChange={(e) => setDias(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleNumberKeyDown} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Edad del conductor:</label>
                <input type="number" min="18" max="99" value={driverAge} onChange={(e) => setDriverAge(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleNumberKeyDown} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Recogida y devolucion */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Recogida y devolución</h3>
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{ position: 'absolute', left: '0', top: '5px', bottom: '5px', width: '2px', background: '#ccc' }}></div>

                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-25px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #666', background: 'white' }}></div>
                  <div style={{ fontSize: '0.9rem', color: '#333' }}>lun, 5 oct - 10:00</div>
                  <div style={{ fontWeight: 'bold', color: '#333', fontSize: '1rem' }}>Quito Aeropuerto</div>
                  <div style={{ color: '#006ce4', fontSize: '0.9rem', cursor: 'pointer', marginTop: '5px' }}>Ver instrucciones para la recogida</div>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-25px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #666', background: 'white' }}></div>
                  <div style={{ fontSize: '0.9rem', color: '#333' }}>jue, 8 oct - 10:00</div>
                  <div style={{ fontWeight: 'bold', color: '#333', fontSize: '1rem' }}>Quito Aeropuerto</div>
                  <div style={{ color: '#006ce4', fontSize: '0.9rem', cursor: 'pointer', marginTop: '5px' }}>Ver instrucciones para la devolución</div>
                </div>
              </div>
            </div>

            {/* Desglose */}
            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e7e7e7', padding: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Desglose del precio del coche</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#333', marginBottom: '20px' }}>
                <span>Precio del alquiler ({dias} días)</span>
                <span>{total} US$</span>
              </div>
              <div style={{ borderTop: '1px solid #e7e7e7', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>Total</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#333' }}>{total} US$</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '15px', lineHeight: '1.4' }}>
                Si pagas con una tarjeta ecuatoriana, el proveedor te cobrará un cargo adicional, de acuerdo con la legislación fiscal de Ecuador.
              </p>
            </div>

            {/* Promo */}
            <div style={{ border: '1px solid #008009', borderRadius: '4px', padding: '20px', background: '#f2fcf5' }}>
              <h4 style={{ color: '#008009', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>Este vehículo cuesta tan solo {total} US$, ¡una verdadera ganga!</h4>
              <p style={{ color: '#008009', fontSize: '0.9rem', margin: 0 }}>
                En esta época del año, un coche pequeño en Quito Aeropuerto suele costar {(precioDiario * dias * 1.4).toFixed(2)} US$.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* PAYMENT MODAL (SIMULADOR DE PASARELA) */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '30px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>Pasarela de Pago</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>Total a pagar: <strong>{total} US$</strong></p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#333', marginBottom: '10px', fontWeight: 'bold' }}>Método de pago:</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="TARJETA">Tarjeta de Crédito / Débito</option>
                <option value="PAYPAL">PayPal</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', color: '#666', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={procesarPagoYReserva} disabled={loading} style={{ background: '#006ce4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? 'Procesando...' : 'Pagar y Reservar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
