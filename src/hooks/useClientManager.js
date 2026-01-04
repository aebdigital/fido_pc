import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformClientToDB, transformClientFromDB } from '../utils/dataTransformers';

export const useClientManager = (appData, setAppData) => {
  const addClient = useCallback(async (clientData) => {
    try {
      const mappedData = {
        ...transformClientToDB(clientData),
        contractor_id: appData.activeContractorId, // Link to contractor
        is_user: false
        // c_id will be auto-generated in supabaseApi.js
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
  }, [appData.activeContractorId, setAppData]);

  const updateClient = useCallback(async (clientId, clientData) => {
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
  }, [setAppData]);

  const deleteClient = useCallback(async (clientId) => {
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
  }, [setAppData]);

  // Client-Project relationship functions
  const assignProjectToClient = useCallback((clientId, projectId, projectName) => {
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
  }, [setAppData]);

  const removeProjectFromClient = useCallback((clientId, projectId) => {
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
  }, [setAppData]);

  const findClientById = useCallback((clientId) => {
    return appData.clients.find(client => client.id === clientId);
  }, [appData.clients]);

  return {
    addClient,
    updateClient,
    deleteClient,
    assignProjectToClient,
    removeProjectFromClient,
    findClientById
  };
};
