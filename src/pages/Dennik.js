import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    ChevronRight,
    Loader2,
    Clock,
    Users,
    Calendar,
    Search
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/supabaseApi';
import ProjectDetailView from '../components/ProjectDetailView';
import { useAuth } from '../context/AuthContext';
import { formatProjectNumber } from '../utils/dataTransformers';

const Dennik = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const {
        calculateProjectTotalPrice,
        formatPrice
    } = useAppData();

    const [dennikProjects, setDennikProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Load dennik projects on mount
    useEffect(() => {
        loadDennikProjects();
    }, []);

    const loadDennikProjects = async () => {
        setIsLoading(true);
        try {
            const projects = await api.dennik.getDennikProjects();
            setDennikProjects(projects || []);
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
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            Denník
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('Time tracking & project sharing')}
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mt-4">
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

            {/* Projects List */}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map(project => {
                        const members = getProjectMembers(project);
                        const isOwner = isProjectOwner(project);
                        const memberCount = members.length + 1; // +1 for owner

                        return (
                            <div
                                key={project.id || project.c_id}
                                onClick={() => handleOpenProject(project)}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                                {project.name}
                                            </h3>
                                            {isOwner && (
                                                <div className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs font-medium text-purple-600 dark:text-purple-400 flex-shrink-0">
                                                    {t('Owner')}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatProjectNumber(project)}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                                </div>

                                {/* Notes */}
                                {project.notes && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                        {project.notes}
                                    </p>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    {/* Members */}
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        <span>{memberCount}</span>
                                    </div>

                                    {/* Total Price */}
                                    {calculateProjectTotalPrice && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatPrice(calculateProjectTotalPrice(project.id || project.c_id, project))}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Badge */}
                                {memberCount > 1 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            {t('Shared')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info Footer */}
            {!isLoading && filteredProjects.length > 0 && (
                <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                {t('Track time and collaborate')}
                            </h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                {t('Click any project to track time, manage members, and view shared project details')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dennik;
