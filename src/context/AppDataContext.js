import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/supabaseApi';
import { useAuth } from './AuthContext';
import { workItemToDatabase, databaseToWorkItem, getTableName } from '../services/workItemsMapping';
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

  // Helper function to transform invoice from database format to app format
  const transformInvoiceFromDB = (dbInvoice) => {
    if (!dbInvoice) return null;

    // Determine Issue Date (Datum vystavenia) - prefer date_created, fallback to created_at
    const issueDateRaw = dbInvoice.date_created || dbInvoice.created_at;
    const issueDate = issueDateRaw ? new Date(issueDateRaw).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Determine Dispatch Date (Datum dodania) - use date_of_dispatch
    const dispatchDate = dbInvoice.date_of_dispatch || issueDate;

    // Calculate Maturity Date (Datum splatnosti) based on Issue Date + Maturity Days
    const maturityDays = dbInvoice.maturity_days || 14;
    const dueDate = new Date(new Date(issueDate).getTime() + maturityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      id: dbInvoice.id,
      invoiceNumber: dbInvoice.number,
      issueDate: issueDate,
      dispatchDate: dispatchDate, // New field
      dueDate: dueDate,
      paymentMethod: dbInvoice.payment_type,
      paymentDays: maturityDays,
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

      // Helper to transform contractor from DB (snake_case) to App (camelCase)
      const transformContractorFromDB = (dbContractor) => {
        if (!dbContractor) return null;
        return {
          id: dbContractor.id,
          name: dbContractor.name,
          contactPerson: dbContractor.contact_person_name,
          email: dbContractor.email,
          phone: dbContractor.phone,
          website: dbContractor.web,
          street: dbContractor.street,
          additionalInfo: dbContractor.second_row_street,
          city: dbContractor.city,
          postalCode: dbContractor.postal_code,
          country: dbContractor.country,
          businessId: dbContractor.business_id,
          taxId: dbContractor.tax_id,
          vatNumber: dbContractor.vat_registration_number,
          bankAccount: dbContractor.bank_account_number,
          bankCode: dbContractor.swift_code,
          legalAppendix: dbContractor.legal_notice,
          logo: dbContractor.logo_url,
          signature: dbContractor.signature_url,
          userId: dbContractor.user_id,
          createdAt: dbContractor.created_at
        };
      };
    
      // Helper to transform contractor from App (camelCase) to DB (snake_case)
      const transformContractorToDB = (contractorData) => {
        return {
          name: contractorData.name,
          contact_person_name: contractorData.contactPerson,
          email: contractorData.email,
          phone: contractorData.phone,
          web: contractorData.website,
          street: contractorData.street,
          second_row_street: contractorData.additionalInfo,
          city: contractorData.city,
          postal_code: contractorData.postalCode,
          country: contractorData.country,
          business_id: contractorData.businessId,
          tax_id: contractorData.taxId,
          vat_registration_number: contractorData.vatNumber,
          bank_account_number: contractorData.bankAccount,
          swift_code: contractorData.bankCode,
          legal_notice: contractorData.legalAppendix,
          logo_url: contractorData.logo,
          signature_url: contractorData.signature
        };
      };
    
      // Helper to transform client from DB (snake_case) to App (camelCase)
      const transformClientFromDB = (dbClient) => {
        if (!dbClient) return null;
        return {
          id: dbClient.id,
          name: dbClient.name,
          email: dbClient.email,
          phone: dbClient.phone,
          street: dbClient.street,
          additionalInfo: dbClient.second_row_street,
          city: dbClient.city,
          postalCode: dbClient.postal_code,
          country: dbClient.country,
          businessId: dbClient.business_id,
          taxId: dbClient.tax_id,
          vatId: dbClient.vat_registration_number,
          contactPerson: dbClient.contact_person_name,
          type: dbClient.type,
          contractorId: dbClient.contractor_id || dbClient.c_id,
          userId: dbClient.user_id,
          createdAt: dbClient.created_at,
          projects: dbClient.projects || [] // Preserve if joined
        };
      };
    
      // Helper to transform client from App (camelCase) to DB (snake_case)
      const transformClientToDB = (clientData) => {
        return {
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
          vat_registration_number: clientData.vatId || null,
          contact_person_name: clientData.contactPerson || null,
          type: clientData.type || 'private'
        };
      };
    
      // Load initial data from Supabase
      const loadInitialData = useCallback(async () => {
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
  
    // Helper function to load work items from all tables (optimized with RPC)
    const loadWorkItemsForRoom = async (roomId) => {
      try {
        const { data, error } = await api.workItems.getAllForRoomRPC(roomId);
        
        if (error) {
          console.error('[SUPABASE] RPC get_room_items error:', error);
          return [];
        }

        if (!data || data.length === 0) return [];

        const allWorkItems = [];
        
        data.forEach(record => {
          // The RPC adds '_table_name' to each record
          const tableName = record._table_name;
          const workItem = databaseToWorkItem(record, tableName);
          if (workItem) {
            allWorkItems.push(workItem);
          }
        });

        return allWorkItems;
      } catch (error) {
        console.error('[SUPABASE] Error loading work items via RPC:', error);
        return [];
      }
    };
  
    // Load details (rooms and work items) for a specific project
    const loadProjectDetails = async (projectId) => {
      try {
        console.log(`[SUPABASE] Loading details for project ${projectId}...`);
        
        // Get rooms
        const rooms = await api.rooms.getByProject(projectId);
        
        if (!rooms || rooms.length === 0) {
           setAppData(prev => ({
            ...prev,
            projectRoomsData: {
              ...prev.projectRoomsData,
              [projectId]: []
            }
          }));
          return;
        }
  
        // Load work items for each room
        const roomsWithWorkItems = await Promise.all(rooms.map(async (room) => {
          const workItems = await loadWorkItemsForRoom(room.id);
          return {
            ...room,
            workItems: workItems || []
          };
        }));
  
        setAppData(prev => ({
          ...prev,
          projectRoomsData: {
            ...prev.projectRoomsData,
            [projectId]: roomsWithWorkItems
          }
        }));
        console.log(`[SUPABASE] Loaded details for project ${projectId}`);
      } catch (error) {
        console.error(`[SUPABASE] Error loading details for project ${projectId}:`, error);
      }
    };
  
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
    // Client management functions
    const addClient = async (clientData) => {
      try {
        // Map camelCase fields to snake_case database columns
        // Note: c_id links client to contractor. Remove unique constraint on c_id in Supabase if getting duplicate key errors
        const mappedData = {
          ...transformClientToDB(clientData),
          c_id: appData.activeContractorId,
          is_user: false
        };
  
        const newClientDB = await api.clients.create(mappedData);
        const newClient = transformClientFromDB(newClientDB);
  
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
        const mappedData = transformClientToDB(clientData);
        await api.clients.update(clientId, mappedData);
  
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

      // Create a deep copy of the current general price list as a snapshot for this project
      const priceListSnapshot = JSON.parse(JSON.stringify(appData.generalPriceList));

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
        price_list_id: null, // We'll handle price lists separately
        price_list_snapshot: JSON.stringify(priceListSnapshot) // Store price snapshot in database
      });

      // Add the price list snapshot to the project object (stored in local state)
      const projectWithSnapshot = {
        ...newProject,
        priceListSnapshot
      };

      setAppData(prev => {
        const activeContractorId = prev.activeContractorId;

        if (!activeContractorId) {
          return {
            ...prev,
            projectCategories: prev.projectCategories.map(category => {
              if (category.id === categoryId) {
                return {
                  ...category,
                  projects: [projectWithSnapshot, ...category.projects],
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
                      projects: [projectWithSnapshot],
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
                    projects: [projectWithSnapshot, ...category.projects],
                    count: category.count + 1
                  };
                }
                return category;
              })
            }
          }
        };
      });

      return projectWithSnapshot;
    } catch (error) {
      console.error('[SUPABASE] Error adding project:', error);
      throw error;
    }
  };

  const updateProject = async (categoryId, projectId, projectData) => {
    try {
      // Map camelCase fields to snake_case database columns
      const mappedData = {};
      if (projectData.name !== undefined) mappedData.name = projectData.name;
      if (projectData.c_id !== undefined) mappedData.c_id = projectData.c_id;
      if (projectData.clientId !== undefined) mappedData.client_id = projectData.clientId || null;
      if (projectData.status !== undefined) mappedData.status = projectData.status;
      if (projectData.hasInvoice !== undefined) mappedData.has_invoice = projectData.hasInvoice;
      if (projectData.invoiceId !== undefined) mappedData.invoice_id = projectData.invoiceId;
      if (projectData.invoiceStatus !== undefined) mappedData.invoice_status = projectData.invoiceStatus;
      if (projectData.isArchived !== undefined) mappedData.is_archived = projectData.isArchived;
      if (projectData.priceListSnapshot !== undefined) {
        mappedData.price_list_snapshot = typeof projectData.priceListSnapshot === 'string'
          ? projectData.priceListSnapshot
          : JSON.stringify(projectData.priceListSnapshot);
      }
      if (projectData.detail_notes !== undefined) mappedData.detail_notes = projectData.detail_notes;
      if (projectData.photos !== undefined) {
        mappedData.photos = typeof projectData.photos === 'string'
          ? projectData.photos
          : JSON.stringify(projectData.photos);
      }
      if (projectData.notes !== undefined) mappedData.notes = projectData.notes;

      await api.projects.update(projectId, mappedData);

      setAppData(prev => {
        // If c_id is changing, we need to move the project to another contractor's list
        if (projectData.c_id && prev.activeContractorId && projectData.c_id !== prev.activeContractorId) {
          // 1. Find the project object in the current list
          let projectToMove = null;
          const oldContractorId = prev.activeContractorId;
          const newContractorId = projectData.c_id;

          // Check if destination exists
          if (!prev.contractorProjects[newContractorId]) return prev;

          // Find and remove from old list
          const updatedOldCategories = prev.contractorProjects[oldContractorId].categories.map(category => {
            if (category.id === categoryId) {
              const found = category.projects.find(p => p.id === projectId);
              if (found) projectToMove = { ...found, ...projectData }; // Update with new data
              return {
                ...category,
                projects: category.projects.filter(p => p.id !== projectId),
                count: Math.max(0, category.count - 1)
              };
            }
            return category;
          });

          // Add to new list
          const updatedNewCategories = prev.contractorProjects[newContractorId].categories.map(category => {
            if (category.id === categoryId && projectToMove) {
              return {
                ...category,
                projects: [projectToMove, ...category.projects],
                count: category.count + 1
              };
            }
            return category;
          });

          return {
            ...prev,
            contractorProjects: {
              ...prev.contractorProjects,
              [oldContractorId]: {
                ...prev.contractorProjects[oldContractorId],
                categories: updatedOldCategories
              },
              [newContractorId]: {
                ...prev.contractorProjects[newContractorId],
                categories: updatedNewCategories
              }
            }
          };
        }

        // Standard update (no move)
        const activeContractorId = prev.activeContractorId;

        if (!activeContractorId) {
          return {
            ...prev,
            projectCategories: (prev.projectCategories || []).map(category => {
              if (category.id === categoryId) {
                return {
                  ...category,
                  projects: (category.projects || []).map(project =>
                    project.id === projectId ? { ...project, ...projectData } : project
                  )
                };
              }
              return category;
            })
          };
        }

        if (!prev.contractorProjects?.[activeContractorId]?.categories) {
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
                    projects: (category.projects || []).map(project =>
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
      const mappedData = transformContractorToDB(contractorData);
      const newContractorDB = await api.contractors.create(mappedData);
      const newContractor = transformContractorFromDB(newContractorDB);

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

  // Project history tracking
  const addProjectHistoryEntry = (projectId, historyEntry) => {
    setAppData(prev => ({
      ...prev,
      projectHistory: {
        ...prev.projectHistory,
        [projectId]: [
          ...(prev.projectHistory[projectId] || []),
          {
            ...historyEntry,
            date: new Date().toISOString()
          }
        ]
      }
    }));
  };

  const getProjectHistory = (projectId) => {
    if (!appData.projectHistory || !projectId) return [];
    return appData.projectHistory[projectId] || [];
  };

  // Invoice management functions
  const createInvoice = async (projectId, categoryId, invoiceData) => {
    try {
      const project = findProjectById(projectId, categoryId);
      if (!project) return null;

      // Map camelCase fields to snake_case database columns
      // Issue Date (Datum vystavenia) maps to date_created (timestamp)
      // Dispatch Date (Datum dodania) maps to date_of_dispatch (date)
      const mappedInvoiceData = {
        number: invoiceData.invoiceNumber,
        date_created: new Date(invoiceData.issueDate).toISOString(), // Persist Issue Date
        date_of_dispatch: invoiceData.dispatchDate, // Persist Dispatch Date
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
      // Use the newly created helper logic or manual transform
      const issueDate = invoiceData.issueDate;
      const dispatchDate = invoiceData.dispatchDate;
      const maturityDays = invoiceData.paymentDays || 30;
      const dueDate = new Date(new Date(issueDate).getTime() + maturityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transformedInvoice = {
        id: dbInvoice.id,
        invoiceNumber: dbInvoice.number,
        issueDate: issueDate,
        dispatchDate: dispatchDate,
        dueDate: dueDate,
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
        invoices: [...prev.invoices, transformedInvoice],
        // Add history entry for invoice creation
        projectHistory: {
          ...prev.projectHistory,
          [projectId]: [
            ...(prev.projectHistory[projectId] || []),
            {
              type: 'invoice_created',
              invoiceNumber: transformedInvoice.invoiceNumber,
              date: new Date().toISOString()
            }
          ]
        }
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
      // Find the invoice first to get projectId for history tracking
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);

      await api.invoices.update(invoiceId, updates);

      setAppData(prev => {
        const updatedState = {
          ...prev,
          invoices: prev.invoices.map(inv =>
            inv.id === invoiceId ? { ...inv, ...updates } : inv
          )
        };

        if (invoice) {
          const projectId = invoice.projectId;
          const newHistoryEntries = [];

          // Track status changes
          if (updates.status) {
            if (updates.status === 'sent') {
              newHistoryEntries.push({
                type: 'invoice_sent',
                invoiceNumber: invoice.invoiceNumber,
                date: new Date().toISOString()
              });
            } else if (updates.status === 'paid') {
              newHistoryEntries.push({
                type: 'invoice_paid',
                invoiceNumber: invoice.invoiceNumber,
                date: new Date().toISOString()
              });
            }
          }

          // Track edits (check for non-status fields)
          // We check if any of the main editable fields are present in updates
          // and if they are different from existing values (optional optimization, but simple check is fine)
          const isEdit = updates.invoiceNumber || updates.issueDate || updates.paymentMethod || updates.notes || updates.dueDate || updates.paymentDays || updates.dispatchDate;
          
          // Avoid duplicate entry if it's just a status update (which might also be considered an edit technically, but we want distinct events)
          // If 'status' is the ONLY field, it's a status change. If other fields are present, it's an edit.
          const hasNonStatusUpdates = Object.keys(updates).some(key => key !== 'status');

          if (hasNonStatusUpdates && isEdit) {
             newHistoryEntries.push({
              type: 'invoice_edited',
              invoiceNumber: updates.invoiceNumber || invoice.invoiceNumber,
              date: new Date().toISOString()
            });
          }

          if (newHistoryEntries.length > 0) {
            updatedState.projectHistory = {
              ...prev.projectHistory,
              [projectId]: [
                ...(prev.projectHistory[projectId] || []),
                ...newHistoryEntries
              ]
            };
          }
        }

        return updatedState;
      });

      // Note: Invoice status is managed via invoices table only
      // No need to update project table as it doesn't have invoice_status field
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  };

  const deleteInvoice = async (invoiceId) => {
    try {
      // Find the invoice first to get projectId for history tracking
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);

      await api.invoices.delete(invoiceId);

      setAppData(prev => {
        const updatedState = {
          ...prev,
          invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
        };

        // Add history entry for invoice deletion
        if (invoice) {
          updatedState.projectHistory = {
            ...prev.projectHistory,
            [invoice.projectId]: [
              ...(prev.projectHistory[invoice.projectId] || []),
              {
                type: 'invoice_deleted',
                invoiceNumber: invoice.invoiceNumber,
                date: new Date().toISOString()
              }
            ]
          };
        }

        return updatedState;
      });

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
          const clientProjects = client.projects || [];
          // Check if project is already assigned
          const existingProject = clientProjects.find(p => p.id === projectId);
          if (!existingProject) {
            return {
              ...client,
              projects: [...clientProjects, {
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
            projects: (client.projects || []).filter(project => project.id !== projectId)
          };
        }
        return client;
      })
    }));
  };

  // Helper function to find project by ID across all categories
  const findProjectById = (projectId) => {
    // First, search in contractor-specific projects if we have an active contractor
    if (appData.activeContractorId && appData.contractorProjects[appData.activeContractorId]?.categories) {
      for (const category of appData.contractorProjects[appData.activeContractorId].categories) {
        if (!category.projects) continue;
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          return { project, category: category.id };
        }
      }
    }

    // Fallback: search in global project categories (for backward compatibility)
    for (const category of (appData.projectCategories || [])) {
      if (!category.projects) continue;
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

    // History functions
    getProjectHistory,
    addProjectHistoryEntry,

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
    loadProjectDetails,
    
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