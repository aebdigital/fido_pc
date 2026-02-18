import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Clock, Play, Square, Users, UserPlus, UserMinus, Timer, ChevronLeft, ChevronRight, BarChart3, FileText, Pencil, Trash2, Plus, CalendarDays, MessageSquare, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import { useAppData } from '../context/AppDataContext';
import InvoiceDetailModal from './InvoiceDetailModal';
import InvoiceCreationModal from './InvoiceCreationModal';
import { transformInvoiceFromDB } from '../utils/dataTransformers';
import ConfirmationModal from './ConfirmationModal';
import Linkify from '../utils/linkify';
import MemberPermissionsModal from './MemberPermissionsModal';

const MemberRow = ({ member, timeEntries, project, isOwner, loadMembers, formatDuration, t, handleRemoveMember, handleResetName, onEditPermissions }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(member.member_name || member.profiles?.full_name || member.profiles?.email || '');

    const memberHours = timeEntries
        .filter(e => e.user_id === member.user_id)
        .reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);

    return (
        <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold flex-shrink-0">
                    {member.member_name?.charAt(0) || member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const pId = project.c_id || project.id;
                                        if (!pId || !member.user_id) {
                                            alert(t('Error: Missing ID'));
                                            return;
                                        }
                                        api.dennik.updateProjectMember(pId, member.user_id, { member_name: newName }, member.id)
                                            .then(() => {
                                                loadMembers();
                                                setIsEditingName(false);
                                            })
                                            .catch(err => {
                                                console.error('Rename error:', err);
                                                alert(t('Failed to rename member'));
                                            });
                                    }
                                }}
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={() => {
                                        const pId = project.c_id || project.id;
                                        if (!pId || !member.user_id) {
                                            alert(t('Error: Missing ID'));
                                            return;
                                        }
                                        api.dennik.updateProjectMember(pId, member.user_id, { member_name: newName }, member.id)
                                            .then(() => {
                                                loadMembers();
                                                setIsEditingName(false);
                                            })
                                            .catch(err => {
                                                console.error('Rename error:', err);
                                                alert(t('Failed to rename member'));
                                            });
                                    }}
                                    className="p-1 text-green-600 bg-green-100 rounded hover:bg-green-200"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingName(false);
                                        setNewName(member.member_name || member.profiles?.full_name || member.profiles?.email || '');
                                    }}
                                    className="p-1 text-red-600 bg-red-100 rounded hover:bg-red-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                                {member.member_name || member.profiles?.full_name || member.profiles?.email}
                            </div>
                            {isOwner && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        title={t('Rename Member')}
                                        className="p-1 text-gray-400 hover:text-blue-600"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                    {member.member_name && (
                                        <button
                                            onClick={() => handleResetName(member)}
                                            title={t('Reset Name')}
                                            className="p-1 text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {member.profiles?.email}
                    </div>
                </div>
            </div>
            {memberHours > 0 && (
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {formatDuration(memberHours)}
                </div>
            )}
            {!isEditingName && isOwner && (
                <div className="flex items-center gap-1 ml-2">
                    <button
                        onClick={() => onEditPermissions(member)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title={t('Edit Permissions')}
                    >
                        <Shield className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handleRemoveMember(member.user_id, member.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title={t('Remove Member')}
                    >
                        <UserMinus className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

const DennikModal = ({ isOpen, onClose, project, isOwner, currentUser, initialDate }) => {
    const { t } = useLanguage();
    const {
        activeContractor,
        activeTimer: globalActiveTimer,
        updateProject,
        refreshActiveTimer,
        priceOfferSettings,
        updatePriceOfferSettings
    } = useAppData();

    // State
    const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'members'
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
    const [currentMonth, setCurrentMonth] = useState(initialDate || new Date());
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
    const [isGeneratingInvoice] = useState(false);
    const [timeEntries, setTimeEntries] = useState([]);
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false); // eslint-disable-line no-unused-vars
    const [customHours, setCustomHours] = useState(null); // For testing/overriding
    const [ownerProfile, setOwnerProfile] = useState(null);
    const [showBusyModal, setShowBusyModal] = useState(false);

    // Analytics State
    const [analyticsView, setAnalyticsView] = useState('month'); // 'day', 'week', 'month'
    const [analyticsDate, setAnalyticsDate] = useState(new Date());
    const [analyticsEntries, setAnalyticsEntries] = useState([]);
    const [generatedInvoices, setGeneratedInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
    const [showInvoiceCreation, setShowInvoiceCreation] = useState(false);
    const [dennikInvoiceData, setDennikInvoiceData] = useState(null);
    const [ownerContractorData, setOwnerContractorData] = useState(null);
    const [activeDays, setActiveDays] = useState(new Set()); // days with time entries in current month
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualStartTime, setManualStartTime] = useState('08:00');
    const [manualEndTime, setManualEndTime] = useState('16:00');
    const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [pendingEditEntry, setPendingEditEntry] = useState(null);
    const [selectedMemberForEntry, setSelectedMemberForEntry] = useState(null); // owner creates entry for member
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState(null);
    const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
    const [pendingMemberToRemove, setPendingMemberToRemove] = useState(null);
    const [showResetNameConfirm, setShowResetNameConfirm] = useState(false);
    const [pendingMemberToReset, setPendingMemberToReset] = useState(null);
    const [pendingMemberToAssign, setPendingMemberToAssign] = useState(null);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [editingMemberPermissions, setEditingMemberPermissions] = useState(null);
    const hourlyRateTimerRef = useRef(null);
    const entryNoteTimerRef = useRef(null);

    // Check if invoice exists for current period (Month)
    const hasInvoiceForPeriod = useMemo(() => {
        return generatedInvoices.some(inv => {
            if (inv.invoiceType && inv.invoiceType !== 'regular') return false;
            const d = new Date(inv.issueDate);
            return d.getMonth() === analyticsDate.getMonth() &&
                d.getFullYear() === analyticsDate.getFullYear();
        });
    }, [generatedInvoices, analyticsDate]);

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

    const loadActiveDays = useCallback(async (month) => {
        try {
            const m = month || currentMonth;
            const firstDay = new Date(m.getFullYear(), m.getMonth(), 1);
            const lastDay = new Date(m.getFullYear(), m.getMonth() + 1, 0);
            const startDate = firstDay.toLocaleDateString('en-CA');
            const endDate = lastDay.toLocaleDateString('en-CA');

            const allEntries = await api.dennik.getTimeEntries(
                project.c_id || project.id,
                startDate,
                endDate
            );

            // Owner sees all days, member sees only their own
            const filtered = isOwner
                ? (allEntries || [])
                : (allEntries || []).filter(e => e.user_id === currentUser?.id);

            const days = new Set(filtered.map(e => e.date));
            setActiveDays(days);
        } catch (error) {
            console.error('Error loading active days:', error);
        }
    }, [currentMonth, project, isOwner, currentUser]);

    const loadOwnerContractor = useCallback(async () => {
        if (!project) return;
        try {
            // Use the project's contractor_id to get the correct owner contractor
            const contractorId = project.contractor_id || project.contractorId;
            if (contractorId) {
                const { data } = await api.supabase
                    .from('contractors')
                    .select('*')
                    .eq('c_id', contractorId)
                    .limit(1);
                if (data && data.length > 0) {
                    setOwnerContractorData(data[0]);
                    return;
                }
            }
            // Fallback: fetch by owner user_id (last created)
            if (project.user_id) {
                const { data } = await api.supabase
                    .from('contractors')
                    .select('*')
                    .eq('user_id', project.user_id)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (data && data.length > 0) {
                    setOwnerContractorData(data[0]);
                }
            }
        } catch (err) {
            console.warn('Could not fetch owner contractor:', err);
        }
    }, [project]);

    const loadData = useCallback(async () => {
        await Promise.all([
            loadMembers(),
            loadTimeEntries(),
            checkActiveTimer(),
            loadOwnerProfile(),
            loadOwnerContractor()
        ]);
    }, [loadMembers, loadTimeEntries, checkActiveTimer, loadOwnerProfile, loadOwnerContractor]);

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
            // 1. Fetch project-specific invoices
            const projectInvoices = await api.invoices.getInvoicesByProject(project.c_id || project.id);
            let combinedInvoices = [...(projectInvoices || [])];

            // 2. Fetch standalone invoices (Consolidated) - visible if they match this project's owner
            // Only relevant if we know who the owner is (ownerContractorData)
            // And we only look for invoices created by CURRENT USER (if member) 
            // because api.invoices.getAll() returns only user's invoices.
            // (If isOwner, getAll returns owner's invoices, but consolidated invoices are usually FROM member TO owner)
            // So this logic mainly serves the Member view as requested.
            if (currentUser?.id && ownerContractorData) {
                const allMyInvoices = await api.invoices.getAll();
                const standalone = (allMyInvoices || []).filter(inv => {
                    // Must be standalone (no project_id in DB)
                    // Note: API response might have project_id as null or missing
                    if (inv.project_id) return false;

                    // Client must match Owner's Contractor ID
                    // The API returns 'contractor_id' (Supplier) and joined 'clients' or we match invoice.client_id
                    // Check if 'client_id' matches matches ownerContractorData.id
                    // Note: inv might not have client_id property directly if it was joined? 
                    // Let's check api response structure. It usually has client_id column.
                    return inv.client_id === (ownerContractorData.c_id || ownerContractorData.id);
                });
                combinedInvoices = [...combinedInvoices, ...standalone];
            }

            // Deduplicate by ID
            const uniqueMap = new Map();
            combinedInvoices.forEach(inv => uniqueMap.set(inv.c_id || inv.id, inv));
            const uniqueInvoices = Array.from(uniqueMap.values());

            // Transform data for frontend compatibility (camelCase)
            let transformedData = uniqueInvoices.map(dbInv => ({
                ...transformInvoiceFromDB(dbInv),
                user_id: dbInv.user_id, // Preserve creator user ID
                contractors: dbInv.contractors // Preserve joined contractor data
            }));

            // Members can only see their own invoices, owners see all
            if (!isOwner && currentUser?.id) {
                transformedData = transformedData.filter(inv => inv.user_id === currentUser.id);
            }
            // Fetch creator profiles to show email
            if (transformedData.length > 0) {
                const userIds = [...new Set(transformedData.map(inv => inv.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                    try {
                        const profiles = await api.userProfiles.getByIds(userIds);
                        const profileMap = {};
                        (profiles || []).forEach(p => { profileMap[p.id] = p; });
                        transformedData = transformedData.map(inv => ({
                            ...inv,
                            creatorProfile: profileMap[inv.user_id] || null
                        }));
                    } catch (e) {
                        console.warn('Could not fetch creator profiles:', e);
                    }
                }
            }
            setGeneratedInvoices(transformedData);
        } catch (error) {
            console.error('Error loading project invoices:', error);
        }
    }, [project, isOwner, currentUser, ownerContractorData]);

    // Effects
    useEffect(() => {
        if (isOpen && project) {
            // ... existing loadData logic ...
            loadData();
            loadAnalyticsData();
            if (project.hourly_rate !== undefined && !hourlyRateTimerRef.current) {
                setHourlyRate(project.hourly_rate || priceOfferSettings?.defaultHourlyRate || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, project, loadData, loadAnalyticsData]); // removed loadInvoices from here to avoid loops if filtered dependencies change? No, should be fine.

    // Add specific effect for reloading invoices when ownerContractorData changes
    useEffect(() => {
        if (isOpen && project && activeTab === 'analytics') {
            loadInvoices();
        }
    }, [isOpen, project, activeTab, ownerContractorData, loadInvoices]);


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
        // Allow generating invoice if we have overridden hours, even if no entries exist
        if (!analyticsEntries.length && (!customHours || parseFloat(customHours) <= 0)) {
            alert(t('No time entries found for this period'));
            return;
        }

        // 1. Supplier check
        let supplier = activeContractor;
        if (!supplier) {
            const contractors = await api.contractors.getAll();
            if (contractors && contractors.length > 0) {
                supplier = contractors[0];
            }
        }
        if (!supplier) {
            alert(t('Please create a Contractor Profile in Settings first to generate invoices.'));
            return;
        }

        // 2. Customer = Project Owner's Contractor Profile (already loaded)
        const customer = ownerContractorData;

        // 3. Prepare the work item
        const calculatedTotalHours = analyticsEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
        const totalHours = customHours !== null ? parseFloat(customHours) : calculatedTotalHours;
        const amount = totalHours * parseFloat(hourlyRate || 0);
        const workItem = {
            id: crypto.randomUUID(),
            title: `${t('Work Hours')}${project?.name ? ` - ${project.name}` : ''}`,
            pieces: totalHours,
            pricePerPiece: parseFloat(hourlyRate || 0),
            price: amount,
            vat: 23,
            unit: 'h',
            category: 'work',
            active: true,
            taxObligationTransfer: false
        };

        // 4. Open the InvoiceCreationModal with pre-filled data
        setDennikInvoiceData({
            items: [workItem],
            ownerContractorId: customer?.c_id || customer?.id || null
        });
        setShowInvoiceCreation(true);
    };

    const handleUpdateHourlyRate = (value) => {
        setHourlyRate(value);

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

    const handleAddManualEntry = async () => {
        try {
            setIsLoading(true);
            // Use local date string instead of ISO to avoid one-day offset
            const dateStr = selectedDate.toLocaleDateString('en-CA');
            const startDateTime = new Date(`${dateStr}T${manualStartTime}:00`);
            const endDateTime = new Date(`${dateStr}T${manualEndTime}:00`);

            if (endDateTime <= startDateTime) {
                alert(t('End time must be after start time'));
                return;
            }

            const hoursWorked = (endDateTime - startDateTime) / 3600000;

            await api.dennik.createTimeEntry(project.c_id || project.id, {
                date: dateStr,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                hours_worked: hoursWorked
            });

            setShowManualEntry(false);
            await loadTimeEntries();
            await loadActiveDays(currentMonth);
        } catch (error) {
            console.error('Error adding manual entry:', error);
            alert(t('Failed to add time entry'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEntryNoteChange = (entryId, value) => {
        // Update local state immediately
        setTimeEntries(prev => prev.map(e => e.id === entryId ? { ...e, notes: value } : e));
        // Debounce save
        if (entryNoteTimerRef.current) clearTimeout(entryNoteTimerRef.current);
        entryNoteTimerRef.current = setTimeout(async () => {
            try {
                await api.dennik.updateTimeEntry(entryId, { notes: value });
            } catch (error) {
                console.error('Error saving entry note:', error);
            }
        }, 800);
    };

    const handleRequestDeleteEntry = (entryId) => {
        setPendingDeleteEntryId(entryId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDeleteEntry = async () => {
        if (!pendingDeleteEntryId) return;
        try {
            await api.dennik.deleteTimeEntry(pendingDeleteEntryId);
            await loadTimeEntries();
        } catch (error) {
            console.error('Error deleting time entry:', error);
            alert(t('Failed to delete time entry'));
        }
        setPendingDeleteEntryId(null);
    };

    // Timestamp editing - ask confirmation first
    const handleRequestEditTimestamp = (entry) => {
        setPendingEditEntry(entry);
        setShowEditConfirm(true);
    };

    const handleConfirmEditTimestamp = () => {
        if (!pendingEditEntry) return;
        const entry = pendingEditEntry;
        setEditingEntryId(entry.id);
        setEditStartTime(entry.start_time ? new Date(entry.start_time).toTimeString().slice(0, 5) : '');
        setEditEndTime(entry.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : '');
        setShowEditConfirm(false);
        setPendingEditEntry(null);
    };

    const handleSaveEditTimestamp = async (entryId) => {
        try {
            const entry = timeEntries.find(e => e.id === entryId);
            if (!entry) return;
            const dateStr = entry.date;
            const newStart = new Date(`${dateStr}T${editStartTime}:00`);
            const newEnd = editEndTime ? new Date(`${dateStr}T${editEndTime}:00`) : null;

            if (newEnd && newEnd <= newStart) {
                alert(t('End time must be after start time'));
                return;
            }

            const hoursWorked = newEnd ? (newEnd - newStart) / 3600000 : null;
            const updates = {
                start_time: newStart.toISOString(),
                ...(newEnd ? { end_time: newEnd.toISOString(), hours_worked: hoursWorked } : {})
            };

            await api.dennik.updateTimeEntry(entryId, updates);
            setEditingEntryId(null);
            await loadTimeEntries();
            await loadActiveDays(currentMonth);
        } catch (error) {
            console.error('Error updating time entry:', error);
            alert(t('Failed to update time entry'));
        }
    };

    const handleCancelEditTimestamp = () => {
        setEditingEntryId(null);
        setEditStartTime('');
        setEditEndTime('');
    };

    // Owner creates entry for a specific member
    const handleAddManualEntryForMember = async () => {
        try {
            setIsLoading(true);
            // Use local date string instead of ISO to avoid one-day offset
            const dateStr = selectedDate.toLocaleDateString('en-CA');
            const startDateTime = new Date(`${dateStr}T${manualStartTime}:00`);
            const endDateTime = new Date(`${dateStr}T${manualEndTime}:00`);

            if (endDateTime <= startDateTime) {
                alert(t('End time must be after start time'));
                return;
            }

            const hoursWorked = (endDateTime - startDateTime) / 3600000;
            const userId = selectedMemberForEntry || currentUser?.id;

            await api.dennik.createTimeEntry(project.c_id || project.id, {
                date: dateStr,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                hours_worked: hoursWorked,
                user_id: userId
            });

            setShowManualEntry(false);
            setSelectedMemberForEntry(null);
            await loadTimeEntries();
            await loadActiveDays(currentMonth);
        } catch (error) {
            console.error('Error adding manual entry:', error);
            alert(t('Failed to add time entry'));
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

    const handleAddMember = async (userId, permissions = null) => {
        try {
            await api.dennik.addProjectMember(project.c_id || project.id, userId, 'member', permissions);
            await loadMembers();
            setSearchQuery('');
            setSearchResults([]);
            setShowPermissionsModal(false);
            setPendingMemberToAssign(null);

            // Enable dennik if not already enabled
            if (!project.is_dennik_enabled && !project.isDennikEnabled) {
                await api.dennik.enableDennik(project.c_id || project.id);
            }
        } catch (error) {
            console.error('Error adding member:', error);
            alert(t('Failed to add member'));
        }
    };

    const handleConfirmEditPermissions = async (permissions) => {
        if (!editingMemberPermissions) return;
        try {
            setIsLoading(true);
            await api.dennik.updateProjectMember(
                project.c_id || project.id,
                editingMemberPermissions.user_id,
                { permissions },
                editingMemberPermissions.id
            );
            await loadMembers();
            setEditingMemberPermissions(null);
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert(t('Failed to update permissions'));
        } finally {
            setIsLoading(false);
        }
    };



    const handleRemoveMember = (userId, rowId = null) => {
        setPendingMemberToRemove({ userId, rowId });
        setShowRemoveMemberConfirm(true);
    };

    const handleConfirmRemoveMember = async () => {
        if (!pendingMemberToRemove) return;
        const { userId, rowId } = pendingMemberToRemove;

        try {
            await api.dennik.removeProjectMember(project.c_id || project.id, userId, rowId);
            await loadMembers();
        } catch (error) {
            console.error('Error removing member:', error);
            alert(t('Failed to remove member'));
        } finally {
            setShowRemoveMemberConfirm(false);
            setPendingMemberToRemove(null);
        }
    };

    const handleResetName = (member) => {
        setPendingMemberToReset(member);
        setShowResetNameConfirm(true);
    };

    const handleConfirmResetName = async () => {
        if (!pendingMemberToReset) return;

        try {
            await api.dennik.updateProjectMember(project.c_id || project.id, pendingMemberToReset.user_id, { member_name: null }, pendingMemberToReset.id);
            await loadMembers();
        } catch (error) {
            console.error('Error resetting member name:', error);
            alert(t('Failed to reset member name'));
        } finally {
            setShowResetNameConfirm(false);
            setPendingMemberToReset(null);
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

    // Load active days when month changes
    useEffect(() => {
        if (isOpen && project) {
            loadActiveDays(currentMonth);
        }
    }, [isOpen, currentMonth, project, loadActiveDays]);

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
        const dateStr = selectedDate.toLocaleDateString('en-CA');
        return timeEntries
            .filter(entry => entry.date === dateStr)
            .reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
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
    const isSelectedToday = selectedDate.toDateString() === new Date().toDateString();
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 lg:p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[100dvh] sm:h-[75dvh] lg:h-[85dvh] max-h-[100dvh] sm:max-h-[calc(100dvh-6rem)] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                                {t('Denník')}
                                <span className="text-gray-400 dark:text-gray-500 font-normal"> — </span>
                                <span className="text-gray-400 dark:text-gray-500 font-normal inline-block max-w-[13ch] lg:max-w-none truncate align-bottom">{project.name}</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {project.location}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('timer')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-medium transition-colors ${activeTab === 'timer'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            {t('Time Tracking')}
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-medium transition-colors ${activeTab === 'members'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            {t('Members')} ({members.length + (project.user_id ? 1 : 0)})
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-medium transition-colors ${activeTab === 'analytics'
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
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    {activeTab === 'timer' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Column: Calendar */}
                            {/* Mobile: compact date selector */}
                            <div className="md:hidden">
                                <button
                                    onClick={() => setMobileCalendarOpen(!mobileCalendarOpen)}
                                    className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-2xl p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {selectedDate.toLocaleDateString('sk-SK', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${mobileCalendarOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {mobileCalendarOpen && (
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 mt-2 animate-fade-in">
                                        <div className="flex items-center justify-between mb-4">
                                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <h3 className="font-bold text-gray-900 dark:text-white">
                                                {currentMonth.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
                                                <div key={day} className="text-center text-xs font-medium text-gray-500 pb-2">{day}</div>
                                            ))}
                                            {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                                                <div key={`empty-${i}`} />
                                            ))}
                                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                                const day = i + 1;
                                                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const hasActivity = activeDays.has(dateStr);
                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => {
                                                            const newDate = new Date(currentMonth);
                                                            newDate.setDate(day);
                                                            setSelectedDate(newDate);
                                                            setMobileCalendarOpen(false);
                                                        }}
                                                        className={`aspect-square rounded-lg text-sm font-medium transition-colors relative flex flex-col items-center justify-center ${isSelected(day)
                                                            ? 'bg-blue-600 text-white'
                                                            : isToday(day)
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                            }`}
                                                    >
                                                        {day}
                                                        {hasActivity && (
                                                            <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-[1px] ${isSelected(day) ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'}`} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desktop: full calendar */}
                            <div className="hidden md:block bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 h-fit md:sticky md:top-0 md:self-start">
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
                                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const hasActivity = activeDays.has(dateStr);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                }}
                                                className={`aspect-square rounded-lg text-sm font-medium transition-colors relative flex flex-col items-center justify-center ${isSelected(day)
                                                    ? 'bg-blue-600 text-white'
                                                    : isToday(day)
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {day}
                                                {hasActivity && (
                                                    <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-[1px] ${isSelected(day) ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Column: Timer & Entries */}
                            <div className="space-y-4">
                                {/* Timer Controls */}
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                                    <div className="flex items-center justify-between mb-3">
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
                                            <>
                                                {isSelectedToday ? (
                                                    <button
                                                        onClick={handleStartTimer}
                                                        disabled={isLoading}
                                                        className="flex-1 bg-white text-blue-600 px-4 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Play className="w-5 h-5" />
                                                        {t('Start Timer')}
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 bg-white/20 text-white/70 px-4 py-3 rounded-xl font-medium text-center text-sm">
                                                        {t('Timer available only for today')}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setShowManualEntry(!showManualEntry)}
                                                    className="bg-white/20 text-white px-4 py-3 rounded-xl font-bold hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleEndTimer}
                                                disabled={isLoading}
                                                className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Square className="w-5 h-5" />
                                                {t('Stop Timer')}
                                            </button>
                                        )}
                                    </div>

                                    {/* Manual Entry Form */}
                                    {showManualEntry && !activeTimer && (
                                        <div className="mt-3 bg-white/10 rounded-xl p-3 space-y-3">
                                            {/* Member selector for owner */}
                                            {isOwner && members.length > 0 && (
                                                <div>
                                                    <label className="text-xs text-blue-100 mb-1 block">{t('Create for')}</label>
                                                    <select
                                                        value={selectedMemberForEntry || ''}
                                                        onChange={(e) => setSelectedMemberForEntry(e.target.value || null)}
                                                        className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                                                    >
                                                        <option value="">{currentUser?.full_name || currentUser?.email || t('Myself')}</option>
                                                        {members.map(m => (
                                                            <option key={m.user_id} value={m.user_id}>
                                                                {m.profiles?.full_name || m.profiles?.email || t('Member')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="text-xs text-blue-100 mb-1 block">{t('Start')}</label>
                                                    <input
                                                        type="time"
                                                        value={manualStartTime}
                                                        onChange={(e) => setManualStartTime(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-blue-100 mb-1 block">{t('End')}</label>
                                                    <input
                                                        type="time"
                                                        value={manualEndTime}
                                                        onChange={(e) => setManualEndTime(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={selectedMemberForEntry ? handleAddManualEntryForMember : handleAddManualEntry}
                                                disabled={isLoading}
                                                className="w-full bg-white text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Plus className="w-4 h-4" />
                                                {t('Add Entry')}
                                            </button>
                                        </div>
                                    )}
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
                                            {(() => {
                                                // Build groups from time entries
                                                const groups = Object.values(timeEntries
                                                    .filter(entry => {
                                                        if (!entry.date) return false;
                                                        // Robust comparison using local YYYY-MM-DD strings
                                                        const entryDateStr = typeof entry.date === 'string'
                                                            ? entry.date
                                                            : new Date(entry.date).toLocaleDateString('en-CA');
                                                        const currentStr = selectedDate.toLocaleDateString('en-CA');
                                                        return entryDateStr === currentStr;
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
                                                    }, {}));

                                                // Visibility: members see only their own, owner sees all
                                                const visibleGroups = isOwner
                                                    ? groups
                                                    : groups.filter(g => g.userId === currentUser?.id);

                                                return visibleGroups
                                                    .sort((a, b) => (a.profile?.full_name || '').localeCompare(b.profile?.full_name || ''))
                                                    .map(group => {
                                                        return (
                                                            <div key={group.userId} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
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

                                                                {group.entries.length > 0 && (
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {group.entries
                                                                            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                                                                            .map(entry => {
                                                                                const isOwnEntry = entry.user_id === currentUser?.id;
                                                                                return (
                                                                                    <div
                                                                                        key={entry.id}
                                                                                        className="group p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                                                    >
                                                                                        <div className="flex items-center justify-between">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                                                                </div>
                                                                                                {editingEntryId === entry.id ? (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <input
                                                                                                            type="time"
                                                                                                            value={editStartTime}
                                                                                                            onChange={(e) => setEditStartTime(e.target.value)}
                                                                                                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                                                                        />
                                                                                                        <span className="text-gray-400">-</span>
                                                                                                        <input
                                                                                                            type="time"
                                                                                                            value={editEndTime}
                                                                                                            onChange={(e) => setEditEndTime(e.target.value)}
                                                                                                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                                                                        />
                                                                                                        <button
                                                                                                            onClick={() => handleSaveEditTimestamp(entry.id)}
                                                                                                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                                                                                                        >
                                                                                                            {t('Save')}
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={handleCancelEditTimestamp}
                                                                                                            className="px-2.5 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                                                                                        >
                                                                                                            {t('Cancel')}
                                                                                                        </button>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        onClick={() => (isOwnEntry || isOwner) ? handleRequestEditTimestamp(entry) : null}
                                                                                                        className={`font-medium text-gray-900 dark:text-white ${(isOwnEntry || isOwner) ? 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer' : ''}`}
                                                                                                    >
                                                                                                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                                                                    {formatDuration(entry.hours_worked)}
                                                                                                </div>
                                                                                                {(isOwnEntry || isOwner) && (
                                                                                                    <button
                                                                                                        onClick={() => handleRequestDeleteEntry(entry.id)}
                                                                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                                                                                                        title={t('Delete')}
                                                                                                    >
                                                                                                        <Trash2 className="w-4 h-4" />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Per-entry note */}
                                                                                        {(isOwnEntry || isOwner) ? (
                                                                                            <div className="mt-2 flex items-start gap-2">
                                                                                                <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-1.5 flex-shrink-0" />
                                                                                                <div className="flex-1">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={entry.notes || ''}
                                                                                                        onChange={(e) => handleEntryNoteChange(entry.id, e.target.value)}
                                                                                                        placeholder={t('Add note...')}
                                                                                                        className="w-full text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 outline-none placeholder-gray-400 transition-colors"
                                                                                                    />
                                                                                                    {entry.notes && /https?:\/\//.test(entry.notes) && (
                                                                                                        <div className="mt-1 text-xs">
                                                                                                            <Linkify>{entry.notes}</Linkify>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : entry.notes ? (
                                                                                            <div className="mt-2 flex items-start gap-2">
                                                                                                <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                                                                                <span className="text-xs text-gray-500"><Linkify>{entry.notes}</Linkify></span>
                                                                                            </div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                            })()}
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
                                                    onClick={() => {
                                                        setPendingMemberToAssign(user);
                                                        setShowPermissionsModal(true);
                                                    }}
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
                                    {(() => {
                                        const ownerHours = timeEntries
                                            .filter(e => e.user_id === (project.user_id || project.owner_id))
                                            .reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
                                        return (
                                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                        {ownerProfile?.full_name?.charAt(0) || ownerProfile?.email?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {ownerProfile?.full_name || ownerProfile?.email || t('Project Owner')}
                                                        </div>
                                                        {ownerProfile?.email && (
                                                            <div className="text-xs text-gray-500">{ownerProfile.email}</div>
                                                        )}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                                                            {t('Owner')}
                                                        </div>
                                                    </div>
                                                </div>
                                                {ownerHours > 0 && (
                                                    <div className="text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
                                                        {formatDuration(ownerHours)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Members */}
                                    {members.map(member => (
                                        <MemberRow
                                            key={member.id}
                                            member={member}
                                            timeEntries={timeEntries}
                                            project={project}
                                            isOwner={isOwner}
                                            loadMembers={loadMembers}
                                            formatDuration={formatDuration}
                                            t={t}
                                            handleRemoveMember={handleRemoveMember}
                                            handleResetName={handleResetName}
                                            onEditPermissions={(m) => setEditingMemberPermissions(m)}
                                        />
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-2xl">
                                <div className="flex">
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

                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => {
                                            const d = new Date(analyticsDate);
                                            if (analyticsView === 'month') d.setMonth(d.getMonth() - 1);
                                            else if (analyticsView === 'week') d.setDate(d.getDate() - 7);
                                            else d.setDate(d.getDate() - 1);
                                            setAnalyticsDate(d);
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <span className="font-medium text-gray-900 dark:text-white min-w-[180px] text-center">
                                        {analyticsView === 'month'
                                            ? analyticsDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
                                            : analyticsView === 'week'
                                                ? (() => {
                                                    const d = new Date(analyticsDate);
                                                    const day = d.getDay();
                                                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                                                    const monday = new Date(d);
                                                    monday.setDate(diff);
                                                    const sunday = new Date(monday);
                                                    sunday.setDate(monday.getDate() + 6);
                                                    const thursd = new Date(monday);
                                                    thursd.setDate(monday.getDate() + 3);
                                                    const yearStart = new Date(thursd.getFullYear(), 0, 1);
                                                    const weekNum = Math.ceil((((thursd - yearStart) / 86400000) + 1) / 7);
                                                    return `T${weekNum}/${monday.getDate()}-${sunday.getDate()}.${sunday.getMonth() + 1}.${sunday.getFullYear()}`;
                                                })()
                                                : `${analyticsDate.getDate()}.${analyticsDate.getMonth() + 1}.${analyticsDate.getFullYear()}`
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
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
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

                            {/* Invoice Button */}
                            <div className="mt-auto pt-4">
                                <button
                                    onClick={handleGenerateInvoice}
                                    disabled={isGeneratingInvoice || (analyticsEntries.length === 0 && (!customHours || parseFloat(customHours) <= 0)) || hasInvoiceForPeriod}
                                    className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white py-3 px-4 rounded-2xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingInvoice ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    <span className="text-sm sm:text-lg">{t('Create Invoice')}</span>
                                </button>
                                {hasInvoiceForPeriod && (
                                    <p className="text-red-500 text-sm mt-2 text-center font-medium opacity-80 animate-fade-in">
                                        {t('Invoice already exists for this period')}
                                    </p>
                                )}
                            </div>

                            {/* List Generated Invoices */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('Generated Invoices')} ({generatedInvoices.length})</h4>
                                <div className="space-y-2">
                                    {generatedInvoices.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-4">{t('No invoices generated yet')}</p>
                                    ) : (
                                        generatedInvoices.map(invoice => {
                                            // Determine display name for invoice creator
                                            const creatorMember = members.find(m => m.user_id === invoice.user_id);
                                            const displayName = creatorMember?.member_name || invoice.creatorProfile?.email || invoice.contractors?.email || invoice.contractors?.name || t('Unknown Contractor');

                                            return (
                                                <button
                                                    key={invoice.id}
                                                    onClick={() => handlePreviewInvoice(invoice)}
                                                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">
                                                            {`${t('Invoice')} #${invoice.invoiceNumber}`}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {displayName}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {Number((invoice.priceWithoutVat || 0) + (invoice.cumulativeVat || 0)).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} €
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </button>
                                            );
                                        })
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
                        dennikOwnerContractor={ownerContractorData}
                    />
                )}

                {/* Invoice Creation Modal for Denník */}
                {showInvoiceCreation && dennikInvoiceData && (
                    <InvoiceCreationModal
                        isOpen={showInvoiceCreation}
                        onClose={(result) => {
                            setShowInvoiceCreation(false);
                            setDennikInvoiceData(null);
                            if (result) {
                                loadInvoices(); // Refresh list after creation
                            }
                        }}
                        project={project}
                        categoryId={typeof project.category === 'object' ? project.category.id : project.category}
                        dennikData={dennikInvoiceData}
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

            {/* Edit Timestamp Confirmation */}
            <ConfirmationModal
                isOpen={showEditConfirm}
                onClose={() => { setShowEditConfirm(false); setPendingEditEntry(null); }}
                onConfirm={handleConfirmEditTimestamp}
                title={t('Edit Timestamp')}
                message={t('Are you sure you want to edit this time entry?')}
                confirmLabel={t('Edit')}
                cancelLabel={t('Cancel')}
                icon="warning"
            />

            {/* Delete Timestamp Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setPendingDeleteEntryId(null); }}
                onConfirm={handleConfirmDeleteEntry}
                title={t('Delete Entry')}
                message={t('Are you sure you want to delete this time entry?')}
                confirmLabel={t('Delete')}
                cancelLabel={t('Cancel')}
                isDestructive={true}
            />

            {/* Delete Member Confirmation */}
            <ConfirmationModal
                isOpen={showRemoveMemberConfirm}
                onClose={() => { setShowRemoveMemberConfirm(false); setPendingMemberToRemove(null); }}
                onConfirm={handleConfirmRemoveMember}
                title={t('Remove Member')}
                message={t('Are you sure you want to remove this member from the project?')}
                confirmLabel={t('Remove')}
                cancelLabel={t('Cancel')}
                isDestructive={true}
            />

            <ConfirmationModal
                isOpen={showResetNameConfirm}
                onClose={() => { setShowResetNameConfirm(false); setPendingMemberToReset(null); }}
                onConfirm={handleConfirmResetName}
                title={t('Reset Name')}
                message={t('Are you sure you want to reset the name to original?')}
                confirmLabel={t('Reset')}
                cancelLabel={t('Cancel')}
                isDestructive={true}
            />

            <MemberPermissionsModal
                isOpen={showPermissionsModal}
                onClose={() => {
                    setShowPermissionsModal(false);
                    setPendingMemberToAssign(null);
                }}
                user={pendingMemberToAssign}
                onConfirm={(permissions) => pendingMemberToAssign && handleAddMember(pendingMemberToAssign.id, permissions)}
                isLoading={isLoading}
            />

            <MemberPermissionsModal
                key={editingMemberPermissions ? `edit-${editingMemberPermissions.id}` : 'edit-none'}
                isOpen={!!editingMemberPermissions}
                onClose={() => setEditingMemberPermissions(null)}
                user={editingMemberPermissions?.profiles}
                initialPermissions={editingMemberPermissions?.permissions}
                onConfirm={handleConfirmEditPermissions}
                confirmLabel={t('Save')}
                isLoading={isLoading}
            />
        </div>
    );
};

export default DennikModal;
