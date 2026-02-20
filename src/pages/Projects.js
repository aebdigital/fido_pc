import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  Archive,
  ChevronDown,
  RefreshCw,
  X,
  CheckCircle,
  Flag,
  Clock,
  FileText
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ContractorProfileModal from '../components/ContractorProfileModal';
import ProjectDetailView from '../components/ProjectDetailView';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/supabaseApi';

import { formatProjectNumber, PROJECT_STATUS } from '../utils/dataTransformers';
import ConfirmationModal from '../components/ConfirmationModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import { useScrollLock } from '../hooks/useScrollLock';

const LiveTimer = ({ startTime, onClick, className = "", size = "normal" }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const calculate = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = Math.max(0, now - start);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    setElapsed(calculate());
    const interval = setInterval(() => setElapsed(calculate()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (size === "small") {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] sm:text-xs font-black rounded-lg shadow-sm animate-glow-red cursor-pointer ${className}`}
      >
        <Clock className="w-3 h-3" />
        <span>{elapsed}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`absolute top-2 right-2 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-1.5 animate-glow-red border-2 border-white dark:border-gray-800 cursor-pointer ${className}`}
    >
      <Clock className="w-4 h-4" />
      <span>{elapsed}</span>
    </div>
  );
};

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

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
    clients,
    projectFilterYear: filterYear,
    updateProjectFilterYear,
    activeTimer,
    quickTravelToDennik,
    findProjectById,
    invoices,
    calculateProjectTotalPriceWithBreakdown
  } = useAppData();

  // Unpaid invoices - latest first
  const unpaidInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    return invoices
      .filter(inv => inv.status !== 'paid' && !inv.is_deleted)
      .sort((a, b) => {
        // Sort by invoice number descending (newest first) - matching Invoices page
        return parseInt(b.invoiceNumber || 0) - parseInt(a.invoiceNumber || 0);
      });
  }, [invoices]);

  // Total unpaid amount
  const unpaidTotal = useMemo(() => {
    if (!invoices || invoices.length === 0) return 0;
    return invoices
      .filter(inv => inv.status !== 'paid' && !inv.is_deleted)
      .reduce((sum, inv) => {
        const price = parseFloat(inv.priceWithoutVat || 0);
        if (!isNaN(price)) return sum + price;
        const projectResult = findProjectById(inv.projectId);
        if (!projectResult?.project) return sum;
        const breakdown = calculateProjectTotalPriceWithBreakdown(inv.projectId);
        return sum + (breakdown?.total || 0);
      }, 0);
  }, [invoices, findProjectById, calculateProjectTotalPriceWithBreakdown]);

  // Special state for viewing orphan projects (projects without contractor)
  const [viewingOrphanProjects, setViewingOrphanProjects] = useState(false);

  const [activeCategory, setActiveCategory] = useState('construction');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  // Helper to get invoice total price (matched to Invoices.js)
  const getInvoiceTotal = (invoice) => {
    if (invoice.priceWithoutVat !== undefined && invoice.priceWithoutVat !== null) {
      return formatPrice(parseFloat(invoice.priceWithoutVat));
    }

    const projectResult = findProjectById(invoice.projectId);
    if (!projectResult?.project) return formatPrice(0);

    const breakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
    if (!breakdown) return formatPrice(0);

    return formatPrice(breakdown.total || 0);
  };
  const [currentView, setCurrentView] = useState(window.innerWidth < 1024 ? 'categories' : 'projects'); // 'categories', 'projects', 'details'
  const [viewSource, setViewSource] = useState('projects'); // 'projects' or 'archive'


  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectDeleteMode, setProjectDeleteMode] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);

  const [showContractorSelector, setShowContractorSelector] = useState(false);
  // const [filterYear, setFilterYear] = useState('all'); // Moved to Context
  const [showYearSelector, setShowYearSelector] = useState(false);

  // Lock scroll when modal is open
  useScrollLock(showNewProjectModal || showContractorModal || !!projectToArchive);

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

  // Filter year loading logic moved to AppDataContext
  // const handleSetFilterYear... replaced below

  const handleSetFilterYear = (year) => {
    updateProjectFilterYear(year);
    setShowYearSelector(false);
  };




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

  // Handle travel between categories and projects via events
  useEffect(() => {
    const handleQuickTravel = async (e) => {
      const { projectId } = e.detail;
      const result = findProjectById(projectId);
      if (result) {
        setActiveCategory(result.category);
        setSelectedProject(result.project);
        setCurrentView('details');

        // Open Dennik modal once details are loaded
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-dennik-modal', { detail: { projectId } }));
        }, 300);
      }
    };

    window.addEventListener('quick-travel-dennik', handleQuickTravel);
    return () => window.removeEventListener('quick-travel-dennik', handleQuickTravel);
  }, [findProjectById]);

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

      const openDennik = location.state.openDennik;
      const dennikDate = location.state.dennikDate;
      let projectFound = false;

      const openDennikAfterMount = () => {
        if (openDennik) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-dennik-modal', { detail: { projectId, dennikDate } }));
          }, 300);
        }
      };

      for (const category of categoriesToSearch) {
        if (!category) continue;
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          setActiveCategory(category.id);
          setSelectedProject(project);
          setCurrentView('details');
          projectFound = true;
          openDennikAfterMount();
          break;
        }
      }

      // If not found in active categories, search in archived projects
      if (!projectFound && archivedProjects) {
        const project = archivedProjects.find(p => p.id === projectId);
        if (project) {
          if (project.originalCategoryId) {
            setActiveCategory(project.originalCategoryId);
          }
          setSelectedProject(project);
          setCurrentView('details');
          projectFound = true;
          openDennikAfterMount();
        }
      }

      // If still not found, try fetching it directly (e.g., shared project or member project)
      if (!projectFound && projectId) {
        const fetchMissingProject = async () => {
          try {
            const fetchedProject = await api.projects.getById(projectId);
            if (fetchedProject) {
              // Check if the current user is a member of this project and attach permissions
              if (user?.id && fetchedProject.user_id !== user.id) {
                try {
                  const { data: membership } = await api.supabase
                    .from('project_members')
                    .select('role, permissions')
                    .eq('project_id', projectId)
                    .eq('user_id', user.id)
                    .single();
                  if (membership) {
                    fetchedProject.userRole = membership.role || 'member';
                    fetchedProject.memberPermissions = membership.permissions;
                  }
                } catch (e) {
                  console.warn('Could not fetch member permissions for project:', e);
                }
              } else {
                fetchedProject.userRole = 'owner';
              }
              setSelectedProject(fetchedProject);
              setCurrentView('details');
              openDennikAfterMount();
            }
          } catch (error) {
            console.error('Error fetching deep-linked project:', error);
          }
        };
        fetchMissingProject();
      }

      // IMPORTANT: Clear the location state after processing it.
      // This prevents the project from switching back or the modal reopening
      // on every refresh or when data reloads from the background.
      window.history.replaceState({}, document.title);
    }
  }, [location.state, projectCategories, archivedProjects, setActiveCategory, setSelectedProject, setCurrentView, user]);

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
    // Push history entry so browser back returns to categories on mobile
    if (window.innerWidth < 1024) {
      window.history.pushState({ projectList: true }, '');
    }
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setCurrentView('details');
    // Push history entry so browser back button returns to project list
    window.history.pushState({ projectDetail: true, projectId: project.id }, '');

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

  // Handle browser back button for state-based navigation
  useEffect(() => {
    const handlePopState = (e) => {
      // If we're in detail view and browser back was pressed, go back to projects
      if (currentView === 'details') {
        e.preventDefault();
        setCurrentView('projects');
        setSelectedProject(null);
      } else if (currentView === 'projects' && window.innerWidth < 1024) {
        // On mobile, go back from project list to categories
        setCurrentView('categories');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);



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
      <div className="pb-20 lg:pb-0 w-full min-w-0">
        {currentView !== 'details' && (
          <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('Projects')}</h1>
        )}

        {/* Contractor Profile Dropdown */}
        {(currentView === 'categories' || currentView === 'projects') && (
          <div className="mb-4 lg:mb-6 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 bg-transparent"
                onClick={() => setShowContractorSelector(!showContractorSelector)}
              >
                {/* Mobile: truncated name */}
                <span className="text-4xl font-bold text-gray-900 dark:text-white lg:hidden">
                  {(() => {
                    const name = viewingOrphanProjects ? t('Projects without contractor') : (getCurrentContractor()?.name || t('Select contractor'));
                    return name.length > 12 ? name.substring(0, 12) + '...' : name;
                  })()}
                </span>
                {/* Desktop: full name */}
                <span className="text-xl font-bold text-gray-900 dark:text-white hidden lg:inline">
                  {viewingOrphanProjects ? t('Projects without contractor') : (getCurrentContractor()?.name || t('Select contractor'))}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              </button>

              {/* Mobile Refresh Button */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 lg:hidden"
                aria-label={t('Refresh')}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

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

        <div className="flex flex-col lg:flex-row lg:h-full w-full">
          {/* Category Selection - Mobile: horizontal scroll, Desktop: sidebar - Hidden when viewing project details */}
          <div className={`flex lg:flex-col w-screen lg:w-48 xl:w-56 2xl:w-72 flex-shrink-0 ${currentView === 'details' ? 'hidden' : currentView === 'categories' ? 'hidden lg:flex' : 'hidden lg:flex'}`} style={{ maxWidth: '100vw' }}>
            <div className="flex lg:flex-1 lg:flex-col overflow-x-auto lg:overflow-visible pl-2 pr-2 lg:px-3 xl:px-4 py-4 space-x-2 lg:space-x-0 lg:space-y-2 xl:space-y-3 scrollbar-hide" style={{ width: '100%' }}>
              {displayCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`flex-shrink-0 lg:w-full w-24 sm:w-28 rounded-2xl overflow-hidden transition-all duration-200 ${activeCategory === category.id
                    ? 'ring-2 ring-gray-900 dark:ring-white shadow-lg border-2 border-white dark:border-gray-800'
                    : 'hover:shadow-md hover:scale-[1.02]'
                    }`}
                >
                  <div className="h-24 lg:h-20 xl:h-24 2xl:h-28 relative shadow-lg">
                    {/* Active Timer Live Display */}
                    {activeTimer && category.projects?.some(p => p.id === activeTimer.project_id) && (
                      <LiveTimer
                        startTime={activeTimer.start_time}
                        onClick={(e) => {
                          e.stopPropagation();
                          quickTravelToDennik(activeTimer.project_id);
                        }}
                      />
                    )}
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent"></div>
                    {/* Dim inactive categories */}
                    {activeCategory !== category.id && (
                      <div className="absolute inset-0 bg-black/40 transition-opacity"></div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-end">
                      <h3 className={`text-base lg:text-sm xl:text-base 2xl:text-lg font-bold ${activeCategory !== category.id ? 'text-white' : 'text-gray-900'}`}>{t(category.name)}</h3>
                      <span className={`${activeCategory !== category.id ? 'text-gray-200' : 'text-gray-900'} text-xs font-medium`}>{category.count}</span>
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

                      {/* Active Timer Live Display Mobile */}
                      {activeTimer && category.projects?.some(p => p.id === activeTimer.project_id) && (
                        <div className="absolute top-3 right-3 z-20">
                          <LiveTimer
                            startTime={activeTimer.start_time}
                            onClick={(e) => {
                              e.stopPropagation();
                              quickTravelToDennik(activeTimer.project_id);
                            }}
                          />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
                        <h3 className="text-3xl font-bold text-gray-900">{t(category.name)}</h3>
                        <span className="text-sm font-medium text-gray-900">{category.count} {t('projects')}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Unpaid Invoices Section - Mobile */}
                {unpaidInvoices.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t('Unpaid invoices')} - {formatPrice(unpaidTotal)} €
                    </h2>
                    <div className="space-y-2">
                      {unpaidInvoices.map(invoice => {
                        const project = findProjectById(invoice.projectId);
                        const isPaid = invoice.status === 'paid';
                        const maturityCutOffDate = new Date(invoice.dueDate);
                        maturityCutOffDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const diffTime = maturityCutOffDate - today;
                        const dayDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const absDays = Math.abs(dayDiff);
                        const isOverdue = !isPaid && dayDiff < 0;
                        const daysLabel = absDays === 1 ? t('day') : (absDays >= 2 && absDays <= 4 ? t('days_2_4') : t('days'));

                        let statusLabel, statusColor;
                        if (isOverdue) {
                          statusLabel = `${t('Overdue by')} ${absDays} ${daysLabel}`;
                          statusColor = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                        } else if (dayDiff === 0) {
                          statusLabel = t('Matures today');
                          statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                        } else {
                          statusLabel = `${t('Matures in')} ${absDays} ${daysLabel}`;
                          statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                        }

                        return (
                          <div
                            key={invoice.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer transition-all"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowInvoiceDetail(true);
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white truncate">
                                {project?.project?.name || t('Unknown project')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                #{invoice.invoiceNumber}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-white text-sm mt-1">
                                  {getInvoiceTotal(invoice)}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Project List View */}
            {currentView === 'projects' && (
              <div className="pt-4 pb-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6 min-w-0 w-full">
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
                        {t(displayCategories.find(cat => cat.id === activeCategory)?.name)} {t('Projects')}
                      </h2>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!viewingOrphanProjects && (
                        <>
                          <button
                            onClick={toggleProjectDeleteMode}
                            className={`p-3 rounded-2xl flex items-center justify-center transition-colors ${projectDeleteMode
                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                              }`}
                          >
                            <Archive className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-sm sm:text-base"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Add Project')}</span>
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
                                onClick={() => handleSetFilterYear('all')}
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
                                    onClick={() => handleSetFilterYear(year.toString())}
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
                      const numA = formatProjectNumber(a);
                      const numB = formatProjectNumber(b);

                      if (numA && numB) {
                        // Priority 1: Project Number sequence
                        const numCompare = numB.localeCompare(numA);
                        if (numCompare !== 0) return numCompare;
                      } else if (numA) {
                        return -1;
                      } else if (numB) {
                        return 1;
                      }

                      // Priority 2: Creation Date
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
                                {project.is_dennik_enabled && (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] lg:text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
                                      {t('Denník')}
                                    </span>
                                    {activeTimer && activeTimer.project_id === project.id && (
                                      <LiveTimer
                                        size="small"
                                        startTime={activeTimer.start_time}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          quickTravelToDennik(project.id);
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
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
                                        <span className="inline-flex items-center justify-center w-4 h-4 lg:w-4.5 lg:h-4.5 rounded-full bg-white">
                                          <Flag className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: '#C4C4C4' }} />
                                        </span>
                                        <span>{t('finished')}</span>
                                      </>
                                    ) : project.status === PROJECT_STATUS.APPROVED ? (
                                      <>
                                        <span className="inline-flex items-center justify-center w-4 h-4 lg:w-4.5 lg:h-4.5 rounded-full bg-white">
                                          <CheckCircle className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: '#73D38A' }} />
                                        </span>
                                        <span>{t('approved')}</span>
                                      </>
                                    ) : project.status === PROJECT_STATUS.SENT ? (
                                      <>
                                        <span className="inline-flex items-center justify-center w-4 h-4 lg:w-4.5 lg:h-4.5 rounded-full bg-white">
                                          <span className="text-[10px] lg:text-xs font-bold" style={{ color: '#51A2F7' }}>?</span>
                                        </span>
                                        <span>{t('sent')}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center justify-center w-4 h-4 lg:w-4.5 lg:h-4.5 rounded-full bg-white">
                                          <X className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: '#FF857C' }} />
                                        </span>
                                        <span>{t('not sent')}</span>
                                      </>
                                    )}
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

        {/* Invoice Detail Modal */}
        <InvoiceDetailModal
          isOpen={showInvoiceDetail}
          onClose={() => {
            setShowInvoiceDetail(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      </div>

    </>
  );
};

export default Projects;