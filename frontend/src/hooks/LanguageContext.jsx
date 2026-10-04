import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const languages = [
  { code: 'en-gb', name: 'English (UK)', countryCode: 'gb' },
  { code: 'en-us', name: 'English (US)', countryCode: 'us' },
  { code: 'es-ar', name: 'Español (AR)', countryCode: 'ar' },
  { code: 'de', name: 'Deutsch', countryCode: 'de' },
  { code: 'fr', name: 'Français', countryCode: 'fr' },
  { code: 'es-ec', name: 'Español', countryCode: 'ec' },
  { code: 'es-mx', name: 'Español (MX)', countryCode: 'mx' },
  { code: 'it', name: 'Italiano', countryCode: 'it' },
  { code: 'pt-pt', name: 'Português (PT)', countryCode: 'pt' },
  { code: 'pt-br', name: 'Português (BR)', countryCode: 'br' },
  { code: 'zh-cn', name: '简体中文', countryCode: 'cn' },
  { code: 'ja', name: '日本語', countryCode: 'jp' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('es-ec'); // Default to Ecuador Spanish

  useEffect(() => {
    const saved = localStorage.getItem('booking_language');
    if (saved && languages.find(l => l.code === saved)) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (newLangCode) => {
    if (languages.find(l => l.code === newLangCode)) {
      setLanguage(newLangCode);
      localStorage.setItem('booking_language', newLangCode);
      window.location.reload();
    }
  };

  const currentLanguage = languages.find(l => l.code === language) || languages[5];

  // Basic translation dictionary for Header/Footer to demonstrate functionality
  const translations = {
    'es-ec': {
      'nav.stays': 'Hospedajes',
      'nav.flights': 'Vuelos',
      'nav.cars': 'Renta de autos',
      'nav.attractions': 'Atracciones',
      'nav.register': 'Regístrate',
      'nav.login': 'Iniciar sesión',
      'nav.my_bookings': 'Mis reservas',
      'nav.edit_account': 'Editar cuenta',
      'nav.logout': 'Cerrar sesión',
      'footer.privacy': 'Política de Privacidad',
      'footer.terms': 'Términos de Uso',
      'footer.cookies': 'Preferencias de cookies',
    },
    'en-us': {
      'nav.stays': 'Stays',
      'nav.flights': 'Flights',
      'nav.cars': 'Car rentals',
      'nav.attractions': 'Attractions',
      'nav.register': 'Register',
      'nav.login': 'Sign in',
      'nav.my_bookings': 'My bookings',
      'nav.edit_account': 'Edit account',
      'nav.logout': 'Sign out',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.cookies': 'Cookie preferences',
    }
  };

  // Fallback to english if not spanish
  const langGroup = language.startsWith('es') ? 'es-ec' : 'en-us';
  
  const t = (key) => {
    return translations[langGroup]?.[key] || translations['es-ec'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
