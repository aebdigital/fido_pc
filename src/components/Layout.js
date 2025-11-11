import React from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, FileText, Users, Settings, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigationBlocker } from '../context/NavigationBlockerContext';
import UnsavedChangesModal from './UnsavedChangesModal';
import { useNavigate } from 'react-router-dom';
import logo from '../logo.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, language, toggleLanguage } = useLanguage();
  const { 
    attemptNavigation, 
    showModal, 
    handleSaveAndProceed, 
    handleDiscardAndProceed, 
    handleCancel 
  } = useNavigationBlocker();

  const menuItems = [
    { path: '/projects', name: t('Projekty'), icon: ClipboardList },
    { path: '/invoices', name: t('Faktúry'), icon: FileText },
    { path: '/clients', name: t('Klienti'), icon: Users },
    { path: '/settings', name: t('Nastavenia'), icon: Settings }
  ];

  const handleNavigation = (path, e) => {
    e.preventDefault();
    if (attemptNavigation(path)) {
      navigate(path);
    }
  };

  const onSaveAndProceedWrapper = () => {
    const path = handleSaveAndProceed();
    if (path) {
      navigate(path);
    }
  };

  const onDiscardAndProceedWrapper = () => {
    const path = handleDiscardAndProceed();
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-center">
          <img src={logo} alt="Fido Logo" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 py-4">
          {menuItems.map(item => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavigation(item.path, e)}
              className={`flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200 border-l-3 cursor-pointer ${
                location.pathname === item.path
                  ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-white border-l-blue-600 dark:border-l-white shadow-sm'
                  : 'border-l-transparent hover:shadow-sm'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium text-lg">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* Theme and Language Toggles */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-center">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 relative shadow-sm hover:shadow-md"
          >
            <div className={`absolute inset-1 rounded-full bg-white dark:bg-gray-900 transition-all duration-200 flex items-center justify-center ${isDarkMode ? 'shadow-inner' : 'shadow-md'}`}>
              {isDarkMode ? (
                <Moon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="w-8 h-8 text-gray-700" />
              )}
            </div>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 relative shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-md transition-all duration-200">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {language === 'en' ? '🇺🇸' : '🇸🇰'}
              </span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 h-16 flex justify-between items-center">
        </div>
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          {children}
        </div>
      </div>

      {/* Global Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showModal}
        onSaveAndProceed={onSaveAndProceedWrapper}
        onDiscardAndProceed={onDiscardAndProceedWrapper}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default Layout;