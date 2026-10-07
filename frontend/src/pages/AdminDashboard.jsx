import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

const C = {
  blue: '#006ce4', darkBlue: '#003b95', lightBlue: '#ebf3ff',
  yellow: '#febb02', green: '#008009', red: '#d32f2f',
  orange: '#e8650a', gray: '#6b6b6b', border: '#e7e7e7',
  bg: '#f5f5f5', white: '#ffffff', text: '#1a1a1a', cyan: '#00bcd4',
};

const TABS = [
  { id: 'observabilidad', label: '📊 Observabilidad & Finanzas', sub: 'Estado en vivo y dinero' },
  { id: 'microservicios', label: '🔬 Servicios & Prov.', sub: 'RDA2 Simulado' },
  { id: 'gestion', label: '🗂️ Gestión', sub: 'Usuarios & Reservas' },
  { id: 'soporte', label: '🎧 Soporte', sub: 'Ticketing & QC' },
  { id: 'auditoria', label: '🛡️ Auditoría', sub: 'Logs de Seguridad' },
  { id: 'configuracion', label: '⚙️ Ajustes', sub: 'Global' },
];

function fmt(n) { return typeof n === 'number' ? n.toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}) : '0.00'; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleString('es-EC',{dateStyle:'short',timeStyle:'short'}); }
function estadoColor(s) {
  if (!s) return C.gray;
  const u = s.toUpperCase();
  if (u==='CONFIRMED'||u==='PAID') return C.green;
  if (u==='CANCELLED'||u==='REJECTED') return C.red;
  if (u==='PENDING'||u==='RESERVED') return C.orange;
  return C.gray;
}

function KpiCard({label,value,sub,color,icon}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'20px 24px',display:'flex',flexDirection:'column',gap:4,borderTop:`4px solid ${color||C.blue}`}}>
      <div style={{fontSize:'1.6rem'}}>{icon}</div>
      <div style={{fontSize:'1.8rem',fontWeight:700,color:color||C.text,lineHeight:1}}>{value}</div>
      <div style={{fontSize:'0.85rem',fontWeight:600,color:C.text}}>{label}</div>
      {sub && <div style={{fontSize:'0.75rem',color:C.gray}}>{sub}</div>}
    </div>
  );
}

function Badge({status}) {
  return (
    <span style={{background:estadoColor(status)+'22',color:estadoColor(status),padding:'2px 8px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>
      {status||'—'}
    </span>
  );
}

function SectionTitle({children,badge}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,margin:'28px 0 12px'}}>
      <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:C.text}}>{children}</h3>
      {badge && <span style={{background:C.orange,color:'white',fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:20}}>{badge}</span>}
    </div>
  );
}

function ServiceDot({ok,label,latency}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:ok?C.green:C.red,flexShrink:0}}/>
      <span style={{flex:1,fontSize:'0.85rem',color:C.text}}>{label}</span>
      {latency!==undefined && <span style={{fontSize:'0.8rem',color:ok?C.green:C.red,fontWeight:600}}>{latency}ms</span>}
    </div>
  );
}

