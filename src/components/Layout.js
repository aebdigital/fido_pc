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
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <img src={logo} alt="Fido Logo" className="h-12 w-auto" />
        </div>
        
        {/* Desktop Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map(item => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleNavigation(item.path, e)}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:shadow-sm'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="text-lg font-medium">{item.name}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile Header - Visible only on Mobile */}
      <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 h-16 flex items-center justify-between fixed top-0 left-0 right-0 z-40">
        <img src={logo} alt="Fido Logo" className="h-10 w-auto" />
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Sun className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {language === 'en' ? '🇺🇸' : '🇸🇰'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Desktop Top Bar - Hidden on Mobile */}
        <div className="hidden lg:block h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="h-full flex items-center justify-end px-6">
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {language === 'en' ? '🇺🇸' : '🇸🇰'}
                </span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 py-2 z-40">
        <div className="flex justify-around">
          {menuItems.map(item => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavigation(item.path, e)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:shadow-sm'
              }`}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </a>
          ))}
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