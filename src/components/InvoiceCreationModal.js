import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Save, RotateCcw, Loader2, Plus, Trash2, User, Search, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import UncompletedFieldsModal from './UncompletedFieldsModal';
import InvoiceItemBubble from './InvoiceItemBubble';
import ClientForm from './ClientForm';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';
import { unitToDisplaySymbol } from '../services/workItemsMapping';
import { sortItemsByMasterList } from '../utils/itemSorting';
import { useScrollLock } from '../hooks/useScrollLock';

// Helper to determine work item unit based on propertyId and fields
const getWorkItemUnit = (item) => {
  // If already has unit in calculation, extract just the unit part
  if (item.calculation?.unit) {
    let unit = item.calculation.unit;
    if (unit.startsWith('€/')) unit = unit.substring(2);
    return unitToDisplaySymbol(unit);
  }
  if (item.unit) {
    let unit = item.unit;
    if (unit.startsWith('€/')) unit = unit.substring(2);
    return unitToDisplaySymbol(unit);
  }

  const propertyId = item.propertyId;
  const fields = item.fields || {};

  // Check based on propertyId
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PREPARATORY) return UNIT_TYPES.HOUR;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WIRING) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) return UNIT_TYPES.KM;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CORNER_BEAD) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_SASH) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SILICONING) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    return unitToDisplaySymbol(item.selectedUnit) || UNIT_TYPES.METER_SQUARE;
  }

  // Check based on fields to determine unit
  if (fields[WORK_ITEM_NAMES.DURATION_EN] || fields[WORK_ITEM_NAMES.DURATION_SK]) return UNIT_TYPES.HOUR;
  if (fields[WORK_ITEM_NAMES.COUNT] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) return UNIT_TYPES.PIECE;
  if (fields[WORK_ITEM_NAMES.LENGTH] && !fields[WORK_ITEM_NAMES.WIDTH] && !fields[WORK_ITEM_NAMES.HEIGHT]) return UNIT_TYPES.METER;
  if (fields[WORK_ITEM_NAMES.CIRCUMFERENCE]) return UNIT_TYPES.METER;

  // Default to m² for area-based work
  return UNIT_TYPES.METER_SQUARE;
};

// Helper to build CANONICAL display name for work items (English - for storage)
// Translation happens at display time in PDF generator, not at storage time
const getWorkItemDisplayName = (item, t) => {
  const itemName = item.name || '';

  // For electrical and plumbing work, just show the main name (no subtitle with outlet types)
  if (item.propertyId === WORK_ITEM_PROPERTY_IDS.WIRING ||
    item.propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) {
    return itemName;
  }

  // For plasterboarding items, build full name with subtitle and type (lowercase for translation keys)
  if (item.propertyId && item.propertyId.startsWith('plasterboarding_') && item.subtitle) {
    const shouldShowType = item.selectedType && item.propertyId !== 'plasterboarding_ceiling';
    if (shouldShowType) {
      return `${itemName}, ${item.subtitle}, ${(item.selectedType || '').toLowerCase()}`;
    }
    return `${itemName}, ${item.subtitle}`;
  }

  // For sanitary installation, show the type name
  if (item.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION && (item.selectedType || item.subtitle)) {
    return item.selectedType || item.subtitle;
  }

  // For plinth items, show name with subtitle
  if ((item.propertyId === 'plinth_cutting' || item.propertyId === 'plinth_bonding') && item.subtitle) {
    return `${itemName} - ${item.subtitle}`;
  }

  // For custom work, use the entered name or fallback
  if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';
    return item.fields?.[WORK_ITEM_NAMES.NAME] || fallbackName;
  }

  // For Large Format items, the name already includes "Large Format" - don't append subtitle
  if (item.isLargeFormat) {
    return itemName;
  }

  // For items with subtitle (like wall/ceiling distinction)
  if (item.subtitle) {
    return `${itemName}, ${item.subtitle}`;
  }

  // Default: just return the canonical English name
  return itemName || 'Work item';
};

