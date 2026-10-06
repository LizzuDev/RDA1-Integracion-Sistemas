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
  { id: 'observabilidad', label: '📊 Observabilidad', sub: 'Estado en vivo' },
  { id: 'microservicios', label: '🔬 Servicios & Prov.', sub: 'RDA2 Simulado' },
  { id: 'gestion', label: '🗂️ Gestión', sub: 'Usuarios & Reservas' },
  { id: 'finanzas', label: '💰 Finanzas', sub: 'Pagos & Payouts' },
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

function ObservabilidadTab({stats,loadingStats,serviceHealth}) {
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

function GestionTab({users,reservas,loadingUsers,loadingReservas,onRefresh}) {
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
    catch(e) { alert('Error al ejecutar la acción'); }
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
              {['Email','Rol','Registrado','Acciones'].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:600,color:C.darkBlue}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.id||i} style={{borderTop:`1px solid ${C.border}`}}>
                  <td style={{padding:'9px 14px'}}>{u.email}</td>
                  <td style={{padding:'9px 14px'}}>
                    <span style={{background:u.rol==='admin'?C.blue:C.border,color:u.rol==='admin'?'white':C.text,padding:'2px 8px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{u.rol||'usuario'}</span>
                  </td>
                  <td style={{padding:'9px 14px',color:C.gray}}>{fmtDate(u.created_at)}</td>
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
                    <button onClick={()=>requestConfirm("Enviar Reseteo de Contraseña", `¿Enviar enlace de reseteo a ${u.email}?`, C.orange, ()=>execUserAction(u.id, 'reset_password'))} title="Enviar Reseteo de Contraseña" style={btnStyle}>🔑</button>
                  </td>
                </tr>
              ))}
              {users.length===0&&(<tr><td colSpan={4} style={{padding:24,textAlign:'center',color:C.gray}}>Sin usuarios. Ejecuta el Trigger SQL en Supabase para sincronizar.</td></tr>)}
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

