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
  const createInvoice = useCallback(async (projectId, categoryId, invoiceData, findProjectById) => {
    try {
      // We pass findProjectById as a dependency because useProjectManager owns it
      const projectResult = findProjectById(projectId);
      const project = projectResult?.project;

      if (!project) return null;

      // Transform invoice items to iOS-compatible format
      const iosItems = transformItemsForIOS(invoiceData.invoiceItems);

      const mappedInvoiceData = {
        // Use user's invoice number if provided, otherwise use 0 for auto-assignment
        number: invoiceData.invoiceNumber ? parseInt(invoiceData.invoiceNumber) : 0,
        // Store date_created as YYYY-MM-DD string to avoid timezone conversion issues
        date_created: invoiceData.issueDate, // Already in YYYY-MM-DD format from the date picker
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

      console.log('[DEBUG] Creating invoice with data:', mappedInvoiceData);
      console.log('[DEBUG] date_created being sent:', mappedInvoiceData.date_created, 'issueDate from invoiceData:', invoiceData.issueDate);
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
          type: PROJECT_EVENTS.INVOICE_GENERATED, // iOS compatible: 'invoiceGenerated'
          invoiceNumber: transformedInvoice.invoiceNumber
        });
      }

      if (updateProject) {
        await updateProject(categoryId, projectId, {
          hasInvoice: true,
          invoiceId: transformedInvoice.id,
          invoiceStatus: INVOICE_STATUS.UNPAID // iOS compatible: 'unpaid'
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
      console.log('[DEBUG updateInvoice] Starting update for invoiceId:', invoiceId);
      console.log('[DEBUG updateInvoice] Updates received:', updates);

      const invoice = appData.invoices.find(inv => inv.id === invoiceId);
      console.log('[DEBUG updateInvoice] Found existing invoice:', invoice?.id, 'number:', invoice?.invoiceNumber);

      // Map app camelCase fields to DB snake_case fields
      const dbUpdates = {};

      if (updates.invoiceNumber !== undefined) dbUpdates.number = updates.invoiceNumber;
      if (updates.issueDate !== undefined) dbUpdates.date_created = updates.issueDate;
      if (updates.dispatchDate !== undefined) dbUpdates.date_of_dispatch = updates.dispatchDate;
      // Use iOS-compatible payment type (bankTransfer instead of transfer)
      if (updates.paymentMethod !== undefined) dbUpdates.payment_type = paymentMethodToIOS(updates.paymentMethod);
      if (updates.paymentDays !== undefined) dbUpdates.maturity_days = updates.paymentDays;
      if (updates.notes !== undefined) dbUpdates.note = updates.notes;
      // Convert iOS-compatible status to database status
      if (updates.status !== undefined) dbUpdates.status = invoiceStatusToDatabase(updates.status);
      // Invoice items data in iOS-compatible format
      if (updates.invoiceItems !== undefined) {
        const iosItems = transformItemsForIOS(updates.invoiceItems);
        dbUpdates.invoice_items_data = JSON.stringify(iosItems);
      }
      // Price data
      if (updates.priceWithoutVat !== undefined) dbUpdates.price_without_vat = updates.priceWithoutVat;
      if (updates.cumulativeVat !== undefined) dbUpdates.cumulative_vat = updates.cumulativeVat;

      console.log('[DEBUG updateInvoice] Mapped dbUpdates:', dbUpdates);

      // Only call API if there are mappable updates
      if (Object.keys(dbUpdates).length > 0) {
        console.log('[DEBUG updateInvoice] Calling api.invoices.update with id:', invoiceId);
        const result = await api.invoices.update(invoiceId, dbUpdates);
        console.log('[DEBUG updateInvoice] API result:', result);

        if (!result) {
          console.error('[DEBUG updateInvoice] API returned null - invoice may not exist in DB');
          throw new Error('Invoice not found in database');
        }
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

      if (invoice) {
        if (updateProject && updates.status) {
          // Only sync invoiceStatus with project - do NOT change project.status
          // iOS: marking invoice as paid only changes invoice.status, not project.status
          // Project status is only changed when SENDING the invoice (to FINISHED=3)
          await updateProject(invoice.categoryId, invoice.projectId, {
            invoiceStatus: updates.status
          });
        }

        // iOS does NOT add any history event when marking invoice as paid
        // The 'finished' event is added when SENDING the invoice, not when marking as paid
        // Note: iOS doesn't have an 'invoice_edited' event, so we skip history tracking here
      }
    } catch (error) {
      console.error('[SUPABASE] Error updating invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, updateProject]);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      console.log('[useInvoiceManager] Deleting invoice:', invoiceId);
      const invoice = appData.invoices.find(inv => inv.id === invoiceId);

      // Perform the actual deletion in DB first
      await api.invoices.delete(invoiceId);

      // Update local state immediately
      setAppData(prev => ({
        ...prev,
        invoices: prev.invoices.filter(inv => inv.id !== invoiceId)
      }));

      // Perform secondary cleanup tasks. Wrap in try-catch so they don't 
      // block the success of the main deletion if they fail.
      if (invoice) {
        try {
          if (updateProject) {
            console.log('[useInvoiceManager] Cleaning up project status for:', invoice.projectId);
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
          // Don't rethrow cleanup errors, the invoice IS deleted
        }
      }
    } catch (error) {
      console.error('[useInvoiceManager] Error deleting invoice:', error);
      throw error;
    }
  }, [appData.invoices, setAppData, addProjectHistoryEntry, updateProject]);

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
