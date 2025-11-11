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
  Send
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import RoomDetailsModal from '../components/RoomDetailsModal';
import ProjectPriceList from '../components/ProjectPriceList';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';

const Projects = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { 
    projectCategories, 
    clients, 
    generalPriceList,
    addProject, 
    deleteProject, 
    assignProjectToClient,
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    calculateRoomPrice,
    calculateProjectTotalPrice,
    formatPrice
  } = useAppData();
  
  const [activeCategory, setActiveCategory] = useState('flats');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState('projects'); // 'projects', 'details'
  
  // Helper function to get current VAT rate from price list
  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.2; // Default to 20% if not found
  };
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedClientForProject, setSelectedClientForProject] = useState(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showProjectPriceList, setShowProjectPriceList] = useState(false);
  const [projectDeleteMode, setProjectDeleteMode] = useState(false);
  const dropdownRef = useRef(null);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);


  const roomTypes = [
    t('Chodba'), t('WC'), t('Kúpeľňa'), t('Kuchyňa'), 
    t('Obývačka'), t('Detská izba'), t('Spálňa'), t('Hostovská'),
    t('Pracovňa'), t('Vlastné')
  ];

  const workProperties = [
    {
      id: 'preparatory',
      name: t('Prípravné a búracie práce'),
      fields: [{ name: t('Trvanie'), unit: t('hod'), type: 'number' }]
    },
    {
      id: 'wiring',
      name: t('Elektroinštalatérske práce'),
      subtitle: t('vyvínač, zásuvka, svetlo, bod napojenia'),
      fields: [{ name: t('Počet vývodov'), unit: t('ks'), type: 'number' }]
    },
    {
      id: 'plumbing',
      name: 'Plumbing',
      subtitle: 'hot, cold, waste, connection point',
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
      fields: [
        { name: 'Length', unit: 'bm', type: 'number' }
      ]
    },
    {
      id: 'window_sash',
      name: 'Plastering of window sash',
      fields: [
        { name: 'Length', unit: 'bm', type: 'number' }
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
        { name: 'Large Format', subtitle: 'above 60cm', type: 'toggle' }
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
      fields: [
        { name: 'Length', unit: 'bm', type: 'number' }
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
        { name: 'Circumference', unit: 'bm', type: 'number' },
        { name: 'Price', unit: '€/pc', type: 'number' }
      ]
    },
    {
      id: 'door_jamb_installation',
      name: 'Installation of door jamb',
      fields: [
        { name: 'Count', unit: 'pc', type: 'number' },
        { name: 'Price', unit: '€/pc', type: 'number' }
      ]
    },
    {
      id: 'custom_work',
      name: 'Custom work and material',
      fields: [
        { name: 'Description', unit: 'text', type: 'text' },
        { name: 'Price', unit: '€', type: 'number' }
      ]
    },
    {
      id: 'commute',
      name: 'Commute',
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
            { name: 'Length', unit: 'bm', type: 'number' },
            { name: 'Height', unit: 'bm', type: 'number' },
            { name: 'Rental duration', unit: 'day', type: 'number' }
          ]
        },
        {
          name: 'Core drill',
          fields: [{ name: 'Count', unit: 'h', type: 'number' }]
        },
        {
          name: 'Tool',
          fields: [{ name: 'Count', unit: 'h', type: 'number' }]
        }
      ]
    }
  ];


  const activeProjects = projectCategories.find(cat => cat.id === activeCategory)?.projects || [];
  const currentProject = selectedProject;

  // Handle navigation from clients page
  useEffect(() => {
    if (location.state?.selectedProjectId) {
      const projectId = location.state.selectedProjectId;
      const client = location.state.selectedClient;
      
      // Find the project in the categories
      for (const category of projectCategories) {
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
  }, [location.state, projectCategories]);

  const handleCreateProfile = () => {
    setShowProfileDropdown(false);
    // Add profile creation logic here
  };


  const handleNewProject = () => {
    if (newProjectName.trim()) {
      const newProject = addProject(activeCategory, { name: newProjectName.trim() });
      
      setNewProjectName('');
      setShowNewProjectModal(false);
      
      // Automatically navigate to the new project
      setSelectedProject(newProject);
      setCurrentView('details');
    }
  };

  const handleAddRoom = (roomType) => {
    if (!currentProject) return;
    
    const newRoom = addRoomToProject(currentProject.id, { name: roomType });
    setShowNewRoomModal(false);
    
    // Automatically open the room details modal for the new room
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleOpenRoomDetails = (room) => {
    setSelectedRoom(room);
    setShowRoomDetailsModal(true);
  };

  const handleSaveRoomWork = (roomId, workData) => {
    if (!currentProject) return;
    
    updateProjectRoom(currentProject.id, roomId, { workItems: workData });
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

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('details');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
  };

  const handleClientSelect = (client) => {
    setSelectedClientForProject(client);
    setShowClientSelector(false);
    
    // Assign the current project to the selected client
    if (currentProject) {
      assignProjectToClient(client.id, currentProject.id, currentProject.name);
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
    // In a real app, this would save to backend with project ID
    console.log('Saving project price data:', priceData);
    setShowProjectPriceList(false);
  };

  const toggleProjectDeleteMode = () => {
    setProjectDeleteMode(!projectDeleteMode);
  };

  const handleDeleteProject = (projectId) => {
    deleteProject(activeCategory, projectId);
    
    // If we're currently viewing the deleted project, go back to project list
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(null);
      setCurrentView('projects');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('Projekty')}</h1>
      
      {/* Profile Dropdown - always visible */}
      <div className="mb-6 relative" ref={dropdownRef}>
        <button 
          className="flex items-center gap-2"
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        >
          <span className="text-lg font-medium text-gray-900 dark:text-white">vhh</span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        
        {/* Profile Dropdown */}
        {showProfileDropdown && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-10">
            <div className="p-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={handleCreateProfile}>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Create profile</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Fill out information for price offers</p>
                </div>
                <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full">
        {/* Left Sidebar - Categories */}
        <div className="w-80 flex flex-col">
          <div className="flex-1 p-4 space-y-3">
            {projectCategories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full rounded-2xl overflow-hidden transition-all duration-200 ${
                  activeCategory === category.id 
                    ? 'ring-2 ring-gray-500 dark:ring-gray-400 shadow-lg transform scale-105' 
                    : 'hover:shadow-md'
                }`}
              >
                <div className="h-32 relative">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end">
                    <h3 className="text-lg font-bold text-white">{t(category.name)}</h3>
                    <span className="text-white text-sm font-medium">{category.count} {t('projekty')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side - Projects or Details */}
        <div className="flex-1 flex flex-col">
          {/* Project List View */}
          {currentView === 'projects' && (
            <div className="p-6 space-y-6">
              {/* Project List Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {t(projectCategories.find(cat => cat.id === activeCategory)?.name)} {t('Projekty')}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleProjectDeleteMode}
                    className={`p-2 transition-colors ${
                      projectDeleteMode 
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowNewProjectModal(true)}
                    className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
{t('Pridať projekt')}
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-3">
                {activeProjects.map(project => (
                  <div
                    key={project.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 flex items-center transition-all duration-300 ${
                      projectDeleteMode 
                        ? 'justify-between' 
                        : 'justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                    }`}
                    onClick={projectDeleteMode ? undefined : () => handleProjectSelect(project)}
                  >
                    <div className={`flex-1 transition-all duration-300 ${projectDeleteMode ? 'mr-4' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{project.id}</span>
                        {project.status && (
                          <span className="px-2 py-1 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                            {project.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Notes</p>
                    </div>
                    
                    {projectDeleteMode ? (
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5"
                      >
                        <Trash2 className="w-5 h-5 text-red-100" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">VAT not included</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeProjects.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No projects in this category yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Project Details View */}
          {currentView === 'details' && currentProject && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Header with back button */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleBackToProjects}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  {t('Back to Project List')}
                </button>
              </div>
            {/* Project Header */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{currentProject.id}</span>
                {currentProject.status && (
                  <span className="px-2 py-1 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                    {t(currentProject.status)}
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{currentProject.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t('Notes')}</p>

            {/* Client Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Klient')}</h2>
              </div>
              <div 
                onClick={handleClientSelectorOpen}
                className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedClientForProject ? selectedClientForProject.name : t('No client')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedClientForProject ? selectedClientForProject.email : t('Associate project with a client')}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              
              {/* Client Selector Modal */}
              {showClientSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 max-w-md mx-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Select Client</h3>
                    <div className="space-y-3 mb-6">
                      {clients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{client.email}</div>
                        </button>
                      ))}
                      {clients.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <p>No clients available. Create a client first.</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowClientSelector(false)}
                      className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Projekt')}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    className={`p-2 transition-colors ${
                      deleteMode 
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={toggleDeleteMode}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setShowNewRoomModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {getProjectRooms(currentProject.id).map(room => (
                  <div 
                    key={room.id}
                    className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center transition-all duration-300 ${
                      deleteMode 
                        ? 'justify-between' 
                        : 'justify-between hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
                    }`}
                    onClick={deleteMode ? undefined : () => handleOpenRoomDetails(room)}
                  >
                    <div className={`transition-all duration-300 ${deleteMode ? 'flex-1 mr-4' : ''}`}>
                      <div className="font-medium text-gray-900 dark:text-white">{room.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{room.workItems.length} {t('práce')}</div>
                    </div>
                    
                    {deleteMode ? (
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5"
                      >
                        <Trash2 className="w-5 h-5 text-red-100" />
                      </button>
                    ) : (
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                          <div className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateRoomPrice(room))}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
                
                {getProjectRooms(currentProject.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No rooms added yet. Click the + button to add a room.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total Price Offer */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h2>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white">{t('without VAT')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(currentProject.id))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white">{t('VAT (20%)')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(currentProject.id) * getVATRate())}</span>
                  </div>
                  <hr className="border-gray-300 dark:border-gray-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price')}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(currentProject.id) * (1 + getVATRate()))}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> {t('Preview')}
                  </button>
                  <button className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-6 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> {t('Send')}
                  </button>
                </div>
              </div>
            </div>

            {/* Project Management */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Project management')}</h2>
              </div>
              <div className="space-y-3">
                <div 
                  onClick={handleOpenProjectPriceList}
                  className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('Project price list')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('last change')}: 31 Oct 2025</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
                  <div className="font-medium text-gray-900 dark:text-white">vhh</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> {t('Duplicate')}
                </button>
                <button className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-6 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                  <Archive className="w-4 h-4" /> {t('Archive')}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-900 dark:bg-white rounded-full"></div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Created')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">31/10/2025, 22:08</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* New Project Modal */}
      {showNewProjectModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 max-w-md mx-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">New Project</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* New Room Modal */}
    {showNewRoomModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-96 max-w-md mx-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">New room</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roomTypes.map(roomType => (
              <button
                key={roomType}
                onClick={() => handleAddRoom(roomType)}
                className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
              >
                {roomType}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewRoomModal(false)}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Room Details Modal */}
    {showRoomDetailsModal && selectedRoom && (
      <RoomDetailsModal
        room={selectedRoom}
        workProperties={workProperties}
        onSave={(workData) => handleSaveRoomWork(selectedRoom.id, workData)}
        onClose={() => {
          setShowRoomDetailsModal(false);
          setSelectedRoom(null);
        }}
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
    </div>
  );
};

export default Projects;