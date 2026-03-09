import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ChevronRight, Loader2, AlertTriangle, FileText } from 'lucide-react';
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
    const [projectsWithInvoice, setProjectsWithInvoice] = useState(new Set()); // project IDs that already have an invoice this month
    const [isCheckingInvoices, setIsCheckingInvoices] = useState(false);

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

                        // Async fetch contractor details for each owner
                        // Use the project's contractor_id (like DennikModal) instead of user_id
                        // to get the CORRECT contractor linked to the project
                        uniqueOwnerIds.forEach(async (uid) => {
                            try {
                                // Find the first project for this owner to get the correct contractor_id
                                const ownerProject = memberProjects.find(p => (p.user_id === uid || p.owner_id === uid));
                                const contractorId = ownerProject?.contractor_id || ownerProject?.contractorId;

                                let contractorData = null;

                                // 1. Try by project's contractor_id first (most accurate)
                                if (contractorId) {
                                    const { data } = await api.supabase
                                        .from('contractors')
                                        .select('*')
                                        .eq('c_id', contractorId)
                                        .limit(1);
                                    if (data && data.length > 0) {
                                        contractorData = data[0];
                                    }
                                }

                                // 2. Fallback: fetch by user_id (last created)
                                if (!contractorData) {
                                    const { data } = await api.supabase
                                        .from('contractors')
                                        .select('*')
                                        .eq('user_id', uid)
                                        .order('created_at', { ascending: false })
                                        .limit(1);
                                    if (data && data.length > 0) {
                                        contractorData = data[0];
                                    }
                                }

                                if (contractorData) {
                                    setOwnerContractors(prev => ({ ...prev, [uid]: contractorData }));
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

    // Check which projects already have an invoice for the current month
    const checkProjectInvoices = useCallback(async (ownerProjects) => {
        setIsCheckingInvoices(true);
        try {
            const invoicedProjectIds = new Set();
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Fetch all current user's invoices
            const allMyInvoices = await api.invoices.getAll();

            for (const project of ownerProjects) {
                const pid = project.c_id || project.id;

                // 1. Check project-specific invoices
                const projectInvoices = await api.invoices.getInvoicesByProject(pid);
                const hasDirectInvoice = (projectInvoices || []).some(inv => {
                    if (inv.invoice_type && inv.invoice_type !== 'regular') return false;
                    const d = new Date(inv.date_created || inv.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                if (hasDirectInvoice) {
                    invoicedProjectIds.add(pid);
                    continue;
                }

                // 2. Check standalone/consolidated invoices whose items reference this project
                const hasConsolidatedInvoice = (allMyInvoices || []).some(inv => {
                    if (inv.project_id) return false; // not standalone
                    if (inv.invoice_type && inv.invoice_type !== 'regular') return false;
                    const d = new Date(inv.date_created || inv.created_at);
                    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;

                    try {
                        const items = typeof inv.invoice_items_data === 'string'
                            ? JSON.parse(inv.invoice_items_data)
                            : inv.invoice_items_data;
                        if (Array.isArray(items)) {
                            return items.some(item => item.projectId === pid);
                        }
                    } catch (e) { /* ignore */ }
                    return false;
                });

                if (hasConsolidatedInvoice) {
                    invoicedProjectIds.add(pid);
                }
            }

            setProjectsWithInvoice(invoicedProjectIds);

            // Auto-deselect any already-invoiced projects that may have been selected
            setSelectedProjectIds(prev => prev.filter(id => !invoicedProjectIds.has(id)));
        } catch (error) {
            console.error('Error checking project invoices:', error);
        } finally {
            setIsCheckingInvoices(false);
        }
    }, []);

    // Run invoice check when owner is selected (entering Step 2)
    useEffect(() => {
        if (step === 2 && selectedOwnerId) {
            const ownerData = owners.find(o => o.id === selectedOwnerId);
            if (ownerData?.projects) {
                checkProjectInvoices(ownerData.projects);
            }
        }
    }, [step, selectedOwnerId, owners, checkProjectInvoices]);

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
        // Don't allow toggling projects that already have an invoice
        if (projectsWithInvoice.has(pid)) return;
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 no-gradient rounded-t-[25px] sm:rounded-[25px] shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh]">

                {/* Header */}
                <div className="px-5 pt-5 pb-[15px] flex justify-between items-start gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-[#111827] dark:text-white">{t('Issue Consolidated Invoice')}</h2>
                        <p className="text-sm font-medium text-[#6B7280] dark:text-gray-400 mt-1">
                            {step === 1 && t('Select Project Owner')}
                            {step === 2 && t('Select Projects')}
                            {step === 3 && t('Invoice Details')}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-gray-800 no-gradient flex items-center justify-center transition-colors hover:bg-[#E5E7EB] dark:hover:bg-gray-700">
                        <X className="w-4 h-4 text-[#6B7280] dark:text-gray-300" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                    {step === 1 && (
                        <div className="space-y-[10px]">
                            {isLoadingOwners ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
                            ) : owners.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">{t('No eligible project owners found.')}</div>
                            ) : (
                                owners.map(owner => (
                                    <button
                                        key={owner.id}
                                        onClick={() => setSelectedOwnerId(owner.id)}
                                        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 no-gradient rounded-2xl border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${selectedOwnerId === owner.id
                                            ? 'border-2 border-blue-500'
                                            : 'border-black/15 dark:border-white/10 hover:border-black/25 dark:hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-[#111827] dark:text-white font-bold">
                                                {owner.full_name?.charAt(0) || owner.email?.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[17px] font-semibold text-[#111827] dark:text-white leading-tight">
                                                    {owner.full_name || owner.email}
                                                </div>
                                                <div className="text-[13px] text-[#6B7280] dark:text-gray-400">
                                                    {owner.projectCount} {t('projects')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedOwnerId === owner.id
                                            ? 'border-blue-500'
                                            : 'border-gray-300'
                                            }`}>
                                            {selectedOwnerId === owner.id && <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-[10px]">
                            <div className="flex justify-between items-center pb-1">
                                <span className="text-sm font-medium text-[#6B7280] dark:text-gray-400">
                                    {t('Projects owned by')} <span className="text-[#111827] dark:text-white font-bold">{owners.find(o => o.id === selectedOwnerId)?.full_name || 'Owner'}</span>
                                </span>

                            </div>
                            {isCheckingInvoices && (
                                <div className="flex items-center justify-center py-4 gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('Checking existing invoices...')}
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-3">
                                {owners.find(o => o.id === selectedOwnerId)?.projects.map(project => {
                                    const pid = project.c_id || project.id;
                                    const isSelected = selectedProjectIds.includes(pid);
                                    const hasInvoice = projectsWithInvoice.has(pid);
                                    return (
                                        <button
                                            key={pid}
                                            onClick={() => toggleProject(pid)}
                                            disabled={hasInvoice}
                                            className={`flex items-center justify-between p-4 bg-white dark:bg-gray-900 no-gradient rounded-2xl border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${hasInvoice
                                                ? 'border-black/10 dark:border-white/10 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                                                : isSelected
                                                    ? 'border-2 border-blue-500'
                                                    : 'border-black/15 dark:border-white/10 hover:border-black/25 dark:hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className={`text-[17px] font-medium ${hasInvoice ? 'text-gray-400 dark:text-gray-500' : 'text-[#111827] dark:text-white'}`}>{project.name}</span>
                                                {hasInvoice && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                        <FileText className="w-3 h-3" />
                                                        {t('Invoice already exists for this month')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${hasInvoice
                                                ? 'border-gray-300 bg-gray-200'
                                                : isSelected
                                                    ? 'border-blue-500'
                                                    : 'border-gray-300'
                                                }`}>
                                                {isSelected && !hasInvoice && <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 pt-1">
                            <div className="space-y-4">
                                    {selectedProjectIds.map(pid => (
                                        <div key={pid} className="p-4 bg-white dark:bg-gray-900 no-gradient rounded-[18px] border border-black/15 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                                            <div className="mb-3 text-[17px] font-semibold text-[#111827] dark:text-white">
                                                {projectDetails[pid]?.name || t('Project')}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">{t('Hours')}</label>
                                                    <input
                                                        type="number"
                                                        value={projectDetails[pid]?.hours || ''}
                                                        onChange={(e) => handleDetailChange(pid, 'hours', e.target.value)}
                                                        className="w-full px-[10px] py-[10px] bg-white dark:bg-gray-900 border-2 border-black dark:border-gray-500 rounded-xl text-[18px] font-semibold text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">{t('Rate (€)')}</label>
                                                    <input
                                                        type="number"
                                                        value={projectDetails[pid]?.rate || ''}
                                                        onChange={(e) => handleDetailChange(pid, 'rate', e.target.value)}
                                                        className="w-full px-[10px] py-[10px] bg-white dark:bg-gray-900 border-2 border-black dark:border-gray-500 rounded-xl text-[18px] font-semibold text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3 text-right text-base font-bold text-[#111827] dark:text-white">
                                                {((parseFloat(projectDetails[pid]?.hours || 0) * parseFloat(projectDetails[pid]?.rate || 0)) * 1.23).toFixed(2)} €
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 no-gradient rounded-[18px] border border-black/15 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                                <span className="text-[18px] font-semibold text-[#111827] dark:text-white">{t('Total Amount')}</span>
                                <span className="text-[22px] font-bold text-green-600">
                                    {(grandTotal * 1.23).toFixed(2)} €
                                </span>
                            </div>
                            <p className="text-xs text-right text-[#9CA3AF] dark:text-gray-500">{t('Includes VAT')}</p>

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
                <div className="px-5 py-4 border-t border-black/10 dark:border-white/10 flex justify-between items-center bg-white dark:bg-gray-900 no-gradient">
                    <div className="flex gap-2">
                        {/* Pagination Circles */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${step >= i ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`} />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-5 py-3 text-[#111827] dark:text-white bg-transparent no-gradient no-global-border rounded-[14px] font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                {t('Back')}
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={(step === 1 && !selectedOwnerId) || (step === 2 && selectedProjectIds.length === 0)}
                                className="flex items-center gap-1 px-6 py-3 bg-black no-gradient no-global-border text-white rounded-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('Next')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                className="flex items-center gap-1 px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-700 no-global-border text-white rounded-[14px] font-bold hover:from-blue-600 hover:to-blue-800 transition-all active:scale-[0.98]"
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
