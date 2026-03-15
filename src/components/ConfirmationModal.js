import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    isDestructive = false,
    icon = 'warning', // 'warning' or 'info'
    showCancel = true
}) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[25px] shadow-2xl overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDestructive
                        ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        {React.isValidElement(icon) ? (
                            icon
                        ) : icon === 'warning' || isDestructive ? (
                            <AlertTriangle
                                className={`w-8 h-8 ${isDestructive ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}
                                strokeWidth={2.5}
                            />
                        ) : (
                            <AlertCircle className="w-8 h-8 text-blue-500 dark:text-blue-400" strokeWidth={2.5} />
                        )}
                    </div>

                    {/* Text */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                        {t(title)}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed">
                        {t(message)}
                    </p>

                    {/* Actions */}
                    <div className={`grid ${showCancel ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full mt-6`}>
                        {showCancel && (
                            <button
                                onClick={onClose}
                                className="py-3 px-4 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {t(cancelLabel || 'Cancel')}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`py-3 px-4 rounded-xl font-semibold text-white transition-colors ${isDestructive
                                ? 'btn-red destructive-btn hover:bg-red-600'
                                : 'bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                                }`}
                            style={{ backgroundColor: isDestructive ? '#ef4444' : undefined }}
                        >
                            {t(confirmLabel || 'Confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
