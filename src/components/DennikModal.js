import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Clock, Play, Square, Users, UserPlus, UserMinus, Timer, ChevronLeft, ChevronRight, BarChart3, FileText, Download, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import { useAppData } from '../context/AppDataContext';
import InvoiceDetailModal from './InvoiceDetailModal';
import { transformInvoiceFromDB } from '../utils/dataTransformers';
import ConfirmationModal from './ConfirmationModal';

const DennikModal = ({ isOpen, onClose, project, isOwner, currentUser }) => {
    const { t } = useLanguage();
    const {
        activeContractor,
        getVATRate,
        invoices,
        createInvoice,
        activeContractorId,
        activeTimer: globalActiveTimer,
        updateProject,
        refreshActiveTimer,
        priceOfferSettings,
        updatePriceOfferSettings
    } = useAppData();

    // State
    const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'members'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeTimer, setActiveTimer] = useState(null);
    const [hourlyRate, setHourlyRate] = useState(project?.hourly_rate || priceOfferSettings?.defaultHourlyRate || '');
    // Ensure we sync if prop changes or global setting becomes available
    useEffect(() => {
        if (project?.hourly_rate) {
            setHourlyRate(project.hourly_rate);
        } else if (priceOfferSettings?.defaultHourlyRate) {
            setHourlyRate(priceOfferSettings.defaultHourlyRate);
        }
    }, [project?.hourly_rate, priceOfferSettings?.defaultHourlyRate]);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [timeEntries, setTimeEntries] = useState([]);
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false); // eslint-disable-line no-unused-vars
    const [customHours, setCustomHours] = useState(null); // For testing/overriding
    const [ownerProfile, setOwnerProfile] = useState(null);
    const [showBusyModal, setShowBusyModal] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);

    // Analytics State
    const [analyticsView, setAnalyticsView] = useState('month'); // 'day', 'week', 'month'
    const [analyticsDate, setAnalyticsDate] = useState(new Date());
    const [analyticsEntries, setAnalyticsEntries] = useState([]);
    const [generatedInvoices, setGeneratedInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
    const hourlyRateTimerRef = useRef(null);

    // Memoized functions (useCallback)
    const loadMembers = useCallback(async () => {
        try {
            const data = await api.dennik.getProjectMembers(project.c_id || project.id);
            setMembers(data || []);
        } catch (error) {
            console.error('Error loading members:', error);
        }
    }, [project]);

    const loadTimeEntries = useCallback(async () => {
        try {
            const data = await api.dennik.getTimeEntries(project.c_id || project.id);
            setTimeEntries(data || []);
            setAnalyticsEntries(data || []);
        } catch (error) {
            console.error('Error loading time entries:', error);
        }
    }, [project]);

    const checkActiveTimer = useCallback(async () => {
        try {
            const timer = await api.dennik.getActiveTimer(project.c_id || project.id);
            setActiveTimer(timer);
        } catch (error) {
            console.error('Error checking active timer:', error);
        }
    }, [project]);

    const loadOwnerProfile = useCallback(async () => {
        console.log('--- loadOwnerProfile Start ---');
        console.log('Project prop:', project);
        console.log('isOwner prop:', isOwner);

        if (isOwner) {
            console.log('Using currentUser as ownerProfile:', currentUser);
            setOwnerProfile(currentUser);
            return;
        }

        // Check if owner was already joined in the project object
        if (project.owner) {
            console.log('Using pre-loaded owner profile from project object:', project.owner);
            setOwnerProfile(project.owner);
            return;
        }

        const ownerId = project.user_id || project.owner_id; // Check both common patterns
        console.log('Detected ownerId:', ownerId);

        if (!ownerId) {
            console.warn('loadOwnerProfile: Owner ID is missing in project object');
            setOwnerProfile({ email: 'Unknown Owner (No ID)' });
            return;
        }

        try {
            console.log('Fetching profile for ownerId:', ownerId);
            const { data, error } = await api.userProfiles.getByIds([ownerId]);
            console.log('api.userProfiles.getByIds Response:', { data, error });

            if (data && data.length > 0) {
                console.log('Found owner profile:', data[0]);
                setOwnerProfile(data[0]);
            } else {
                console.warn('loadOwnerProfile: Returned empty array or no data');
                setOwnerProfile({ id: ownerId, email: 'Project Owner' });
            }
        } catch (error) {
            console.error('loadOwnerProfile Exception:', error);
            setOwnerProfile({ id: ownerId, email: 'Owner (Error)' });
        }
    }, [project, isOwner, currentUser]);

    const loadData = useCallback(async () => {
        await Promise.all([
            loadMembers(),
            loadTimeEntries(),
            checkActiveTimer(),
            loadOwnerProfile()
        ]);
    }, [loadMembers, loadTimeEntries, checkActiveTimer, loadOwnerProfile]);

    const loadAnalyticsData = useCallback(async () => {
        try {
            let startDate, endDate;
            const date = new Date(analyticsDate);

            if (analyticsView === 'day') {
                startDate = date.toISOString().split('T')[0];
                endDate = startDate;
            } else if (analyticsView === 'week') {
                // Get start and end of week
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(date);
                monday.setDate(diff);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                startDate = monday.toISOString().split('T')[0];
                endDate = sunday.toISOString().split('T')[0];
            } else {
                // Month
                const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                startDate = firstDay.toISOString().split('T')[0];
                endDate = lastDay.toISOString().split('T')[0];
            }

            const allEntries = await api.dennik.getTimeEntries(
                project.c_id || project.id,
                startDate,
                endDate
            );

            // Filter for current user only - for invoicing purposes
            const myEntries = (allEntries || []).filter(e => e.user_id === currentUser.id);
            setAnalyticsEntries(myEntries);

        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }, [analyticsDate, analyticsView, project, currentUser]);

    const loadInvoices = useCallback(async () => {
        try {
            const data = await api.invoices.getInvoicesByProject(project.c_id || project.id);
            // Transform data for frontend compatibility (camelCase)
            const transformedData = (data || []).map(dbInv => ({
                ...transformInvoiceFromDB(dbInv),
                contractors: dbInv.contractors // Preserve joined contractor data
            }));
            setGeneratedInvoices(transformedData);
        } catch (error) {
            console.error('Error loading project invoices:', error);
        }
    }, [project]);

    // Effects
    useEffect(() => {
        if (isOpen && project) {
            loadData();
            loadAnalyticsData();
            // Only sync from props if we're not currently typing
            if (project.hourly_rate !== undefined && !hourlyRateTimerRef.current) {
                setHourlyRate(project.hourly_rate || priceOfferSettings?.defaultHourlyRate || '');
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, project, loadData, loadAnalyticsData]);

    useEffect(() => {
        if (isOpen && project && activeTab === 'analytics') {
            loadAnalyticsData();
            loadInvoices();
        }
    }, [analyticsDate, analyticsView, activeTab, isOpen, project, loadAnalyticsData, loadInvoices]);

    // Check for active timer on mount
    useEffect(() => {
        if (isOpen && project) {
            checkActiveTimer();
        }
    }, [isOpen, project, checkActiveTimer]);

    // Load time entries when date changes
    useEffect(() => {
        if (isOpen && project) {
            loadTimeEntries();
        }
    }, [selectedDate, isOpen, project, loadTimeEntries]);

    const handlePreviewInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setShowInvoiceDetail(true);
    };

    const handleGenerateInvoice = async () => {
        console.log('handleGenerateInvoice called');
        console.log('entries:', analyticsEntries.length, 'customHours:', customHours);

        // Allow generating invoice if we have overridden hours, even if no entries exist
        if (!analyticsEntries.length && (!customHours || parseFloat(customHours) <= 0)) {
            console.log('Validation failed: No entries and no custom hours');
            alert(t('No time entries found for this period'));
            return;
        }

        setIsGeneratingInvoice(true);
        try {
            console.log('Step 1: Fetching Supplier (Active Contractor)');
            // 1. Supplier = Active Contractor (Current User)
            let supplier = activeContractor;
            if (!supplier) {
                console.log('No active contractor in context, fetching all...');
                const contractors = await api.contractors.getAll();
                if (contractors && contractors.length > 0) {
                    supplier = contractors[0];
                }
            }

            if (!supplier) {
                console.error('No supplier found');
                alert(t('Please create a Contractor Profile in Settings first to generate invoices.'));
                setIsGeneratingInvoice(false);
                return;
            }
            console.log('Supplier found:', supplier.id);

            // 2. Customer = Project Owner's Contractor Profile
            let customer = null;
            if (project.user_id) {
                console.log('Fetching customer for project.user_id:', project.user_id);
                try {
                    const { data: ownerContractors, error: ownerError } = await api.supabase
                        .from('contractors')
                        .select('*')
                        .eq('user_id', project.user_id)
                        .limit(1);

                    if (ownerError) console.error('Error fetching owner contractor:', ownerError);

                    if (ownerContractors && ownerContractors.length > 0) {
                        customer = ownerContractors[0];
                    } else {
                        console.log('No contractor profile for owner, using profile fallback');
                        if (ownerProfile) {
                            customer = {
                                name: ownerProfile.full_name || ownerProfile.email || t('Project Owner'),
                                email: ownerProfile.email
                            };
                        }
                    }
                } catch (err) {
                    console.error('Crash fetching owner contractor:', err);
                }
            }
            console.log('Customer determined:', customer);

            // 3. Prepare Data
            const calculatedTotalHours = analyticsEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
            const totalHours = customHours !== null ? parseFloat(customHours) : calculatedTotalHours;
            const amount = totalHours * parseFloat(hourlyRate || 0);

            // Calculate Invoice Number
            const currentYear = new Date().getFullYear();
            const yearPrefix = parseInt(`${currentYear}000`);
            const yearMax = parseInt(`${currentYear}999`);
            const contractorInvoices = (invoices || []).filter(inv => inv.contractorId === (supplier.id || activeContractorId));
            const currentYearInvoices = contractorInvoices.filter(inv => {
                const num = parseInt(inv.invoiceNumber || 0);
                return num >= yearPrefix && num <= yearMax;
            });

            let nextNumber;
            if (currentYearInvoices.length === 0) {
                nextNumber = parseInt(`${currentYear}001`);
            } else {
                const maxNumber = Math.max(...currentYearInvoices.map(inv => parseInt(inv.invoiceNumber || 0)));
                nextNumber = maxNumber + 1;
            }

            const invoiceNumber = String(nextNumber);
            const issueDate = new Date().toISOString().split('T')[0];
            const paymentDays = 14;

            // Invoice Items (for DB and PDF)
            // If custom hours are used, we create a single consolidated item
            const shouldUseConsolidatedItem = customHours !== null;

            const consolidateWorkItem = {
                id: crypto.randomUUID(),
                title: `${t('Work Hours')} - ${t('Project')} ${project.name} (${t('Consolidated')})`,
                pieces: totalHours,
                pricePerPiece: parseFloat(hourlyRate || 0),
                price: amount,
                vat: 23,
                unit: 'h', // Display unit
                date: issueDate
            };

            // If NOT using custom hours, we can use the detailed breakdown (one item per day/entry)
            // But for now, the existing logic seems to create just one aggregate item called 'workItem'
            // and then 'invoiceItems' array contains just that one item (see below).

            // Let's ensure we use the correct item description
            if (shouldUseConsolidatedItem) {
                consolidateWorkItem.title = `${t('Work Hours')} - ${t('Project')} ${project.name} (${t('Manual Adjustment')})`;
            } else {
                consolidateWorkItem.title = `${t('Work Hours')} - ${t('Project')} ${project.name}`;
            }

            const invoiceItems = [consolidateWorkItem];

            const vatRate = typeof getVATRate === 'function' ? getVATRate() : 0.23;
            console.log('Using VAT rate:', vatRate);

            const invoiceData = {
                invoiceNumber,
                issueDate,
                dispatchDate: issueDate,
                paymentMethod: 'transfer',
                paymentDays,
                notes: `${t('Period')}: ${analyticsView === 'day' ? analyticsDate.toLocaleDateString() :
                    analyticsView === 'month' ? analyticsDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' }) :
                        t('Selected Period')}`,
                invoiceItems: invoiceItems,
                priceWithoutVat: amount,
                cumulativeVat: amount * vatRate
            };

            // Create in DB
            const catId = typeof project.category === 'object' ? project.category.id : project.category;
            console.log('Step 4: Calling createInvoice in DB');
            const newInvoice = await createInvoice(project, catId, invoiceData);
            console.log('Step 5: createInvoice result:', newInvoice);

            // Refresh the list so it appears below
            await loadInvoices();
            // alert(t('Invoice generated and saved successfully!'));
        } catch (error) {
            console.error('Invoice generation failed:', error);
            alert(t('Failed to generate invoice: ') + error.message);
        } finally {
            setIsGeneratingInvoice(false);
        }
    };

    const handleUpdateHourlyRate = (value) => {
        setHourlyRate(value);
        if (!isOwner) return;

        if (hourlyRateTimerRef.current) clearTimeout(hourlyRateTimerRef.current);

        hourlyRateTimerRef.current = setTimeout(async () => {
            try {
                const numericValue = parseFloat(value);
                if (isNaN(numericValue)) {
                    hourlyRateTimerRef.current = null;
                    return;
                }

                const catId = typeof project.category === 'object' ? project.category.id : project.category;
                await Promise.all([
                    updateProject(catId, project.c_id || project.id, { hourlyRate: numericValue }),
                    updatePriceOfferSettings({ defaultHourlyRate: numericValue })
                ]);
            } catch (error) {
                console.error('Error updating hourly rate:', error);
            } finally {
                hourlyRateTimerRef.current = null;
            }
        }, 800);
    };

    const handleCleanup = async () => {
        setShowCleanupModal(true);
    };

    const confirmCleanup = async () => {

        try {
            setIsLoading(true);
            await api.dennik.cleanupDennik(project.c_id || project.id);
            onClose();
            // Project list will refresh via AppDataContext if we trigger a reload or update state
        } catch (error) {
            console.error('Error cleaning up Denník:', error);
            alert(t('Failed to cleanup Denník'));
        } finally {
            setIsLoading(false);
        }
    };



    const handleStartTimer = async () => {
        // Check for global active timer first - BEFORE calling startTimer
        if (globalActiveTimer && globalActiveTimer.project_id !== (project.c_id || project.id)) {
            setShowBusyModal(true);
            return;
        }

        // Also safety check locally
        if (activeTimer) return;

        try {
            setIsLoading(true);
            const entry = await api.dennik.startTimer(
                project.c_id || project.id,
                selectedDate.toISOString().split('T')[0]
            );

            setActiveTimer(entry);
            await loadTimeEntries();
            await refreshActiveTimer();
        } catch (error) {
            console.error('Error starting timer:', error);
            alert(t('Failed to start timer'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndTimer = async () => {
        if (!activeTimer) return;
        try {
            setIsLoading(true);
            await api.dennik.endTimer(activeTimer.id);
            setActiveTimer(null);
            await loadTimeEntries();
            await refreshActiveTimer();
        } catch (error) {
            console.error('Error ending timer:', error);
            alert(t('Failed to end timer'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchUsers = async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await api.userProfiles.search(query);
            // Filter out users who are already members
            const memberIds = members.map(m => m.user_id);
            const filtered = results.filter(u =>
                !memberIds.includes(u.id) && u.id !== currentUser.id
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddMember = async (userId) => {
        try {
            await api.dennik.addProjectMember(project.c_id || project.id, userId);
            await loadMembers();
            setSearchQuery('');
            setSearchResults([]);

            // Enable dennik if not already enabled
            if (!project.is_dennik_enabled && !project.isDennikEnabled) {
                await api.dennik.enableDennik(project.c_id || project.id);
            }
        } catch (error) {
            console.error('Error adding member:', error);
            alert(t('Failed to add member'));
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm(t('Remove this member from the project?'))) return;
        try {
            await api.dennik.removeProjectMember(project.c_id || project.id, userId);
            await loadMembers();
        } catch (error) {
            console.error('Error removing member:', error);
            alert(t('Failed to remove member'));
        }
    };

    // Calendar helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const changeMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const formatTime = (dateString) => {
        if (!dateString) return '--:--';
        const date = new Date(dateString);
        return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (hours) => {
        if (!hours) return '0h';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const getTotalHours = () => {
        return timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    };

    const getElapsedTime = useCallback(() => {
        if (!activeTimer?.start_time) return '00:00:00';
        const start = new Date(activeTimer.start_time);
        const now = new Date();
        const diff = now - start;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [activeTimer]);

    // Update elapsed time every second when timer is active
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    useEffect(() => {
        if (activeTimer) {
            console.log('Starting timer interval. Start time:', activeTimer.start_time);
            setElapsedTime(getElapsedTime()); // Immediate update
            const interval = setInterval(() => {
                const time = getElapsedTime();
                setElapsedTime(time);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setElapsedTime('00:00:00');
        }
    }, [activeTimer, getElapsedTime]);

    if (!isOpen) return null;

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();
    };

    const isSelected = (day) => {
        return day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[800px] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {t('Denník')} - {project.name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {project.location}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOwner && (
                                <button
                                    onClick={handleCleanup}
                                    title={t('Cleanup Denník')}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-6 h-6" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('timer')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'timer'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            {t('Time Tracking')}
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'members'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            {t('Members')} ({members.length + (project.user_id ? 1 : 0)})
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'analytics'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            {t('Analytics')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'timer' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full p-2">
                            {/* Left Column: Calendar */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 h-fit">
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => changeMonth(-1)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h3 className="font-bold text-gray-900 dark:text-white">
                                        {currentMonth.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button
                                        onClick={() => changeMonth(1)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-gray-500 pb-2">
                                            {day}
                                        </div>
                                    ))}
                                    {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                }}
                                                className={`aspect-square rounded-lg text-sm font-medium transition-colors ${isSelected(day)
                                                    ? 'bg-blue-600 text-white'
                                                    : isToday(day)
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Column: Timer & Entries */}
                            <div className="space-y-6 overflow-y-auto pr-2 max-h-[700px]">
                                {/* Timer Controls */}
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-blue-100 text-sm mb-1">
                                                {selectedDate.toLocaleDateString('sk-SK', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}
                                            </p>
                                            <h3 className="text-3xl font-bold">
                                                {activeTimer ? elapsedTime : formatDuration(getTotalHours())}
                                            </h3>
                                            <p className="text-blue-100 text-sm mt-1">
                                                {activeTimer ? t('Active timer') : t('Total today')}
                                            </p>
                                        </div>
                                        <Timer className="w-12 h-12 opacity-50" />
                                    </div>

                                    <div className="flex gap-3">
                                        {!activeTimer ? (
                                            <button
                                                onClick={handleStartTimer}
                                                disabled={isLoading}
                                                className="flex-1 bg-white text-blue-600 px-6 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Play className="w-5 h-5" />
                                                {t('Start Timer')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEndTimer}
                                                disabled={isLoading}
                                                className="flex-1 bg-red-500 text-white px-6 py-4 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Square className="w-5 h-5" />
                                                {t('Stop Timer')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Time Entries */}
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                                        {t('Time Entries')}
                                    </h3>
                                    {timeEntries.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p>{t('No time entries for this date')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {Object.values(timeEntries
                                                .filter(entry => {
                                                    // Filter by selected date
                                                    if (!entry.date) return false;
                                                    const entryDate = new Date(entry.date).toDateString();
                                                    const current = selectedDate.toDateString();
                                                    return entryDate === current;
                                                })
                                                .reduce((acc, entry) => {
                                                    const userId = entry.user_id;
                                                    if (!acc[userId]) {
                                                        acc[userId] = {
                                                            userId,
                                                            profile: entry.profiles,
                                                            entries: [],
                                                            totalHours: 0
                                                        };
                                                    }
                                                    acc[userId].entries.push(entry);
                                                    acc[userId].totalHours += Number(entry.hours_worked || 0);
                                                    return acc;
                                                }, {}))
                                                .sort((a, b) => (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''))
                                                .map(group => (
                                                    <div key={group.userId} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                                        {group.profile?.full_name || group.profile?.email?.split('@')[0] || t('Unknown User')}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {group.profile?.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
                                                                {formatDuration(group.totalHours)}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-2">
                                                            {group.entries
                                                                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                                                                .map(entry => (
                                                                    <div
                                                                        key={entry.id}
                                                                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                                                <Clock className="w-4 h-4 text-gray-500" />
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-medium text-gray-900 dark:text-white">
                                                                                    {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                                                                                </div>
                                                                                {entry.notes && (
                                                                                    <div className="text-xs text-gray-500">{entry.notes}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                                            {formatDuration(entry.hours_worked)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'members' ? (
                        /* Members Tab */
                        <div className="space-y-6">
                            {/* Add Member Section (Owner Only) */}
                            {isOwner && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5" />
                                        {t('Add Member')}
                                    </h3>
                                    <input
                                        type="text"
                                        placeholder={t('Search by name or email...')}
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearchUsers(e.target.value);
                                        }}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => handleAddMember(user.id)}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {user.full_name || user.email}
                                                            </div>
                                                            {user.full_name && (
                                                                <div className="text-xs text-gray-500">{user.email}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <UserPlus className="w-4 h-4 text-blue-600" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Members List */}
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                                    {t('Project Members')}
                                </h3>
                                <div className="space-y-2">
                                    {/* Owner */}
                                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {ownerProfile?.full_name?.charAt(0) || ownerProfile?.email?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">
                                                    {ownerProfile?.full_name || ownerProfile?.email || t('Project Owner')}
                                                </div>
                                                {ownerProfile?.full_name && (
                                                    <div className="text-xs text-gray-500">{ownerProfile.email}</div>
                                                )}
                                                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                                                    {t('Owner')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Members */}
                                    {members.map(member => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                                    {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {member.profiles?.full_name || member.profiles?.email}
                                                    </div>
                                                    {member.profiles?.full_name && (
                                                        <div className="text-xs text-gray-500">{member.profiles.email}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {isOwner && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <UserMinus className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {members.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p>{t('No members added yet')}</p>
                                            {isOwner && <p className="text-sm mt-1">{t('Use the search above to add members')}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    ) : (
                        /* Analytics Tab */
                        <div className="space-y-6 h-full flex flex-col">
                            {/* Controls */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-2xl">
                                <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm">
                                    {['day', 'week', 'month'].map(view => (
                                        <button
                                            key={view}
                                            onClick={() => setAnalyticsView(view)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${analyticsView === view
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {t(view.charAt(0).toUpperCase() + view.slice(1))}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const d = new Date(analyticsDate);
                                            if (analyticsView === 'month') d.setMonth(d.getMonth() - 1);
                                            else if (analyticsView === 'week') d.setDate(d.getDate() - 7);
                                            else d.setDate(d.getDate() - 1);
                                            setAnalyticsDate(d);
                                        }}
                                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <span className="font-medium text-gray-900 dark:text-white min-w-[150px] text-center">
                                        {analyticsView === 'month'
                                            ? analyticsDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
                                            : analyticsDate.toLocaleDateString('sk-SK')
                                        }
                                    </span>
                                    <button
                                        onClick={() => {
                                            const d = new Date(analyticsDate);
                                            if (analyticsView === 'month') d.setMonth(d.getMonth() + 1);
                                            else if (analyticsView === 'week') d.setDate(d.getDate() + 7);
                                            else d.setDate(d.getDate() + 1);
                                            setAnalyticsDate(d);
                                        }}
                                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Total Hours */}
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('Total Hours')}</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={customHours !== null ? customHours : Number(analyticsEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0)).toFixed(2)}
                                        onChange={(e) => setCustomHours(e.target.value)}
                                        className="text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 rounded-lg px-2 py-1 w-full transition-all outline-none"
                                    />
                                </div>

                                {/* Hourly Rate */}
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('Hourly Rate')} (€)</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={hourlyRate}
                                        onChange={(e) => handleUpdateHourlyRate(e.target.value)}
                                        className="text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 rounded-lg px-2 py-1 w-full transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Total Amount */}
                                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('Total Amount')}</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {(
                                            (customHours !== null ? parseFloat(customHours) : analyticsEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0))
                                            * parseFloat(hourlyRate || 0)
                                        ).toFixed(2)} €
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Button - Restricted to Owner */}
                            {isOwner && (
                                <div className="mt-auto pt-4">
                                    <button
                                        onClick={handleGenerateInvoice}
                                        disabled={isGeneratingInvoice || (analyticsEntries.length === 0 && (!customHours || parseFloat(customHours) <= 0))}
                                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingInvoice ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                        {t('Generate Invoice')}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-2">
                                        {t('Generates PDF invoice for all hours in selected period')}
                                    </p>
                                </div>
                            )}

                            {!isOwner && (
                                <div className="mt-auto pt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-sm text-gray-500">
                                        {t('Only project owners can generate official invoices.')}
                                    </p>
                                </div>
                            )}

                            {/* List Generated Invoices */}
                            <div className="flex-1 overflow-y-auto min-h-[200px]">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('Generated Invoices')} ({generatedInvoices.length})</h4>
                                <div className="space-y-2">
                                    {generatedInvoices.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-4">{t('No invoices generated yet')}</p>
                                    ) : (
                                        generatedInvoices.map(invoice => (
                                            <button
                                                key={invoice.id}
                                                onClick={() => handlePreviewInvoice(invoice)}
                                                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {invoice.contractors?.name || t('Unknown Contractor')}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {invoice.notes || `${t('Invoice')} #${invoice.invoiceNumber}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {Number((invoice.priceWithoutVat || 0) + (invoice.cumulativeVat || 0)).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Invoice Detail Modal Overlay */}
                {selectedInvoice && (
                    <InvoiceDetailModal
                        isOpen={showInvoiceDetail}
                        onClose={() => {
                            setShowInvoiceDetail(false);
                            setSelectedInvoice(null);
                            loadInvoices(); // Refresh list in case of status update
                        }}
                        invoice={selectedInvoice}
                    />
                )}
            </div>

            {/* Custom Styled Alerts & Confirmations */}
            <ConfirmationModal
                isOpen={showBusyModal}
                onClose={() => setShowBusyModal(false)}
                onConfirm={() => setShowBusyModal(false)}
                title="Active Timer Busy"
                message={`${t('You already have an active timer on project')}: ${globalActiveTimer?.projects?.name || t('Unknown')}`}
                confirmLabel="OK"
                cancelLabel="Close"
                icon="info"
            />

            <ConfirmationModal
                isOpen={showCleanupModal}
                onClose={() => setShowCleanupModal(false)}
                onConfirm={confirmCleanup}
                title="Cleanup Denník"
                message="Are you sure you want to cleanup Denník for this project? This will delete all time entries and members, and reset the project Denník status."
                confirmLabel="Cleanup"
                cancelLabel="Cancel"
                isDestructive={true}
            />
        </div>
    );
};

export default DennikModal;
