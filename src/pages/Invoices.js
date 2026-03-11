import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Hash, Package, MoreVertical, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { INVOICE_STATUS } from '../utils/dataTransformers';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import ItemsManagementModal from '../components/ItemsManagementModal';
import ContractorProfileModal from '../components/ContractorProfileModal';

const normalizeInvoiceStatus = (status) => {
  if (status === 'unsent') return INVOICE_STATUS.UNPAID;
  if (status === 'overdue') return INVOICE_STATUS.AFTER_MATURITY;

  if (
    status === INVOICE_STATUS.PAID ||
    status === INVOICE_STATUS.UNPAID ||
    status === INVOICE_STATUS.AFTER_MATURITY
  ) {
    return status;
  }

  // Match iOS fallback (unknown status -> unpaid)
  return INVOICE_STATUS.UNPAID;
};

const resolveInvoiceStatsStatus = (invoice, referenceDate) => {
  const normalizedStatus = normalizeInvoiceStatus(invoice.status);

  if (normalizedStatus === INVOICE_STATUS.PAID || normalizedStatus === INVOICE_STATUS.AFTER_MATURITY) {
    return normalizedStatus;
  }

  // iOS statusCase marks unpaid invoices as afterMaturity once maturity date passes.
  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return normalizedStatus;
  }

  const maturityCutOffDate = new Date(dueDate);
  maturityCutOffDate.setHours(0, 0, 0, 0);

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return today > maturityCutOffDate ? INVOICE_STATUS.AFTER_MATURITY : INVOICE_STATUS.UNPAID;
};

const resolveInvoiceYear = (invoice) => {
  const rawNumber = invoice?.invoiceNumber ?? invoice?.number ?? '';
  const match = String(rawNumber).match(/^(\d{4})/);

  if (match) {
    const yearFromPrefix = Number.parseInt(match[1], 10);
    if (Number.isInteger(yearFromPrefix) && yearFromPrefix >= 1900 && yearFromPrefix <= 2999) {
      return yearFromPrefix;
    }
  }

  const fallbackDate = new Date(invoice?.issueDate || invoice?.dateCreated || Date.now());
  return Number.isNaN(fallbackDate.getTime()) ? new Date().getFullYear() : fallbackDate.getFullYear();
};

