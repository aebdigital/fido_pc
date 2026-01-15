import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { databaseToWorkItem, getTableName, workItemToDatabase, tableCanHaveDoors, tableCanHaveWindows, doorToDatabase, windowToDatabase, doorFromDatabase, windowFromDatabase, TABLES_WITH_DOORS_WINDOWS } from '../services/workItemsMapping';
import { analyzeReceipt } from '../services/openaiReceiptService';
import { priceListToDbColumns } from '../services/priceListMapping';
import { PROJECT_EVENTS } from '../utils/dataTransformers';
import flatsImage from '../images/flats.jpg';
import housesImage from '../images/houses.jpg';
import firmsImage from '../images/firms.jpg';
import cottagesImage from '../images/cottages.jpg';

// Duplicated from AppDataContext
const getDefaultCategories = () => [
  { id: 'flats', name: 'Flats', count: 0, image: flatsImage, projects: [] },
  { id: 'houses', name: 'Houses', count: 0, image: housesImage, projects: [] },
  { id: 'companies', name: 'Companies', count: 0, image: firmsImage, projects: [] },
  { id: 'cottages', name: 'Cottages', count: 0, image: cottagesImage, projects: [] }
];

export const useProjectManager = (appData, setAppData) => {
  const {
    activeContractorId,
    contractorProjects,
    projectCategories,
    projectRoomsData,
    generalPriceList,
    archivedProjects
  } = appData;

  // Helper function to find project by ID across all categories
  const findProjectById = useCallback((projectId) => {
    // First, search in contractor-specific projects if we have an active contractor
    if (activeContractorId && contractorProjects[activeContractorId]?.categories) {
      for (const category of contractorProjects[activeContractorId].categories) {
        if (!category.projects) continue;
        const project = category.projects.find(p => p.id === projectId);
        if (project) {
          return { project, category: category.id };
        }
      }
    }

    // Fallback: search in global project categories
    for (const category of (projectCategories || [])) {
      if (!category.projects) continue;
      const project = category.projects.find(p => p.id === projectId);
      if (project) {
        return { project, category: category.id };
      }
    }

    return null;
  }, [activeContractorId, contractorProjects, projectCategories]);

  const addProject = useCallback(async (categoryId, projectData) => {
    try {
      // Check if contractor exists
      if (!activeContractorId) {
        const error = new Error('Please create a contractor profile first in Settings');
        error.userFriendly = true;
        throw error;
      }

      // Create a deep copy of the current general price list for this project
      const priceListSnapshot = JSON.parse(JSON.stringify(generalPriceList));

      // Determine next sequential number (set to 0 to trigger database auto-assignment)
      const nextNumber = 0;

      // Initial history entry - iOS compatible
      const initialHistory = [{
        type: PROJECT_EVENTS.CREATED, // iOS compatible: 'created'
        date: new Date().toISOString()
      }];

      // Generate a unique c_id for iOS compatibility (UUID format)
      const projectCId = crypto.randomUUID();

      // Create the project first
      const newProject = await api.projects.create({
        name: projectData.name,
        category: categoryId,
        c_id: projectCId,
        client_id: projectData.clientId || null,
        contractor_id: activeContractorId,
        status: 0, // iOS compatible: 0=notSent, 1=sent, 2=approved, 3=finished
        is_archived: false,
        number: nextNumber,
        notes: null,
        price_list_id: null,
        // Keep price_list_snapshot for backwards compatibility with old projects
        // but also create a proper price_lists row for iOS
        price_list_snapshot: JSON.stringify(priceListSnapshot),
        project_history: JSON.stringify(initialHistory)
      });

      // Create a project-specific price list in the price_lists table (iOS-compatible)
      // This mimics iOS behavior: copy general price list values to a new row with is_general=false
      try {
        const dbPriceData = priceListToDbColumns(priceListSnapshot);
        console.log('[addProject] Creating price list with data:', JSON.stringify(dbPriceData).slice(0, 500));

        const createdPriceList = await api.priceLists.createForProject(projectCId, activeContractorId, dbPriceData);
        console.log('[addProject] Created project price list:', createdPriceList?.c_id, 'for iOS compatibility');

        // CRITICAL: Update the project with the price_list_id so iOS can link them
        // Without this, iOS will create a new default price list with default values (15€ etc.)
        if (createdPriceList && createdPriceList.c_id) {
          await api.projects.update(projectCId, { price_list_id: createdPriceList.c_id });
          console.log('[addProject] Linked price_list_id to project:', createdPriceList.c_id);

          // Also update the newProject object so it has the price_list_id
          newProject.price_list_id = createdPriceList.c_id;
        } else {
          console.warn('[addProject] Price list created but no c_id returned');
        }
      } catch (priceListError) {
        console.error('[addProject] Failed to create project price list:', priceListError);
        // Don't fail the whole operation if price list creation fails
      }

      // Also write to history_events table for iOS sync
      try {
        await api.historyEvents.create({
          type: PROJECT_EVENTS.CREATED,
          project_id: projectCId,
          created_at: initialHistory[0].date
        });
        console.log('[addProject] Created history event in history_events table for iOS sync');
      } catch (historyError) {
        console.error('[addProject] Failed to create history event:', historyError);
        // Don't fail the whole operation if history event creation fails
      }

      // Add the price list snapshot and history to the project object
      const projectWithSnapshot = {
        ...newProject,
        priceListSnapshot,
        projectHistory: initialHistory
      };

      setAppData(prev => {
        const currentActiveContractorId = prev.activeContractorId;

        // Update projectHistory in state as well
        const updatedProjectHistory = {
          ...prev.projectHistory,
          [newProject.id]: initialHistory
        };

        if (!currentActiveContractorId) {
          return {
            ...prev,
            projectHistory: updatedProjectHistory,
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

        if (!prev.contractorProjects[currentActiveContractorId]) {
          return {
            ...prev,
            contractorProjects: {
              ...prev.contractorProjects,
              [currentActiveContractorId]: {
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
            [currentActiveContractorId]: {
              ...prev.contractorProjects[currentActiveContractorId],
              categories: prev.contractorProjects[currentActiveContractorId].categories.map(category => {
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
  }, [activeContractorId, generalPriceList, setAppData]);

  const updateProject = useCallback(async (categoryId, projectId, projectData) => {
    try {
      const mappedData = {};
      if (projectData.name !== undefined) mappedData.name = projectData.name;
      if (projectData.contractor_id !== undefined) mappedData.contractor_id = projectData.contractor_id;
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

        // CRITICAL: Also update the price_lists table for iOS sync compatibility
        // iOS reads from the price_lists table, not the JSON snapshot on the project
        try {
          const priceListData = typeof projectData.priceListSnapshot === 'string'
            ? JSON.parse(projectData.priceListSnapshot)
            : projectData.priceListSnapshot;
          const dbPriceData = priceListToDbColumns(priceListData);
          await api.priceLists.updateProjectPriceList(projectId, dbPriceData);
          console.log('[updateProject] Updated price_lists table for iOS sync');
        } catch (priceListError) {
          console.error('[updateProject] Failed to update price_lists table:', priceListError);
        }
      }
      if (projectData.detailNotes !== undefined) mappedData.detailNotes = projectData.detailNotes;
      if (projectData.photos !== undefined) {
        // Pass photos array directly to Supabase JSONB - don't stringify!
        mappedData.photos = projectData.photos;
      }
      if (projectData.notes !== undefined) mappedData.notes = projectData.notes;

      if (Object.keys(mappedData).length > 0) {
        await api.projects.update(projectId, mappedData);
      }

      setAppData(prev => {
        // Handle project move if contractor_id changed
        if (projectData.contractor_id && prev.activeContractorId && projectData.contractor_id !== prev.activeContractorId) {
          let projectToMove = null;
          const oldContractorId = prev.activeContractorId;
          const newContractorId = projectData.contractor_id;

          if (!prev.contractorProjects[newContractorId]) return prev;

          const updatedOldCategories = prev.contractorProjects[oldContractorId].categories.map(category => {
            if (category.id === categoryId) {
              const found = category.projects.find(p => p.id === projectId);
              if (found) projectToMove = { ...found, ...projectData };
              return {
                ...category,
                projects: category.projects.filter(p => p.id !== projectId),
                count: Math.max(0, category.count - 1)
              };
            }
            return category;
          });

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

        // Standard update
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
  }, [setAppData]);

  const deleteProject = useCallback(async (categoryId, projectId) => {
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
  }, [setAppData]);

  const archiveProject = useCallback(async (categoryId, projectId) => {
    try {
      const projectResult = findProjectById(projectId);
      if (!projectResult) return;

      const { project } = projectResult;

      await api.projects.update(projectId, {
        is_archived: true,
        category: categoryId
      });

      const archivedProject = {
        ...project,
        is_archived: true,
        originalCategoryId: categoryId,
        archivedDate: new Date().toISOString(),
        contractorId: activeContractorId
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
  }, [activeContractorId, findProjectById, setAppData]);

  const unarchiveProject = useCallback(async (projectId) => {
    try {
      const archivedProject = archivedProjects.find(p => p.id === projectId);
      if (!archivedProject) return;

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
  }, [archivedProjects, setAppData]);

  const deleteArchivedProject = useCallback(async (projectId) => {
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
  }, [setAppData]);

  // Project history tracking
  const addProjectHistoryEntry = useCallback(async (projectId, historyEntry) => {
    const newEntry = {
      ...historyEntry,
      date: new Date().toISOString()
    };

    const currentHistory = appData.projectHistory?.[projectId] || [];
    const updatedHistory = [...currentHistory, newEntry];

    // Update local state
    setAppData(prev => ({
      ...prev,
      projectHistory: {
        ...prev.projectHistory,
        [projectId]: updatedHistory
      }
    }));

    // Update in Supabase - both project_history JSON and history_events table
    try {
      // Update project_history JSON column (for desktop backwards compatibility)
      await api.projects.update(projectId, {
        project_history: JSON.stringify(updatedHistory)
      });

      // Also write to history_events table (for iOS sync)
      await api.historyEvents.create({
        type: historyEntry.type,
        project_id: projectId,
        created_at: newEntry.date
      });
    } catch (error) {
      console.error('[SUPABASE] Error saving project history:', error);
    }
  }, [appData.projectHistory, setAppData]);

  const getProjectHistory = useCallback((projectId) => {
    if (!appData.projectHistory || !projectId) return [];
    return appData.projectHistory[projectId] || [];
  }, [appData.projectHistory]);

  // Room Functions
  const loadWorkItemsForRoom = async (roomId, contractorId) => {
    try {
      // Pass contractor ID to filter work items by current contractor
      const { data, error } = await api.workItems.getAllForRoomRPC(roomId, contractorId);
      if (error) {
        console.error('[SUPABASE] RPC get_room_items error:', error);
        return [];
      }
      if (!data || data.length === 0) return [];

      const allWorkItems = [];
      const workItemsWithDoorsWindows = []; // Track items that can have doors/windows

      data.forEach(record => {
        const tableName = record._table_name;
        const workItem = databaseToWorkItem(record, tableName);
        if (workItem) {
          allWorkItems.push(workItem);
          // Track items that can have doors/windows
          if (TABLES_WITH_DOORS_WINDOWS.includes(tableName) && record.c_id) {
            workItemsWithDoorsWindows.push({
              workItem,
              tableName,
              cId: record.c_id
            });
          }
        }
      });

      // Load doors and windows for work items that support them
      if (workItemsWithDoorsWindows.length > 0) {
        // Group by table name for efficient batch loading
        const byTable = {};
        workItemsWithDoorsWindows.forEach(item => {
          if (!byTable[item.tableName]) {
            byTable[item.tableName] = [];
          }
          byTable[item.tableName].push(item);
        });

        // Load doors and windows for each table type
        await Promise.all(Object.entries(byTable).map(async ([tableName, items]) => {
          const cIds = items.map(item => item.cId);

          // Load doors if table supports them
          if (tableCanHaveDoors(tableName)) {
            try {
              const doors = await api.doors.getByParents(tableName, cIds);
              if (doors && doors.length > 0) {
                // Group doors by parent c_id
                const doorsByParent = {};
                doors.forEach(door => {
                  // Find which parent this door belongs to based on foreign key
                  const parentKey = Object.keys(door).find(key =>
                    key.endsWith('_id') && door[key] && cIds.includes(door[key])
                  );
                  const parentCId = parentKey ? door[parentKey] : null;
                  if (parentCId) {
                    if (!doorsByParent[parentCId]) doorsByParent[parentCId] = [];
                    doorsByParent[parentCId].push(doorFromDatabase(door));
                  }
                });

                // Attach doors to work items
                items.forEach(item => {
                  if (doorsByParent[item.cId]) {
                    item.workItem.doorWindowItems = item.workItem.doorWindowItems || { doors: [], windows: [] };
                    item.workItem.doorWindowItems.doors = doorsByParent[item.cId];
                  }
                });
              }
            } catch (error) {
              console.error(`Error loading doors for ${tableName}:`, error);
            }
          }

          // Load windows if table supports them
          if (tableCanHaveWindows(tableName)) {
            try {
              const windows = await api.windows.getByParents(tableName, cIds);
              if (windows && windows.length > 0) {
                // Group windows by parent c_id
                const windowsByParent = {};
                windows.forEach(window => {
                  // Find which parent this window belongs to based on foreign key
                  const parentKey = Object.keys(window).find(key =>
                    key.endsWith('_id') && window[key] && cIds.includes(window[key])
                  );
                  const parentCId = parentKey ? window[parentKey] : null;
                  if (parentCId) {
                    if (!windowsByParent[parentCId]) windowsByParent[parentCId] = [];
                    windowsByParent[parentCId].push(windowFromDatabase(window));
                  }
                });

                // Attach windows to work items
                items.forEach(item => {
                  if (windowsByParent[item.cId]) {
                    item.workItem.doorWindowItems = item.workItem.doorWindowItems || { doors: [], windows: [] };
                    item.workItem.doorWindowItems.windows = windowsByParent[item.cId];
                  }
                });
              }
            } catch (error) {
              console.error(`Error loading windows for ${tableName}:`, error);
            }
          }
        }));
      }

      return allWorkItems;
    } catch (error) {
      console.error('[SUPABASE] Error loading work items via RPC:', error);
      return [];
    }
  };

  const loadProjectDetails = useCallback(async (projectId) => {
    try {
      console.log(`[SUPABASE] Loading details for project ${projectId}...`);
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

      const roomsWithWorkItems = await Promise.all(rooms.map(async (room) => {
        // Don't pass contractor ID - work items are scoped by room, not contractor
        // (c_id is now a unique UUID per work item, not contractor ID)
        const workItems = await loadWorkItemsForRoom(room.id, null);
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
  }, [setAppData]);

  const addRoomToProject = useCallback(async (projectId, roomData) => {
    try {
      // Generate a unique c_id for iOS compatibility (UUID format)
      const roomCId = crypto.randomUUID();

      const newRoom = await api.rooms.create({
        project_id: projectId,
        c_id: roomCId,
        name: roomData.name,
        room_type: roomData.roomType || null,
        floor_length: roomData.floorLength || 0,
        floor_width: roomData.floorWidth || 0,
        wall_height: roomData.wallHeight || 0,
        commute_length: roomData.commuteLength || 0,
        days_in_work: roomData.daysInWork || 0,
        tool_rental: roomData.toolRental || 0
      });

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
  }, [setAppData]);

  const saveWorkItemsForRoom = useCallback(async (roomId, workItems) => {
    // Get all possible work item tables to ensure we delete removed items too
    const allWorkItemTables = [
      'brick_partitions',
      'brick_load_bearing_walls',
      'plasterboarding_partitions',
      'plasterboarding_offset_walls',
      'plasterboarding_ceilings',
      'netting_walls',
      'netting_ceilings',
      'plastering_walls',
      'plastering_ceilings',
      'facade_plasterings',
      'plastering_of_window_sashes',
      'painting_walls',
      'painting_ceilings',
      'levellings',
      'tile_ceramics',
      'paving_ceramics',
      'laying_floating_floors',
      'wirings',
      'plumbings',
      'installation_of_sanitaries',
      'installation_of_corner_beads',
      'installation_of_door_jambs',
      'window_installations',
      'demolitions',
      'groutings',
      'penetration_coatings',
      'siliconings',
      'custom_works',
      'custom_materials',
      'scaffoldings',
      'core_drills',
      'tool_rentals'
    ];

    // Delete existing items from ALL work item tables for this room
    const deletePromises = allWorkItemTables.map(async (tableName) => {
      try {
        const existingItems = await api.workItems.getByRoom(roomId, tableName);
        if (existingItems && existingItems.length > 0) {
          const deleteResults = await Promise.all(existingItems.map(item =>
            api.workItems.delete(tableName, item.id)
              .catch(err => {
                console.error(`Failed to delete item ${item.id} from ${tableName}:`, err);
                return null;
              })
          ));
          // Log if any deletions failed
          const failedCount = deleteResults.filter(r => r === null).length;
          if (failedCount > 0) {
            console.warn(`[saveWorkItemsForRoom] ${failedCount}/${existingItems.length} deletions failed for ${tableName}`);
          }
        }
      } catch (error) {
        // Log fetch errors (not just silently swallow them)
        console.warn(`[saveWorkItemsForRoom] Error fetching items from ${tableName}:`, error.message);
      }
    });

    await Promise.all(deletePromises);

    // Save work items and track saved items with their doors/windows
    const savedParentItems = []; // Track saved items with their doors/windows

    await Promise.all(workItems.map(async (workItem) => {
      const tableName = getTableName(workItem.propertyId, workItem);
      if (!tableName) {
        console.warn(`No table mapping for propertyId: ${workItem.propertyId}`);
        return;
      }
      const dbRecord = workItemToDatabase(workItem, roomId, appData.activeContractorId);
      console.log(`[saveWorkItems] Saving to ${tableName}:`, dbRecord);
      if (dbRecord) {
        try {
          const result = await api.workItems.upsert(tableName, dbRecord);
          console.log(`[saveWorkItems] Saved to ${tableName}, result:`, result);
          // Track this item for door/window saving
          if (result && result.id) {
            savedParentItems.push({
              workItem,
              tableName,
              dbCId: result.c_id || result.id
            });
          }
        } catch (error) {
          console.error(`Error saving work item to ${tableName}:`, error);
          throw error;
        }
      } else {
        console.warn(`[saveWorkItems] No dbRecord for workItem:`, workItem);
      }
    }));

    // Save doors and windows for parent items that support them
    await Promise.all(savedParentItems.map(async ({ workItem, tableName, dbCId }) => {
      const doorWindowItems = workItem.doorWindowItems;
      if (!doorWindowItems) return;

      // Save doors
      if (tableCanHaveDoors(tableName) && doorWindowItems.doors && doorWindowItems.doors.length > 0) {
        await Promise.all(doorWindowItems.doors.map(async (door) => {
          try {
            const dbDoor = doorToDatabase(door);
            await api.doors.upsert(dbDoor, tableName, dbCId);
            console.log(`[saveWorkItems] Saved door to ${tableName}:`, dbDoor);
          } catch (error) {
            console.error(`Error saving door for ${tableName}:`, error);
          }
        }));
      }

      // Save windows
      if (tableCanHaveWindows(tableName) && doorWindowItems.windows && doorWindowItems.windows.length > 0) {
        await Promise.all(doorWindowItems.windows.map(async (window) => {
          try {
            const dbWindow = windowToDatabase(window);
            await api.windows.upsert(dbWindow, tableName, dbCId);
            console.log(`[saveWorkItems] Saved window to ${tableName}:`, dbWindow);
          } catch (error) {
            console.error(`Error saving window for ${tableName}:`, error);
          }
        }));
      }
    }));
  }, [appData.activeContractorId]);

  const updateProjectRoom = useCallback(async (projectId, roomId, roomData) => {
    try {
      console.log('[updateProjectRoom] Called with:', { projectId, roomId, workItemsCount: roomData.workItems?.length });
      if (!roomId) throw new Error('Room ID is required to update a room');

      const { workItems, ...otherData } = roomData;

      if (Object.keys(otherData).length > 0) {
        await api.rooms.update(roomId, otherData);
      }

      if (workItems) {
        console.log('[updateProjectRoom] Saving workItems:', workItems.length, 'items');
        await saveWorkItemsForRoom(roomId, workItems);
        console.log('[updateProjectRoom] workItems saved successfully');
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
  }, [setAppData, saveWorkItemsForRoom]);

  const deleteProjectRoom = useCallback(async (projectId, roomId) => {
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
  }, [setAppData]);

  const getProjectRooms = useCallback((projectId) => {
    const rooms = (projectRoomsData && projectRoomsData[projectId]) || [];
    return rooms;
  }, [projectRoomsData]);

  // === RECEIPT MANAGEMENT ===

  const getProjectReceipts = useCallback(async (projectId) => {
    try {
      const receipts = await api.receipts.getByProject(projectId);
      return receipts || [];
    } catch (error) {
      console.error('[SUPABASE] Error fetching receipts:', error);
      return [];
    }
  }, []);

  const addReceipt = useCallback(async (projectId, receiptData) => {
    try {
      // Ensure amount is always a number (iOS requires non-null Double)
      const amount = typeof receiptData.totalAmount === 'number' ? receiptData.totalAmount : 0;

      // Format items array to match iOS expectations (each item needs name, quantity, price as numbers)
      const formattedItems = (receiptData.items || []).map(item => ({
        name: item.name || '',
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        price: typeof item.price === 'number' ? item.price : 0
      }));

      const receipt = await api.receipts.create({
        project_id: projectId,
        image_url: receiptData.imageUrl,
        amount: amount,
        merchant_name: receiptData.vendorName || '',
        receipt_date: receiptData.date || new Date().toISOString().split('T')[0],
        items: formattedItems,
        raw_ocr_text: receiptData.rawText || ''
      });
      return receipt;
    } catch (error) {
      console.error('[SUPABASE] Error adding receipt:', error);
      throw error;
    }
  }, []);

  const deleteReceipt = useCallback(async (receiptId) => {
    try {
      await api.receipts.delete(receiptId);
    } catch (error) {
      console.error('[SUPABASE] Error deleting receipt:', error);
      throw error;
    }
  }, []);

  const analyzeReceiptImage = useCallback(async (imageBase64) => {
    try {
      // Use OpenAI GPT-4 Vision directly (same as iOS implementation)
      const result = await analyzeReceipt(imageBase64);
      return result;
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw error;
    }
  }, []);

  return {
    findProjectById,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    deleteArchivedProject,
    addProjectHistoryEntry,
    getProjectHistory,
    loadProjectDetails,
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    // Receipt functions
    getProjectReceipts,
    addReceipt,
    deleteReceipt,
    analyzeReceiptImage
  };
};
