import React, { useState, useEffect } from 'react';
import { X, Check, ChevronRight, Loader2, Building, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';

const ConsolidatedInvoiceModal = ({ isOpen, onClose, projects, currentUser, onGenerateInvoice }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [owners, setOwners] = useState([]);
    const [selectedOwnerId, setSelectedOwnerId] = useState(null);
    const [ownerContractors, setOwnerContractors] = useState({}); // Map ownerId -> contractorProfile
    const [isLoadingOwners, setIsLoadingOwners] = useState(false);

    // Step 2
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);

    // Step 3
    const [projectDetails, setProjectDetails] = useState({}); // { projectId: { hours: 0, rate: 0, name: '' } }
    const [grandTotal, setGrandTotal] = useState(0);

    // Initialize Owners
    useEffect(() => {
        if (isOpen && projects.length > 0) {
            const loadOwners = async () => {
                setIsLoadingOwners(true);
                try {
                    // Filter projects where I am NOT the owner
                    // But actually, can I invoice myself? Probably not needed for this feature.
                    // The feature is for MEMBERS to invoice OWNERS.
                    const memberProjects = projects.filter(p => p.userRole !== 'owner');

                    // Extract unique owners
                    const uniqueOwnerIds = [...new Set(memberProjects.map(p => p.user_id || p.owner_id).filter(Boolean))];

                    // Fetch owner profiles
                    if (uniqueOwnerIds.length > 0) {
                        const profiles = await api.userProfiles.getByIds(uniqueOwnerIds);

                        // Also fitler projects by owner to have a count
                        const ownersList = profiles.map(profile => {
                            const ownerProjects = memberProjects.filter(p => (p.user_id === profile.id || p.owner_id === profile.id));
                            return {
                                ...profile,
                                projectCount: ownerProjects.length,
                                projects: ownerProjects
                            };
                        });
                        setOwners(ownersList);

                        // Async fetch contractor details for these owners
                        uniqueOwnerIds.forEach(async (uid) => {
                            try {
                                // Fetch using the same logic as DennikModal (by user_id)
                                const { data } = await api.supabase
                                    .from('contractors')
                                    .select('*')
                                    .eq('user_id', uid)
                                    .order('created_at', { ascending: false })
                                    .limit(1);
                                if (data && data.length > 0) {
                                    setOwnerContractors(prev => ({ ...prev, [uid]: data[0] }));
                                }
                            } catch (e) {
                                console.warn('Failed to load contractor for owner', uid);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error loading owners:', error);
                } finally {
                    setIsLoadingOwners(false);
                }
            };
            loadOwners();
            setStep(1);
            setSelectedOwnerId(null);
            setSelectedProjectIds([]);
            setProjectDetails({});
        }
    }, [isOpen, projects]);

    // Calculate totals when entering Step 3
    useEffect(() => {
        if (step === 3) {
            const calculateTotals = async () => {
                const date = new Date();
                const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA');
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toLocaleDateString('en-CA');

                const newDetails = {};

                // We need to fetch entries for each selected project
                const promises = selectedProjectIds.map(pid =>
                    api.dennik.getTimeEntries(pid, firstDay, lastDay)
                );

                try {
                    const results = await Promise.all(promises);

                    selectedProjectIds.forEach((pid, index) => {
                        const entries = results[index];
                        const project = projects.find(p => (p.c_id === pid || p.id === pid));

                        const myEntries = (entries || []).filter(e => e.user_id === currentUser.id);
                        const totalHours = myEntries.reduce((acc, e) => acc + Number(e.hours_worked || 0), 0);

                        newDetails[pid] = {
                            hours: totalHours,
                            rate: project?.hourly_rate || 0,
                            name: project?.name || 'Unknown Project'
                        };
                    });

                    setProjectDetails(newDetails);

                } catch (e) {
                    console.error('Error calculating hours', e);
                }
            };
            calculateTotals();
        }
    }, [step, selectedProjectIds, projects, currentUser.id]);

    // Update grand total whenever details change
    useEffect(() => {
        const total = Object.values(projectDetails).reduce((acc, detail) => {
            return acc + (parseFloat(detail.hours || 0) * parseFloat(detail.rate || 0));
        }, 0);
        setGrandTotal(total);
    }, [projectDetails]);

    const handleDetailChange = (pid, field, value) => {
        setProjectDetails(prev => ({
            ...prev,
            [pid]: {
                ...prev[pid],
                [field]: value
            }
        }));
    };

    const handleNext = () => {
        if (step === 1 && !selectedOwnerId) return;
        if (step === 2 && selectedProjectIds.length === 0) return;
        setStep(s => s + 1);
    };

    const handleBack = () => {
        setStep(s => s - 1);
    };

    const toggleProject = (pid) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(pid)) return prev.filter(id => id !== pid);
            return [...prev, pid];
        });
    };

    const handleGenerate = () => {
        // Prepare data for InvoiceCreationModal
        const ownerContractor = ownerContractors[selectedOwnerId];

        const items = selectedProjectIds.map(pid => {
            const detail = projectDetails[pid];
            const hours = parseFloat(detail?.hours || 0);
            const rate = parseFloat(detail?.rate || 0);
            const price = hours * rate;

            return {
                id: crypto.randomUUID(),
                title: `${detail?.name} - ${new Date().toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}`,
                description: t('Consolidated Services'),
                pieces: hours,
                pricePerPiece: rate,
                price: price,
                vat: 23, // Default
                unit: 'h',
                category: 'work',
                active: true,
                projectId: pid // Critical for visibility filter
            };
        });

        onGenerateInvoice({
            items: items,
            ownerContractor: ownerContractor,
            ownerId: selectedOwnerId
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('Issue Consolidated Invoice')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {step === 1 && t('Select Project Owner')}
                            {step === 2 && t('Select Projects')}
                            {step === 3 && t('Invoice Details')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-3">
                            {isLoadingOwners ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-8 h-8 text-purple-500" /></div>
                            ) : owners.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">{t('No eligible project owners found.')}</div>
                            ) : (
                                owners.map(owner => (
                                    <button
                                        key={owner.id}
                                        onClick={() => setSelectedOwnerId(owner.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedOwnerId === owner.id
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                                {owner.full_name?.charAt(0) || owner.email?.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {owner.full_name || owner.email}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {owner.projectCount} {t('projects')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedOwnerId === owner.id
                                            ? 'bg-purple-500 border-purple-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {selectedOwnerId === owner.id && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('Projects owned by')} <span className="text-gray-900 dark:text-white font-bold">{owners.find(o => o.id === selectedOwnerId)?.full_name || 'Owner'}</span>
                                </span>

                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {owners.find(o => o.id === selectedOwnerId)?.projects.map(project => {
                                    const pid = project.c_id || project.id;
                                    const isSelected = selectedProjectIds.includes(pid);
                                    return (
                                        <button
                                            key={pid}
                                            onClick={() => toggleProject(pid)}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <span className="font-medium text-gray-900 dark:text-white">{project.name}</span>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-purple-500 border-purple-500'
                                                : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-4 border border-gray-100 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Building className="w-4 h-4 text-purple-500" />
                                    {t('Invoicing Details')}
                                </h3>

                                <div className="space-y-4">
                                    {selectedProjectIds.map(pid => (
                                        <div key={pid} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="mb-2 font-medium text-gray-900 dark:text-white">
                                                {projectDetails[pid]?.name || t('Project')}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Hours')}</label>
                                                    <input
                                                        type="number"
                                                        value={projectDetails[pid]?.hours || ''}
                                                        onChange={(e) => handleDetailChange(pid, 'hours', e.target.value)}
                                                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Rate (€)')}</label>
                                                    <input
                                                        type="number"
                                                        value={projectDetails[pid]?.rate || ''}
                                                        onChange={(e) => handleDetailChange(pid, 'rate', e.target.value)}
                                                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 text-right text-sm font-bold text-gray-900 dark:text-white">
                                                {((parseFloat(projectDetails[pid]?.hours || 0) * parseFloat(projectDetails[pid]?.rate || 0)) * 1.23).toFixed(2)} €
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="font-medium text-gray-900 dark:text-white">{t('Total Amount')}</span>
                                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {(grandTotal * 1.23).toFixed(2)} €
                                    </span>
                                </div>
                                <p className="text-xs text-right text-gray-400">{t('Includes VAT')}</p>
                            </div>

                            {!ownerContractors[selectedOwnerId] && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex gap-2 items-start text-yellow-800 dark:text-yellow-200 text-sm">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>{t('Warning: Selected owner does not have a complete Contractor Profile. You may need to enter billing details manually.')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
                    <div className="flex gap-2">
                        {/* Pagination Circles */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${step >= i ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`} />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                            >
                                {t('Back')}
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={(step === 1 && !selectedOwnerId) || (step === 2 && selectedProjectIds.length === 0)}
                                className="flex items-center gap-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('Next')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg hover:to-indigo-500 transition-all active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                {t('Proceed to Invoice')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsolidatedInvoiceModal;
