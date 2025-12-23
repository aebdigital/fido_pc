import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import ContractorProfileModal from '../components/ContractorProfileModal';

const Invoices = () => {
  const { t } = useLanguage();
  const { contractors, activeContractorId, setActiveContractorId, addContractor, updateContractor, getInvoicesForContractor, formatPrice, findProjectById, calculateProjectTotalPriceWithBreakdown, generalPriceList } = useAppData();
  const [selectedStatus, setSelectedStatus] = useState(t('All'));
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowContractorSelector(false);
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

    // Filter by status
    let filtered = invoices;
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

    return filtered.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  };

  const statusFilters = [t('All'), t('Paid'), t('Unpaid'), t('Overdue')];
  const invoices = getInvoices();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK');
  };

  const getInvoiceTotal = (invoice) => {
    // Get the project to calculate total
    const project = findProjectById(invoice.projectId, invoice.categoryId);
    if (!project) return '0,00';

    const breakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
    if (!breakdown) return '0,00';

    // Get VAT rate
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    const vatRate = vatItem ? vatItem.price / 100 : 0.23;

    const totalWithoutVAT = breakdown.total || 0;
    const totalWithVAT = totalWithoutVAT * (1 + vatRate);
    return formatPrice(totalWithVAT);
  };

  const handleContractorSelect = (contractor) => {
    setActiveContractorId(contractor.id);
    setShowContractorSelector(false);
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      if (contractorData.id) {
        await updateContractor(contractorData.id, contractorData);
      } else {
        const newContractor = await addContractor(contractorData);
        if (newContractor) {
          setActiveContractorId(newContractor.id);
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

  return (
    <div className="pb-20 lg:pb-0">
      <h1 className="hidden lg:block text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('Invoices')}</h1>

      {/* Contractor Profile Dropdown */}
      <div className="mb-4 lg:mb-6 relative" ref={dropdownRef}>
        <button
          className="flex items-center gap-2"
          onClick={() => setShowContractorSelector(!showContractorSelector)}
        >
          <span className="text-4xl lg:text-xl font-bold text-gray-900 dark:text-white truncate block max-w-[calc(100%-50px)]">
            {getCurrentContractor()?.name || t('Select contractor')}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        </button>

        {/* Contractor Dropdown */}
        {showContractorSelector && (
          <div className="absolute top-full left-0 mt-2 w-full max-w-xs lg:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-10 animate-slide-in-top">
            <div className="p-4 space-y-3">

              {/* Create New Profile */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                   onClick={() => {
                     setShowContractorSelector(false);
                     setShowContractorModal(true);
                   }}>
                <div className="mb-3 sm:mb-0">
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1">{t('Create new profile')}</h3>

                </div>
                <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md self-end sm:self-auto">
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
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        activeContractorId === contractor.id
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

      <div className="mb-6 lg:mb-8 min-w-0 w-full">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 min-w-0">
          {statusFilters.map(filter => (
            <button
              key={filter}
              className={`text-sm lg:text-base font-medium transition-colors flex-shrink-0 ${
                selectedStatus === filter
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm lg:text-base text-gray-500 dark:text-gray-400">
                      {invoice.invoiceNumber}
                    </span>
                    <span className={`px-2 py-1 text-xs lg:text-sm font-medium rounded-full ${
                      invoice.status === 'sent'
                        ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : invoice.status === 'paid'
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                    }`}>
                      {t(invoice.status === 'sent' ? 'sent' : invoice.status === 'paid' ? 'Paid' : 'unsent')}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {invoice.projectName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('Issue Date')}: {formatDate(invoice.issueDate)}</span>
                    <span>{t('Due Date')}: {formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('Total price')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{getInvoiceTotal(invoice)} €</div>
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
        onClose={(updated) => {
          setShowInvoiceDetail(false);
          setSelectedInvoice(null);
          // If invoice was updated, the list will automatically refresh
        }}
        invoice={selectedInvoice}
      />

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