function ObservabilidadTab({stats,loadingStats,serviceHealth,refreshKey}) {
  if (loadingStats) return (
    <div style={{textAlign:'center',padding:60,color:C.gray}}>
      <div style={{fontSize:'2rem',marginBottom:12}}>⏳</div>
      Consultando datos en tiempo real...
    </div>
  );
  const k = stats?.kpis||{};

  const res = k.totalReservas || 0;
  
  // Usamos el funnel real del backend si viene, si no, fallback al simulado
  let funnel = stats?.realFunnel;
  
  if (!funnel) {
    funnel = res > 0 ? [
      {label:'Búsquedas Globales (Vuelos, Autos, Atracciones)',count:res * 14, pct: 100},
      {label:'Selección de producto / Ver detalles',count:Math.round(res * 11.06), pct: 79},
      {label:'Inicio de Checkout',count:Math.round(res * 4.76), pct: 34},
      {label:'Ingreso de datos del cliente',count:Math.round(res * 2.1), pct: 15},
      {label:'Confirmación de Pago',count:Math.round(res * 1.07), pct: 7.7},
      {label:'✅ Reserva Exitosa (Global - Real)',count:res, pct: 7.1},
    ] : [
      {label:'Búsquedas Globales (Vuelos, Autos, Atracciones)',count:0, pct: 0},
      {label:'Selección de producto / Ver detalles',count:0, pct: 0},
      {label:'Inicio de Checkout',count:0, pct: 0},
      {label:'Ingreso de datos del cliente',count:0, pct: 0},
      {label:'Confirmación de Pago',count:0, pct: 0},
      {label:'✅ Reserva Exitosa (Global - Real)',count:0, pct: 0},
    ];
  }

  return (
    <div>
      <SectionTitle>📈 KPIs de Negocio (Tiempo Real)</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:12}}>
        <KpiCard icon="🎫" label="Total Reservas" value={k.totalReservas??0} color={C.blue}/>
        <KpiCard icon="✈️" label="Vuelos" value={k.reservasVuelos??0} sub="reservas" color={C.darkBlue}/>
        <KpiCard icon="🚗" label="Autos" value={k.reservasAutos??0} sub="reservas" color={C.cyan}/>
        <KpiCard icon="🎡" label="Atracciones" value={k.reservasAtracciones??0} sub="reservas" color={C.green}/>
        <KpiCard icon="🏨" label="Hospedajes" value={k.reservasHospedaje??0} sub="reservas" color={'#8e44ad'}/>
        <KpiCard icon="💵" label="Ingresos Totales" value={`$${fmt(k.ingresosTotal)}`} sub="USD" color={C.green}/>
      </div>
      <SectionTitle badge="Real">💰 Finanzas del Booking</SectionTitle>
      <FinanzasPanel refreshKey={refreshKey}/>

      <SectionTitle>🔌 Estado de Servicios</SectionTitle>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px'}}>
        {serviceHealth.map((s)=>(<ServiceDot key={s.label} ok={s.ok} label={s.label} latency={s.latency}/>))}
        {serviceHealth.length===0 && <div style={{color:C.gray,fontSize:'0.85rem',padding:'10px 0'}}>Comprobando servicios...</div>}
      </div>

      <SectionTitle>📊 Tráfico por Vertical (Nuevas Sesiones)</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:12,marginBottom:20}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px'}}>
          <div style={{fontSize:'0.85rem',color:C.text}}>✈️ Vuelos</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:C.darkBlue}}>{stats?.trafficByVertical?.vuelos || 0}</div>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px'}}>
          <div style={{fontSize:'0.85rem',color:C.text}}>🚗 Autos</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:C.orange}}>{stats?.trafficByVertical?.autos || 0}</div>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px'}}>
          <div style={{fontSize:'0.85rem',color:C.text}}>🎡 Atracciones</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:C.green}}>{stats?.trafficByVertical?.atracciones || 0}</div>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px'}}>
          <div style={{fontSize:'0.85rem',color:C.text}}>🏨 Hospedaje</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:'#8e44ad'}}>{stats?.kpis?.reservasHospedaje || 0}</div>
        </div>
      </div>
      {stats?.estadosVuelos && Object.keys(stats.estadosVuelos).length>0 && (
        <>
          <SectionTitle>📋 Distribución de Estados (Vuelos)</SectionTitle>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {Object.entries(stats.estadosVuelos).map(([estado,count])=>(
              <div key={estado} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 20px',textAlign:'center',minWidth:100}}>
                <div style={{fontSize:'1.4rem',fontWeight:700,color:estadoColor(estado)}}>{count}</div>
                <Badge status={estado}/>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>🎯 Embudo de Conversión (Extrapolado desde reservas reales)</SectionTitle>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'16px 20px'}}>
        {funnel.map((f,i)=>(
          <div key={f.label} style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',marginBottom:4}}>
              <span style={{color:C.text}}>{f.label}</span>
              <span style={{fontWeight:700,color:f.pct<20 && f.count > 0 ? C.orange : C.text}}>{f.count.toLocaleString()} ({f.pct}%)</span>
            </div>
            <div style={{background:C.border,borderRadius:4,height:12,overflow:'hidden'}}>
              <div style={{width:`${f.pct}%`,height:'100%',borderRadius:4,background:`linear-gradient(90deg, ${C.blue}, ${C.darkBlue})`,opacity:0.5+(i*0.08)}}/>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>🕒 Últimas Reservas (Global)</SectionTitle>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
          <thead>
            <tr style={{background:C.lightBlue}}>
              {['Tipo','PNR','Estado','Total (USD)','Fecha'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:C.darkBlue}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(stats?.ultimasReservas||[]).map((r,i)=>(
              <tr key={r.id||i} style={{borderTop:`1px solid ${C.border}`}}>
                <td style={{padding:'9px 14px'}}>
                  <span>{r.tipo==='vuelo'?'✈️':r.tipo==='auto'?'🚗':r.tipo==='hospedaje'?'🏨':'🎡'}</span>
                  <span style={{marginLeft:6,textTransform:'capitalize'}}>{r.tipo}</span>
                </td>
                <td style={{padding:'9px 14px',fontFamily:'monospace',fontWeight:600}}>{r.pnr||'—'}</td>
                <td style={{padding:'9px 14px'}}><Badge status={r.estado}/></td>
                <td style={{padding:'9px 14px',fontWeight:600}}>${fmt(r.total)}</td>
                <td style={{padding:'9px 14px',color:C.gray}}>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {(!stats?.ultimasReservas||stats.ultimasReservas.length===0)&&(
              <tr><td colSpan={5} style={{padding:24,textAlign:'center',color:C.gray}}>Sin reservas aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MicroserviciosTab() {
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),3000);return()=>clearInterval(t);},[]);
  const rand=(base,spread)=>parseFloat((base+(Math.random()-0.5)*spread).toFixed(1));
  const randInt=(base,spread)=>Math.round(base+(Math.random()-0.5)*spread);
  const services=[
    {name:'API Gateway',p50:rand(12,4),p95:rand(45,10),p99:rand(120,30),rps:randInt(420,60),errors:rand(0.2,0.1),cpu:rand(28,8),mem:rand(42,6)},
    {name:'Svc Vuelos',p50:rand(95,20),p95:rand(380,60),p99:rand(820,100),rps:randInt(85,20),errors:rand(0.8,0.3),cpu:rand(55,12),mem:rand(68,8)},
    {name:'Svc Autos',p50:rand(45,12),p95:rand(180,40),p99:rand(420,80),rps:randInt(32,10),errors:rand(0.4,0.2),cpu:rand(35,10),mem:rand(50,8)},
    {name:'Svc Atracciones',p50:rand(38,10),p95:rand(140,30),p99:rand(310,60),rps:randInt(18,8),errors:rand(0.3,0.15),cpu:rand(22,6),mem:rand(38,5)},
    {name:'Svc Pagos',p50:rand(320,40),p95:rand(920,100),p99:rand(1800,200),rps:randInt(12,5),errors:rand(1.2,0.4),cpu:rand(45,12),mem:rand(55,8)},
  ];
  const topology=[
    {from:'Browser',to:'API Gateway',ms:rand(18,5)},
    {from:'API Gateway',to:'Svc Vuelos',ms:rand(8,3)},
    {from:'API Gateway',to:'Svc Autos',ms:rand(6,2)},
    {from:'API Gateway',to:'Svc Atracciones',ms:rand(5,2)},
    {from:'Svc Vuelos',to:'Amadeus API',ms:rand(210,30)},
    {from:'Svc Pagos',to:'Stripe',ms:rand(310,40)},
  ];
  return (
    <div>
      <div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:8,padding:'10px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:'1.2rem'}}>⚠️</span>
        <span style={{fontSize:'0.85rem',color:'#664d03'}}><strong>Datos Simulados — RDA2.</strong> Esta pestaña muestra cómo se verá el monitoreo cuando el sistema migre a microservicios con Kubernetes, Prometheus y Grafana. Las métricas fluctúan cada 3 segundos para fines demostrativos.</span>
      </div>
      <SectionTitle>🔗 Topología de Red y Latencias</SectionTitle>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:'16px 20px'}}>
        {topology.map(t=>(
          <div key={`${t.from}-${t.to}`} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:`1px solid ${C.border}`,fontSize:'0.85rem'}}>
            <span style={{background:C.lightBlue,padding:'2px 10px',borderRadius:4,fontWeight:600,color:C.darkBlue}}>{t.from}</span>
            <div style={{flex:1,borderBottom:'1px dashed #ccc',margin:'0 4px'}}/>
            <span style={{background:'#e8f5e9',padding:'2px 8px',borderRadius:4,fontWeight:700,color:C.green,fontSize:'0.8rem'}}>{t.ms}ms</span>
            <span style={{color:C.gray}}>→</span>
            <span style={{background:C.lightBlue,padding:'2px 10px',borderRadius:4,fontWeight:600,color:C.darkBlue}}>{t.to}</span>
          </div>
        ))}
      </div>
      <SectionTitle>📡 Los 4 Golden Signals por Servicio</SectionTitle>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem',background:C.white,border:`1px solid ${C.border}`,borderRadius:8}}>
          <thead>
            <tr style={{background:C.darkBlue,color:'white'}}>
              {['Servicio','p50','p95','p99','req/s','Error %','CPU %','RAM %'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'center',fontWeight:600}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((s,i)=>(
              <tr key={s.name} style={{borderTop:`1px solid ${C.border}`,background:i%2===0?C.white:C.bg}}>
                <td style={{padding:'10px 12px',fontWeight:600}}>{s.name}</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:C.green}}>{s.p50}ms</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:s.p95>300?C.orange:C.text}}>{s.p95}ms</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:s.p99>800?C.red:C.text,fontWeight:s.p99>800?700:400}}>{s.p99}ms</td>
                <td style={{padding:'10px 12px',textAlign:'center'}}>{s.rps}</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:s.errors>1?C.red:C.green,fontWeight:700}}>{s.errors}%</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:s.cpu>70?C.red:C.text}}>{s.cpu}%</td>
                <td style={{padding:'10px 12px',textAlign:'center',color:s.mem>80?C.red:C.text}}>{s.mem}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionTitle>🎖️ SLOs y Error Budget</SectionTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:12}}>
        {[
          {name:'Búsqueda < 800ms',target:99.9,current:99.7,budget:29},
          {name:'Reserva exitosa',target:99.5,current:98.8,budget:68},
          {name:'Pago confirmado',target:99.9,current:99.6,budget:45},
          {name:'Disponibilidad API',target:99.9,current:99.95,budget:100},
        ].map(s=>{
          const ok=s.current>=s.target;
          return (
            <div key={s.name} style={{background:C.white,border:`1px solid ${ok?C.green:C.red}`,borderRadius:8,padding:'14px 16px'}}>
              <div style={{fontSize:'0.8rem',fontWeight:600,marginBottom:6}}>{s.name}</div>
              <div style={{fontSize:'1.3rem',fontWeight:700,color:ok?C.green:C.red}}>{s.current}%</div>
              <div style={{fontSize:'0.75rem',color:C.gray,marginBottom:8}}>Meta: {s.target}%</div>
              <div style={{fontSize:'0.75rem',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                <span>Error Budget</span><span style={{fontWeight:700,color:s.budget>50?C.green:C.orange}}>{s.budget}%</span>
              </div>
              <div style={{background:C.border,borderRadius:4,height:6}}>
                <div style={{width:`${s.budget}%`,height:'100%',borderRadius:4,background:s.budget>50?C.green:C.orange}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DE PROVEEDORES — simula la red de sitios integrados para RDA2
// ─────────────────────────────────────────────────────────────────────────────
const PROVEEDORES_INICIALES = [
  {
    id: 'prov-1',
    nombre: 'TravelEcuador Pro',
    equipo: 'Grupo 1 – Atracciones',
    url: 'https://travel-ecuador-pro.vercel.app',
    apiBase: 'https://travel-ecuador-pro.vercel.app/api/v1',
    tipo: 'Atracciones',
    emoji: '🎡',
    activo: true,
    fechaRegistro: '2026-09-15',
    descripcion: 'Catálogo de atracciones turísticas del Ecuador, con reservas en tiempo real.',
    contacto: 'grupo1@universidad.edu.ec',
  },
  {
    id: 'prov-2',
    nombre: 'AeroLink Ecuador',
    equipo: 'Grupo 2 – Vuelos',
    url: 'https://aerolink-ec.netlify.app',
    apiBase: 'https://aerolink-ec.netlify.app/api/v1',
    tipo: 'Vuelos',
    emoji: '✈️',
    activo: true,
    fechaRegistro: '2026-09-18',
    descripcion: 'Motor de búsqueda y reserva de vuelos domésticos e internacionales.',
    contacto: 'grupo2@universidad.edu.ec',
  },
  {
    id: 'prov-3',
    nombre: 'HotelHub EC',
    equipo: 'Grupo 3 – Alojamientos',
    url: 'https://hotelhub-ec.vercel.app',
    apiBase: 'https://hotelhub-ec.vercel.app/api/v1',
    tipo: 'Alojamientos',
    emoji: '🏨',
    activo: true,
    fechaRegistro: '2026-09-20',
    descripcion: 'Plataforma de hospedaje con hoteles, hostales y cabañas.',
    contacto: 'grupo3@universidad.edu.ec',
  },
  {
    id: 'prov-4',
    nombre: 'RentAuto Ecuador',
    equipo: 'Grupo 4 – Autos',
    url: 'https://rentauto-ec.netlify.app',
    apiBase: 'https://rentauto-ec.netlify.app/api/v1',
    tipo: 'Autos',
    emoji: '🚗',
    activo: false,
    fechaRegistro: '2026-09-22',
    descripcion: 'Renta de vehículos con cobertura nacional. Mantenimiento programado.',
    contacto: 'grupo4@universidad.edu.ec',
  },
  {
    id: 'prov-5',
    nombre: 'GalapagosXplorer',
    equipo: 'Grupo 5 – Tours',
    url: 'https://galapagos-xplorer.vercel.app',
    apiBase: 'https://galapagos-xplorer.vercel.app/api/v1',
    tipo: 'Tours',
    emoji: '🐢',
    activo: true,
    fechaRegistro: '2026-09-25',
    descripcion: 'Tours especializados a Galápagos con guías certificados.',
    contacto: 'grupo5@universidad.edu.ec',
  },
];

const TIPO_COLORES = {
  Atracciones: { bg: '#e8f5e9', color: '#2e7d32' },
  Vuelos:      { bg: '#e3f2fd', color: '#1565c0' },
  Alojamientos:{ bg: '#f3e5f5', color: '#6a1b9a' },
  Autos:       { bg: '#fff3e0', color: '#e65100' },
  Tours:       { bg: '#e0f7fa', color: '#00695c' },
  Otro:        { bg: '#f5f5f5', color: '#333'    },
};

function TipoBadge({ tipo }) {
  const col = TIPO_COLORES[tipo] || TIPO_COLORES.Otro;
  return (
    <span style={{ background: col.bg, color: col.color, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ online, checking }) {
  if (checking) return <span style={{ color: C.gray, fontSize: '0.8rem' }}>⏳ Comprobando...</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: online ? C.green : C.red }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? C.green : C.red, display: 'inline-block', boxShadow: online ? `0 0 6px ${C.green}` : 'none' }} />
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  );
}

function ProveedoresTab() {
  const STORAGE_KEY = 'booking_proveedores';

  const [proveedores, setProveedores] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.length > 0 ? saved : PROVEEDORES_INICIALES;
    } catch { return PROVEEDORES_INICIALES; }
  });

  // Estado de salud: { [id]: { online, latency, checking } }
  const [health, setHealth] = useState({});
  const [modal, setModal] = useState(null); // null | 'nuevo' | { ...proveedor }
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState({ nombre:'', equipo:'', url:'', apiBase:'', tipo:'Otro', descripcion:'', contacto:'', tokenAuth:'', webhookUrl:'', healthcheckUrl:'', rateLimit:'', entorno:'Producción' });
  const [formErr, setFormErr] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const persistir = (lista) => {
    setProveedores(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  };

  // Simula un health-check contra la URL del proveedor
  const checkHealth = (prov) => {
    setHealth(h => ({ ...h, [prov.id]: { ...h[prov.id], checking: true } }));
    // Simulación: proveedores con activo=true tienen 85% de probabilidad de estar online
    const delay = 600 + Math.random() * 1200;
    setTimeout(() => {
      const baseOnline = prov.activo;
      const online = baseOnline ? Math.random() > 0.12 : Math.random() > 0.85;
      const latency = online ? Math.round(80 + Math.random() * 420) : null;
      setHealth(h => ({ ...h, [prov.id]: { online, latency, checking: false, lastCheck: new Date() } }));
    }, delay);
  };

  // Revisar todos al montar y cada 8 segundos
  useEffect(() => {
    proveedores.forEach(p => checkHealth(p));
    const interval = setInterval(() => {
      proveedores.forEach(p => checkHealth(p));
    }, 8000);
    return () => clearInterval(interval);
  }, [proveedores.length]); // solo re-ejecutar si cambia cantidad

  const onlineCount = Object.values(health).filter(h => h.online && !h.checking).length;
  const offlineCount = Object.values(health).filter(h => !h.online && !h.checking).length;

  const tiposFiltro = ['Todos', ...Array.from(new Set(proveedores.map(p => p.tipo)))];

  const proveedoresFiltrados = proveedores.filter(p => {
    const okTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo;
    const h = health[p.id];
    const okEstado = filtroEstado === 'Todos'
      || (filtroEstado === 'Online' && h?.online)
      || (filtroEstado === 'Offline' && h && !h.online && !h.checking);
    return okTipo && okEstado;
  });

  const abrirNuevo = () => {
    setForm({ nombre:'', equipo:'', url:'', apiBase:'', tipo:'Otro', descripcion:'', contacto:'', emoji:'🔗', tokenAuth:'', webhookUrl:'', healthcheckUrl:'', rateLimit:'', entorno:'Producción' });
    setFormErr({});
    setModal('nuevo');
  };

  const abrirEditar = (prov) => {
    setForm({ ...prov });
    setFormErr({});
    setModal('editar');
  };

  const validar = () => {
    const err = {};
    if (!form.nombre.trim()) err.nombre = 'Requerido';
    if (!form.url.trim()) err.url = 'Requerido';
    if (!form.apiBase.trim()) err.apiBase = 'Requerido';
    return err;
  };

  const guardar = async () => {
    const err = validar();
    if (Object.keys(err).length > 0) { setFormErr(err); return; }
    setGuardando(true);
    await new Promise(r => setTimeout(r, 600));
    if (modal === 'nuevo') {
      const nuevo = { ...form, id: `prov-${Date.now()}`, activo: true, fechaRegistro: new Date().toISOString().split('T')[0] };
      const lista = [...proveedores, nuevo];
      persistir(lista);
      // Iniciar health check del nuevo proveedor
      setTimeout(() => checkHealth(nuevo), 300);
    } else {
      const lista = proveedores.map(p => p.id === form.id ? { ...form } : p);
      persistir(lista);
    }
    setGuardando(false);
    setModal(null);
  };

  const eliminar = (id) => {
    const lista = proveedores.filter(p => p.id !== id);
    persistir(lista);
    setHealth(h => { const n = { ...h }; delete n[id]; return n; });
    setConfirmDel(null);
    if (detalle?.id === id) setDetalle(null);
  };

  const toggleActivo = (prov) => {
    const lista = proveedores.map(p => p.id === prov.id ? { ...p, activo: !p.activo } : p);
    persistir(lista);
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '9px 12px', border: `1px solid ${formErr[field] ? C.red : C.border}`,
    borderRadius: 6, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
  });

  const TIPOS_SELECT = ['Atracciones', 'Vuelos', 'Alojamientos', 'Autos', 'Tours', 'Otro'];

  return (
    <div>
      {/* Banner informativo */}
      <div style={{ background: '#e3f2fd', border: '1px solid #1565c0', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>🔗</span>
        <span style={{ fontSize: '0.85rem', color: '#1565c0' }}>
          <strong>Panel de Proveedores — Preparación RDA2.</strong> Aquí se gestionan los sistemas externos de otros grupos que se integrarán al Booking Ecuador en el Reto 2. Los estados se simulan ya que la integración real aún no está desplegada.
        </span>
      </div>

      {/* KPIs de red */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard icon="🌐" label="Total Proveedores" value={proveedores.length} color={C.blue} />
        <KpiCard icon="✅" label="En Línea" value={onlineCount} color={C.green} />
        <KpiCard icon="❌" label="Sin Conexión" value={offlineCount} color={C.red} />
        <KpiCard icon="📦" label="Tipos de Servicio" value={tiposFiltro.length - 1} color={C.cyan} />
      </div>

      {/* Barra de herramientas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tiposFiltro.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filtroTipo === t ? C.blue : C.border}`, background: filtroTipo === t ? C.blue : 'white', color: filtroTipo === t ? 'white' : C.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}>
              {t}
            </button>
          ))}
          <button onClick={() => setFiltroEstado(filtroEstado === 'Online' ? 'Todos' : 'Online')} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filtroEstado === 'Online' ? C.green : C.border}`, background: filtroEstado === 'Online' ? '#e8f5e9' : 'white', color: filtroEstado === 'Online' ? C.green : C.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            ✅ Solo Online
          </button>
          <button onClick={() => setFiltroEstado(filtroEstado === 'Offline' ? 'Todos' : 'Offline')} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filtroEstado === 'Offline' ? C.red : C.border}`, background: filtroEstado === 'Offline' ? '#ffebee' : 'white', color: filtroEstado === 'Offline' ? C.red : C.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            ❌ Solo Offline
          </button>
        </div>
        <button onClick={abrirNuevo} style={{ background: C.blue, color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Registrar Proveedor
        </button>
      </div>

      {/* Tabla de proveedores */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: C.darkBlue, color: 'white' }}>
              {['Sistema / Equipo', 'Tipo', 'Estado', 'Latencia', 'Última revisión', 'Activo', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.gray }}>No hay proveedores que coincidan con el filtro</td></tr>
            )}
            {proveedoresFiltrados.map((prov, i) => {
              const h = health[prov.id] || {};
              return (
                <tr key={prov.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.bg, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.lightBlue}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : C.bg}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.5rem' }}>{prov.emoji || '🔗'}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text }}>{prov.nombre}</div>
                        <div style={{ fontSize: '0.78rem', color: C.gray }}>{prov.equipo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}><TipoBadge tipo={prov.tipo} /></td>
                  <td style={{ padding: '12px 14px' }}><EstadoBadge online={h.online} checking={h.checking} /></td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: h.online ? (h.latency > 300 ? C.orange : C.green) : C.gray }}>
                    {h.checking ? '...' : h.latency ? `${h.latency} ms` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: C.gray, fontSize: '0.78rem' }}>
                    {h.lastCheck ? h.lastCheck.toLocaleTimeString('es-EC') : 'Pendiente'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => toggleActivo(prov)} style={{ background: prov.activo ? '#e8f5e9' : '#ffebee', color: prov.activo ? C.green : C.red, border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                      {prov.activo ? 'Activo' : 'Pausado'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDetalle(prov)} title="Ver detalle" style={{ background: C.lightBlue, border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem' }}>👁️</button>
                      <button onClick={() => checkHealth(prov)} title="Recheck" style={{ background: '#fff3e0', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem' }}>🔄</button>
                      <button onClick={() => abrirEditar(prov)} title="Editar" style={{ background: '#e8f5e9', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
                      <button onClick={() => setConfirmDel(prov)} title="Eliminar" style={{ background: '#ffebee', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Panel de detalle lateral */}
      {detalle && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 380, height: '100vh', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ background: C.darkBlue, color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Detalle del Proveedor</div>
            <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>{detalle.emoji || '🔗'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: C.text }}>{detalle.nombre}</div>
              <div style={{ fontSize: '0.85rem', color: C.gray, marginBottom: 8 }}>{detalle.equipo}</div>
              <TipoBadge tipo={detalle.tipo} />
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {[['🌐 URL del Sistema', detalle.url], ['🔌 API Base', detalle.apiBase], ['🔑 Token (Auth)', detalle.tokenAuth ? '••••••••' : 'No definido'], ['🪝 Webhook', detalle.webhookUrl], ['🩺 Healthcheck', detalle.healthcheckUrl], ['⚡ Rate Limit', detalle.rateLimit ? detalle.rateLimit + ' req/s' : '—'], ['🌍 Entorno', detalle.entorno || 'Producción'], ['📧 Contacto', detalle.contacto], ['📅 Registro', detalle.fechaRegistro]].map(([label, val]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: '0.88rem', color: C.text, wordBreak: 'break-all' }}>{val || '—'}</div>
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600, marginBottom: 3 }}>📝 Descripción</div>
                <div style={{ fontSize: '0.88rem', color: C.text }}>{detalle.descripcion || '—'}</div>
              </div>
              {/* Estado en tiempo real en el detalle */}
              <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>Estado en tiempo real</div>
                {(() => {
                  const h = health[detalle.id] || {};
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <EstadoBadge online={h.online} checking={h.checking} />
                      <span style={{ color: h.online ? (h.latency > 300 ? C.orange : C.green) : C.gray, fontWeight: 700, fontSize: '0.85rem' }}>
                        {h.checking ? '...' : h.latency ? `${h.latency} ms` : '—'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              {/* Endpoints simulados */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>🔗 Endpoints de Integración (RDA2)</div>
                {['GET /api/v1/catalogo/exportar', `GET /api/v1/${detalle.tipo.toLowerCase()}/disponibilidad`, 'POST /api/v1/webhooks/reserva-creada', 'GET /health'].map(ep => (
                  <div key={ep} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: C.blue, background: C.lightBlue, padding: '4px 10px', borderRadius: 4, marginBottom: 4 }}>{ep}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo / Editar */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: C.darkBlue, color: 'white', padding: '16px 24px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{modal === 'nuevo' ? '➕ Registrar Nuevo Proveedor' : '✏️ Editar Proveedor'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 14px', marginBottom: 20, fontSize: '0.8rem', color: '#664d03' }}>
                ⚠️ La información ingresada se guardará localmente y simulará la integración real del RDA2. En producción, este formulario enviará los datos al API Gateway central.
              </div>
              {[['nombre', 'Nombre del sistema *', 'Ej: TravelEcuador Pro'], ['equipo', 'Nombre del equipo', 'Ej: Grupo 6 – Cruceros'], ['url', 'URL del sitio web *', 'https://mi-sistema.vercel.app'], ['apiBase', 'URL base de la API *', 'https://mi-sistema.vercel.app/api/v1'], ['contacto', 'Email de contacto', 'grupo@universidad.edu.ec']].map(([field, label, placeholder]) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>
                  <input value={form[field] || ''} onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setFormErr(er => { const n = { ...er }; delete n[field]; return n; }); }} placeholder={placeholder} style={inputStyle(field)} />
                  {formErr[field] && <div style={{ color: C.red, fontSize: '0.75rem', marginTop: 2 }}>{formErr[field]}</div>}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ background: C.bg, padding: '12px 16px', borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: C.darkBlue }}>Datos Técnicos de Integración (API)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[['tokenAuth', 'API Key / Token', 'Ej: sk_live_...'], ['webhookUrl', 'Webhook URL', 'https://.../webhook'], ['healthcheckUrl', 'Healthcheck URL', 'https://.../health'], ['rateLimit', 'Rate Limit (req/s)', 'Ej: 50']].map(([field, label, placeholder]) => (
                        <div key={field}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</label>
                          <input value={form[field] || ''} onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); }} placeholder={placeholder} style={inputStyle(field)} />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>Entorno</label>
                        <select value={form.entorno || 'Producción'} onChange={e => setForm(f => ({ ...f, entorno: e.target.value }))} style={{ ...inputStyle('entorno'), background: 'white' }}>
                          <option value="Producción">Producción</option>
                          <option value="Staging">Staging / Pruebas</option>
                          <option value="Desarrollo">Desarrollo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>Tipo de servicio</label>
                <select value={form.tipo || 'Otro'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...inputStyle('tipo'), background: 'white' }}>
                  {TIPOS_SELECT.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>Emoji / Ícono</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['🔗', '🌐', '✈️', '🏨', '🚗', '🎡', '🐢', '⛵', '🎭', '🏔️', '🌴'].map(em => (
                    <button key={em} onClick={() => setForm(f => ({ ...f, emoji: em }))} style={{ fontSize: '1.4rem', background: form.emoji === em ? C.lightBlue : 'transparent', border: `2px solid ${form.emoji === em ? C.blue : C.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>{em}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, color: C.text }}>Descripción</label>
                <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Breve descripción del sistema y los servicios que provee..." rows={3} style={{ ...inputStyle('descripcion'), resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ padding: '9px 20px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button onClick={guardar} disabled={guardando} style={{ padding: '9px 20px', background: guardando ? C.gray : C.blue, color: 'white', border: 'none', borderRadius: 6, cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                  {guardando ? '⏳ Guardando...' : modal === 'nuevo' ? '✅ Registrar Proveedor' : '✅ Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'center', marginBottom: 8 }}>¿Eliminar proveedor?</div>
            <div style={{ color: C.gray, fontSize: '0.85rem', textAlign: 'center', marginBottom: 24 }}>Se eliminará <strong>{confirmDel.nombre}</strong> de la lista de proveedores. Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '9px 24px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDel.id)} style={{ padding: '9px 24px', background: C.red, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GestionTab({users,usersError,onRetryUsers,reservas,loadingUsers,loadingReservas,onRefresh}) {
  const [vista,setVista]=useState('usuarios');
  const [modal,setModal]=useState(null);
  const [confirmModal,setConfirmModal]=useState(null);

  const btnStyle = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:'1.1rem', display:'inline-flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' };

  const requestConfirm = (title, text, color, actionFn) => {
    setConfirmModal({ title, text, color, actionFn });
  };

  const executeConfirm = async () => {
    if (confirmModal && confirmModal.actionFn) {
      await confirmModal.actionFn();
    }
    setConfirmModal(null);
  };

  const execUserAction = async (id, action) => {
    try { 
      await api.put(`/admin/users/${id}/action`, { action }); 
      if (action === 'reset_password') {
        alert('Enlace de reseteo enviado correctamente.');
      } else {
        alert('Acción ejecutada correctamente.');
      }
      onRefresh(); 
    }
    catch(e) { alert(`Error al ejecutar la acción: ${apiErrorMsg(e)}`); }
  };

  const handleReservaAction = async (tipo, id, action) => {
    if (tipo === 'hospedaje') {
      if (action === 'cancelar') {
        let locales = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
        locales = locales.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r);
        localStorage.setItem('reservas_alojamientos', JSON.stringify(locales));
      }
      if (action === 'reenviar') alert(`Comprobante de hospedaje ${id} reenviado virtualmente`);
      alert(`Acción de ${action} ejecutada exitosamente.`);
      onRefresh();
      return;
    }
    
    // Check if it's a local auto or atraccion
    if (tipo === 'auto' || tipo === 'autos') {
      let locales = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      let index = locales.findIndex(r => (r.id === id || r.orderId === id));
      if (index !== -1) {
        if (action === 'cancelar') {
          locales[index].status = 'CANCELLED';
          localStorage.setItem('reservas_autos', JSON.stringify(locales));
        }
        if (action === 'reenviar') alert(`Comprobante de auto ${id} reenviado virtualmente`);
        alert(`Acción de ${action} ejecutada exitosamente.`);
        onRefresh();
        return;
      }
    }

    if (tipo === 'atraccion' || tipo === 'atracciones') {
      let locales = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      let index = locales.findIndex(r => (r.id === id || r.reservation_id === id));
      if (index !== -1) {
        if (action === 'cancelar') {
          locales[index].status = 'CANCELLED';
          localStorage.setItem('reservas_atracciones', JSON.stringify(locales));
        }
        if (action === 'reenviar') alert(`Comprobante de atracción ${id} reenviado virtualmente`);
        alert(`Acción de ${action} ejecutada exitosamente.`);
        onRefresh();
        return;
      }
    }

    try {
      if (action === 'cancelar') await api.put(`/admin/reservas/${tipo}/${id}/cancelar`);
      if (action === 'reenviar') await api.put(`/admin/reservas/${tipo}/${id}/reenviar`); // Revertido a PUT
      alert(`Acción de ${action} ejecutada exitosamente.`);
      onRefresh();
    } catch(e) { alert('Error al ejecutar la acción en el backend'); }
  };

  const viewHistorial = async (id, email) => {
    try {
      const { data } = await api.get(`/admin/users/${id}/historial`);
      setModal({ type: 'detalles', data: data.data, title: `Historial de Reservas - ${email}` });
    } catch (e) { alert('Error al obtener historial'); }
  };

  const viewDetalles = async (tipo, id) => {
    if (tipo === 'hospedaje') {
      const localesAloj = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
      const reservaLocal = localesAloj.find(r => r.id === id);
      setModal({ type: 'detalles', data: reservaLocal || { mensaje: 'No encontrada localmente' }, title: `Detalles Técnicos - ${tipo} ${id}` });
      return;
    }
    
    // Check if it's a local auto or atraccion
    if (tipo === 'auto' || tipo === 'autos') {
      const localesAutos = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      const reservaLocal = localesAutos.find(r => (r.id === id || r.orderId === id));
      if (reservaLocal) {
        setModal({ type: 'detalles', data: reservaLocal, title: `Detalles Técnicos (Local) - ${tipo} ${id}` });
        return;
      }
    }

    if (tipo === 'atraccion' || tipo === 'atracciones') {
      const localesAtracciones = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const reservaLocal = localesAtracciones.find(r => (r.id === id || r.reservation_id === id));
      if (reservaLocal) {
        setModal({ type: 'detalles', data: reservaLocal, title: `Detalles Técnicos (Local) - ${tipo} ${id}` });
        return;
      }
    }

    try {
      const { data } = await api.get(`/admin/reservas/${tipo}/${id}/detalles`);
      setModal({ type: 'detalles', data: data.data || { mensaje: 'Sin detalles en el backend' }, title: `Detalles Técnicos - ${tipo} ${id}` });
    } catch (e) {
      alert('Error al obtener detalles del backend');
    }
  };
  const VISTAS=[
    {id:'usuarios',label:'👤 Usuarios',count:users.length},
    {id:'vuelos',label:'✈️ Vuelos',count:reservas.vuelos?.length||0},
    {id:'hospedaje',label:'🏨 Hospedaje',count:reservas.hospedaje?.length||0},
    {id:'autos',label:'🚗 Autos',count:reservas.autos?.length||0},
    {id:'atracciones',label:'🎡 Atracciones',count:reservas.atracciones?.length||0},
  ];
  const isLoading=vista==='usuarios'?loadingUsers:loadingReservas;
  const renderTable=()=>{
    if(isLoading) return <div style={{padding:40,textAlign:'center',color:C.gray}}>Cargando...</div>;
    if(vista==='usuarios') {
      const admins = users.filter(u => u.rol === 'admin').length;
      return (
        <div>
          {usersError && (
            <div style={{padding:'16px 16px 0'}}>
              <Alerta tipo="error">
                <strong>Error al cargar usuarios:</strong> {usersError}
                <button type="button" onClick={onRetryUsers} style={{marginLeft:8,background:'transparent',border:`1px solid ${C.red}`,color:C.red,borderRadius:4,padding:'2px 8px',cursor:'pointer'}}>Reintentar</button>
              </Alerta>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,padding:16,background:C.bg,borderBottom:`1px solid ${C.border}`}}>
            <div style={{background:C.white,padding:12,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'0.8rem',color:C.gray}}>Total Usuarios Registrados</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,color:C.darkBlue}}>{users.length}</div>
            </div>
            <div style={{background:C.white,padding:12,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'0.8rem',color:C.gray}}>Administradores</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,color:C.orange}}>{admins}</div>
            </div>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
            <thead><tr style={{background:C.lightBlue}}>
              {['Usuario','Rol','Registrado','Último acceso','Acciones'].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:C.darkBlue}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.id||i} style={{borderTop:`1px solid ${C.border}`}}>
                  <td style={{padding:'9px 14px'}}>
                    <div style={{fontWeight:600}}>{u.email}</div>
                    {u.nombre&&<div style={{fontSize:'0.75rem',color:C.gray}}>{u.nombre}</div>}
                    {u.status==='bloquear'&&<span style={{fontSize:'0.68rem',color:C.red,fontWeight:700}}>🚫 Bloqueado</span>}
                  </td>
                  <td style={{padding:'9px 14px'}}>
                    <span style={{background:u.rol==='admin'?C.blue:C.border,color:u.rol==='admin'?'white':C.text,padding:'2px 8px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{u.rol||'usuario'}</span>
                  </td>
                  <td style={{padding:'9px 14px',color:C.gray}}>{fmtDate(u.created_at)}</td>
                  <td style={{padding:'9px 14px',color:C.gray}}>{u.last_sign_in?fmtDate(u.last_sign_in):'Nunca'}</td>
                  <td style={{padding:'9px 14px',display:'flex',gap:8}}>
                    {u.rol !== 'admin' && (
                      <>
                        <button onClick={()=>requestConfirm(u.status === 'bloquear' ? "Desbloquear Usuario" : "Bloquear Usuario", `¿Seguro que quieres ${u.status === 'bloquear' ? "desbloquear" : "bloquear"} a ${u.email}?`, u.status === 'bloquear' ? C.green : C.red, ()=>execUserAction(u.id, u.status === 'bloquear' ? 'desbloquear' : 'bloquear'))} title={u.status === 'bloquear' ? "Desbloquear Usuario" : "Bloquear Usuario"} style={btnStyle}>
                          {u.status === 'bloquear' ? '✅' : '🚫'}
                        </button>
                        <button onClick={()=>requestConfirm("Promover a Administrador", `¿Seguro que quieres hacer administrador a ${u.email}?`, C.blue, ()=>execUserAction(u.id, 'promover_admin'))} title="Hacer Administrador" style={btnStyle}>👑</button>
                        <button onClick={()=>viewHistorial(u.id, u.email)} title="Ver Historial" style={btnStyle}>📋</button>
                      </>
                    )}
                    {u.rol === 'admin' && !u.adminFijo && (
                      <button onClick={()=>requestConfirm("Quitar rol de Administrador", `¿Seguro que quieres quitarle el rol de administrador a ${u.email}? Pasará a ser un usuario normal y perderá acceso al panel.`, C.red, ()=>execUserAction(u.id, 'quitar_admin'))} title="Quitar Administrador (volver a usuario)" style={btnStyle}>⬇️</button>
                    )}
                    {u.rol === 'admin' && u.adminFijo && (
                      <span title="Administrador principal definido en el sistema: no se le puede quitar el rol" style={{alignSelf:'center',fontSize:'0.7rem',color:C.gray,fontWeight:600}}>🔒 Principal</span>
                    )}
                    <button onClick={()=>requestConfirm("Enviar Reseteo de Contraseña", `¿Enviar enlace de reseteo a ${u.email}?`, C.orange, ()=>execUserAction(u.id, 'reset_password'))} title="Enviar Reseteo de Contraseña" style={btnStyle}>🔑</button>
                  </td>
                </tr>
              ))}
              {users.length===0&&(<tr><td colSpan={5} style={{padding:24,textAlign:'center',color:C.gray}}>{usersError?'No se pudieron cargar los usuarios (ver el error arriba).':'No hay usuarios registrados todavía.'}</td></tr>)}
            </tbody>
          </table>
        </div>
      );
    }
    const rows=reservas[vista]||[];
    const isVuelos = vista === 'vuelos';
    const totalIngresos = rows.reduce((s, r) => s + Number(r.total), 0);

    return (
      <div>
        {isVuelos && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,padding:16,background:C.bg,borderBottom:`1px solid ${C.border}`}}>
            <div style={{background:C.white,padding:12,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'0.8rem',color:C.gray}}>Reservas de Vuelos</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,color:C.darkBlue}}>{rows.length}</div>
            </div>
            <div style={{background:C.white,padding:12,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'0.8rem',color:C.gray}}>Ingresos Totales (Vuelos)</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,color:C.green}}>${fmt(totalIngresos)}</div>
            </div>
          </div>
        )}
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
          <thead><tr style={{background:C.lightBlue}}>
            {['PNR / ID','Estado','Total (USD)',vista==='atracciones'?'Cliente':'Moneda','Fecha','Acciones'].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:C.darkBlue}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.id||i} style={{borderTop:`1px solid ${C.border}`}}>
                <td style={{padding:'9px 14px',fontFamily:'monospace',fontWeight:600}}>{r.pnr}</td>
                <td style={{padding:'9px 14px'}}><Badge status={r.estado}/></td>
                <td style={{padding:'9px 14px',fontWeight:600}}>${fmt(r.total)}</td>
                <td style={{padding:'9px 14px',color:C.gray}}>{vista==='atracciones'?(r.cliente||'—'):(r.moneda||'USD')}</td>
                <td style={{padding:'9px 14px',color:C.gray}}>{fmtDate(r.createdAt)}</td>
                <td style={{padding:'9px 14px',display:'flex',gap:8}}>
                  {r.estado !== 'CANCELLED' && (
                    <button onClick={()=>requestConfirm("Cancelar Reserva", `¿Seguro que deseas cancelar la reserva ${r.pnr}? Esta acción no se puede deshacer.`, C.red, ()=>handleReservaAction(vista, r.id, 'cancelar'))} title="Cancelar Reserva" style={btnStyle}>❌</button>
                  )}
                  <button onClick={()=>requestConfirm("Reenviar Confirmación", `¿Deseas enviar el comprobante de reserva nuevamente al cliente?`, C.blue, ()=>handleReservaAction(vista, r.id, 'reenviar'))} title="Reenviar Confirmación" style={btnStyle}>📧</button>
                  <button onClick={()=>viewDetalles(vista, r.id)} title="Ver Detalles Técnicos" style={btnStyle}>👁️</button>
                </td>
              </tr>
            ))}
            {rows.length===0&&(<tr><td colSpan={6} style={{padding:24,textAlign:'center',color:C.gray}}>Sin registros</td></tr>)}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {VISTAS.map(v=>(
          <button key={v.id} onClick={()=>setVista(v.id)} style={{padding:'8px 16px',borderRadius:20,border:`1px solid ${vista===v.id?C.blue:C.border}`,background:vista===v.id?C.blue:C.white,color:vista===v.id?'white':C.text,fontWeight:600,cursor:'pointer',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:6}}>
            {v.label}
            <span style={{background:vista===v.id?'rgba(255,255,255,0.3)':C.border,borderRadius:20,padding:'0 6px',fontSize:'0.75rem'}}>{v.count}</span>
          </button>
        ))}
      </div>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden'}}>{renderTable()}</div>

      {/* Modal de detalles */}
      {modal && modal.type === 'detalles' && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}>
          <div style={{background:'white',padding:24,borderRadius:8,width:600,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 10px 25px rgba(0,0,0,0.2)'}}>
            <h3 style={{marginTop:0,borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>{modal.title}</h3>
            <div style={{overflow:'auto',flex:1}}>
              <pre style={{background:C.bg,padding:16,borderRadius:4,fontSize:'0.8rem',margin:0}}>
                {JSON.stringify(modal.data, null, 2)}
              </pre>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button type="button" onClick={()=>setModal(null)} style={{padding:'8px 24px',border:'none',background:C.blue,color:'white',borderRadius:6,cursor:'pointer',fontWeight:600}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Global */}
      {confirmModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:24,borderRadius:12,width:400,boxShadow:'0 15px 35px rgba(0,0,0,0.2)',textAlign:'center'}}>
            <div style={{fontSize:'3rem',marginBottom:10}}>{confirmModal.color === C.red ? '⚠️' : confirmModal.color === C.green ? '✅' : 'ℹ️'}</div>
            <h3 style={{marginTop:0,marginBottom:12,color:C.text}}>{confirmModal.title}</h3>
            <p style={{fontSize:'0.95rem',color:C.gray,marginBottom:24,lineHeight:1.5}}>{confirmModal.text}</p>
            
            <div style={{display:'flex',justifyContent:'center',gap:12}}>
              <button type="button" onClick={()=>setConfirmModal(null)} style={{padding:'10px 20px',border:`1px solid ${C.border}`,background:C.white,color:C.text,borderRadius:8,cursor:'pointer',fontWeight:600,flex:1}}>Cancelar</button>
              <button type="button" onClick={executeConfirm} style={{padding:'10px 20px',border:'none',background:confirmModal.color,color:'white',borderRadius:8,cursor:'pointer',fontWeight:600,flex:1}}>Sí, Proceder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// NUEVAS PESTAÑAS (BOOKING.COM CLONE)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS COMPARTIDOS (Finanzas / Ajustes)
// ─────────────────────────────────────────────────────────────────────────────

/** Traduce un error de axios (incluido el formato RFC 7807 del backend) a texto legible. */
function apiErrorMsg(err, fallback = 'Error inesperado') {
  if (!err) return fallback;
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'El servidor tardó demasiado en responder (timeout). Si el backend en Render estaba dormido, reintenta en unos segundos.'
      : 'No se pudo contactar con el servidor. Verifica tu conexión o el estado del backend.';
  }
  const { status, data } = err.response;
  const detail = data?.detail || data?.message || data?.title;
  // 404 de ruta inexistente (Nest: "Cannot PUT /...") vs 404 lanzado por la lógica (p. ej. usuario no encontrado)
  if (status === 404 && (!detail || /^Cannot (GET|POST|PUT|PATCH|DELETE)/i.test(String(detail)) || detail === 'Not Found')) {
    return `El endpoint no existe en el backend (404 ${err.config?.url || ''}). ¿Está desplegada la última versión?`;
  }
  if ((status === 401 || status === 403) && !detail) return 'No autorizado. Inicia sesión con una cuenta de administrador.';
  return `${Array.isArray(detail) ? detail.join(', ') : (detail || fallback)} (HTTP ${status})`;
}
const isNotFound = (err) => err?.response?.status === 404;

function toNum(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : def;
}
const round2 = (n) => Math.round(n * 100) / 100;

const SPIN_CSS = '@keyframes adm-spin { to { transform: rotate(360deg); } }';
function Spinner({ size = 14, color = C.white }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size, border: `2px solid ${color}55`, borderTopColor: color, borderRadius: '50%', animation: 'adm-spin 0.8s linear infinite', verticalAlign: 'middle', flexShrink: 0 }} />
  );
}

function Alerta({ tipo = 'error', children, onClose }) {
  const pal = {
    success: { bg: '#e8f5e9', fg: C.green, icon: '✅' },
    error: { bg: '#ffebee', fg: C.red, icon: '⚠️' },
    warning: { bg: '#fff3e0', fg: C.orange, icon: 'ℹ️' },
  }[tipo] || { bg: C.lightBlue, fg: C.darkBlue, icon: 'ℹ️' };
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} style={{ background: pal.bg, border: `1px solid ${pal.fg}`, color: pal.fg, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem' }}>
      <span>{pal.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.45 }}>{children}</span>
      {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', color: pal.fg, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>}
    </div>
  );
}

// ── Configuración global: valores por defecto y normalización ────────────────
const CONFIG_DEFAULTS = { comisionBase: 15, tasaImpuestos: 15, stripeEnabled: true, emailsEnabled: true, maintenanceMode: false };
/** Claves snake_case de la tabla `configuraciones` (clave/valor) -> campos del formulario. */
const CONFIG_CLAVES = { comision_base: 'comisionBase', tasa_impuestos: 'tasaImpuestos', stripe_enabled: 'stripeEnabled', emails_enabled: 'emailsEnabled', maintenance_mode: 'maintenanceMode' };

function toBool(v, def) {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return def;
}

/** Acepta `{comisionBase,...}`, `{data:{...}}` o filas `[{clave, valor}]` de la tabla configuraciones. */
function normalizarConfig(raw) {
  let src = raw?.data ?? raw ?? {};
  if (Array.isArray(src)) {
    src = src.reduce((acc, row) => {
      const k = CONFIG_CLAVES[row?.clave] || row?.clave;
      if (k) acc[k] = row.valor;
      return acc;
    }, {});
  }
  return {
    comisionBase: toNum(src.comisionBase, CONFIG_DEFAULTS.comisionBase),
    tasaImpuestos: toNum(src.tasaImpuestos, CONFIG_DEFAULTS.tasaImpuestos),
    stripeEnabled: toBool(src.stripeEnabled, CONFIG_DEFAULTS.stripeEnabled),
    emailsEnabled: toBool(src.emailsEnabled, CONFIG_DEFAULTS.emailsEnabled),
    maintenanceMode: toBool(src.maintenanceMode, CONFIG_DEFAULTS.maintenanceMode),
  };
}

function validarPorcentaje(valor, nombre) {
  if (valor === '' || valor === null || valor === undefined) return `${nombre} es obligatoria.`;
  const n = Number(valor);
  if (!Number.isFinite(n)) return `${nombre} debe ser un número.`;
  if (n < 0 || n > 100) return `${nombre} debe estar entre 0 y 100.`;
  return null;
}

// ── Finanzas (fusionado en Observabilidad) ───────────────────────────────────
const thFin = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: C.darkBlue, whiteSpace: 'nowrap' };
const tdFin = { padding: '9px 14px' };
const VERTICAL_ICON = { vuelos: '✈️', autos: '🚗', atracciones: '🎡', hospedaje: '🏨' };
const VERTICAL_NOMBRE = { vuelos: 'Aerolíneas (Vuelos)', autos: 'Rentadoras (Autos)', atracciones: 'Operadores (Atracciones)', hospedaje: 'Hoteles (Hospedaje)' };
const EST_PAGADAS = ['CONFIRMED', 'PAID', 'TICKET_ISSUING', 'TICKETED', 'ISSUED', 'COMPLETED'];
const EST_PENDIENTES = ['PENDING', 'PENDING_PAYMENT', 'RESERVED', 'HELD', 'CHANGE_PENDING'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtMes(periodo) {
  const [y, m] = String(periodo || '').split('-');
  return m ? `${MESES[Number(m) - 1] || m} ${y}` : periodo || '—';
}
const periodoDe = (d) => {
  const f = new Date(d);
  return Number.isNaN(f.getTime()) ? 'sin-fecha' : `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Las reservas de hospedaje todavía viven en el navegador (localStorage), así
 * que el backend no las ve. Se suman aquí con las mismas reglas que el backend.
 */
function hospedajeLocal() {
  let lista = [];
  try { lista = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]'); } catch { lista = []; }
  return (Array.isArray(lista) ? lista : []).map((r) => ({
    vertical: 'hospedaje',
    id: r.id,
    ref: String(r.id || 'HOTEL').substring(0, 6).toUpperCase(),
    estado: String(r.status || 'CONFIRMED').toUpperCase(),
    monto: toNum(r.total),
    fecha: r.createdAt || r.fecha || null,
    cliente: r.email || r.huesped?.email || null,
  }));
}

function combinarConHospedaje(fin, local) {
  if (!fin) return fin;
  const pct = toNum(fin.config?.comisionBase, 15);
  const iva = toNum(fin.config?.tasaImpuestos, 15);
  const pagadas = local.filter((m) => EST_PAGADAS.includes(m.estado));
  const cobradoH = round2(pagadas.reduce((s, m) => s + m.monto, 0));
  const porCobrarH = round2(local.filter((m) => EST_PENDIENTES.includes(m.estado)).reduce((s, m) => s + m.monto, 0));
  const anuladoH = round2(local.filter((m) => !EST_PAGADAS.includes(m.estado) && !EST_PENDIENTES.includes(m.estado)).reduce((s, m) => s + m.monto, 0));

  // Liquidaciones de hospedaje por mes (respetando lo que ya se pagó en BD)
  const grupos = {};
  pagadas.forEach((m) => {
    const p = periodoDe(m.fecha);
    grupos[p] = grupos[p] || { reservas: 0, bruto: 0 };
    grupos[p].reservas++;
    grupos[p].bruto += m.monto;
  });
  const liqBase = (fin.liquidaciones || []).filter((l) => l.vertical !== 'hospedaje');
  const pagosH = (fin.liquidaciones || []).filter((l) => l.vertical === 'hospedaje');
  const periodosH = new Set([...Object.keys(grupos), ...pagosH.map((l) => l.periodo)]);
  const liqH = [...periodosH].map((periodo) => {
    const g = grupos[periodo] || { reservas: 0, bruto: 0 };
    const previo = pagosH.find((l) => l.periodo === periodo);
    const bruto = round2(g.bruto);
    const comision = round2(bruto * pct / 100);
    const neto = round2(bruto - comision);
    const pagado = round2(previo?.pagado || 0);
    const pendiente = round2(Math.max(neto - pagado, 0));
    return {
      id: `hospedaje:${periodo}`, vertical: 'hospedaje', proveedor: VERTICAL_NOMBRE.hospedaje, periodo,
      reservas: g.reservas, bruto, comisionPct: pct, comision, neto, pagado, pendiente,
      estado: pendiente <= 0.009 ? 'PAGADO' : pagado > 0 ? 'PARCIAL' : 'PENDIENTE',
      ultimoPago: previo?.ultimoPago || null, aprobadoPor: previo?.aprobadoPor || null, local: true,
    };
  });
  const liquidaciones = [...liqBase, ...liqH].sort((a, b) => (a.periodo === b.periodo ? a.vertical.localeCompare(b.vertical) : b.periodo.localeCompare(a.periodo)));

  const r = fin.resumen || {};
  const cobrado = round2(toNum(r.cobrado) + cobradoH);
  const comisiones = round2(cobrado * pct / 100);
  const reservasPagadas = toNum(r.reservasPagadas) + pagadas.length;

  const porMes = (fin.porMes || []).map((m) => {
    const extra = round2(pagadas.filter((x) => periodoDe(x.fecha) === m.periodo).reduce((s, x) => s + x.monto, 0));
    const c = round2(toNum(m.cobrado) + extra);
    return { ...m, cobrado: c, comision: round2(c * pct / 100) };
  });

  const movLocales = local.map((m) => ({
    ...m,
    comision: EST_PAGADAS.includes(m.estado) ? round2(m.monto * pct / 100) : 0,
    clase: EST_PAGADAS.includes(m.estado) ? 'cobrado' : EST_PENDIENTES.includes(m.estado) ? 'pendiente' : 'anulado',
  }));

  return {
    ...fin,
    resumen: {
      ...r,
      cobrado,
      porCobrar: round2(toNum(r.porCobrar) + porCobrarH),
      anulado: round2(toNum(r.anulado) + anuladoH),
      comisiones,
      netoProveedores: round2(cobrado - comisiones),
      ivaIncluido: round2(cobrado - cobrado / (1 + iva / 100)),
      pendientePago: round2(liquidaciones.reduce((s, l) => s + toNum(l.pendiente), 0)),
      reservasPagadas,
      reservasTotales: toNum(r.reservasTotales) + local.length,
      ticketPromedio: reservasPagadas ? round2(cobrado / reservasPagadas) : 0,
    },
    porVertical: [
      ...(fin.porVertical || []),
      {
        vertical: 'hospedaje', proveedor: VERTICAL_NOMBRE.hospedaje, reservas: local.length, pagadas: pagadas.length,
        cobrado: cobradoH, comision: round2(cobradoH * pct / 100), neto: round2(cobradoH - cobradoH * pct / 100),
        porCobrar: porCobrarH, anulado: anuladoH, local: true,
      },
    ],
    porMes,
    liquidaciones,
    ultimosMovimientos: [...(fin.ultimosMovimientos || []), ...movLocales]
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
      .slice(0, 25),
  };
}

function EstadoLiq({ estado }) {
  const pal = { PAGADO: [C.green, '✅ Pagado'], PARCIAL: [C.blue, '◐ Parcial'], PENDIENTE: [C.orange, '🕐 Pendiente'] }[estado] || [C.gray, estado];
  return <span style={{ background: pal[0] + '1f', color: pal[0], padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{pal[1]}</span>;
}

function FinanzasPanel({ refreshKey }) {
  const [fin, setFin] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aprobando, setAprobando] = useState(null);
  const [filtroLiq, setFiltroLiq] = useState('pendientes');

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const [{ data }, hist] = await Promise.all([
        api.get('/admin/finanzas'),
        api.get('/admin/payouts').catch(() => ({ data: [] })),
      ]);
      setFin(combinarConHospedaje(data, hospedajeLocal()));
      setHistorial(Array.isArray(hist.data) ? hist.data : []);
    } catch (err) {
      setError(apiErrorMsg(err, 'No se pudieron cargar las finanzas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar, refreshKey]);

  const aprobar = async (l) => {
    if (!window.confirm(`¿Aprobar el payout de $${fmt(l.pendiente)} para ${l.proveedor} (${fmtMes(l.periodo)})?\n\nSe registrará como pagado y quedará en auditoría.`)) return;
    setAprobando(l.id);
    setAviso(null);
    try {
      const body = { vertical: l.vertical, periodo: l.periodo };
      if (l.vertical === 'hospedaje') Object.assign(body, { bruto: l.bruto, reservas: l.reservas });
      const { data } = await api.post('/admin/payouts/aprobar', body);
      setAviso({ tipo: 'success', texto: `${data?.message || 'Payout aprobado.'} Referencia: ${data?.referencia || '—'}` });
      await cargar(true);
    } catch (err) {
      setAviso({ tipo: 'error', texto: `No se pudo aprobar el payout: ${apiErrorMsg(err)}` });
    } finally {
      setAprobando(null);
    }
  };

  if (loading && !fin) {
    return <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 30, textAlign: 'center', color: C.gray }}><style>{SPIN_CSS}</style><Spinner color={C.blue} /> Calculando finanzas reales…</div>;
  }
  if (error && !fin) {
    return <Alerta tipo="error">{error} <button type="button" onClick={() => cargar()} style={{ marginLeft: 8, background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>Reintentar</button></Alerta>;
  }

  const r = fin?.resumen || {};
  const liqs = (fin?.liquidaciones || []).filter((l) => (filtroLiq === 'pendientes' ? l.pendiente > 0.009 : true));
  const maxMes = Math.max(1, ...(fin?.porMes || []).map((m) => toNum(m.cobrado)));
  const nPend = (fin?.liquidaciones || []).filter((l) => l.pendiente > 0.009).length;

  return (
    <div>
      <style>{SPIN_CSS}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12, fontSize: '0.8rem', color: C.gray }}>
        <span style={{ background: C.lightBlue, color: C.darkBlue, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>Comisión plataforma: {fin?.config?.comisionBase}%</span>
        <span style={{ background: C.lightBlue, color: C.darkBlue, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>IVA: {fin?.config?.tasaImpuestos}%</span>
        <span>Se cambian en ⚙️ Ajustes · Calculado: {fmtDate(fin?.generadoEn)}</span>
        {loading && <Spinner color={C.blue} size={12} />}
      </div>
      {error && <Alerta tipo="error" onClose={() => setError(null)}>{error}</Alerta>}
      {aviso && <Alerta tipo={aviso.tipo} onClose={() => setAviso(null)}>{aviso.texto}</Alerta>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard icon="💳" label="Cobrado a clientes" value={`$${fmt(r.cobrado)}`} sub={`${r.reservasPagadas || 0} reservas pagadas`} color={C.blue} />
        <KpiCard icon="📈" label="Comisiones (ingreso)" value={`$${fmt(r.comisiones)}`} sub={`${fin?.config?.comisionBase}% del cobrado`} color={C.green} />
        <KpiCard icon="🤝" label="Neto a proveedores" value={`$${fmt(r.netoProveedores)}`} sub="cobrado − comisión" color={C.darkBlue} />
        <KpiCard icon="🏦" label="Pagado a proveedores" value={`$${fmt(r.pagadoProveedores)}`} sub="payouts aprobados" color={C.cyan} />
        <KpiCard icon="⏳" label="Pendiente de pago" value={`$${fmt(r.pendientePago)}`} sub={`${nPend} liquidaciones`} color={C.orange} />
        <KpiCard icon="🧾" label="Por cobrar" value={`$${fmt(r.porCobrar)}`} sub="reservas sin pagar" color={C.yellow} />
        <KpiCard icon="↩️" label="Anulado / reembolsos" value={`$${fmt(r.anulado)}`} sub="canceladas o fallidas" color={C.red} />
        <KpiCard icon="🏛️" label="IVA incluido" value={`$${fmt(r.ivaIncluido)}`} sub={`al ${fin?.config?.tasaImpuestos}%`} color={C.gray} />
        <KpiCard icon="🎟️" label="Ticket promedio" value={`$${fmt(r.ticketPromedio)}`} sub="por reserva pagada" color={'#8e44ad'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16 }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>📅 Cobrado por mes (últimos 6)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {(fin?.porMes || []).map((m) => (
              <div key={m.periodo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`Cobrado $${fmt(m.cobrado)} · Comisión $${fmt(m.comision)}`}>
                <span style={{ fontSize: '0.68rem', color: C.gray, whiteSpace: 'nowrap' }}>${Math.round(toNum(m.cobrado)).toLocaleString('es-EC')}</span>
                <div style={{ width: '100%', maxWidth: 42, height: `${Math.max(2, (toNum(m.cobrado) / maxMes) * 110)}px`, background: `linear-gradient(180deg, ${C.blue}, ${C.darkBlue})`, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${toNum(m.cobrado) ? (toNum(m.comision) / toNum(m.cobrado)) * 100 : 0}%`, background: C.green, borderRadius: 0 }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: C.text }}>{fmtMes(m.periodo)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: C.gray, marginTop: 8 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.blue, borderRadius: 2, marginRight: 4 }} />Cobrado</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C.green, borderRadius: 2, marginRight: 4 }} />Comisión</span>
          </div>
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', padding: '16px 20px 8px' }}>🧩 Dinero por vertical</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: C.lightBlue }}>{['Vertical', 'Pagadas', 'Cobrado', 'Comisión', 'Neto prov.', 'Por cobrar'].map((h) => <th key={h} style={thFin}>{h}</th>)}</tr></thead>
              <tbody>
                {(fin?.porVertical || []).map((v) => (
                  <tr key={v.vertical} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={tdFin}>{VERTICAL_ICON[v.vertical]} <span style={{ textTransform: 'capitalize' }}>{v.vertical}</span>{v.local && <span title="Reservas guardadas en este navegador" style={{ marginLeft: 4, fontSize: '0.65rem', color: C.gray }}>(local)</span>}</td>
                    <td style={tdFin}>{v.pagadas}/{v.reservas}</td>
                    <td style={{ ...tdFin, fontWeight: 600 }}>${fmt(v.cobrado)}</td>
                    <td style={{ ...tdFin, color: C.green }}>${fmt(v.comision)}</td>
                    <td style={tdFin}>${fmt(v.neto)}</td>
                    <td style={{ ...tdFin, color: C.orange }}>${fmt(v.porCobrar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <SectionTitle badge={nPend ? `${nPend} pendientes` : null}>🏦 Liquidaciones a proveedores (Payouts)</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['pendientes', 'Pendientes'], ['todas', 'Todas']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFiltroLiq(id)} style={{ background: filtroLiq === id ? C.blue : C.white, color: filtroLiq === id ? 'white' : C.text, border: `1px solid ${filtroLiq === id ? C.blue : C.border}`, borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ background: C.lightBlue }}>{['Proveedor', 'Periodo', 'Reservas', 'Bruto', 'Comisión', 'Neto', 'Pagado', 'Pendiente', 'Estado', 'Acción'].map((h) => <th key={h} style={thFin}>{h}</th>)}</tr></thead>
          <tbody>
            {liqs.map((l) => (
              <tr key={l.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ ...tdFin, fontWeight: 600 }}>{VERTICAL_ICON[l.vertical]} {l.proveedor}</td>
                <td style={tdFin}>{fmtMes(l.periodo)}</td>
                <td style={tdFin}>{l.reservas}</td>
                <td style={tdFin}>${fmt(l.bruto)}</td>
                <td style={{ ...tdFin, color: C.red }}>−${fmt(l.comision)} <span style={{ color: C.gray, fontSize: '0.72rem' }}>({l.comisionPct}%)</span></td>
                <td style={{ ...tdFin, fontWeight: 600 }}>${fmt(l.neto)}</td>
                <td style={{ ...tdFin, color: C.green }}>${fmt(l.pagado)}</td>
                <td style={{ ...tdFin, fontWeight: 700, color: l.pendiente > 0.009 ? C.orange : C.gray }}>${fmt(l.pendiente)}</td>
                <td style={tdFin}><EstadoLiq estado={l.estado} />{l.aprobadoPor && <div style={{ fontSize: '0.68rem', color: C.gray, marginTop: 2 }}>por {l.aprobadoPor}</div>}</td>
                <td style={tdFin}>
                  {l.pendiente > 0.009 ? (
                    <button type="button" onClick={() => aprobar(l)} disabled={!!aprobando} style={{ background: C.green, color: 'white', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: aprobando ? 'wait' : 'pointer', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: aprobando && aprobando !== l.id ? 0.5 : 1 }}>
                      {aprobando === l.id && <Spinner size={12} />} Aprobar Payout
                    </button>
                  ) : <span style={{ color: C.gray, fontSize: '0.8rem' }}>—</span>}
                </td>
              </tr>
            ))}
            {liqs.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: C.gray }}>
                {filtroLiq === 'pendientes' ? 'No hay payouts pendientes. Todo está liquidado. ✅' : 'Aún no hay reservas pagadas para liquidar.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div>
          <SectionTitle>💸 Últimos movimientos</SectionTitle>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: C.lightBlue, position: 'sticky', top: 0 }}>{['Fecha', 'Tipo', 'Ref', 'Estado', 'Monto', 'Comisión'].map((h) => <th key={h} style={thFin}>{h}</th>)}</tr></thead>
              <tbody>
                {(fin?.ultimosMovimientos || []).map((m, i) => (
                  <tr key={`${m.vertical}-${m.id}-${i}`} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ ...tdFin, color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(m.fecha)}</td>
                    <td style={tdFin}>{VERTICAL_ICON[m.vertical]}</td>
                    <td style={{ ...tdFin, fontFamily: 'monospace', fontWeight: 600 }}>{m.ref}</td>
                    <td style={tdFin}><Badge status={m.estado} /></td>
                    <td style={{ ...tdFin, fontWeight: 600, color: m.clase === 'anulado' ? C.gray : C.text, textDecoration: m.clase === 'anulado' ? 'line-through' : 'none' }}>${fmt(m.monto)}</td>
                    <td style={{ ...tdFin, color: C.green }}>{m.comision ? `$${fmt(m.comision)}` : '—'}</td>
                  </tr>
                ))}
                {(fin?.ultimosMovimientos || []).length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.gray }}>Sin movimientos aún</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionTitle>📜 Historial de payouts aprobados</SectionTitle>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: C.lightBlue, position: 'sticky', top: 0 }}>{['Fecha', 'Proveedor', 'Periodo', 'Pagado', 'Referencia', 'Aprobó'].map((h) => <th key={h} style={thFin}>{h}</th>)}</tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ ...tdFin, color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(h.aprobadoEn)}</td>
                    <td style={tdFin}>{VERTICAL_ICON[h.vertical]} {h.proveedor}</td>
                    <td style={tdFin}>{fmtMes(h.periodo)}</td>
                    <td style={{ ...tdFin, fontWeight: 700, color: C.green }}>${fmt(toNum(h.pagado))}</td>
                    <td style={{ ...tdFin, fontFamily: 'monospace', fontSize: '0.72rem' }}>{h.referencia}</td>
                    <td style={{ ...tdFin, fontSize: '0.75rem' }}>{h.aprobadoPor || '—'}</td>
                  </tr>
                ))}
                {historial.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.gray }}>Todavía no se ha aprobado ningún payout</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SoporteTab() {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [resolutionText, setResolutionText] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setTickets(data || []);
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setLoadingTickets(false);
      }
    }
    fetchTickets();
  }, []);

  const updateTicket = async (ticketId, status, resolution) => {
    setSavingId(ticketId);
    try {
      const updates = { status };
      if (resolution !== undefined) {
        updates.resolution = resolution;
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = 'admin@booking.ec';
      }
      const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId);
      if (error) throw error;
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
      if (status === 'RESOLVED' || status === 'REJECTED') setExpandedId(null);
    } catch (err) {
      console.error('Error updating ticket:', err);
    } finally {
      setSavingId(null);
    }
  };

  const ST_LABEL = { PENDING: '🕐 Pendiente', IN_REVIEW: '🔍 En revisión', RESOLVED: '✅ Resuelto', REJECTED: '❌ Rechazado' };

  return (
    <div>
      <div style={{ background: '#fff3e0', border: '1px solid #e65100', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>🎧</span>
        <span style={{ fontSize: '0.85rem', color: '#e65100' }}>
          <strong>Soporte y Moderación (QC).</strong> Gestión de tickets de clientes y aprobación de nuevos listados.
        </span>
      </div>

      <SectionTitle>🛂 Moderación (Quality Control) - Pendientes de Aprobación</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700 }}>Hostal La Costa 🏖️</span>
            <Badge status="PENDING" />
          </div>
          <div style={{ fontSize: '0.85rem', color: C.gray, marginBottom: 14 }}>Esperando revisión de fotos y validación de RUC.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, background: C.green, color: 'white', border: 'none', borderRadius: 4, padding: '6px', cursor: 'pointer', fontWeight: 600 }}>Aprobar</button>
            <button style={{ flex: 1, background: C.red, color: 'white', border: 'none', borderRadius: 4, padding: '6px', cursor: 'pointer', fontWeight: 600 }}>Rechazar</button>
          </div>
        </div>
      </div>

      <SectionTitle>🎫 Tickets de Soporte (Helpdesk)</SectionTitle>

      {loadingTickets && (
        <div style={{ textAlign: 'center', padding: '30px', color: C.gray }}>Cargando tickets...</div>
      )}
      {!loadingTickets && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: C.gray, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          No hay tickets de soporte reportados aún.
        </div>
      )}

      {!loadingTickets && tickets.map(t => {
        const isExpanded = expandedId === t.id;
        const priColor = t.priority === 'Alta' ? C.red : t.priority === 'Media' ? C.orange : C.text;
        const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

        return (
          <div key={t.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
            {/* Row header */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 80px 140px 36px', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: '8px' }}
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
            >
              <div style={{ fontWeight: 700, color: C.blue, fontSize: '0.82rem' }}>#{t.id}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.client_name}</div>
                <div style={{ fontSize: '0.78rem', color: C.gray }}>{t.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.88rem' }}>{t.subject}</div>
                <div style={{ fontSize: '0.78rem', color: C.gray }}>{t.entity_name} · {t.pnr_or_id}</div>
              </div>
              <div style={{ fontWeight: 700, color: priColor, fontSize: '0.85rem' }}>{t.priority}</div>
              <div>
                <Badge status={t.status} />
                <div style={{ fontSize: '0.72rem', color: C.gray, marginTop: 2 }}>{dateStr}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: C.gray }}>{isExpanded ? '▲' : '▼'}</div>
            </div>

            {/* Expanded panel */}
            {isExpanded && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.73rem', fontWeight: 700, color: C.gray, marginBottom: 4 }}>DESCRIPCIÓN DEL USUARIO</div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: C.text, lineHeight: 1.5, background: 'white', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>{t.description}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.73rem', fontWeight: 700, color: C.gray, marginBottom: 4 }}>CAMBIAR ESTADO</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map(s => (
                        <button
                          key={s}
                          disabled={t.status === s || savingId === t.id}
                          onClick={() => updateTicket(t.id, s, s === 'RESOLVED' ? (resolutionText[t.id] || t.resolution) : undefined)}
                          style={{ padding: '5px 10px', borderRadius: 4, border: `1px solid ${t.status === s ? C.blue : C.border}`, background: t.status === s ? C.lightBlue : 'white', color: t.status === s ? C.darkBlue : C.text, fontWeight: t.status === s ? 700 : 400, cursor: t.status === s ? 'default' : 'pointer', fontSize: '0.78rem', opacity: savingId === t.id ? 0.6 : 1 }}
                        >
                          {ST_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, color: C.gray, marginBottom: 4 }}>
                    RESOLUCIÓN / RESPUESTA AL USUARIO {t.resolution && <span style={{ color: C.green }}>(ya tiene resolución)</span>}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Escribe la resolución o respuesta que verá el usuario..."
                    value={resolutionText[t.id] ?? (t.resolution || '')}
                    onChange={e => setResolutionText(prev => ({ ...prev, [t.id]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: '0.88rem', boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => updateTicket(t.id, 'IN_REVIEW', undefined)}
                    disabled={t.status === 'IN_REVIEW' || savingId === t.id}
                    style={{ padding: '7px 14px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                  >
                    🔍 Marcar En Revisión
                  </button>
                  <button
                    onClick={() => updateTicket(t.id, 'RESOLVED', resolutionText[t.id] || t.resolution || '')}
                    disabled={savingId === t.id}
                    style={{ padding: '7px 14px', background: C.green, color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', opacity: savingId === t.id ? 0.6 : 1 }}
                  >
                    {savingId === t.id ? 'Guardando...' : '✅ Resolver y Notificar'}
                  </button>
                  <button
                    onClick={() => updateTicket(t.id, 'REJECTED', resolutionText[t.id] || '')}
                    disabled={savingId === t.id}
                    style={{ padding: '7px 14px', background: C.red, color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Auditoría (datos reales: admin_audit_logs + eventos del sistema) ─────────
const AUD_CATEGORIAS = { usuario: '👤 Usuarios', sesion: '🔐 Sesiones', reserva: '🎫 Reservas', soporte: '🎧 Soporte', liquidacion: '🏦 Payouts', config: '⚙️ Ajustes' };
const AUD_POR_PAGINA = 25;

function catLabel(c) {
  if (AUD_CATEGORIAS[c]) return AUD_CATEGORIAS[c];
  if (String(c).startsWith('reserva')) return AUD_CATEGORIAS.reserva;
  return c;
}
function catGrupo(c) { return String(c).startsWith('reserva') ? 'reserva' : c; }

function tiempoRelativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '';
  if (diff < 60) return 'hace segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `hace ${Math.floor(diff / 86400)} d`;
  return '';
}

function exportarCsv(filas) {
  const cols = ['fecha', 'origen', 'categoria', 'actor', 'accion', 'entidad', 'detalle', 'ip'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...filas.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AuditoriaTab({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [origen, setOrigen] = useState('todos');
  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/auditoria', { params: { limit: 500 } });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(apiErrorMsg(err, 'No se pudo cargar la auditoría'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar, refreshKey]);
  useEffect(() => { setPagina(1); }, [origen, categoria, busqueda]);

  const q = busqueda.trim().toLowerCase();
  const filtrados = items.filter((i) =>
    (origen === 'todos' || i.origen === origen)
    && (categoria === 'todas' || catGrupo(i.categoria) === categoria)
    && (!q || [i.actor, i.accion, i.entidad, i.detalle, i.ip].some((v) => String(v || '').toLowerCase().includes(q))));
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / AUD_POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * AUD_POR_PAGINA, pagina * AUD_POR_PAGINA);
  const categorias = [...new Set(items.map((i) => catGrupo(i.categoria)))];
  const hoy = new Date().toDateString();
  const nHoy = items.filter((i) => new Date(i.fecha).toDateString() === hoy).length;

  const selStyle = { padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontSize: '0.85rem' };

  return (
    <div>
      <style>{SPIN_CSS}</style>
      <div style={{ background: C.lightBlue, border: `1px solid ${C.blue}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>🛡️</span>
        <span style={{ fontSize: '0.85rem', color: C.darkBlue, flex: 1 }}>
          <strong>Registro de Auditoría.</strong> Acciones del equipo de administración (usuarios, reservas, payouts, ajustes, tickets) y eventos del sistema (registros, inicios de sesión y reservas) leídos de la base de datos.
        </span>
        {loading && <Spinner color={C.blue} size={14} />}
      </div>

      {error && <Alerta tipo="error" onClose={() => setError(null)}>{error} <button type="button" onClick={cargar} style={{ marginLeft: 8, background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>Reintentar</button></Alerta>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard icon="📚" label="Eventos registrados" value={items.length} color={C.blue} />
        <KpiCard icon="🧑‍💼" label="Acciones de admin" value={items.filter((i) => i.origen === 'ADMIN').length} color={C.darkBlue} />
        <KpiCard icon="🖥️" label="Eventos del sistema" value={items.filter((i) => i.origen === 'SISTEMA').length} color={C.cyan} />
        <KpiCard icon="📅" label="Hoy" value={nHoy} color={C.green} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <input type="search" placeholder="Buscar por usuario, acción, entidad, IP…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ ...selStyle, flex: '1 1 240px' }} aria-label="Buscar en auditoría" />
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} style={selStyle} aria-label="Origen">
          <option value="todos">Todos los orígenes</option>
          <option value="ADMIN">Solo administración</option>
          <option value="SISTEMA">Solo sistema</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={selStyle} aria-label="Categoría">
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
        <button type="button" onClick={() => exportarCsv(filtrados)} disabled={!filtrados.length} style={{ ...selStyle, cursor: filtrados.length ? 'pointer' : 'not-allowed', fontWeight: 600 }}>⬇️ Exportar CSV</button>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: C.lightBlue }}>
              {['Fecha y hora', 'Origen', 'Usuario / Actor', 'Acción', 'Entidad afectada', 'Detalle', 'IP'].map((h) => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: C.darkBlue, whiteSpace: 'nowrap' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map((log) => (
              <tr key={log.id} style={{ borderTop: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                  <div>{fmtDate(log.fecha)}</div>
                  <div style={{ fontSize: '0.7rem', color: C.gray }}>{tiempoRelativo(log.fecha)}</div>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ background: log.origen === 'ADMIN' ? C.darkBlue : C.border, color: log.origen === 'ADMIN' ? 'white' : C.text, padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>{log.origen === 'ADMIN' ? 'Admin' : 'Sistema'}</span>
                </td>
                <td style={{ padding: '9px 14px', fontWeight: 600, color: C.darkBlue, wordBreak: 'break-all' }}>{log.actor}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ background: C.lightBlue, padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{log.accion}</span>
                  <div style={{ fontSize: '0.68rem', color: C.gray, marginTop: 3 }}>{catLabel(log.categoria)}</div>
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.entidad}</td>
                <td style={{ padding: '9px 14px', color: C.gray, fontSize: '0.78rem', maxWidth: 280 }}>{log.detalle || '—'}</td>
                <td style={{ padding: '9px 14px', color: C.gray, fontSize: '0.78rem', fontFamily: 'monospace' }}>{log.ip || '—'}</td>
              </tr>
            ))}
            {!loading && visibles.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.gray }}>
                {items.length ? 'Ningún evento coincide con los filtros.' : 'Aún no hay eventos registrados.'}
              </td></tr>
            )}
            {loading && items.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.gray }}>Cargando registros…</td></tr>}
          </tbody>
        </table>
      </div>

      {filtrados.length > AUD_POR_PAGINA && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.82rem', color: C.gray }}>
          <span>{filtrados.length} eventos · página {pagina} de {totalPaginas}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...selStyle, cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>‹ Anterior</button>
            <button type="button" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ ...selStyle, cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

const aFormularioConfig = (cfg) => ({ ...cfg, comisionBase: String(cfg.comisionBase), tasaImpuestos: String(cfg.tasaImpuestos) });
const configIgual = (a, b) => !!a && !!b && Object.keys(CONFIG_DEFAULTS).every((k) => a[k] === b[k]);

function ToggleAjuste({ titulo, descripcion, checked, onChange, disabled, color = C.green, tituloColor, ultimo }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: ultimo ? 0 : 16, paddingBottom: ultimo ? 0 : 16, borderBottom: ultimo ? 'none' : `1px solid ${C.border}`, cursor: disabled ? 'default' : 'pointer' }}>
      <div>
        <div style={{ fontWeight: 700, color: tituloColor || C.text }}>{titulo}</div>
        <div style={{ fontSize: '0.8rem', color: C.gray }}>{descripcion}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ transform: 'scale(1.5)', accentColor: color, cursor: disabled ? 'default' : 'pointer' }} />
    </label>
  );
}

function ConfiguracionTab() {
  const [form, setForm] = useState(() => aFormularioConfig(CONFIG_DEFAULTS));
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }

  const cargar = useCallback(async () => {
    setLoading(true);
    setMensaje(null);
    setErrores({});
    try {
      const { data } = await api.get('/admin/config');
      const cfg = normalizarConfig(data);
      setOriginal(cfg);
      setForm(aFormularioConfig(cfg));
    } catch (err) {
      const cfg = { ...CONFIG_DEFAULTS };
      setOriginal(cfg);
      setForm(aFormularioConfig(cfg));
      setMensaje(isNotFound(err)
        ? { tipo: 'warning', texto: 'GET /admin/config aún no existe en el backend. Se muestran los valores por defecto; guardar fallará hasta que se cree PUT /admin/config.' }
        : { tipo: 'error', texto: `No se pudo cargar la configuración actual: ${apiErrorMsg(err)} Se muestran los valores por defecto.` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (mensaje?.tipo !== 'success') return undefined;
    const t = setTimeout(() => setMensaje(null), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  // ── Handlers ──
  const onPorcentaje = (campo, etiqueta) => (e) => {
    const valor = e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((er) => ({ ...er, [campo]: validarPorcentaje(valor, etiqueta) }));
  };
  const onComisionChange = onPorcentaje('comisionBase', 'La comisión');
  const onImpuestosChange = onPorcentaje('tasaImpuestos', 'La tasa de impuestos');
  const onToggle = (campo) => (e) => {
    const checked = e.target.checked;
    setForm((f) => ({ ...f, [campo]: checked }));
  };

  const payload = {
    comisionBase: Number(form.comisionBase),
    tasaImpuestos: Number(form.tasaImpuestos),
    stripeEnabled: form.stripeEnabled,
    emailsEnabled: form.emailsEnabled,
    maintenanceMode: form.maintenanceMode,
  };
  const hayErrores = Boolean(errores.comisionBase || errores.tasaImpuestos);
  const hayCambios = !!original && !configIgual(payload, original);
  const bloqueado = loading || saving;

  const descartar = () => {
    if (!original) return;
    setForm(aFormularioConfig(original));
    setErrores({});
    setMensaje(null);
  };

  const guardar = async () => {
    const nuevos = {
      comisionBase: validarPorcentaje(form.comisionBase, 'La comisión'),
      tasaImpuestos: validarPorcentaje(form.tasaImpuestos, 'La tasa de impuestos'),
    };
    setErrores(nuevos);
    if (nuevos.comisionBase || nuevos.tasaImpuestos) {
      setMensaje({ tipo: 'error', texto: 'Corrige los campos marcados antes de guardar.' });
      return;
    }
    if (payload.maintenanceMode && !original?.maintenanceMode
      && !window.confirm('Activar el Modo Mantenimiento bloqueará el acceso público a toda la plataforma. ¿Deseas continuar?')) {
      return;
    }
    setSaving(true);
    setMensaje(null);
    try {
      const body = { ...payload };
      const { data } = await api.put('/admin/config', body);
      // Si el backend devuelve la configuración persistida, se usa como fuente de verdad.
      const src = data?.data ?? data;
      const devuelveConfig = Array.isArray(src) || (src && typeof src === 'object' && Object.keys(CONFIG_DEFAULTS).some((k) => k in src));
      const cfg = devuelveConfig ? normalizarConfig(Array.isArray(src) ? src : { ...body, ...src }) : body;
      setOriginal(cfg);
      setForm(aFormularioConfig(cfg));
      setMensaje({ tipo: 'success', texto: 'Configuración guardada correctamente.' });
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: isNotFound(err)
          ? 'PUT /admin/config todavía no existe en el backend. Los cambios NO se guardaron.'
          : `No se pudieron guardar los cambios: ${apiErrorMsg(err)}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (err) => ({ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${err ? C.red : C.border}`, background: bloqueado ? C.bg : C.white, outline: 'none' });
  const errStyle = { fontSize: '0.75rem', color: C.red, marginTop: 4 };

  return (
    <div>
      <style>{SPIN_CSS}</style>
      <div style={{ background: '#f5f5f5', border: `1px solid ${C.gray}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
        <span style={{ fontSize: '0.85rem', color: C.text, flex: 1 }}>
          <strong>Ajustes Globales del Sistema.</strong> Configuración central del comportamiento de la plataforma Booking Ecuador.
        </span>
        {loading && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.gray }}><Spinner color={C.blue} size={12} /> Cargando…</span>}
      </div>

      {mensaje && <Alerta tipo={mensaje.tipo} onClose={() => setMensaje(null)}>{mensaje.texto}</Alerta>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Panel Finanzas Globales */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px' }}>
          <SectionTitle badge="Global">Finanzas y Comisiones</SectionTitle>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="cfg-comision" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Comisión Base de la Plataforma (%)</label>
            <input id="cfg-comision" type="number" min={0} max={100} step="0.01" inputMode="decimal" value={form.comisionBase} onChange={onComisionChange} disabled={bloqueado} aria-invalid={!!errores.comisionBase} style={inputStyle(errores.comisionBase)} />
            {errores.comisionBase
              ? <div style={errStyle}>{errores.comisionBase}</div>
              : <div style={{ fontSize: '0.75rem', color: C.gray, marginTop: 4 }}>Se descuenta del total de cada reserva al liquidar al proveedor.</div>}
          </div>
          <div>
            <label htmlFor="cfg-iva" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Tasa de Impuestos (IVA %)</label>
            <input id="cfg-iva" type="number" min={0} max={100} step="0.01" inputMode="decimal" value={form.tasaImpuestos} onChange={onImpuestosChange} disabled={bloqueado} aria-invalid={!!errores.tasaImpuestos} style={inputStyle(errores.tasaImpuestos)} />
            {errores.tasaImpuestos && <div style={errStyle}>{errores.tasaImpuestos}</div>}
          </div>
        </div>

        {/* Panel Integraciones */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px' }}>
          <SectionTitle badge="APIs">Pasarelas y Servicios</SectionTitle>
          <ToggleAjuste titulo="Pasarela de Pagos (Stripe – Test Mode)" descripcion="Si se apaga, se avisa en toda la web que los pagos en línea están suspendidos" checked={form.stripeEnabled} onChange={onToggle('stripeEnabled')} disabled={bloqueado} />
          <ToggleAjuste titulo="Envío de Emails (SMTP)" descripcion="Si se apaga, el backend deja de enviar facturas/comprobantes por correo" checked={form.emailsEnabled} onChange={onToggle('emailsEnabled')} disabled={bloqueado} />
          <ToggleAjuste titulo="Modo Mantenimiento" tituloColor={C.red} color={C.red} descripcion="Muestra una pantalla de mantenimiento a todos los visitantes (los administradores siguen entrando)" checked={form.maintenanceMode} onChange={onToggle('maintenanceMode')} disabled={bloqueado} ultimo />
        </div>
      </div>

      {/* Barra de acciones (un único PUT guarda todos los ajustes) */}
      <div style={{ marginTop: 20, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: hayCambios ? C.orange : C.gray, fontWeight: hayCambios ? 600 : 400 }}>
          {loading ? 'Obteniendo configuración actual…' : hayCambios ? '● Tienes cambios sin guardar' : 'Sin cambios pendientes'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={descartar} disabled={!hayCambios || saving} style={{ background: C.white, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 16px', cursor: !hayCambios || saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: !hayCambios || saving ? 0.55 : 1 }}>
            Descartar
          </button>
          <button type="button" onClick={guardar} disabled={bloqueado || hayErrores || !hayCambios} style={{ background: C.blue, color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: bloqueado || hayErrores || !hayCambios ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: bloqueado || hayErrores || !hayCambios ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {saving && <Spinner size={13} />}
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [activeTab,setActiveTab]=useState('observabilidad');
  const [stats,setStats]=useState(null);
  const [users,setUsers]=useState([]);
  const [usersError,setUsersError]=useState(null);
  const [refreshKey,setRefreshKey]=useState(0);
  const [reservas,setReservas]=useState({vuelos:[],autos:[],atracciones:[],hospedaje:[]});
  const [serviceHealth,setServiceHealth]=useState([]);
  const [loadingStats,setLoadingStats]=useState(true);
  const [loadingUsers,setLoadingUsers]=useState(false);
  const [loadingReservas,setLoadingReservas]=useState(false);
  const [lastRefresh,setLastRefresh]=useState(null);

  const checkServices=useCallback(async()=>{
    const endpoints=[
      {label:'Módulo Vuelos',url:'/vuelos/bookings?limit=1'},
      {label:'Módulo Autos',url:'/autos/orders'},
      {label:'Módulo Atracciones',url:'/atracciones?page=1&limit=1'},
      {label:'Módulo Chatbot',url:'/chatbot/estado'},
      {label:'Módulo Admin (Stats)',url:'/admin/stats'},
    ];
    const results=await Promise.all(endpoints.map(async(e)=>{
      const t0=Date.now();
      try{await api.get(e.url);return{label:e.label,ok:true,latency:Date.now()-t0};}
      catch{return{label:e.label,ok:false,latency:Date.now()-t0};}
    }));
    setServiceHealth(results);
  },[]);

  const fetchStats=useCallback(async(silent=false)=>{
    if(!silent) setLoadingStats(true);
    try{
      const{data}=await api.get('/admin/stats');
      
      const localesAloj = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
      const hospedajeList = localesAloj.map(al => ({
        id: al.id,
        tipo: 'hospedaje',
        pnr: (al.id || 'HOTEL').substring(0, 6).toUpperCase(),
        estado: al.status || 'CONFIRMED',
        total: al.total || 0,
        moneda: 'USD',
        createdAt: al.createdAt || al.fecha || new Date().toISOString().split('T')[0],
      }));

      const localesAutos = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      const autosList = localesAutos.map(au => ({
        id: au.id || au.orderId,
        tipo: 'auto',
        pnr: (au.id || au.orderId || 'AUTO').substring(0, 6).toUpperCase(),
        estado: au.status || 'CONFIRMED',
        total: au.totalPrice?.total || au.total || 0,
        moneda: 'USD',
        createdAt: au.createdAt || au.date || new Date().toISOString().split('T')[0],
      }));

      const localesAtracciones = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const atraccionesList = localesAtracciones.map(at => ({
        id: at.id || at.reservation_id,
        tipo: 'atraccion',
        pnr: (at.id || at.reservation_id || 'ATRAC').substring(0, 6).toUpperCase(),
        estado: at.status || 'CONFIRMED',
        total: at.totalPrice?.total || at.total || 0,
        moneda: 'USD',
        createdAt: at.createdAt || at.date || new Date().toISOString().split('T')[0],
      }));
      
      const kpis = data.kpis || {};
      const statsHospedaje = localesAloj.length;
      const ingresosHospedaje = localesAloj.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      
      const statsAutosLocales = localesAutos.length;
      const ingresosAutosLocales = localesAutos.reduce((acc, curr) => acc + Number(curr.totalPrice?.total || curr.total || 0), 0);

      const statsAtraccionesLocales = localesAtracciones.length;
      const ingresosAtraccionesLocales = localesAtracciones.reduce((acc, curr) => acc + Number(curr.totalPrice?.total || curr.total || 0), 0);
      
      let ultimasReservas = [...(data.ultimasReservas || []), ...hospedajeList, ...autosList, ...atraccionesList]
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0,10);
        
      setStats({
        ...data,
        kpis: {
          ...kpis,
          reservasHospedaje: statsHospedaje,
          ingresosHospedaje: ingresosHospedaje,
          reservasAutos: (kpis.reservasAutos || 0) + statsAutosLocales,
          ingresosAutos: (kpis.ingresosAutos || 0) + ingresosAutosLocales,
          reservasAtracciones: (kpis.reservasAtracciones || 0) + statsAtraccionesLocales,
          ingresosAtracciones: (kpis.ingresosAtracciones || 0) + ingresosAtraccionesLocales,
          totalReservas: (kpis.totalReservas || 0) + statsHospedaje + statsAutosLocales + statsAtraccionesLocales,
          ingresosTotal: (kpis.ingresosTotal || 0) + ingresosHospedaje + ingresosAutosLocales + ingresosAtraccionesLocales
        },
        ultimasReservas
      });
    }
    catch{setStats({kpis:{},ultimasReservas:[],estadosVuelos:{}});}
    finally{if(!silent) setLoadingStats(false);setLastRefresh(new Date());}
  },[]);

  const fetchUsers=useCallback(async(silent=false)=>{
    if(!silent) setLoadingUsers(true);
    setUsersError(null);
    try{
      const{data}=await api.get('/admin/users');
      const lista=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:(Array.isArray(data?.users)?data.users:null));
      if(!lista) throw new Error('Respuesta inesperada del backend en /admin/users');
      setUsers(lista);
    }
    catch(err){setUsers([]);setUsersError(err?.response?apiErrorMsg(err,'No se pudieron cargar los usuarios'):(err?.message||apiErrorMsg(err)));}
    finally{if(!silent) setLoadingUsers(false);}
  },[]);

  const fetchReservas=useCallback(async(silent=false)=>{
    if(!silent) setLoadingReservas(true);
    try{
      const{data}=await api.get('/admin/reservas');
      
      const localesAloj = JSON.parse(localStorage.getItem('reservas_alojamientos') || '[]');
      const hospedajeList = localesAloj.map(al => ({
        id: al.id,
        tipo: 'hospedaje',
        pnr: (al.id || 'HOTEL').substring(0, 6).toUpperCase(),
        estado: al.status || 'CONFIRMED',
        total: al.total || 0,
        moneda: 'USD',
        createdAt: al.createdAt || al.fecha || new Date().toISOString().split('T')[0],
      }));

      const localesAutos = JSON.parse(localStorage.getItem('reservas_autos') || '[]');
      const autosList = localesAutos.map(au => ({
        id: au.id || au.orderId,
        tipo: 'auto',
        pnr: (au.id || au.orderId || 'AUTO').substring(0, 6).toUpperCase(),
        estado: au.status || 'CONFIRMED',
        total: au.totalPrice?.total || au.total || 0,
        moneda: 'USD',
        createdAt: au.createdAt || au.date || new Date().toISOString().split('T')[0],
      }));

      const localesAtracciones = JSON.parse(localStorage.getItem('reservas_atracciones') || '[]');
      const atraccionesList = localesAtracciones.map(at => ({
        id: at.id || at.reservation_id,
        tipo: 'atraccion',
        pnr: (at.id || at.reservation_id || 'ATRAC').substring(0, 6).toUpperCase(),
        estado: at.status || 'CONFIRMED',
        total: at.totalPrice?.total || at.total || 0,
        moneda: 'USD',
        createdAt: at.createdAt || at.date || new Date().toISOString().split('T')[0],
      }));

      setReservas({
        ...data, 
        hospedaje: hospedajeList,
        autos: [...(data.autos || []), ...autosList],
        atracciones: [...(data.atracciones || []), ...atraccionesList]
      });
    }
    catch{setReservas({vuelos:[],autos:[],atracciones:[],hospedaje:[]});}
    finally{if(!silent) setLoadingReservas(false);}
  },[]);

  useEffect(()=>{fetchStats();checkServices();},[]);

  useEffect(()=>{
    if(activeTab==='gestion'){fetchUsers();fetchReservas();}
  },[activeTab]);

  const handleRefresh=()=>{
    fetchStats(true);checkServices();setRefreshKey(k=>k+1);
    if(activeTab==='gestion'){fetchUsers(true);fetchReservas(true);}
  };

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'Segoe UI', system-ui, sans-serif"}}>
      <div style={{background:C.darkBlue,color:'white',padding:'0 24px'}}>
        <div style={{maxWidth:1280,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:'1.3rem'}}>🛡️</span>
            <div>
              <div style={{fontWeight:700,fontSize:'1rem'}}>Panel de Administración</div>
              <div style={{fontSize:'0.7rem',opacity:0.7}}>Booking Ecuador — RDA1 · Integración de Sistemas</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {lastRefresh&&<span style={{fontSize:'0.75rem',opacity:0.7}}>Actualizado: {lastRefresh.toLocaleTimeString('es-EC')}</span>}
            <button onClick={handleRefresh} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'white',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:'0.8rem',fontWeight:600}}>↻ Refrescar</button>
          </div>
        </div>
      </div>
      <div style={{background:C.blue,padding:'0 24px'}}>
        <div style={{maxWidth:1280,margin:'0 auto',display:'flex'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:'transparent',border:'none',color:activeTab===t.id?'white':'rgba(255,255,255,0.65)',padding:'14px 20px',cursor:'pointer',fontSize:'0.9rem',fontWeight:activeTab===t.id?700:400,borderBottom:activeTab===t.id?'3px solid white':'3px solid transparent',transition:'all 0.2s'}}>
              {t.label}
              <div style={{fontSize:'0.65rem',marginTop:1,fontWeight:400}}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1280,margin:'0 auto',padding:'24px'}}>
        {activeTab==='observabilidad'&&<ObservabilidadTab stats={stats} loadingStats={loadingStats} serviceHealth={serviceHealth} refreshKey={refreshKey}/>}
        {activeTab==='microservicios'&&(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <MicroserviciosTab/>
            <div style={{ borderTop: `2px dashed ${C.border}`, paddingTop: '40px' }}>
              <SectionTitle>🔗 Gestión de Proveedores Integrados (RDA2)</SectionTitle>
              <ProveedoresTab/>
            </div>
          </div>
        )}
        {activeTab==='gestion'&&<GestionTab users={users} usersError={usersError} onRetryUsers={()=>fetchUsers()} reservas={reservas} loadingUsers={loadingUsers} loadingReservas={loadingReservas} onRefresh={handleRefresh}/>}
        {activeTab==='soporte'&&<SoporteTab/>}
        {activeTab==='auditoria'&&<AuditoriaTab refreshKey={refreshKey}/>}
        {activeTab==='configuracion'&&<ConfiguracionTab/>}
      </div>
    </div>
  );
}
