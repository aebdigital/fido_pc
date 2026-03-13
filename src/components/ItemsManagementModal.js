import React, { useMemo, useState } from 'react';
import { X, Trash2, Package, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { useScrollLock } from '../hooks/useScrollLock';

const ItemsManagementModal = ({ isOpen, onClose }) => {
    useScrollLock(true);
    const { t } = useLanguage();
    const { invoices, activeContractorId, priceOfferSettings, updatePriceOfferSettings } = useAppData();
    const [searchQuery, setSearchQuery] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);

    const hiddenItems = useMemo(() => {
        return priceOfferSettings?.hiddenAutocompleteItems || [];
    }, [priceOfferSettings]);

    // Extract all unique item titles from contractor's invoices, excluding already hidden
    const allHistoryItems = useMemo(() => {
        if (!invoices || !activeContractorId) return [];

        const itemMap = new Map();

        const contractorInvoices = invoices.filter(inv => inv.contractorId === activeContractorId);

        contractorInvoices.forEach(inv => {
            if (inv.invoiceItems && Array.isArray(inv.invoiceItems)) {
                inv.invoiceItems.forEach(item => {
                    if (item.title) {
                        const title = item.title.trim();
                        const key = title.toLowerCase();
                        // Skip already hidden items
                        if (!hiddenItems.some(h => h.toLowerCase() === key)) {
                            if (!itemMap.has(key)) {
                                itemMap.set(key, {
                                    title,
                                    unit: item.unit || 'ks',
                                    price: parseFloat(item.pricePerPiece || 0),
                                    category: item.category || 'work'
                                });
                            }
                        }
                    }
                });
            }
        });

        return Array.from(itemMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [invoices, activeContractorId, hiddenItems]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return allHistoryItems;
        const q = searchQuery.toLowerCase();
        return allHistoryItems.filter(item => item.title.toLowerCase().includes(q));
    }, [allHistoryItems, searchQuery]);

    const handleDeleteItem = async (title) => {
        const currentHidden = priceOfferSettings?.hiddenAutocompleteItems || [];
        if (!currentHidden.some(h => h.toLowerCase() === title.toLowerCase())) {
            await updatePriceOfferSettings({
                hiddenAutocompleteItems: [...currentHidden, title]
            });
        }
    };

    const getCategoryColorClass = (category) => {
        if (category === 'work') return 'text-blue-600';
        if (category === 'material') return 'text-green-600';
        return 'text-gray-500';
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

                <div className="bg-white dark:bg-gray-900 no-gradient w-full sm:max-w-2xl rounded-t-[25px] sm:rounded-[25px] shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden relative animate-slide-in-bottom sm:animate-slide-in">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-[10px] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/25 no-gradient flex items-center justify-center">
                                <Package className="w-[22px] h-[22px] text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-[20px] font-bold text-[#111827] dark:text-white">{t('Items')}</h2>
                                <p className="text-[13px] text-[#6B7280] dark:text-gray-400">{t('Manage saved autocomplete items')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="modal-close-btn" aria-label="Close">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-5 pb-[10px]">
                        <div className="relative">
                            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('Search items...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-[10px] bg-[#F3F4F6] dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-[10px] text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5">
                        {filteredItems.length > 0 ? (
                            <div className="space-y-2">
                                {filteredItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-[14px] bg-white dark:bg-gray-900 no-gradient border border-black/15 dark:border-white/10 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h3 className="text-base font-semibold text-[#111827] dark:text-white truncate">{item.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-medium px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 rounded-md uppercase">
                                                    {item.unit}
                                                </span>
                                                <span className={`text-xs font-medium capitalize ${getCategoryColorClass(item.category)}`}>
                                                    {item.category}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setItemToDelete(item.title)}
                                            className="w-9 h-9 bg-red-500 text-white hover:bg-red-600 rounded-[10px] transition-colors flex items-center justify-center"
                                            title={t('Delete')}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-[#F3F4F6] dark:bg-gray-800 no-gradient flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-medium text-[#111827] dark:text-white">{t('No items found')}</h3>
                                <p className="text-sm text-[#6B7280] dark:text-gray-400 max-w-xs mt-1">
                                    {searchQuery ? t('Try a different search term') : t('Start by adding items to your invoices')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!!itemToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div
                        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[25px] shadow-2xl overflow-hidden flex flex-col animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                                <Trash2 className="w-8 h-8" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                                {t('Delete')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">"{itemToDelete}"</span>
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full mt-6">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="py-3 px-4 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={() => {
                                        handleDeleteItem(itemToDelete);
                                        setItemToDelete(null);
                                    }}
                                    className="py-3 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    {t('Delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ItemsManagementModal;
