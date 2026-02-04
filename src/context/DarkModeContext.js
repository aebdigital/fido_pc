import React, { createContext, useContext, useState, useLayoutEffect } from 'react';

const DarkModeContext = createContext();

// Apply dark mode class immediately on page load (before React renders)
const applyDarkModeClass = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Get initial dark mode value and apply class immediately
const getInitialDarkMode = () => {
  const saved = localStorage.getItem('darkMode');
  const isDark = saved ? JSON.parse(saved) : false;
  // Apply immediately before first render
  applyDarkModeClass(isDark);
  return isDark;
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  // Use layoutEffect to apply changes synchronously before paint
  useLayoutEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    applyDarkModeClass(isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, darkMode: isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
