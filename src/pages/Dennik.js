import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    ChevronRight,
    Loader2,
    Search,
    Trash2,
    X,
    CheckCircle,
    Flag
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import ProjectDetailView from '../components/ProjectDetailView';
import { useAuth } from '../context/AuthContext';
import { formatProjectNumber, PROJECT_STATUS } from '../utils/dataTransformers';
import ConfirmationModal from '../components/ConfirmationModal';

const Dennik = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const {
        calculateProjectTotalPrice,
        formatPrice,
        clients,
        activeTimer,
        loadProjectDetails
    } = useAppData();

    const [dennikProjects, setDennikProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [projectToCleanup, setProjectToCleanup] = useState(null);

    // Load dennik projects on mount
    useEffect(() => {
        loadDennikProjects();
    }, []);

    const loadDennikProjects = async () => {
        setIsLoading(true);
        try {
            const projects = await api.dennik.getDennikProjects();
            setDennikProjects(projects || []);
            // Load room details for each project so price calculation works
            if (projects && projects.length > 0) {
                await Promise.all(
                    projects.map(p => loadProjectDetails(p.id || p.c_id))
                );
            }
        } catch (error) {
            console.error('Error loading dennik projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenProject = async (project) => {
        setSelectedProject(project);
    };

    const handleBackToList = () => {
        setSelectedProject(null);
        loadDennikProjects(); // Refresh list
    };

    const handleCleanup = async () => {
        if (!projectToCleanup) return;
        try {
            await api.dennik.cleanupDennik(projectToCleanup.id || projectToCleanup.c_id);
            setShowCleanupModal(false);
            setProjectToCleanup(null);
            loadDennikProjects();
        } catch (error) {
            console.error('Error cleaning up dennik:', error);
            alert(t('Failed to cleanup Denník'));
        }
    };

    const getProjectMembers = (project) => {
        // Get members from the project_members join
        return project.project_members || [];
    };

    const isProjectOwner = (project) => {
        return project.user_id === user?.id;
    };

    // Filter projects by search query
    const filteredProjects = dennikProjects.filter(project => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            project.name?.toLowerCase().includes(query) ||
            project.notes?.toLowerCase().includes(query) ||
            formatProjectNumber(project)?.toLowerCase().includes(query)
        );
    });

    // If a project is selected, show ProjectDetailView
    if (selectedProject) {
        return (
            <ProjectDetailView
                project={selectedProject}
                onBack={handleBackToList}
                viewSource="dennik"
            />
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header Area */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Diary')}</h1>
                    </div>
                    {dennikProjects.length > 0 && (
                        <button
                            onClick={() => setDeleteMode(!deleteMode)}
                            className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${deleteMode ? 'bg-gray-600 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
                            title={t('Cleanup Denník')}
                        >
                            {deleteMode ? <X className="w-4 h-4 lg:w-5 lg:h-5" /> : <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />}
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('Search projects...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Projects List Container */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-10 h-10 text-purple-600 dark:text-purple-400 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {searchQuery ? t('No projects found') : t('No denník projects yet')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {searchQuery
                            ? t('Try a different search term')
                            : t('Open any project and click the Denník button to get started')}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredProjects.map(project => {
                        const isOwner = isProjectOwner(project);

                        return (
                            <div
                                key={project.id || project.c_id}
                                onClick={() => !deleteMode && handleOpenProject(project)}
                                className={`bg-white dark:bg-gray-800 rounded-2xl pl-4 pr-4 pt-4 pb-4 lg:p-6 border border-gray-200 dark:border-gray-700 flex items-center transition-all duration-300 shadow-sm min-w-0 w-full ${deleteMode
                                    ? 'border-red-200 dark:border-red-900/50 opacity-90 scale-[0.98] justify-between'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer'
                                    } relative`}
                            >
                                {deleteMode && isOwner && (
                                    <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 flex items-center justify-center backdrop-blur-[1px] z-10 transition-all animate-fade-in rounded-2xl">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProjectToCleanup(project);
                                                setShowCleanupModal(true);
                                            }}
                                            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2 transform hover:scale-[1.02] active:scale-95"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            {t('Remove')}
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">{formatProjectNumber(project) || project.id}</span>
                                        {isOwner ? (
                                            <span className="px-2 py-0.5 text-[10px] lg:text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-200 dark:border-purple-800">
                                                {t('Owner')}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-[10px] lg:text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800">
                                                {t('Employee')}
                                            </span>
                                        )}
                                        {activeTimer && activeTimer.project_id === (project.id || project.c_id) && (
                                            <div
                                                className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-red-500 animate-glow-red"
                                                title={t('Active Timer')}
                                            />
                                        )}
                                    </div>
                                    <h3 className="text-xl lg:text-3xl font-semibold text-gray-900 dark:text-white lg:truncate">
                                        <span className="lg:hidden">{project.name?.length > 17 ? `${project.name.substring(0, 17)}...` : project.name}</span>
                                        <span className="hidden lg:inline">{project.name}</span>
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base mt-1 truncate">
                                        {(project.clientId || project.client_id) ? clients?.find(c => c.id === (project.clientId || project.client_id))?.name || t('No client') : t('No client')}
                                    </p>
                                </div>

                                {!deleteMode && (
                                    <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0 ml-3">
                                        <div className="text-right">
                                            {/* Status Badge */}
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs lg:text-sm font-medium rounded-full mb-1 text-white"
                                                style={{
                                                    backgroundColor:
                                                        project.status === PROJECT_STATUS.FINISHED ? '#C4C4C4' :
                                                            project.status === PROJECT_STATUS.APPROVED ? '#73D38A' :
                                                                project.status === PROJECT_STATUS.SENT ? '#51A2F7' :
                                                                    '#FF857C'
                                                }}
                                            >
                                                {project.status === PROJECT_STATUS.FINISHED ? (
                                                    <>
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white">
                                                            <Flag className="w-2.5 h-2.5" style={{ color: '#C4C4C4' }} />
                                                        </span>
                                                        <span>{t('finished')}</span>
                                                    </>
                                                ) : project.status === PROJECT_STATUS.APPROVED ? (
                                                    <>
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white">
                                                            <CheckCircle className="w-2.5 h-2.5" style={{ color: '#73D38A' }} />
                                                        </span>
                                                        <span>{t('approved')}</span>
                                                    </>
                                                ) : project.status === PROJECT_STATUS.SENT ? (
                                                    <>
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white">
                                                            <span className="text-[10px] lg:text-xs font-bold" style={{ color: '#51A2F7' }}>?</span>
                                                        </span>
                                                        <span>{t('sent')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white">
                                                            <X className="w-2.5 h-2.5" style={{ color: '#FF857C' }} />
                                                        </span>
                                                        <span>{t('not sent')}</span>
                                                    </>
                                                )}
                                            </span>
                                            {/* Price */}
                                            <div className="font-semibold text-gray-900 dark:text-white text-base lg:text-lg">{formatPrice(calculateProjectTotalPrice(project.id || project.c_id, project))}</div>
                                            <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}


            {/* Modals */}
            {showCleanupModal && (
                <ConfirmationModal
                    isOpen={showCleanupModal}
                    onClose={() => {
                        setShowCleanupModal(false);
                        setProjectToCleanup(null);
                    }}
                    onConfirm={handleCleanup}
                    title={t('Cleanup Denník')}
                    message={t('This will permanently delete ALL time entries and members for this project. This project will then be removed from the Diary listing and will remain as a regular project.')}
                    confirmText={t('Delete All')}
                    variant="danger"
                />
            )}
        </div>
    );
};

export default Dennik;
