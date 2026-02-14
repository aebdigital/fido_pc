import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Eye, Send, User, Edit3, Trash2, ChevronRight, Building2, Check, PencilRuler, FileText as DocIcon, Trash } from 'lucide-react';
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

import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../context/AuthContext';
import api from '../services/supabaseApi';
import Linkify from '../utils/linkify';

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
  useScrollLock(true);
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
          vatRate: (item.vat !== undefined) ? item.vat / 100 : (original.vatRate || 0.23),


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

  // Check if mobile device
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handlePreview = async () => {
    try {
      const result = await generateInvoicePDF({
        invoice: invoice,
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
        vatRate,
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
            vatRate,
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
${t('VAT')} (${Math.round(vatRate * 100)}%): ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${invoice.notes ? `\n${t('Notes')}: ${invoice.notes}` : ''}
    `.trim();

    if (navigator.share) {
      try {
        let currentBlob = pdfBlob;

        if (!currentBlob) {
          const result = await generateInvoicePDF({
            invoice: invoice,
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
          title: `${t('Invoice')} ${invoice.invoiceNumber}`,
        };

        const invoiceFile = new File([currentBlob], `${t('Invoice')} ${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
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

  // File Selection Modal
  if (showFileSelectionModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setShowFileSelectionModal(false)}>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 sm:p-2 lg:p-4 animate-fade-in" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl lg:rounded-2xl w-full max-w-3xl h-[100dvh] lg:h-auto lg:max-h-[90dvh] flex flex-col animate-slide-in-bottom lg:animate-slide-in my-0 lg:my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header - iOS style with large invoice number */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Large Invoice Number - iOS style (40pt equivalent) */}
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-1 truncate leading-[1.1]">
                {invoice.invoiceNumber}
              </h1>
              {project && (
                <p className="text-sm font-medium text-gray-900 dark:text-gray-400">
                  {formatProjectNumber(project)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                  <span className="px-4 py-2 text-sm font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full">
                    {t('Paid')}
                  </span>
                </div>
              )}

              <button
                onClick={() => onClose()}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-2"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Clickable Client Card - iOS style */}
          {client && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Client')}</h2>
              </div>
              <button
                onClick={handleViewClient}
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">{client.name}</p>
                  {(client.street || client.city) && (
                    <p className="text-base text-gray-500 dark:text-gray-400 truncate mt-1">
                      {[client.street, client.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Clickable Project Card - Scaled down to match others */}
          {!hideViewProject && project && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <PencilRuler className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Project')}</h2>
              </div>
              <button
                onClick={handleViewProject}
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center transition-colors duration-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 cursor-pointer text-left"
              >
                <div className="flex-1 transition-all duration-300 min-w-0">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatProjectNumber(project) || project.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
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
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-0.5 ${project.status === PROJECT_STATUS.FINISHED
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      : project.status === PROJECT_STATUS.APPROVED
                        ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : project.status === PROJECT_STATUS.SENT
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                      }`}>
                      {t(project.status === PROJECT_STATUS.FINISHED ? 'finished'
                        : project.status === PROJECT_STATUS.APPROVED ? 'approved'
                          : project.status === PROJECT_STATUS.SENT ? 'sent'
                            : 'not sent')}
                    </span>
                    {/* Price */}
                    <div className="font-bold text-gray-900 dark:text-white text-base">{formatPrice(calculateProjectTotalPrice(project.id))}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{t('VAT not included')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </button>
            </div>
          )}

          {/* Clickable Contractor Card - Reduced hover effect */}
          {contractor && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-6 h-6 text-gray-900 dark:text-white" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Contractor')}</h2>
              </div>
              <button
                onClick={handleViewContractor}
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">{contractor.name}</p>
                  {contractor.ico && (
                    <p className="text-base text-gray-500 dark:text-gray-400 truncate mt-1">
                      {t('BID Abbr')}: {contractor.ico}
                    </p>
                  )}
                  {(contractor.city || contractor.street) && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {[contractor.street, contractor.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Notes Section - show if invoice has notes */}
          {invoice.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                <Linkify>{invoice.notes}</Linkify>
              </p>
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
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Eye className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-white">{t('Preview')}</span>
              </button>
              <button
                onClick={handleSend}
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Send className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-white">{t('Send')}</span>
              </button>
              <button
                onClick={handleStartEdit}
                className="flex flex-col items-center justify-center py-3 bg-white dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Edit3 className="w-5 h-5 text-gray-900 dark:text-white mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-white">{t('Edit')}</span>
              </button>
            </div>
          </div>

          {/* Cash Receipt Section - iOS style (only if cash payment) */}
          {invoice.paymentMethod === 'cash' && (
            <div className="space-y-3">
              <button
                onClick={handleCashReceiptPreview}
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-gray-900 dark:text-white" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{t('Preview Cash Receipt')}</span>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>
              <button
                onClick={handleCashReceiptSend}
                className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-[1.5px] border-gray-900 dark:border-white rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Send className="w-6 h-6 text-gray-900 dark:text-white" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{t('Resend Cash Receipt')}</span>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
              </button>
            </div>
          )}

          {/* Delete Button - iOS style at bottom (only show if current user owns the invoice) */}
          {(!invoice?.user_id || invoice.user_id === user?.id) && (
            <div className="pt-4 flex justify-center pb-8">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full max-w-sm bg-red-600 text-white py-3 rounded-full font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Trash className="w-5 h-5" />
                <span className="text-lg">{t('Delete')}</span>
              </button>
            </div>
          )}
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
        title={`${t('Invoice')} ${invoice.invoiceNumber}`}
      />

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

      {/* Client Modal - Matching ProjectDetailView style/size */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4 overflow-hidden animate-fade-in" onClick={() => clientFormRef.current?.submit()}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-slide-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Edit client')}</h3>
              <button onClick={() => clientFormRef.current?.submit()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
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
      )}

      {/* Contractor Modal */}
      {showContractorModal && (
        <ContractorProfileModal
          onClose={() => setShowContractorModal(false)}
          onSave={handleSaveContractor}
          editingContractor={contractor}
        />
      )}
    </div>
  );
};

export default InvoiceDetailModal;

export { InvoiceDetailModal };
