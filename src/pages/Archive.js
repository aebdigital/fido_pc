import React, { useState, useRef, useEffect } from 'react';
import {
  Archive as ArchiveIcon,
  ArrowLeft,
  ArchiveRestore,
  Trash2,
  Loader2
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
    formatPrice,
    priceOfferSettings,
    updatePriceOfferSettings
  } = useAppData();

  const [selectedProject, setSelectedProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [unarchivingProjectId, setUnarchivingProjectId] = useState(null);
  const [archiveRetentionDays, setArchiveRetentionDays] = useState(priceOfferSettings?.archiveRetentionDays || 30);
  const [isSaving, setIsSaving] = useState(false);
  const archiveDebounceRef = useRef(null);

  // Show all archived projects regardless of contractor
  const allArchivedProjects = archivedProjects;

  useEffect(() => {
    return () => {
      if (archiveDebounceRef.current) clearTimeout(archiveDebounceRef.current);
    };
  }, []);

  const handleArchiveRetentionChange = (days) => {
    setArchiveRetentionDays(days);
    if (archiveDebounceRef.current) {
      clearTimeout(archiveDebounceRef.current);
    }

    setIsSaving(true);
    archiveDebounceRef.current = setTimeout(async () => {
      try {
        await updatePriceOfferSettings({ archiveRetentionDays: days });
      } catch (error) {
        console.error('Error saving archive settings:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  };



  const handleUnarchiveProject = async (projectId, e) => {
    e.stopPropagation();
    setUnarchivingProjectId(projectId);
    try {
      await unarchiveProject(projectId);
      // If the unarchived project was selected, go back to list
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } finally {
      setUnarchivingProjectId(null);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    setDeletingProjectId(projectId);
    try {
      await deleteArchivedProject(projectId);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } finally {
      setDeletingProjectId(null);
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
        <h1 className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('Archive')}</h1>
      </div>

      {/* Archive Settings */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 lg:mb-6">
          <ArchiveIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Archiving period')}</h2>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="grid grid-cols-4 gap-2 flex-1 lg:flex lg:flex-initial lg:gap-3">
                {[14, 30, 60, 9999].map((days) => (
                  <button
                    key={days}
                    onClick={() => handleArchiveRetentionChange(days)}
                    className={`py-1.5 lg:px-4 lg:py-2 rounded-xl font-semibold transition-all text-sm lg:text-base text-center flex items-center justify-center gap-2 shadow-sm ${archiveRetentionDays === days
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 transform scale-[1.02]'
                      : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${archiveRetentionDays === days ? 'bg-blue-400' : 'bg-transparent'}`} />
                    {days === 9999 ? t('Forever') : `${days} ${t('days')}`}
                  </button>
                ))}
              </div>
              {isSaving && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-2" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {archiveRetentionDays >= 9999
                ? t('Your projects will remain in archive forever. They will not be deleted, unless you do so.')
                : `${t('Your projects will remain in archive for')} ${archiveRetentionDays} ${t('days')}, ${t('after that they will be deleted automatically')}.`
              }
            </p>
          </div>
        </div>
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
                  {(() => {
                    if (!project.archivedDate) return '-';
                    const archived = new Date(project.archivedDate);
                    const deletionDate = new Date(archived);
                    // Use the state but ensure it's a number
                    const retention = parseInt(archiveRetentionDays) || 30;

                    if (retention >= 9999) {
                      return t('Forever');
                    }

                    deletionDate.setDate(archived.getDate() + retention);
                    const now = new Date();
                    const diffTime = deletionDate - now;
                    // Provide 0 if over time, ensure at least 0
                    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                    let dayString = t('days'); // default 'dní' (5+)
                    if (daysLeft === 1) dayString = t('day'); // 'deň'
                    else if (daysLeft >= 2 && daysLeft <= 4) dayString = t('days_2_4'); // 'dni'

                    return `${daysLeft} ${dayString} ${t('until deletion')}`;
                  })()}
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
                    disabled={unarchivingProjectId === project.id || deletingProjectId === project.id}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-3 transition-all duration-300"
                    title={t('Unarchive')}
                  >
                    {unarchivingProjectId === project.id ? (
                      <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-blue-100 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArchiveRestore className="w-4 h-4 lg:w-5 lg:h-5 text-blue-100" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    disabled={deletingProjectId === project.id || unarchivingProjectId === project.id}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-3 transition-all duration-300"
                    title={t('Delete Forever')}
                  >
                    {deletingProjectId === project.id ? (
                      <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-red-100 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-red-100" />
                    )}
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