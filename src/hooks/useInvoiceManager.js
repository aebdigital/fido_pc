import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformInvoiceFromDB } from '../utils/dataTransformers';

export const useInvoiceManager = (appData, setAppData, addProjectHistoryEntry) => {
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
        invoices: [...prev.invoices, transformedInvoice]
      }));

      if (addProjectHistoryEntry) {
        await addProjectHistoryEntry(projectId, {
          type: 'invoice_created',
          invoiceNumber: transformedInvoice.invoiceNumber
        });
      }

      return transformedInvoice;
    } catch (error) {
      console.error('[SUPABASE] Error creating invoice:', error);
      throw error;
    }
  }, [appData.activeContractorId, setAppData, addProjectHistoryEntry]);

  const updateInvoice = useCallback(async (invoiceId, updates) => {
    try {
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);

      // Map app camelCase fields to DB snake_case fields
      const dbUpdates = {};
      
      if (updates.invoiceNumber !== undefined) dbUpdates.number = updates.invoiceNumber;
      if (updates.issueDate !== undefined) dbUpdates.date_created = updates.issueDate;
      if (updates.dispatchDate !== undefined) dbUpdates.date_of_dispatch = updates.dispatchDate;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_type = updates.paymentMethod;
      if (updates.paymentDays !== undefined) dbUpdates.maturity_days = updates.paymentDays;
      if (updates.notes !== undefined) dbUpdates.note = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      
      // Only call API if there are mappable updates
      if (Object.keys(dbUpdates).length > 0) {
        await api.invoices.update(invoiceId, dbUpdates);
      }

      setAppData(prev => {
        const updatedState = {
          ...prev,
          invoices: prev.invoices.map(inv =>
            inv.id === invoiceId ? { ...inv, ...updates } : inv
          )
        };
        return updatedState;
      });

      if (invoice && addProjectHistoryEntry) {
        const projectId = invoice.projectId;

        if (updates.status) {
          if (updates.status === 'sent') {
            await addProjectHistoryEntry(projectId, {
              type: 'invoice_sent',
              invoiceNumber: invoice.invoiceNumber
            });
          } else if (updates.status === 'paid') {
            await addProjectHistoryEntry(projectId, {
              type: 'invoice_paid',
              invoiceNumber: invoice.invoiceNumber
            });
          }
        }

        const isEdit = updates.invoiceNumber || updates.issueDate || updates.paymentMethod || updates.notes || updates.dueDate || updates.paymentDays || updates.dispatchDate;
        const hasNonStatusUpdates = Object.keys(updates).some(key => key !== 'status');

        if (hasNonStatusUpdates && isEdit) {
           await addProjectHistoryEntry(projectId, {
            type: 'invoice_edited',
            invoiceNumber: updates.invoiceNumber || invoice.invoiceNumber
          });
        }
      }
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, addProjectHistoryEntry]);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);
      await api.invoices.delete(invoiceId);

      setAppData(prev => {
        const updatedState = {
          ...prev,
          invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
        };
        return updatedState;
      });

      if (invoice && addProjectHistoryEntry) {
        await addProjectHistoryEntry(invoice.projectId, {
          type: 'invoice_deleted',
          invoiceNumber: invoice.invoiceNumber
        });
      }
    } catch (error) {
      console.error('[SUPABASE] Error deleting invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, addProjectHistoryEntry]);

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
