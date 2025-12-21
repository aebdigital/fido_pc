import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/supabaseApi';
import { useAuth } from './AuthContext';
import { 
  transformClientFromDB, 
  transformContractorFromDB, 
  transformInvoiceFromDB 
} from '../utils/dataTransformers';
import { 
  calculateRoomPrice, 
  calculateRoomPriceWithMaterials, 
  calculateWorkItemWithMaterials,
  formatPrice
} from '../utils/priceCalculations';
import { useClientManager } from '../hooks/useClientManager';
import { useProjectManager } from '../hooks/useProjectManager';
import { useInvoiceManager } from '../hooks/useInvoiceManager';
import { useContractorManager } from '../hooks/useContractorManager';
import flatsImage from '../images/flats.jpg';
import housesImage from '../images/houses.webp';
import companiesImage from '../images/companies.jpg';
import cottagesImage from '../images/cottages.webp';

const AppDataContext = createContext();

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Default data structure
  const getDefaultData = () => ({
      clients: [],
      projectCategories: [
        {
          id: 'flats',
          name: 'Flats',
          count: 0,
          image: flatsImage,
          projects: []
        },
        {
          id: 'houses',
          name: 'Houses',
          count: 0,
          image: housesImage,
          projects: []
        },
        {
          id: 'companies',
          name: 'Companies',
          count: 0,
          image: companiesImage,
          projects: []
        },
        {
          id: 'cottages',
          name: 'Cottages',
          count: 0,
          image: cottagesImage,
          projects: []
        }
      ],
      archivedProjects: [], // Store archived projects
      projectRoomsData: {}, // Store rooms by project ID
      projectHistory: {}, // Store history events by project ID: { [projectId]: [{ type, date, ... }] }
      contractors: [], // Store contractor profiles
      contractorProjects: {}, // Store projects by contractor ID: { [contractorId]: { categories: [...], archivedProjects: [] } }
      invoices: [], // Store all invoices
      priceOfferSettings: {
        timeLimit: 30, // Days
        defaultValidityPeriod: 30
      },
      activeContractorId: null, // Currently selected contractor
      generalPriceList: {
        work: [
          { name: 'Preparatory and demolition works', price: 15, unit: '€/h' },
          { name: 'Wiring', subtitle: 'outlet', price: 65, unit: '€/pc' },
          { name: 'Plumbing', subtitle: 'outlet', price: 45, unit: '€/pc' },
          { name: 'Brick partitions', subtitle: '75 - 175mm', price: 18, unit: '€/m²' },
          { name: 'Brick load-bearing wall', subtitle: '200 - 450mm', price: 120, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'partition, simple', price: 50, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'partition, double', price: 70, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'partition, triple', price: 70, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'offset wall, simple', price: 50, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'offset wall, double', price: 70, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'ceiling', price: 100, unit: '€/m²' },
          { name: 'Netting', subtitle: 'wall', price: 6, unit: '€/m²' },
          { name: 'Netting', subtitle: 'ceiling', price: 8, unit: '€/m²' },
          { name: 'Plastering', subtitle: 'wall', price: 7, unit: '€/m²' },
          { name: 'Plastering', subtitle: 'ceiling', price: 7, unit: '€/m²' },
          { name: 'Facade Plastering', price: 80, unit: '€/m²' },
          { name: 'Installation of corner bead', price: 3, unit: '€/m' },
          { name: 'Plastering of window sash', price: 5, unit: '€/m' },
          { name: 'Penetration coating', price: 1, unit: '€/m²' },
          { name: 'Painting', subtitle: 'wall, 2 layers', price: 3, unit: '€/m²' },
          { name: 'Painting', subtitle: 'ceiling, 2 layers', price: 3, unit: '€/m²' },
          { name: 'Levelling', price: 7, unit: '€/m²' },
          { name: 'Floating floor', subtitle: 'laying', price: 7, unit: '€/m²' },
          { name: 'Skirting', subtitle: 'floating floor', price: 4, unit: '€/m' },
          { name: 'Tiling under 60cm', subtitle: 'ceramic', price: 30, unit: '€/m²' },
          { name: 'Jolly Edging', price: 25, unit: '€/m' },
          { name: 'Paving under 60cm', subtitle: 'ceramic', price: 30, unit: '€/m²' },
          { name: 'Plinth', subtitle: 'cutting and grinding', price: 15, unit: '€/m' },
          { name: 'Plinth', subtitle: 'bonding', price: 8, unit: '€/m' },
          { name: 'Large Format', subtitle: 'above 60cm', price: 80, unit: '€/m²' },
          { name: 'Grouting', subtitle: 'tiling and paving', price: 5, unit: '€/m²' },
          { name: 'Siliconing', price: 2, unit: '€/m' },
          { name: 'Window installation', price: 7, unit: '€/m' },
          { name: 'Installation of door jamb', price: 60, unit: '€/pc' },
          { name: 'Auxiliary and finishing work', price: 65, unit: '%' }
        ],
        material: [
          { name: 'Partition masonry', subtitle: '75 - 175mm', price: 30, unit: '€/m²' },
          { name: 'Load-bearing masonry', subtitle: '200 - 450mm', price: 160, unit: '€/m²' },
          { name: 'Plasterboard', subtitle: 'simple, partition', price: 7, unit: '€/pc', capacity: { value: 1, unit: 'm²' } },
          { name: 'Plasterboard', subtitle: 'double, partition', price: 99, unit: '€/pc', capacity: { value: 99, unit: 'm²' } },
          { name: 'Plasterboard', subtitle: 'triple, partition', price: 99, unit: '€/pc', capacity: { value: 99, unit: 'm²' } },
          { name: 'Plasterboard', subtitle: 'simple, offset wall', price: 15, unit: '€/pc', capacity: { value: 10, unit: 'm²' } },
          { name: 'Plasterboard', subtitle: 'double, offset wall', price: 20, unit: '€/pc', capacity: { value: 15, unit: 'm²' } },
          { name: 'Sádrokartón', subtitle: 'strop', price: 7, unit: '€/pc', capacity: { value: 3, unit: 'm²' } },
          { name: 'Mesh', price: 2, unit: '€/m²' },
          { name: 'Adhesive', subtitle: 'netting', price: 9, unit: '€/pkg', capacity: { value: 6, unit: 'm²' } },
          { name: 'Adhesive', subtitle: 'tiling and paving', price: 15, unit: '€/pkg', capacity: { value: 3, unit: 'm²' } },
          { name: 'Plaster', price: 13, unit: '€/pkg', capacity: { value: 8, unit: 'm²' } },
          { name: 'Facade Plaster', price: 25, unit: '€/pkg', capacity: { value: 10, unit: 'm²' } },
          { name: 'Corner bead', price: 4, unit: '€/pc', capacity: { value: 3, unit: 'm' } },
          { name: 'Primer', price: 1, unit: '€/m²' },
          { name: 'Paint', subtitle: 'wall', price: 1, unit: '€/m²' },
          { name: 'Paint', subtitle: 'ceiling', price: 1, unit: '€/m²' },
          { name: 'Self-levelling compound', price: 18, unit: '€/pkg', capacity: { value: 2, unit: 'm²' } },
          { name: 'Floating floor', price: 15, unit: '€/m²' },
          { name: 'Skirting board', price: 3, unit: '€/m' },
          { name: 'Silicone', price: 8, unit: '€/pkg', capacity: { value: 15, unit: 'm' } },
          { name: 'Tiles', subtitle: 'ceramic', price: 25, unit: '€/m²' },
          { name: 'Pavings', subtitle: 'ceramic', price: 25, unit: '€/m²' },
          { name: 'Auxiliary and fastening material', price: 10, unit: '%' }
        ],
        installations: [
          { name: 'Sanitary installations', subtitle: 'Corner valve', price: 10, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Standing mixer tap', price: 25, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Wall-mounted tap', price: 80, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Flush-mounted tap', price: 120, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Toilet combi', price: 65, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Concealed toilet', price: 120, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Sink', price: 50, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Sink with cabinet', price: 120, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Bathtub', price: 150, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Shower cubicle', price: 220, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Installation of gutter', price: 99, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Urinal', price: 100, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Bath screen', price: 150, unit: '€/pc' },
          { name: 'Sanitary installations', subtitle: 'Mirror', price: 50, unit: '€/pc' }
        ],
        others: [
          { name: 'Scaffolding', price: 10, unit: '€/days' },
          { name: 'Scaffolding', subtitle: 'assembly and disassembly', price: 30, unit: '€/m²' },
          { name: 'Core Drill', price: 25, unit: '€/h' },
          { name: 'Tool rental', price: 10, unit: '€/h' },
          { name: 'Custom work and material', price: 50, unit: '€' },
          { name: 'Commute', price: 1, unit: '€/km' },
          { name: 'VAT', price: 23, unit: '%' }
        ]
      }
    });

  // Helper function to get default categories structure
  const getDefaultCategories = () => [
    {
      id: 'flats',
      name: 'Flats',
      count: 0,
      image: flatsImage,
      projects: []
    },
    {
      id: 'houses',
      name: 'Houses',
      count: 0,
      image: housesImage,
      projects: []
    },
    {
      id: 'companies',
      name: 'Companies',
      count: 0,
      image: companiesImage,
      projects: []
    },
    {
      id: 'cottages',
      name: 'Cottages',
      count: 0,
      image: cottagesImage,
      projects: []
    }
  ];


    
      // Load initial data from Supabase
      const loadInitialData = useCallback(async () => {
        if (!user) {
          setLoading(false);
          return getDefaultData();
        }
    
        try {
          console.log('[SUPABASE] Loading data from Supabase...');
    
          // Load all data from Supabase in parallel
          const [contractors, clients, projects, invoices, allPriceLists] = await Promise.all([
            api.contractors.getAll(),
            api.clients.getAll(null), // We'll filter by contractor later
            api.projects.getAll(null), // We'll filter by contractor later
            api.invoices.getAll(null), // We'll filter by contractor later
            api.priceLists.getAll() // Get all price lists
          ]);
    
          console.log('[SUPABASE] Data loaded:', { contractors: contractors?.length, clients: clients?.length, projects: projects?.length, invoices: invoices?.length });
    
          // Transform contractors
          const transformedContractors = (contractors || []).map(transformContractorFromDB);
    
          // Transform clients
          const transformedClients = (clients || []).map(transformClientFromDB);
    
          // Transform projects to parse price_list_snapshot and photos from JSON
          const transformedProjects = (projects || []).map(project => {
            let priceListSnapshot = null;
            if (project.price_list_snapshot) {
              try {
                priceListSnapshot = typeof project.price_list_snapshot === 'string'
                  ? JSON.parse(project.price_list_snapshot)
                  : project.price_list_snapshot;
              } catch (e) {
                console.warn('Failed to parse price_list_snapshot for project:', project.id);
              }
            }
            let photos = [];
            if (project.photos) {
              try {
                photos = typeof project.photos === 'string'
                  ? JSON.parse(project.photos)
                  : project.photos;
              } catch (e) {
                console.warn('Failed to parse photos for project:', project.id);
              }
            }
            return {
              ...project,
              priceListSnapshot,
              photos,
              // Map snake_case to camelCase for frontend usage
              clientId: project.client_id,
              hasInvoice: project.has_invoice,
              invoiceId: project.invoice_id,
              invoiceStatus: project.invoice_status,
              isArchived: project.is_archived
            };
          });
    
          // Build contractor projects structure
          const contractorProjects = {};
          transformedContractors.forEach(contractor => {
            const contractorProjectsList = transformedProjects.filter(p => p.c_id === contractor.id);
    
                      // Group projects by category
                      const categories = getDefaultCategories().map(cat => ({
                        ...cat,
                        projects: contractorProjectsList.filter(p => p.category === cat.id && !p.is_archived),
                        count: contractorProjectsList.filter(p => p.category === cat.id && !p.is_archived).length
                      }));    
            contractorProjects[contractor.id] = {
              categories,
              archivedProjects: contractorProjectsList.filter(p => p.is_archived)
            };
          });
    
          // Get active contractor (first one or null)
          const activeContractorId = transformedContractors.length > 0 ? transformedContractors[0].id : null;
    
          // Use price list from database or default
          // Find the price list that matches the active contractor
          const priceListData = (allPriceLists || []).find(pl => pl.c_id === activeContractorId);
          const generalPriceList = priceListData?.data || getDefaultData().generalPriceList;
    
          // Transform invoices from database format to app format
          const transformedInvoices = (invoices || []).map(transformInvoiceFromDB).filter(Boolean);
    
          return {
            clients: transformedClients || [],
            projectCategories: getDefaultCategories(),
            archivedProjects: transformedProjects.filter(p => p.is_archived) || [],
            projectRoomsData: {}, // Initialize empty, will be populated on demand
            projectHistory: {}, // Initialize empty, will be populated during session
            contractors: transformedContractors || [],
            contractorProjects,
            invoices: transformedInvoices,
            priceOfferSettings: {
              timeLimit: 30,
              defaultValidityPeriod: 30
            },
            activeContractorId,
            generalPriceList
          };
        } catch (error) {
          console.error('[SUPABASE] Error loading data:', error);
          return getDefaultData();
        } finally {
          setLoading(false);
        }
      }, [user]);  
    const [appData, setAppData] = useState(getDefaultData);
  
      // Instantiate Managers
  
      const clientManager = useClientManager(appData, setAppData);
  
      const contractorManager = useContractorManager(appData, setAppData);
  
      // Pass findProjectById to invoiceManager as it needs it
  
      const projectManager = useProjectManager(appData, setAppData);
  
      const invoiceManager = useInvoiceManager(appData, setAppData);
  
    
  
    
  
      // Load data from Supabase on mount
      useEffect(() => {
        const loadData = async () => {
          const data = await loadInitialData();
          setAppData(prev => ({
            ...data,
            // Preserve existing room data to prevent wiping it on re-renders/tab switches
            projectRoomsData: {
              ...(prev?.projectRoomsData || {}),
              ...(data.projectRoomsData || {})
            }
          }));
        };
    
        if (user) {
          loadData();
        } else {
          setLoading(false);
        }
      }, [user, loadInitialData]);  
    














  const calculateProjectTotalPrice = (projectId, projectOverride = null) => {
    const rooms = projectManager.getProjectRooms(projectId);
    let totalPrice = 0;

    // Use provided project or find it
    let project = projectOverride;
    let projectPriceList = null;

    if (!project) {
      // Find the project to get its price list snapshot
      const projectResult = projectManager.findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }

    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    } else {
      // If no snapshot exists (old projects), fall back to current price list
      projectPriceList = appData.generalPriceList;
    }

    rooms.forEach(room => {
      const calculation = calculateRoomPriceWithMaterials(room, projectPriceList);
      totalPrice += calculation.total;
    });

    return totalPrice;
  };

  const calculateProjectTotalPriceWithBreakdown = (projectId, projectOverride = null) => {
    const rooms = projectManager.getProjectRooms(projectId);
    let totalWorkPrice = 0;
    let totalMaterialPrice = 0;
    let totalOthersPrice = 0;
    let allWorkItems = [];
    let allMaterialItems = [];
    let allOthersItems = [];
    
    // Use provided project or find it
    let project = projectOverride;
    let projectPriceList = null;
    
    if (!project) {
      // Find the project to get its price list snapshot
      const projectResult = projectManager.findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }
    
    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    } else {
      projectPriceList = appData.generalPriceList;
    }
    
    rooms.forEach(room => {
      const calculation = calculateRoomPriceWithMaterials(room, projectPriceList);
      totalWorkPrice += calculation.workTotal || 0;
      totalMaterialPrice += calculation.materialTotal || 0;
      totalOthersPrice += calculation.othersTotal || 0;
      
      if (calculation.items) {
        allWorkItems = allWorkItems.concat(calculation.items);
      }
      if (calculation.materialItems) {
        allMaterialItems = allMaterialItems.concat(calculation.materialItems);
      }
      if (calculation.othersItems) {
        allOthersItems = allOthersItems.concat(calculation.othersItems);
      }
    });
    
    return {
      workTotal: totalWorkPrice,
      materialTotal: totalMaterialPrice,
      othersTotal: totalOthersPrice,
      total: totalWorkPrice + totalMaterialPrice + totalOthersPrice,
      items: allWorkItems,
      materialItems: allMaterialItems,
      othersItems: allOthersItems
    };
  };

  // General price list management functions
  const updateGeneralPriceList = (category, itemIndex, newPrice) => {
    setAppData(prev => {
      const newGeneralPriceList = {
        ...prev.generalPriceList,
        [category]: prev.generalPriceList[category].map((item, index) =>
          index === itemIndex ? { ...item, price: parseFloat(newPrice) } : item
        )
      };

      // Save to Supabase if we have a contractor
      if (prev.activeContractorId) {
        api.priceLists.upsert({
          c_id: prev.activeContractorId,
          data: newGeneralPriceList
        }).catch(err => console.error('Failed to save price list:', err));
      }

      return {
        ...prev,
        generalPriceList: newGeneralPriceList
      };
    });
  };

  const resetGeneralPriceItem = (category, itemIndex) => {
    // Get the original price from defaults (we'll need to store this)
    const defaultData = getDefaultData();
    const originalPrice = defaultData.generalPriceList[category][itemIndex]?.price;
    
    if (originalPrice !== undefined) {
      setAppData(prev => {
        const newGeneralPriceList = {
          ...prev.generalPriceList,
          [category]: prev.generalPriceList[category].map((item, index) =>
            index === itemIndex ? { ...item, price: originalPrice } : item
          )
        };

        // Save to Supabase if we have a contractor
        if (prev.activeContractorId) {
          api.priceLists.upsert({
            c_id: prev.activeContractorId,
            data: newGeneralPriceList
          }).catch(err => console.error('Failed to save price list:', err));
        }

        return {
          ...prev,
          generalPriceList: newGeneralPriceList
        };
      });
    }
  };

  const contextValue = {
    // Data
    clients: appData.clients,
    projectCategories: contractorManager.getProjectCategoriesForContractor(appData.activeContractorId),
    projectRoomsData: appData.projectRoomsData,
    generalPriceList: appData.generalPriceList,
    archivedProjects: appData.archivedProjects,
    contractors: appData.contractors,
    priceOfferSettings: appData.priceOfferSettings,
    activeContractorId: appData.activeContractorId,
    invoices: appData.invoices,

    // Helper functions
    getProjectCategoriesForContractor: contractorManager.getProjectCategoriesForContractor,
    getArchivedProjectsForContractor: contractorManager.getArchivedProjectsForContractor,

    // Client functions
    addClient: clientManager.addClient,
    updateClient: clientManager.updateClient,
    deleteClient: clientManager.deleteClient,

    // Project functions
    addProject: projectManager.addProject,
    updateProject: projectManager.updateProject,
    deleteProject: projectManager.deleteProject,
    archiveProject: projectManager.archiveProject,
    unarchiveProject: projectManager.unarchiveProject,
    deleteArchivedProject: projectManager.deleteArchivedProject,

    // Contractor functions
    addContractor: contractorManager.addContractor,
    updateContractor: contractorManager.updateContractor,
    deleteContractor: contractorManager.deleteContractor,
    setActiveContractor: contractorManager.setActiveContractor,
    updatePriceOfferSettings: contractorManager.updatePriceOfferSettings,

    // Invoice functions
    createInvoice: (projectId, categoryId, invoiceData) => invoiceManager.createInvoice(projectId, categoryId, invoiceData, projectManager.findProjectById),
    updateInvoice: invoiceManager.updateInvoice,
    deleteInvoice: invoiceManager.deleteInvoice,
    getInvoiceById: invoiceManager.getInvoiceById,
    getInvoicesForContractor: invoiceManager.getInvoicesForContractor,
    getInvoiceForProject: invoiceManager.getInvoiceForProject,

    // History functions
    getProjectHistory: projectManager.getProjectHistory,
    addProjectHistoryEntry: projectManager.addProjectHistoryEntry,

    // Room functions
    addRoomToProject: projectManager.addRoomToProject,
    updateProjectRoom: projectManager.updateProjectRoom,
    deleteProjectRoom: projectManager.deleteProjectRoom,
    getProjectRooms: projectManager.getProjectRooms,
    
    // Relationship functions
    assignProjectToClient: clientManager.assignProjectToClient,
    removeProjectFromClient: clientManager.removeProjectFromClient,
    
    // Helper functions
    findProjectById: projectManager.findProjectById,
    findClientById: clientManager.findClientById,
    loadProjectDetails: projectManager.loadProjectDetails,
    
    // Price calculation functions
    calculateRoomPrice,
    calculateRoomPriceWithMaterials,
    calculateProjectTotalPrice,
    calculateProjectTotalPriceWithBreakdown,
    calculateWorkItemWithMaterials,
    formatPrice,
    
    // Price list management functions
    updateGeneralPriceList,
    resetGeneralPriceItem
  };

  // Show loading screen while data is being fetched
  if (loading) {
    return (
      <AppDataContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Loading data...
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we load your projects
            </div>
          </div>
        </div>
      </AppDataContext.Provider>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;