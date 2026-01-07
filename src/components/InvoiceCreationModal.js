import React, { useState, useEffect } from 'react';
import { X, FileText, Save } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import UncompletedFieldsModal from './UncompletedFieldsModal';
import NumberInput from './NumberInput';

const InvoiceCreationModal = ({ isOpen, onClose, project, categoryId, editMode = false, existingInvoice = null }) => {
  const { t } = useLanguage();
  const { createInvoice, updateInvoice, contractors, activeContractorId, clients, calculateProjectTotalPriceWithBreakdown, generalPriceList, invoices } = useAppData();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentDays, setPaymentDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [showUncompletedModal, setShowUncompletedModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  // Auto-generate invoice number based on current date and project (for create mode)
  // Or populate with existing invoice data (for edit mode)
  useEffect(() => {
    if (isOpen && project) {
      if (editMode && existingInvoice) {
        // Populate with existing invoice data
        setInvoiceNumber(existingInvoice.invoiceNumber || '');
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
        // Create mode - generate new invoice number using same pattern as projects (2025001, 2025002, etc.)
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

        setInvoiceNumber(String(nextNumber));

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

  const checkRequiredFields = () => {
    const missing = [];
    const currentContractor = contractors.find(c => c.id === activeContractorId);
    const currentClient = clients.find(c => c.id === project.clientId);

    // Check all contractor fields
    if (currentContractor) {
      // Contact details
      if (!currentContractor.name) missing.push(`${t('Contractor')}: ${t('Name')}`);
      if (!currentContractor.email) missing.push(`${t('Contractor')}: ${t('Email')}`);
      if (!currentContractor.phone) missing.push(`${t('Contractor')}: ${t('Phone')}`);
      // Address
      if (!currentContractor.street) missing.push(`${t('Contractor')}: ${t('Street')}`);
      if (!currentContractor.city) missing.push(`${t('Contractor')}: ${t('City')}`);
      if (!(currentContractor.postalCode || currentContractor.postal_code)) missing.push(`${t('Contractor')}: ${t('Postal code')}`);
      if (!currentContractor.country) missing.push(`${t('Contractor')}: ${t('Country')}`);
      // Business information
      if (!(currentContractor.businessId || currentContractor.business_id)) missing.push(`${t('Contractor')}: ${t('Business ID')}`);
      if (!(currentContractor.taxId || currentContractor.tax_id)) missing.push(`${t('Contractor')}: ${t('Tax ID')}`);
      // Banking details
      if (!(currentContractor.bankAccount || currentContractor.bank_account_number)) missing.push(`${t('Contractor')}: ${t('Bank account number')}`);
    } else {
      missing.push(t('No contractor selected'));
    }

    // Check all client fields
    if (currentClient) {
      // Contact details
      if (!currentClient.name) missing.push(`${t('Client')}: ${t('Name')}`);
      if (!currentClient.email) missing.push(`${t('Client')}: ${t('Email')}`);
      if (!currentClient.phone) missing.push(`${t('Client')}: ${t('Phone')}`);
      // Address
      if (!currentClient.street) missing.push(`${t('Client')}: ${t('Street')}`);
      if (!currentClient.city) missing.push(`${t('Client')}: ${t('City')}`);
      if (!(currentClient.postalCode || currentClient.postal_code)) missing.push(`${t('Client')}: ${t('Postal code')}`);
      if (!currentClient.country) missing.push(`${t('Client')}: ${t('Country')}`);
      // Business information (for business clients)
      if (currentClient.type === 'business') {
        if (!(currentClient.businessId || currentClient.business_id)) missing.push(`${t('Client')}: ${t('Business ID')}`);
        if (!(currentClient.taxId || currentClient.tax_id)) missing.push(`${t('Client')}: ${t('Tax ID')}`);
      }
    } else {
      missing.push(t('No client selected'));
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
      notes
    };

    if (editMode && existingInvoice) {
      // Update existing invoice
      // Calculate due date from issue date and payment days
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentDays);

      try {
        await updateInvoice(existingInvoice.id, {
          ...invoiceData,
          dueDate: dueDate.toISOString().split('T')[0]
        });
        onClose(true); // Signal that invoice was updated
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

  const handleGenerate = () => {
    if (!invoiceNumber || !issueDate || !dispatchDate) {
      alert(t('Please fill in all required fields'));
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

  if (!isOpen || !project) return null;

  const currentContractor = contractors.find(c => c.id === activeContractorId);
  const projectBreakdown = calculateProjectTotalPriceWithBreakdown(project.id);

  // Get VAT rate
  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const vatRate = getVATRate();
  const totalWithoutVAT = projectBreakdown?.total || 0;
  const vat = totalWithoutVAT * vatRate;
  const totalWithVAT = totalWithoutVAT + vat;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl h-[75vh] lg:h-auto lg:max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editMode ? t('Edit Invoice') : t('Create Invoice')}</h2>
            </div>
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-x-hidden">
            {/* Project Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Project')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Contractor')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{currentContractor?.name || '-'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('without VAT')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{totalWithoutVAT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('VAT')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{vat.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Total Price')}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{totalWithVAT.toFixed(2)} €</span>
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Invoice Settings')}</h3>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('Invoice Number')}
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="2025001"
                />
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('Issue Date')}
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full min-w-0 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white appearance-none"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              {/* Date of Dispatch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('Date of Dispatch')}
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full min-w-0 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white appearance-none"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('Payment Method')}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${paymentMethod === 'cash'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {t('Cash')}
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${paymentMethod === 'transfer'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {t('Transfer')}
                  </button>
                </div>
              </div>

              {/* Payment Due (Days) */}

              <div>

                <div className="flex items-center justify-between mb-2">

                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">

                    {t('Payment Due (Days)')}

                  </label>

                  <span className="text-xs text-gray-500 dark:text-gray-400">

                    {t('Maturity')}: {(() => {

                      if (!issueDate) return '-';

                      const d = new Date(issueDate);

                      d.setDate(d.getDate() + parseInt(paymentDays || 0));

                      return d.toLocaleDateString('sk-SK');

                    })()}

                  </span>

                </div>

                <div className="flex gap-2">
                  <NumberInput
                    value={paymentDays}
                    onChange={(val) => setPaymentDays(val)}
                    className="w-20"
                    min={0}
                  />

                  <div className="flex gap-2 flex-1 overflow-x-auto">

                    {[7, 14, 30, 60].map(days => (

                      <button

                        key={days}

                        onClick={() => setPaymentDays(days)}

                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${paymentDays === days

                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'

                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

                          }`}

                      >

                        {days}

                      </button>

                    ))}

                  </div>

                </div>

              </div>              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('Notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
                  placeholder={t('In case of non-payment of the invoice, a reminder will be looked...')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button
              onClick={handleGenerate}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              {editMode ? <Save className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              {editMode ? t('Save Changes') : t('Generate Invoice')}
            </button>
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
    </>
  );
};

export default InvoiceCreationModal;
