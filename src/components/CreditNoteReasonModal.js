import React, { useState, useMemo } from 'react';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CreditNoteReasonModal = ({ isOpen, onClose, onConfirm, invoiceItems = [] }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1); // 1 = percentage & items, 2 = reason
    const [percentage, setPercentage] = useState(100);
    const [selectedReason, setSelectedReason] = useState('zrusenie zakazky');

    const reasons = [
        'zrusenie zakazky',
        'reklamacia',
        'nespravna fakturacia',
        'vratenie tovaru',
        'zlava po fakturacii'
    ];

    const adjustedItems = useMemo(() => {
        return invoiceItems.map(item => ({
            ...item,
            returnPrice: Math.abs(item.price || 0) * (percentage / 100)
        }));
    }, [invoiceItems, percentage]);

    const totalToReturn = useMemo(() => {
        return adjustedItems.reduce((sum, item) => sum + item.returnPrice, 0);
    }, [adjustedItems]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedReason, percentage);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {step === 1 ? t('Credit Note') : t('Reason for return')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {step === 1 ? (
                    <>
                        {/* Percentage Input */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('Return percentage')}
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={percentage}
                                    onChange={(e) => setPercentage(Number(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 min-w-[80px]">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={percentage}
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                                            setPercentage(val);
                                        }}
                                        className="w-12 bg-transparent text-right font-bold text-gray-900 dark:text-white outline-none"
                                    />
                                    <span className="text-gray-500 font-bold ml-1">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
                            {adjustedItems.map((item, index) => (
                                <div
                                    key={item.id || index}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {item.title || item.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {Math.abs(item.pieces || 0)} {item.unit || 'ks'} × {Number(Math.abs(item.pricePerPiece || 0)).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 line-through">
                                            {Number(Math.abs(item.price || 0)).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                                        </div>
                                        <div className="text-sm font-bold text-red-600 dark:text-red-400">
                                            -{Number(item.returnPrice).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl mb-6">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('Total to return')}</span>
                            <span className="text-xl font-bold text-red-600 dark:text-red-400">
                                -{Number(totalToReturn).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                            </span>
                        </div>

                        {/* Pagination dots */}
                        <div className="flex justify-center gap-2 mb-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                {t('Cancel')}
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                {t('Next')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Step 2: Reason Selection */}
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

                        {/* Pagination dots */}
                        <div className="flex justify-center gap-2 mb-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {t('Back')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                            >
                                {t('Create')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreditNoteReasonModal;
