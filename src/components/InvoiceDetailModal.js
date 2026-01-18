import React, { useState } from 'react';
import { X, Eye, Send, FileText, User, Calendar, DollarSign, Edit3, Trash2, ChevronRight, Building, Briefcase, Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';
import { generateInvoicePDF, generateCashReceiptPDF } from '../utils/pdfGenerator';
import { PROJECT_EVENTS, INVOICE_STATUS, PROJECT_STATUS, formatProjectNumber } from '../utils/dataTransformers';
import InvoiceCreationModal from './InvoiceCreationModal';
import PDFPreviewModal from './PDFPreviewModal';

import { useScrollLock } from '../hooks/useScrollLock';

/**
 * InvoiceDetailModal - iOS-aligned invoice detail view
 *
 * Structure (matching iOS InvoiceDetailView):
 * 1. Large invoice number at top
 * 2. Status badge with mark-as-paid button
 * 3. Clickable cards (Client, Project, Contractor)
 * 4. PDF section with 3-button row (Preview, Send, Edit)
 * 5. Cash receipt section (if cash payment)
 */
const InvoiceDetailModal = ({ isOpen, onClose, invoice: invoiceProp, hideViewProject = false }) => {
  useScrollLock(true);
  const { t } = useLanguage();
  const { updateInvoice, deleteInvoice, contractors, findProjectById, calculateProjectTotalPriceWithBreakdown, formatPrice, clients, generalPriceList, addProjectHistoryEntry, invoices, updateProject } = useAppData();
  const navigate = useNavigate();

  // Edit mode state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  // Cash receipt state
  const [showCashReceiptPreview, setShowCashReceiptPreview] = useState(false);
  const [cashReceiptUrl, setCashReceiptUrl] = useState(null);
  const [cashReceiptBlob, setCashReceiptBlob] = useState(null);

  // Use live invoice data from global state
  const invoice = invoices?.find(inv => inv.id === invoiceProp?.id) || invoiceProp;

  if (!isOpen || !invoice) return null;

  const contractor = contractors.find(c => c.id === invoice.contractorId);
  const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
  const project = projectResult?.project;
  const rawProjectBreakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
  const client = clients.find(c => c.id === invoice.clientId);

  // Build projectBreakdown for PDF - reconstruct from saved invoice items if available
  // This ensures we use the exact items, quantities and prices from the invoice
  const getFilteredProjectBreakdown = () => {
    // If the invoice has saved invoice items, use them to build the breakdown
    if (invoice.invoiceItems && invoice.invoiceItems.length > 0) {
      const activeItems = invoice.invoiceItems.filter(item => item.active !== false);

      const breakdown = {
        items: [],
        materialItems: [],
        othersItems: [],
        total: 0
      };

      activeItems.forEach(item => {
        // Reconstruct item structure expected by generator
        // Use originalItem properties if available to preserve metadata like propertyId, fields, etc.
        const original = item.originalItem || {};

        const reconstructedItem = {
          ...original, // Keep original props
          id: item.id, // Use the invoice item ID
          name: item.title, // Use title from invoice (editable)

          // Reconstruct calculation object
          calculation: {
            quantity: item.pieces,
            unit: item.unit,
            // Assign cost to appropriate field based on category
            workCost: item.category === 'material' ? 0 : item.price,
            materialCost: item.category === 'material' ? item.price : 0,
            pricePerUnit: item.pricePerPiece,
            ...original.calculation // Keep other original calc props if any
          },

          unit: item.unit,
          vatRate: (item.vat !== undefined) ? item.vat / 100 : (original.vatRate || 0.23),

          // Ensure propertyId is preserved for grouping logic in PDF generator
          propertyId: original.propertyId || (item.category === 'work' ? 'custom_work' : undefined),

          // Ensure fields are preserved for specific logic (e.g. scaffolding)
          fields: original.fields || {},
          subtitle: original.subtitle
        };

        if (item.category === 'work') {
          breakdown.items.push(reconstructedItem);
        } else if (item.category === 'material') {
          breakdown.materialItems.push(reconstructedItem);
        } else { // 'other'
          breakdown.othersItems.push(reconstructedItem);
        }

        breakdown.total += item.price;
      });

      return breakdown;
    }

    // Fallback to raw project breakdown if no saved invoice items (legacy behavior)
    return rawProjectBreakdown;
  };

  const projectBreakdown = getFilteredProjectBreakdown();

  // Get VAT rate
  const getVATRate = () => {
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const vatRate = getVATRate();
  // Use invoice's saved values if available (they reflect active items only)
  // Otherwise calculate from the filtered project breakdown
  const totalWithoutVAT = invoice.priceWithoutVat || projectBreakdown?.total || 0;
  const vat = invoice.cumulativeVat !== undefined ? invoice.cumulativeVat : (totalWithoutVAT * vatRate);
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
      onClose(true);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInvoice(invoice.id);
      setShowDeleteConfirm(false);
      onClose(true);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert(t('Failed to delete invoice'));
    }
  };

  const handleMarkAsPaid = () => {
    updateInvoice(invoice.id, { status: 'paid' });
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

  const handleViewClient = () => {
    onClose();
    navigate('/clients', {
      state: {
        selectedClientId: invoice.clientId
      }
    });
  };

  const handleViewContractor = () => {
    onClose();
    navigate('/profile');
  };

  // Check if mobile device
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handlePreview = async () => {
    try {
      const result = await generateInvoicePDF({
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
        t,
        options: {
          priceList: generalPriceList,
          projectNumber: formatProjectNumber(project)
        }
      });

      // On mobile, open directly in browser's native PDF viewer
      if (isMobile) {
        // Create a link with download attribute for proper filename
        const filename = `${t('Invoice')} ${invoice.invoiceNumber}.pdf`;
        const link = document.createElement('a');
        link.href = result.blobUrl;
        link.target = '_blank';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setPdfUrl(result.blobUrl);
        setPdfBlob(result.pdfBlob);
        setShowPDFPreview(true);
      }
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
      setPdfBlob(null);
    }
  };

  // Cash Receipt handlers
  const handleCashReceiptPreview = async () => {
    try {
      const result = await generateCashReceiptPDF({
        invoice,
        contractor,
        client,
        totalWithVAT,
        formatDate,
        formatPrice,
        t
      });

      // On mobile, open directly in browser's native PDF viewer
      if (isMobile) {
        // Create a link with download attribute for proper filename
        const filename = `${t('Cash Receipt')} ${invoice.invoiceNumber}.pdf`;
        const link = document.createElement('a');
        link.href = result.blobUrl;
        link.target = '_blank';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setCashReceiptUrl(result.blobUrl);
        setCashReceiptBlob(result.pdfBlob);
        setShowCashReceiptPreview(true);
      }
    } catch (error) {
      console.error('Error generating cash receipt PDF:', error);
      alert(t('Unable to generate cash receipt. Please try again.'));
    }
  };

  const handleCloseCashReceiptPreview = () => {
    setShowCashReceiptPreview(false);
    if (cashReceiptUrl) {
      URL.revokeObjectURL(cashReceiptUrl);
      setCashReceiptUrl(null);
      setCashReceiptBlob(null);
    }
  };

  const handleCashReceiptSend = async () => {
    // Generate cash receipt text to share
    const receiptText = `
${t('Cash Receipt')} ${invoice.invoiceNumber}
${t('Payment for Invoice')} ${invoice.invoiceNumber}

${t('Customer')}: ${client?.name || '-'}
${t('Made by')}: ${contractor?.name || '-'}

${t('Date of Issue')}: ${formatDate(invoice.issueDate)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
    `.trim();

    if (navigator.share) {
      try {
        let currentBlob = cashReceiptBlob;

        if (!currentBlob) {
          const result = await generateCashReceiptPDF({
            invoice,
            contractor,
            client,
            totalWithVAT,
            formatDate,
            formatPrice,
            t
          });
          currentBlob = result.pdfBlob;
        }

        const pdfFile = new File([currentBlob], `${t('Cash Receipt')}_${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

        await navigator.share({
          title: `${t('Cash Receipt')} ${invoice.invoiceNumber}`,
          text: receiptText,
          files: [pdfFile]
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing cash receipt:', error);
          // Fallback to text share
          try {
            await navigator.share({
              title: `${t('Cash Receipt')} ${invoice.invoiceNumber}`,
              text: receiptText
            });
          } catch (textError) {
            if (textError.name !== 'AbortError') {
              console.error('Error sharing text:', textError);
            }
          }
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(receiptText);
        alert(t('Cash receipt details copied to clipboard'));
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleSend = async () => {
    // Record history events (iOS compatible)
    addProjectHistoryEntry(invoice.projectId, {
      type: PROJECT_EVENTS.INVOICE_SENT,
      invoiceNumber: invoice.invoiceNumber,
      date: new Date().toISOString()
    });
    addProjectHistoryEntry(invoice.projectId, {
      type: PROJECT_EVENTS.FINISHED,
      invoiceNumber: invoice.invoiceNumber,
      date: new Date().toISOString()
    });

    // Update project status to FINISHED
    if (updateProject && invoice.categoryId && invoice.projectId) {
      updateProject(invoice.categoryId, invoice.projectId, {
        status: PROJECT_STATUS.FINISHED
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

    if (navigator.share) {
      try {
        let currentBlob = pdfBlob;

        if (!currentBlob) {
          const result = await generateInvoicePDF({
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
            t,
            options: {
              priceList: generalPriceList
            }
          });
          currentBlob = result.pdfBlob;
          setPdfBlob(currentBlob);
          setPdfUrl(result.blobUrl);
        }

        const shareData = {
          title: `${t('Invoice')} ${invoice.invoiceNumber}`,
        };

        if (currentBlob && navigator.canShare && navigator.canShare({ files: [new File([currentBlob], 'test.pdf', { type: 'application/pdf' })] })) {
          const file = new File([currentBlob], `${t('Invoice')} ${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
          shareData.files = [file];
        } else {
          shareData.text = invoiceText;
        }

        await navigator.share(shareData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(invoiceText);
        }
      }
    } else {
      fallbackShare(invoiceText);
    }
  };

  const fallbackShare = (text) => {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 sm:p-2 lg:p-4 animate-fade-in" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl lg:rounded-2xl w-full max-w-3xl h-[85dvh] lg:h-auto lg:max-h-[90dvh] flex flex-col animate-slide-in-bottom lg:animate-slide-in" onClick={(e) => e.stopPropagation()}>
        {/* Header - iOS style with large invoice number */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              {/* Large Invoice Number - iOS style (40pt equivalent) */}
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('Price offer')} {formatProjectNumber(project) || invoice.invoiceNumber}
              </p>
            </div>
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status Badge with Mark as Paid - iOS style */}
          <div className="flex items-center gap-3 mt-4">
            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${invoice.status === INVOICE_STATUS.PAID
              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
              : invoice.status === INVOICE_STATUS.AFTER_MATURITY
                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
              }`}>
              {t(invoice.status === INVOICE_STATUS.PAID ? 'Paid'
                : invoice.status === INVOICE_STATUS.AFTER_MATURITY ? 'afterMaturity'
                  : 'Unpaid')}
            </span>

            {invoice.status !== INVOICE_STATUS.PAID && (
              <button
                onClick={handleMarkAsPaid}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-semibold transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                {t('Mark as Paid')}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Clickable Client Card - iOS style */}
          {client && (
            <button
              onClick={handleViewClient}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('Client')}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{client.name}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Clickable Project Card - iOS style */}
          {!hideViewProject && project && (
            <button
              onClick={handleViewProject}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('Project')}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Clickable Contractor Card - iOS style */}
          {contractor && (
            <button
              onClick={handleViewContractor}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                  <Building className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('Contractor')}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{contractor.name}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* PDF Section - iOS style with 3 buttons */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">{t('Invoice PDF')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handlePreview}
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Eye className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Preview')}</span>
              </button>
              <button
                onClick={handleSend}
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Send className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Send')}</span>
              </button>
              <button
                onClick={handleStartEdit}
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Edit3 className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Edit')}</span>
              </button>
            </div>
          </div>

          {/* Cash Receipt Section - iOS style (only if cash payment) */}
          {invoice.paymentMethod === 'cash' && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-base font-semibold text-gray-900 dark:text-white">{t('Cash Receipt')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCashReceiptPreview}
                  className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Preview')}</span>
                </button>
                <button
                  onClick={handleCashReceiptSend}
                  className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Send className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t('Send')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Invoice Details Card */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">{t('Invoice Details')}</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Invoice Number')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Issue Date')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Due Date')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('Payment Method')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  {t(invoice.paymentMethod === 'cash' ? 'Cash' : 'Bank transfer')}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
              <span className="text-base font-semibold text-gray-900 dark:text-white block mb-2">{t('Notes')}</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Price Summary */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <span className="text-base font-semibold text-gray-900 dark:text-white block mb-3">{t('Price Summary')}</span>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('without VAT')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">{formatPrice(totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('VAT (23%)')}</span>
                <span className="text-base font-medium text-gray-900 dark:text-white">{formatPrice(vat)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{t('Total price')}</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalWithVAT)}</span>
              </div>
            </div>
          </div>

          {/* Delete Button - iOS style at bottom */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-4 rounded-2xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            {t('Delete Invoice')}
          </button>
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

      {/* Cash Receipt Preview Modal */}
      <PDFPreviewModal
        isOpen={showCashReceiptPreview}
        onClose={handleCloseCashReceiptPreview}
        pdfUrl={cashReceiptUrl}
        onSend={() => {
          handleCloseCashReceiptPreview();
          handleCashReceiptSend();
        }}
        title={`${t('Cash Receipt')} ${invoice.invoiceNumber}`}
      />
    </div>
  );
};

export default InvoiceDetailModal;

// Export PDF generation function for use in other components
export { InvoiceDetailModal };
