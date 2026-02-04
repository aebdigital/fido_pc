import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Hash, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { INVOICE_STATUS } from '../utils/dataTransformers';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
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
    const project = findProjectById(invoice.projectId, invoice.categoryId);
    if (!project) return '0,00';

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
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // Get VAT rate
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    const vatRate = vatItem ? vatItem.price / 100 : 0.23;

    let totalAmount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let overdueAmount = 0;
    let totalCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    allInvoices.forEach(invoice => {
      const project = findProjectById(invoice.projectId, invoice.categoryId);
      if (!project) return;

      const breakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
      if (!breakdown) return;

      const totalWithoutVAT = breakdown.total || 0;
      const totalWithVAT = totalWithoutVAT * (1 + vatRate);

      totalAmount += totalWithVAT;
      totalCount++;

      if (invoice.status === INVOICE_STATUS.PAID) {
        paidAmount += totalWithVAT;
        paidCount++;
      } else {
        unpaidAmount += totalWithVAT;
        unpaidCount++;

        // Check if overdue
        const dueDate = new Date(invoice.dueDate);
        if (dueDate < today) {
          overdueAmount += totalWithVAT;
          overdueCount++;
        }
      }
    });

    return {
      year: currentYear,
      total: { amount: totalAmount, count: totalCount },
      paid: { amount: paidAmount, count: paidCount },
      unpaid: { amount: unpaidAmount, count: unpaidCount },
      overdue: { amount: overdueAmount, count: overdueCount }
    };
  }, [activeContractorId, generalPriceList, getInvoicesForContractor, findProjectById, calculateProjectTotalPriceWithBreakdown]);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header - Desktop Only Title and Stats */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('Invoices')}</h1>
        <button
          onClick={() => setShowStatsModal(true)}
          className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md absolute right-6 top-6"
        >
          <Hash className="w-6 h-6" />
        </button>
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

        {/* Mobile Stats Button */}
        <div className="lg:hidden">
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
              className={`text-sm lg:text-base font-medium transition-colors flex-shrink-0 whitespace-nowrap bg-transparent px-3 py-1 rounded-full border no-global-border ${selectedStatus === filter
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                    {invoice.projectName}
                  </h3>
                  {/* Client name - below project name */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      // First check if invoice has a direct clientId
                      if (invoice.clientId) {
                        const client = clients.find(c => c.id === invoice.clientId);
                        if (client?.name) return client.name;
                      }
                      // Fallback: check project's clientId
                      const project = findProjectById(invoice.projectId, invoice.categoryId);
                      if (project?.clientId) {
                        const client = clients.find(c => c.id === project.clientId);
                        return client?.name || t('No client');
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
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const due = new Date(invoice.dueDate);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due - today;
                      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isPaid = invoice.status === INVOICE_STATUS.PAID;
                      const isOverdue = invoice.status === INVOICE_STATUS.AFTER_MATURITY || (!isPaid && days < 0);

                      return (
                        <span className={`inline-block px-2 py-1 text-xs lg:text-sm font-medium rounded-full mb-1 ${isPaid
                          ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                          : isOverdue
                            ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                            : 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          }`}>
                          {isPaid ? t('Paid')
                            : isOverdue ? t('afterMaturity')
                              : days === 0 ? t('Matures today')
                                : `${t('Matures in')} ${days} ${days === 1 ? t('day') : (days >= 2 && days <= 4 ? t('days_2_4') : t('days'))}`}
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
            <div className="p-4 lg:p-6">
              {/* Year Label */}
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{stats.year}</div>

              {/* Status Filters */}
              <div className="flex gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 py-2">
                {/* Assuming there will be buttons or other elements here for status filters */}
                {/* This section seems incomplete in the provided instruction, but I'm inserting the container as requested. */}
              </div>

              {/* Total Card */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(stats.total.amount)}
                  </span>
                  <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                    {t('total, including VAT')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 pb-3">
                  {stats.total.count} {t('invoices')}
                </div>

                {/* Paid Section */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Paid')}</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(stats.paid.amount)}
                      </span>
                      <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                        {t('total, including VAT')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.paid.count} {t('invoices total')}
                    </div>
                  </div>
                </div>

                {/* Unpaid Section */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Unpaid')}</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(stats.unpaid.amount)}
                      </span>
                      <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                        {t('total, including VAT')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.unpaid.count} {t('invoices total')}
                    </div>
                  </div>
                </div>

                {/* Overdue Section */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Overdue')}</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(stats.overdue.amount)}
                      </span>
                      <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                        {t('total, including VAT')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.overdue.count} {t('invoices total')}
                    </div>
                  </div>
                </div>
              </div>
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