import React, { useState } from 'react';
import { 
  Archive as ArchiveIcon, 
  ArrowLeft,
  ArchiveRestore,
  Trash2
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import ProjectDetailView from '../components/ProjectDetailView';

const Archive = ({ onBack }) => {
  const { t } = useLanguage();
  const { 
    archivedProjects,
    unarchiveProject,
    deleteArchivedProject,
    calculateProjectTotalPrice,
    formatPrice
  } = useAppData();

  const [selectedProject, setSelectedProject] = useState(null);

  // Show all archived projects regardless of contractor
  const allArchivedProjects = archivedProjects;

  const handleUnarchiveProject = (projectId, e) => {
    e.stopPropagation();
    unarchiveProject(projectId);
    // If the unarchived project was selected, go back to list
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };

  const handleDeleteProject = (projectId, e) => {
    e.stopPropagation();
    deleteArchivedProject(projectId);
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  const handleBackFromDetail = () => {
    setSelectedProject(null);
  };

  if (selectedProject) {
    return (
      <ProjectDetailView 
        project={selectedProject} 
        onBack={handleBackFromDetail}
        viewSource="archive"
      />
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
              className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer"
              onClick={() => handleProjectClick(project)}
            >
              <div className="flex-1">
                <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-1 truncate">{project.name}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('Archived on')} {project.archivedDate ? new Date(project.archivedDate).toLocaleDateString() : '-'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('From')} {t(project.originalCategoryId || 'Unknown')}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                <div className="text-left sm:text-right">
                  <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id, project))}</div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleUnarchiveProject(project.id, e)}
                    className="bg-blue-500 hover:bg-blue-600 rounded-2xl p-3 transition-all duration-300"
                    title={t('Unarchive')}
                  >
                    <ArchiveRestore className="w-4 h-4 lg:w-5 lg:h-5 text-blue-100" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300"
                    title={t('Delete Forever')}
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