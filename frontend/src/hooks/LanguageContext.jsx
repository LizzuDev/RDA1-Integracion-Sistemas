import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const languages = [
  { code: 'en-gb', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-us', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ar', name: 'Español (AR)', flag: '🇦🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es-ec', name: 'Español', flag: '🇪🇨' },
  { code: 'es-mx', name: 'Español (MX)', flag: '🇲🇽' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-pt', name: 'Português (PT)', flag: '🇵🇹' },
  { code: 'pt-br', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'zh-cn', name: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
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
    }
  };

  const currentLanguage = languages.find(l => l.code === language) || languages[5];

  return (
    <LanguageContext.Provider value={{ language, currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
