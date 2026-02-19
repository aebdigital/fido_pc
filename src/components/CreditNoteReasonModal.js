import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CreditNoteReasonModal = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useLanguage();
    const [selectedReason, setSelectedReason] = useState('zrusenie zakazky');

    const reasons = [
        'zrusenie zakazky',
        'reklamacia',
        'nespravna fakturacia',
        'vratenie tovaru',
        'zlava po fakturacii'
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Reason for return')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-2 mb-8">
                    {reasons.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => setSelectedReason(reason)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${selectedReason === reason
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white'
                                    : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span className="text-lg font-medium">{t(reason)}</span>
                            {selectedReason === reason && <Check className="w-5 h-5 text-blue-500" />}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={() => onConfirm(selectedReason)}
                        className="flex-1 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    >
                        {t('Create')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreditNoteReasonModal;
