import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen,
    Loader2,
    Users
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import { useNavigate } from 'react-router-dom';

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

const Dennik = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const {
        clients,
        activeTimer
    } = useAppData();

    const [dennikProjects, setDennikProjects] = useState([]);
    const [entriesByDate, setEntriesByDate] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalDays, setTotalDays] = useState(INITIAL_DAYS);

    const sentinelRef = useRef(null);
    const todayRef = useRef(null);
    const scrollContainerRef = useRef(null);

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
            }
        } catch (error) {
            console.error('Error loading dennik data:', error);
        }
    }, [getDateRange]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadData(totalDays);
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

            days.push({
                date: dateStr,
                month: current.getMonth(),
                year: current.getFullYear(),
                dayName: DAY_NAMES_SK[current.getDay()],
                dayNum: current.getDate(),
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                projectIds
            });

            current.setDate(current.getDate() - 1);
        }

        return days;
    };

    const calendarData = isLoading ? [] : buildCalendarData();

    // Member projects (assigned to user but not owned) - show above calendar
    const memberProjects = dennikProjects.filter(p => p.userRole && p.userRole !== 'owner');

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
                            const clientName = getClientName(project);
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
                                    {clientName && (
                                        <span className="text-gray-400 dark:text-gray-500 text-xs truncate max-w-[80px] hidden sm:inline">
                                            {clientName}
                                        </span>
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
            <div className="flex-shrink-0 pb-4">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Diary')}</h1>
            </div>

            {/* Member Projects - projects assigned to you */}
            {!isLoading && memberProjects.length > 0 && (
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

        </div>
    );
};

export default Dennik;
