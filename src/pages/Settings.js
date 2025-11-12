import React, { useState } from 'react';
import { 
  Wrench, 
  Settings as SettingsIcon, 
  Send, 
  ChevronRight,
  Edit
} from 'lucide-react';
import PriceList from './PriceList';
import Archive from './Archive';
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const { t } = useLanguage();
  const [showPriceList, setShowPriceList] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

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

  return (
    <div className="pb-20 lg:pb-0">
      <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-8">{t('Settings')}</h1>

      {/* Access Section */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Access')}</h2>
        </div>
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3 mb-2">
                <span className="font-medium text-gray-900 dark:text-white text-lg">customer@email.com</span>
                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white self-start sm:self-auto">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <div className="text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-1">{t('Restricted Access')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{t('Customise prices in the entire app and export projects to PDF. Try Pro For Free!')}</div>
              <button className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md text-lg">
                {t('Try Pro')}
              </button>
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
              <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Archive')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('archived projects, archive duration')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Price offer')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('supplier information, validity of price offer')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>

          <div 
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            onClick={handlePriceListClick}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white text-lg">{t('General price list')}</div>
              <div className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('set default price list')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
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
            <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Tutorial')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Contact')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Terms of Use')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Privacy Policy')}</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
            <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Restore Purchases')}</div>
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
    </div>
  );
};

export default Settings;