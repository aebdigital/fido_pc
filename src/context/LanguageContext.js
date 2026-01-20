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

  // Slovak plural helper: handles 1 (singular), 2-4 (few), 5+ (many)
  // Usage: tPlural(count, 'work', 'works', 'works_many')
  // In Slovak: práca (1), práce (2-4), prác (5+)
  // In English: work (1), works (2+)
  const tPlural = (count, singularKey, fewKey, manyKey) => {
    if (language === 'en') {
      // English: just singular vs plural
      return count === 1 ? getTranslation(singularKey, language) : getTranslation(fewKey, language);
    }
    // Slovak pluralization rules
    if (count === 1) {
      return getTranslation(singularKey, language);
    } else if (count >= 2 && count <= 4) {
      return getTranslation(fewKey, language);
    } else {
      return getTranslation(manyKey || fewKey, language);
    }
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      toggleLanguage,
      t,
      tPlural,
      isEnglish: language === 'en',
      isSlovak: language === 'sk'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};