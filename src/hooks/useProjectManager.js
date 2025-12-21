import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { databaseToWorkItem, getTableName, workItemToDatabase } from '../services/workItemsMapping';
import flatsImage from '../images/flats.jpg';
import housesImage from '../images/houses.webp';
import companiesImage from '../images/companies.jpg';
import cottagesImage from '../images/cottages.webp';

// Duplicated from AppDataContext
const getDefaultCategories = () => [
  { id: 'flats', name: 'Flats', count: 0, image: flatsImage, projects: [] },
  { id: 'houses', name: 'Houses', count: 0, image: housesImage, projects: [] },
  { id: 'companies', name: 'Companies', count: 0, image: companiesImage, projects: [] },
  { id: 'cottages', name: 'Cottages', count: 0, image: cottagesImage, projects: [] }
];

export const useProjectManager = (appData, setAppData) => {
  
  // Helper function to find project by ID across all categories
  const findProjectById = useCallback((projectId) => {
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

    // Fallback: search in global project categories
    for (const category of (appData.projectCategories || [])) {
      if (!category.projects) continue;
      const project = category.projects.find(p => p.id === projectId);
      if (project) {
        return { project, category: category.id };
      }
    }

    return null;
  }, [appData.activeContractorId, appData.contractorProjects, appData.projectCategories]);

  const addProject = useCallback(async (categoryId, projectData) => {
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
        price_list_id: null,
        price_list_snapshot: JSON.stringify(priceListSnapshot)
      });

      // Add the price list snapshot to the project object
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
  }, [appData.activeContractorId, appData.generalPriceList, setAppData]);

  const updateProject = useCallback(async (categoryId, projectId, projectData) => {
    try {
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
        // Handle project move if c_id changed
        if (projectData.c_id && prev.activeContractorId && projectData.c_id !== prev.activeContractorId) {
          let projectToMove = null;
          const oldContractorId = prev.activeContractorId;
          const newContractorId = projectData.c_id;

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
  }, [appData.activeContractorId, findProjectById, setAppData]);

  const unarchiveProject = useCallback(async (projectId) => {
    try {
      const archivedProject = appData.archivedProjects.find(p => p.id === projectId);
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
  }, [appData.archivedProjects, appData.contractorProjects, appData.projectCategories, setAppData]);

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
  const addProjectHistoryEntry = useCallback((projectId, historyEntry) => {
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
  }, [setAppData]);

  const getProjectHistory = useCallback((projectId) => {
    if (!appData.projectHistory || !projectId) return [];
    return appData.projectHistory[projectId] || [];
  }, [appData.projectHistory]);

  // Room Functions
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
  }, [setAppData]);

  const addRoomToProject = useCallback(async (projectId, roomData) => {
    try {
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
  }, [appData.activeContractorId, setAppData]);

  const saveWorkItemsForRoom = async (roomId, workItems) => {
    const tablesToUpdate = new Set();
    workItems.forEach(workItem => {
      const tableName = getTableName(workItem.propertyId);
      if (tableName) tablesToUpdate.add(tableName);
    });

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

    await Promise.all(deletePromises);

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

    await Promise.all(insertPromises);
  };

  const updateProjectRoom = useCallback(async (projectId, roomId, roomData) => {
    try {
      if (!roomId) throw new Error('Room ID is required to update a room');

      const { workItems, ...otherData } = roomData;

      if (Object.keys(otherData).length > 0) {
        await api.rooms.update(roomId, otherData);
      }

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
  }, [setAppData, appData.activeContractorId, saveWorkItemsForRoom]);

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
    const rooms = (appData.projectRoomsData && appData.projectRoomsData[projectId]) || [];
    return rooms;
  }, [appData.projectRoomsData]);

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
    getProjectRooms
  };
};
