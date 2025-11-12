import React, { createContext, useContext, useState, useEffect } from 'react';
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
  // Default data structure
  const getDefaultData = () => ({
      clients: [
        {
          id: 1,
          name: 'lol',
          email: 'hhh',
          phone: '-',
          type: 'private',
          street: '-',
          additionalInfo: '-',
          city: '-',
          postalCode: '-',
          country: '-',
          projects: [
            {
              id: '2025001',
              name: 'lol',
              rooms: 1,
              price: '€6 756,75',
              note: 'VAT not included'
            }
          ]
        }
      ],
      projectCategories: [
        {
          id: 'flats',
          name: 'Flats',
          count: 3,
          image: flatsImage,
          projects: [
            { id: '2025003', name: 'test Copy', status: 'not sent' },
            { id: '2025002', name: 'test' },
            { id: '2025001', name: 'test', price: '€7 152,75', note: 'VAT not included', status: 'not sent' }
          ]
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
      contractors: [], // Store contractor profiles
      contractorProjects: {}, // Store projects by contractor ID: { [contractorId]: { categories: [...], archivedProjects: [] } }
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
          { name: 'Plasterboarding', subtitle: 'partition, simple', price: 40, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'partition, double', price: 99, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'partition, triple', price: 99, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'offset wall, simple', price: 40, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'offset wall, double', price: 60, unit: '€/m²' },
          { name: 'Plasterboarding', subtitle: 'ceiling', price: 25, unit: '€/m²' },
          { name: 'Netting', subtitle: 'wall', price: 6, unit: '€/m²' },
          { name: 'Netting', subtitle: 'ceiling', price: 8, unit: '€/m²' },
          { name: 'Plastering', subtitle: 'wall', price: 7, unit: '€/m²' },
          { name: 'Plastering', subtitle: 'ceiling', price: 7, unit: '€/m²' },
          { name: 'Facade Plastering', price: 80, unit: '€/m²' },
          { name: 'Installation of corner bead', price: 3, unit: '€/bm' },
          { name: 'Plastering of window sash', price: 5, unit: '€/bm' },
          { name: 'Penetration coating', price: 1, unit: '€/m²' },
          { name: 'Painting', subtitle: 'wall, 2 layers', price: 3, unit: '€/m²' },
          { name: 'Painting', subtitle: 'ceiling, 2 layers', price: 3, unit: '€/m²' },
          { name: 'Levelling', price: 7, unit: '€/m²' },
          { name: 'Floating floor', subtitle: 'laying', price: 7, unit: '€/m²' },
          { name: 'Skirting', subtitle: 'floating floor', price: 4, unit: '€/bm' },
          { name: 'Tiling under 60cm', subtitle: 'ceramic', price: 30, unit: '€/m²' },
          { name: 'Jolly Edging', price: 25, unit: '€/m' },
          { name: 'Paving under 60cm', subtitle: 'ceramic', price: 30, unit: '€/m²' },
          { name: 'Plinth', subtitle: 'cutting and grinding', price: 15, unit: '€/m' },
          { name: 'Plinth', subtitle: 'bonding', price: 8, unit: '€/m' },
          { name: 'Large Format', subtitle: 'above 60cm', price: 80, unit: '€/m²' },
          { name: 'Grouting', subtitle: 'tiling and paving', price: 5, unit: '€/m²' },
          { name: 'Siliconing', price: 2, unit: '€/bm' },
          { name: 'Sanitary installation', subtitle: 'corner valve', price: 10, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'standing mixer tap', price: 25, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'wall-mounted tap', price: 80, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'flush-mounted tap', price: 120, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'toilet combi', price: 65, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'toilet with concealed cistern', price: 120, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'sink', price: 50, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'sink with cabinet', price: 120, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'bathtub', price: 150, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'shower cubicle', price: 220, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'installation of gutter', price: 99, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'urinal', price: 100, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'bath screen', price: 150, unit: '€/pc' },
          { name: 'Sanitary installation', subtitle: 'mirror', price: 50, unit: '€/pc' },
          { name: 'Window installation', price: 7, unit: '€/bm' },
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
          { name: 'Plasterboard', subtitle: 'ceiling', price: 7, unit: '€/pc', capacity: { value: 3, unit: 'm²' } },
          { name: 'Mesh', price: 2, unit: '€/m²' },
          { name: 'Adhesive', subtitle: 'netting', price: 9, unit: '€/pkg' },
          { name: 'Adhesive', subtitle: 'tiling and paving', price: 15, unit: '€/pkg', capacity: { value: 3, unit: 'm²' } },
          { name: 'Plaster', price: 13, unit: '€/pkg', capacity: { value: 8, unit: 'm²' } },
          { name: 'Facade Plaster', price: 25, unit: '€/pkg', capacity: { value: 10, unit: 'm²' } },
          { name: 'Corner bead', price: 4, unit: '€/pc', capacity: { value: 3, unit: 'bm' } },
          { name: 'Primer', price: 1, unit: '€/m²' },
          { name: 'Paint', subtitle: 'wall', price: 1, unit: '€/m²' },
          { name: 'Paint', subtitle: 'ceiling', price: 1, unit: '€/m²' },
          { name: 'Self-levelling compound', price: 18, unit: '€/pkg', capacity: { value: 2, unit: 'm²' } },
          { name: 'Floating floor', price: 15, unit: '€/m²' },
          { name: 'Skirting board', price: 3, unit: '€/bm' },
          { name: 'Silicone', price: 8, unit: '€/pkg', capacity: { value: 15, unit: 'bm' } },
          { name: 'Tiles', subtitle: 'ceramic', price: 25, unit: '€/m²' },
          { name: 'Pavings', subtitle: 'ceramic', price: 25, unit: '€/m²' },
          { name: 'Auxiliary and fastening material', price: 10, unit: '%' }
        ],
        others: [
          { name: 'Scaffolding', price: 10, unit: '€/days' },
          { name: 'Scaffolding', subtitle: 'assembly and disassembly', price: 30, unit: '€/m²' },
          { name: 'Core Drill', price: 25, unit: '€/h' },
          { name: 'Tool rental', price: 10, unit: '€/h' },
          { name: 'Commute', price: 1, unit: '€/km' },
          { name: 'VAT', price: 20, unit: '%' }
        ]
      }
    });

  // Load initial data from localStorage or use defaults
  const loadInitialData = () => {
    const saved = localStorage.getItem('appData');
    if (saved) {
      const parsedData = JSON.parse(saved);
      const defaultData = getDefaultData();
      
      // Ensure projectRoomsData exists for backward compatibility
      if (!parsedData.projectRoomsData) {
        parsedData.projectRoomsData = {};
      }
      // Ensure generalPriceList exists for backward compatibility
      if (!parsedData.generalPriceList) {
        parsedData.generalPriceList = defaultData.generalPriceList;
      }
      // Ensure archivedProjects exists for backward compatibility
      if (!parsedData.archivedProjects) {
        parsedData.archivedProjects = [];
      }
      // Ensure contractors exists for backward compatibility
      if (!parsedData.contractors) {
        parsedData.contractors = [];
      }
      // Ensure priceOfferSettings exists for backward compatibility
      if (!parsedData.priceOfferSettings) {
        parsedData.priceOfferSettings = {
          timeLimit: 30,
          defaultValidityPeriod: 30
        };
      }
      // Ensure activeContractorId exists for backward compatibility
      if (parsedData.activeContractorId === undefined) {
        parsedData.activeContractorId = null;
      }
      // Ensure contractorProjects exists for backward compatibility
      if (!parsedData.contractorProjects) {
        parsedData.contractorProjects = {};
      }
      return parsedData;
    }
    
    return getDefaultData();
  };

  const [appData, setAppData] = useState(loadInitialData);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('appData', JSON.stringify(appData));
  }, [appData]);

  // Client management functions
  const addClient = (clientData) => {
    const newClient = {
      id: Date.now(),
      ...clientData,
      projects: []
    };
    
    setAppData(prev => ({
      ...prev,
      clients: [...prev.clients, newClient]
    }));
    
    return newClient;
  };

  const updateClient = (clientId, clientData) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(client => 
        client.id === clientId ? { ...client, ...clientData } : client
      )
    }));
  };

  const deleteClient = (clientId) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.filter(client => client.id !== clientId)
    }));
  };

  // Project management functions
  const addProject = (categoryId, projectData) => {
    const newProject = {
      id: `${new Date().getFullYear()}${String(Date.now()).slice(-3)}`,
      ...projectData,
      status: 'not sent'
    };

    setAppData(prev => {
      const activeContractorId = prev.activeContractorId;
      
      if (!activeContractorId) {
        // Fallback to global projects if no contractor selected
        return {
          ...prev,
          projectCategories: prev.projectCategories.map(category => {
            if (category.id === categoryId) {
              return {
                ...category,
                projects: [newProject, ...category.projects],
                count: category.count + 1
              };
            }
            return category;
          })
        };
      }

      // Add to contractor-specific projects
      // Initialize contractor project structure if it doesn't exist
      if (!prev.contractorProjects[activeContractorId]) {
        return {
          ...prev,
          contractorProjects: {
            ...prev.contractorProjects,
            [activeContractorId]: {
              categories: getDefaultCategories().map(category => {
                if (category.id === categoryId) {
                  return {
                    ...category,
                    projects: [newProject],
                    count: 1
                  };
                }
                return category;
              }),
              archivedProjects: []
            }
          }
        };
      }

      return {
        ...prev,
        contractorProjects: {
          ...prev.contractorProjects,
          [activeContractorId]: {
            ...prev.contractorProjects[activeContractorId],
            categories: prev.contractorProjects[activeContractorId].categories.map(category => {
              if (category.id === categoryId) {
                return {
                  ...category,
                  projects: [newProject, ...category.projects],
                  count: category.count + 1
                };
              }
              return category;
            })
          }
        }
      };
    });

    return newProject;
  };

  const updateProject = (categoryId, projectId, projectData) => {
    setAppData(prev => ({
      ...prev,
      projectCategories: prev.projectCategories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            projects: category.projects.map(project => 
              project.id === projectId ? { ...project, ...projectData } : project
            )
          };
        }
        return category;
      })
    }));
  };

  const deleteProject = (categoryId, projectId) => {
    setAppData(prev => ({
      ...prev,
      projectCategories: prev.projectCategories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            projects: category.projects.filter(project => project.id !== projectId),
            count: category.count - 1
          };
        }
        return category;
      })
    }));

    // Also remove project from any client's project list
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(client => ({
        ...client,
        projects: client.projects.filter(project => project.id !== projectId)
      }))
    }));
  };

  const archiveProject = (categoryId, projectId) => {
    // Find the project to archive
    const projectResult = findProjectById(projectId);
    if (!projectResult) return;

    const { project } = projectResult;
    const archivedProject = {
      ...project,
      originalCategoryId: categoryId,
      archivedDate: new Date().toISOString()
    };

    setAppData(prev => ({
      ...prev,
      // Add to archived projects
      archivedProjects: [...prev.archivedProjects, archivedProject],
      // Remove from original category
      projectCategories: prev.projectCategories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            projects: category.projects.filter(project => project.id !== projectId),
            count: category.count - 1
          };
        }
        return category;
      })
    }));

    // Also remove project from any client's project list
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(client => ({
        ...client,
        projects: client.projects.filter(project => project.id !== projectId)
      }))
    }));
  };

  const unarchiveProject = (projectId) => {
    const archivedProject = appData.archivedProjects.find(p => p.id === projectId);
    if (!archivedProject) return;

    // Remove archived project data and restore to original category
    const { originalCategoryId, archivedDate, ...restoredProject } = archivedProject;

    setAppData(prev => ({
      ...prev,
      // Remove from archived projects
      archivedProjects: prev.archivedProjects.filter(project => project.id !== projectId),
      // Add back to original category
      projectCategories: prev.projectCategories.map(category => {
        if (category.id === originalCategoryId) {
          return {
            ...category,
            projects: [restoredProject, ...category.projects],
            count: category.count + 1
          };
        }
        return category;
      })
    }));
  };

  const deleteArchivedProject = (projectId) => {
    setAppData(prev => ({
      ...prev,
      archivedProjects: prev.archivedProjects.filter(project => project.id !== projectId)
    }));

    // Also remove any associated rooms data
    setAppData(prev => ({
      ...prev,
      projectRoomsData: {
        ...prev.projectRoomsData,
        [projectId]: undefined
      }
    }));
  };

  // Contractor management functions
  const addContractor = (contractorData) => {
    setAppData(prev => ({
      ...prev,
      contractors: [...prev.contractors, contractorData],
      contractorProjects: {
        ...prev.contractorProjects,
        [contractorData.id]: {
          categories: getDefaultCategories(),
          archivedProjects: []
        }
      }
    }));
  };

  const updateContractor = (contractorId, contractorData) => {
    setAppData(prev => ({
      ...prev,
      contractors: prev.contractors.map(contractor =>
        contractor.id === contractorId ? { ...contractor, ...contractorData } : contractor
      )
    }));
  };

  const deleteContractor = (contractorId) => {
    setAppData(prev => ({
      ...prev,
      contractors: prev.contractors.filter(contractor => contractor.id !== contractorId),
      // If deleting active contractor, reset to null
      activeContractorId: prev.activeContractorId === contractorId ? null : prev.activeContractorId
    }));
  };

  const setActiveContractor = (contractorId) => {
    setAppData(prev => ({
      ...prev,
      activeContractorId: contractorId
    }));
  };

  const updatePriceOfferSettings = (settings) => {
    setAppData(prev => ({
      ...prev,
      priceOfferSettings: { ...prev.priceOfferSettings, ...settings }
    }));
  };

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

  // Helper function to get project categories for a specific contractor
  const getProjectCategoriesForContractor = (contractorId) => {
    if (!contractorId) {
      // Return global categories if no contractor selected (backward compatibility)
      return appData.projectCategories || getDefaultCategories();
    }
    
    // Return contractor-specific categories
    if (!appData.contractorProjects || !appData.contractorProjects[contractorId]) {
      return getDefaultCategories();
    }
    
    return appData.contractorProjects[contractorId].categories || getDefaultCategories();
  };

  // Helper function to get archived projects for a specific contractor
  const getArchivedProjectsForContractor = (contractorId) => {
    if (!contractorId) {
      // Return global archived projects if no contractor selected (backward compatibility)
      return appData.archivedProjects || [];
    }
    
    if (!appData.contractorProjects || !appData.contractorProjects[contractorId]) {
      return [];
    }
    
    return appData.contractorProjects[contractorId].archivedProjects || [];
  };


  // Client-Project relationship functions
  const assignProjectToClient = (clientId, projectId, projectName) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(client => {
        if (client.id === clientId) {
          // Check if project is already assigned
          const existingProject = client.projects.find(p => p.id === projectId);
          if (!existingProject) {
            return {
              ...client,
              projects: [...client.projects, {
                id: projectId,
                name: projectName,
                rooms: 0, // This would be calculated from actual project data
                price: '€0,00',
                note: 'VAT not included'
              }]
            };
          }
        }
        return client;
      })
    }));
  };

  const removeProjectFromClient = (clientId, projectId) => {
    setAppData(prev => ({
      ...prev,
      clients: prev.clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            projects: client.projects.filter(project => project.id !== projectId)
          };
        }
        return client;
      })
    }));
  };

  // Helper function to find project by ID across all categories
  const findProjectById = (projectId) => {
    for (const category of appData.projectCategories) {
      const project = category.projects.find(p => p.id === projectId);
      if (project) {
        return { project, category: category.id };
      }
    }
    return null;
  };

  // Helper function to find client by ID
  const findClientById = (clientId) => {
    return appData.clients.find(client => client.id === clientId);
  };

  // Room management functions
  const addRoomToProject = (projectId, roomData) => {
    const newRoom = {
      id: Date.now(),
      ...roomData,
      workItems: []
    };

    setAppData(prev => ({
      ...prev,
      projectRoomsData: {
        ...(prev.projectRoomsData || {}),
        [projectId]: [
          ...((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []),
          newRoom
        ]
      }
    }));

    return newRoom;
  };

  const updateProjectRoom = (projectId, roomId, roomData) => {
    setAppData(prev => ({
      ...prev,
      projectRoomsData: {
        ...(prev.projectRoomsData || {}),
        [projectId]: ((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []).map(room =>
          room.id === roomId ? { ...room, ...roomData } : room
        )
      }
    }));
  };

  const deleteProjectRoom = (projectId, roomId) => {
    setAppData(prev => ({
      ...prev,
      projectRoomsData: {
        ...(prev.projectRoomsData || {}),
        [projectId]: ((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []).filter(room => room.id !== roomId)
      }
    }));
  };

  const getProjectRooms = (projectId) => {
    return (appData.projectRoomsData && appData.projectRoomsData[projectId]) || [];
  };

  // Price calculation functions
  const calculateRoomPrice = (room) => {
    if (!room.workItems || room.workItems.length === 0) return 0;
    
    const priceList = appData.generalPriceList;
    let totalPrice = 0;
    
    room.workItems.forEach(workItem => {
      const priceItem = findPriceListItem(workItem, priceList);
      if (priceItem && workItem.fields) {
        const itemPrice = calculateWorkItemPrice(workItem, priceItem);
        totalPrice += itemPrice;
        
        // Debug logging (remove in production)
        console.log(`Price calculation for ${workItem.name}:`, {
          propertyId: workItem.propertyId,
          fields: workItem.fields,
          priceItem: priceItem?.name,
          unitPrice: priceItem?.price,
          calculatedPrice: itemPrice
        });
      } else {
        // Debug logging for missing items
        console.log(`No price found for work item:`, {
          propertyId: workItem.propertyId,
          name: workItem.name,
          hasFields: !!workItem.fields,
          fieldCount: Object.keys(workItem.fields || {}).length
        });
      }
    });
    
    console.log(`Room "${room.name}" total price: €${totalPrice.toFixed(2)}`);
    return totalPrice;
  };

  const calculateProjectTotalPrice = (projectId) => {
    const rooms = getProjectRooms(projectId);
    let totalPrice = 0;
    
    rooms.forEach(room => {
      totalPrice += calculateRoomPrice(room);
    });
    
    return totalPrice;
  };

  const findPriceListItem = (workItem, priceList) => {
    if (!workItem || !workItem.propertyId || !priceList) return null;
    
    // Create mapping from work item IDs to price list items
    const workIdMappings = {
      'preparatory': 'Preparatory and demolition works',
      'wiring': 'Wiring',
      'plumbing': 'Plumbing',
      'brick_partitions': 'Brick partitions',
      'brick_load_bearing': 'Brick load-bearing wall',
      'plasterboarding_partition': 'Plasterboarding',
      'plasterboarding_offset': 'Plasterboarding',
      'plasterboarding_ceiling': 'Plasterboarding',
      'netting_wall': 'Netting',
      'netting_ceiling': 'Netting',
      'plastering_wall': 'Plastering',
      'plastering_ceiling': 'Plastering',
      'facade_plastering': 'Facade Plastering',
      'corner_bead': 'Installation of corner bead',
      'window_sash': 'Plastering of window sash',
      'penetration_coating': 'Penetration coating',
      'painting_wall': 'Painting',
      'painting_ceiling': 'Painting',
      'levelling': 'Levelling',
      'floating_floor': 'Floating floor',
      'tiling_under_60': 'Tiling under 60cm',
      'paving_under_60': 'Paving under 60cm',
      'grouting': 'Grouting',
      'siliconing': 'Siliconing',
      'sanitary_installation': 'Sanitary installation',
      'window_installation': 'Window installation',
      'door_jamb_installation': 'Installation of door jamb',
      'custom_work': 'Custom work and material',
      'commute': 'Commute',
      'rentals': 'Tool rental' // This will be handled specially for different rental types
    };
    
    const targetName = workIdMappings[workItem.propertyId];
    if (!targetName) return null;
    
    // Search through all categories in the price list
    for (const category of ['work', 'material', 'others']) {
      if (priceList[category]) {
        // Find exact or partial match
        const item = priceList[category].find(item => {
          const nameMatch = item.name.toLowerCase().includes(targetName.toLowerCase());
          
          // For items with subtypes (like plasterboarding), check subtitle too
          if (workItem.selectedType && item.subtitle) {
            const subtitleMatch = item.subtitle.toLowerCase().includes(workItem.selectedType.toLowerCase());
            return nameMatch && subtitleMatch;
          }
          
          return nameMatch;
        });
        
        if (item) return item;
      }
    }
    return null;
  };

  const calculateWorkItemPrice = (workItem, priceItem) => {
    if (!workItem.fields || !priceItem) return 0;
    
    let quantity = 0;
    const values = workItem.fields;
    
    // Handle custom work items that have their own price
    if (workItem.propertyId === 'custom_work' && values.Price) {
      return parseFloat(values.Price || 0);
    }
    
    // Calculate quantity based on work item type and values
    if (values.Width && values.Height) {
      // Area calculation (m²)
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
    } else if (values.Width && values.Length) {
      // Area calculation (m²)
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
    } else if (values.Length) {
      // Linear calculation (bm)
      quantity = parseFloat(values.Length || 0);
    } else if (values.Count || values['Number of outlets']) {
      // Count calculation (pc)
      quantity = parseFloat(values.Count || values['Number of outlets'] || 0);
    } else if (values.Duration) {
      // Time calculation (h)
      quantity = parseFloat(values.Duration || 0);
    } else if (values.Circumference) {
      // Linear calculation for circumference (bm)
      quantity = parseFloat(values.Circumference || 0);
    } else if (values.Distance) {
      // Distance calculation (km)
      quantity = parseFloat(values.Distance || 0);
    } else if (values['Rental duration']) {
      // For scaffolding rentals - calculate area first, then multiply by duration
      const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
      const duration = parseFloat(values['Rental duration'] || 0);
      if (workItem.subtitle && workItem.subtitle.toLowerCase().includes('scaffolding')) {
        // For scaffolding, we need both assembly price (per m²) and rental price (per day)
        return area * 30 + (area * 10 * duration); // 30€/m² assembly + 10€/day rental
      }
      quantity = duration; // For other rentals, just use duration
    }
    
    // Subtract openings (doors, windows, etc.)
    if (values.Doors) {
      quantity -= parseFloat(values.Doors || 0) * 2; // Subtract door area (2m² per door)
    }
    if (values.Windows) {
      quantity -= parseFloat(values.Windows || 0) * 1.5; // Subtract window area (1.5m² per window)
    }
    
    return Math.max(0, quantity * priceItem.price);
  };

  const formatPrice = (price) => {
    return `€${price.toFixed(2).replace('.', ',')}`;
  };

  // General price list management functions
  const updateGeneralPriceList = (category, itemIndex, newPrice) => {
    setAppData(prev => ({
      ...prev,
      generalPriceList: {
        ...prev.generalPriceList,
        [category]: prev.generalPriceList[category].map((item, index) =>
          index === itemIndex ? { ...item, price: parseFloat(newPrice) } : item
        )
      }
    }));
  };

  const resetGeneralPriceItem = (category, itemIndex) => {
    // Get the original price from defaults (we'll need to store this)
    const defaultData = getDefaultData();
    const originalPrice = defaultData.generalPriceList[category][itemIndex]?.price;
    
    if (originalPrice !== undefined) {
      setAppData(prev => ({
        ...prev,
        generalPriceList: {
          ...prev.generalPriceList,
          [category]: prev.generalPriceList[category].map((item, index) =>
            index === itemIndex ? { ...item, price: originalPrice } : item
          )
        }
      }));
    }
  };

  const contextValue = {
    // Data
    clients: appData.clients,
    projectCategories: getProjectCategoriesForContractor(appData.activeContractorId),
    projectRoomsData: appData.projectRoomsData,
    generalPriceList: appData.generalPriceList,
    archivedProjects: getArchivedProjectsForContractor(appData.activeContractorId),
    contractors: appData.contractors,
    priceOfferSettings: appData.priceOfferSettings,
    activeContractorId: appData.activeContractorId,
    
    // Helper functions
    getProjectCategoriesForContractor,
    getArchivedProjectsForContractor,
    
    // Client functions
    addClient,
    updateClient,
    deleteClient,
    
    // Project functions
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    deleteArchivedProject,
    
    // Contractor functions
    addContractor,
    updateContractor,
    deleteContractor,
    setActiveContractor,
    updatePriceOfferSettings,
    
    // Room functions
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    
    // Relationship functions
    assignProjectToClient,
    removeProjectFromClient,
    
    // Helper functions
    findProjectById,
    findClientById,
    
    // Price calculation functions
    calculateRoomPrice,
    calculateProjectTotalPrice,
    formatPrice,
    
    // Price list management functions
    updateGeneralPriceList,
    resetGeneralPriceItem
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;