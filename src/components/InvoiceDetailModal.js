import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Eye, Send, User, Trash2, ChevronRight, Building2, Check, PencilRuler, FileText as DocIcon, RotateCcw, Flag, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';
import { generateInvoicePDF, generateCashReceiptPDF } from '../utils/pdfGenerator';
import { PROJECT_EVENTS, INVOICE_STATUS, PROJECT_STATUS, formatProjectNumber } from '../utils/dataTransformers';
import { WORK_ITEM_NAMES } from '../config/constants';
import InvoiceCreationModal from './InvoiceCreationModal';
import PDFPreviewModal from './PDFPreviewModal';
import ClientForm from './ClientForm';
import ContractorProfileModal from './ContractorProfileModal';
import ConfirmationModal from './ConfirmationModal';

import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../context/AuthContext';
import api from '../services/supabaseApi';


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
const InvoiceDetailModal = ({ isOpen, onClose, invoice: invoiceProp, hideViewProject = false, dennikOwnerContractor = null }) => {
  useScrollLock(isOpen);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { updateInvoice, deleteInvoice, updateClient, updateContractor, contractors, findProjectById, calculateProjectTotalPrice, calculateProjectTotalPriceWithBreakdown, formatPrice, clients, generalPriceList, addProjectHistoryEntry, invoices, updateProject } = useAppData();
  const navigate = useNavigate();

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showCreditNoteCreationModal, setShowCreditNoteCreationModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  // Cash receipt state
  const [showCashReceiptPreview, setShowCashReceiptPreview] = useState(false);
  const [cashReceiptUrl, setCashReceiptUrl] = useState(null);
  const [cashReceiptBlob, setCashReceiptBlob] = useState(null);

  const clientFormRef = useRef(null);

  // State for owner contractor lookup (Denník invoices)
  const [ownerContractor, setOwnerContractor] = useState(null);

  // State for file selection modal
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());

  // Use live invoice data from global state
  const invoice = invoices?.find(inv => inv.id === invoiceProp?.id) || invoiceProp;
  const invoiceNumber = invoice?.invoiceNumber || invoice?.number || '';
  const getDocumentLabel = (type = invoice?.invoiceType) => {
    if (type === 'proforma') return t('Proforma Invoice');
    if (type === 'delivery') return t('Delivery Note');
    if (type === 'credit_note') return t('Credit Note');
    return t('Invoice');
  };

  // Detect Denník invoice: all items are hour-based work entries
  const isDennikInvoice = invoice?.invoiceItems?.length > 0
    && invoice.invoiceItems.every(item => item.unit === 'h');

  // Filter invoices for this project to show in ClientForm
  const projectResultForMemo = invoice ? findProjectById(invoice.projectId, invoice.categoryId) : null;
  const projectForMemo = projectResultForMemo?.project;
  const clientForMemo = invoice ? (clients.find(c => c.id === invoice.clientId)
    || contractors.find(c => c.id === invoice.clientId)
    || (isDennikInvoice ? (dennikOwnerContractor || ownerContractor) : null)) : null;

  const projectInvoices = useMemo(() => {
    if (!projectForMemo?.id || !invoices) return [];
    return invoices.filter(inv => inv.projectId === projectForMemo.id).sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  }, [projectForMemo?.id, invoices]);

  const clientWithInvoices = useMemo(() => {
    if (!clientForMemo) return null;
    return { ...clientForMemo, invoices: projectInvoices, projectName: projectForMemo?.name };
  }, [clientForMemo, projectInvoices, projectForMemo?.name]);

  // Fetch owner's contractor for Denník invoices (Odberateľ)
  useEffect(() => {
    if (!isDennikInvoice || !invoice?.projectId || invoice?.clientId) return;
    const fetchOwnerContractor = async () => {
      try {
        const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
        const proj = projectResult?.project;
        if (!proj) return;
        // Use the project's contractor_id to get the correct owner contractor
        const contractorId = proj.contractor_id || proj.contractorId;
        if (contractorId) {
          const { data } = await api.supabase
            .from('contractors')
            .select('*')
            .eq('c_id', contractorId)
            .limit(1);
          if (data && data.length > 0) {
            setOwnerContractor({ ...data[0], id: data[0].c_id });
            return;
          }
        }
        // Fallback: fetch by owner user_id (most recent)
        if (proj.user_id) {
          const { data } = await api.supabase
            .from('contractors')
            .select('*')
            .eq('user_id', proj.user_id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (data && data.length > 0) {
            setOwnerContractor({ ...data[0], id: data[0].c_id });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch owner contractor for Denník invoice:', err);
      }
    };
    fetchOwnerContractor();
  }, [isDennikInvoice, invoice?.projectId, invoice?.clientId, invoice?.categoryId, findProjectById]);

  if (!isOpen || !invoice) return null;

  const contractor = contractors.find(c => c.id === invoice.contractorId);
  const projectResult = findProjectById(invoice.projectId, invoice.categoryId);
  const project = projectResult?.project;
  const rawProjectBreakdown = calculateProjectTotalPriceWithBreakdown(invoice.projectId);
  // For Denník invoices with no client_id, use the passed prop or fetched owner contractor
  const client = clients.find(c => c.id === invoice.clientId)
    || contractors.find(c => c.id === invoice.clientId)
    || (isDennikInvoice ? (dennikOwnerContractor || ownerContractor) : null);

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
          vatRate: (item.vat !== undefined) ? item.vat / 100 : ((original.vatRate !== undefined && original.vatRate !== null) ? original.vatRate : 0.23),


          // Ensure propertyId is preserved for grouping logic in PDF generator
          // Do NOT fallback to 'custom_work' - items without originalItem.propertyId should
          // go through the generic translation path in the PDF generator
          propertyId: original.propertyId,

          // Ensure fields are preserved for specific logic (e.g. scaffolding)
          // CRITICAL: Sync item.title (which is editable) to fields.Name specifically for custom work
          // This ensures PDF generator picks up the displayed name instead of falling back to default "Custom work"
          fields: {
            ...(original.fields || {}),
            [WORK_ITEM_NAMES.NAME]: item.title
          },
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
    const source = project?.priceListSnapshot || generalPriceList || {};
    const vatItem = source.others?.find(item => item.name === 'VAT' || item.name === 'DPH');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const vatRate = getVATRate();
  // Use invoice's saved values if available (they reflect active items only)
  // Otherwise calculate from the filtered project breakdown
  const totalWithoutVAT = invoice.priceWithoutVat || projectBreakdown?.total || 0;
  const vat = invoice.cumulativeVat !== undefined ? invoice.cumulativeVat : (totalWithoutVAT * vatRate);
  const totalWithVAT = totalWithoutVAT + vat;
  const paidAdvanceTotal = invoice.invoiceType === 'regular' && invoice.projectId
    ? (invoices || []).reduce((sum, inv) => {
      if (inv.id === invoice.id) return sum;
      if (inv.projectId !== invoice.projectId) return sum;
      if ((inv.invoiceType || 'regular') !== 'proforma') return sum;
      if (inv.is_deleted) return sum;
      return sum + Number(inv.priceWithoutVat || 0);
    }, 0)
    : 0;
  const amountDue = Math.max(0, totalWithVAT - paidAdvanceTotal);
  const invoiceForPdf = { ...invoice, invoiceNumber, paidAdvanceTotal, amountDue };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onClose(true);
    deleteInvoice(invoice.id).catch(error => {
      console.error('Error deleting invoice:', error);
    });
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
    setShowClientModal(true);
  };

  const handleViewContractor = () => {
    setShowContractorModal(true);
  };

  const handleSaveClient = async (clientData) => {
    try {
      await updateClient(invoice.clientId, clientData);
      setShowClientModal(false);
    } catch (error) {
      console.error('Error updating client:', error);
      alert(t('Failed to update client'));
    }
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      await updateContractor(invoice.contractorId, contractorData);
      setShowContractorModal(false);
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert(t('Failed to update contractor'));
    }
  };

  // Mobile/PWA detection for PDF handling
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
  const shouldUseNativePdfViewer = isMobile && !(isIOS && isStandalone);

  const openPdfInNewTab = (blobUrl, filename) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = async () => {
    try {
      const result = await generateInvoicePDF({
        invoice: invoiceForPdf,
        contractor,
        client,
        projectBreakdown: isDennikInvoice ? null : projectBreakdown,
        vatRate,
        totalWithoutVAT,
        vat,
        totalWithVAT,
        formatDate,
        formatPrice,
        t,
        options: {
          priceList: generalPriceList,
          projectNumber: formatProjectNumber(project),
          projectCategory: project?.category,
          language: language,
          isDennik: isDennikInvoice
        }
      });

      setPdfUrl(result.blobUrl);
      setPdfBlob(result.pdfBlob);

      if (shouldUseNativePdfViewer) {
        const filename = `${getDocumentLabel()} ${invoiceNumber}.pdf`;
        openPdfInNewTab(result.blobUrl, filename);
      } else {
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
        invoice: invoiceForPdf,
        contractor,
        client,
        totalWithVAT,
        vatRate,
        formatDate,
        formatPrice,
        t
      });

      setCashReceiptUrl(result.blobUrl);
      setCashReceiptBlob(result.pdfBlob);

      if (shouldUseNativePdfViewer) {
        const filename = `${t('Cash Receipt')} ${invoiceNumber}.pdf`;
        openPdfInNewTab(result.blobUrl, filename);
      } else {
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
${t('Cash Receipt')} ${invoiceNumber}
${t('Payment for Invoice')} ${invoiceNumber}

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
            invoice: invoiceForPdf,
            contractor,
            client,
            totalWithVAT,
            vatRate,
            formatDate,
            formatPrice,
            t
          });
          currentBlob = result.pdfBlob;
        }

        const pdfFile = new File([currentBlob], `${t('Cash Receipt')}_${invoiceNumber}.pdf`, { type: 'application/pdf' });

        await navigator.share({
          title: `${t('Cash Receipt')} ${invoiceNumber}`,
          text: receiptText,
          files: [pdfFile]
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing cash receipt:', error);
          // Fallback to text share
          try {
            await navigator.share({
              title: `${t('Cash Receipt')} ${invoiceNumber}`,
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


  const toggleFileSelection = (fileId) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFileIds(newSelected);
  };

  const handleSend = () => {
    // If project has files, ask user. Otherwise just send invoice.
    if (project?.photos && project.photos.length > 0) {
      setShowFileSelectionModal(true);
    } else {
      executeSend([]);
    }
  };

  const handleConfirmBundle = () => {
    const filesToAttach = [];
    if (project?.photos) {
      project.photos.forEach(photo => {
        if (selectedFileIds.has(photo.id)) {
          try {
            const file = dataURLtoFile(photo.url, photo.name);
            filesToAttach.push(file);
          } catch (e) {
            console.error('Error converting file:', e);
          }
        }
      });
    }
    setShowFileSelectionModal(false);
    executeSend(filesToAttach);
  };

  const dataURLtoFile = (dataurl, filename) => {
    if (!dataurl) return null;
    // If URL is not data URI but remote URL, this won't work directly without fetch.
    // Assuming data URI as per ProjectDetailView implementation.
    // If it is regular URL (Supabase storage), we would need to fetch it.
    // For now, handle data URI.
    if (!dataurl.startsWith('data:')) {
      // If it's a remote URL, we can't sync attach it easily without async fetch. 
      // For now, let's assume base64 as that's what we implemented.
      return null;
    }

    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  };

  const executeSend = async (additionalFiles = []) => {
    // Record history events (iOS compatible)
    let eventType = PROJECT_EVENTS.INVOICE_SENT;
    const iType = invoice.invoiceType;

    if (iType === 'proforma') eventType = PROJECT_EVENTS.PROFORMA_INVOICE_SENT;
    else if (iType === 'delivery') eventType = PROJECT_EVENTS.DELIVERY_NOTE_SENT;
    else if (iType === 'credit_note') eventType = PROJECT_EVENTS.CREDIT_NOTE_SENT;

    addProjectHistoryEntry(invoice.projectId, {
      type: eventType,
      invoiceNumber,
      date: new Date().toISOString()
    });


    // Only mark project as finished if it IS a regular invoice
    if (!iType || iType === 'regular') {
      addProjectHistoryEntry(invoice.projectId, {
        type: PROJECT_EVENTS.FINISHED,
        invoiceNumber,
        date: new Date().toISOString()
      });

      // Update project status to FINISHED
      if (updateProject && invoice.categoryId && invoice.projectId) {
        updateProject(invoice.categoryId, invoice.projectId, {
          status: PROJECT_STATUS.FINISHED
        });
      }
    }

    // Generate invoice data to share
    const invoiceText = `
${getDocumentLabel()} ${invoiceNumber}
${invoice.projectName}

${t('Contractor')}: ${contractor?.name || '-'}
${t('Client')}: ${client?.name || '-'}

${t('Issue Date')}: ${formatDate(invoice.issueDate)}
${t('Due Date')}: ${formatDate(invoice.dueDate)}
${t('Payment Method')}: ${t(invoice.paymentMethod === 'cash' ? 'Cash' : 'Transfer')}

${t('without VAT')}: ${formatPrice(totalWithoutVAT)}
${t('VAT')} (${Math.round(vatRate * 100)}%): ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${paidAdvanceTotal > 0 ? `\n${t('Paid advance')}: -${formatPrice(paidAdvanceTotal)}` : ''}
${paidAdvanceTotal > 0 ? `\n${t('Amount due')}: ${formatPrice(amountDue)}` : ''}
${invoice.notes ? `\n${t('Notes')}: ${invoice.notes}` : ''}
    `.trim();

    if (navigator.share) {
      try {
        let currentBlob = pdfBlob;

        if (!currentBlob) {
          const result = await generateInvoicePDF({
            invoice: invoiceForPdf,
            contractor,
            client,
            projectBreakdown: isDennikInvoice ? null : projectBreakdown,
            vatRate,
            totalWithoutVAT,
            vat,
            totalWithVAT,
            formatDate,
            formatPrice,
            t,
            options: {
              priceList: generalPriceList,
              projectCategory: project?.category,
              isDennik: isDennikInvoice
            }
          });
          currentBlob = result.pdfBlob;
          setPdfBlob(currentBlob);
          setPdfUrl(result.blobUrl);
        }

        const shareData = {
          title: `${getDocumentLabel()} ${invoiceNumber}`,
        };

        const invoiceFile = new File([currentBlob], `${getDocumentLabel()} ${invoiceNumber}.pdf`, { type: 'application/pdf' });
        const allFiles = [invoiceFile, ...additionalFiles];

        if (navigator.canShare && navigator.canShare({ files: allFiles })) {
          shareData.files = allFiles;
        } else {
          // Fallback if multiple files not supported or file type issue?
          // Try sharing just invoice if bundle fails?
          // For now attempt bundle.
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


  // File Selection Modal
  if (showFileSelectionModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setShowFileSelectionModal(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('Attach Files')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('Select files to send with the invoice:')}</p>

          <div className="flex-1 overflow-y-auto min-h-[100px] mb-4 space-y-2">
            {project?.photos?.map(file => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedFileIds.has(file.id)
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedFileIds.has(file.id)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  {selectedFileIds.has(file.id) && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {file.type === 'pdf' || file.name?.endsWith('.pdf') ? (
                    <DocIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={file.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowFileSelectionModal(false);
                executeSend([]);
              }}
              className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              {t('Invoice Only')}
            </button>
            <button
              onClick={handleConfirmBundle}
              className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              {t('Send Files')} ({selectedFileIds.size + 1})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-0 sm:p-2 lg:p-4 animate-fade-in" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl lg:rounded-2xl w-full max-w-3xl h-[100dvh] lg:h-auto lg:max-h-[90dvh] flex flex-col animate-slide-in-bottom lg:animate-slide-in my-0 lg:my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header - iOS style with large invoice number */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Large Invoice Number - iOS style (40pt equivalent) */}
              <h1 className="text-[40px] lg:text-5xl font-[900] text-gray-900 dark:text-white mb-1 truncate leading-[1.1]">
                {invoice.invoiceType === 'proforma' ? t('Proforma Invoice') :
                  invoice.invoiceType === 'delivery' ? t('Delivery Note') :
                    invoice.invoiceType === 'credit_note' ? t('Credit Note') :
                      t('Invoice')} {invoiceNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-200">
                {/* Dates removed as per request */}
              </div>
              <div className="lg:hidden mt-2">
                {invoice.status !== INVOICE_STATUS.PAID ? (
                  <button
                    onClick={handleMarkAsPaid}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px]"
                  >
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white uppercase">{t('Mark as Paid')}</span>
                  </button>
                ) : (
                  <div onClick={handleMarkAsPaid} className="cursor-pointer">
                    <span className="px-2.5 py-1 text-[11px] font-bold bg-green-100 dark:bg-green-900/50 text-white dark:text-gray-900 rounded-[10px] uppercase" style={{ backgroundColor: '#73D38A' }}>
                      {t('Paid')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:block">
                {invoice.status !== INVOICE_STATUS.PAID ? (
                  <button
                    onClick={handleMarkAsPaid}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-nowrap"
                  >
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                    <span className="text-base font-bold text-gray-900 dark:text-white">{t('Mark as Paid')}</span>
                  </button>
                ) : (
                  <div onClick={handleMarkAsPaid} className="cursor-pointer">
                    <span className="px-4 py-2 text-sm font-bold bg-green-100 dark:bg-green-900/50 text-white dark:text-gray-900 rounded-full" style={{ backgroundColor: '#73D38A' }}>
                      {t('Paid')}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onClose()}
                className="modal-close-btn ml-2"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-[15px] py-6 lg:p-6 space-y-8">
          {/* Clickable Client Card - iOS style */}
          {client && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Client')}</h2>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={handleViewClient}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[20px] lg:rounded-2xl p-[15px] lg:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-[20px] lg:text-xl font-semibold lg:font-[900] text-gray-900 dark:text-white leading-tight truncate">{client.name}</p>
                  {(client.street || client.city) && (
                    <p className="text-base text-gray-500 dark:text-gray-400 truncate mt-1">
                      {[client.street, client.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Clickable Project Card - Scaled down to match others */}
          {!hideViewProject && project && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <PencilRuler className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Project')}</h2>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={handleViewProject}
                className={`w-full ${(project.userRole || 'owner') !== 'owner' ? 'bg-green-50/80 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'} rounded-[20px] lg:rounded-2xl p-[15px] lg:p-4 flex items-center transition-colors duration-200 ${(project.userRole || 'owner') !== 'owner' ? 'hover:bg-green-100/80 dark:hover:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} cursor-pointer text-left`}
              >
                <div className="flex-1 transition-all duration-300 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatProjectNumber(project) || project.id}</span>
                    {(project.userRole || 'owner') !== 'owner' && (
                      <span className="px-2 py-0.5 text-[10px] lg:text-xs font-bold bg-green-100 dark:bg-green-900/40 text-white dark:text-white rounded-lg border-2 border-green-500 dark:border-green-400">
                        {t('Assigned projects')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-[900] text-gray-900 dark:text-white truncate">
                    <span>{project.name}</span>
                  </h3>
                  {/* Client name */}
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                    {client?.name || t('No client')}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-right">
                    {/* Status Badge */}
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] lg:text-xs font-medium rounded-full mb-1 text-white dark:text-gray-900 shrink-0 status-badge-dark"
                      style={{
                        backgroundColor:
                          project.status === PROJECT_STATUS.FINISHED ? '#C4C4C4' :
                            project.status === PROJECT_STATUS.APPROVED ? '#73D38A' :
                              project.status === PROJECT_STATUS.SENT ? '#51A2F7' :
                                '#FF857C',
                        '--status-color':
                          project.status === PROJECT_STATUS.FINISHED ? '#C4C4C4' :
                            project.status === PROJECT_STATUS.APPROVED ? '#73D38A' :
                              project.status === PROJECT_STATUS.SENT ? '#51A2F7' :
                                '#FF857C'
                      }}
                    >
                      {project.status === PROJECT_STATUS.FINISHED ? (
                        <>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-white">
                            <Flag size={9} className="cutout-icon" />
                          </span>
                          <span className="whitespace-nowrap status-badge-dark-text">{t('finished')}</span>
                        </>
                      ) : project.status === PROJECT_STATUS.APPROVED ? (
                        <>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-white">
                            <CheckCircle size={9} className="cutout-icon" />
                          </span>
                          <span className="whitespace-nowrap status-badge-dark-text">{t('approved')}</span>
                        </>
                      ) : project.status === PROJECT_STATUS.SENT ? (
                        <>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-white">
                            <span className="text-[9px] lg:text-[10px] font-bold cutout-text">?</span>
                          </span>
                          <span className="whitespace-nowrap status-badge-dark-text">{t('sent')}</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-white">
                            <X size={9} className="cutout-icon" />
                          </span>
                          <span className="whitespace-nowrap status-badge-dark-text">{t('not sent')}</span>
                        </>
                      )}
                    </span>
                    {/* Price */}
                    <div className="font-bold text-gray-900 dark:text-white text-base">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{t('VAT not included')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          )}

          {/* Clickable Contractor Card - Reduced hover effect */}
          {contractor && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Contractor')}</h2>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={handleViewContractor}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[20px] lg:rounded-2xl p-[15px] lg:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-[20px] lg:text-xl font-semibold lg:font-[900] text-gray-900 dark:text-white leading-tight truncate">{contractor.name}</p>
                  {contractor.businessId && (
                    <p className="text-base text-gray-500 dark:text-gray-400 truncate mt-1">
                      {contractor.businessId}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </div>
            </div>
          )}





          {/* PDF Section - iOS style with 3 buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <DocIcon className="w-6 h-6 text-gray-900 dark:text-white" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PDF</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handlePreview}
                className="flex flex-col items-center justify-center py-2 lg:py-3 bg-white dark:bg-gray-800 strictly-black-border rounded-[20px] lg:rounded-[24px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span className="text-[16px] lg:text-xl font-semibold lg:font-bold text-gray-900 dark:text-white">{t('Preview')}</span>
              </button>
              <button
                onClick={handleSend}
                className="flex flex-col items-center justify-center py-2 lg:py-3 bg-white dark:bg-gray-800 strictly-black-border rounded-[20px] lg:rounded-[24px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span className="text-[16px] lg:text-xl font-semibold lg:font-bold text-gray-900 dark:text-white">{t('Send')}</span>
              </button>
              <button
                onClick={handleStartEdit}
                className="flex flex-col items-center justify-center py-2 lg:py-3 bg-white dark:bg-gray-800 strictly-black-border rounded-[20px] lg:rounded-[24px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span className="text-[16px] lg:text-xl font-semibold lg:font-bold text-gray-900 dark:text-white">{t('Edit')}</span>
              </button>
            </div>
            {invoice.invoiceType !== 'credit_note' && invoice.invoiceType !== 'delivery' && (() => {
              const hasCreditNote = invoices?.some(inv =>
                inv.invoiceType === 'credit_note' &&
                inv.projectId === invoice.projectId &&
                !inv.is_deleted
              );
              return hasCreditNote ? (
                <div className="w-full flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-800 rounded-[24px] mt-3 opacity-50">
                  <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('Credit note already issued')}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreditNoteCreationModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full transition-all btn-blue-gradient bg-blue-600 text-white !mt-[20px] lg:!mt-[30px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-lg font-bold">{t('Issue Credit Note')}</span>
                </button>
              );
            })()}
          </div>

          {/* Cash Receipt Section - iOS style (only if cash payment) */}
          {invoice.paymentMethod === 'cash' && (
            <div className="space-y-3">
              <button
                onClick={handleCashReceiptPreview}
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-[24px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-gray-900 dark:text-white" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{t('Preview Cash Receipt')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
              <button
                onClick={handleCashReceiptSend}
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-[24px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 text-gray-900 dark:text-white" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{t('Resend Cash Receipt')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>
          )}

          {/* Delete Button - iOS style at bottom (only show if current user owns the invoice) */}
          {(!invoice?.user_id || invoice.user_id === user?.id) && (
            <div className="flex justify-center pb-12 px-4 !mt-[20px] lg:!mt-[30px]">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full max-w-sm py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 btn-red destructive-btn invoice-delete-btn active:scale-95 text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-xl">{t('Delete')}</span>
              </button>
            </div>
          )}

          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title={(() => {
              if (invoice.invoiceType === 'proforma') return t('Delete Proforma Invoice');
              if (invoice.invoiceType === 'delivery') return t('Delete Delivery Note');
              if (invoice.invoiceType === 'credit_note') return t('Delete Credit Note');
              return t('Delete Invoice');
            })()}
            message={(() => {
              if (invoice.invoiceType === 'proforma') return t('Are you sure you want to delete this proforma invoice? This action cannot be undone.');
              if (invoice.invoiceType === 'delivery') return t('Are you sure you want to delete this delivery note? This action cannot be undone.');
              if (invoice.invoiceType === 'credit_note') return t('Are you sure you want to delete this credit note? This action cannot be undone.');
              return t('Are you sure you want to delete this invoice? This action cannot be undone.');
            })()}
            confirmLabel={t('Delete')}
            isDestructive={true}
          />
        </div>
      </div>

      {/* Modals */}
      <InvoiceCreationModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        project={project}
        categoryId={invoice.categoryId}
        editMode={true}
        existingInvoice={invoice}
      />

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={handleClosePDFPreview}
        pdfUrl={pdfUrl}
        onSend={() => {
          handleClosePDFPreview();
          handleSend();
        }}
        title={`${getDocumentLabel()} ${invoiceNumber}`}
      />

      <PDFPreviewModal
        isOpen={showCashReceiptPreview}
        onClose={handleCloseCashReceiptPreview}
        pdfUrl={cashReceiptUrl}
        onSend={() => {
          handleCloseCashReceiptPreview();
          handleCashReceiptSend();
        }}
        title={`${t('Cash Receipt')} ${invoiceNumber}`}
      />

      <InvoiceCreationModal
        isOpen={showCreditNoteCreationModal}
        onClose={() => setShowCreditNoteCreationModal(false)}
        project={project}
        categoryId={invoice.categoryId}
        editMode={false}
        existingInvoice={invoice}
        isCreditNoteCreation={true}
      />

      {/* Client Modal - Matching ProjectDetailView style/size */}
      {
        showClientModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4 overflow-hidden animate-fade-in" onClick={() => clientFormRef.current?.submit()}>
            <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-slide-in flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Edit client')}</h3>
                <button onClick={() => clientFormRef.current?.submit()} className="modal-close-btn" aria-label="Close">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 lg:p-6 flex-1 overflow-y-auto">
                <ClientForm
                  ref={clientFormRef}
                  initialData={clientWithInvoices}
                  onSave={handleSaveClient}
                  onCancel={() => setShowClientModal(false)}
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Contractor Modal */}
      {
        showContractorModal && (
          <ContractorProfileModal
            onClose={() => setShowContractorModal(false)}
            onSave={handleSaveContractor}
            editingContractor={contractor}
          />
        )
      }

      </div>
  );
};

export default InvoiceDetailModal;

export { InvoiceDetailModal };
