import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformContractorToDB, transformContractorFromDB } from '../utils/dataTransformers';
import flatsImage from '../images/flats.jpg';
import housesImage from '../images/houses.webp';
import companiesImage from '../images/companies.jpg';
import cottagesImage from '../images/cottages.webp';

// Duplicated from AppDataContext to avoid circular dependency or import issues for now
// Ideally this should be a constant
const getDefaultCategories = () => [
  { id: 'flats', name: 'Flats', count: 0, image: flatsImage, projects: [] },
  { id: 'houses', name: 'Houses', count: 0, image: housesImage, projects: [] },
  { id: 'companies', name: 'Companies', count: 0, image: companiesImage, projects: [] },
  { id: 'cottages', name: 'Cottages', count: 0, image: cottagesImage, projects: [] }
];

export const useContractorManager = (appData, setAppData) => {
  const addContractor = useCallback(async (contractorData) => {
    try {
      const mappedData = transformContractorToDB(contractorData);
      const newContractorDB = await api.contractors.create(mappedData);
      const newContractor = transformContractorFromDB(newContractorDB);

      setAppData(prev => ({
        ...prev,
        contractors: [...prev.contractors, newContractor],
        activeContractorId: prev.activeContractorId || newContractor.id,
        contractorProjects: {
          ...prev.contractorProjects,
          [newContractor.id]: {
            categories: getDefaultCategories(),
            archivedProjects: []
          }
        }
      }));

      return newContractor;
    } catch (error) {
      console.error('[SUPABASE] Error adding contractor:', error);
      throw error;
    }
  }, [setAppData]);

  const updateContractor = useCallback(async (contractorId, contractorData) => {
    try {
      const mappedData = transformContractorToDB(contractorData);
      await api.contractors.update(contractorId, mappedData);

      setAppData(prev => ({
        ...prev,
        contractors: prev.contractors.map(contractor =>
          contractor.id === contractorId ? { ...contractor, ...contractorData } : contractor
        )
      }));
    } catch (error) {
      console.error('[SUPABASE] Error updating contractor:', error);
      throw error;
    }
  }, [setAppData]);

  const deleteContractor = useCallback(async (contractorId) => {
    try {
      await api.contractors.delete(contractorId);

      setAppData(prev => ({
        ...prev,
        contractors: prev.contractors.filter(contractor => contractor.id !== contractorId),
        activeContractorId: prev.activeContractorId === contractorId ? null : prev.activeContractorId
      }));
    } catch (error) {
      console.error('[SUPABASE] Error deleting contractor:', error);
      throw error;
    }
  }, [setAppData]);

  const setActiveContractor = useCallback((contractorId) => {
    setAppData(prev => ({
      ...prev,
      activeContractorId: contractorId
    }));
  }, [setAppData]);

  const updatePriceOfferSettings = useCallback(async (newSettings) => {
    try {
      if (!appData.activeContractorId) return;

      // Merge with existing settings
      const updatedSettings = {
        ...appData.priceOfferSettings,
        ...newSettings
      };

      // Update in Supabase
      await api.contractors.update(appData.activeContractorId, {
        price_offer_settings: updatedSettings
      });

      // Update local state
      setAppData(prev => ({
        ...prev,
        priceOfferSettings: {
          ...prev.priceOfferSettings,
          ...newSettings
        }
      }));
    } catch (error) {
      console.error('[SUPABASE] Error updating price offer settings:', error);
      throw error;
    }
  }, [appData.activeContractorId, setAppData]);

  // Helper function to get project categories for a specific contractor
  const getProjectCategoriesForContractor = useCallback((contractorId) => {
    if (!contractorId) {
      return appData.projectCategories || getDefaultCategories();
    }

    if (!appData.contractorProjects || !appData.contractorProjects[contractorId]) {
      return getDefaultCategories();
    }

    return appData.contractorProjects[contractorId].categories || getDefaultCategories();
  }, [appData.projectCategories, appData.contractorProjects]);

  // Helper function to get archived projects for a specific contractor
  const getArchivedProjectsForContractor = useCallback((contractorId) => {
    if (!contractorId) {
      return appData.archivedProjects || [];
    }

    if (!appData.contractorProjects || !appData.contractorProjects[contractorId]) {
      return [];
    }

    return appData.contractorProjects[contractorId].archivedProjects || [];
  }, [appData.archivedProjects, appData.contractorProjects]);

  // Helper function to get orphan projects (projects without a contractor)
  const getOrphanProjectCategories = useCallback(() => {
    const contractorIds = new Set((appData.contractors || []).map(c => c.id));
    const orphanCategories = getDefaultCategories();

    // Go through all contractor projects and find projects with c_id that doesn't match any contractor
    if (appData.contractorProjects) {
      Object.entries(appData.contractorProjects).forEach(([contractorId, data]) => {
        // If contractor doesn't exist anymore, these are orphan projects
        if (!contractorIds.has(contractorId)) {
          if (data.categories) {
            data.categories.forEach(category => {
              const orphanCategory = orphanCategories.find(c => c.id === category.id);
              if (orphanCategory && category.projects) {
                orphanCategory.projects = [...orphanCategory.projects, ...category.projects];
                orphanCategory.count = orphanCategory.projects.length;
              }
            });
          }
        }
      });
    }

    return orphanCategories;
  }, [appData.contractors, appData.contractorProjects]);

  // Check if there are any orphan projects
  const hasOrphanProjects = useCallback(() => {
    const categories = getOrphanProjectCategories();
    return categories.some(cat => cat.projects.length > 0);
  }, [getOrphanProjectCategories]);

  return {
    addContractor,
    updateContractor,
    deleteContractor,
    setActiveContractor,
    updatePriceOfferSettings,
    getProjectCategoriesForContractor,
    getArchivedProjectsForContractor,
    getOrphanProjectCategories,
    hasOrphanProjects
  };
};
