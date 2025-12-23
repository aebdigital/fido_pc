import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, FileText, Users, Settings, LogOut } from 'lucide-react';
import { useNavigationBlocker } from '../context/NavigationBlockerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import UnsavedChangesModal from './UnsavedChangesModal';
import { useNavigate } from 'react-router-dom';
import logo from '../logo.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signOut, user } = useAuth();
  const {
    attemptNavigation,
    showModal,
    handleSaveAndProceed,
    handleDiscardAndProceed,
    handleCancel
  } = useNavigationBlocker();

  // Mobile navigation auto-hide state
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll detection for mobile navigation auto-hide
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 1024) return; // Only on mobile

      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold - hide navigation
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navigation
        setIsNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const menuItems = [
    { path: '/projects', name: t('Projects'), icon: ClipboardList },
    { path: '/invoices', name: t('Invoices'), icon: FileText },
    { path: '/clients', name: t('Clients'), icon: Users },
    { path: '/settings', name: t('Settings'), icon: Settings }
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
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="text-lg font-medium">{item.name}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* Account Section at bottom */}
        <div className="p-2.5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 group"
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Sign Out')}
                </p>
              </div>
            </div>
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </button>
        </div>
      </div>



      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        <div className="flex-1 overflow-y-auto lg:pt-0 pb-24 lg:pb-0 bg-white dark:bg-gray-900">
          <div className="pl-4 pr-4 pt-4 pb-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className={`lg:hidden fixed bottom-4 left-4 right-4 z-40 transition-transform duration-300 ${
        isNavVisible ? 'translate-y-0' : 'translate-y-[calc(100%+16px)]'
      }`}>
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-[2rem] border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex justify-around">
            {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleNavigation(item.path, e)}
                  className={`flex flex-col items-center px-1.5 py-0.5 m-0.5 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? '' // No background for active item
                      : ''
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 mb-0.5 ${ // Smaller icon size
                      isActive
                        ? 'text-blue-500 dark:text-blue-400' // Active icon color
                        : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isActive
                        ? 'text-blue-500 dark:text-blue-400' // Active text color
                        : 'text-gray-400'
                    }`}
                  >
                    {item.name}
                  </span>
                </a>
              );
            })}
          </div>
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