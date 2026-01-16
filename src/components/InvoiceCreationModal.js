import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Save, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import UncompletedFieldsModal from './UncompletedFieldsModal';
import InvoiceItemBubble from './InvoiceItemBubble';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';
import { unitToDisplaySymbol } from '../services/workItemsMapping';
import { sortItemsByMasterList } from '../utils/itemSorting';

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
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PREPARATORY) return 'h';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WIRING) return 'ks';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) return 'ks';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) return 'km';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CORNER_BEAD) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_SASH) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SILICONING) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) return 'ks';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) return 'ks';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    return unitToDisplaySymbol(item.selectedUnit) || UNIT_TYPES.METER_SQUARE;
  }

  // Check based on fields to determine unit
  if (fields[WORK_ITEM_NAMES.DURATION_EN] || fields[WORK_ITEM_NAMES.DURATION_SK]) return 'h';
  if (fields[WORK_ITEM_NAMES.COUNT] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) return 'ks';
  if (fields[WORK_ITEM_NAMES.LENGTH] && !fields[WORK_ITEM_NAMES.WIDTH] && !fields[WORK_ITEM_NAMES.HEIGHT]) return 'm';
  if (fields[WORK_ITEM_NAMES.CIRCUMFERENCE]) return 'm';

  // Default to m² for area-based work
  return 'm²';
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
const InvoiceCreationModal = ({ isOpen, onClose, project, categoryId, editMode = false, existingInvoice = null }) => {
  const { t } = useLanguage();
  const { createInvoice, updateInvoice, contractors, activeContractorId, clients, calculateProjectTotalPriceWithBreakdown, invoices } = useAppData();

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Invoice settings state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentDays, setPaymentDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [showUncompletedModal, setShowUncompletedModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [showDuplicateNumberModal, setShowDuplicateNumberModal] = useState(false);

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Maturity quick-select options (matching iOS MaturityDuration)
  const maturityOptions = [7, 15, 30, 60, 90];

  // Get project breakdown with work items
  const projectBreakdown = useMemo(() => {
    if (!project) return null;
    return calculateProjectTotalPriceWithBreakdown(project.id);
  }, [project, calculateProjectTotalPriceWithBreakdown]);

  // Initialize invoice items from project breakdown
  useEffect(() => {
    if (isOpen && project && projectBreakdown) {
      if (editMode && existingInvoice?.invoiceItems) {
        // Load existing invoice items
        setInvoiceItems(existingInvoice.invoiceItems);
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
              title: item.name || item.subtitle || t('Work item'),
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
              title: item.name || item.subtitle || t('Material'),
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
              title: item.name || item.subtitle || t('Other'),
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
  }, [isOpen, project, projectBreakdown, editMode, existingInvoice, t]);

  // Initialize invoice settings
  useEffect(() => {
    if (isOpen && project) {
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
          setPaymentDays(diffDays > 0 ? diffDays : 30);
        } else {
          setPaymentDays(30);
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
        setPaymentMethod('transfer');
        setPaymentDays(30);
        setNotes('');
      }
    }
  }, [isOpen, project, editMode, existingInvoice, invoices, activeContractorId]);

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

  // Reset invoice number to original
  const handleResetNumber = () => {
    setInvoiceNumber(originalInvoiceNumber);
  };

  const checkRequiredFields = () => {
    const missing = [];
    const currentContractor = contractors.find(c => c.id === activeContractorId);
    // In edit mode, use existing invoice's clientId; otherwise use project's clientId
    const clientId = editMode && existingInvoice?.clientId ? existingInvoice.clientId : project.clientId;
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
      if (!(currentContractor.businessId || currentContractor.business_id)) missing.push(`${t('Contractor')}: ${t('Business ID')}`);
      if (!(currentContractor.taxId || currentContractor.tax_id)) missing.push(`${t('Contractor')}: ${t('Tax ID')}`);
      if (!(currentContractor.bankAccount || currentContractor.bank_account_number)) missing.push(`${t('Contractor')}: ${t('Bank account number')}`);
    } else {
      missing.push(t('No contractor selected'));
    }

    // Check all client fields
    if (currentClient) {
      if (!currentClient.name) missing.push(`${t('Client')}: ${t('Name')}`);
      if (!currentClient.email) missing.push(`${t('Client')}: ${t('Email')}`);
      if (!currentClient.phone) missing.push(`${t('Client')}: ${t('Phone')}`);
      if (!currentClient.street) missing.push(`${t('Client')}: ${t('Street')}`);
      if (!currentClient.city) missing.push(`${t('Client')}: ${t('City')}`);
      if (!(currentClient.postalCode || currentClient.postal_code)) missing.push(`${t('Client')}: ${t('Postal code')}`);
      if (!currentClient.country) missing.push(`${t('Client')}: ${t('Country')}`);
      if (currentClient.type === 'business') {
        if (!(currentClient.businessId || currentClient.business_id)) missing.push(`${t('Client')}: ${t('Business ID')}`);
        if (!(currentClient.taxId || currentClient.tax_id)) missing.push(`${t('Client')}: ${t('Tax ID')}`);
      }
    } else {
      missing.push(t('No client selected'));
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
      cumulativeVat: calculateTotals.cumulativeVat
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
        console.log('[DEBUG proceedWithGeneration] Update successful');
        onClose(true);
      } catch (error) {
        console.error('Error updating invoice:', error);
        alert(t('Failed to update invoice'));
      }
    } else {
      // Create new invoice
      try {
        const newInvoice = await createInvoice(project.id, categoryId, invoiceData);
        if (newInvoice) {
          onClose(newInvoice);
        }
      } catch (error) {
        console.error('Error creating invoice:', error);
        alert(t('Failed to create invoice'));
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

  if (!isOpen || !project) return null;

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
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl h-[85dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col animate-slide-in-bottom sm:animate-slide-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editMode ? t('Edit Invoice') : t('Invoice Builder')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {project?.number || ''}
                </p>
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
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {editMode ? <Save className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  {editMode ? t('Save Changes') : t('Generate Invoice')}
                </button>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Settings')}</h3>
              <div className="space-y-3">
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
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Date of issue')}</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-base focus:outline-none invoice-input-dark"
                  />
                </div>

                {/* Dispatch Date */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Date of dispatch')}</span>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-base focus:outline-none invoice-input-dark"
                  />
                </div>

                {/* Payment Type */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{t('Payment type')}</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={paymentMethod === 'cash'
                        ? (isDarkMode
                          ? { background: '#ffffff', color: '#111827', border: 'none', boxShadow: 'none' }
                          : { background: '#111827', color: '#ffffff', border: 'none', boxShadow: 'none' })
                        : (isDarkMode
                          ? { background: '#4b5563', color: '#ffffff' }
                          : { background: '#ffffff', color: '#4b5563' })
                      }
                    >
                      {t('Cash')}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('transfer')}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={paymentMethod === 'transfer'
                        ? (isDarkMode
                          ? { background: '#ffffff', color: '#111827', border: 'none', boxShadow: 'none' }
                          : { background: '#111827', color: '#ffffff', border: 'none', boxShadow: 'none' })
                        : (isDarkMode
                          ? { background: '#4b5563', color: '#ffffff' }
                          : { background: '#ffffff', color: '#4b5563' })
                      }
                    >
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
                          onClick={() => setPaymentDays(days)}
                          className="flex flex-col items-center justify-center py-3 rounded-xl transition-colors"
                          style={paymentDays === days
                            ? (isDarkMode
                              ? { background: '#ffffff', color: '#111827', border: 'none', boxShadow: 'none' }
                              : { background: '#111827', color: '#ffffff', border: 'none', boxShadow: 'none' })
                            : (isDarkMode
                              ? { background: '#4b5563', color: '#ffffff' }
                              : { background: '#f3f4f6', color: '#111827' })
                          }
                        >
                          <span className="text-lg font-semibold">{days}</span>
                          <span className="text-xs font-medium">{t('days')}</span>
                        </button>
                      ))}
                      {/* Custom input */}
                      <div
                        className="flex flex-col items-center justify-center py-3 px-2 rounded-xl"
                        style={!maturityOptions.includes(paymentDays)
                          ? (isDarkMode
                            ? { background: '#ffffff', color: '#111827', border: 'none', boxShadow: 'none' }
                            : { background: '#111827', color: '#ffffff', border: 'none', boxShadow: 'none' })
                          : (isDarkMode
                            ? { background: '#4b5563', color: '#ffffff' }
                            : { background: '#f3f4f6', color: '#111827' })
                        }
                      >
                        <input
                          type="number"
                          value={maturityOptions.includes(paymentDays) ? '' : paymentDays}
                          onChange={(e) => setPaymentDays(parseInt(e.target.value) || 0)}
                          placeholder="XY"
                          className={`w-full text-center text-lg font-semibold focus:outline-none rounded-lg placeholder-gray-500 ${!maturityOptions.includes(paymentDays) && !isDarkMode ? 'bg-white' : 'bg-transparent'}`}
                          style={{
                            color: !maturityOptions.includes(paymentDays)
                              ? (isDarkMode ? '#111827' : '#111827') // Active: Black text (on White input BG for light mode, or White container for dark mode? Wait. Dark mode active is White BG. So Black text is correct. Light mode active is Black Container -> White Input BG -> Black Text.)
                              : (isDarkMode ? '#ffffff' : '#111827') // Inactive
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: !maturityOptions.includes(paymentDays) ? (isDarkMode ? '#111827' : '#ffffff') : (isDarkMode ? '#ffffff' : '#111827') }}
                        >
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-900 dark:border-gray-500 rounded-xl text-gray-900 dark:text-white focus:outline-none resize-none"
                    placeholder={t('In case of non-payment of the invoice will automatically claim over to a collections company...')}
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Items')}</h3>

              {/* Work Items */}
              {workItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Work')}</h4>
                  <div className="space-y-2">
                    {workItems.map(item => (
                      <InvoiceItemBubble
                        key={item.id}
                        item={item}
                        onUpdate={handleItemUpdate}
                        category="work"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Material Items */}
              {materialItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Material')}</h4>
                  <div className="space-y-2">
                    {materialItems.map(item => (
                      <InvoiceItemBubble
                        key={item.id}
                        item={item}
                        onUpdate={handleItemUpdate}
                        category="material"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Items */}
              {otherItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{t('Other')}</h4>
                  <div className="space-y-2">
                    {otherItems.map(item => (
                      <InvoiceItemBubble
                        key={item.id}
                        item={item}
                        onUpdate={handleItemUpdate}
                        category="other"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {invoiceItems.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {t('No work items found')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <UncompletedFieldsModal
        isOpen={showUncompletedModal}
        onClose={() => setShowUncompletedModal(false)}
        onContinue={() => {
          setShowUncompletedModal(false);
          proceedWithGeneration();
        }}
        missingFields={missingFields}
      />

      {/* Duplicate Invoice Number Warning Modal */}
      {showDuplicateNumberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setShowDuplicateNumberModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('Duplicate Invoice Number')}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300">
              {t('Invoice number')} <span className="font-bold">{invoiceNumber}</span> {t('is already used by another invoice. Do you want to continue anyway?')}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDuplicateNumberModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleConfirmDuplicateNumber}
                className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition-colors"
              >
                {t('Continue Anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InvoiceCreationModal;