// Helper to build CANONICAL display name for material items (English - for storage)
// Translation happens at display time in PDF generator, not at storage time
const getMaterialItemDisplayName = (item, t) => {
  // For custom materials
  if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';
    return item.fields?.[WORK_ITEM_NAMES.NAME] || fallbackName;
  }

  // For materials with subtitle
  if (item.subtitle) {
    return `${item.name || ''}, ${item.subtitle}`;
  }

  return item.name || 'Material';
};

/**
 * InvoiceCreationModal - iOS-aligned invoice builder
 *
 * Structure (matching iOS InvoiceBuilderView):
 * 1. Header with title and close button
 * 2. Summary section (price breakdown + Generate button) - at top like iOS
 * 3. Settings section (number, dates, payment, maturity, notes)
 * 4. Items section grouped by category (Work, Material, Other)
 */
// Maturity quick-select options (matching iOS MaturityDuration)
const maturityOptions = [7, 15, 30, 60, 90];

const InvoiceCreationModal = ({ isOpen, onClose, project, categoryId, editMode = false, existingInvoice = null, dennikData = null }) => {
  useScrollLock(true);
  const { t } = useLanguage();
  const { createInvoice, updateInvoice, contractors, activeContractorId, clients, calculateProjectTotalPriceWithBreakdown, invoices, getInvoiceSettings, upsertInvoiceSettings, findProjectById, addClient } = useAppData();

  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showCreateClientInModal, setShowCreateClientInModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Invoice settings state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentDays, setPaymentDays] = useState(30);
  const [customInputValue, setCustomInputValue] = useState(''); // Text state for custom input to allow typing "0" freely
  const [notes, setNotes] = useState('');
  const [persistentSettings, setPersistentSettings] = useState(null);
  const [showUncompletedModal, setShowUncompletedModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [showDuplicateNumberModal, setShowDuplicateNumberModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Get project breakdown with work items
  const projectBreakdown = useMemo(() => {
    if (!project) return null;
    return calculateProjectTotalPriceWithBreakdown(project.id);
  }, [project, calculateProjectTotalPriceWithBreakdown]);

  // Fetch invoice settings (Account-wide)
  useEffect(() => {
    const fetchSettings = async () => {
      if (isOpen) {
        try {
          const settings = await getInvoiceSettings();
          if (settings) {
            setPersistentSettings(settings);
          }
        } catch (error) {
          console.error('Error fetching invoice settings:', error);
        }
      }
    };
    fetchSettings();
  }, [isOpen, getInvoiceSettings]);

  // Initialize invoice items from project breakdown or dennikData
  useEffect(() => {
    if (isOpen && !project && !dennikData) {
      // Standalone mode: start with empty items
      if (!editMode) setInvoiceItems([]);
      return;
    }
    if (isOpen && project && dennikData) {
      // Denník mode: use pre-built items
      setInvoiceItems(dennikData.items || []);
      return;
    }
    if (isOpen && project && projectBreakdown) {
      if (editMode && existingInvoice?.invoiceItems) {
        // Load existing invoice items
        setInvoiceItems(existingInvoice.invoiceItems.map(item => ({
          ...item,
          unit: unitToDisplaySymbol(item.unit)
        })));
      } else {
        // Create invoice items from project breakdown
        const items = [];

        // Process work items
        if (projectBreakdown.items) {
          const sortedWorkItems = sortItemsByMasterList(projectBreakdown.items, project.priceListSnapshot, 'work');
          sortedWorkItems.forEach((item, index) => {
            const calculation = item.calculation || {};
            // Use helper to determine correct unit based on propertyId and fields
            const unit = getWorkItemUnit(item);
            items.push({
              id: crypto.randomUUID(), // Use proper UUID for iOS compatibility
              title: getWorkItemDisplayName(item, t),
              pieces: calculation.quantity || 0,
              pricePerPiece: calculation.quantity > 0 ? (calculation.workCost || 0) / calculation.quantity : 0,
              price: calculation.workCost || 0,
              vat: 23, // Default VAT
              unit: unit,
              category: 'work',
              active: true,
              taxObligationTransfer: false,
              originalItem: item
            });
          });
        }

        // Process material items
        if (projectBreakdown.materialItems) {
          const sortedMaterialItems = sortItemsByMasterList(projectBreakdown.materialItems, project.priceListSnapshot, 'material');
          sortedMaterialItems.forEach((item, index) => {
            const calculation = item.calculation || {};
            // Material items use their calculation unit or default to 'ks'
            const materialUnit = calculation.unit ? unitToDisplaySymbol(calculation.unit) : 'ks';
            items.push({
              id: crypto.randomUUID(), // Use proper UUID for iOS compatibility
              title: getMaterialItemDisplayName(item, t),
              pieces: calculation.quantity || 0,
              pricePerPiece: calculation.pricePerUnit || (calculation.quantity > 0 ? (calculation.materialCost || 0) / calculation.quantity : 0),
              price: calculation.materialCost || 0,
              vat: 23, // Default VAT
              unit: materialUnit,
              category: 'material',
              active: true,
              taxObligationTransfer: false,
              originalItem: item
            });
          });
        }

        // Process others items
        if (projectBreakdown.othersItems) {
          const sortedOthersItems = sortItemsByMasterList(projectBreakdown.othersItems, project.priceListSnapshot, 'others');
          sortedOthersItems.forEach((item, index) => {
            const calculation = item.calculation || {};
            // Use helper to determine correct unit for others items
            const otherUnit = getWorkItemUnit(item);
            items.push({
              id: crypto.randomUUID(), // Use proper UUID for iOS compatibility
              title: getWorkItemDisplayName(item, t),
              pieces: calculation.quantity || 0,
              pricePerPiece: calculation.quantity > 0 ? (calculation.workCost || 0) / calculation.quantity : 0,
              price: calculation.workCost || 0,
              vat: 23, // Default VAT
              unit: otherUnit,
              category: 'other',
              active: true,
              taxObligationTransfer: false,
              originalItem: item
            });
          });
        }

        setInvoiceItems(items);
      }
    }
  }, [isOpen, project, projectBreakdown, editMode, existingInvoice, t, dennikData]);

  // Initialize invoice settings
  useEffect(() => {
    if (isOpen) {
      if (editMode && existingInvoice) {
        // Populate with existing invoice data
        setInvoiceNumber(existingInvoice.invoiceNumber || '');
        setOriginalInvoiceNumber(existingInvoice.invoiceNumber || '');
        setIssueDate(existingInvoice.issueDate ? existingInvoice.issueDate.split('T')[0] : '');
        setDispatchDate(existingInvoice.dispatchDate ? existingInvoice.dispatchDate.split('T')[0] : (existingInvoice.issueDate ? existingInvoice.issueDate.split('T')[0] : ''));
        setPaymentMethod(existingInvoice.paymentMethod || 'transfer');
        // Calculate payment days from issue and due dates
        if (existingInvoice.issueDate && existingInvoice.dueDate) {
          const issue = new Date(existingInvoice.issueDate);
          const due = new Date(existingInvoice.dueDate);
          const diffDays = Math.round((due - issue) / (1000 * 60 * 60 * 24));
          const days = diffDays > 0 ? diffDays : 30;
          setPaymentDays(days);
          // If days is not one of the presets, set it as custom value
          if (!maturityOptions.includes(days)) {
            setCustomInputValue(String(days));
          } else {
            setCustomInputValue('');
          }
        } else {
          setPaymentDays(30);
          setCustomInputValue('');
        }
        setNotes(existingInvoice.notes || '');
      } else {
        // Create mode - generate new invoice number
        const currentYear = new Date().getFullYear();
        const yearPrefix = parseInt(`${currentYear}000`);
        const yearMax = parseInt(`${currentYear}999`);

        // Filter invoices for the current contractor and current year
        const contractorInvoices = (invoices || []).filter(inv => inv.contractorId === activeContractorId);
        const currentYearInvoices = contractorInvoices.filter(inv => {
          const num = parseInt(inv.invoiceNumber || 0);
          return num >= yearPrefix && num <= yearMax;
        });

        // Determine next number
        let nextNumber;
        if (currentYearInvoices.length === 0) {
          nextNumber = parseInt(`${currentYear}001`);
        } else {
          const maxNumber = Math.max(...currentYearInvoices.map(inv => parseInt(inv.invoiceNumber || 0)));
          nextNumber = maxNumber + 1;
        }

        const numberStr = String(nextNumber);
        setInvoiceNumber(numberStr);
        setOriginalInvoiceNumber(numberStr);

        // Set default dates
        const today = new Date();
        const issueDateStr = today.toISOString().split('T')[0];
        setIssueDate(issueDateStr);
        setDispatchDate(issueDateStr);
        setIssueDate(issueDateStr);
        setDispatchDate(issueDateStr);
        setPaymentMethod('transfer');
        setPaymentDays(30);
        setCustomInputValue('');

        // Use persistent note if available, otherwise use default translation
        if (persistentSettings?.note !== undefined && persistentSettings?.note !== null) {
          setNotes(persistentSettings.note);
        } else {
          setNotes(t('Default Invoice Note'));
        }
      }

      // Initialize selected client
      if (editMode && existingInvoice?.clientId) {
        setSelectedClientId(existingInvoice.clientId);
      } else if (project?.clientId) {
        setSelectedClientId(project.clientId);
      } else {
        setSelectedClientId(null);
      }
    }
  }, [isOpen, project, editMode, existingInvoice, invoices, activeContractorId, t, persistentSettings, dennikData]);

  // Calculate totals from invoice items
  const calculateTotals = useMemo(() => {
    const activeItems = invoiceItems.filter(item => item.active);

    let priceWithoutVat = 0;
    let cumulativeVat = 0;

    activeItems.forEach(item => {
      priceWithoutVat += item.price || 0;
      if (!item.taxObligationTransfer) {
        cumulativeVat += (item.price || 0) * ((item.vat || 0) / 100);
      }
    });

    return {
      priceWithoutVat,
      cumulativeVat,
      totalPrice: priceWithoutVat + cumulativeVat
    };
  }, [invoiceItems]);

  // Handle item update
  const handleItemUpdate = (itemId, updatedItem) => {
    setInvoiceItems(prev =>
      prev.map(item => item.id === itemId ? updatedItem : item)
    );
  };

  // Add a new manual item
  const handleAddItem = (category = 'work') => {
    const newItem = {
      id: crypto.randomUUID(),
      title: '',
      pieces: 1,
      pricePerPiece: 0,
      price: 0,
      vat: 23,
      unit: category === 'material' ? 'ks' : 'h',
      category,
      active: true,
      taxObligationTransfer: false,
      isNew: true
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  // Remove an item
  const handleRemoveItem = (itemId) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Client Selection Handlers
  const handleClientSelect = (client) => {
    setSelectedClientId(client.id);
    setShowClientSelector(false);
    setClientSearchQuery('');
  };

  const handleCreateClientInModal = async (clientData) => {
    try {
      const newClient = await addClient(clientData);
      if (newClient) {
        handleClientSelect(newClient);
        setShowCreateClientInModal(false);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert(t('Failed to create client'));
    }
  };

  // Reset invoice number to original
  const handleResetNumber = () => {
    setInvoiceNumber(originalInvoiceNumber);
  };

  const checkRequiredFields = () => {
    const missing = [];
    const currentContractor = contractors.find(c => c.id === activeContractorId);
    // Use the component's selectedClientId state
    const clientId = selectedClientId;
    const currentClient = clients.find(c => c.id === clientId);

    // Check all contractor fields
    if (currentContractor) {
      if (!currentContractor.name) missing.push(`${t('Contractor')}: ${t('Name')}`);
      if (!currentContractor.email) missing.push(`${t('Contractor')}: ${t('Email')}`);
      if (!currentContractor.phone) missing.push(`${t('Contractor')}: ${t('Phone')}`);
      if (!currentContractor.street) missing.push(`${t('Contractor')}: ${t('Street')}`);
      if (!currentContractor.city) missing.push(`${t('Contractor')}: ${t('City')}`);
      if (!(currentContractor.postalCode || currentContractor.postal_code)) missing.push(`${t('Contractor')}: ${t('Postal code')}`);
      if (!currentContractor.country) missing.push(`${t('Contractor')}: ${t('Country')}`);
      if (!(currentContractor.businessId || currentContractor.business_id)) missing.push(`${t('Contractor')}: ${t('BID')}`);
      if (!(currentContractor.taxId || currentContractor.tax_id)) missing.push(`${t('Contractor')}: ${t('TID')}`);
      if (!(currentContractor.bankAccount || currentContractor.bank_account_number)) missing.push(`${t('Contractor')}: ${t('Bank account number')}`);
    } else {
      missing.push(t('No contractor selected'));
    }

    // Check all client fields (skip for Denník invoices and standalone invoices)
    if (!dennikData && !isStandalone) {
      if (currentClient) {
        if (!currentClient.name) missing.push(`${t('Client')}: ${t('Name')}`);
        if (!currentClient.email) missing.push(`${t('Client')}: ${t('Email')}`);
        if (!currentClient.phone) missing.push(`${t('Client')}: ${t('Phone')}`);
        if (!currentClient.street) missing.push(`${t('Client')}: ${t('Street')}`);
        if (!currentClient.city) missing.push(`${t('Client')}: ${t('City')}`);
        if (!(currentClient.postalCode || currentClient.postal_code)) missing.push(`${t('Client')}: ${t('Postal code')}`);
        if (!currentClient.country) missing.push(`${t('Client')}: ${t('Country')}`);
        if (currentClient.type === 'business') {
          if (!(currentClient.businessId || currentClient.business_id)) missing.push(`${t('Client')}: ${t('BID')}`);
          if (!(currentClient.taxId || currentClient.tax_id)) missing.push(`${t('Client')}: ${t('TID')}`);
        }
      } else {
        missing.push(t('No client selected'));
      }
    }

    // Check invoice items
    const activeItems = invoiceItems.filter(item => item.active);
    if (activeItems.length === 0) {
      missing.push(t('No invoice items'));
    }
    if (calculateTotals.priceWithoutVat <= 0) {
      missing.push(t('Total price must be greater than 0'));
    }

    return missing;
  };

  const proceedWithGeneration = async () => {
    const invoiceData = {
      invoiceNumber,
      issueDate,
      dispatchDate,
      paymentMethod,
      paymentDays,
      notes,
      // Save ALL items (including inactive ones) so they can be re-enabled later
      // iOS keeps excluded items in the invoice, just marks them as inactive
      invoiceItems: invoiceItems,
      priceWithoutVat: calculateTotals.priceWithoutVat,
      cumulativeVat: calculateTotals.cumulativeVat,
      clientId: selectedClientId // Use selected client
    };

    console.log('[DEBUG proceedWithGeneration] editMode:', editMode, 'existingInvoice:', existingInvoice?.id);

    if (editMode && existingInvoice) {
      // Update existing invoice
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentDays);

      console.log('[DEBUG proceedWithGeneration] Calling updateInvoice with id:', existingInvoice.id);
      console.log('[DEBUG proceedWithGeneration] Invoice data:', invoiceData);

      try {
        await updateInvoice(existingInvoice.id, {
          ...invoiceData,
          dueDate: dueDate.toISOString().split('T')[0]
        });

        // Save note as default for future invoices (Account-wide)
        const settingsToSave = {
          ...persistentSettings,
          contractor_id: null,
          note: notes
        };

        await upsertInvoiceSettings(settingsToSave);

        console.log('[DEBUG proceedWithGeneration] Update successful');
        onClose(true);
      } catch (error) {
        console.error('Error updating invoice:', error);
        alert(t('Failed to update invoice'));
      }
    } else {
      // Create new invoice
      try {
        setIsSubmitting(true);
        const options = {};

        // For Denník invoices, override client_id and pass owner contractor
        if (dennikData) {
          invoiceData.clientId = null;
          invoiceData.ownerContractorId = dennikData.ownerContractorId || null;
          // IMPORTANT: Do NOT update the main project status/invoiceId when creating a Dennik (hours) invoice
          options.skipProjectUpdate = true;
        }

        // For standalone invoices, pass null project and skip project update
        if (isStandalone) {
          options.skipProjectUpdate = true;
        }
        const newInvoice = await createInvoice(isStandalone ? null : project, categoryId, invoiceData, findProjectById, options);
        if (newInvoice) {
          // Save note as default for future invoices (Account-wide)
          const settingsToSave = {
            ...persistentSettings,
            contractor_id: null,
            note: notes
          };

          await upsertInvoiceSettings(settingsToSave);

          onClose(newInvoice);
        }
      } catch (error) {
        console.error('Error creating invoice:', error);
        alert(t('Failed to create invoice'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Check if invoice number is already used by another invoice
  const isInvoiceNumberDuplicate = () => {
    const numToCheck = parseInt(invoiceNumber);
    if (isNaN(numToCheck)) return false;

    // Find any existing invoice with the same number AND same contractor
    const duplicate = invoices.find(inv => {
      // Must be same contractor
      if (inv.contractorId !== activeContractorId) {
        return false;
      }

      // Skip the current invoice if editing
      if (editMode && existingInvoice && inv.id === existingInvoice.id) {
        return false;
      }
      const invNum = parseInt(inv.invoiceNumber || inv.number || 0);
      return invNum === numToCheck;
    });

    return duplicate !== undefined;
  };

  const handleGenerate = () => {
    if (!invoiceNumber || !issueDate || !dispatchDate) {
      alert(t('Please fill in all required fields'));
      return;
    }

    // Check for duplicate invoice number first
    if (isInvoiceNumberDuplicate()) {
      setShowDuplicateNumberModal(true);
      return;
    }

    const missing = checkRequiredFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowUncompletedModal(true);
    } else {
      proceedWithGeneration();
    }
  };

  // Called when user confirms they want to use duplicate number
  const handleConfirmDuplicateNumber = () => {
    setShowDuplicateNumberModal(false);

    const missing = checkRequiredFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowUncompletedModal(true);
    } else {
      proceedWithGeneration();
    }
  };

  const isStandalone = !project;
  if (!isOpen) return null;

  // Group items by category
  const workItems = invoiceItems.filter(item => item.category === 'work');
  const materialItems = invoiceItems.filter(item => item.category === 'material');
  const otherItems = invoiceItems.filter(item => item.category === 'other');

  // Calculate maturity date
  const getMaturityDate = () => {
    if (!issueDate) return '-';
    const d = new Date(issueDate);
    d.setDate(d.getDate() + parseInt(paymentDays || 0));
    return d.toLocaleDateString('sk-SK');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-hidden animate-fade-in" onClick={() => onClose()}>
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col animate-slide-in-bottom sm:animate-slide-in my-0 sm:my-auto" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editMode ? t('Edit Invoice') : t('Invoice Builder')}
                </h2>

              </div>
            </div>
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary Section - At top like iOS */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Summary')}</h3>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{t('without VAT')}</span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {calculateTotals.priceWithoutVat.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{t('VAT')}</span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {calculateTotals.cumulativeVat.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{t('Total Price')}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {calculateTotals.totalPrice.toFixed(2)} €
                  </span>
                </div>

                {/* Generate Invoice Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isSubmitting}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('Processing...')}
                    </>
                  ) : (
                    <>
                      {editMode ? <Save className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      {editMode ? t('Save Changes') : t('Generate Invoice')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Settings')}</h3>
              <div className="space-y-3">
                {/* Client / Recipient selection */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-900 dark:text-white">{t('Client')}</span>
                  </div>

                  {selectedClientId ? (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm animate-fade-in">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {clients.find(c => c.id === selectedClientId)?.name || t('Unknown Client')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {clients.find(c => c.id === selectedClientId)?.email || ''}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClientSelector(true)}
                      className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{t('No client selected')}</span>
                    </button>
                  )}
                </div>

                {/* Invoice Number */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Invoice Number')}</span>
                  <div className="flex items-center gap-2">
                    {invoiceNumber !== originalInvoiceNumber && (
                      <button
                        onClick={handleResetNumber}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        title={t('Reset to original')}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-32 px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-900 dark:border-gray-500 rounded-xl text-right text-base font-medium focus:outline-none invoice-input-dark"
                      placeholder="2025001"
                    />
                  </div>
                </div>

                {/* Issue Date */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Date of issue')}</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-base focus:outline-none invoice-input-dark"
                  />
                </div>

                {/* Dispatch Date */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Date of dispatch')}</span>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-base focus:outline-none invoice-input-dark"
                  />
                </div>

                {/* Payment Type */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Payment type')}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`px-4 py-2 text-sm font-medium transition-all rounded-xl flex items-center gap-2 ${paymentMethod === 'cash'
                        ? 'bg-gray-900 dark:bg-gray-700 text-white dark:text-white shadow-md transform scale-[1.02] border border-transparent dark:border-gray-600'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${paymentMethod === 'cash' ? 'bg-blue-400' : 'bg-transparent'}`} />
                      {t('Cash')}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('transfer')}
                      className={`px-4 py-2 text-sm font-medium transition-all rounded-xl flex items-center gap-2 ${paymentMethod === 'transfer'
                        ? 'bg-gray-900 dark:bg-gray-700 text-white dark:text-white shadow-md transform scale-[1.02] border border-transparent dark:border-gray-600'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${paymentMethod === 'transfer' ? 'bg-blue-400' : 'bg-transparent'}`} />
                      {t('Bank transfer')}
                    </button>
                  </div>
                </div>

                {/* Invoice Maturity - Grid like iOS */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-4">
                  <span className="text-base font-medium text-gray-900 dark:text-white block mb-3">{t('Invoice maturity')}</span>
                  <div className="bg-white dark:bg-gray-700 rounded-2xl p-3">
                    <div className="grid grid-cols-6 gap-2">
                      {maturityOptions.map(days => (
                        <button
                          key={days}
                          onClick={() => {
                            setPaymentDays(days);
                            setCustomInputValue(''); // Clear custom input when preset is selected
                          }}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${paymentDays === days && customInputValue === ''
                            ? 'bg-gray-900 dark:bg-gray-600 text-white dark:text-white shadow-md transform scale-[1.02]'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mb-1 ${paymentDays === days && customInputValue === '' ? 'bg-blue-400' : 'bg-transparent'}`} />
                          <span className="text-lg font-semibold leading-none">{days}</span>
                          <span className="text-[10px] font-medium opacity-80">{t('days')}</span>
                        </button>
                      ))}
                      {/* Custom input */}
                      <div
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative ${!maturityOptions.includes(paymentDays) || customInputValue !== ''
                          ? 'bg-gray-900 dark:bg-gray-600 text-white dark:text-white shadow-md transform scale-[1.02]'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-300'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mb-1 ${!maturityOptions.includes(paymentDays) || customInputValue !== '' ? 'bg-blue-400' : 'bg-transparent'}`} />
                        <input
                          id="custom-maturity-input"
                          type="number"
                          value={customInputValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomInputValue(val);
                            // Only update paymentDays if val is valid
                            const num = parseInt(val);
                            if (!isNaN(num)) {
                              setPaymentDays(num);
                            } else if (val === '') {
                              // Optional: decide if paymentDays should be 0 or keep last valid?
                              // For valid date calculation, 0 is safer fallback
                              setPaymentDays(0);
                            }
                          }}
                          placeholder="XY"
                          className={`w-full text-center text-lg font-semibold focus:outline-none bg-transparent ${!maturityOptions.includes(paymentDays) || customInputValue !== ''
                            ? 'text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400'
                            : 'text-gray-900 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-500'
                            }`}
                        />
                        <span className={`text-[10px] font-medium leading-none ${!maturityOptions.includes(paymentDays) || customInputValue !== '' ? 'opacity-80' : 'opacity-60'
                          }`}>
                          {t('days')}
                        </span>
                      </div>

                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {t('Maturity')}: {getMaturityDate()}
                  </p>
                </div>

                {/* Notes */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-4">
                  <span className="text-base font-medium text-gray-900 dark:text-white block mb-2">{t('Note')}</span>
                  <textarea
                    id="invoice-note"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-900 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Items')}</h3>

              {/* Work Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Work')}</h4>
                  <button
                    onClick={() => handleAddItem('work')}
                    className="p-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    title={t('Add work item')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {workItems.length > 0 && (
                  <div className="space-y-2">
                    {workItems.map(item => (
                      <div key={item.id} className="relative group/item">
                        <InvoiceItemBubble
                          item={item}
                          onUpdate={handleItemUpdate}
                          category="work"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/item:opacity-100 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
                          title={t('Remove')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Material Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Material')}</h4>
                  <button
                    onClick={() => handleAddItem('material')}
                    className="p-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    title={t('Add material item')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {materialItems.length > 0 && (
                  <div className="space-y-2">
                    {materialItems.map(item => (
                      <div key={item.id} className="relative group/item">
                        <InvoiceItemBubble
                          item={item}
                          onUpdate={handleItemUpdate}
                          category="material"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/item:opacity-100 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
                          title={t('Remove')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Other')}</h4>
                  <button
                    onClick={() => handleAddItem('other')}
                    className="p-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    title={t('Add other item')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {otherItems.length > 0 && (
                  <div className="space-y-2">
                    {otherItems.map(item => (
                      <div key={item.id} className="relative group/item">
                        <InvoiceItemBubble
                          item={item}
                          onUpdate={handleItemUpdate}
                          category="other"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -right-2 -top-2 opacity-0 group-hover/item:opacity-100 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
                          title={t('Remove')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div >

      {/* Uncompleted Fields Modal */}
      {showUncompletedModal && (
        <UncompletedFieldsModal
          isOpen={showUncompletedModal}
          onClose={() => setShowUncompletedModal(false)}
          missingFields={missingFields}
          onProceed={proceedWithGeneration}
        />
      )}

      {/* Duplicate Number Modal */}
      {showDuplicateNumberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4" onClick={() => setShowDuplicateNumberModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('Duplicate Number')}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {t('This invoice number is already used for another invoice from this contractor. Do you want to use it anyway?')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateNumberModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleConfirmDuplicateNumber}
                className="flex-1 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                {t('Use anyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Selection Modal */}
      {showClientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => {
          if (showCreateClientInModal) {
            setShowCreateClientInModal(false);
          } else {
            setShowClientSelector(false);
            setClientSearchQuery('');
          }
        }}>
          <div className={`bg-white dark:bg-gray-900 rounded-3xl p-6 w-full ${showCreateClientInModal ? 'max-w-4xl h-[85vh]' : 'max-w-md'} max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 animate-scale-in`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {showCreateClientInModal ? t('New client') : t('Select Client')}
              </h3>
              <button
                onClick={() => {
                  if (showCreateClientInModal) setShowCreateClientInModal(false);
                  else setShowClientSelector(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {showCreateClientInModal ? (
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <ClientForm
                  onSave={handleCreateClientInModal}
                  onCancel={() => setShowCreateClientInModal(false)}
                />
              </div>
            ) : (
              <>
                {/* Search bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    autoFocus
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder={t('Search Clients...')}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border-none text-lg"
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar mb-6">
                  {clients
                    .filter(client =>
                      !clientSearchQuery ||
                      client.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                      client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())
                    )
                    .map(client => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={`w-full bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-4 text-left transition-all border-2 ${selectedClientId === client.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent'}`}
                      >
                        <div className="font-bold text-gray-900 dark:text-white text-lg">{client.name}</div>
                        {client.email && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-gray-400" />
                            {client.email}
                          </div>
                        )}
                      </button>
                    ))}

                  {clients.filter(client =>
                    !clientSearchQuery ||
                    client.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                    client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())
                  ).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {t('No clients found')}
                      </div>
                    )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowCreateClientInModal(true)}
                    className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg active:scale-[0.98]"
                  >
                    <Plus className="w-5 h-5" />
                    {t('Add Client')}
                  </button>

                  <button
                    onClick={() => { setShowClientSelector(false); setClientSearchQuery(''); }}
                    className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold transition-colors"
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InvoiceCreationModal;
