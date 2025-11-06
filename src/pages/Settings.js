import React, { useState } from 'react';
import { 
  Wrench, 
  Settings as SettingsIcon, 
  Send, 
  ChevronRight,
  Edit
} from 'lucide-react';
import PriceList from './PriceList';

const Settings = () => {
  const [showPriceList, setShowPriceList] = useState(false);

  const handlePriceListClick = () => {
    setShowPriceList(true);
  };

  const handleBackFromPriceList = () => {
    setShowPriceList(false);
  };

  if (showPriceList) {
    return <PriceList onBack={handleBackFromPriceList} />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Access Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access</h2>
        </div>
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium text-gray-900 dark:text-white">customer@email.com</span>
                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Restricted Access</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Customise prices in the entire app and export projects to PDF. Try Pro For Free!</div>
              <button className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-2 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Try Pro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Archive</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">archived projects, archive duration</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Price offer</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">supplier information, validity of price offer</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div 
            className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={handlePriceListClick}
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-white">General price list</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">set default price list</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

        </div>
      </div>

      {/* Others Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Others</h2>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">Tutorial</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">Contact</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">Terms of Use</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">Privacy Policy</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="font-medium text-gray-900 dark:text-white">Restore Purchases</div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-gray-500 dark:text-gray-400 space-y-1">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Fido Building Calculator</div>
        <div className="text-sm">v1.4.7</div>
        <div className="text-xs">©Fido, s.r.o. All rights reserved.</div>
      </div>
    </div>
  );
};

export default Settings;