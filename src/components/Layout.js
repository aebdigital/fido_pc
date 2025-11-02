import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, FileText, Users, Settings, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import logo from '../logo.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const menuItems = [
    { path: '/projects', name: 'Projects', icon: ClipboardList },
    { path: '/invoices', name: 'Invoices', icon: FileText },
    { path: '/clients', name: 'Clients', icon: Users },
    { path: '/settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-center">
          <img src={logo} alt="Fido Logo" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 py-4">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200 border-l-3 ${
                location.pathname === item.path
                  ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-white border-l-blue-600 dark:border-l-white'
                  : 'border-l-transparent'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium text-base">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Dark Mode Toggle */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-white">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-gray-700" />
                <span className="font-medium text-gray-900">Dark Mode</span>
              </>
            )}
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
    </div>
  );
};

export default Layout;