import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformInvoiceFromDB } from '../utils/dataTransformers';

export const useInvoiceManager = (appData, setAppData) => {
  const createInvoice = useCallback(async (projectId, categoryId, invoiceData, findProjectById) => {
    try {
      // We pass findProjectById as a dependency because useProjectManager owns it
      const projectResult = findProjectById(projectId);
      const project = projectResult?.project;
      
      if (!project) return null;

      const mappedInvoiceData = {
        number: invoiceData.invoiceNumber,
        date_created: new Date(invoiceData.issueDate).toISOString(),
        date_of_dispatch: invoiceData.dispatchDate,
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

      const transformedInvoice = transformInvoiceFromDB(dbInvoice);
      // Ensure we set these fields which transform might miss if joins aren't perfect
      transformedInvoice.projectName = project.name;
      transformedInvoice.categoryId = categoryId;

      setAppData(prev => ({
        ...prev,
        invoices: [...prev.invoices, transformedInvoice],
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

      return transformedInvoice;
    } catch (error) {
      console.error('[SUPABASE] Error creating invoice:', error);
      throw error;
    }
  }, [appData.activeContractorId, setAppData]);

  const updateInvoice = useCallback(async (invoiceId, updates) => {
    try {
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

          const isEdit = updates.invoiceNumber || updates.issueDate || updates.paymentMethod || updates.notes || updates.dueDate || updates.paymentDays || updates.dispatchDate;
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
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData]);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);
      await api.invoices.delete(invoiceId);

      setAppData(prev => {
        const updatedState = {
          ...prev,
          invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
        };

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
    } catch (error) {
      console.error('[SUPABASE] Error deleting invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData]);

  const getInvoiceById = useCallback((invoiceId) => {
    return appData.invoices.find(inv => inv.id === invoiceId);
  }, [appData.invoices]);

  const getInvoicesForContractor = useCallback((contractorId) => {
    return appData.invoices.filter(inv => inv.contractorId === contractorId);
  }, [appData.invoices]);

  const getInvoiceForProject = useCallback((projectId) => {
    return appData.invoices.find(inv => inv.projectId === projectId);
  }, [appData.invoices]);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesForContractor,
    getInvoiceForProject
  };
};
