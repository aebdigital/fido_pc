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

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

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
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
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

                                    <button
                                        onClick={() => setItemToDelete(item.title)}
                                        className="p-2.5 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-all shadow-sm"
                                        title={t('Delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
