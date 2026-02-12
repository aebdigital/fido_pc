import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Hash, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { INVOICE_STATUS } from '../utils/dataTransformers';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import ContractorProfileModal from '../components/ContractorProfileModal';

const Invoices = () => {
  const { t } = useLanguage();
  const { contractors, activeContractorId, setActiveContractor, addContractor, updateContractor, getInvoicesForContractor, formatPrice, findProjectById, calculateProjectTotalPriceWithBreakdown, generalPriceList, clients } = useAppData();
  const [selectedStatus, setSelectedStatus] = useState(t('All'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showStandaloneInvoice, setShowStandaloneInvoice] = useState(false);
  const dropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowContractorSelector(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const invoiceYear = new Date(inv.issueDate).getFullYear();
        return invoiceYear === year;
      });
    }

    // Filter by status
    if (selectedStatus === t('Paid')) {
      filtered = filtered.filter(inv => inv.status === 'paid');
    } else if (selectedStatus === t('Unpaid')) {
      filtered = filtered.filter(inv => inv.status === 'unpaid' || inv.status === 'unsent');
    } else if (selectedStatus === t('Overdue')) {
      const today = new Date();
      filtered = filtered.filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return dueDate < today && inv.status !== 'paid';
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
        const cumulativeVat = parseFloat(invoice.cumulativeVat || 0);
        if (cumulativeVat > 0) {
          // New format: both values are stored
          totalWithVAT = priceWithoutVat + cumulativeVat;
          totalWithoutVAT = priceWithoutVat;
        } else {
          // Old format: cumulativeVat not tracked, priceWithoutVat is actually the base price
          // Calculate VAT from rate
          const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
          const vatRate = vatItem ? vatItem.price / 100 : 0.20;
          totalWithoutVAT = priceWithoutVat;
          totalWithVAT = priceWithoutVat * (1 + vatRate);
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

      const invoiceDate = new Date(invoice.issueDate || invoice.dateCreated || new Date());
      const year = invoiceDate.getFullYear();

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

      if (invoice.status === INVOICE_STATUS.PAID) {
        yearStats.paid.amount += totalWithVAT;
        yearStats.paid.amountWithoutVAT += totalWithoutVAT;
        yearStats.paid.count++;
      } else {
        yearStats.unpaid.amount += totalWithVAT;
        yearStats.unpaid.amountWithoutVAT += totalWithoutVAT;
        yearStats.unpaid.count++;

        // Check if overdue
        const dueDate = new Date(invoice.dueDate);
        if (dueDate < today) {
          yearStats.overdue.amount += totalWithVAT;
          yearStats.overdue.amountWithoutVAT += totalWithoutVAT;
          yearStats.overdue.count++;
        }
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
            className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowStatsModal(true)}
            className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
          >
            <Hash className="w-6 h-6" />
          </button>
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
            <span className="text-4xl font-bold text-gray-900 dark:text-white lg:hidden">
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
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1">{t('New profile')}</h3>
                  </div>
                  <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md">
                    <Plus className="w-5 h-5" />
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
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${activeContractorId === contractor.id
                          ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
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
            className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowStatsModal(true)}
            className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
          >
            <Hash className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-6 lg:mb-8 flex items-center gap-4 px-4 lg:px-0 -ml-4 lg:ml-0 overflow-visible">
        {/* Year dropdown */}
        <div className="relative flex-shrink-0" ref={yearDropdownRef}>
          <button
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center gap-1 text-sm lg:text-base font-medium text-gray-900 dark:text-white whitespace-nowrap bg-transparent"
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
        <div className="flex-1 flex gap-4 py-2 overflow-x-auto scrollbar-hide">
          {statusFilters.map(filter => (
            <button
              key={filter}
              className={`text-sm lg:text-base font-medium transition-colors flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-full border no-global-border ${selectedStatus === filter
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              onClick={() => setSelectedStatus(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="flex items-center justify-center min-h-96 text-center px-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-sm">
            <h2 className="text-lg lg:text-xl font-medium text-gray-600 dark:text-gray-400 leading-relaxed">{t('There is no Invoice for selected Contractor.')}</h2>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => (
            <div
              key={invoice.id}
              onClick={() => {
                setSelectedInvoice(invoice);
                setShowInvoiceDetail(true);
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 lg:p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {/* Invoice number with dates */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="lg:text-base">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="hidden lg:inline">•</span>
                    <span className="hidden lg:inline">{t('Issue Date')}: {formatDate(invoice.issueDate)}</span>
                    <span className="hidden lg:inline">•</span>
                    <span className="hidden lg:inline">{t('Due Date')}: {formatDate(invoice.dueDate)}</span>
                  </div>
                  {/* Project name */}
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {(() => {
                      // Robust check for Dennik invoice
                      const isDennik = invoice.invoiceItems?.some(item => item.unit === 'h' || item.unit === 'hour');

                      // Get project name with fallback
                      let projectName = invoice.projectName;
                      if (!projectName && invoice.projectId) {
                        const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
                        projectName = projectResult?.project?.name;
                      }

                      // Standalone invoice (no project)
                      if (!projectName && !invoice.projectId) {
                        const firstItem = invoice.invoiceItems?.[0];
                        return firstItem?.title || t('Invoice');
                      }

                      projectName = projectName || '';

                      if (isDennik) return `${t('Odpracované hodiny')} - ${projectName}`;
                      return projectName;
                    })()}
                  </h3>
                  {/* Client name - below project name */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
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
                  {/* Mobile: dates below client */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1 lg:hidden">
                    <span>{formatDate(invoice.issueDate)}</span>
                    <span>→</span>
                    <span>{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {/* Status badge - above price (iOS compatible: unpaid, paid, afterMaturity) */}
                    {(() => {
                      const isPaid = invoice.status === INVOICE_STATUS.PAID;

                      // iOS Logic Recreation
                      // maturityCutOffDate = issueDate + maturity (in days)
                      const issueDate = new Date(invoice.issueDate);
                      issueDate.setHours(0, 0, 0, 0);

                      // Default maturity to 14 days if not specified, matching common defaults or user setting
                      const maturityDays = invoice.maturity || 14;

                      const maturityCutOffDate = new Date(issueDate);
                      maturityCutOffDate.setDate(issueDate.getDate() + maturityDays);

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
                          className="inline-block px-2 py-1 text-xs lg:text-sm font-medium rounded-full mb-1 text-white"
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
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{getInvoiceTotal(invoice)} €</div>
                    {/* VAT not included - below price */}
                    <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 animate-fade-in" onClick={() => setShowStatsModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl lg:rounded-2xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto animate-slide-in-bottom lg:animate-slide-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-8"></div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Statistics')}</h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 lg:p-6 space-y-8">
              {stats.map(yearStats => (
                <div key={yearStats.year}>
                  {/* Year Label */}
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{yearStats.year}</div>

                  {/* Total Card */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(yearStats.total.amount)}
                      </span>
                      <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                        {t('total, including VAT')}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg lg:text-xl font-semibold text-gray-600 dark:text-gray-400">
                        {formatPrice(yearStats.total.amountWithoutVAT)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        {t('total, without VAT')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 pb-3">
                      {yearStats.total.count} {t('invoices')}
                    </div>

                    {/* Paid Section */}
                    {yearStats.paid.count > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Paid')}</div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(yearStats.paid.amount)}
                            </span>
                            <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                              {t('total, including VAT')}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                              {formatPrice(yearStats.paid.amountWithoutVAT)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {t('total, without VAT')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {yearStats.paid.count} {t('invoices total')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Unpaid Section */}
                    {yearStats.unpaid.count > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Unpaid')}</div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(yearStats.unpaid.amount)}
                            </span>
                            <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                              {t('total, including VAT')}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                              {formatPrice(yearStats.unpaid.amountWithoutVAT)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {t('total, without VAT')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {yearStats.unpaid.count} {t('invoices total')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overdue Section */}
                    {yearStats.overdue.count > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Overdue')}</div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(yearStats.overdue.amount)}
                            </span>
                            <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                              {t('total, including VAT')}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                              {formatPrice(yearStats.overdue.amountWithoutVAT)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {t('total, without VAT')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {yearStats.overdue.count} {t('invoices total')}
                          </div>
                        </div>
                      </div>
                    )}
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
    </div>
  );
};

export default Invoices;