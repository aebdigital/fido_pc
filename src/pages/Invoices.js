import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';

const Invoices = () => {
  const { t } = useLanguage();
  const { contractors, activeContractorId } = useAppData();
  const [selectedTime, setSelectedTime] = useState(t('Any Time'));
  const [selectedStatus, setSelectedStatus] = useState(t('All'));

  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };

  const timeFilters = [t('Any Time')];
  const statusFilters = [t('All'), t('Paid'), t('Unpaid'), t('After M')];

  return (
    <div className="pb-20 lg:pb-0">
      <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('Invoices')}</h1>
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg lg:text-xl font-medium text-gray-900 dark:text-white">
            {getCurrentContractor()?.name || t('No contractor selected')}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      </div>

      <div className="mb-6 lg:mb-8 min-w-0 w-full">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 min-w-0">
          {timeFilters.map(filter => (
            <button
              key={filter}
              className={`px-4 py-2 lg:py-3 border-2 rounded-full text-sm lg:text-base font-medium transition-all flex-shrink-0 shadow-sm hover:shadow-md ${
                selectedTime === filter 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => setSelectedTime(filter)}
            >
              {filter} ◇
            </button>
          ))}
          {statusFilters.map(filter => (
            <button
              key={filter}
              className={`px-4 py-2 lg:py-3 border-2 rounded-full text-sm lg:text-base font-medium transition-all flex-shrink-0 shadow-sm hover:shadow-md ${
                selectedStatus === filter 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => setSelectedStatus(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center min-h-96 text-center px-4">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-sm">
          <h2 className="text-lg lg:text-xl font-medium text-gray-600 dark:text-gray-400 leading-relaxed">{t('There is no Invoice for selected Contractor.')}</h2>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Invoices;