function FinanzasTab() {
  return (
    <div>
      <div style={{ background: '#e8f5e9', border: '1px solid #2e7d32', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>💰</span>
        <span style={{ fontSize: '0.85rem', color: '#2e7d32' }}>
          <strong>Admin Financiero.</strong> Gestión de comisiones, conciliación bancaria y pagos a proveedores (Payouts).
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard icon="💳" label="Cobrado a Clientes" value="$42,500.00" color={C.blue} />
        <KpiCard icon="🏦" label="Payouts Pendientes" value="$36,125.00" color={C.orange} />
        <KpiCard icon="📈" label="Comisiones (Revenue)" value="$6,375.00" color={C.green} />
      </div>

      <SectionTitle>🏦 Liquidaciones Pendientes (Payouts)</SectionTitle>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: C.lightBlue, color: C.darkBlue }}>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Proveedor</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Periodo</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Total Reservas</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Comisión (15%)</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>A Pagar</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {['TravelEcuador Pro', 'HotelHub EC', 'AeroLink Ecuador'].map((p, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p}</td>
                <td style={{ padding: '10px 14px' }}>Sept 1 - Sept 15</td>
                <td style={{ padding: '10px 14px' }}>$5,000.00</td>
                <td style={{ padding: '10px 14px', color: C.red }}>-$750.00</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>$4,250.00</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button style={{ background: C.green, color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Aprobar Payout</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function AuditoriaTab() {
  return (
    <div>
      <div style={{ background: '#ffebee', border: '1px solid #d32f2f', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>🛡️</span>
        <span style={{ fontSize: '0.85rem', color: '#d32f2f' }}>
          <strong>Registro de Auditoría (Audit Trail).</strong> Historial inmutable de acciones críticas ejecutadas por el equipo de administración. Cumplimiento de seguridad.
        </span>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: C.bg, color: C.text }}>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Fecha y Hora</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Administrador</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Acción</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Entidad Afectada</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>IP Origen</th>
            </tr>
          </thead>
          <tbody>
            {[
              { time: 'Hace 5 min', admin: 'admin_principal@booking.ec', action: 'Aprobó Payout', target: 'TravelEcuador Pro', ip: '192.168.1.45' },
              { time: 'Hace 32 min', admin: 'soporte_maria@booking.ec', action: 'Canceló Reserva', target: 'PNR: ABC12', ip: '192.168.1.112' },
              { time: 'Hace 2 horas', admin: 'sysadmin@booking.ec', action: 'Modificó Ajuste Global', target: 'Comisión Base (Cambio: 10% -> 15%)', ip: '200.10.20.5' },
              { time: 'Hace 5 horas', admin: 'qc_team@booking.ec', action: 'Aprobó Proveedor', target: 'RentAuto Ecuador', ip: '192.168.1.88' },
            ].map((log, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 14px', color: C.gray }}>{log.time}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: C.darkBlue }}>{log.admin}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: C.lightBlue, padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{log.action}</span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{log.target}</td>
                <td style={{ padding: '10px 14px', color: C.gray, fontSize: '0.8rem' }}>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfiguracionTab() {
  return (
    <div>
      <div style={{ background: '#f5f5f5', border: `1px solid ${C.gray}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
        <span style={{ fontSize: '0.85rem', color: C.text }}>
          <strong>Ajustes Globales del Sistema.</strong> Configuración central del comportamiento de la plataforma Booking Ecuador.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Panel Finanzas Globales */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px' }}>
          <SectionTitle badge="Global">Finanzas y Comisiones</SectionTitle>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Comisión Base de la Plataforma (%)</label>
            <input type="number" defaultValue={15} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}` }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Tasa de Impuestos (IVA %)</label>
            <input type="number" defaultValue={15} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}` }} />
          </div>
          <button style={{ background: C.blue, color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Guardar Cambios</button>
        </div>

        {/* Panel Integraciones */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px' }}>
          <SectionTitle badge="APIs">Pasarelas y Servicios</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontWeight: 700 }}>Stripe Payments</div>
              <div style={{ fontSize: '0.8rem', color: C.gray }}>Modo de pruebas (Test Mode)</div>
            </div>
            <input type="checkbox" defaultChecked style={{ transform: 'scale(1.5)', accentColor: C.green }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontWeight: 700 }}>Envío de Emails (Resend/SendGrid)</div>
              <div style={{ fontSize: '0.8rem', color: C.gray }}>Envío de comprobantes automático</div>
            </div>
            <input type="checkbox" defaultChecked style={{ transform: 'scale(1.5)', accentColor: C.green }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.red }}>Modo Mantenimiento</div>
              <div style={{ fontSize: '0.8rem', color: C.gray }}>Bloquea el acceso público a toda la plataforma</div>
            </div>
            <input type="checkbox" style={{ transform: 'scale(1.5)', accentColor: C.red }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [activeTab,setActiveTab]=useState('observabilidad');
  const [stats,setStats]=useState(null);
  const [users,setUsers]=useState([]);
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
    try{const{data}=await api.get('/admin/users');setUsers(Array.isArray(data)?data:[]);}
    catch{setUsers([]);}
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
    fetchStats(true);checkServices();
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
        {activeTab==='observabilidad'&&<ObservabilidadTab stats={stats} loadingStats={loadingStats} serviceHealth={serviceHealth}/>}
        {activeTab==='microservicios'&&(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <MicroserviciosTab/>
            <div style={{ borderTop: `2px dashed ${C.border}`, paddingTop: '40px' }}>
              <SectionTitle>🔗 Gestión de Proveedores Integrados (RDA2)</SectionTitle>
              <ProveedoresTab/>
            </div>
          </div>
        )}
        {activeTab==='gestion'&&<GestionTab users={users} reservas={reservas} loadingUsers={loadingUsers} loadingReservas={loadingReservas} onRefresh={handleRefresh}/>}
        {activeTab==='finanzas'&&<FinanzasTab/>}
        {activeTab==='soporte'&&<SoporteTab/>}
        {activeTab==='auditoria'&&<AuditoriaTab/>}
        {activeTab==='configuracion'&&<ConfiguracionTab/>}
      </div>
    </div>
  );
}
