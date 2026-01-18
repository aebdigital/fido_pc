import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  Archive,
  ChevronDown
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ContractorProfileModal from '../components/ContractorProfileModal';
import ProjectDetailView from '../components/ProjectDetailView';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { formatProjectNumber, PROJECT_STATUS } from '../utils/dataTransformers';
import ConfirmationModal from '../components/ConfirmationModal';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    projectCategories,
    contractors,
    activeContractorId,
    setActiveContractor,
    addContractor,
    addProject,
    archiveProject,
    archivedProjects,
    calculateProjectTotalPrice,
    formatPrice,
    loadProjectDetails,
    getOrphanProjectCategories,
    hasOrphanProjects,
    clients
  } = useAppData();

  // Special state for viewing orphan projects (projects without contractor)
  const [viewingOrphanProjects, setViewingOrphanProjects] = useState(false);

  const [activeCategory, setActiveCategory] = useState('flats');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState(window.innerWidth < 1024 ? 'categories' : 'projects'); // 'categories', 'projects', 'details'
  const [viewSource, setViewSource] = useState('projects'); // 'projects' or 'archive'


  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectDeleteMode, setProjectDeleteMode] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);

  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const [filterYear, setFilterYear] = useState(() => {
    return localStorage.getItem('project_filter_year') || 'all';
  });

  // Load saved filter year from Supabase
  useEffect(() => {
    const loadFilterYear = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('project_filter_year')
          .eq('id', user.id)
          .single();

        if (data && data.project_filter_year) {
          setFilterYear(data.project_filter_year);
          localStorage.setItem('project_filter_year', data.project_filter_year);
        }
      } catch (error) {
        console.error('Error loading filter year:', error);
      }
    };

    loadFilterYear();
  }, [user?.id]);

  const handleYearChange = async (year) => {
    setFilterYear(year);
    localStorage.setItem('project_filter_year', year);
    setShowYearSelector(false);

    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ project_filter_year: year })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving filter year:', error);
      }
    }
  };
  const [showYearSelector, setShowYearSelector] = useState(false);

  // Ref for dropdown (used in header)
  const dropdownRef = useRef(null);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowContractorSelector(false);
      }
    };

    if (showContractorSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContractorSelector]);




  // Work properties and room types are now handled within ProjectDetailView
  // Keeping roomTypes here only if used by New Room Modal in this file (which we might have removed or not yet)
  // Actually roomTypes is used by showNewRoomModal which we are about to remove.
  // But for now, let's just replace workProperties.

  // const workProperties = ... -> removed


  const activeProjects = useMemo(() => {
    if (viewingOrphanProjects) {
      const orphanCategories = getOrphanProjectCategories();
      return orphanCategories.find(cat => cat.id === activeCategory)?.projects || [];
    }
    return projectCategories.find(cat => cat.id === activeCategory)?.projects || [];
  }, [projectCategories, activeCategory, viewingOrphanProjects, getOrphanProjectCategories]);

  // Get actual categories to display (normal or orphan)
  const displayCategories = useMemo(() => {
    if (viewingOrphanProjects) {
      return getOrphanProjectCategories();
    }
    return projectCategories;
  }, [projectCategories, viewingOrphanProjects, getOrphanProjectCategories]);
  const currentProject = selectedProject;

  // Sync selectedProject with updated data from appData to ensure ProjectDetailView gets fresh data
  useEffect(() => {
    if (selectedProject && projectCategories) {
      for (const category of projectCategories) {
        const found = category.projects?.find(p => p.id === selectedProject.id);
        if (found && found !== selectedProject) {
          setSelectedProject(found);
          break;
        }
      }
    }
  }, [projectCategories, selectedProject]);

  // Track which projects have been loaded to avoid re-fetching
  const loadedProjectsRef = useRef(new Set());

  // Preload project details (rooms and work items) for all visible projects in background
  useEffect(() => {
    const preloadProjectDetails = async () => {
      // Load details for all projects in the active category
      for (const project of activeProjects) {
        // Only load if not already loaded (tracked by ref to avoid infinite loops)
        if (!loadedProjectsRef.current.has(project.id)) {
          loadedProjectsRef.current.add(project.id);
          // Load in background without blocking UI
          loadProjectDetails(project.id).catch(err => {
            console.warn(`Failed to preload project ${project.id}:`, err);
            // Remove from loaded set so it can be retried
            loadedProjectsRef.current.delete(project.id);
          });
        }
      }
    };

    if (activeProjects.length > 0) {
      preloadProjectDetails();
    }
  }, [activeProjects, loadProjectDetails]);

  // Handle navigation reset when clicking on Projects in navigation
  useEffect(() => {
    if (location.state?.reset && !location.state?.selectedProjectId) {
      // Reset to default view when clicking Projects nav item
      setSelectedProject(null);
      setCurrentView(window.innerWidth < 1024 ? 'categories' : 'projects');
      setViewSource('projects');
      setViewingOrphanProjects(false);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.reset, location.state?.timestamp, location.state?.selectedProjectId]);

  // Handle navigation from clients page and invoices and archive
  useEffect(() => {
    if (location.state?.selectedProjectId) {
      const projectId = location.state.selectedProjectId;
      const client = location.state.selectedClient;
      const categoryId = location.state.selectedCategoryId;
      const fromArchive = location.state.fromArchive;

      if (fromArchive) {
        setViewSource('archive');
      } else {
        setViewSource('projects');
      }

      // Search in categories first (active projects)
      const categoriesToSearch = categoryId
        ? [projectCategories.find(c => c.id === categoryId), ...projectCategories.filter(c => c.id !== categoryId)]
        : projectCategories;

      let projectFound = false;

      for (const category of categoriesToSearch) {
        if (!category) continue;
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          setActiveCategory(category.id);
          setSelectedProject(project);
          setCurrentView('details');
          projectFound = true;
          break;
        }
      }

      // If not found in active categories, search in archived projects
      if (!projectFound && archivedProjects) {
        const project = archivedProjects.find(p => p.id === projectId);
        if (project) {
          // For archived projects, we might not set active category, or set it to original
          if (project.originalCategoryId) {
            setActiveCategory(project.originalCategoryId);
          }
          setSelectedProject(project);
          setCurrentView('details');
          projectFound = true;
        }
      }

      if (projectFound && client) {
        // Client selection is handled by ProjectDetailView or context if needed
        // setSelectedClientForProject(client); 
      }
    }
  }, [location.state, projectCategories, archivedProjects, setActiveCategory, setSelectedProject, setCurrentView]);

  const handleNewProject = async () => {
    if (newProjectName.trim()) {
      try {
        const newProject = await addProject(activeCategory, { name: newProjectName.trim() });

        setNewProjectName('');
        setShowNewProjectModal(false);

        // Automatically navigate to the new project
        setSelectedProject(newProject);
        setCurrentView('details');

        // Auto-show room options for newly created project - handled by user interaction now
        // setShowNewRoomModal(true);
      } catch (error) {
        console.error('Error creating project:', error);
        // Show user-friendly error message if available
        if (error.userFriendly) {
          alert(error.message);
        } else {
          alert('Failed to create project. Please try again.');
        }
      }
    }
  };



  const handleCloseNewProjectModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowNewProjectModal(false);
      setNewProjectName('');
      setIsClosingModal(false);
    }, 300);
  };



  const handleArchiveProject = (projectId) => {
    // Find project to get its name for confirmation
    const project = activeProjects.find(p => p.id === projectId);

    if (project) {
      setProjectToArchive(project);
    }
  };

  const confirmArchiveProject = () => {
    if (projectToArchive) {
      archiveProject(projectToArchive.category, projectToArchive.id);
      setProjectToArchive(null);
      // Exit delete mode after action
      setProjectDeleteMode(false);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setActiveCategory(categoryId);
    setSelectedProject(null);
    setCurrentView('projects');
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setCurrentView('details');

    // Load details asynchronously (optional here if ProjectDetailView also loads it, but good for pre-cache)
    // ProjectDetailView will handle displaying the specific details
    await loadProjectDetails(project.id);
  };

  const handleBackToProjects = () => {
    // Check both local state and location state for maximum robustness
    if (viewSource === 'archive' || location.state?.fromArchive) {
      navigate('/archive');
      // No need to reset viewSource here as component will unmount/navigate away
    } else {
      setCurrentView('projects');
      setSelectedProject(null);
    }
  };



  const toggleProjectDeleteMode = () => {
    setProjectDeleteMode(!projectDeleteMode);
  };







  // Contractor management handlers
  const handleCreateContractorProfile = () => {
    setShowContractorModal(true);
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      const newContractor = await addContractor(contractorData);
      setShowContractorModal(false);

      // Set this as active contractor if it's the first one
      if (contractors.length === 0 && newContractor) {
        setActiveContractor(newContractor.id);
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
      if (error.userFriendly) {
        alert(error.message);
      } else {
        alert('Failed to save contractor. Please try again.');
      }
    }
  };

  const handleContractorSelect = (contractorId) => {
    setViewingOrphanProjects(false);
    setActiveContractor(contractorId);
    setShowContractorSelector(false);
  };

  const handleViewOrphanProjects = () => {
    setViewingOrphanProjects(true);
    setShowContractorSelector(false);
  };

  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };



  return (
    <>
      <div className="pb-20 lg:pb-0 overflow-hidden w-full min-w-0">
        <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('Projekty')}</h1>

        {/* Contractor Profile Dropdown */}
        {(currentView === 'categories' || currentView === 'projects') && (
          <div className="mb-4 lg:mb-6 relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 bg-transparent"
              onClick={() => setShowContractorSelector(!showContractorSelector)}
            >
              {/* Mobile: truncated name */}
              <span className="text-4xl font-bold text-gray-900 dark:text-white lg:hidden">
                {(() => {
                  const name = viewingOrphanProjects ? t('Projects without contractor') : (getCurrentContractor()?.name || t('Select contractor'));
                  return name.length > 16 ? name.substring(0, 16) + '...' : name;
                })()}
              </span>
              {/* Desktop: full name */}
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden lg:inline">
                {viewingOrphanProjects ? t('Projects without contractor') : (getCurrentContractor()?.name || t('Select contractor'))}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            </button>

            {/* Contractor Dropdown */}
            {showContractorSelector && (
              <div className="absolute top-full left-0 mt-2 w-full max-w-xs lg:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-10 animate-slide-in-top">
                <div className="p-4 space-y-3">

                  {/* Create New Profile */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex flex-row items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                    onClick={handleCreateContractorProfile}>
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1">{t('New profile')}</h3>

                    </div>
                    <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Existing Contractors */}
                  {contractors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                        {t('Select contractor')}
                      </div>
                      {contractors.map(contractor => (
                        <div
                          key={contractor.id}
                          className={`p-3 rounded-xl cursor-pointer transition-colors ${activeContractorId === contractor.id && !viewingOrphanProjects
                            ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          onClick={() => handleContractorSelect(contractor.id)}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {contractor.name}
                          </div>
                          {contractor.email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {contractor.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Orphan Projects Option - only show if there are orphan projects */}
                  {hasOrphanProjects() && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${viewingOrphanProjects
                          ? 'bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-600'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        onClick={handleViewOrphanProjects}
                      >
                        <div className="font-medium text-amber-700 dark:text-amber-400">
                          {t('Projects without contractor')}
                        </div>
                        <div className="text-sm text-amber-600 dark:text-amber-500">
                          {t('Projects with deleted contractor')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:h-full overflow-hidden w-full">
          {/* Category Selection - Mobile: horizontal scroll, Desktop: sidebar - Hidden when viewing project details */}
          <div className={`lg:w-80 flex lg:flex-col w-screen lg:w-80 ${currentView === 'details' ? 'hidden' : currentView === 'categories' ? 'hidden lg:flex' : 'hidden lg:flex'}`} style={{ maxWidth: '100vw' }}>
            <div className="flex lg:flex-1 lg:flex-col overflow-x-auto lg:overflow-visible pl-2 pr-2 lg:px-6 py-4 space-x-2 lg:space-x-0 lg:space-y-3 scrollbar-hide" style={{ width: '100%' }}>
              {displayCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`flex-shrink-0 lg:w-full w-24 sm:w-28 rounded-2xl overflow-hidden transition-all duration-200 ${activeCategory === category.id
                    ? 'ring-2 ring-gray-500 dark:ring-gray-400 shadow-lg transform scale-105'
                    : 'hover:shadow-md'
                    }`}
                >
                  <div className="h-24 lg:h-32 relative shadow-lg">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3 flex justify-between items-end">
                      <h3 className="text-base lg:text-xl font-bold text-gray-900">{t(category.name)}</h3>
                      <span className="text-gray-900 text-xs lg:text-sm font-medium">{category.count} {t('projects')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Categories, Projects or Details */}
          <div className={`flex-1 flex flex-col min-w-0 ${currentView === 'details' ? 'w-full lg:flex-1' : ''}`}>
            {/* Category Selection View - Mobile Only */}
            {currentView === 'categories' && (
              <div className="pt-2 pb-4 lg:hidden min-w-0 w-full">
                <div className="space-y-4">
                  {displayCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="w-full h-56 rounded-3xl overflow-hidden transition-all duration-200 relative shadow-lg hover:shadow-xl"
                    >
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-900">{t(category.name)}</h3>
                        <span className="text-sm font-medium text-gray-900">{category.count} {t('projects')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Project List View */}
            {currentView === 'projects' && (
              <div className="pt-4 pb-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6 min-w-0 overflow-hidden w-full">
                {/* Project List Header */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => setCurrentView('categories')}
                        className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h2 className="text-lg sm:text-xl lg:text-3xl font-semibold text-gray-900 dark:text-white flex-1 min-w-0 truncate pr-2">
                        {t(displayCategories.find(cat => cat.id === activeCategory)?.name)} {t('Projekty')}
                      </h2>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!viewingOrphanProjects && (
                        <>
                          <button
                            onClick={toggleProjectDeleteMode}
                            className={`p-3 rounded-2xl flex items-center justify-center transition-colors ${projectDeleteMode
                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                              : 'bg-gray-500 text-white hover:bg-gray-600'
                              }`}
                          >
                            <Archive className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-sm sm:text-base"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Pridať projekt')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Projects List */}
                <div className="space-y-3 min-w-0 w-full relative">
                  {/* Year Filter Dropdown acting as Section Header */}
                  <div className="flex items-center gap-4 mb-4 relative z-20">
                    <div className="relative">
                      <button
                        onClick={() => setShowYearSelector(!showYearSelector)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white hover:opacity-70 transition-opacity border border-gray-900 dark:border-white rounded-xl px-3 py-1.5 no-gradient"
                      >
                        <span>{filterYear === 'all' ? t('Whenever') : filterYear}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {showYearSelector && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowYearSelector(false)}></div>
                          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 overflow-hidden animate-slide-in-top p-1 no-gradient">
                            <div className="space-y-0.5">
                              <button
                                onClick={() => handleYearChange('all')}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterYear === 'all' ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                              >
                                {t('Whenever')}
                              </button>
                              {(() => {
                                const years = [...new Set(activeProjects.map(p => {
                                  const date = new Date(p.created_at || p.createdAt || Date.now());
                                  return date.getFullYear();
                                }))].sort((a, b) => b - a);

                                return years.map(year => (
                                  <button
                                    key={year}
                                    onClick={() => handleYearChange(year.toString())}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterYear === year.toString() ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                  >
                                    {year}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const sortedProjects = [...activeProjects].sort((a, b) => {
                      const dateA = new Date(a.created_at || a.createdAt || 0);
                      const dateB = new Date(b.created_at || b.createdAt || 0);
                      return dateB - dateA;
                    });

                    const filteredProjects = sortedProjects.filter(project => {
                      if (filterYear === 'all') return true;
                      const date = new Date(project.created_at || project.createdAt || Date.now());
                      return date.getFullYear().toString() === filterYear;
                    });

                    return (
                      <div className="space-y-3">
                        {filteredProjects.map(project => (
                          <div
                            key={project.id}
                            className={`bg-white dark:bg-gray-800 rounded-2xl pl-4 pr-4 pt-4 pb-4 lg:p-6 border border-gray-200 dark:border-gray-700 flex items-center transition-all duration-300 shadow-sm min-w-0 w-full ${projectDeleteMode && !viewingOrphanProjects
                              ? 'justify-between'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer'
                              }`}
                            onClick={(projectDeleteMode && !viewingOrphanProjects) ? undefined : () => handleProjectSelect(project)}
                          >
                            <div className={`flex-1 transition-all duration-300 min-w-0 ${projectDeleteMode ? 'mr-4' : ''}`}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">{formatProjectNumber(project) || project.id}</span>
                              </div>
                              <h3 className="text-xl lg:text-3xl font-semibold text-gray-900 dark:text-white lg:truncate">
                                <span className="lg:hidden">{project.name.length > 17 ? `${project.name.substring(0, 17)}...` : project.name}</span>
                                <span className="hidden lg:inline">{project.name}</span>
                              </h3>
                              {/* Client name - visible on all screen sizes */}
                              <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base mt-1 truncate">
                                {project.clientId ? clients.find(c => c.id === project.clientId)?.name || t('No client') : t('No client')}
                              </p>
                            </div>

                            {projectDeleteMode && !viewingOrphanProjects ? (
                              <button
                                onClick={() => handleArchiveProject(project.id)}
                                className="bg-amber-100 hover:bg-amber-200 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5 flex-shrink-0 ml-3"
                              >
                                <Archive className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
                              </button>
                            ) : (
                              <div className="flex-shrink-0 ml-3">
                                {project.is_archived && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                                )}
                              </div>
                            )}

                            {/* Status and Price - Only show if NOT deleting */}
                            {!projectDeleteMode && (
                              <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0 ml-3">
                                <div className="text-right">
                                  {/* Status Badge */}
                                  <span className={`inline-block px-2 py-1 text-xs lg:text-sm font-medium rounded-full mb-1 ${project.status === PROJECT_STATUS.FINISHED
                                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                    : project.status === PROJECT_STATUS.APPROVED
                                      ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                                      : project.status === PROJECT_STATUS.SENT
                                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                                        : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                                    }`}>
                                    {t(project.status === PROJECT_STATUS.FINISHED ? 'finished'
                                      : project.status === PROJECT_STATUS.APPROVED ? 'approved'
                                        : project.status === PROJECT_STATUS.SENT ? 'sent'
                                          : 'not sent')}
                                  </span>
                                  {/* Price */}
                                  <div className="font-semibold text-gray-900 dark:text-white text-base lg:text-lg">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                                  <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {activeProjects.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>{t('No projects in this category yet.')}</p>
                  </div>
                )}
              </div >
            )}

            {/* Project Details View */}
            {
              currentView === 'details' && currentProject && (
                <ProjectDetailView
                  project={currentProject}
                  onBack={handleBackToProjects}
                  viewSource={viewSource}
                />
              )
            }
          </div >
        </div >

        {/* New Project Modal */}
        {
          showNewProjectModal && (
            <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-4 pt-20 md:pt-4 overflow-y-auto ${isClosingModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
              <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md my-auto md:my-0 ${isClosingModal ? 'animate-slide-out' : 'animate-slide-in'}`}>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('New Project')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium text-gray-900 dark:text-white mb-2">{t('Project Name')}</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder={t('Enter project name')}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500 text-lg"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      onClick={handleCloseNewProjectModal}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={handleNewProject}
                      disabled={!newProjectName.trim()}
                      className="flex-1 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {t('Create')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Modals specific to Project Details are now handled within ProjectDetailView */}

        {/* Contractor Profile Modal */}
        {
          showContractorModal && (
            <ContractorProfileModal
              onClose={() => setShowContractorModal(false)}
              onSave={handleSaveContractor}
            />
          )
        }
        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!projectToArchive}
          onClose={() => setProjectToArchive(null)}
          onConfirm={confirmArchiveProject}
          title={t('Archive project {name}?').replace('{name}', projectToArchive?.name || '')}
          message={t('Archiving this project will not result in data loss. You can find this project in the \'Archive\' tab in the app settings.')}
          confirmLabel="ArchiveProjectAction"
          cancelLabel="Cancel"
          confirmButtonClass="bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 text-white"
          icon={<Archive className="w-6 h-6 text-amber-500" />}
        />
      </div>

    </>
  );
};

export default Projects;