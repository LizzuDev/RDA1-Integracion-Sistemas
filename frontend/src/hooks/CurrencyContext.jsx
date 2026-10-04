import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const exchangeRates = {
  USD: 1,
  EUR: 0.95,
  COP: 4100,
  CLP: 950,
  MXN: 20,
  ARS: 1000,
  GBP: 0.79
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const saved = localStorage.getItem('booking_currency');
    if (saved && exchangeRates[saved]) {
      setCurrency(saved);
    }
  }, []);

  const changeCurrency = (newCurrency) => {
    if (exchangeRates[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem('booking_currency', newCurrency);
      window.location.reload();
    }
  };

  const convertPrice = (priceInUSD) => {
    const rate = exchangeRates[currency] || 1;
    const value = parseFloat(priceInUSD) * rate;
    
    // Formatting based on currency
    if (['COP', 'CLP', 'ARS'].includes(currency)) {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
