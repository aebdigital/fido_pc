import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';

const InvoiceCreationModal = ({ isOpen, onClose, project, categoryId }) => {
  const { t } = useLanguage();
  const { createInvoice, contractors, activeContractorId, calculateProjectTotalPriceWithBreakdown, generalPriceList } = useAppData();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentDays, setPaymentDays] = useState(30);
  const [notes, setNotes] = useState('');

  // Auto-generate invoice number based on current date and project
  useEffect(() => {
    if (isOpen && project) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const projectNumber = String(project.id).slice(-3);
      setInvoiceNumber(`${year}${month}${projectNumber}`);

      // Set default dates
      const issueDateStr = today.toISOString().split('T')[0];
      setIssueDate(issueDateStr);

      const dueDateObj = new Date(today);
      dueDateObj.setDate(dueDateObj.getDate() + paymentDays);
      setDueDate(dueDateObj.toISOString().split('T')[0]);
    }
  }, [isOpen, project, paymentDays]);

  // Update due date when payment days change
  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      const due = new Date(issue);
      due.setDate(due.getDate() + paymentDays);
      setDueDate(due.toISOString().split('T')[0]);
    }
  }, [paymentDays, issueDate]);

  const handleGenerate = () => {
    if (!invoiceNumber || !issueDate || !dueDate) {
      alert(t('Please fill in all required fields'));
      return;
    }

    const invoiceData = {
      invoiceNumber,
      issueDate,
      dueDate,
      paymentMethod,
      paymentDays,
      notes
    };

    const newInvoice = createInvoice(project.id, categoryId, invoiceData);

    if (newInvoice) {
      onClose(newInvoice);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Create Invoice')}</h2>
          </div>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>

            {/* Payment Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('Payment Due')}
              </label>
              <div className="flex gap-2">
                {[7, 15, 30, 60, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => setPaymentDays(days)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      paymentDays === days
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {days} {t('days')}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('Due Date')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
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
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('Cash')}
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('Transfer')}
                </button>
              </div>
            </div>

            {/* Notes */}
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
            <FileText className="w-5 h-5" />
            {t('Generate Invoice')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreationModal;
