import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const UncompletedFieldsModal = ({ isOpen, onClose, onContinue, missingFields }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 relative animate-slide-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('Incomplete Information')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('Some required fields are missing for the invoice:')}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left max-h-48 overflow-y-auto">
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {missingFields.map((field, index) => (
              <li key={index}>{t(field)}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('Fill in missing fields')}
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('Generate anyway')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UncompletedFieldsModal;
