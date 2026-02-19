import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformContractorToDB, transformContractorFromDB } from '../utils/dataTransformers';
import constructionImage from '../images/construction.jpg';
import servicesImage from '../images/services.jpg';

// Duplicated from AppDataContext to avoid circular dependency or import issues for now
// Ideally this should be a constant
const getDefaultCategories = () => [
  { id: 'construction', name: 'Stavebníctvo', count: 0, image: constructionImage, projects: [] },
  { id: 'services', name: 'Služby a ostatné', count: 0, image: servicesImage, projects: [] }
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

  const setActiveContractor = useCallback(async (contractorId) => {
    // Save to localStorage for persistence across sessions
    if (contractorId) {
      localStorage.setItem('lastActiveContractorId', contractorId);
    }

    // OPTIMIZED: Load data for the new contractor (since we now filter by contractor)
    // This is needed because initial load only fetches data for the initially active contractor
    try {
      console.log('[setActiveContractor] Switching to contractor:', contractorId);

      // Fetch data filtered by the new contractor in parallel
      const [clients, projects, invoices, generalPriceListData] = await Promise.all([
        api.clients.getAll(contractorId),
        api.projects.getAll(contractorId),
        api.invoices.getAll(contractorId),
        api.priceLists.getGeneral(contractorId)
      ]);

      console.log('[setActiveContractor] Loaded data for contractor:', {
        clients: clients?.length,
        projects: projects?.length,
        invoices: invoices?.length
      });

      // Transform the loaded data
      const transformedClients = (clients || []).map(client => ({
        ...client,
        id: client.c_id || client.id
      }));

      const transformedProjects = (projects || []).map(project => ({
        ...project,
        id: project.c_id || project.id,
        clientId: project.client_id,
        hasInvoice: project.has_invoice,
        invoiceId: project.invoice_id,
        isArchived: project.is_archived
      }));

      // Re-associate projects to clients
      transformedClients.forEach(client => {
        client.projects = transformedProjects.filter(p => p.clientId === client.id && !p.isArchived);
      });

      // Build contractor projects structure
      const constructionCategories = ['flats', 'houses', 'firms', 'companies', 'cottages', 'construction'];
      const categories = getDefaultCategories().map(cat => {
        let projectsInCat = [];
        if (cat.id === 'construction') {
          projectsInCat = transformedProjects.filter(p => constructionCategories.includes(p.category) && !p.is_archived);
        } else if (cat.id === 'services') {
          projectsInCat = transformedProjects.filter(p => p.category === 'services' && !p.is_archived);
        } else {
          projectsInCat = transformedProjects.filter(p => p.category === cat.id && !p.is_archived);
        }
        return {
          ...cat,
          projects: projectsInCat,
          count: projectsInCat.length
        };
      });

      // Find contractor to get price offer settings
      const contractor = appData.contractors?.find(c => c.id === contractorId);
      let priceOfferSettings = appData.priceOfferSettings;
      if (contractor?.price_offer_settings) {
        try {
          const settings = typeof contractor.price_offer_settings === 'string'
            ? JSON.parse(contractor.price_offer_settings)
            : contractor.price_offer_settings;
          priceOfferSettings = { ...priceOfferSettings, ...settings };
        } catch (e) {
          console.warn('Failed to parse price offer settings', e);
        }
      }

      // Transform invoices
      const transformedInvoices = (invoices || []).map(inv => ({
        ...inv,
        id: inv.c_id || inv.id
      }));

      setAppData(prev => ({
        ...prev,
        activeContractorId: contractorId,
        clients: transformedClients,
        invoices: transformedInvoices,
        priceOfferSettings,
        generalPriceList: generalPriceListData ? prev.generalPriceList : prev.generalPriceList, // Keep existing if no new one
        contractorProjects: {
          ...prev.contractorProjects,
          [contractorId]: {
            categories,
            archivedProjects: transformedProjects.filter(p => p.is_archived)
          }
        }
      }));
    } catch (error) {
      console.error('[setActiveContractor] Error loading contractor data:', error);
      // Still switch the contractor even if data load fails
      setAppData(prev => ({
        ...prev,
        activeContractorId: contractorId
      }));
    }
  }, [setAppData, appData.contractors, appData.priceOfferSettings]);

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
  }, [appData.activeContractorId, appData.priceOfferSettings, setAppData]);

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
