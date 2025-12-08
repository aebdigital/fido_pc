import React, { useState, useEffect, useRef } from 'react';
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
  FileText
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
    loadProjectDetails
  } = useAppData();
  
  const [activeCategory, setActiveCategory] = useState('flats');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState(window.innerWidth < 1024 ? 'categories' : 'projects'); // 'categories', 'projects', 'details'
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
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
      units: ['m', 'm²', 'm³', 'ks', 'bal', 'kg', 't', 'km', 'deň', 'hod'],
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


  const activeProjects = projectCategories.find(cat => cat.id === activeCategory)?.projects || [];
  const currentProject = selectedProject;

  // Handle navigation from clients page and invoices
  useEffect(() => {
    if (location.state?.selectedProjectId) {
      const projectId = location.state.selectedProjectId;
      const client = location.state.selectedClient;
      const categoryId = location.state.selectedCategoryId;

      // Find the project in the categories
      // If categoryId is provided, search in that category first for efficiency
      const categoriesToSearch = categoryId
        ? [projectCategories.find(c => c.id === categoryId), ...projectCategories.filter(c => c.id !== categoryId)]
        : projectCategories;

      for (const category of categoriesToSearch) {
        if (!category) continue;
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          setActiveCategory(category.id);
          setSelectedProject(project);
          setCurrentView('details');
          if (client) {
            setSelectedClientForProject(client);
          }
          break;
        }
      }
    }
  }, [location.state, projectCategories, setActiveCategory, setSelectedProject, setCurrentView, setSelectedClientForProject]);

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
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
    setSelectedClientForProject(null);
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

  const handleSaveProjectPriceList = () => {
    // In a real app, this would save to backend with project ID
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
      const doc = generateInvoicePDF({
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
      doc.output('dataurlnewwindow');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('Unable to generate PDF. Please try again.'));
    }
  };

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
        {/* Category Selection - Mobile: horizontal scroll, Desktop: sidebar */}
        <div className={`lg:w-80 flex lg:flex-col w-screen lg:w-80 ${currentView === 'details' ? 'hidden lg:flex' : currentView === 'categories' ? 'hidden lg:flex' : 'hidden lg:flex'}`} style={{maxWidth: '100vw'}}>
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
                <div className="h-24 lg:h-32 relative">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3 flex justify-between items-end">
                    <h3 className="text-base lg:text-xl font-bold text-white">{t(category.name)}</h3>
                    <span className="text-white text-xs lg:text-base font-medium">{category.count}</span>
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
            <div className="pt-4 pb-4 lg:hidden space-y-6 min-w-0 w-full">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                {t('Vyberte kategóriu projektov')}
              </h2>
              <div className="space-y-4">
                {projectCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="w-full h-32 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md relative"
                  >
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
                      <h3 className="text-xl font-bold text-white">{t(category.name)}</h3>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
            <div className="flex-1 p-0 lg:p-6 overflow-y-auto space-y-4 lg:space-y-6 min-w-0">
              {/* Header with back button */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleBackToProjects}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  <span className="hidden sm:inline">{t('Back to Project List')}</span>
                  <span className="sm:hidden">Back</span>
                </button>
              </div>
            {/* Project Header */}
            <div className="flex flex-col gap-2 lg:gap-4">
              <div className="flex items-center gap-2">
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
                    className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                    autoFocus
                  />
                ) : (
                  <>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex-1">{currentProject.name}</h1>
                    <button
                      onClick={handleEditProjectName}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </>
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
                      onClick={() => setShowInvoiceDetailModal(true)}
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

                <div
                  onClick={() => setShowContractorSelector(true)}
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
              </div>

              <div className="flex gap-3">
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
              </div>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-900 dark:bg-white rounded-full flex-shrink-0"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    <span className="text-base font-medium text-gray-900 dark:text-white">{t('Created')}</span>
                  </div>
                  <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400">31/10/2025, 22:08</span>
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
    </div>
    </>
  );
};

export default Projects;