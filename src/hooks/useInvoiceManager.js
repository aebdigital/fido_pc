import { useCallback } from 'react';
import api from '../services/supabaseApi';
import { transformInvoiceFromDB, invoiceStatusToDatabase, INVOICE_STATUS, PROJECT_EVENTS } from '../utils/dataTransformers';

// Transform desktop invoice items to iOS-compatible format for sync
const transformItemsForIOS = (items) => {
  if (!items) return null;

  // Map display units to iOS enum values
  const displayToIOSUnit = {
    'm²': 'squareMeter',
    'm2': 'squareMeter',
    'm': 'meter',
    'ks': 'piece',
    'pc': 'piece',
    'h': 'hour',
    'km': 'kilometer',
    'kg': 'kilogram',
    'l': 'liter',
    'm³': 'cubicMeter',
    'm3': 'cubicMeter',
    'bm': 'runningMeter',
    '%': 'percentage',
    'percent': 'percentage',
    'percentage': 'percentage'
  };

  return items.map(item => ({
    id: item.id,
    // iOS uses 'titleKey' for the localized string key
    titleKey: item.title || '',
    pieces: item.pieces || 0,
    pricePerPiece: item.pricePerPiece || 0,
    price: item.price || 0,
    vat: item.vat || 23,
    // Convert display unit to iOS enum
    unit: displayToIOSUnit[item.unit] || item.unit || 'squareMeter',
    category: item.category || 'work',
    active: item.active !== false,
    taxObligationTransfer: item.taxObligationTransfer || false
  }));
};

// Map desktop payment method to iOS value
const paymentMethodToIOS = (method) => {
  // iOS uses 'bankTransfer', Desktop uses 'transfer'
  if (method === 'transfer') return 'bankTransfer';
  return method || 'bankTransfer';
};

