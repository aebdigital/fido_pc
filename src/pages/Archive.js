import React, { useState } from 'react';
import { 
  Archive as ArchiveIcon, 
  ArrowLeft,
  ArchiveRestore,
  Trash2,
  ChevronRight,
  User,
  ClipboardList,
  BarChart3,
  Eye,
  Send
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import RoomDetailsModal from '../components/RoomDetailsModal';

const Archive = ({ onBack, fromArchive = false, projectId = null }) => {
  const { t } = useLanguage();
  const { 
    archivedProjects,
    projectRoomsData,
    clients,
    generalPriceList,
    unarchiveProject,
    deleteArchivedProject,
    calculateProjectTotalPrice,
    formatPrice,
    updateProjectRoom
  } = useAppData();

  // Show all archived projects regardless of contractor
  const allArchivedProjects = archivedProjects;

  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState('archive'); // 'archive', 'details'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [selectedClientForProject, setSelectedClientForProject] = useState(null);

  // If opened from archive with specific project ID, show that project
  React.useEffect(() => {
    if (fromArchive && projectId) {
      const project = allArchivedProjects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setCurrentView('details');
      }
    }
  }, [fromArchive, projectId, allArchivedProjects]);

  const handleUnarchiveProject = (projectId) => {
    unarchiveProject(projectId);
    
    // If we're currently viewing the unarchived project, go back to archive list
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(null);
      setCurrentView('archive');
    }
  };

  const handleDeleteProject = (projectId) => {
    deleteArchivedProject(projectId);
    
    // If we're currently viewing the deleted project, go back to archive list
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject(null);
      setCurrentView('archive');
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setCurrentView('details');
  };

  const handleBackToArchive = () => {
    setSelectedProject(null);
    setCurrentView('archive');
  };


  const getProjectRooms = (projectId) => {
    return projectRoomsData[projectId] || [];
  };

  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.2; // Default to 20% if not found
  };

  const handleOpenRoomDetails = (room) => {
    setSelectedRoom(room);
    setShowRoomDetailsModal(true);
  };

  const handleSaveRoomWork = (roomId, workData) => {
    if (!currentProject) return;
    
    updateProjectRoom(currentProject.id, roomId, { workItems: workData });
  };

  const currentProject = selectedProject;

  // Find associated client for the project
  React.useEffect(() => {
    if (currentProject) {
      const client = clients.find(c => 
        c.projects && c.projects.some(p => p.id === currentProject.id)
      );
      setSelectedClientForProject(client || null);
    }
  }, [currentProject, clients]);

  if (currentView === 'details' && currentProject) {
    return (
      <div className="pb-20 lg:pb-0">
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4 lg:space-y-6 min-w-0">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={fromArchive ? onBack : handleBackToArchive}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span className="hidden sm:inline">{t('Back to Archive')}</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
          
          {/* Project Header */}
          <div className="flex flex-col gap-2 lg:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">{currentProject.id}</span>
              <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-400 text-xs lg:text-sm font-medium rounded-full">
                {t('Archived')}
              </span>
              {currentProject.status && (
                <span className="px-2 py-1 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs lg:text-sm font-medium rounded-full">
                  {t(currentProject.status)}
                </span>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">{currentProject.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('Notes')}</p>
          </div>

          {/* Client Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Klient')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-white text-lg">
                  {selectedClientForProject ? selectedClientForProject.name : t('No client')}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                  {selectedClientForProject ? selectedClientForProject.email : t('No client assigned')}
                </div>
              </div>
            </div>
          </div>

          {/* Project Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Projekt')}</h2>
              </div>
            </div>

            <div className="space-y-3">
              {getProjectRooms(currentProject.id).map(room => (
                <div 
                  key={room.id}
                  className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md"
                  onClick={() => handleOpenRoomDetails(room)}
                >
                  <div className="transition-all duration-300 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-lg">{room.name}</div>
                    <div className="text-base text-gray-600 dark:text-gray-400">{room.workItems?.length || 0} {t('práce')}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:gap-4 mt-3 sm:mt-0">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(room.workItems ? room.workItems.reduce((total, item) => total + (item.price || 0), 0) : 0)}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Price overview')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white text-lg">{t('without VAT')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(currentProject.id))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white text-lg">{t('VAT (20%)')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(currentProject.id) * getVATRate())}</span>
                </div>
                <hr className="border-gray-300 dark:border-gray-600" />
                <div className="flex justify-between items-center">
                  <span className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Total price')}</span>
                  <span className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(currentProject.id) * (1 + getVATRate()))}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                  <Eye className="w-4 h-4" /> 
                  <span className="text-lg">{t('Preview')}</span>
                </button>
                <button className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-6 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                  <Send className="w-4 h-4" /> 
                  <span className="text-lg">{t('Send')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Project Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Project management')}</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              <button 
                onClick={() => handleUnarchiveProject(currentProject.id)}
                className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <ArchiveRestore className="w-4 h-4" /> 
                <span className="text-lg">{t('Unarchive')}</span>
              </button>
              <button 
                onClick={() => handleDeleteProject(currentProject.id)}
                className="flex-1 bg-red-500 text-white py-3 px-6 rounded-2xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <Trash2 className="w-4 h-4" /> 
                <span className="text-lg">{t('Delete Forever')}</span>
              </button>
            </div>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-2">
                  <ArchiveIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Archived')}</span>
                </div>
                <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                  {new Date(currentProject.archivedDate).toLocaleDateString()}
                </span>
              </div>
            </div>
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

        {/* Room Details Modal */}
        {showRoomDetailsModal && selectedRoom && (
          <RoomDetailsModal
            room={selectedRoom}
            onClose={() => setShowRoomDetailsModal(false)}
            onSave={handleSaveRoomWork}
            isReadOnly={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 lg:mb-8">
        <button 
          onClick={onBack}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('Archive')}</h1>
      </div>

      {/* Archive controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
          {t('Archived Projects')}
        </h2>
      </div>

      {/* Archived projects list */}
      {allArchivedProjects.length === 0 ? (
        <div className="text-center py-16">
          <ArchiveIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('No Archived Projects')}</h3>
          <p className="text-gray-500 dark:text-gray-500">{t('Archived projects will appear here')}</p>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {allArchivedProjects.map((project) => (
            <div 
              key={project.id}
              className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md"
            >
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-1 truncate">{project.name}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('Archived on')} {new Date(project.archivedDate).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('From')} {t(project.originalCategoryId)}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                <div className="text-left sm:text-right">
                  <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">VAT not included</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUnarchiveProject(project.id)}
                    className="bg-blue-500 hover:bg-blue-600 rounded-2xl p-3 transition-all duration-300"
                  >
                    <ArchiveRestore className="w-4 h-4 lg:w-5 lg:h-5 text-blue-100" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-red-100" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Archive;