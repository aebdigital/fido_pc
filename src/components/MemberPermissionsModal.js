import React, { useState, useEffect, useCallback } from 'react';
import { X, Shield, Eye, EyeOff, Edit3, User, CheckCircle2, Archive, Euro, Copy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const sections = [
    { id: 'client_supplier', label: 'Klient a Dodávateľ', icon: User },
    { id: 'total_price_offer', label: 'Celková cenová ponuka', icon: CheckCircle2 },
    { id: 'issue_document', label: 'Vystaviť doklad (a doklady)', icon: Edit3 },
    { id: 'receipts', label: 'Účtenky', icon: Shield },
    { id: 'history', label: 'História', icon: Shield },
    { id: 'price_offer_note', label: 'Poznámka k cenovej ponuke', icon: Shield },
    { id: 'project_note', label: 'Poznámka k projektu', icon: Shield },
    { id: 'files', label: 'Súbory', icon: Shield },
    { id: 'project_pricelist', label: 'Project Price List', icon: Euro },
    { id: 'archive', label: 'ArchiveProjectAction', icon: Archive },
    { id: 'duplicate', label: 'Duplicate', icon: Copy },
];

const LEGACY_PERMISSION_MAP = {
    'client': 'client_supplier',
    'priceOffer': 'total_price_offer',
    'documents': 'issue_document',
    'priceOfferNote': 'price_offer_note',
    'projectNote': 'project_note'
};

const accessLevels = [
    { id: 'hidden', label: 'Skryté', icon: EyeOff, color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: 'view', label: 'Iba čítanie', icon: Eye, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { id: 'edit', label: 'Interakcia', icon: Edit3, color: 'text-green-500', bgColor: 'bg-green-50' },
];

const VALUE_MAP = {
    'interact': 'edit',
    'view': 'view',
    'hidden': 'hidden'
};

const MemberPermissionsModal = ({ isOpen, onClose, user, onConfirm, isLoading, initialPermissions, confirmLabel }) => {
    const { t } = useLanguage();
    const [permissions, setPermissions] = useState({});

    // Parse and initialize permissions
    const initializePermissions = useCallback(() => {
        let raw = initialPermissions || {};
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch (e) {
                console.warn('Failed to parse permissions', e);
                raw = {};
            }
        }

        // Initialize with default 'hidden' for all sections
        const base = sections.reduce((acc, section) => ({ ...acc, [section.id]: 'hidden' }), {});

        // Merge with existing permissions, handling legacy keys and values
        Object.keys(raw).forEach(key => {
            const newKey = LEGACY_PERMISSION_MAP[key] || key;
            const rawValue = raw[key];
            const newValue = VALUE_MAP[rawValue] || rawValue;

            // Only apply if it's a valid current key and valid value
            if (sections.some(s => s.id === newKey) && accessLevels.some(l => l.id === newValue)) {
                base[newKey] = newValue;
            }
        });

        return base;
    }, [initialPermissions]);

    // Sync state when initialPermissions or isOpen changes
    useEffect(() => {
        if (isOpen) {
            setPermissions(initializePermissions());
        }
    }, [isOpen, initializePermissions]);

    if (!isOpen) return null;

    const handleLevelChange = (sectionId, level) => {
        setPermissions(prev => ({
            ...prev,
            [sectionId]: level
        }));
    };

    const handleConfirm = () => {
        // Only save keys that are in the current sections list
        const cleanPermissions = {};
        sections.forEach(s => {
            cleanPermissions[s.id] = permissions[s.id] || 'view';
        });
        onConfirm(cleanPermissions);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t('Member Permissions')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('Setting access for')} <span className="font-semibold text-blue-600">{user?.full_name || user?.email}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                    {t('Section')}
                                </th>
                                {accessLevels.map(level => (
                                    <th key={level.id} className="p-4 text-xs font-bold uppercase tracking-wider text-center text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                        {t(level.label)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sections.map((section) => (
                                <tr key={section.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="p-4 border-b border-gray-50 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors">
                                                <section.icon className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-gray-700 dark:text-gray-200">
                                                {t(section.label)}
                                            </span>
                                        </div>
                                    </td>
                                    {accessLevels.map(level => {
                                        const isActive = permissions[section.id] === level.id;
                                        return (
                                            <td key={level.id} className="p-4 border-b border-gray-50 dark:border-gray-800 text-center">
                                                <button
                                                    onClick={() => handleLevelChange(section.id, level.id)}
                                                    className={`w-10 h-10 rounded-xl inline-flex items-center justify-center transition-all duration-200 ${isActive
                                                        ? `${level.bgColor} ${level.color} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-current shadow-sm scale-110`
                                                        : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                        }`}
                                                    title={t(level.label)}
                                                >
                                                    <level.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        {confirmLabel || t('Add Member')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberPermissionsModal;
