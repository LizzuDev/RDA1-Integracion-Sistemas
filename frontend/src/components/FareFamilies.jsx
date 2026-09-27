import { useState } from 'react';
import { formatearMoneda } from '../services/formato';

const CLASES_ES = {
  ECONOMY: 'Económica',
  PREMIUM_ECONOMY: 'Premium',
  BUSINESS: 'Ejecutiva',
  FIRST: 'Primera',
};

// Mapeo visual de nuestras tarifas a la estética del mockup (sin usar Magenta, usando colores propios)
const TARIFA_THEMES = {
  ECONOMY: {
    titleColor: '#003087',
    headerBg: 'transparent',
    bgColor: '#ffffff',
    border: '1px solid #cbd5e1',
    buttonBg: '#e2e8f0',
    buttonColor: '#0f172a',
    buttonHover: '#cbd5e1',
    isDark: false
  },
  PREMIUM_ECONOMY: {
    titleColor: '#0369a1',
    headerBg: 'transparent',
    bgColor: '#f0f9ff',
    border: '2px solid #0284c7', // Highlighted
    buttonBg: '#0284c7',
    buttonColor: '#ffffff',
    buttonHover: '#0369a1',
    isDark: false,
    badge: 'Recomendada'
  },
  BUSINESS: {
    titleColor: '#ffffff',
    headerBg: 'transparent',
    bgColor: '#111827',
    border: '1px solid #1f2937',
    buttonBg: '#374151',
    buttonColor: '#ffffff',
    buttonHover: '#4b5563',
    isDark: true
  },
  FIRST: {
    titleColor: '#ffffff',
    headerBg: 'transparent',
    bgColor: '#0f172a',
    border: '1px solid #1e293b',
    buttonBg: '#eab308',
    buttonColor: '#111827',
    buttonHover: '#ca8a04',
    isDark: true
  }
};

export function FareFamilies({ ofertas, onSeleccionarTarifa }) {
  // Ofertas es un array de objetos FlightOffer para el MISMO itinerario.
  // Las ordenamos por precio de menor a mayor.
  const ofertasOrdenadas = [...ofertas].sort((a, b) => 
    Number(a.grandTotal?.total) - Number(b.grandTotal?.total)
  );

  return (
    <div className="fare-families-container">
      <div className="fare-families-header">
        <div className="fare-tabs">
          <button className="fare-tab active">Todas las Clases</button>
        </div>
      </div>
      
      <div className="fare-cards-grid">
        {(ofertasOrdenadas[0]?.itineraries?.[0]?.pricingOptions || []).map((tarifa, idx) => {
            const clase = tarifa.cabinClass || 'ECONOMY';
            const oferta = ofertasOrdenadas[0];
          const theme = TARIFA_THEMES[clase] || TARIFA_THEMES.ECONOMY;
          const claseNombre = CLASES_ES[clase] || clase;

          return (
            <div 
              key={oferta.offerId + "-" + idx} 
              className={`fare-card ${theme.isDark ? 'fare-card-dark' : 'fare-card-light'}`}
              style={{
                backgroundColor: theme.bgColor,
                border: theme.border
              }}
            >
              {theme.badge && (
                <div className="fare-card-badge">{theme.badge}</div>
              )}
              
              <div className="fare-card-title" style={{ color: theme.titleColor }}>
                {claseNombre}
              </div>

              <ul className="fare-card-benefits">
                <li>💺 Asiento {claseNombre}</li>
                <li>
                  {tarifa.fareRules?.isRefundable ? '✔️ Reembolsable' : '❌ No reembolsable'}
                </li>
                <li>
                  {tarifa.fareRules?.isChangeable ? '✔️ Modificable' : '❌ No modificable'}
                </li>
                {typeof tarifa.baggageAllowance?.checkedBaggageIncluded === 'number' && (
                  <li>
                    💼 {tarifa.baggageAllowance.checkedBaggageIncluded} equipaje(s) de bodega
                  </li>
                )}
                <li>🎒 1 artículo personal</li>
              </ul>

              <div className="fare-card-action">
                <button 
                  className="fare-card-btn"
                  style={{
                    backgroundColor: theme.buttonBg,
                    color: theme.buttonColor
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeleccionarTarifa(oferta, tarifa);
                  }}
                >
                  <span className="fare-card-price">
                    {formatearMoneda(tarifa.pricePerPassengerType?.[0]?.price?.total || 0, 'USD')}
                  </span>
                  <span className="fare-card-price-sub">Precio por pasajero</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
