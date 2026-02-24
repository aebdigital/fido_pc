import React, { useMemo, useState } from 'react';
import { X, Trash2, RotateCcw, Package, Search, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { useScrollLock } from '../hooks/useScrollLock';

const ItemsManagementModal = ({ isOpen, onClose }) => {
    useScrollLock(true);
    const { t } = useLanguage();
    const { invoices, activeContractorId, priceOfferSettings, updatePriceOfferSettings } = useAppData();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'hidden'

    // Extract all unique item titles from contractor's invoices
    const allHistoryItems = useMemo(() => {
        if (!invoices || !activeContractorId) return [];

        const itemMap = new Map();

        // Filter invoices for the active contractor
        const contractorInvoices = invoices.filter(inv => inv.contractorId === activeContractorId);

        contractorInvoices.forEach(inv => {
            if (inv.invoiceItems && Array.isArray(inv.invoiceItems)) {
                inv.invoiceItems.forEach(item => {
                    if (item.title) {
                        const title = item.title.trim();
                        const key = title.toLowerCase();
                        if (!itemMap.has(key)) {
                            itemMap.set(key, {
                                title,
                                unit: item.unit || 'ks',
                                price: parseFloat(item.pricePerPiece || 0),
                                category: item.category || 'work'
                            });
                        }
                    }
                });
            }
        });

        return Array.from(itemMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [invoices, activeContractorId]);

    const hiddenItems = useMemo(() => {
        return priceOfferSettings?.hiddenAutocompleteItems || [];
    }, [priceOfferSettings]);

    const filteredItems = useMemo(() => {
        let baseItems = activeTab === 'all'
            ? allHistoryItems.filter(item => !hiddenItems.some(h => h.toLowerCase() === item.title.toLowerCase()))
            : allHistoryItems.filter(item => hiddenItems.some(h => h.toLowerCase() === item.title.toLowerCase()));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            baseItems = baseItems.filter(item => item.title.toLowerCase().includes(q));
        }

        return baseItems;
    }, [allHistoryItems, hiddenItems, activeTab, searchQuery]);

    const handleHideItem = async (title) => {
        const currentHidden = priceOfferSettings?.hiddenAutocompleteItems || [];
        if (!currentHidden.some(h => h.toLowerCase() === title.toLowerCase())) {
            await updatePriceOfferSettings({
                hiddenAutocompleteItems: [...currentHidden, title]
            });
        }
    };

    const handleUnhideItem = async (title) => {
        const currentHidden = priceOfferSettings?.hiddenAutocompleteItems || [];
        await updatePriceOfferSettings({
            hiddenAutocompleteItems: currentHidden.filter(h => h.toLowerCase() !== title.toLowerCase())
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('Items')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Manage saved autocomplete items')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Search and Tabs */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('Search items...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>

                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {t('All Saved')}
                        </button>
                        <button
                            onClick={() => setActiveTab('hidden')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'hidden'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {t('Hidden')} ({hiddenItems.length})
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-gray-200 dark:hover:border-gray-600 transition-all shadow-sm group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md uppercase">
                                            {item.unit}
                                        </span>
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                            {item.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </span>
                                    </div>
                                </div>

                                {activeTab === 'all' ? (
                                    <button
                                        onClick={() => handleHideItem(item.title)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('Hide from suggestions')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUnhideItem(item.title)}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                        title={t('Restore to suggestions')}
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('No items found')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                                {searchQuery ? t('Try a different search term') : t('Start by adding items to your invoices')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                        {t('Hiding items only affects future autocomplete suggestions. It will not change existing invoices or the project price list.')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ItemsManagementModal;
