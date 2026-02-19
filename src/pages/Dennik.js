import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen,
    Loader2,
    Users,
    ChevronDown,
    Clock,
    Check,
    X,
    Mail
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import { useNavigate } from 'react-router-dom';
import ConsolidatedInvoiceModal from '../components/ConsolidatedInvoiceModal';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import { FileText } from 'lucide-react';

const DAY_NAMES_SK = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const toLocalDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const FUTURE_DAYS = 60;
const INITIAL_DAYS = 60;
const LOAD_MORE_DAYS = 90;

const formatDuration = (hours) => {
    if (!hours) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const Dennik = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        clients,
        activeTimer
    } = useAppData();

    const [dennikProjects, setDennikProjects] = useState([]);
    const [entriesByDate, setEntriesByDate] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalDays, setTotalDays] = useState(INITIAL_DAYS);

    // Pending invitations state
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [processingInvitation, setProcessingInvitation] = useState(null);

    // Member filter state
    const [allMembers, setAllMembers] = useState([]); // unique members across all owned projects
    const [selectedMemberFilter, setSelectedMemberFilter] = useState(null); // null = all projects
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [memberEntriesByDate, setMemberEntriesByDate] = useState({}); // { date: { projectId: totalHours } }
    const filterDropdownRef = useRef(null);

    const sentinelRef = useRef(null);
    const todayRef = useRef(null);
    const scrollContainerRef = useRef(null);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate date range based on total days (past) + future days
    const getDateRange = useCallback((days) => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + FUTURE_DAYS);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return {
            startDate: toLocalDateStr(startDate),
            endDate: toLocalDateStr(endDate)
        };
    }, []);

    // Load dennik projects and their time entries
    const loadData = useCallback(async (days) => {
        try {
            const projects = await api.dennik.getDennikProjects();
            const validProjects = (projects || []).filter(p => p && (p.id || p.c_id));
            setDennikProjects(validProjects);

            if (validProjects.length > 0) {
                const projectIds = validProjects.map(p => p.id || p.c_id);
                const { startDate, endDate } = getDateRange(days);
                const entries = await api.dennik.getTimeEntriesForProjects(projectIds, startDate, endDate);

                const grouped = {};
                for (const entry of entries) {
                    if (!grouped[entry.date]) {
                        grouped[entry.date] = new Set();
                    }
                    grouped[entry.date].add(entry.project_id);
                }

                const result = {};
                for (const [date, projectIdSet] of Object.entries(grouped)) {
                    result[date] = Array.from(projectIdSet);
                }
                setEntriesByDate(result);

                // Load all members across owned projects for filter
                const ownedProjects = validProjects.filter(p => p.userRole === 'owner');
                if (ownedProjects.length > 0) {
                    const ownedIds = ownedProjects.map(p => p.id || p.c_id);
                    const members = await api.dennik.getAllMembersForProjects(ownedIds);

                    // Add current user (Owner) if not present
                    if (user?.id) {
                        const isPresent = members.some(m => m.id === user.id);
                        if (!isPresent) {
                            try {
                                const userProfile = await api.profiles.getProfile();
                                if (userProfile) {
                                    members.unshift({ ...userProfile, isOwner: true, member_name: t('Me (Owner)') });
                                }
                            } catch (e) { console.warn('Failed to load owner profile', e); }
                        } else {
                            // If present, mark/rename as needed? Or just let it be.
                        }
                    }

                    setAllMembers(members || []);
                }
            }
        } catch (error) {
            console.error('Error loading dennik data:', error);
        }
    }, [getDateRange, user?.id, t]);

    // Load member-specific entries when filter changes
    const loadMemberEntries = useCallback(async (memberId, days) => {
        if (!memberId) {
            setMemberEntriesByDate({});
            return;
        }
        try {
            const ownedProjects = dennikProjects.filter(p => p.userRole === 'owner');
            const projectIds = ownedProjects.map(p => p.id || p.c_id);
            if (projectIds.length === 0) return;

            const { startDate, endDate } = getDateRange(days);
            const entries = await api.dennik.getTimeEntriesForMember(projectIds, memberId, startDate, endDate);

            // Group by date -> project_id -> total hours
            const grouped = {};
            for (const entry of entries) {
                if (!grouped[entry.date]) {
                    grouped[entry.date] = {};
                }
                if (!grouped[entry.date][entry.project_id]) {
                    grouped[entry.date][entry.project_id] = 0;
                }
                grouped[entry.date][entry.project_id] += Number(entry.hours_worked || 0);
            }
            setMemberEntriesByDate(grouped);
        } catch (error) {
            console.error('Error loading member entries:', error);
        }
    }, [dennikProjects, getDateRange]);

    useEffect(() => {
        if (selectedMemberFilter) {
            loadMemberEntries(selectedMemberFilter, totalDays);
        } else {
            setMemberEntriesByDate({});
        }
    }, [selectedMemberFilter, totalDays, loadMemberEntries]);

    // Load pending invitations
    const loadPendingInvitations = useCallback(async () => {
        try {
            const invitations = await api.dennik.getPendingInvitations();
            setPendingInvitations(invitations);
        } catch (error) {
            console.error('Error loading pending invitations:', error);
        }
    }, []);

    // Accept invitation handler
    const handleAcceptInvitation = useCallback(async (invitation) => {
        setProcessingInvitation(invitation.id);
        try {
            await api.dennik.acceptInvitation(invitation.id);
            setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id));
            // Reload dennik projects since a new one was accepted
            await loadData(totalDays);
        } catch (error) {
            console.error('Error accepting invitation:', error);
        } finally {
            setProcessingInvitation(null);
        }
    }, [loadData, totalDays]);

    // Decline invitation handler
    const handleDeclineInvitation = useCallback(async (invitation) => {
        setProcessingInvitation(invitation.id);
        try {
            await api.dennik.declineInvitation(invitation.id);
            setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id));
        } catch (error) {
            console.error('Error declining invitation:', error);
        } finally {
            setProcessingInvitation(null);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([
                loadData(totalDays),
                loadPendingInvitations()
            ]);
            setIsLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Scroll to today after initial load
    useEffect(() => {
        if (!isLoading && todayRef.current && scrollContainerRef.current) {
            // Wait for DOM layout to complete before scrolling
            requestAnimationFrame(() => {
                if (todayRef.current && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const todayEl = todayRef.current;
                    const containerRect = container.getBoundingClientRect();
                    const todayRect = todayEl.getBoundingClientRect();
                    // Scroll so today appears with some offset below the sticky month header (~240px = 6 rows)
                    const offset = todayRect.top - containerRect.top + container.scrollTop - 240;
                    container.scrollTo({ top: offset });
                }
            });
        }
    }, [isLoading]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (isLoading || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore) {
                    setIsLoadingMore(true);
                    const newDays = totalDays + LOAD_MORE_DAYS;
                    setTotalDays(newDays);
                    loadData(newDays).finally(() => setIsLoadingMore(false));
                }
            },
            { root: scrollContainerRef.current, rootMargin: '200px' }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [isLoading, isLoadingMore, totalDays, loadData]);

    // Build project lookup map
    const projectMap = {};
    for (const p of dennikProjects) {
        projectMap[p.id || p.c_id] = p;
    }

    const getClientName = (project) => {
        const clientId = project?.clientId || project?.client_id;
        if (!clientId) return null;
        return clients?.find(c => c.id === clientId)?.name || null;
    };

    // Consolidated Invoice State
    const [showConsolidatedWizard, setShowConsolidatedWizard] = useState(false);
    const [showInvoiceCreation, setShowInvoiceCreation] = useState(false);
    const [consolidatedInvoiceData, setConsolidatedInvoiceData] = useState(null);

    const handleOpenConsolidatedWizard = () => {
        setShowConsolidatedWizard(true);
    };

    const handleWizardGenerate = (data) => {
        // data contains { items, ownerContractor, ownerId }
        setConsolidatedInvoiceData(data);
        setShowInvoiceCreation(true);
    };

    const handleInvoiceCreated = () => {
        // Refresh data??
        // Maybe not needed immediately as invoices are loaded in DennikModal
        setShowInvoiceCreation(false);
        setConsolidatedInvoiceData(null);
    };

    // Build ALL days from future through today back to totalDays ago
    const buildCalendarData = () => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + FUTURE_DAYS);
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - totalDays);

        const days = [];
        const current = new Date(end);

        while (current >= start) {
            const dateStr = toLocalDateStr(current);
            const projectIds = entriesByDate[dateStr] || [];
            const dayMemberHours = selectedMemberFilter ? memberEntriesByDate[dateStr] : null;

            days.push({
                date: dateStr,
                month: current.getMonth(),
                year: current.getFullYear(),
                dayName: DAY_NAMES_SK[current.getDay()],
                dayNum: current.getDate(),
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                projectIds,
                memberHours: dayMemberHours
            });

            current.setDate(current.getDate() - 1);
        }

        return days;
    };

    const calendarData = isLoading ? [] : buildCalendarData();

    // Member projects (assigned to user but not owned) - show above calendar
    const memberProjects = dennikProjects.filter(p => p.userRole && p.userRole !== 'owner');

    const getSelectedMemberName = () => {
        if (!selectedMemberFilter) return t('All projects');
        const member = allMembers.find(m => m.id === selectedMemberFilter);
        const displayName = member?.memberRecords?.[0]?.member_name || member?.member_name || member?.full_name || member?.email || t('Member');
        return displayName;
    };

    const renderCalendar = () => {
        if (dennikProjects.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-10 h-10 text-purple-600 dark:text-purple-400 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('No denník projects yet')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {t('Open any project and click the Denník button to get started')}
                    </p>
                </div>
            );
        }

        if (selectedMemberFilter && calendarData.length === 0) {
            return (
                <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">{t('No time entries found for this member')}</p>
                </div>
            );
        }

        const elements = [];
        let lastMonthKey = null;
        const today = toLocalDateStr(new Date());

        for (const day of calendarData) {
            const monthKey = `${day.year}-${day.month}`;

            // Month heading
            if (monthKey !== lastMonthKey) {
                lastMonthKey = monthKey;
                const monthName = new Date(day.year, day.month, 1).toLocaleDateString('sk-SK', {
                    month: 'long',
                    year: 'numeric'
                });
                elements.push(
                    <div key={`month-${monthKey}`} className="pt-5 pb-1.5 first:pt-0 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10 -mx-1 px-1 no-border">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                            {monthName}
                        </h2>
                    </div>
                );
            }

            const isToday = day.date === today;
            const hasProjects = day.projectIds.length > 0;

            elements.push(
                <div
                    key={day.date}
                    ref={isToday ? todayRef : undefined}
                    className={`flex items-center gap-3 min-h-[40px] border-b transition-colors pl-2
                        ${isToday
                            ? 'bg-blue-50/60 dark:bg-blue-900/15 -mx-2 pl-4 pr-2 rounded-lg border-blue-100 dark:border-blue-900/30'
                            : 'border-gray-50 dark:border-gray-800/40'}
                        ${day.isWeekend && !hasProjects ? 'opacity-40' : ''}
                    `}
                >
                    {/* Date column */}
                    <div className={`flex-shrink-0 w-12 flex items-center gap-1.5 py-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : hasProjects ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                        <span className="text-[11px] font-medium uppercase w-5">{day.dayName}</span>
                        <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                            {day.dayNum}
                        </span>
                    </div>

                    {/* Projects or empty */}
                    <div className="flex-1 flex flex-wrap gap-1.5 items-center min-w-0 py-1.5">
                        {day.projectIds.map(projectId => {
                            const project = projectMap[projectId];
                            if (!project) return null;

                            // In member filter mode, only show projects where this member has hours
                            const memberHoursForProject = day.memberHours?.[projectId];
                            if (selectedMemberFilter && !memberHoursForProject) return null;

                            const hasActiveTimer = activeTimer && activeTimer.project_id === projectId;

                            return (
                                <button
                                    key={projectId}
                                    onClick={() => {
                                        navigate('/projects', {
                                            state: {
                                                selectedProjectId: projectId,
                                                openDennik: true,
                                                dennikDate: day.date
                                            }
                                        });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm cursor-pointer active:scale-95"
                                >
                                    {hasActiveTimer && (
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                    )}
                                    <span className="truncate max-w-[140px] lg:max-w-[220px]">{project.name}</span>
                                    {selectedMemberFilter && memberHoursForProject ? (
                                        <span className="text-blue-500 dark:text-blue-400 text-xs font-semibold flex-shrink-0">
                                            {formatDuration(memberHoursForProject)}
                                        </span>
                                    ) : (
                                        (() => {
                                            const clientName = getClientName(project);
                                            return clientName ? (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs truncate max-w-[80px] hidden sm:inline">
                                                    {clientName}
                                                </span>
                                            ) : null;
                                        })()
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return elements;
    };

    return (
        <div className="flex flex-col overflow-hidden h-[calc(100dvh-1rem)] lg:h-[calc(100dvh-3rem)] -mb-24 lg:mb-0">
            {/* Header - stays fixed */}
            <div className="flex-shrink-0 pb-4 flex items-center justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Diary')}</h1>

                <button
                    onClick={handleOpenConsolidatedWizard}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-lg active:scale-[0.98]"
                >
                    <FileText className="w-4 h-4" />
                    {t('Invoice')}
                </button>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="flex-shrink-0 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('Pending invitations')}</span>
                        <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingInvitations.length}</span>
                    </div>
                    <div className="space-y-2">
                        {pendingInvitations.map(invitation => {
                            const projectName = invitation.projects?.name || t('Unknown project');
                            const ownerName = invitation.projects?.owner?.full_name || invitation.projects?.owner?.email || '';
                            const isProcessing = processingInvitation === invitation.id;

                            return (
                                <div
                                    key={invitation.id}
                                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                            {projectName}
                                        </p>
                                        {ownerName && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {ownerName} {t('invited you to project')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleDeclineInvitation(invitation)}
                                            disabled={isProcessing}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                                            title={t('Decline')}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleAcceptInvitation(invitation)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 active:scale-95"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5" />
                                            )}
                                            {t('Accept')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Member Filter */}
            {!isLoading && allMembers.length > 0 && (
                <div className="flex-shrink-0 pb-3">
                    <div className="relative" ref={filterDropdownRef}>
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Users className="w-4 h-4 text-purple-500" />
                            {getSelectedMemberName()}
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showFilterDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 animate-slide-in-top">
                                <button
                                    onClick={() => {
                                        setSelectedMemberFilter(null);
                                        setShowFilterDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${!selectedMemberFilter
                                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    {t('All projects')}
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                {allMembers.map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => {
                                            setSelectedMemberFilter(member.id);
                                            setShowFilterDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${selectedMemberFilter === member.id
                                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                                            {(member.member_name || member.full_name || member.email || '?').charAt(0)}
                                        </div>
                                        <span className="truncate">
                                            {member.member_name || member.full_name || member.email}
                                            {member.isOwner && !((member.member_name || '').includes(t('Owner'))) && (
                                                <span className="ml-1 text-xs text-blue-500 font-bold">({t('Owner')})</span>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Member Projects - projects assigned to you */}
            {!isLoading && !selectedMemberFilter && memberProjects.length > 0 && (
                <div className="flex-shrink-0 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('Assigned projects')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {memberProjects.map(project => {
                            const pid = project.id || project.c_id;
                            const clientName = getClientName(project);
                            const hasActiveTimer = activeTimer && activeTimer.project_id === pid;
                            return (
                                <button
                                    key={pid}
                                    onClick={() => {
                                        navigate('/projects', {
                                            state: {
                                                selectedProjectId: pid,
                                                openDennik: true
                                            }
                                        });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-all bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm cursor-pointer active:scale-95"
                                >
                                    {hasActiveTimer && (
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                    )}
                                    <span className="truncate max-w-[140px] lg:max-w-[220px]">{project.name}</span>
                                    {clientName && (
                                        <span className="text-purple-400 dark:text-purple-500 text-xs truncate max-w-[80px] hidden sm:inline">
                                            {clientName}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Calendar - scrolls independently */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24 lg:pb-0">
                    {renderCalendar()}

                    {/* Sentinel for infinite scroll + loading indicator */}
                    <div ref={sentinelRef} className="flex justify-center py-4">
                        {isLoadingMore && (
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <ConsolidatedInvoiceModal
                isOpen={showConsolidatedWizard}
                onClose={() => setShowConsolidatedWizard(false)}
                projects={dennikProjects}
                currentUser={user}
                onGenerateInvoice={handleWizardGenerate}
            />

            {showInvoiceCreation && consolidatedInvoiceData && (
                <InvoiceCreationModal
                    isOpen={showInvoiceCreation}
                    onClose={() => setShowInvoiceCreation(false)}
                    project={dennikProjects[0]} // Pass a dummy project for context (currency, etc.)
                    // We need to pass the "Client" which is the Owner's Contractor Profile
                    // InvoiceCreationModal normally expects "project" to have "client", or we pass "clientId"
                    // But here we might want to PRE-FILL the client form or selection.
                    // Let's pass the ownerContractor as initialClientData if supported?
                    // Actually, InvoiceCreationModal has logic to look up client.
                    // We might need to handle this in InvoiceCreationModal to accept `initialClientData`
                    dennikData={{ items: consolidatedInvoiceData.items }} // Correct prop name
                    initialClientContractor={consolidatedInvoiceData.ownerContractor} // New prop to handle
                    isStandalone={true}
                    onInvoiceCreated={handleInvoiceCreated}
                />
            )}

        </div>
    );
};

export default Dennik;
