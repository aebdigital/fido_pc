import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User,
  ClipboardList,
  BarChart3,
  Trash2,
  Plus,
  ChevronRight,
  Copy,
  Archive,
  ChevronDown,
  Eye,
  Send,
  Edit3,
  AlertTriangle,
  FileText,
  Image,
  X,
  StickyNote
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import RoomDetailsModal from '../components/RoomDetailsModal';
import ProjectPriceList from '../components/ProjectPriceList';
import ContractorProfileModal from '../components/ContractorProfileModal';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    projectCategories,
    clients,
    generalPriceList,
    contractors,
    activeContractorId,
    setActiveContractor,
    addContractor,
    addProject,
    updateProject,
    archiveProject,
    archivedProjects,
    unarchiveProject,
    deleteArchivedProject,
    assignProjectToClient,
    findProjectById,
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    calculateRoomPriceWithMaterials,
    calculateProjectTotalPrice,
    calculateProjectTotalPriceWithBreakdown,
    formatPrice,
    getInvoiceForProject,
    getInvoicesForContractor,
    loadProjectDetails,
    getProjectHistory
  } = useAppData();
  
  const [activeCategory, setActiveCategory] = useState('flats');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState(window.innerWidth < 1024 ? 'categories' : 'projects'); // 'categories', 'projects', 'details'
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [viewSource, setViewSource] = useState('projects'); // 'projects' or 'archive'
  
  // Helper function to get current VAT rate from price list
  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23; // Default to 23% if not found
  };
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedClientForProject, setSelectedClientForProject] = useState(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showProjectPriceList, setShowProjectPriceList] = useState(false);
  const [projectDeleteMode, setProjectDeleteMode] = useState(false);
  const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [isEditingProjectNotes, setIsEditingProjectNotes] = useState(false);
  const [editingProjectNotes, setEditingProjectNotes] = useState('');
  const [showContractorWarning, setShowContractorWarning] = useState(false);
  const [showInvoiceCreationModal, setShowInvoiceCreationModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [projectDetailNotes, setProjectDetailNotes] = useState('');
  const [isEditingDetailNotes, setIsEditingDetailNotes] = useState(false);
  const photoInputRef = useRef(null);
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


  const roomTypes = [
    t('Hallway'), t('Toilet'), t('Bathroom'), t('Kitchen'), 
    t('Living room'), t('Kids room'), t('Bedroom'), t('Guest room'),
    t('Work room'), t('Custom')
  ];

  const workProperties = [
    // FIRST COLUMN - Prípravné a základné práce (positions 1-7)
    {
      id: 'preparatory',
      name: 'Preparatory and demolition works',
      behavior: 'single',
      fields: [{ name: 'Duration', unit: 'h', type: 'number' }]
    },
    {
      id: 'wiring',
      name: 'Electrical installation work',
      subtitle: 'switch, socket, light, connection point',
      behavior: 'single',
      fields: [{ name: 'Number of outlets', unit: 'pc', type: 'number' }]
    },
    {
      id: 'plumbing',
      name: 'Plumbing work',
      subtitle: 'hot, cold, waste, connection point',
      behavior: 'single',
      fields: [{ name: 'Number of outlets', unit: 'pc', type: 'number' }]
    },
    {
      id: 'brick_partitions',
      name: 'Brick partitions',
      subtitle: '75 - 175mm',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Netting', 'Penetration coating', 'Tiling under 60cm', 'Plastering', 'Penetration coating', 'Painting']
    },
    {
      id: 'brick_load_bearing',
      name: 'Brick load-bearing wall',
      subtitle: '200 - 450mm',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Netting', 'Penetration coating', 'Tiling under 60cm', 'Plastering', 'Penetration coating', 'Painting']
    },
    {
      id: 'plasterboarding_partition',
      name: 'Plasterboarding',
      subtitle: 'partition',
      types: ['Simple', 'Double', 'Triple'],
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Painting']
    },
    {
      id: 'plasterboarding_offset',
      name: 'Plasterboarding',
      subtitle: 'offset wall',
      types: ['Simple', 'Double'],
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Painting']
    },
    {
      id: 'plasterboarding_ceiling',
      name: 'Plasterboarding',
      subtitle: 'ceiling',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating', 'Painting']
    },
    // SECOND COLUMN - Povrchové úpravy (positions 9-17)
    {
      id: 'netting_wall',
      name: 'Netting',
      subtitle: 'wall',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Tiling under 60cm', 'Plastering', 'Penetration coating', 'Painting']
    },
    {
      id: 'netting_ceiling',
      name: 'Netting',
      subtitle: 'ceiling',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating', 'Plastering', 'Penetration coating', 'Painting']
    },
    {
      id: 'plastering_wall',
      name: 'Plastering',
      subtitle: 'wall',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      complementaryWorks: ['Penetration coating', 'Painting']
    },
    {
      id: 'plastering_ceiling',
      name: 'Plastering',
      subtitle: 'ceiling',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating', 'Painting']
    },
    {
      id: 'facade_plastering',
      name: 'Facade Plastering',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ]
    },
    {
      id: 'corner_bead',
      name: 'Installation of corner bead',
      behavior: 'single',
      fields: [
        { name: 'Length', unit: 'm', type: 'number' }
      ]
    },
    // THIRD COLUMN - Finishing and others (positions 15+)
    {
      id: 'window_sash',
      name: 'Plastering of window sash',
      behavior: 'single',
      fields: [
        { name: 'Length', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'penetration_coating',
      name: 'Penetration coating',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'painting_wall',
      name: 'Painting',
      subtitle: 'wall, 2 layers',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating']
    },
    {
      id: 'painting_ceiling',
      name: 'Painting',
      subtitle: 'ceiling, 2 layers',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating']
    },
    {
      id: 'levelling',
      name: 'Levelling',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      complementaryWorks: ['Penetration coating']
    },
    {
      id: 'floating_floor',
      name: 'Floating floor',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'tiling_under_60',
      name: 'Tiling under 60cm',
      subtitle: 'ceramic',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Height', unit: 'm', type: 'number' },
        { name: 'Doors', unit: '+', type: 'counter' },
        { name: 'Windows', unit: '+', type: 'counter' }
      ],
      additionalFields: [
        { name: 'Large Format', subtitle: 'above 60cm', type: 'toggle' },
        { name: 'Jolly Edging', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'paving_under_60',
      name: 'Paving under 60cm',
      subtitle: 'ceramic',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ],
      additionalFields: [
        { name: 'Large Format', subtitle: 'above 60cm', type: 'toggle' },
        { name: 'Plinth', subtitle: 'cutting and grinding', unit: 'm', type: 'number' },
        { name: 'Plinth', subtitle: 'bonding', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'grouting',
      name: 'Grouting',
      fields: [
        { name: 'Width', unit: 'm', type: 'number' },
        { name: 'Length', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'siliconing',
      name: 'Siliconing',
      behavior: 'single',
      fields: [
        { name: 'Length', unit: 'm', type: 'number' }
      ]
    },
    {
      id: 'sanitary_installation',
      name: 'Sanitary installation',
      types: [
        'Corner valve', 'Standing mixer tap', 'Wall-mounted tap', 'Flush-mounted tap',
        'Toilet combi', 'Concealed toilet', 'Sink', 'Sink with cabinet',
        'Bathtub', 'Shower cubicle', 'Installation of gutter', 'Urinal',
        'Bath screen', 'Mirror'
      ]
    },
    {
      id: 'window_installation',
      name: 'Window installation',
      fields: [
        { name: 'Circumference', unit: 'm', type: 'number' },
        { name: 'Price', unit: '€/pc', type: 'number' }
      ]
    },
    {
      id: 'door_jamb_installation',
      name: 'Installation of door jamb',
      behavior: 'single',
      fields: [
        { name: 'Count', unit: 'pc', type: 'number' },
        { name: 'Price', unit: '€/pc', type: 'number' }
      ]
    },
    {
      id: 'custom_work',
      name: 'Custom work and material',
      hasTypeSelector: true,
      types: ['Work', 'Material'],
      hasUnitSelector: true,
      workUnits: ['bm', 'm²', 'm³', 'ks', 'bal', 'hod', 'km', 'deň'],
      materialUnits: ['bm', 'ml', 'mš', 'ks', 'bal', 'kg', 't', 'km'],
      fields: [
        { name: 'Name', unit: 'text', type: 'text' },
        { name: 'Quantity', unit: 'number', type: 'number' },
        { name: 'Price', unit: '€/unit', type: 'number' }
      ]
    },
    {
      id: 'commute',
      name: 'Commute',
      behavior: 'single',
      fields: [
        { name: 'Distance', unit: 'km', type: 'number' },
        { name: 'Duration', unit: 'days', type: 'number' }
      ]
    },
    {
      id: 'rentals',
      name: 'Rentals',
      items: [
        {
          name: 'Scaffolding',
          fields: [
            { name: 'Length', unit: 'm', type: 'number' },
            { name: 'Height', unit: 'm', type: 'number' },
            { name: 'Rental duration', unit: 'day', type: 'number' }
          ]
        },
        {
          name: 'Core Drill',
          fields: [{ name: 'Count', unit: 'h', type: 'number' }]
        },
        {
          name: 'Tool rental',
          fields: [{ name: 'Count', unit: 'h', type: 'number' }]
        }
      ]
    }
  ];


  const activeProjects = useMemo(() => {
    return projectCategories.find(cat => cat.id === activeCategory)?.projects || [];
  }, [projectCategories, activeCategory]);
  const currentProject = selectedProject;

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
        setSelectedClientForProject(client);
      }
    }
  }, [location.state, projectCategories, archivedProjects, setActiveCategory, setSelectedProject, setCurrentView, setSelectedClientForProject]);

  const handleNewProject = async () => {
    if (newProjectName.trim()) {
      try {
        const newProject = await addProject(activeCategory, { name: newProjectName.trim() });

        setNewProjectName('');
        setShowNewProjectModal(false);

        // Automatically navigate to the new project
        setSelectedProject(newProject);
        setCurrentView('details');

        // Auto-show room options for newly created project
        setShowNewRoomModal(true);
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

  const handleAddRoom = async (roomType) => {
    if (!currentProject) return;

    // If custom room type is selected, show custom room name modal
    if (roomType === t('Custom')) {
      setShowCustomRoomModal(true);
      return;
    }

    // Map translated roomType back to English key for storage
    const englishRoomTypes = ['Hallway', 'Toilet', 'Bathroom', 'Kitchen', 'Living room', 'Kids room', 'Bedroom', 'Guest room', 'Work room', 'Custom'];
    const translatedTypes = englishRoomTypes.map(type => t(type));
    const englishRoomType = englishRoomTypes[translatedTypes.indexOf(roomType)] || roomType;

    const newRoom = await addRoomToProject(currentProject.id, { name: englishRoomType });
    console.log('[Projects] handleAddRoom - newRoom returned:', newRoom, 'roomId:', newRoom?.id);
    setShowNewRoomModal(false);

    // Automatically open the room details modal for the new room
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleCustomRoomCreate = async () => {
    if (!currentProject || !customRoomName.trim()) return;

    const newRoom = await addRoomToProject(currentProject.id, { name: customRoomName.trim() });
    console.log('[Projects] handleCustomRoomCreate - newRoom returned:', newRoom, 'roomId:', newRoom?.id);
    setShowNewRoomModal(false);
    setShowCustomRoomModal(false);
    setCustomRoomName('');

    // Automatically open the room details modal for the new room
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleCustomRoomCancel = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowCustomRoomModal(false);
      setCustomRoomName('');
      setIsClosingModal(false);
    }, 300);
  };

  const handleCloseNewRoomModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowNewRoomModal(false);
      setIsClosingModal(false);
    }, 300);
  };

  const handleCloseClientSelector = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowClientSelector(false);
      setIsClosingModal(false);
    }, 300);
  };

  const handleCloseNewProjectModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowNewProjectModal(false);
      setNewProjectName('');
      setIsClosingModal(false);
    }, 300);
  };

  const handleOpenRoomDetails = (room) => {
    console.log('[Projects] handleOpenRoomDetails - room:', room, 'roomId:', room?.id);
    setSelectedRoom(room);
    setShowRoomDetailsModal(true);
  };

  const handleSaveRoomWork = (roomId, workData) => {
    if (!currentProject) return;

    console.log('[DEBUG] handleSaveRoomWork - roomId:', roomId, 'projectId:', currentProject.id, 'workItems count:', workData?.length);
    updateProjectRoom(currentProject.id, roomId, { workItems: workData });
    // Don't close the modal - just save the data
  };

  const handleCloseRoomDetailsModal = () => {
    setShowRoomDetailsModal(false);
    setSelectedRoom(null);
  };

  const handleDeleteRoom = (roomId) => {
    if (!currentProject) return;
    
    deleteProjectRoom(currentProject.id, roomId);
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
  };

  const handleCategorySelect = (categoryId) => {
    setActiveCategory(categoryId);
    setSelectedProject(null);
    setCurrentView('projects');
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setCurrentView('details');

    // Load details asynchronously
    setIsLoadingDetails(true);
    await loadProjectDetails(project.id);
    setIsLoadingDetails(false);

    // Load the assigned client if the project has one
    if (project.clientId) {
      const assignedClient = clients.find(client => client.id === project.clientId);
      if (assignedClient) {
        setSelectedClientForProject(assignedClient);
      }
    } else {
      setSelectedClientForProject(null);
    }

    // Load project notes and photos
    setProjectDetailNotes(project.detail_notes || '');
    setProjectPhotos(project.photos || []);
  };

  const handleBackToProjects = () => {
    // Check both local state and location state for maximum robustness
    if (viewSource === 'archive' || location.state?.fromArchive) {
      navigate('/archive');
      // No need to reset viewSource here as component will unmount/navigate away
    } else {
      setCurrentView('projects');
      setSelectedProject(null);
      setSelectedClientForProject(null);
      setProjectDetailNotes('');
      setProjectPhotos([]);
      setIsEditingDetailNotes(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClientForProject(client);
    setShowClientSelector(false);

    // Assign the current project to the selected client AND store client info in project
    if (currentProject) {
      assignProjectToClient(client.id, currentProject.id, currentProject.name);
      // Also update the project to store the client information
      updateProject(activeCategory, currentProject.id, {
        clientId: client.id,
        clientName: client.name
      });
      // Also update the local selectedProject state so InvoiceCreationModal gets the updated clientId
      setSelectedProject(prev => prev ? {
        ...prev,
        clientId: client.id,
        clientName: client.name
      } : prev);
    }
  };

  const handleClientSelectorOpen = () => {
    setShowClientSelector(true);
  };

  const handleOpenProjectPriceList = () => {
    setShowProjectPriceList(true);
  };

  const handleCloseProjectPriceList = () => {
    setShowProjectPriceList(false);
  };

  const handleSaveProjectPriceList = (priceData) => {
    if (currentProject) {
      updateProject(activeCategory, currentProject.id, { priceListSnapshot: priceData });
      setSelectedProject(prev => prev ? { ...prev, priceListSnapshot: priceData } : prev);
    }
    setShowProjectPriceList(false);
  };

  const toggleProjectDeleteMode = () => {
    setProjectDeleteMode(!projectDeleteMode);
  };

  const handleArchiveProject = (projectId) => {
    archiveProject(activeCategory, projectId);
    
    // If we're currently viewing the archived project, go back to project list
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(null);
      setCurrentView('projects');
    }
  };

  const handleDuplicateProject = async (projectId) => {
    // Check if a contractor is assigned
    if (!activeContractorId) {
      setShowContractorWarning(true);
      return;
    }

    const projectResult = findProjectById(projectId);
    if (!projectResult) return;

    const { project } = projectResult;

    try {
      // Create a copy of the project with a new ID and name
      const duplicatedProject = {
        ...project,
        id: `${new Date().getFullYear()}${String(Date.now()).slice(-3)}`,
        name: `${project.name} Copy`,
        createdDate: new Date().toISOString()
      };

      // Add the duplicated project
      await addProject(activeCategory, duplicatedProject);

      // Navigate back to project list
      setSelectedProject(null);
      setCurrentView('projects');
    } catch (error) {
      console.error('Error duplicating project:', error);
      // Show user-friendly error message if available
      if (error.userFriendly) {
        alert(error.message);
      } else {
        alert('Failed to duplicate project. Please try again.');
      }
    }
  };

  const handleAssignProjectContractor = async (newContractorId) => {
    if (!currentProject) return;
    try {
      // Update project with new contractor ID
      await updateProject(activeCategory, currentProject.id, { c_id: newContractorId });
      
      // Switch active contractor to the new one so we land in the correct list
      setActiveContractor(newContractorId);
      
      // Go back to project list
      handleBackToProjects();
      
      // Close selector
      setShowContractorSelector(false);
    } catch (error) {
      console.error("Failed to reassign project:", error);
      alert(t("Failed to reassign project"));
    }
  };

  // Project name editing handlers
  const handleEditProjectName = () => {
    if (currentProject) {
      setEditingProjectName(currentProject.name);
      setIsEditingProjectName(true);
    }
  };

  const handleSaveProjectName = () => {
    if (currentProject && editingProjectName.trim()) {
      updateProject(activeCategory, currentProject.id, { name: editingProjectName.trim() });
      // Update the selected project to reflect the changes immediately
      setSelectedProject(prev => prev ? { ...prev, name: editingProjectName.trim() } : prev);
      setIsEditingProjectName(false);
      setEditingProjectName('');
    }
  };

  const handleCancelEditProjectName = () => {
    setIsEditingProjectName(false);
    setEditingProjectName('');
  };

  // Project notes editing handlers
  const handleEditProjectNotes = () => {
    if (currentProject) {
      setEditingProjectNotes(currentProject.notes || '');
      setIsEditingProjectNotes(true);
    }
  };

  const handleSaveProjectNotes = () => {
    if (currentProject) {
      updateProject(activeCategory, currentProject.id, { notes: editingProjectNotes.trim() });
      // Update the selected project to reflect the changes immediately
      setSelectedProject(prev => prev ? { ...prev, notes: editingProjectNotes.trim() } : prev);
      setIsEditingProjectNotes(false);
      setEditingProjectNotes('');
    }
  };

  const handleCancelEditProjectNotes = () => {
    setIsEditingProjectNotes(false);
    setEditingProjectNotes('');
  };

  // Detail notes handlers (for the right sidebar)
  const handleSaveDetailNotes = () => {
    if (currentProject) {
      updateProject(activeCategory, currentProject.id, { detail_notes: projectDetailNotes });
      setSelectedProject(prev => prev ? { ...prev, detail_notes: projectDetailNotes } : prev);
      setIsEditingDetailNotes(false);
    }
  };

  // Photo handlers
  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length || !currentProject) return;

    const newPhotos = [];
    for (const file of files) {
      // Convert file to base64 for local storage (for now)
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      newPhotos.push({
        id: Date.now() + Math.random(),
        url: base64,
        name: file.name,
        createdAt: new Date().toISOString()
      });
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(activeCategory, currentProject.id, { photos: updatedPhotos });
    setSelectedProject(prev => prev ? { ...prev, photos: updatedPhotos } : prev);

    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (photoId) => {
    if (!currentProject) return;
    const updatedPhotos = projectPhotos.filter(p => p.id !== photoId);
    setProjectPhotos(updatedPhotos);
    updateProject(activeCategory, currentProject.id, { photos: updatedPhotos });
    setSelectedProject(prev => prev ? { ...prev, photos: updatedPhotos } : prev);
  };

  const handleOpenPhoto = (index) => {
    setSelectedPhotoIndex(index);
  };

  const handleClosePhoto = () => {
    setSelectedPhotoIndex(null);
  };

  const handleNextPhoto = () => {
    setSelectedPhotoIndex(prev => (prev + 1) % projectPhotos.length);
  };

  const handlePrevPhoto = () => {
    setSelectedPhotoIndex(prev => (prev - 1 + projectPhotos.length) % projectPhotos.length);
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
    setActiveContractor(contractorId);
    setShowContractorSelector(false);
  };

  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };

  const handlePreviewPDF = () => {
    if (!currentProject) return;

    const invoice = getInvoiceForProject(currentProject.id);
    if (!invoice) return;

    const contractor = getCurrentContractor();
    // Find client by ID from the project
    const client = clients.find(c => c.id === currentProject.clientId);
    console.log('[PDF] currentProject.clientId:', currentProject.clientId);
    console.log('[PDF] Found client:', client);
    console.log('[PDF] All clients:', clients);
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(currentProject.id);

    const vatRate = getVATRate();
    const totalWithoutVAT = projectBreakdown?.total || 0;
    const vat = totalWithoutVAT * vatRate;
    const totalWithVAT = totalWithoutVAT + vat;

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('sk-SK');
    };

    try {
      generateInvoicePDF({
        invoice,
        contractor,
        client,
        projectBreakdown,
        vatRate,
        totalWithoutVAT,
        vat,
        totalWithVAT,
        formatDate,
        formatPrice
      });
      // Window opening is now handled inside generateInvoicePDF
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('Unable to generate PDF. Please try again.'));
    }
  };

  const handleSendInvoice = async () => {
    if (!currentProject) return;
    const invoice = getInvoiceForProject(currentProject.id);
    if (!invoice) return;

    const contractor = getCurrentContractor();
    const client = clients.find(c => c.id === currentProject.clientId);
    
    // Calculate totals
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(currentProject.id);
    const vatRate = getVATRate();
    const totalWithoutVAT = projectBreakdown?.total || 0;
    const vat = totalWithoutVAT * vatRate;
    const totalWithVAT = totalWithoutVAT + vat;

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('sk-SK');
    };

    // Generate invoice data to share
    const invoiceText = `
${t('Invoice')} ${invoice.invoiceNumber}
${currentProject.name}

${t('Contractor')}: ${contractor?.name || '-'}
${t('Client')}: ${client?.name || '-'}

${t('Issue Date')}: ${formatDate(invoice.issueDate)}
${t('Due Date')}: ${formatDate(invoice.dueDate)}
${t('Payment Method')}: ${t(invoice.paymentMethod === 'cash' ? 'Cash' : 'Transfer')}

${t('without VAT')}: ${formatPrice(totalWithoutVAT)}
${t('VAT (23%)')}: ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${invoice.notes ? `\n${t('Notes')}: ${invoice.notes}` : ''}
    `.trim();

    const fallbackShare = (text) => {
      // Copy to clipboard as fallback
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => {
            alert(t('Invoice details copied to clipboard'));
          })
          .catch(() => {
            alert(t('Unable to share. Please try again.'));
          });
      } else {
        alert(t('Sharing not supported on this device'));
      }
    };

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('Invoice')} ${invoice.invoiceNumber}`,
          text: invoiceText,
        });
      } catch (error) {
        // User cancelled or share failed
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(invoiceText);
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      fallbackShare(invoiceText);
    }
  };

  return (
    <>
      <div className="pb-20 lg:pb-0 overflow-hidden w-full min-w-0">
        <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('Projekty')}</h1>
      
      {/* Contractor Profile Dropdown */}
      {(currentView === 'categories' || currentView === 'projects') && (
        <div className="mb-4 lg:mb-6 relative" ref={dropdownRef}>
        <button 
          className="flex items-center gap-2"
          onClick={() => setShowContractorSelector(!showContractorSelector)}
        >
          <span className="text-lg lg:text-xl font-medium text-gray-900 dark:text-white">
            {getCurrentContractor()?.name || t('Select contractor')}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        
        {/* Contractor Dropdown */}
        {showContractorSelector && (
          <div className="absolute top-full left-0 mt-2 w-full max-w-xs lg:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-10 animate-slide-in-top">
            <div className="p-4 space-y-3">
              
              {/* Create New Profile */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm hover:shadow-md" 
                   onClick={handleCreateContractorProfile}>
                <div className="mb-3 sm:mb-0">
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1">{t('Create new profile')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">{t('Fill out information for price offers')}</p>
                </div>
                <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md self-end sm:self-auto">
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
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        activeContractorId === contractor.id 
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
            </div>
          </div>
        )}
      </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-full overflow-hidden w-full">
        {/* Category Selection - Mobile: horizontal scroll, Desktop: sidebar - Hidden when viewing project details */}
        <div className={`lg:w-80 flex lg:flex-col w-screen lg:w-80 ${currentView === 'details' ? 'hidden' : currentView === 'categories' ? 'hidden lg:flex' : 'hidden lg:flex'}`} style={{maxWidth: '100vw'}}>
          <div className="flex lg:flex-1 lg:flex-col overflow-x-auto lg:overflow-visible pl-2 pr-2 lg:px-6 py-4 space-x-2 lg:space-x-0 lg:space-y-3 scrollbar-hide" style={{width: '100%'}}>
            {projectCategories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`flex-shrink-0 lg:w-full w-24 sm:w-28 rounded-2xl overflow-hidden transition-all duration-200 ${
                  activeCategory === category.id 
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
                {projectCategories.map(category => (
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
                      {t(projectCategories.find(cat => cat.id === activeCategory)?.name)} {t('Projekty')}
                    </h2>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={toggleProjectDeleteMode}
                      className={`p-2 lg:p-3 transition-colors ${
                        projectDeleteMode 
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-sm hover:shadow-md' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowNewProjectModal(true)}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('Pridať projekt')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-3 min-w-0 w-full">
                {activeProjects.map(project => (
                  <div
                    key={project.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl pl-4 pr-4 pt-4 pb-4 lg:p-6 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm min-w-0 w-full ${
                      projectDeleteMode 
                        ? 'justify-between' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer'
                    }`}
                    onClick={projectDeleteMode ? undefined : () => handleProjectSelect(project)}
                  >
                    <div className={`flex-1 transition-all duration-300 min-w-0 ${projectDeleteMode ? 'mr-4' : ''}`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">{project.id}</span>
                        {project.invoiceStatus && (
                          <span className={`px-2 py-1 text-xs lg:text-sm font-medium rounded-full ${
                            project.invoiceStatus === 'sent'
                              ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                              : project.invoiceStatus === 'paid'
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                              : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                          }`}>
                            {t(project.invoiceStatus === 'sent' ? 'sent' : project.invoiceStatus === 'paid' ? 'Paid' : 'unsent')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white mb-1 truncate">{project.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">{project.notes || t('Notes')}</p>
                    </div>
                    
                    {projectDeleteMode ? (
                      <button
                        onClick={() => handleArchiveProject(project.id)}
                        className="bg-amber-500 hover:bg-amber-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5 self-end sm:self-auto mt-3 sm:mt-0"
                      >
                        <Archive className="w-4 h-4 lg:w-5 lg:h-5 text-amber-100" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-between sm:justify-end sm:gap-4 mt-3 sm:mt-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeProjects.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>{t('No projects in this category yet.')}</p>
                </div>
              )}
            </div>
          )}

          {/* Project Details View */}
          {currentView === 'details' && currentProject && (
            <div className="flex-1 p-0 lg:p-6 overflow-y-auto min-w-0">
              
              {/* Project Header - Moved outside the two-column layout to sit on top */}
              <div className="mb-6">
                <div className="flex flex-col gap-2 lg:gap-4">
                  {/* Back arrow and project name */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToProjects}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    {isEditingProjectName ? (
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onBlur={handleSaveProjectName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveProjectName();
                          if (e.key === 'Escape') handleCancelEditProjectName();
                        }}
                        className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                        autoFocus
                      />
                    ) : (
                      <>
                        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white flex-1">{currentProject.name}</h1>
                        <button
                          onClick={handleEditProjectName}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Project ID and status below the name */}
                  <div className="flex items-center gap-2 ml-11">
                    <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">{currentProject.id}</span>
                    {currentProject.invoiceStatus && (
                      <span className={`px-2 py-1 text-xs lg:text-sm font-medium rounded-full ${
                        currentProject.invoiceStatus === 'sent'
                          ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                          : currentProject.invoiceStatus === 'paid'
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                      }`}>
                        {t(currentProject.invoiceStatus === 'sent' ? 'sent' : currentProject.invoiceStatus === 'paid' ? 'Paid' : 'unsent')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditingProjectNotes ? (
                      <input
                        type="text"
                        value={editingProjectNotes}
                        onChange={(e) => setEditingProjectNotes(e.target.value)}
                        onBlur={handleSaveProjectNotes}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveProjectNotes();
                          if (e.key === 'Escape') handleCancelEditProjectNotes();
                        }}
                        className="text-lg text-gray-500 dark:text-gray-400 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                        placeholder={t('Notes')}
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="text-gray-500 dark:text-gray-400 text-lg flex-1">
                          {currentProject.notes || t('Notes')}
                        </p>
                        <button
                          onClick={handleEditProjectNotes}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Two column layout */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left column - Main project content */}
                <div className="flex-1 space-y-4 lg:space-y-6 min-w-0">

            {/* Client Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Klient')}</h2>
              </div>
              <div 
                onClick={handleClientSelectorOpen}
                className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 dark:text-white text-lg">
                    {selectedClientForProject ? selectedClientForProject.name : t('No client')}
                  </div>
                  <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                    {selectedClientForProject ? selectedClientForProject.email : t('Associate project with a client')}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </div>
              
              {/* Client Selector Modal */}
              {showClientSelector && (
                <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isClosingModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
                  <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md ${isClosingModal ? 'animate-slide-out' : 'animate-slide-in'}`}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Select Client')}</h3>
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                      {clients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-lg">{client.name}</div>
                          <div className="text-base text-gray-600 dark:text-gray-400 truncate">{client.email}</div>
                        </button>
                      ))}
                      {clients.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>{t('No clients available. Create a client first.')}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleCloseClientSelector}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Project Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Projekt')}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    className={`p-2 lg:p-3 transition-colors ${
                      deleteMode 
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-sm hover:shadow-md' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={toggleDeleteMode}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 lg:p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setShowNewRoomModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingDetails ? (
                  <div className="text-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                     <p className="text-gray-500 dark:text-gray-400 font-medium">{t('Loading project details...')}</p>
                  </div>
                ) : (
                  <>
                {getProjectRooms(currentProject.id).map(room => (
                  <div 
                    key={room.id}
                    className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm ${
                      deleteMode 
                        ? 'justify-between' 
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md'
                    }`}
                    onClick={deleteMode ? undefined : () => handleOpenRoomDetails(room)}
                  >
                    <div className={`transition-all duration-300 flex-1 ${deleteMode ? 'mr-4' : ''}`}>
                      <div className="font-medium text-gray-900 dark:text-white text-lg">{t(room.name) !== room.name ? t(room.name) : room.name}</div>
                      <div className="text-base text-gray-600 dark:text-gray-400">{room.workItems.length} {t('works')}</div>
                    </div>
                    
                    {deleteMode ? (
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5 self-end sm:self-auto mt-3 sm:mt-0"
                      >
                        <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-red-100" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-between sm:justify-end sm:gap-2 mt-3 sm:mt-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice((() => {
                            const calc = calculateRoomPriceWithMaterials(room, currentProject.priceListSnapshot);
                            return calc.workTotal + calc.materialTotal + calc.othersTotal;
                          })())}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
                
                {getProjectRooms(currentProject.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>{t('No rooms added yet. Click the + button to add a room.')}</p>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Total Price Offer */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h2>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white text-lg">{t('without VAT')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(currentProject.id))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white text-lg">{t('VAT (23%)')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(currentProject.id) * getVATRate())}</span>
                  </div>
                  <hr className="border-gray-300 dark:border-gray-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Total price')}</span>
                    <span className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(currentProject.id) * (1 + getVATRate()))}</span>
                  </div>
                </div>

                {/* Invoice creation button */}
                {!getInvoiceForProject(currentProject.id) ? (
                  <button
                    onClick={() => setShowInvoiceCreationModal(true)}
                    className="w-full mt-6 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Create Invoice')}</span>
                  </button>
                ) : (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handlePreviewPDF}
                      className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm sm:text-lg">{t('Preview Invoice')}</span>
                    </button>
                    <button
                      onClick={handleSendInvoice}
                      className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-sm sm:text-lg">{t('Send Invoice')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Invoices List */}
            {getInvoiceForProject(currentProject.id) && (
              <div className="space-y-3">
                {getInvoicesForContractor(activeContractorId)
                  .filter(inv => inv.projectId === currentProject.id)
                  .map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => setShowInvoiceDetailModal(true)}
                      className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Invoice')} {invoice.invoiceNumber}</div>
                          <div className="text-base text-gray-600 dark:text-gray-400">{new Date(invoice.issueDate).toLocaleDateString('sk-SK')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          invoice.status === 'sent'
                            ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                            : invoice.status === 'paid'
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                            : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                        }`}>
                          {t(invoice.status === 'sent' ? 'sent' : invoice.status === 'paid' ? 'Paid' : 'unsent')}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Project Management */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Project management')}</h2>
              </div>
              <div className="space-y-3">
                <div
                  onClick={handleOpenProjectPriceList}
                  className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Project price list')}</div>
                    <div className="text-base text-gray-600 dark:text-gray-400 truncate">{t('last change')}: 31 Oct 2025</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                </div>

                <div className="relative">
                  <div
                    onClick={() => setShowContractorSelector(!showContractorSelector)}
                    className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Project contractor')}</div>
                      <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                        {getCurrentContractor()?.name || t('assign contractor to project')}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </div>

                  {showContractorSelector && (
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden animate-slide-in">
                      <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                          {t('Select Contractor')}
                        </div>
                        {contractors.map(contractor => (
                          <button
                            key={contractor.id}
                            onClick={() => handleAssignProjectContractor(contractor.id)}
                            className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between ${
                              (currentProject.c_id || activeContractorId) === contractor.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <span className="font-medium truncate">{contractor.name}</span>
                            {(currentProject.c_id || activeContractorId) === contractor.id && (
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {currentProject.is_archived ? (
                  <>
                    <button 
                      onClick={() => {
                        unarchiveProject(currentProject.id);
                        if (viewSource === 'archive') navigate('/archive');
                        else handleBackToProjects();
                      }}
                      className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <span className="text-sm sm:text-lg">{t('Unarchive')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        deleteArchivedProject(currentProject.id);
                        if (viewSource === 'archive') navigate('/archive');
                        else handleBackToProjects();
                      }}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-2xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" /> 
                      <span className="text-sm sm:text-lg">{t('Delete Forever')}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleDuplicateProject(currentProject.id)}
                      className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Copy className="w-4 h-4" /> 
                      <span className="text-sm sm:text-lg">{t('Duplicate')}</span>
                    </button>
                    <button 
                      onClick={() => handleArchiveProject(currentProject.id)}
                      className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Archive className="w-4 h-4" /> 
                      <span className="text-sm sm:text-lg">{t('Archive')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

                </div>

                {/* Right column - Notes and Photos (sticky on desktop) */}
                <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
                  {/* Poznámky (Notes) Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Poznámky')}</h2>
                    </div>
                    {isEditingDetailNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={projectDetailNotes}
                          onChange={(e) => setProjectDetailNotes(e.target.value)}
                          placeholder={t('Add notes about this project...')}
                          className="w-full h-40 p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setIsEditingDetailNotes(false);
                              setProjectDetailNotes(currentProject.detail_notes || '');
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            {t('Cancel')}
                          </button>
                          <button
                            onClick={handleSaveDetailNotes}
                            className="flex-1 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                          >
                            {t('Save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-full h-40 p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors overflow-auto whitespace-pre-wrap shadow-sm"
                        onClick={() => setIsEditingDetailNotes(true)}
                      >
                        {projectDetailNotes || <span className="text-gray-400 dark:text-gray-500">{t('Click to add notes...')}</span>}
                      </div>
                    )}
                  </div>

                  {/* Fotografie (Photos) Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Fotografie')}</h2>
                      </div>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>

                    {projectPhotos.length > 0 ? (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
                        <div className="grid grid-cols-3 gap-2">
                          {projectPhotos.map((photo, index) => (
                            <div
                              key={photo.id}
                              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                              onClick={() => handleOpenPhoto(index)}
                            >
                              <img
                                src={photo.url}
                                alt={photo.name || `Photo ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePhoto(photo.id);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="min-h-[120px] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-sm"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Image className="w-8 h-8 mb-2" />
                        <span className="text-sm">{t('Click to add photos')}</span>
                      </div>
                    )}
                  </div>

                  {/* História (History) Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                      {/* Project Created - always show */}
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full flex-shrink-0"></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Created')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {currentProject?.created_at ? new Date(currentProject.created_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic history events */}
                      {getProjectHistory(currentProject?.id)?.slice().reverse().map((event, index) => {
                        const getEventColor = () => {
                          switch (event.type) {
                            case 'invoice_sent':
                              return 'bg-green-500';
                            case 'invoice_paid':
                              return 'bg-blue-500';
                            case 'invoice_deleted':
                              return 'bg-red-500';
                            case 'invoice_edited':
                              return 'bg-amber-500';
                            default:
                              return 'bg-gray-900 dark:bg-white';
                          }
                        };

                        const getEventLabel = () => {
                          switch (event.type) {
                            case 'invoice_created':
                              return t('Invoice Created');
                            case 'invoice_sent':
                              return t('Invoice Sent');
                            case 'invoice_paid':
                              return t('Invoice Paid');
                            case 'invoice_deleted':
                              return t('Invoice Deleted');
                            case 'invoice_edited':
                              return t('Invoice Edited');
                            default:
                              return event.type;
                          }
                        };

                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 ${getEventColor()} rounded-full flex-shrink-0`}></div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{getEventLabel()}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(event.date).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isClosingModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md ${isClosingModal ? 'animate-slide-out' : 'animate-slide-in'}`}>
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
    )}
    
    {/* New Room Modal */}
    {showNewRoomModal && (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isClosingModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto ${isClosingModal ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('New room')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {roomTypes.map((roomType, index) => (
              <button
                key={roomType}
                onClick={() => handleAddRoom(roomType)}
                className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center shadow-sm hover:shadow-md text-lg animate-slide-in-stagger"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {t(roomType)}
              </button>
            ))}
          </div>
          <button
            onClick={handleCloseNewRoomModal}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
          >
            {t('Cancel')}
          </button>
        </div>
      </div>
    )}

    {/* Custom Room Name Modal */}
    {showCustomRoomModal && (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isClosingModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md ${isClosingModal ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Custom Room Name')}</h3>
          <div className="mb-6">
            <input
              type="text"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              placeholder={t('Enter room name')}
              className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomRoomCreate();
                }
                if (e.key === 'Escape') {
                  handleCustomRoomCancel();
                }
              }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCustomRoomCancel}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleCustomRoomCreate}
              disabled={!customRoomName.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {t('Create')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Room Details Modal */}
    {showRoomDetailsModal && selectedRoom && (
      <RoomDetailsModal
        room={selectedRoom}
        workProperties={workProperties}
        onSave={(workData) => {
          console.log('[Projects] onSave callback - selectedRoom:', selectedRoom, 'id:', selectedRoom?.id);
          handleSaveRoomWork(selectedRoom.id, workData);
        }}
        onClose={handleCloseRoomDetailsModal}
      />
    )}

    {/* Project Price List Modal */}
    {showProjectPriceList && currentProject && (
      <ProjectPriceList
        projectId={currentProject.id}
        initialData={currentProject.priceListSnapshot}
        onClose={handleCloseProjectPriceList}
        onSave={handleSaveProjectPriceList}
      />
    )}

    {/* Contractor Profile Modal */}
    {showContractorModal && (
      <ContractorProfileModal
        onClose={() => setShowContractorModal(false)}
        onSave={handleSaveContractor}
      />
    )}

    {/* Contractor Warning Modal */}
    {showContractorWarning && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md animate-slide-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Contractor Required')}</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {t('A contractor must be assigned to duplicate a project. Please select a contractor first.')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowContractorWarning(false)}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={() => {
                setShowContractorWarning(false);
                setShowContractorSelector(true);
              }}
              className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors text-lg"
            >
              {t('Select Contractor')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Invoice Creation Modal */}
    {showInvoiceCreationModal && currentProject && (
      <InvoiceCreationModal
        isOpen={showInvoiceCreationModal}
        onClose={(newInvoice) => {
          setShowInvoiceCreationModal(false);
          if (newInvoice) {
            // Refresh project data to show invoice status
            setSelectedProject(prev => ({
              ...prev,
              hasInvoice: true,
              invoiceId: newInvoice.id,
              invoiceStatus: 'unsent'
            }));
          }
        }}
        project={currentProject}
        categoryId={activeCategory}
      />
    )}

    {/* Invoice Detail Modal */}
    {showInvoiceDetailModal && currentProject && (
      <InvoiceDetailModal
        isOpen={showInvoiceDetailModal}
        onClose={(updated) => {
          setShowInvoiceDetailModal(false);
          if (updated) {
            // Refresh project data if invoice status was updated
            const invoice = getInvoiceForProject(currentProject.id);
            if (invoice) {
              setSelectedProject(prev => ({
                ...prev,
                invoiceStatus: invoice.status
              }));
            }
          }
        }}
        invoice={getInvoiceForProject(currentProject.id)}
      />
    )}

    {/* Photo Viewer Modal - Lightbox with blur and zoom animation */}
    {selectedPhotoIndex !== null && projectPhotos.length > 0 && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
        onClick={handleClosePhoto}
      >
        {/* Blurred backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        {/* Close button */}
        <button
          onClick={handleClosePhoto}
          className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full hover:bg-black/50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation arrows */}
        {projectPhotos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevPhoto();
              }}
              className="absolute left-4 z-10 p-3 text-white/80 hover:text-white transition-all bg-black/30 rounded-full hover:bg-black/50 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextPhoto();
              }}
              className="absolute right-4 z-10 p-3 text-white/80 hover:text-white transition-all bg-black/30 rounded-full hover:bg-black/50 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image with zoom-in animation */}
        <img
          src={projectPhotos[selectedPhotoIndex]?.url}
          alt={projectPhotos[selectedPhotoIndex]?.name || 'Photo'}
          className="relative z-10 max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-zoom-in"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Photo counter */}
        <div className="absolute bottom-6 z-10 px-4 py-2 text-white/90 text-sm font-medium bg-black/40 rounded-full backdrop-blur-sm">
          {selectedPhotoIndex + 1} / {projectPhotos.length}
        </div>
      </div>
    )}
    </div>
    </>
  );
};

export default Projects;