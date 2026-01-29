import React from 'react';
import { X, Sun, Moon, Globe } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { useLanguage } from '../context/LanguageContext';
import { useScrollLock } from '../hooks/useScrollLock';

const ThemeLanguageModal = ({ isOpen, onClose }) => {
  useScrollLock(true);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { language, toggleLanguage, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('Settings')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {t('Appearance')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!isDarkMode
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
              >
                <Sun className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Light
                </span>
              </button>
              <button
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isDarkMode
                  ? 'border-gray-900 dark:border-white bg-gray-800'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <Moon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Dark
                </span>
              </button>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Language / Jazyk
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => language !== 'en' && toggleLanguage()}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${language === 'en'
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
              >
                <span className="text-3xl">🇺🇸</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  English
                </span>
              </button>
              <button
                onClick={() => language !== 'sk' && toggleLanguage()}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${language === 'sk'
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
              >
                <span className="text-3xl">🇸🇰</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Slovenčina
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeLanguageModal;