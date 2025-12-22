import React, { useState } from 'react';
import { X, Eye, Send, CheckCircle, FileText, User, Calendar, DollarSign, Edit3, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import InvoiceCreationModal from './InvoiceCreationModal';
import PDFPreviewModal from './PDFPreviewModal';

const InvoiceDetailModal = ({ isOpen, onClose, invoice }) => {
  const { t } = useLanguage();
  const { updateInvoice, deleteInvoice, contractors, findProjectById, calculateProjectTotalPriceWithBreakdown, formatPrice, clients, generalPriceList, addProjectHistoryEntry } = useAppData();
  const navigate = useNavigate();

  // Edit mode state - now opens a modal instead of inline editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  if (!isOpen || !invoice) return null;

  const contractor = contractors.find(c => c.id === invoice.contractorId);
  const project = findProjectById(invoice.projectId, invoice.categoryId);
  const projectBreakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
  // Find client by ID from the invoice
  const client = clients.find(c => c.id === invoice.clientId);

  // Get VAT rate
  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const vatRate = getVATRate();
  const totalWithoutVAT = projectBreakdown?.total || 0;
  const vat = totalWithoutVAT * vatRate;
  const totalWithVAT = totalWithoutVAT + vat;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK');
  };

  const handleStartEdit = () => {
    setShowEditModal(true);
  };

  const handleEditModalClose = (updated) => {
    setShowEditModal(false);
    if (updated) {
      onClose(true); // Refresh the list
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInvoice(invoice.id);
      setShowDeleteConfirm(false);
      onClose(true); // Refresh the list
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert(t('Failed to delete invoice'));
    }
  };

  const handleMarkAsSent = () => {
    updateInvoice(invoice.id, { status: 'sent' });
    onClose(true); // Pass true to indicate the invoice was updated
  };

  const handleMarkAsPaid = () => {
    updateInvoice(invoice.id, { status: 'paid' });
    onClose(true); // Pass true to indicate the invoice was updated
  };

  const handleViewProject = () => {
    onClose();
    navigate('/projects', {
      state: {
        selectedCategoryId: invoice.categoryId,
        selectedProjectId: invoice.projectId
      }
    });
  };

  const handlePreview = () => {
    try {
      const result = generateInvoicePDF({
        invoice,
        contractor,
        client,
        projectBreakdown,
        vatRate,
        totalWithoutVAT,
        vat,
        totalWithVAT,
        formatDate,
        formatPrice,
        t // Pass the t function
      });
      setPdfUrl(result.blobUrl);
      setShowPDFPreview(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('Unable to generate PDF. Please try again.'));
    }
  };

  const handleClosePDFPreview = () => {
    setShowPDFPreview(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleSend = async () => {
    // Record history
    if (invoice.status === 'unsent') {
      // This will automatically add the history entry via useInvoiceManager
      updateInvoice(invoice.id, { status: 'sent' });
    } else {
      // Manually add history entry for re-sends
      addProjectHistoryEntry(invoice.projectId, {
        type: 'invoice_sent',
        invoiceNumber: invoice.invoiceNumber,
        date: new Date().toISOString()
      });
    }

    // Generate invoice data to share
    const invoiceText = `
${t('Invoice')} ${invoice.invoiceNumber}
${invoice.projectName}

${t('Contractor')}: ${contractor?.name || '-'}
${t('Client')}: ${client?.name || '-'}

${t('Issue Date')}: ${formatDate(invoice.issueDate)}
${t('Due Date')}: ${formatDate(invoice.dueDate)}
${t('Payment Method')}: ${t(invoice.paymentMethod === 'cash' ? 'Cash' : 'Transfer')}

${t('without VAT')}: ${formatPrice(totalWithoutVAT)}
${t('VAT (23%)')}: ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${invoice.notes ? `\n${t('Notes')}: ${invoice.notes}` : ''}
    `.trim();

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('Invoice')} ${invoice.invoiceNumber}`,
          text: invoiceText,
        });
      } catch (error) {
        // User cancelled or share failed
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(invoiceText);
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      fallbackShare(invoiceText);
    }
  };

  const fallbackShare = (text) => {
    // Copy to clipboard as fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          alert(t('Invoice details copied to clipboard'));
        })
        .catch(() => {
          alert(t('Unable to share. Please try again.'));
        });
    } else {
      alert(t('Sharing not supported on this device'));
    }
  };

  // Delete confirmation dialog
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Delete Invoice')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('Are you sure you want to delete this invoice? This action cannot be undone.')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              {t('Delete')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Invoice')} {invoice.invoiceNumber}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartEdit}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('Edit')}
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('Delete')}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-4 py-2 text-sm font-medium rounded-full ${
              invoice.status === 'paid'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : invoice.status === 'sent'
                ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
            }`}>
              {t(invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Invoice sent' : 'Invoice not sent')}
            </span>

            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkAsPaid}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                {t('Mark as Paid')}
              </button>
            )}
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('Contractor')}
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Name')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{contractor?.name || '-'}</p>
                  </div>
                  {contractor?.email && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('Email')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{contractor.email}</p>
                    </div>
                  )}
                  {contractor?.phone && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('Phone')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{contractor.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {client && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t('Client')}
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('Name')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Invoice Settings */}
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('Invoice Settings')}
                </h3>
                <div className="space-y-3">
                  {/* Invoice Number */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Invoice Number')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</span>
                  </div>

                  {/* Issue Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Issue Date')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(invoice.issueDate)}</span>
                  </div>

                  {/* Due Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Due Date')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(invoice.dueDate)}</span>
                  </div>

                  {/* Payment Method */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Payment Method')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t(invoice.paymentMethod === 'cash' ? 'Cash' : 'Transfer')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('Notes')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {invoice.notes || <span className="italic text-gray-400">{t('No notes')}</span>}
            </p>
          </div>

          {/* Project Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('Project')}</h3>
              <button
                onClick={handleViewProject}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('View Project')}
              </button>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">{project?.name}</p>
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('without VAT')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatPrice(totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('VAT (23%)')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatPrice(vat)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price')}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(totalWithVAT)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {t('Preview Invoice')}
            </button>
            <button
              onClick={handleSend}
              className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {t('Send Invoice')}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Invoice Modal */}
      <InvoiceCreationModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        project={project}
        categoryId={invoice.categoryId}
        editMode={true}
        existingInvoice={invoice}
      />

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={handleClosePDFPreview}
        pdfUrl={pdfUrl}
        onSend={() => {
          handleClosePDFPreview();
          handleSend();
        }}
        title={`${t('Invoice')} ${invoice.invoiceNumber}`}
      />
    </div>
  );
};

export default InvoiceDetailModal;

// Export PDF generation function for use in other components
export { InvoiceDetailModal };