export const useInvoiceManager = (appData, setAppData, addProjectHistoryEntry, updateProject) => {
  const getInvoiceById = useCallback((invoiceId) => {
    return appData.invoices.find(inv => inv.id === invoiceId);
  }, [appData.invoices]);

  const getInvoicesForContractor = useCallback((contractorId) => {
    return appData.invoices.filter(inv => inv.contractorId === contractorId);
  }, [appData.invoices]);

  const getInvoiceForProject = useCallback((projectId) => {
    return appData.invoices.find(inv => inv.projectId === projectId);
  }, [appData.invoices]);

  const getInvoiceSettings = useCallback(async (contractorId) => {
    try {
      return await api.invoiceSettings.get(contractorId);
    } catch (error) {
      console.error('[SUPABASE] Error getting invoice settings:', error);
      return null;
    }
  }, []);

  const upsertInvoiceSettings = useCallback(async (settings) => {
    try {
      return await api.invoiceSettings.upsert(settings);
    } catch (error) {
      console.error('[SUPABASE] Error upserting invoice settings:', error);
      throw error;
    }
  }, []);

  const createInvoice = useCallback(async (projectOrId, categoryId, invoiceData, findProjectById) => {
    try {
      let project = null;
      let projectId = null;

      if (typeof projectOrId === 'object' && projectOrId !== null) {
        project = projectOrId;
        projectId = project.c_id || project.id;
      } else {
        projectId = projectOrId;
        const projectResult = typeof findProjectById === 'function' ? findProjectById(projectId) : null;
        project = projectResult?.project;
      }

      if (!project) {
        console.error('[SUPABASE] createInvoice: Project not found', projectOrId);
        return null;
      }

      // Transform invoice items to iOS-compatible format
      const iosItems = transformItemsForIOS(invoiceData.invoiceItems);

      const mappedInvoiceData = {
        // Use user's invoice number if provided, otherwise use 0 for auto-assignment
        number: invoiceData.invoiceNumber ? parseInt(invoiceData.invoiceNumber) : 0,
        // Store date_created as YYYY-MM-DD string to avoid timezone conversion issues
        date_created: invoiceData.issueDate,
        date_of_dispatch: invoiceData.dispatchDate,
        // Use iOS-compatible payment type (bankTransfer instead of transfer)
        payment_type: paymentMethodToIOS(invoiceData.paymentMethod),
        maturity_days: invoiceData.paymentDays || 30,
        note: invoiceData.notes || null,
        project_id: projectId,
        // c_id will be auto-generated as UUID in supabaseApi.js
        client_id: project.clientId,
        contractor_id: appData.activeContractorId,
        status: 'unsent',
        // Invoice items data in iOS-compatible format
        invoice_items_data: iosItems ? JSON.stringify(iosItems) : null,
        // Price data
        price_without_vat: invoiceData.priceWithoutVat || 0,
        cumulative_vat: invoiceData.cumulativeVat || 0
      };

      const dbInvoice = await api.invoices.create(mappedInvoiceData);
      const transformedInvoice = transformInvoiceFromDB(dbInvoice);

      transformedInvoice.projectName = project.name;
      transformedInvoice.categoryId = categoryId;

      setAppData(prev => ({
        ...prev,
        invoices: [...prev.invoices, transformedInvoice]
      }));

      if (addProjectHistoryEntry) {
        await addProjectHistoryEntry(projectId, {
          type: PROJECT_EVENTS.INVOICE_GENERATED,
          invoiceNumber: transformedInvoice.invoiceNumber
        });
      }

      if (updateProject) {
        await updateProject(categoryId, projectId, {
          hasInvoice: true,
          invoiceId: transformedInvoice.id,
          invoiceStatus: INVOICE_STATUS.UNPAID
        });
      }

      return transformedInvoice;
    } catch (error) {
      console.error('[SUPABASE] Error creating invoice:', error);
      throw error;
    }
  }, [appData.activeContractorId, setAppData, addProjectHistoryEntry, updateProject]);

  const updateInvoice = useCallback(async (invoiceId, updates) => {
    try {
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);
      const dbUpdates = {};

      if (updates.invoiceNumber !== undefined) dbUpdates.number = updates.invoiceNumber;
      if (updates.issueDate !== undefined) dbUpdates.date_created = updates.issueDate;
      if (updates.dispatchDate !== undefined) dbUpdates.date_of_dispatch = updates.dispatchDate;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_type = paymentMethodToIOS(updates.paymentMethod);
      if (updates.paymentDays !== undefined) dbUpdates.maturity_days = updates.paymentDays;
      if (updates.notes !== undefined) dbUpdates.note = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = invoiceStatusToDatabase(updates.status);

      if (updates.invoiceItems !== undefined) {
        const iosItems = transformItemsForIOS(updates.invoiceItems);
        dbUpdates.invoice_items_data = JSON.stringify(iosItems);
      }

      if (updates.priceWithoutVat !== undefined) dbUpdates.price_without_vat = updates.priceWithoutVat;
      if (updates.cumulativeVat !== undefined) dbUpdates.cumulative_vat = updates.cumulativeVat;

      if (Object.keys(dbUpdates).length > 0) {
        await api.invoices.update(invoiceId, dbUpdates);
      }

      setAppData(prev => ({
        ...prev,
        invoices: prev.invoices.map(inv =>
          inv.id === invoiceId ? { ...inv, ...updates } : inv
        )
      }));

      if (invoice && updateProject && updates.status) {
        await updateProject(invoice.categoryId, invoice.projectId, {
          invoiceStatus: updates.status
        });
      }
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, updateProject]);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);
      await api.invoices.delete(invoiceId);

      setAppData(prev => ({
        ...prev,
        invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
      }));

      if (invoice) {
        try {
          if (updateProject) {
            await updateProject(invoice.categoryId || '', invoice.projectId, {
              hasInvoice: false,
              invoiceId: null,
              invoiceStatus: null
            });
          }

          if (addProjectHistoryEntry) {
            await addProjectHistoryEntry(invoice.projectId, {
              type: PROJECT_EVENTS.INVOICE_DELETED,
              invoiceNumber: invoice.invoiceNumber
            });
          }
        } catch (cleanupError) {
          console.warn('[useInvoiceManager] Cleanup after invoice deletion failed:', cleanupError);
        }
      }
    } catch (error) {
      console.error('[useInvoiceManager] Error deleting invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, addProjectHistoryEntry, updateProject]);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesForContractor,
    getInvoiceForProject,
    getInvoiceSettings,
    upsertInvoiceSettings
  };
};
