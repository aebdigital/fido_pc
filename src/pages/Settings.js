import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wrench,
  Settings as SettingsIcon,
  Send,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  LogOut
} from 'lucide-react';
import PriceList from './PriceList';
import Archive from './Archive';
import PriceOfferSettings from './PriceOfferSettings';
import PaywallModal from '../components/PaywallModal';
import { useLanguage } from '../context/LanguageContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const Settings = () => {
  const location = useLocation();
  const { t, language, toggleLanguage } = useLanguage();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { signOut, user } = useAuth(); // Add user
  const { isPro } = useAppData(); // Add Pro context

  const [showPriceList, setShowPriceList] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showPriceOffer, setShowPriceOffer] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Handle navigation reset when clicking on Settings in navigation
  useEffect(() => {
    if (location.state?.reset) {
      // Reset to default view when clicking Settings nav item
      setShowPriceList(false);
      setShowArchive(false);
      setShowPriceOffer(false);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.reset, location.state?.timestamp]);

  const handlePriceListClick = () => {
    setShowPriceList(true);
  };

  const handleBackFromPriceList = () => {
    setShowPriceList(false);
  };

  const handleArchiveClick = () => {
    setShowArchive(true);
  };

  const handleBackFromArchive = () => {
    setShowArchive(false);
  };

  const handlePriceOfferClick = () => {
    setShowPriceOffer(true);
  };

  const handleBackFromPriceOffer = () => {
    setShowPriceOffer(false);
  };

  const handleContactClick = () => {
    window.open('mailto:fidopo@gmail.com', '_blank');
  };

  const handleTermsClick = () => {
    window.open('https://fido.sk', '_blank');
  };

  const handlePrivacyClick = () => {
    window.open('https://fido.sk', '_blank');
  };

  const handleTryPro = () => {
    setShowPaywall(true);
  };


  if (showPriceList) {
    return (
      <PriceList
        onBack={handleBackFromPriceList}
      />
    );
  }

  if (showArchive) {
    return (
      <Archive
        onBack={handleBackFromArchive}
      />
    );
  }

  if (showPriceOffer) {
    return (
      <PriceOfferSettings
        onBack={handleBackFromPriceOffer}
      />
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      <h1 className="block text-4xl font-bold text-gray-900 dark:text-white mb-8">{t('Settings')}</h1>

      {/* Access Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Access')}</h2>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white text-lg">{user?.email || 'customer@email.com'}</span>
                {isPro && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">{t('PRO ACTIVE')}</span>}
              </div>

              {isPro ? (
                <div className="text-base lg:text-lg text-green-600 mb-1">{t('You have full access to all features.')}</div>
              ) : (
                <>
                  <div className="text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-1">{t('Restricted Access')}</div>
                  <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{t('Customise prices in the entire app and export projects to PDF. Try Pro For Free!')}</div>
                </>
              )}

              <div className="flex gap-3 mt-4">
                {!isPro && (
                  <button
                    onClick={handleTryPro}
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-3 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md text-lg flex items-center gap-2"
                  >
                    {t('Get Pro')}
                  </button>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Preferences')}</h2>
        </div>
        <div className="space-y-3 lg:space-y-4">
          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handleArchiveClick}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Archive')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('archived projects, archive duration')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>

          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handlePriceOfferClick}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Supplier')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('supplier information, validity of price offer')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>

          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handlePriceListClick}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('General price list')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('set default price list')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>

          {/* Dark Mode Toggle */}
          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={toggleDarkMode}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
              <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Dark Mode')}</div>
            </div>
            <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Language Toggle */}
          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={toggleLanguage}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Language')}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base text-gray-600 dark:text-gray-400">
                {language === 'en' ? 'English 🇺🇸' : 'Slovenčina 🇸🇰'}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>

          {/* Sign Out - Mobile only */}
          <div
            className="lg:hidden bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={signOut}
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div className="font-semibold text-red-600 dark:text-red-400 text-lg">{t('Sign Out')}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Others Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h2>
        </div>
        <div className="space-y-3 lg:space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Tutorial')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handleContactClick}
          >
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Contact')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handleTermsClick}
          >
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Terms of Use')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handlePrivacyClick}
          >
            <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Privacy Policy')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-gray-500 dark:text-gray-400 space-y-2 px-4">
        <div className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Fido Building Calculator')}</div>
        <div className="text-base lg:text-lg">v1.4.7</div>
        <div className="text-sm lg:text-base leading-relaxed">©Fido, s.r.o. {t('All rights reserved')}.</div>
      </div>

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
};

export default Settings;