const Invoices = () => {
  const { t, tPlural } = useLanguage();
  const { contractors, activeContractorId, setActiveContractor, addContractor, updateContractor, getInvoicesForContractor, formatPrice, findProjectById, calculateProjectTotalPriceWithBreakdown, generalPriceList, clients } = useAppData();
  const [selectedStatus, setSelectedStatus] = useState(t('All'));
  const [selectedType, setSelectedType] = useState('regular'); // Default to 'regular' (Faktúry)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showStandaloneInvoice, setShowStandaloneInvoice] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const dropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreMenuRefMobile = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowContractorSelector(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target) &&
        moreMenuRefMobile.current && !moreMenuRefMobile.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showStatsModal) return undefined;

    const handleEscClose = (event) => {
      if (event.key === 'Escape') {
        setShowStatsModal(false);
      }
    };

    document.addEventListener('keydown', handleEscClose);
    return () => document.removeEventListener('keydown', handleEscClose);
  }, [showStatsModal]);

  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };

  const getInvoices = () => {
    if (!activeContractorId) return [];
    const invoices = getInvoicesForContractor(activeContractorId);

    // Filter by year
    let filtered = invoices;
    if (selectedYear !== t('Any Time')) {
      const year = parseInt(selectedYear);
      filtered = filtered.filter(inv => {
        const invoiceYear = resolveInvoiceYear(inv);
        return invoiceYear === year;
      });
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(inv => (inv.invoiceType || 'regular') === selectedType);
    }

    // Filter by status
    if (selectedStatus === t('Paid')) {
      filtered = filtered.filter(inv => inv.status === 'paid');
    } else if (selectedStatus === t('Unpaid')) {
      filtered = filtered.filter(inv => (inv.status === 'unpaid' || inv.status === 'unsent') && (['regular', 'proforma'].includes(inv.invoiceType || 'regular')));
    } else if (selectedStatus === t('Overdue')) {
      const today = new Date();
      filtered = filtered.filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return dueDate < today && inv.status !== 'paid' && (['regular', 'proforma'].includes(inv.invoiceType || 'regular'));
      });
    }

    // Sort by invoice number (descending - newest first)
    return filtered.sort((a, b) => parseInt(b.invoiceNumber || 0) - parseInt(a.invoiceNumber || 0));
  };

  // Generate year options (current year and previous 4 years + "Any Time")
  const currentYear = new Date().getFullYear();
  const yearFilters = [
    currentYear.toString(),
    (currentYear - 1).toString(),
    (currentYear - 2).toString(),
    (currentYear - 3).toString(),
    t('Any Time')
  ];

  const statusFilters = [t('All'), t('Paid'), t('Unpaid'), t('Overdue')];

  const invoiceTypes = [
    { id: 'regular', label: 'Faktúra' },
    { id: 'proforma', label: 'Zálohová faktúra' },
    { id: 'delivery', label: 'Dodací list' },
    { id: 'credit_note', label: 'Dobropis' }
  ];

  const invoices = getInvoices();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK');
  };

  const getInvoiceTotal = (invoice) => {
    // PREFERRED: Use stored values from the invoice record if available
    // We display price WITHOUT VAT as per the label "VAT not included"
    if (invoice.priceWithoutVat !== undefined && invoice.priceWithoutVat !== null) {
      return formatPrice(parseFloat(invoice.priceWithoutVat));
    }

    // FALLBACK: Calculate from project data (legacy behavior / fallback)
    const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
    if (!projectResult?.project) return '0,00';

    const breakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
    if (!breakdown) return '0,00';

    const totalWithoutVAT = breakdown.total || 0;
    return formatPrice(totalWithoutVAT);
  };

  const handleContractorSelect = (contractor) => {
    setActiveContractor(contractor.id);
    setShowContractorSelector(false);
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      if (contractorData.id) {
        await updateContractor(contractorData.id, contractorData);
      } else {
        const newContractor = await addContractor(contractorData);
        if (newContractor) {
          setActiveContractor(newContractor.id);
        }
      }
      setShowContractorModal(false);
    } catch (error) {
      console.error('Error saving contractor:', error);
      if (error.userFriendly) {
        alert(error.message);
      } else {
        alert('Failed to save contractor. Please try again.');
      }
    }
  };

  const stats = useMemo(() => {
    const allInvoices = activeContractorId ? getInvoicesForContractor(activeContractorId) : [];
    const today = new Date();

    // Group invoices by year
    const statsByYear = {};

    allInvoices.forEach(invoice => {
      // Use stored invoice price if available (preferred), otherwise fall back to 0
      // This ensures we use the snapshot price at the time of invoice creation
      let totalWithVAT = 0;
      let totalWithoutVAT = 0;

      if (invoice.priceWithoutVat !== undefined && invoice.priceWithoutVat !== null) {
        const priceWithoutVat = parseFloat(invoice.priceWithoutVat);
        totalWithoutVAT = Number.isNaN(priceWithoutVat) ? 0 : priceWithoutVat;

        // Match iOS formula: sum stored VAT amount per invoice.
        const rawVatValue = invoice.vatAmount ?? invoice.cumulativeVat;
        if (rawVatValue !== undefined && rawVatValue !== null) {
          const vatAmount = parseFloat(rawVatValue);
          totalWithVAT = totalWithoutVAT + (Number.isNaN(vatAmount) ? 0 : vatAmount);
        } else {
          // Legacy fallback when VAT wasn't stored at all.
          const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
          const vatRate = vatItem ? vatItem.price / 100 : 0.20;
          totalWithVAT = totalWithoutVAT * (1 + vatRate);
        }
      } else {
        // Fallback for very old legacy data if priceWithoutVat is missing
        // Try to calculate from project if possible, otherwise 0
        const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
        if (projectResult?.project) {
          const breakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
          if (breakdown) {
            // Get VAT rate from general price list or default
            const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
            const vatRate = vatItem ? vatItem.price / 100 : 0.23;
            totalWithVAT = (breakdown.total || 0) * (1 + vatRate);
            totalWithoutVAT = breakdown.total || 0;
          }
        }
      }

      const year = resolveInvoiceYear(invoice);

      if (!statsByYear[year]) {
        statsByYear[year] = {
          year: year,
          total: { amount: 0, amountWithoutVAT: 0, count: 0 },
          paid: { amount: 0, amountWithoutVAT: 0, count: 0 },
          unpaid: { amount: 0, amountWithoutVAT: 0, count: 0 },
          overdue: { amount: 0, amountWithoutVAT: 0, count: 0 }
        };
      }

      const yearStats = statsByYear[year];

      yearStats.total.amount += totalWithVAT;
      yearStats.total.amountWithoutVAT += totalWithoutVAT;
      yearStats.total.count++;

      const invoiceStatus = resolveInvoiceStatsStatus(invoice, today);

      if (invoiceStatus === INVOICE_STATUS.PAID) {
        yearStats.paid.amount += totalWithVAT;
        yearStats.paid.amountWithoutVAT += totalWithoutVAT;
        yearStats.paid.count++;
      } else if (invoiceStatus === INVOICE_STATUS.AFTER_MATURITY) {
        yearStats.overdue.amount += totalWithVAT;
        yearStats.overdue.amountWithoutVAT += totalWithoutVAT;
        yearStats.overdue.count++;
      } else {
        yearStats.unpaid.amount += totalWithVAT;
        yearStats.unpaid.amountWithoutVAT += totalWithoutVAT;
        yearStats.unpaid.count++;
      }
    });

    // Convert to array and sort by year descending
    return Object.values(statsByYear).sort((a, b) => b.year - a.year);
  }, [activeContractorId, generalPriceList, getInvoicesForContractor, findProjectById, calculateProjectTotalPriceWithBreakdown]);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header - Desktop Only Title and Stats */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Invoices')}</h1>
        <div className="flex items-center gap-3 absolute right-6 top-6">
          <button
            onClick={() => setShowStandaloneInvoice(true)}
            className="w-12 h-12 rounded-full btn-blue-gradient flex items-center justify-center transition-all active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" />
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md active-white-bg"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={() => { setShowStatsModal(true); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Invoice Statistics')}</span>
                </button>
                <button
                  onClick={() => { setShowItemsModal(true); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Package className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Manage Items')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contractor and Stats Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 bg-transparent"
            onClick={() => setShowContractorSelector(!showContractorSelector)}
          >
            {/* Mobile: truncated name */}
            <span className="text-4xl font-sf-heavy text-gray-900 dark:text-white lg:hidden">
              {(() => {
                const name = getCurrentContractor()?.name || t('Select contractor');
                return name.length > 12 ? name.substring(0, 12) + '...' : name;
              })()}
            </span>
            {/* Desktop: full name */}
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden lg:inline">
              {getCurrentContractor()?.name || t('Select contractor')}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          {/* Contractor Dropdown */}
          {showContractorSelector && (
            <div className="absolute top-full left-0 mt-2 w-full max-w-xs lg:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-10 animate-slide-in-top">
              <div className="p-4 space-y-3">
                {/* Create New Profile */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex flex-row items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => {
                    setShowContractorSelector(false);
                    setShowContractorModal(true);
                  }}>
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-1">{t('New profile')}</h3>
                  </div>
                  <button className="rounded-full w-10 h-10 flex items-center justify-center transition-all shadow-sm hover:shadow-md active-white-bg">
                    <Plus className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                {/* Existing Contractors */}
                {contractors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                      {t('Select contractor')}
                    </div>
                    {contractors.map(contractor => (
                      <div
                        key={contractor.id}
                        className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${activeContractorId === contractor.id
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md'
                          : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        onClick={() => handleContractorSelect(contractor)}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {contractor.name}
                        </div>
                        {contractor.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {contractor.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setShowStandaloneInvoice(true)}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full btn-blue-gradient flex items-center justify-center transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
          </button>
          <div className="relative" ref={moreMenuRefMobile}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md active-white-bg"
            >
              <MoreVertical className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={() => { setShowStatsModal(true); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Invoice Statistics')}</span>
                </button>
                <button
                  onClick={() => { setShowItemsModal(true); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Package className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Manage Items')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 lg:mb-8 flex flex-col gap-0 lg:gap-4 px-4 lg:px-0 -ml-4 lg:ml-0 overflow-visible">
        {/* Invoice Type Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0">
          {invoiceTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm lg:text-base font-bold transition-all border-2 ${selectedType === type.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md active-white-bg'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Year dropdown */}
          <div className="relative flex-shrink-0" ref={yearDropdownRef}>
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-1 text-sm lg:text-base font-bold text-gray-900 dark:text-white whitespace-nowrap rounded-2xl px-3 py-1.5 no-gradient shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border-2 border-gray-900 dark:border-white"
            >
              {selectedYear}
              <ChevronDown className={`w-4 h-4 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showYearDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[100] py-1 min-w-[120px]">
                {yearFilters.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setShowYearDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${selectedYear === year
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 self-center flex-shrink-0" />

          {/* Status filters - Scrollable area */}
          <div className="flex-1 flex gap-2 py-2 overflow-x-auto scrollbar-hide">
            {statusFilters.map(filter => (
              <button
                key={filter}
                className={`text-sm lg:text-base font-bold transition-all flex-shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full border-2 ${selectedStatus === filter
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md active-white-bg'
                  : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                onClick={() => setSelectedStatus(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex items-center justify-center min-h-96 text-center px-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-sm">
            <h2 className="text-lg lg:text-xl font-medium text-gray-600 dark:text-gray-400 leading-relaxed">{t('There is no Invoice for selected Contractor.')}</h2>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 lg:space-y-3">
          {invoices.map(invoice => (
            <div
              key={invoice.id}
              onClick={() => {
                setSelectedInvoice(invoice);
                setShowInvoiceDetail(true);
              }}
              className="bg-white dark:bg-gray-800 rounded-[24px] px-[15px] py-[5px] lg:px-8 lg:py-5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer transition-all duration-300 shadow-sm min-w-0 w-full"
            >
              <div className="flex items-center justify-between min-w-0">
                <div className="flex-1 min-w-0 min-h-[50px] flex flex-col justify-center">
                  {/* Invoice number with dates */}
                  <div className="flex items-center gap-1 lg:gap-2 flex-wrap whitespace-nowrap overflow-hidden">
                    <span className="text-[13px] lg:text-base font-medium text-gray-600 dark:text-gray-400 shrink-0">
                      {invoice.invoiceType === 'delivery' ? '' : invoice.invoiceNumber}
                    </span>
                    <span className="text-[13px] lg:text-base font-semibold lg:font-medium text-gray-600 dark:text-gray-400 shrink-0">
                      {formatDate(invoice.issueDate)}
                    </span>
                  </div>
                  {/* Project name */}
                  <h3 className="text-[22px] lg:text-3xl font-semibold text-gray-900 dark:text-white text-left leading-[1.1]">
                    {(() => {
                      const isDennik = invoice.invoiceItems?.some(item => item.unit === 'h' || item.unit === 'hour');
                      const projectName = invoice.projectName || '';

                      if (isDennik) return `${t('Odpracované hodiny')} - ${projectName || t('Unknown project')}`;
                      return projectName || t('Unknown project');
                    })()}
                  </h3>
                  {/* Client name - below project name */}
                  <div className="text-[13px] lg:text-base font-medium text-gray-600 dark:text-gray-400 truncate">
                    {(() => {
                      // First check if invoice has a direct clientId
                      if (invoice.clientId) {
                        const client = clients.find(c => c.id === invoice.clientId);
                        if (client?.name) return client.name;
                      }

                      // Find project for fallback info
                      const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
                      const project = projectResult?.project;

                      // Check if it's a Dennik invoice (worked hours only)
                      const isDennikInvoice = invoice.invoiceItems?.some(item => item.unit === 'h' || item.unit === 'hour');

                      if (isDennikInvoice) {
                        // Prioritize contractor name if available from invoice object
                        if (invoice.contractors?.name) return invoice.contractors.name;

                        // Fallback to project owner from context-provided project data
                        if (project?.owner) {
                          return project.owner.full_name || project.owner.email || t('No client');
                        }
                      }

                      if (project) {
                        // 1. Check project's clientId
                        if (project.clientId) {
                          const client = clients.find(c => c.id === project.clientId);
                          if (client?.name) return client.name;
                        }

                        // 2. Fallback: Check project owner
                        if (project.owner) {
                          return project.owner.full_name || project.owner.email || t('No client');
                        }
                      }

                      return t('No client');
                    })()}
                  </div>
                  {/* Mobile: repositioned date removed as per request */}
                </div>
                <div className="flex items-center gap-1 lg:gap-4 flex-shrink-0 ml-auto">
                  <div className="text-right">
                    {/* Status badge - above price (iOS compatible: unpaid, paid, afterMaturity) */}
                    {(() => {
                      const isPaid = invoice.status === INVOICE_STATUS.PAID;

                      // Use the actual due date (datum splatnosti) from the invoice
                      const maturityCutOffDate = new Date(invoice.dueDate);
                      maturityCutOffDate.setHours(0, 0, 0, 0);

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      // Calculate difference in days
                      const diffTime = maturityCutOffDate - today;
                      const dayDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const absDays = Math.abs(dayDiff);

                      // Determine status based on date if not already paid
                      const isOverdue = !isPaid && dayDiff < 0;

                      return (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] lg:text-xs font-medium rounded-full mb-1 text-white dark:text-gray-900 shrink-0 status-badge-dark"
                          style={{
                            backgroundColor: isPaid ? '#73D38A' // brandGreen
                              : isOverdue ? '#FF857C' // brandRed
                                : '#51A2F7' // brandBlue
                          }}
                        >
                          {isPaid ? t('Paid')
                            : isOverdue
                              ? `${t('Overdue by')} ${absDays} ${absDays === 1 ? t('day') : (absDays >= 2 && absDays <= 4 ? t('days_2_4') : t('days'))}`
                              : dayDiff === 0 ? t('Matures today')
                                : `${t('Matures in')} ${absDays} ${absDays === 1 ? t('day') : (absDays >= 2 && absDays <= 4 ? t('days_2_4') : t('days'))}`}
                        </span>
                      );
                    })()}
                    {/* Price */}
                    <div className="font-semibold text-gray-900 dark:text-white text-[20px] lg:text-lg">{getInvoiceTotal(invoice)}</div>
                    {/* VAT not included - below price */}
                    <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                  </div>
                  <ChevronRight className="w-6 h-6 lg:w-5 lg:h-5 text-gray-400 dark:text-gray-500 -mr-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contractor Profile Modal */}
      {showContractorModal && (
        <ContractorProfileModal
          onClose={() => setShowContractorModal(false)}
          onSave={handleSaveContractor}
        />
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={showInvoiceDetail}
        onClose={() => {
          setShowInvoiceDetail(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      {/* Standalone Invoice Creation Modal */}
      {showStandaloneInvoice && (
        <InvoiceCreationModal
          isOpen={showStandaloneInvoice}
          onClose={() => setShowStandaloneInvoice(false)}
          project={null}
          categoryId={null}
        />
      )}

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-0 sm:p-2 lg:p-4 overflow-hidden animate-fade-in" onClick={() => setShowStatsModal(false)}>
          <div className="relative bg-white dark:bg-gray-900 no-gradient rounded-t-[25px] lg:rounded-[25px] w-full lg:max-w-md h-[85dvh] overflow-hidden shadow-2xl animate-slide-in-bottom lg:animate-slide-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 h-[60px] px-[15px] flex items-start justify-between bg-white/80 dark:bg-gray-900/85 backdrop-blur-md border-b border-black/10 dark:border-white/10">
              <div className="w-10" />
              <h2 className="pt-[7px] text-[20px] font-medium text-[#111827] dark:text-white">{t('Statistics')}</h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="modal-close-btn"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="h-full overflow-y-auto px-[15px] pt-20 pb-6 space-y-[15px]">
              {stats.map(yearStats => (
                <div key={yearStats.year} className="space-y-[5px]">
                  {/* Year Label */}
                  <div className="text-[16px] font-semibold text-[#111827] dark:text-white">
                    {yearStats.year}
                  </div>

                  {/* Total Card */}
                  <div className="bg-[#F3F4F6] dark:bg-gray-800 no-gradient rounded-[20px] p-[15px] shadow-[0_6px_18px_rgba(0,0,0,0.10)]">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[30px] font-bold text-[#111827] dark:text-white leading-none">
                        {formatPrice(yearStats.total.amountWithoutVAT)}
                      </span>
                      <span className="text-base font-medium text-[#111827] dark:text-gray-200">
                        {t('total, without VAT')}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-[3px]">
                      <span className="text-[20px] font-semibold text-[#111827] dark:text-white leading-none">{yearStats.total.count}</span>
                      <span className="text-sm font-medium text-[#111827] dark:text-gray-200">{tPlural(yearStats.total.count, 'invoice_singular', 'invoices_few', 'invoices_many')}</span>
                    </div>
                    <div className="h-px bg-black/30 dark:bg-white/25 my-[5px]" />

                    {/* Paid Section */}
                    <div className="mt-[10px]">
                      <div className="text-[15px] font-medium text-[#111827] dark:text-white mb-1">{t('Paid')}</div>
                      <div className="bg-white dark:bg-gray-900 no-gradient rounded-[15px] p-[10px] border border-black/15 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-[24px] font-bold text-[#111827] dark:text-white leading-none">
                            {formatPrice(yearStats.paid.amountWithoutVAT)}
                          </span>
                          <span className="text-[13px] font-medium text-[#111827] dark:text-gray-200">
                            {t('total, without VAT')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-base font-semibold text-[#111827] dark:text-white leading-none">{yearStats.paid.count}</span>
                          <span className="text-[11px] font-medium text-[#111827] dark:text-gray-300">{tPlural(yearStats.paid.count, 'invoice_singular', 'invoices_few', 'invoices_many')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Unpaid Section */}
                    <div className="mt-[10px]">
                      <div className="text-[15px] font-medium text-[#111827] dark:text-white mb-1">{t('Unpaid')}</div>
                      <div className="bg-white dark:bg-gray-900 no-gradient rounded-[15px] p-[10px] border border-black/15 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-[24px] font-bold text-[#111827] dark:text-white leading-none">
                            {formatPrice(yearStats.unpaid.amountWithoutVAT)}
                          </span>
                          <span className="text-[13px] font-medium text-[#111827] dark:text-gray-200">
                            {t('total, without VAT')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-base font-semibold text-[#111827] dark:text-white leading-none">{yearStats.unpaid.count}</span>
                          <span className="text-[11px] font-medium text-[#111827] dark:text-gray-300">{tPlural(yearStats.unpaid.count, 'invoice_singular', 'invoices_few', 'invoices_many')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Overdue Section */}
                    <div className="mt-[10px]">
                      <div className="text-[15px] font-medium text-[#111827] dark:text-white mb-1">{t('Overdue')}</div>
                      <div className="bg-white dark:bg-gray-900 no-gradient rounded-[15px] p-[10px] border border-black/15 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-[24px] font-bold text-[#111827] dark:text-white leading-none">
                            {formatPrice(yearStats.overdue.amountWithoutVAT)}
                          </span>
                          <span className="text-[13px] font-medium text-[#111827] dark:text-gray-200">
                            {t('total, without VAT')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-base font-semibold text-[#111827] dark:text-white leading-none">{yearStats.overdue.count}</span>
                          <span className="text-[11px] font-medium text-[#111827] dark:text-gray-300">{tPlural(yearStats.overdue.count, 'invoice_singular', 'invoices_few', 'invoices_many')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {stats.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('No invoices found')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Items Management Modal */}
      <ItemsManagementModal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
      />
    </div>
  );
};

export default Invoices;
