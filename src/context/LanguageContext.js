import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from '../translations/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'sk'; // Default to Slovak
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'sk' ? 'en' : 'sk');
  };

  const t = (key) => {
    return getTranslation(key, language);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      toggleLanguage, 
      t,
      isEnglish: language === 'en',
      isSlovak: language === 'sk'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};