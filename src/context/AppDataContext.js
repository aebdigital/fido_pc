import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/supabaseApi';
import { useAuth } from './AuthContext';
import { workItemToDatabase, databaseToWorkItem, getTableName, PROPERTY_TO_TABLE } from '../services/workItemsMapping';
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

  // Helper function to transform invoice from database format to app format
  const transformInvoiceFromDB = (dbInvoice) => {
    if (!dbInvoice) return null;

    return {
      id: dbInvoice.id,
      invoiceNumber: dbInvoice.number,
      issueDate: dbInvoice.date_of_dispatch,
      dueDate: dbInvoice.maturity_days ?
        new Date(new Date(dbInvoice.date_of_dispatch).getTime() + dbInvoice.maturity_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
        dbInvoice.date_of_dispatch,
      paymentMethod: dbInvoice.payment_type,
      paymentDays: dbInvoice.maturity_days,
      notes: dbInvoice.note,
      status: dbInvoice.status,
      projectId: dbInvoice.project_id,
      projectName: dbInvoice.projects?.name || '',
      categoryId: dbInvoice.projects?.category || '',
      clientId: dbInvoice.client_id,
      contractorId: dbInvoice.contractor_id || dbInvoice.c_id,
      createdDate: dbInvoice.created_at
    };
  };

  // Load initial data from Supabase
  const loadInitialData = async () => {
    if (!user) {
      setLoading(false);
      return getDefaultData();
    }

    try {
      console.log('[SUPABASE] Loading data from Supabase...');

      // Load all data from Supabase in parallel
      const [contractors, clients, projects, invoices, priceListData] = await Promise.all([
        api.contractors.getAll(),
        api.clients.getAll(null), // We'll filter by contractor later
        api.projects.getAll(null), // We'll filter by contractor later
        api.invoices.getAll(null), // We'll filter by contractor later
        api.priceLists.get(null) // Get price list
      ]);

      console.log('[SUPABASE] Data loaded:', { contractors: contractors?.length, clients: clients?.length, projects: projects?.length, invoices: invoices?.length });

      // Build contractor projects structure
      const contractorProjects = {};
      contractors.forEach(contractor => {
        const contractorProjectsList = projects.filter(p => p.c_id === contractor.id);

        // Group projects by category
        const categories = getDefaultCategories().map(cat => ({
          ...cat,
          projects: contractorProjectsList.filter(p => p.category === cat.id),
          count: contractorProjectsList.filter(p => p.category === cat.id).length
        }));

        contractorProjects[contractor.id] = {
          categories,
          archivedProjects: contractorProjectsList.filter(p => p.is_archived)
        };
      });

      // Build project rooms data structure and load work items
      const projectRoomsData = {};
      for (const project of projects) {
        const rooms = await api.rooms.getByProject(project.id);
        if (rooms && rooms.length > 0) {
          // Load work items for each room from database tables
          const roomsWithWorkItems = await Promise.all(rooms.map(async (room) => {
            const workItems = await loadWorkItemsForRoom(room.id);
            return {
              ...room,
              workItems: workItems || []
            };
          }));
          projectRoomsData[project.id] = roomsWithWorkItems;
        }
      }

      // Helper function to load work items from all tables
      async function loadWorkItemsForRoom(roomId) {
        const allWorkItems = [];

        // Query each work item table
        for (const [, tableName] of Object.entries(PROPERTY_TO_TABLE)) {
          try {
            const records = await api.workItems.getByRoom(roomId, tableName);
            if (records && records.length > 0) {
              // Convert database records to app work items
              records.forEach(record => {
                const workItem = databaseToWorkItem(record, tableName);
                if (workItem) {
                  allWorkItems.push(workItem);
                }
              });
            }
          } catch (error) {
            // Table might not exist or no records, continue
            console.debug(`No work items in ${tableName} for room ${roomId}`);
          }
        }

        return allWorkItems;
      }

      // Get active contractor (first one or null)
      const activeContractorId = contractors.length > 0 ? contractors[0].id : null;

      // Use price list from database or default
      const generalPriceList = priceListData?.data || getDefaultData().generalPriceList;

      // Transform invoices from database format to app format
      const transformedInvoices = (invoices || []).map(transformInvoiceFromDB).filter(Boolean);

      return {
        clients: clients || [],
        projectCategories: getDefaultCategories(),
        archivedProjects: projects.filter(p => p.is_archived) || [],
        projectRoomsData,
        contractors: contractors || [],
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
  };

  const [appData, setAppData] = useState(getDefaultData);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await loadInitialData();
      setAppData(data);
    };

    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, loadInitialData]);

  // Client management functions
  const addClient = async (clientData) => {
    try {
      // Map camelCase fields to snake_case database columns
      const mappedData = {
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        street: clientData.street || null,
        second_row_street: clientData.additionalInfo || null,
        city: clientData.city || null,
        postal_code: clientData.postalCode || null,
        country: clientData.country || null,
        business_id: clientData.businessId || null,
        tax_id: clientData.taxId || null,
        vat_registration_number: clientData.vatId || null, // Fixed: was vat_id
        contact_person_name: clientData.contactPerson || null, // Fixed: was contact_person
        type: clientData.type || 'private',
        c_id: appData.activeContractorId,
        is_user: false
        // Optional fields not currently used: bank_account_number, swift_code, legal_notice, logo_url, web
      };

      const newClient = await api.clients.create(mappedData);

      setAppData(prev => ({
        ...prev,
        clients: [...prev.clients, newClient]
      }));

      return newClient;
    } catch (error) {
      console.error('[SUPABASE] Error adding client:', error);
      throw error;
    }
  };

  const updateClient = async (clientId, clientData) => {
    try {
      await api.clients.update(clientId, clientData);

      setAppData(prev => ({
        ...prev,
        clients: prev.clients.map(client =>
          client.id === clientId ? { ...client, ...clientData } : client
        )
      }));
    } catch (error) {
      console.error('[SUPABASE] Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (clientId) => {
    try {
      await api.clients.delete(clientId);

      setAppData(prev => ({
        ...prev,
        clients: prev.clients.filter(client => client.id !== clientId)
      }));
    } catch (error) {
      console.error('[SUPABASE] Error deleting client:', error);
      throw error;
    }
  };

  // Project management functions
  const addProject = async (categoryId, projectData) => {
    try {
      // Check if contractor exists
      if (!appData.activeContractorId) {
        const error = new Error('Please create a contractor profile first in Settings');
        error.userFriendly = true;
        throw error;
      }

      const newProject = await api.projects.create({
        name: projectData.name,
        category: categoryId,
        c_id: appData.activeContractorId,
        client_id: projectData.clientId || null,
        contractor_id: appData.activeContractorId,
        status: 0, // Database uses bigint: 0=not sent, 1=sent, 2=archived
        is_archived: false,
        number: 0,
        notes: null,
        price_list_id: null // We'll handle price lists separately
        // Removed: price_list_snapshot, price_overrides, has_invoice, invoice_id, invoice_status
      });

      setAppData(prev => {
        const activeContractorId = prev.activeContractorId;

        if (!activeContractorId) {
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
    } catch (error) {
      console.error('[SUPABASE] Error adding project:', error);
      throw error;
    }
  };

  const updateProject = async (categoryId, projectId, projectData) => {
    try {
      await api.projects.update(projectId, projectData);

      setAppData(prev => {
        const activeContractorId = prev.activeContractorId;

        if (!activeContractorId) {
          return {
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
          };
        }

        if (!prev.contractorProjects[activeContractorId]) {
          return prev;
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
                    projects: category.projects.map(project =>
                      project.id === projectId ? { ...project, ...projectData } : project
                    )
                  };
                }
                return category;
              })
            }
          }
        };
      });
    } catch (error) {
      console.error('[SUPABASE] Error updating project:', error);
      throw error;
    }
  };

  const deleteProject = async (categoryId, projectId) => {
    try {
      await api.projects.delete(projectId);

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
        }),
        clients: prev.clients.map(client => ({
          ...client,
          projects: client.projects.filter(project => project.id !== projectId)
        }))
      }));
    } catch (error) {
      console.error('[SUPABASE] Error deleting project:', error);
      throw error;
    }
  };

  const archiveProject = async (categoryId, projectId) => {
    try {
      const projectResult = findProjectById(projectId);
      if (!projectResult) return;

      const { project } = projectResult;

      // Update project in database to mark as archived
      await api.projects.update(projectId, {
        is_archived: true,
        category: categoryId // Store original category
      });

      const archivedProject = {
        ...project,
        is_archived: true,
        originalCategoryId: categoryId,
        archivedDate: new Date().toISOString(),
        contractorId: appData.activeContractorId
      };

      setAppData(prev => {
        const newState = {
          ...prev,
          archivedProjects: [...prev.archivedProjects, archivedProject],
        };

        if (prev.activeContractorId && prev.contractorProjects[prev.activeContractorId]) {
          newState.contractorProjects = {
            ...prev.contractorProjects,
            [prev.activeContractorId]: {
              ...prev.contractorProjects[prev.activeContractorId],
              categories: prev.contractorProjects[prev.activeContractorId].categories.map(category => {
                if (category.id === categoryId) {
                  return {
                    ...category,
                    projects: category.projects.filter(project => project.id !== projectId),
                    count: category.count - 1
                  };
                }
                return category;
              })
            }
          };
        } else {
          newState.projectCategories = prev.projectCategories.map(category => {
            if (category.id === categoryId) {
              return {
                ...category,
                projects: category.projects.filter(project => project.id !== projectId),
                count: category.count - 1
              };
            }
            return category;
          });
        }

        newState.clients = prev.clients.map(client => ({
          ...client,
          projects: client.projects.filter(project => project.id !== projectId)
        }));

        return newState;
      });
    } catch (error) {
      console.error('[SUPABASE] Error archiving project:', error);
      throw error;
    }
  };

  const unarchiveProject = async (projectId) => {
    try {
      const archivedProject = appData.archivedProjects.find(p => p.id === projectId);
      if (!archivedProject) return;

      // Update project in database to unarchive
      await api.projects.update(projectId, {
        is_archived: false
      });

      const { originalCategoryId, archivedDate, contractorId, ...restoredProject } = archivedProject;

      setAppData(prev => {
        const newState = {
          ...prev,
          archivedProjects: prev.archivedProjects.filter(project => project.id !== projectId),
        };

        if (contractorId && prev.contractorProjects[contractorId]) {
          newState.contractorProjects = {
            ...prev.contractorProjects,
            [contractorId]: {
              ...prev.contractorProjects[contractorId],
              categories: prev.contractorProjects[contractorId].categories.map(category => {
                if (category.id === originalCategoryId) {
                  return {
                    ...category,
                    projects: [restoredProject, ...category.projects],
                    count: category.count + 1
                  };
                }
                return category;
              })
            }
          };
        } else {
          newState.projectCategories = prev.projectCategories.map(category => {
            if (category.id === originalCategoryId) {
              return {
                ...category,
                projects: [restoredProject, ...category.projects],
                count: category.count + 1
              };
            }
            return category;
          });
        }

        return newState;
      });
    } catch (error) {
      console.error('[SUPABASE] Error unarchiving project:', error);
      throw error;
    }
  };

  const deleteArchivedProject = async (projectId) => {
    try {
      await api.projects.delete(projectId);

      setAppData(prev => ({
        ...prev,
        archivedProjects: prev.archivedProjects.filter(project => project.id !== projectId),
        projectRoomsData: {
          ...prev.projectRoomsData,
          [projectId]: undefined
        }
      }));
    } catch (error) {
      console.error('[SUPABASE] Error deleting archived project:', error);
      throw error;
    }
  };

  // Contractor management functions
  const addContractor = async (contractorData) => {
    try {
      const newContractor = await api.contractors.create(contractorData);

      setAppData(prev => ({
        ...prev,
        contractors: [...prev.contractors, newContractor],
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
  };

  const updateContractor = async (contractorId, contractorData) => {
    try {
      await api.contractors.update(contractorId, contractorData);

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
  };

  const deleteContractor = async (contractorId) => {
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

  // Invoice management functions
  const createInvoice = async (projectId, categoryId, invoiceData) => {
    try {
      const project = findProjectById(projectId, categoryId);
      if (!project) return null;

      // Map camelCase fields to snake_case database columns
      const mappedInvoiceData = {
        number: invoiceData.invoiceNumber,
        date_of_dispatch: invoiceData.issueDate,
        payment_type: invoiceData.paymentMethod || 'transfer',
        maturity_days: invoiceData.paymentDays || 30,
        note: invoiceData.notes || null,
        project_id: projectId,
        c_id: appData.activeContractorId,
        client_id: project.clientId,
        contractor_id: appData.activeContractorId,
        status: 'unsent'
      };

      console.log('[DEBUG] Creating invoice with data:', mappedInvoiceData);
      const dbInvoice = await api.invoices.create(mappedInvoiceData);
      console.log('[DEBUG] Invoice created from DB:', dbInvoice);

      // Transform the database invoice to app format
      const transformedInvoice = {
        id: dbInvoice.id,
        invoiceNumber: dbInvoice.number,
        issueDate: dbInvoice.date_of_dispatch,
        dueDate: invoiceData.dueDate, // Use the dueDate from invoiceData
        paymentMethod: dbInvoice.payment_type,
        paymentDays: dbInvoice.maturity_days,
        notes: dbInvoice.note,
        status: dbInvoice.status,
        projectId: dbInvoice.project_id,
        projectName: project.name,
        categoryId: categoryId,
        clientId: dbInvoice.client_id,
        contractorId: dbInvoice.contractor_id || dbInvoice.c_id,
        createdDate: dbInvoice.created_at
      };

      console.log('[DEBUG] Transformed invoice:', transformedInvoice);

      setAppData(prev => ({
        ...prev,
        invoices: [...prev.invoices, transformedInvoice]
      }));

      // Note: Invoice-project relationship is managed via invoices.project_id
      // No need to update project table as it doesn't have invoice fields

      return transformedInvoice;
    } catch (error) {
      console.error('[SUPABASE] Error creating invoice:', error);
      throw error;
    }
  };

  const updateInvoice = async (invoiceId, updates) => {
    try {
      await api.invoices.update(invoiceId, updates);

      setAppData(prev => ({
        ...prev,
        invoices: prev.invoices.map(invoice =>
          invoice.id === invoiceId ? { ...invoice, ...updates } : invoice
        )
      }));

      // Note: Invoice status is managed via invoices table only
      // No need to update project table as it doesn't have invoice_status field
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  };

  const deleteInvoice = async (invoiceId) => {
    try {
      await api.invoices.delete(invoiceId);

      setAppData(prev => ({
        ...prev,
        invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
      }));

      // Note: Invoice-project relationship is managed via invoices.project_id
      // No need to update project table as it doesn't have invoice fields
    } catch (error) {
      console.error('[SUPABASE] Error deleting invoice:', error);
      throw error;
    }
  };

  const getInvoiceById = (invoiceId) => {
    return appData.invoices.find(inv => inv.id === invoiceId);
  };

  const getInvoicesForContractor = (contractorId) => {
    console.log('[DEBUG] getInvoicesForContractor:', { contractorId, totalInvoices: appData.invoices.length, invoices: appData.invoices });
    const filtered = appData.invoices.filter(inv => inv.contractorId === contractorId);
    console.log('[DEBUG] Filtered invoices:', filtered);
    return filtered;
  };

  const getInvoiceForProject = (projectId) => {
    return appData.invoices.find(inv => inv.projectId === projectId);
  };

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
                name: projectName
                // Room count and price are calculated dynamically when displayed
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
    // First, search in contractor-specific projects if we have an active contractor
    if (appData.activeContractorId && appData.contractorProjects[appData.activeContractorId]) {
      for (const category of appData.contractorProjects[appData.activeContractorId].categories) {
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          return { project, category: category.id };
        }
      }
    }
    
    // Fallback: search in global project categories (for backward compatibility)
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
  const addRoomToProject = async (projectId, roomData) => {
    try {
      // Create room with all required fields
      const newRoom = await api.rooms.create({
        project_id: projectId,
        c_id: appData.activeContractorId,
        name: roomData.name,
        room_type: roomData.roomType || null,
        floor_length: roomData.floorLength || 0,
        floor_width: roomData.floorWidth || 0,
        wall_height: roomData.wallHeight || 0,
        commute_length: roomData.commuteLength || 0,
        days_in_work: roomData.daysInWork || 0,
        tool_rental: roomData.toolRental || 0
      });

      // Add workItems array to the new room for local state
      const roomWithWorkItems = {
        ...newRoom,
        workItems: []
      };

      setAppData(prev => ({
        ...prev,
        projectRoomsData: {
          ...(prev.projectRoomsData || {}),
          [projectId]: [
            ...((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []),
            roomWithWorkItems
          ]
        }
      }));

      return newRoom;
    } catch (error) {
      console.error('[SUPABASE] Error adding room:', error);
      throw error;
    }
  };

  // Helper function to save work items to database tables
  const saveWorkItemsForRoom = async (roomId, workItems) => {
    // Optimize: Only delete from tables that will be affected
    const tablesToUpdate = new Set();

    // First pass: determine which tables will have new data
    workItems.forEach(workItem => {
      const tableName = getTableName(workItem.propertyId);
      if (tableName) {
        tablesToUpdate.add(tableName);
      }
    });

    // Delete existing items only from tables that will be updated
    const deletePromises = Array.from(tablesToUpdate).map(async (tableName) => {
      try {
        const existingItems = await api.workItems.getByRoom(roomId, tableName);
        if (existingItems && existingItems.length > 0) {
          await Promise.all(existingItems.map(item =>
            api.workItems.delete(tableName, item.id)
          ));
        }
      } catch (error) {
        console.debug(`No existing items in ${tableName}`);
      }
    });

    // Wait for all deletes to complete
    await Promise.all(deletePromises);

    // Then insert all work items in parallel
    const insertPromises = workItems.map(async (workItem) => {
      const tableName = getTableName(workItem.propertyId);
      if (!tableName) {
        console.warn(`No table mapping for propertyId: ${workItem.propertyId}`);
        return;
      }

      const dbRecord = workItemToDatabase(workItem, roomId, appData.activeContractorId);

      if (dbRecord) {
        try {
          await api.workItems.create(tableName, dbRecord);
        } catch (error) {
          console.error(`Error saving work item to ${tableName}:`, error);
          throw error;
        }
      }
    });

    // Wait for all inserts to complete
    await Promise.all(insertPromises);
  };

  const updateProjectRoom = async (projectId, roomId, roomData) => {
    try {
      // Validate roomId
      if (!roomId) {
        console.error('[SUPABASE] updateProjectRoom called with undefined roomId', { projectId, roomData });
        throw new Error('Room ID is required to update a room');
      }

      // Separate workItems from room data
      const { workItems, ...otherData } = roomData;

      // Only update room data if there are other fields besides workItems
      if (Object.keys(otherData).length > 0) {
        await api.rooms.update(roomId, otherData);
      }

      // Save work items to database tables if provided
      if (workItems) {
        await saveWorkItemsForRoom(roomId, workItems);
      }

      setAppData(prev => ({
        ...prev,
        projectRoomsData: {
          ...(prev.projectRoomsData || {}),
          [projectId]: ((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []).map(room =>
            room.id === roomId ? { ...room, ...roomData } : room
          )
        }
      }));
    } catch (error) {
      console.error('[SUPABASE] Error updating room:', error);
      throw error;
    }
  };

  const deleteProjectRoom = async (projectId, roomId) => {
    try {
      await api.rooms.delete(roomId);

      setAppData(prev => ({
        ...prev,
        projectRoomsData: {
          ...(prev.projectRoomsData || {}),
          [projectId]: ((prev.projectRoomsData && prev.projectRoomsData[projectId]) || []).filter(room => room.id !== roomId)
        }
      }));
    } catch (error) {
      console.error('[SUPABASE] Error deleting room:', error);
      throw error;
    }
  };

  const getProjectRooms = (projectId) => {
    const rooms = (appData.projectRoomsData && appData.projectRoomsData[projectId]) || [];
    console.log('[DEBUG] getProjectRooms:', projectId, 'rooms:', rooms.map(r => ({ id: r.id, name: r.name })));
    return rooms;
  };

  // Price calculation functions
  const calculateRoomPrice = (room, priceList = null) => {
    if (!room.workItems || room.workItems.length === 0) return 0;
    
    // Use provided price list or fall back to general price list
    const activePriceList = priceList || appData.generalPriceList;
    let totalPrice = 0;
    
    room.workItems.forEach(workItem => {
      const priceItem = findPriceListItem(workItem, activePriceList);
      
      if (priceItem && workItem.fields) {
        const itemPrice = calculateWorkItemPrice(workItem, priceItem);
        totalPrice += itemPrice;
      }
    });
    
    return totalPrice;
  };

  // Enhanced room calculation with materials
  const calculateRoomPriceWithMaterials = (room, priceList = null) => {
    if (!room.workItems || room.workItems.length === 0) return {
      workTotal: 0,
      materialTotal: 0,
      othersTotal: 0,
      total: 0,
      items: [],
      materialItems: [],
      othersItems: [],
      baseWorkTotal: 0,
      baseMaterialTotal: 0,
      auxiliaryWorkCost: 0,
      auxiliaryMaterialCost: 0
    };
    
    // Use provided price list or fall back to general price list
    const activePriceList = priceList || appData.generalPriceList;
    let workTotal = 0;
    let materialTotal = 0;
    let othersTotal = 0;
    const items = [];
    const materialItems = [];
    const othersItems = [];
    
    // Pre-calculate total area for tiling and paving to optimize adhesive calculation
    let totalTilingPavingArea = 0;
    let tilingPavingAdhesiveAdded = false; // Track if we've already added adhesive for tiling/paving
    let totalNettingArea = 0;
    let nettingAdhesiveAdded = false; // Track if we've already added adhesive for netting

    room.workItems.forEach(workItem => {
      const priceItem = findPriceListItem(workItem, activePriceList);
      if (priceItem && workItem.fields) {
        const isTilingOrPaving = (priceItem.name.toLowerCase().includes('tiling') ||
                                   priceItem.name.toLowerCase().includes('obklad') ||
                                   workItem.propertyId === 'tiling_under_60') ||
                                  (priceItem.name.toLowerCase().includes('paving') ||
                                   priceItem.name.toLowerCase().includes('dlažba') ||
                                   workItem.propertyId === 'paving_under_60');
        const isNetting = priceItem.name.toLowerCase().includes('netting') ||
                          priceItem.name.toLowerCase().includes('sieťkovanie') ||
                          workItem.propertyId === 'netting_wall' ||
                          workItem.propertyId === 'netting_ceiling';

        if (isTilingOrPaving) {
          const values = workItem.fields;
          let area = 0;
          if (values.Width && values.Length) {
            area = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
          } else if (values.Width && values.Height) {
            area = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
          }
          totalTilingPavingArea += area;
        }

        if (isNetting) {
          const values = workItem.fields;
          let area = 0;
          if (values.Width && values.Length) {
            area = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
          } else if (values.Width && values.Height) {
            area = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
          }
          totalNettingArea += area;
        }
      }
    });

    room.workItems.forEach(workItem => {
      const priceItem = findPriceListItem(workItem, activePriceList);

      if (priceItem && workItem.fields) {
        // Special handling for scaffolding - show as two separate items
        const isScaffolding = (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') ||
            workItem.subtitle.toLowerCase().includes('lešenie'))) ||
            (workItem.name && (workItem.name.toLowerCase().includes('lešenie') || workItem.name.toLowerCase().includes('scaffolding'))) ||
            (workItem.propertyId === 'rentals' && workItem.name && (workItem.name.toLowerCase().includes('lešenie') || workItem.name.toLowerCase().includes('scaffolding')));
            
        if (isScaffolding) {
          const values = workItem.fields;
          const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
          const duration = parseFloat(values['Rental duration'] || 0);
          
          // Assembly cost (€30/m²)
          const assemblyCost = area * 30;
          const assemblyCalculation = {
            workCost: assemblyCost,
            materialCost: 0,
            quantity: area
          };
          
          othersItems.push({
            ...workItem,
            subtitle: workItem.subtitle + ' - montáž a demontáž',
            calculation: assemblyCalculation
          });
          
          // Daily rental cost (€10/day per m²)
          const rentalCost = area * 10 * duration;
          const rentalCalculation = {
            workCost: rentalCost,
            materialCost: 0,
            quantity: area * duration
          };
          
          othersItems.push({
            ...workItem,
            id: workItem.id + '_rental',
            subtitle: workItem.subtitle + ' - prenájom',
            fields: {
              ...workItem.fields,
              'Rental duration': duration
            },
            calculation: rentalCalculation
          });
          
          othersTotal += assemblyCost + rentalCost;
        } else {
          // Check if this is an "Others" category item
          const isOthersItem = workItem.propertyId === 'custom_work' || 
                              workItem.propertyId === 'commute' ||
                              workItem.propertyId === 'rentals' ||
                              (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') || 
                               workItem.subtitle.toLowerCase().includes('lešenie'))) ||
                              (workItem.name && workItem.name.toLowerCase().includes('lešenie')) ||
                              (priceItem && (
                                priceItem.name === 'Custom work and material' ||
                                priceItem.name === 'Journey' ||
                                priceItem.name === 'Commute' ||
                                priceItem.name === 'Tool rental' ||
                                priceItem.name === 'Core Drill'
                              ));
          
          if (isOthersItem) {
            // Handle Others category items
            const calculation = calculateWorkItemWithMaterials(workItem, priceItem, activePriceList);
            othersTotal += calculation.workCost;
            
            othersItems.push({
              ...workItem,
              calculation
            });
          } else {
            // Normal calculation for work/material items
            // Check if this is a tiling/paving item for adhesive aggregation
            const isTilingOrPaving = (priceItem.name.toLowerCase().includes('tiling') ||
                                       priceItem.name.toLowerCase().includes('obklad') ||
                                       workItem.propertyId === 'tiling_under_60') ||
                                      (priceItem.name.toLowerCase().includes('paving') ||
                                       priceItem.name.toLowerCase().includes('dlažba') ||
                                       workItem.propertyId === 'paving_under_60');
            const isNetting = priceItem.name.toLowerCase().includes('netting') ||
                              priceItem.name.toLowerCase().includes('sieťkovanie') ||
                              workItem.propertyId === 'netting_wall' ||
                              workItem.propertyId === 'netting_ceiling';

            // Check if Large Format toggle is enabled for tiling/paving
            let effectivePriceItem = priceItem;
            if (isTilingOrPaving && workItem.fields['Large Format_above 60cm']) {
              // Find the Large Format price item
              const largeFormatItem = activePriceList.work.find(item =>
                item.name === 'Large Format' && item.subtitle === 'above 60cm'
              );
              if (largeFormatItem) {
                effectivePriceItem = largeFormatItem;
              }
            }

            // Only add adhesive for the first tiling/paving or netting item
            const skipTilingPavingAdhesive = isTilingOrPaving && tilingPavingAdhesiveAdded;
            const skipNettingAdhesive = isNetting && nettingAdhesiveAdded;
            const skipAdhesive = skipTilingPavingAdhesive || skipNettingAdhesive;

            const calculation = calculateWorkItemWithMaterials(
              workItem,
              effectivePriceItem,
              activePriceList,
              totalTilingPavingArea,
              skipAdhesive,
              totalNettingArea
            );

            // Mark that we've added adhesive after the first tiling/paving or netting item
            if (isTilingOrPaving && !tilingPavingAdhesiveAdded) {
              tilingPavingAdhesiveAdded = true;
            }
            if (isNetting && !nettingAdhesiveAdded) {
              nettingAdhesiveAdded = true;
            }

            workTotal += calculation.workCost;
            materialTotal += calculation.materialCost;

            items.push({
              ...workItem,
              calculation
            });

            // Track materials as separate items
            if (calculation.material) {
              const materialUnit = calculation.material.unit || 'm²';
              const materialPrice = calculation.material.price || 0;
              const materialQuantity = calculation.quantity || 0;
              let materialCostForItem = 0;

              if (calculation.material.capacity) {
                const packagesNeeded = Math.ceil(materialQuantity / calculation.material.capacity);
                materialCostForItem = packagesNeeded * materialPrice;
              } else {
                materialCostForItem = materialQuantity * materialPrice;
              }

              materialItems.push({
                id: `${workItem.id}_material`,
                name: calculation.material.name,
                subtitle: calculation.material.subtitle || '',
                calculation: {
                  quantity: materialQuantity,
                  materialCost: materialCostForItem,
                  pricePerUnit: materialPrice,
                  unit: materialUnit
                }
              });
            }

            // Track additional materials (adhesive)
            if (calculation.additionalMaterial && calculation.additionalMaterialQuantity > 0) {
              const adhesiveUnit = calculation.additionalMaterial.unit || 'pkg';
              const adhesivePrice = calculation.additionalMaterial.price || 0;
              const adhesiveQuantity = calculation.additionalMaterialQuantity;
              let adhesiveCost = 0;

              if (calculation.additionalMaterial.capacity) {
                const packagesNeeded = Math.ceil(adhesiveQuantity / calculation.additionalMaterial.capacity);
                adhesiveCost = packagesNeeded * adhesivePrice;
              } else {
                adhesiveCost = adhesiveQuantity * adhesivePrice;
              }

              // Check if adhesive already added to avoid duplicates (when aggregating)
              const adhesiveName = calculation.additionalMaterial.name;
              const adhesiveSubtitle = calculation.additionalMaterial.subtitle || '';
              const existingAdhesive = materialItems.find(item =>
                item.name === adhesiveName && item.subtitle === adhesiveSubtitle
              );

              if (!existingAdhesive) {
                materialItems.push({
                  id: `${workItem.id}_adhesive`,
                  name: adhesiveName,
                  subtitle: adhesiveSubtitle,
                  calculation: {
                    quantity: adhesiveQuantity,
                    materialCost: adhesiveCost,
                    pricePerUnit: adhesivePrice,
                    unit: adhesiveUnit
                  }
                });
              }
            }

            // Handle additional fields (Jolly Edging, Plinths, etc.)
            if (workItem.fields) {
              // Check for Jolly Edging
              const jollyEdgingValue = workItem.fields['Jolly Edging'];
              if (jollyEdgingValue && jollyEdgingValue > 0) {
                const jollyEdgingPrice = activePriceList.work.find(item => item.name === 'Jolly Edging');
                if (jollyEdgingPrice) {
                  const jollyEdgingCost = jollyEdgingValue * jollyEdgingPrice.price;
                  workTotal += jollyEdgingCost;
                  items.push({
                    ...workItem,
                    id: `${workItem.id}_jolly`,
                    name: 'Jolly Edging',
                    calculation: {
                      workCost: jollyEdgingCost,
                      materialCost: 0,
                      quantity: jollyEdgingValue,
                      unit: 'm'
                    }
                  });
                }
              }

              // Check for Plinth - cutting and grinding
              const plinthCuttingValue = workItem.fields['Plinth_cutting and grinding'];
              if (plinthCuttingValue && plinthCuttingValue > 0) {
                const plinthCuttingPrice = activePriceList.work.find(item =>
                  item.name === 'Plinth' && item.subtitle === 'cutting and grinding'
                );
                if (plinthCuttingPrice) {
                  const plinthCuttingCost = plinthCuttingValue * plinthCuttingPrice.price;
                  workTotal += plinthCuttingCost;
                  items.push({
                    ...workItem,
                    id: `${workItem.id}_plinth_cutting`,
                    name: 'Plinth',
                    subtitle: 'cutting and grinding',
                    calculation: {
                      workCost: plinthCuttingCost,
                      materialCost: 0,
                      quantity: plinthCuttingValue,
                      unit: 'm'
                    }
                  });
                }
              }

              // Check for Plinth - bonding
              const plinthBondingValue = workItem.fields['Plinth_bonding'];
              if (plinthBondingValue && plinthBondingValue > 0) {
                const plinthBondingPrice = activePriceList.work.find(item =>
                  item.name === 'Plinth' && item.subtitle === 'bonding'
                );
                if (plinthBondingPrice) {
                  const plinthBondingCost = plinthBondingValue * plinthBondingPrice.price;
                  workTotal += plinthBondingCost;
                  items.push({
                    ...workItem,
                    id: `${workItem.id}_plinth_bonding`,
                    name: 'Plinth',
                    subtitle: 'bonding',
                    calculation: {
                      workCost: plinthBondingCost,
                      materialCost: 0,
                      quantity: plinthBondingValue,
                      unit: 'm'
                    }
                  });
                }
              }
            }
          }
        }
      }
    });
    
    // Add auxiliary work surcharge (65%)
    const auxiliaryWorkCost = workTotal * 0.65;
    
    // Add auxiliary material surcharge (10%)
    const auxiliaryMaterialCost = materialTotal * 0.10;
    
    const finalWorkTotal = workTotal + auxiliaryWorkCost;
    const finalMaterialTotal = materialTotal + auxiliaryMaterialCost;
    
    return {
      workTotal: finalWorkTotal,
      materialTotal: finalMaterialTotal,
      othersTotal,
      total: finalWorkTotal + finalMaterialTotal + othersTotal,
      baseWorkTotal: workTotal,
      baseMaterialTotal: materialTotal,
      auxiliaryWorkCost,
      auxiliaryMaterialCost,
      items,
      materialItems,
      othersItems
    };
  };

  const calculateProjectTotalPrice = (projectId, projectOverride = null) => {
    const rooms = getProjectRooms(projectId);
    let totalPrice = 0;

    // Use provided project or find it
    let project = projectOverride;
    let projectPriceList = null;

    if (!project) {
      // Find the project to get its price list snapshot
      const projectResult = findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }

    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    }
    // If no snapshot exists (old projects), fall back to current price list

    rooms.forEach(room => {
      const calculation = calculateRoomPriceWithMaterials(room, projectPriceList);
      totalPrice += calculation.workTotal + calculation.materialTotal + calculation.othersTotal;
    });

    return totalPrice;
  };

  const calculateProjectTotalPriceWithBreakdown = (projectId, projectOverride = null) => {
    const rooms = getProjectRooms(projectId);
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
      const projectResult = findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }
    
    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    }
    // If no snapshot exists (old projects), fall back to current price list
    
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
      'sanitary_installation': 'Sanitary installations',
      'window_installation': 'Window installation',
      'door_jamb_installation': 'Installation of door jamb',
      'custom_work': 'Custom work and material',
      'commute': 'Commute',
      'rentals': 'Tool rental' // This will be handled specially for different rental types
    };

    // For rental items, use the actual rental item name instead of generic mapping
    let targetName;
    if (workItem.propertyId === 'rentals' && workItem.name) {
      targetName = workItem.name; // Use "Scaffolding", "Core Drill", or "Tool rental"
    } else {
      targetName = workIdMappings[workItem.propertyId];
    }

    if (!targetName) {
      return null;
    }


    // Search through all categories in the price list
    for (const category of ['work', 'material', 'installations', 'others']) {
      if (priceList[category]) {
        // Find exact or partial match
        const item = priceList[category].find(item => {
          const nameMatch = item.name.toLowerCase().includes(targetName.toLowerCase());

          // For items with subtypes (like plasterboarding), check subtitle too
          if (workItem.selectedType && item.subtitle) {
            const subtitleMatch = item.subtitle.toLowerCase().includes(workItem.selectedType.toLowerCase());
            
            // For plasterboarding, check both the work subtype (partition/offset wall/ceiling) and type (simple/double)
            if (nameMatch && targetName.toLowerCase() === 'plasterboarding' && workItem.subtitle) {
              const workSubtitle = workItem.subtitle.toLowerCase();
              const itemSubtitle = item.subtitle.toLowerCase();
              const workType = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
              
              // Check if the item subtitle contains both the work subtype and the selected type
              const subtypeMatch = (
                (workSubtitle.includes('partition') && itemSubtitle.includes('partition')) ||
                (workSubtitle.includes('offset wall') && itemSubtitle.includes('offset wall')) ||
                (workSubtitle.includes('ceiling') && itemSubtitle.includes('ceiling'))
              );
              
              // For ceiling, no type match needed since it's just "ceiling" not "ceiling, simple"
              const typeMatch = workSubtitle.includes('ceiling') ? true : (!workType || itemSubtitle.includes(workType));
              
              return subtypeMatch && typeMatch;
            }
            
            return nameMatch && subtitleMatch;
          }
          
          // For sanitary installations, match subtitle (the actual type like "Concealed toilet")
          if (workItem.subtitle && item.subtitle && targetName.toLowerCase() === 'sanitary installations') {
            const workSubLower = workItem.subtitle.toLowerCase();
            const itemSubLower = item.subtitle.toLowerCase();

            if (workSubLower === itemSubLower) {
              return nameMatch;
            }
            // For sanitary items, if we have subtitles but they don't match, don't return this item
            return false;
          }

          // For painting work items, handle Slovak-English subtitle differences
          if (workItem.subtitle && item.subtitle && targetName.toLowerCase() === 'painting') {
            const workSubLower = workItem.subtitle.toLowerCase();
            const itemSubLower = item.subtitle.toLowerCase();

            // Match both Slovak->English and English->English
            if ((workSubLower.includes('stena') && itemSubLower.includes('wall')) ||
                (workSubLower.includes('wall') && itemSubLower.includes('wall')) ||
                (workSubLower.includes('strop') && itemSubLower.includes('ceiling')) ||
                (workSubLower.includes('ceiling') && itemSubLower.includes('ceiling'))) {
              return nameMatch;
            }
            // For painting items, if we have subtitles but they don't match, don't return this item
            return false;
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
    if (workItem.propertyId === 'custom_work') {
      const quantity = parseFloat(values.Quantity || 0);
      const price = parseFloat(values.Price || 0);
      return quantity * price;
    }
    
    // Handle sanitary installations - use price list for work, Price field is for material
    if (workItem.propertyId === 'sanitary_installation') {
      const count = parseFloat(values.Count || 0);
      // Always use price list for installation work
      return count * priceItem.price;
    }
    
    // Calculate quantity based on work item type and values
    if (values.Width && values.Height) {
      // Area calculation (m²)
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
    } else if (values.Width && values.Length) {
      // Area calculation (m²)
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
    } else if (values.Length) {
      // Linear calculation (m)
      quantity = parseFloat(values.Length || 0);
    } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
      // Count calculation (pc)
      quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
    } else if ((values.Distance || values.Vzdialenosť) && workItem.propertyId === 'commute') {
      // Distance calculation for commute (km × days) - must come before Duration check
      const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
      const days = parseFloat(values.Duration || values.Trvanie || 0);
      quantity = distance * (days > 0 ? days : 1);
    } else if (values.Duration || values.Trvanie) {
      // Time calculation (h)
      quantity = parseFloat(values.Duration || values.Trvanie || 0);
    } else if (values.Circumference) {
      // Linear calculation for circumference (m)
      quantity = parseFloat(values.Circumference || 0);
    } else if (values.Distance || values.Vzdialenosť) {
      // Distance calculation (km)
      quantity = parseFloat(values.Distance || values.Vzdialenosť || 0);
    } else if (values['Rental duration']) {
      // For scaffolding rentals - calculate area first, then multiply by duration
      const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
      const duration = parseFloat(values['Rental duration'] || 0);
      if (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') || 
          workItem.subtitle.toLowerCase().includes('lešenie'))) {
        // For scaffolding, we need both assembly price (per m²) and rental price (per day)
        return area * 30 + (area * 10 * duration); // 30€/m² assembly + 10€/day rental
      }
      quantity = duration; // For other rentals, just use duration
    }
    
    // Subtract openings (doors, windows, etc.) using actual dimensions
    if (workItem.doorWindowItems) {
      // Calculate actual door areas
      if (workItem.doorWindowItems.doors) {
        workItem.doorWindowItems.doors.forEach(door => {
          const doorArea = parseFloat(door.width || 0) * parseFloat(door.height || 0);
          quantity -= doorArea;
        });
      }
      
      // Calculate actual window areas
      if (workItem.doorWindowItems.windows) {
        workItem.doorWindowItems.windows.forEach(window => {
          const windowArea = parseFloat(window.width || 0) * parseFloat(window.height || 0);
          quantity -= windowArea;
        });
      }
    }
    
    // Fallback to old method if no doorWindowItems data
    if (!workItem.doorWindowItems) {
      if (values.Doors) {
        quantity -= parseFloat(values.Doors || 0) * 2; // Subtract door area (2m² per door)
      }
      if (values.Windows) {
        quantity -= parseFloat(values.Windows || 0) * 1.5; // Subtract window area (1.5m² per window)
      }
    }
    
    return Math.max(0, quantity * priceItem.price);
  };

  // Material matching and calculation functions
  const findMatchingMaterial = (workItemName, workItemSubtype, priceList) => {
    if (!priceList || !priceList.material) return null;
    
    
    
    // Extract base work name by removing type suffixes (Simple, Double, Triple, etc.)
    const typeSuffixes = [' Simple', ' Double', ' Triple', ' jednoduchý', ' dvojitý', ' trojitý'];
    let baseWorkName = workItemName;
    let extractedType = null;
    
    for (const suffix of typeSuffixes) {
      if (workItemName.endsWith(suffix)) {
        baseWorkName = workItemName.substring(0, workItemName.length - suffix.length);
        extractedType = suffix.trim().toLowerCase();
        break;
      }
    }
    
    // Material mapping based on work item names (both English and Slovak)
    const materialMappings = {
      'Brick partitions': 'Partition masonry',
      'Murovanie priečok': 'Partition masonry',
      'Brick load-bearing wall': 'Load-bearing masonry', 
      'Murovanie nosného muriva': 'Load-bearing masonry',
      'Plasterboarding': 'Plasterboard',
      'Sádrokartón': 'Plasterboard',
      'Sadrokartonárske práce': 'Plasterboard',
      'Netting': 'Mesh',
      'Sieťkovanie': 'Mesh',
      'Plastering': 'Plaster',
      'Omietka': 'Plaster',
      'Plastering of window sash': 'Plaster',
      'Omietka špalety': 'Plaster',
      'Facade Plastering': 'Facade Plaster',
      'Fasádne omietky': 'Facade Plaster',
      'Installation of corner bead': 'Corner bead',
      'Osadenie rohových lišt': 'Corner bead',
      'Osadenie rohovej lišty': 'Corner bead',
      'Penetration coating': 'Primer',
      'Penetračný náter': 'Primer',
      'Painting': 'Paint',
      'Maľovanie': 'Paint',
      'Levelling': 'Self-levelling compound',
      'Vyrovnávanie': 'Self-levelling compound',
      'Nivelačka': 'Self-levelling compound',
      'Floating floor': 'Floating floor',
      'Plávajúca podlaha': 'Floating floor',
      'Skirting': 'Skirting board',
      'Soklové lišty': 'Skirting board',
      'Tiling under 60cm': 'Tiles',
      'Obklad do 60cm': 'Tiles',
      'Paving under 60cm': 'Pavings',
      'Dlažba do 60 cm': 'Pavings',
      'Siliconing': 'Silicone',
      'Silikónovanie': 'Silicone',
      'Auxiliary and finishing work': 'Auxiliary and fastening material',
      'Pomocné a ukončovacie práce': 'Auxiliary and fastening material'
    };
    
    const materialName = materialMappings[baseWorkName];
    if (!materialName) return null;
    
    
    // Find material with exact name match
    let material = priceList.material.find(item => {
      const nameMatch = item.name.toLowerCase() === materialName.toLowerCase();
      
      
      // Check subtitle match if both exist
      if (workItemSubtype && item.subtitle) {
        const workSubLower = workItemSubtype.toLowerCase();
        const materialSubLower = item.subtitle.toLowerCase();
        
        // Direct match
        let subtitleMatch = materialSubLower.includes(workSubLower);
        
        // For paint items, handle Slovak-English subtitle differences
        // Work: "stena, 2 vrstvy" vs Material: "wall" 
        if (!subtitleMatch && materialName.toLowerCase() === 'paint') {
          const workSubLower = workItemSubtype.toLowerCase();
          
          if (workSubLower.includes('stena') && materialSubLower.includes('wall')) {
            subtitleMatch = true;
          } else if (workSubLower.includes('strop') && materialSubLower.includes('ceiling')) {
            subtitleMatch = true;
          }
        }
        

        // Handle specific ceiling/strop case for plasterboard
        if (!subtitleMatch && (materialName.toLowerCase() === 'plasterboard' || materialName.toLowerCase() === 'sádrokartón')) {
          if ((workSubLower.includes('ceiling') && materialSubLower.includes('strop')) ||
              (workSubLower.includes('strop') && materialSubLower.includes('ceiling')) ||
              (workSubLower.includes('strop') && materialSubLower.includes('strop'))) {
            subtitleMatch = true;
          }
        }


        // For plasterboard and sádrokartón items, handle word order differences and extracted types
        // Work: "priečka, jednoduchá" vs Material: "jednoduchý, priečka" 
        if (!subtitleMatch && (materialName.toLowerCase() === 'plasterboard' || materialName.toLowerCase() === 'sádrokartón')) {
          // Use extracted type if available, otherwise use workItemSubtype
          let subtypeToMatch = workItemSubtype;
          
          // If we have extracted type from work name (e.g., "Simple"), use it
          if (extractedType) {
            // Create expected subtitle format for matching
            // For Sádrokartón: workItemSubtype is like "priečka" or "predsadená stena", extractedType is like "simple"
            if (subtypeToMatch) {
              const subtypeLower = subtypeToMatch.toLowerCase();
              
              // Handle specific offset wall cases
              if (subtypeLower.includes('predsadená stena') || subtypeLower.includes('offset wall')) {
                // For offset wall, check specific Slovak patterns
                if (extractedType === 'simple' || extractedType === 'jednoduchý') {
                  if (materialSubLower.includes('jednoduchá predsadená stena') || 
                      materialSubLower.includes('simple, offset wall')) {
                    subtitleMatch = true;
                  }
                } else if (extractedType === 'double' || extractedType === 'dvojitý') {
                  if (materialSubLower.includes('zdvojená predsadená stena') || 
                      materialSubLower.includes('double, offset wall')) {
                    subtitleMatch = true;
                  }
                }
              } 
              // Handle partition cases  
              else if (subtypeLower.includes('priečka') || subtypeLower.includes('partition')) {
                // Try both orders: "type, subtype" and "subtype, type"
                const combo1 = `${extractedType}, ${subtypeLower}`;
                const combo2 = `${subtypeLower}, ${extractedType}`;
                
                if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                  subtitleMatch = true;
                }
              }
              // Handle offset wall cases
              else if (subtypeLower.includes('predsadená stena') || subtypeLower.includes('offset wall')) {
                // For offset wall: "simple, offset wall" or "double, offset wall"
                const combo1 = `${extractedType}, offset wall`;
                const combo2 = `${extractedType}, predsadená stena`;
                
                if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                  subtitleMatch = true;
                }
              }
              // For other cases, try generic combinations
              else {
                const combo1 = `${extractedType}, ${subtypeLower}`;
                const combo2 = `${subtypeLower}, ${extractedType}`;
                
                if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                  subtitleMatch = true;
                }
              }
            }
          }
          
          // If still no match, try the original complex matching
          if (!subtitleMatch && workSubLower) {
            const workParts = workSubLower.split(',').map(p => p.trim());
            const materialParts = materialSubLower.split(',').map(p => p.trim());
            
            // Include extracted type in work parts if available
            if (extractedType && !workParts.includes(extractedType)) {
              workParts.push(extractedType);
            }
            
            // Check if all parts match regardless of order
            if (workParts.length <= materialParts.length) {
              subtitleMatch = workParts.every(part => 
                materialParts.some(matPart => 
                  matPart.includes(part) || part.includes(matPart) ||
                  // Handle jednoduchý/simple equivalents
                  (part.includes('jednoduč') && matPart.includes('simple')) ||
                  (part.includes('simple') && matPart.includes('jednoduč')) ||
                  // Handle dvojitý/double equivalents
                  (part.includes('dvojit') && matPart.includes('double')) ||
                  (part.includes('double') && matPart.includes('dvojit')) ||
                  // Handle trojitý/triple equivalents
                  (part.includes('trojit') && matPart.includes('triple')) ||
                  (part.includes('triple') && matPart.includes('trojit')) ||
                  // Handle priečka/partition equivalents
                  (part.includes('priečk') && matPart.includes('partition')) ||
                  (part.includes('partition') && matPart.includes('priečk')) ||
                  // Handle predsadená stena/offset wall equivalents
                  (part.includes('predsadená') && matPart.includes('offset')) ||
                  (part.includes('offset') && matPart.includes('predsadená')) ||
                  (part.includes('stena') && matPart.includes('wall')) ||
                  (part.includes('wall') && matPart.includes('stena')) ||
                  // Handle strop/ceiling equivalents
                  (part.includes('strop') && matPart.includes('ceiling')) ||
                  (part.includes('ceiling') && matPart.includes('strop')) ||
                  // Handle zdvojená/double for offset walls
                  (part.includes('zdvojen') && matPart.includes('double')) ||
                  (part.includes('double') && matPart.includes('zdvojen'))
                )
              );
            }
          }
        }
        
        return nameMatch && subtitleMatch;
      }
      
      // If no subtitle on either side, just match by name
      return nameMatch;
    });
    
    // If no exact match with subtitle, try without subtitle
    if (!material && workItemSubtype) {
      material = priceList.material.find(item => 
        item.name.toLowerCase() === materialName.toLowerCase()
      );
    }
    
    
    return material;
  };

  const calculateMaterialCost = (workItem, material, workQuantity) => {
    if (!material || !workQuantity) return 0;
    
    // If material has capacity, calculate based on packages needed
    if (material.capacity) {
      const packagesNeeded = Math.ceil(workQuantity / material.capacity.value);
      return packagesNeeded * material.price;
    }
    
    // Direct calculation for materials priced per unit area/length
    return workQuantity * material.price;
  };

  const calculateWorkItemWithMaterials = (workItem, priceItem, priceList, totalTilingPavingArea = 0, skipAdhesive = false, totalNettingArea = 0) => {
    const workCost = calculateWorkItemPrice(workItem, priceItem);
    
    // Calculate work quantity for material calculation
    let quantity = 0;
    const values = workItem.fields;
    
    // Handle sanitary installations - quantity is the count, not area
    if (workItem.propertyId === 'sanitary_installation') {
      quantity = parseFloat(values.Count || 0);
    } else if (values.Width && values.Height) {
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
    } else if (values.Width && values.Length) {
      quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
    } else if (values.Length) {
      quantity = parseFloat(values.Length || 0);
    } else if (values.Circumference) {
      quantity = parseFloat(values.Circumference || 0);
    }
    
    // Subtract door/window areas from material quantity too
    if (workItem.doorWindowItems) {
      if (workItem.doorWindowItems.doors) {
        workItem.doorWindowItems.doors.forEach(door => {
          const doorArea = parseFloat(door.width || 0) * parseFloat(door.height || 0);
          quantity -= doorArea;
        });
      }
      if (workItem.doorWindowItems.windows) {
        workItem.doorWindowItems.windows.forEach(window => {
          const windowArea = parseFloat(window.width || 0) * parseFloat(window.height || 0);
          quantity -= windowArea;
        });
      }
    }
    
    quantity = Math.max(0, quantity);
    
    // For sanitary installations, use the user-entered Price field as material cost
    let materialCost = 0;
    let material = null;

    if (workItem.propertyId === 'sanitary_installation') {
      const count = parseFloat(values.Count || 0);
      const price = parseFloat(values.Price || 0);
      materialCost = count * price; // User-entered price is for the product/material
    } else {
      // Find matching material - combine work subtitle and selected type for full context
      const fullSubtype = workItem.subtitle ?
        (workItem.selectedType ? `${workItem.subtitle}, ${workItem.selectedType}` : workItem.subtitle) :
        workItem.selectedType;
      material = findMatchingMaterial(priceItem.name, fullSubtype, priceList);
      materialCost = material ? calculateMaterialCost(workItem, material, quantity) : 0;
    }
    
    // For tiling and paving works, also add adhesive cost
    let additionalMaterial = null;
    let additionalMaterialCost = 0;
    let additionalMaterialQuantity = 0;

    if (!skipAdhesive && ((priceItem.name.toLowerCase().includes('tiling') || priceItem.name.toLowerCase().includes('obklad') ||
         workItem.propertyId === 'tiling_under_60') ||
        (priceItem.name.toLowerCase().includes('paving') || priceItem.name.toLowerCase().includes('dlažba') ||
         workItem.propertyId === 'paving_under_60'))) {

      // Find the single adhesive item for both tiling and paving
      const adhesive = priceList.material.find(item =>
        item.name.toLowerCase() === 'adhesive' &&
        item.subtitle && item.subtitle.toLowerCase().includes('tiling and paving')
      );

      if (adhesive) {
        additionalMaterial = adhesive;
        // If total area is provided, use it for aggregated calculation; otherwise use individual quantity
        const areaToUse = totalTilingPavingArea > 0 ? totalTilingPavingArea : quantity;
        additionalMaterialQuantity = areaToUse;
        additionalMaterialCost = calculateMaterialCost(workItem, additionalMaterial, areaToUse);
        materialCost += additionalMaterialCost;
      }
    }

    // For netting works, also add adhesive cost
    if (!skipAdhesive && (priceItem.name.toLowerCase().includes('netting') || priceItem.name.toLowerCase().includes('sieťkovanie') ||
        workItem.propertyId === 'netting_wall' || workItem.propertyId === 'netting_ceiling')) {

      // Find the adhesive for netting
      const adhesive = priceList.material.find(item =>
        item.name.toLowerCase() === 'adhesive' &&
        item.subtitle && item.subtitle.toLowerCase().includes('netting')
      );

      if (adhesive) {
        additionalMaterial = adhesive;
        // If total netting area is provided, use it for aggregated calculation; otherwise use individual quantity
        const areaToUse = totalNettingArea > 0 ? totalNettingArea : quantity;
        additionalMaterialQuantity = areaToUse;
        additionalMaterialCost = calculateMaterialCost(workItem, additionalMaterial, areaToUse);
        materialCost += additionalMaterialCost;
      }
    }

    return {
      workCost,
      materialCost,
      material,
      additionalMaterial,
      additionalMaterialQuantity,
      quantity
    };
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
    archivedProjects: appData.archivedProjects,
    contractors: appData.contractors,
    priceOfferSettings: appData.priceOfferSettings,
    activeContractorId: appData.activeContractorId,
    invoices: appData.invoices,

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

    // Invoice functions
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesForContractor,
    getInvoiceForProject,
    
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