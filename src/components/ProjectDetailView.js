import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ClipboardList,
  BarChart3,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  Copy,
  Archive,
  Eye,
  Send,
  Edit3,
  FileText,
  Image,
  X,
  StickyNote,
  AlertTriangle,
  Receipt,
  Loader2,
  Camera
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { generatePriceOfferPDF } from '../utils/pdfGenerator';
import { compressImage } from '../utils/imageCompression';
import { hasWorkItemInput } from '../utils/priceCalculations';
import { formatProjectNumber, PROJECT_EVENTS, INVOICE_STATUS, PROJECT_STATUS } from '../utils/dataTransformers';
import { workProperties } from '../config/workProperties';
import RoomDetailsModal from './RoomDetailsModal';
import ProjectPriceList from './ProjectPriceList';
import ContractorProfileModal from './ContractorProfileModal';
import InvoiceCreationModal from './InvoiceCreationModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import PDFPreviewModal from './PDFPreviewModal';
import ClientForm from './ClientForm';

const ProjectDetailView = ({ project, onBack, viewSource = 'projects' }) => {
  const { t } = useLanguage();
  const {
    clients,
    generalPriceList,
    contractors,
    activeContractorId,
    setActiveContractor,
    addContractor,
    addClient, // Add this
    projectCategories,
    updateProject,
    archiveProject,
    unarchiveProject,
    deleteArchivedProject,
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    calculateRoomPriceWithMaterials,
    calculateProjectTotalPrice,
    calculateProjectTotalPriceWithBreakdown,
    formatPrice,
    getInvoiceForProject,
    getInvoicesForContractor,
    loadProjectDetails,
    getProjectHistory,
    addProjectHistoryEntry,
    addProject,
    assignProjectToClient,
    removeProjectFromClient,
    priceOfferSettings,
    getProjectReceipts,
    addReceipt,
    deleteReceipt,
    analyzeReceiptImage,
    isPro // Added Pro check
  } = useAppData();

  // Local state
  const [showPaywall, setShowPaywall] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedClientForProject, setSelectedClientForProject] = useState(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showProjectPriceList, setShowProjectPriceList] = useState(false);
  const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showContractorSelector, setShowContractorSelector] = useState(false);
  const [showCreateClientInModal, setShowCreateClientInModal] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [isEditingProjectNotes, setIsEditingProjectNotes] = useState(false);
  const [editingProjectNotes, setEditingProjectNotes] = useState('');
  const [showContractorWarning, setShowContractorWarning] = useState(false);
  const [showInvoiceCreationModal, setShowInvoiceCreationModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [projectDetailNotes, setProjectDetailNotes] = useState('');
  const [isEditingDetailNotes, setIsEditingDetailNotes] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [photoPage, setPhotoPage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState(0); // -1 for left, 1 for right, 0 for initial
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoDeleteMode, setPhotoDeleteMode] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Receipt state
  const [receipts, setReceipts] = useState([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const receiptInputRef = useRef(null);

  // Refs
  const photoInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initialize data on mount or project change
  useEffect(() => {
    const initializeData = async () => {
      if (!project?.id) return;

      setIsLoadingDetails(true);
      await loadProjectDetails(project.id);
      setIsLoadingDetails(false);
    };

    initializeData();
  }, [project.id, loadProjectDetails]);

  // Sync local state with project data
  useEffect(() => {
    if (!project) return;

    if (project.clientId) {
      const assignedClient = clients.find(client => client.id === project.clientId);
      if (assignedClient) {
        setSelectedClientForProject(assignedClient);
      } else {
        setSelectedClientForProject(null);
      }
    } else {
      setSelectedClientForProject(null);
    }

    setProjectDetailNotes(project.detailNotes || '');
    setProjectPhotos(project.photos || []);
  }, [project, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowContractorSelector(false);
      }
    };

    if (showContractorSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContractorSelector]);

  // --- Handlers ---

  const getVATRate = () => {
    // Use project's price list first, fall back to general price list
    const activePriceList = project?.priceListSnapshot || generalPriceList;
    const vatItem = activePriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };

  const roomTypes = [
    t('Hallway'), t('Toilet'), t('Bathroom'), t('Kitchen'),
    t('Living room'), t('Kids room'), t('Bedroom'), t('Guest room'),
    t('Work room'), t('Custom')
  ];

  const handleEditProjectName = () => {
    setIsEditingProjectName(true);
    setEditingProjectName(project.name);
  };

  const handleSaveProjectName = () => {
    if (editingProjectName.trim()) {
      updateProject(project.category, project.id, { name: editingProjectName.trim() });
      setIsEditingProjectName(false);
    }
  };

  const handleEditProjectNotes = () => {
    setIsEditingProjectNotes(true);
    setEditingProjectNotes(project.notes || '');
  };

  const handleSaveProjectNotes = () => {
    updateProject(project.category, project.id, { notes: editingProjectNotes.trim() });
    setIsEditingProjectNotes(false);
  };

  const handleClientSelect = (client) => {
    setSelectedClientForProject(client);
    setShowClientSelector(false);

    // Update project with client info
    assignProjectToClient(client.id, project.id, project.name);
    updateProject(project.category, project.id, {
      clientId: client.id,
      clientName: client.name
    });
  };

  const handleAddRoom = async (roomType) => {
    if (roomType === t('Custom')) {
      setShowCustomRoomModal(true);
      return;
    }

    const englishRoomTypes = ['Hallway', 'Toilet', 'Bathroom', 'Kitchen', 'Living room', 'Kids room', 'Bedroom', 'Guest room', 'Work room', 'Custom'];
    const translatedTypes = englishRoomTypes.map(type => t(type));
    const englishRoomType = englishRoomTypes[translatedTypes.indexOf(roomType)] || roomType;

    const newRoom = await addRoomToProject(project.id, { name: englishRoomType });
    setShowNewRoomModal(false);
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleCustomRoomCreate = async () => {
    if (!customRoomName.trim()) return;
    const newRoom = await addRoomToProject(project.id, { name: customRoomName.trim() });
    setShowNewRoomModal(false);
    setShowCustomRoomModal(false);
    setCustomRoomName('');
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleSaveRoomWork = (roomId, workData) => {
    updateProjectRoom(project.id, roomId, { workItems: workData });
  };

  const handleDeleteRoom = (roomId) => {
    deleteProjectRoom(project.id, roomId);
  };

  const handleSaveProjectPriceList = (priceData) => {
    updateProject(project.category, project.id, { priceListSnapshot: priceData });
    // Don't close the modal - let user continue editing
    // Modal will close when user clicks the X button
  };

  const handleDuplicateProject = async () => {
    if (!activeContractorId) {
      setShowContractorWarning(true);
      return;
    }

    try {
      const duplicatedProject = {
        ...project,
        id: `${new Date().getFullYear()}${String(Date.now()).slice(-3)}`,
        name: `${project.name} Copy`,
        createdDate: new Date().toISOString()
      };
      await addProject(project.category, duplicatedProject);
      // Removed onBack() to stay on the current project detail page
      alert(t('Project duplicated successfully.'));
    } catch (error) {
      console.error('Error duplicating:', error);
      alert('Failed to duplicate project.');
    }
  };

  const handleAssignProjectContractor = async (newContractorId) => {
    try {
      await updateProject(project.category, project.id, { contractor_id: newContractorId });
      setActiveContractor(newContractorId);
      setShowContractorSelector(false);
      // Removed onBack() to keep user in project detail view
    } catch (error) {
      console.error("Failed to reassign:", error);
      alert(t("Failed to reassign project"));
    }
  };

  const handleCreateClientInModal = async (clientData) => {
    try {
      const newClient = await addClient(clientData);

      if (newClient) {
        handleClientSelect(newClient);
        setShowCreateClientInModal(false);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client.');
    }
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      const newContractor = await addContractor(contractorData);
      setShowContractorModal(false);

      // If we created a contractor from the project detail, select it immediately
      if (newContractor) {
        handleAssignProjectContractor(newContractor.id);
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
      alert('Failed to save contractor.');
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const newPhotos = [];
    for (const file of files) {
      // Compress image before storing (max 1200px, 70% quality)
      const compressedBase64 = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7
      });
      newPhotos.push({
        id: crypto.randomUUID(), // Use string UUID for iOS compatibility
        url: compressedBase64,
        name: file.name,
        createdAt: new Date().toISOString()
      });
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, project.id, { photos: updatedPhotos });
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);

    const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;

    const newPhotos = [];
    for (const file of files) {
      // Compress image before storing (max 1200px, 70% quality)
      const compressedBase64 = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7
      });
      newPhotos.push({
        id: crypto.randomUUID(), // Use string UUID for iOS compatibility
        url: compressedBase64,
        name: file.name,
        createdAt: new Date().toISOString()
      });
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, project.id, { photos: updatedPhotos });
  };

  const handlePhotoDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handleDeletePhoto = (photoId) => {
    const updatedPhotos = projectPhotos.filter(p => p.id !== photoId);
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, project.id, { photos: updatedPhotos });
  };

  const handleSaveDetailNotes = () => {
    updateProject(project.category, project.id, { detailNotes: projectDetailNotes });
    setIsEditingDetailNotes(false);
  };

  // === RECEIPT HANDLERS ===

  const loadReceipts = async () => {
    if (!project?.id) return;
    setIsLoadingReceipts(true);
    try {
      const projectReceipts = await getProjectReceipts(project.id);
      setReceipts(projectReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
    setIsLoadingReceipts(false);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingReceipt(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;

        try {
          // Analyze with GPT-4 Vision
          const analysisResult = await analyzeReceiptImage(base64Image);

          // Save receipt with analyzed data
          await addReceipt(project.id, {
            imageUrl: base64Image,
            totalAmount: analysisResult.total_amount || null,
            vendorName: analysisResult.vendor_name || null,
            date: analysisResult.date || null,
            items: analysisResult.items || [],
            rawText: analysisResult.raw_text || ''
          });

          // Refresh receipts list
          await loadReceipts();
          setIsAnalyzingReceipt(false);
        } catch (error) {
          console.error('Error analyzing receipt:', error);
          alert(t('Failed to analyze receipt. Please try again.'));
          setIsAnalyzingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setIsAnalyzingReceipt(false);
    }

    // Reset input
    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    try {
      await deleteReceipt(receiptId);
      setReceipts(receipts.filter(r => r.id !== receiptId));
      if (selectedReceipt?.id === receiptId) {
        setSelectedReceipt(null);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  const calculateReceiptsTotal = () => {
    return receipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  // Load receipts when modal opens
  useEffect(() => {
    if (showReceiptsModal && project?.id) {
      loadReceipts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReceiptsModal, project?.id]);

  // Check if mobile device
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handlePreviewPriceOffer = async () => {
    if (!isPro) { setShowPaywall(true); return; }
    // Ensure we have a valid project breakdown
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(project.id);

    // Safety check: ensure breakdown is valid
    if (!projectBreakdown) {
      alert(t('Error calculating project price. Please try again.'));
      return;
    }

    // Get contractor and client for the PDF
    const contractor = getCurrentContractor();
    const client = clients.find(c => c.id === project.clientId);

    const priceOfferData = {
      invoiceNumber: '',
      projectName: project.name,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      paymentMethod: 'transfer'
    };
    const vatRate = getVATRate();
    const totalWithoutVAT = projectBreakdown?.total || 0;
    const vat = totalWithoutVAT * vatRate;
    const totalWithVAT = totalWithoutVAT + vat;

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('sk-SK');
    };

    try {
      // Clean up any existing PDF URL before generating new one
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      const result = await generatePriceOfferPDF({
        invoice: priceOfferData,
        contractor,
        client,
        projectBreakdown,
        vatRate,
        totalWithoutVAT,
        vat,
        totalWithVAT,
        formatDate,
        formatPrice,
        projectNotes: project.notes,
        projectNumber: formatProjectNumber(project),
        offerValidityPeriod: priceOfferSettings?.timeLimit || 30
      }, t); // Pass t as the second argument

      // On mobile, open directly in browser's native PDF viewer
      if (isMobile) {
        window.open(result.blobUrl, '_blank');
      } else {
        setPdfUrl(result.blobUrl);
        setPdfBlob(result.pdfBlob);
        setShowPDFPreview(true);
      }
    } catch (error) {
      console.error('Error generating Price Offer PDF:', error);
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

  const handleSendPriceOffer = async () => {
    if (!isPro) { setShowPaywall(true); return; }
    const contractor = getCurrentContractor();
    const client = clients.find(c => c.id === project.clientId);
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(project.id);
    const vatRate = getVATRate();
    const totalWithoutVAT = projectBreakdown?.total || 0;
    const vat = totalWithoutVAT * vatRate;
    const totalWithVAT = totalWithoutVAT + vat;

    const text = `
${t('Cenová ponuka')}
${project.name}

${t('Contractor')}: ${contractor?.name || '-'}
${t('Client')}: ${client?.name || '-'}

${t('without VAT')}: ${formatPrice(totalWithoutVAT)}
${t('VAT (23%)')}: ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${project.notes ? `
${t('Notes_CP')}: ${project.notes}` : ''}
    `.trim();

    // Track history - iOS compatible
    addProjectHistoryEntry(project.id, {
      type: PROJECT_EVENTS.SENT // iOS compatible: 'sent'
    });

    // Update project status to SENT (1) - iOS compatible
    const category = projectCategories.find(cat => cat.projects.some(p => p.id === project.id));
    if (category && updateProject) {
      updateProject(category.id, project.id, {
        status: PROJECT_STATUS.SENT // iOS: 1
      });
    }

    if (navigator.share) {
      try {
        let currentBlob = pdfBlob;

        // If we don't have a blob (e.g. user clicked Send without Preview), generate it now
        if (!currentBlob) {
          const projectBreakdown = calculateProjectTotalPriceWithBreakdown(project.id);
          const result = await generatePriceOfferPDF({
            invoice: {
              invoiceNumber: '',
              projectName: project.name,
              issueDate: new Date().toISOString(),
              dueDate: new Date().toISOString(),
              paymentMethod: 'transfer'
            },
            contractor,
            client,
            projectBreakdown,
            vatRate,
            totalWithoutVAT,
            vat,
            totalWithVAT,
            formatDate: (dateString) => new Date(dateString).toLocaleDateString('sk-SK'),
            formatPrice,
            projectNotes: project.notes,
            projectNumber: formatProjectNumber(project),
            offerValidityPeriod: priceOfferSettings?.timeLimit || 30
          }, t);
          currentBlob = result.pdfBlob;
          setPdfBlob(currentBlob);
          setPdfUrl(result.blobUrl);
        }

        const shareData = {
          title: `${t('Cenová ponuka')} - ${project.name}`,
        };

        // If we have a PDF blob, try to share it as a file
        if (currentBlob && navigator.canShare && navigator.canShare({ files: [new File([currentBlob], 'test.pdf', { type: 'application/pdf' })] })) {
          const file = new File([currentBlob], `${t('Cenová ponuka')} - ${project.name}.pdf`, { type: 'application/pdf' });
          shareData.files = [file];
        } else {
          // Fallback to text if file sharing not supported
          shareData.text = text;
        }

        await navigator.share(shareData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          alert(t('Unable to share. Please try again.'));
        }
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => alert(t('Invoice details copied to clipboard')))
          .catch(() => alert(t('Unable to share. Please try again.')));
      } else {
        alert(t('Sharing not supported on this device'));
      }
    }
  };

  return (
    <div className="flex-1 p-0 lg:p-6 overflow-y-auto min-w-0">

      {/* Project Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 lg:gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            {isEditingProjectName ? (
              <input
                type="text"
                value={editingProjectName}
                onChange={(e) => setEditingProjectName(e.target.value)}
                onBlur={handleSaveProjectName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveProjectName();
                  if (e.key === 'Escape') setIsEditingProjectName(false);
                }}
                className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                autoFocus
              />
            ) : (
              <>
                <h1 className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                {!project.is_archived && (
                  <button
                    onClick={handleEditProjectName}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base lg:text-lg text-gray-700 dark:text-gray-300">{formatProjectNumber(project) || project.id}</span>
            {project.is_archived && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs lg:text-sm font-semibold rounded-full">
                {t('Archived')}
              </span>
            )}
            {/* Project Status Badge - Uses same logic as Projects list */}
            <span className={`px-2 py-1 text-xs lg:text-sm font-semibold rounded-full ${project.status === PROJECT_STATUS.FINISHED
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
          </div>
          <div className="flex items-center gap-3">
            {isEditingProjectNotes ? (
              <input
                type="text"
                value={editingProjectNotes}
                onChange={(e) => setEditingProjectNotes(e.target.value)}
                onBlur={handleSaveProjectNotes}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveProjectNotes();
                  if (e.key === 'Escape') setIsEditingProjectNotes(false);
                }}
                className="text-lg text-gray-500 dark:text-gray-400 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                placeholder={t('Notes_CP')}
                autoFocus
              />
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {project.notes || t('Notes_CP')}
                </p>
                {!project.is_archived && (
                  <button
                    onClick={handleEditProjectNotes}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 space-y-4 lg:space-y-6 min-w-0">

          {/* Client Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Klient')}</h2>
            </div>
            <div
              onClick={() => !project.is_archived && setShowClientSelector(true)}
              className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm ${!project.is_archived ? 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 dark:text-white text-lg">
                  {selectedClientForProject ? selectedClientForProject.name : t('No client')}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                  {selectedClientForProject ? selectedClientForProject.email : t('Associate project with a client')}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!project.is_archived && selectedClientForProject && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProjectFromClient(selectedClientForProject.id, project.id);
                      updateProject(project.category, project.id, { clientId: null });
                      setSelectedClientForProject(null);
                    }}
                    className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title={t('Remove')}
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                {!project.is_archived && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
              </div>
            </div>
          </div>

          {/* Project Rooms Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Projekt')}</h2>
              </div>
              {!project.is_archived && (
                <div className="flex gap-2">
                  <button
                    className="p-3 rounded-2xl flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
                    onClick={() => setDeleteMode(!deleteMode)}
                  >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                  <button
                    className="p-3 rounded-2xl flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    onClick={() => setShowNewRoomModal(true)}
                  >
                    <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {isLoadingDetails ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400 font-semibold">{t('Loading project details...')}</p>
                </div>
              ) : (
                <>
                  {getProjectRooms(project.id).map(room => (
                    <div
                      key={room.id}
                      className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center transition-all duration-300 shadow-sm ${deleteMode ? 'justify-between' : 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md'}`}
                      onClick={deleteMode ? undefined : () => {
                        setSelectedRoom(room);
                        setShowRoomDetailsModal(true);
                      }}
                    >
                      <div className={`transition-all duration-300 flex-1 min-w-0 ${deleteMode ? 'mr-4' : ''}`}>
                        <div className="font-semibold text-gray-900 dark:text-white text-lg truncate">{t(room.name) !== room.name ? t(room.name) : room.name}</div>
                        <div className="text-base text-gray-600 dark:text-gray-400">{room.workItems?.filter(hasWorkItemInput).length || 0} {t('works')}</div>
                      </div>

                      {deleteMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('VAT not included')}</div>
                            <div className="font-semibold text-gray-900 dark:text-white text-base lg:text-lg whitespace-nowrap">
                              {formatPrice((() => {
                                const calc = calculateRoomPriceWithMaterials(room, project.priceListSnapshot);
                                return calc.workTotal + calc.materialTotal + calc.othersTotal;
                              })())}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  ))}

                  {getProjectRooms(project.id).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>{t('No rooms added yet. Click the + button to add a room.')}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Price Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white text-lg">{t('without VAT')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white text-lg">{t('VAT (23%)')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id) * getVATRate())}</span>
                </div>
                <hr className="border-gray-300 dark:border-gray-600" />
                <div className="flex justify-between items-center">
                  <span className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Total price')}</span>
                  <span className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(project.id) * (1 + getVATRate()))}</span>
                </div>
              </div>

              {!project.is_archived && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handlePreviewPriceOffer}
                    className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Náhľad')}</span>
                  </button>
                  <button
                    onClick={handleSendPriceOffer}
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Odoslať')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Create/View Invoice Button - Moved outside and below */}
            {!project.is_archived && (
              !getInvoiceForProject(project.id) ? (
                <button
                  onClick={() => {
                    if (!isPro) { setShowPaywall(true); return; }
                    setShowInvoiceCreationModal(true);
                  }}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm sm:text-lg">{t('Create Invoice')}</span>
                </button>
              ) : null
            )}
          </div>

          {/* Invoices List (if exists) */}
          {getInvoiceForProject(project.id) && (
            <div className="space-y-3">
              {getInvoicesForContractor(activeContractorId)
                .filter(inv => inv.projectId === project.id)
                .map(invoice => (
                  <div
                    key={invoice.id}
                    onClick={() => !project.is_archived && setShowInvoiceDetailModal(true)}
                    className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm ${!project.is_archived ? 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Invoice')} {invoice.invoiceNumber}</div>
                        <div className="text-base text-gray-600 dark:text-gray-400">{new Date(invoice.issueDate).toLocaleDateString('sk-SK')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${invoice.status === INVOICE_STATUS.PAID
                        ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : invoice.status === INVOICE_STATUS.AFTER_MATURITY
                          ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                          : 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        }`}>
                        {t(invoice.status === INVOICE_STATUS.PAID ? 'Paid'
                          : invoice.status === INVOICE_STATUS.AFTER_MATURITY ? 'afterMaturity'
                            : 'Unpaid')}
                      </span>
                      {!project.is_archived && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Project Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Project management')}</h2>
            </div>

            {!project.is_archived && (
              <div className="space-y-3">
                <div
                  onClick={() => setShowProjectPriceList(true)}
                  className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Project price list')}</div>
                    <div className="text-base text-gray-600 dark:text-gray-400 truncate">{t('last change')}: 31 Oct 2025</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                </div>

                <div className="relative">
                  <div
                    onClick={() => setShowContractorSelector(!showContractorSelector)}
                    className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Project contractor')}</div>
                      <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                        {getCurrentContractor()?.name || t('assign contractor to project')}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </div>

                  {showContractorSelector && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in">
                        <h3 className="text-xl font-semibold mb-4">{t('Select Contractor')}</h3>

                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                          {contractors.map(contractor => (
                            <button
                              key={contractor.id}
                              onClick={() => handleAssignProjectContractor(contractor.id)}
                              className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between ${(project.contractor_id || activeContractorId) === contractor.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                }`}
                            >
                              <span className="font-semibold truncate">{contractor.name}</span>
                              {(project.contractor_id || activeContractorId) === contractor.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              )}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setShowContractorSelector(false);
                            setShowContractorModal(true);
                          }}
                          className="w-full mb-3 px-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          {t('Add contractor')}
                        </button>

                        <button
                          onClick={() => setShowContractorSelector(false)}
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl"
                        >
                          {t('Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {project.is_archived ? (
                <>
                  <button
                    onClick={() => {
                      unarchiveProject(project.id);
                      onBack();
                    }}
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Archive className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm sm:text-lg">{t('Unarchive')}</span>
                  </button>
                  <button
                    onClick={() => {
                      deleteArchivedProject(project.id);
                      onBack();
                    }}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-2xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Delete Forever')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDuplicateProject}
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Duplicate')}</span>
                  </button>
                  <button
                    onClick={() => {
                      archiveProject(project.category, project.id);
                      onBack();
                    }}
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Archive className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm sm:text-lg">{t('Archive')}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Receipts Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Receipts')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isAnalyzingReceipt}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isAnalyzingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('Analyzing...')}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>{t('Add receipt')}</span>
                    </>
                  )}
                </button>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptUpload}
                />
                <button
                  onClick={() => setShowReceiptsModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('View receipts')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* History - Hidden on mobile, shown on desktop */}
          <div className="space-y-4 hidden lg:block">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
              {(() => {
                const history = getProjectHistory(project.id) || [];

                // Check if history already has a "created" event (case-insensitive)
                const hasCreatedEvent = history.some(e =>
                  e.type && e.type.toLowerCase() === 'created'
                );

                // Only add synthetic "Created" if not already in history (for backwards compatibility)
                let allEvents = [...history];
                if (!hasCreatedEvent && project.created_at) {
                  allEvents.push({ type: 'Created', date: project.created_at });
                }

                // Sort newest first
                allEvents = allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

                return allEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${event.type === 'Created' || event.type === 'created' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-500'}`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t(event.type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {event.date ? new Date(event.date).toLocaleString('sk-SK', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right column - Notes and Photos */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Notes_Project')}</h2>
            </div>
            {isEditingDetailNotes ? (
              <div className="space-y-3">
                <textarea
                  value={projectDetailNotes}
                  onChange={(e) => setProjectDetailNotes(e.target.value)}
                  placeholder={t('Add project notes...')}
                  className="w-full h-40 p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingDetailNotes(false)} className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors">{t('Cancel')}</button>
                  <button onClick={handleSaveDetailNotes} className="flex-1 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl">{t('Save')}</button>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-40 p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 overflow-auto"
                onClick={() => !project.is_archived && setIsEditingDetailNotes(true)}
              >
                {projectDetailNotes || <span className="text-gray-400 dark:text-gray-500">{t('Click to add project notes')}</span>}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Fotografie')}</h2>
              </div>
              {!project.is_archived && (
                <div className="flex items-center gap-2">
                  {projectPhotos.length > 0 && (
                    <button
                      className="p-3 rounded-2xl flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
                      onClick={() => setPhotoDeleteMode(!photoDeleteMode)}
                    >
                      <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  )}
                  <button
                    className="p-3 rounded-2xl flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              )}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            {projectPhotos.length > 0 ? (
              <div
                className={`relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 shadow-sm transition-all duration-200 ${isDraggingPhoto ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${!project.is_archived && !photoDeleteMode ? 'cursor-pointer' : ''}`}
                onClick={!project.is_archived && !photoDeleteMode ? () => photoInputRef.current?.click() : undefined}
                onDrop={!project.is_archived && !photoDeleteMode ? handlePhotoDrop : undefined}
                onDragOver={!project.is_archived && !photoDeleteMode ? handlePhotoDragOver : undefined}
                onDragLeave={!project.is_archived && !photoDeleteMode ? handlePhotoDragLeave : undefined}
              >
                {/* Photo Grid - 3 columns, max 7 rows = 21 photos per page */}
                <div className="grid grid-cols-3 gap-2">
                  {projectPhotos.slice(photoPage * 21, (photoPage + 1) * 21).map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (photoDeleteMode) {
                          handleDeletePhoto(photo.id);
                        } else {
                          setSelectedPhotoIndex(photoPage * 21 + index);
                          setLightboxOpen(true);
                          setLightboxDirection(0);
                        }
                      }}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {photoDeleteMode && (
                        <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                          <Trash2 className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination - only show if more than 21 photos */}
                {projectPhotos.length > 21 && (
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPhotoPage(p => Math.max(0, p - 1)); }}
                      disabled={photoPage === 0}
                      className={`p-2 rounded-xl transition-all duration-200 ${photoPage === 0
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {photoPage + 1} / {Math.ceil(projectPhotos.length / 21)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPhotoPage(p => Math.min(Math.ceil(projectPhotos.length / 21) - 1, p + 1)); }}
                      disabled={photoPage >= Math.ceil(projectPhotos.length / 21) - 1}
                      className={`p-2 rounded-xl transition-all duration-200 ${photoPage >= Math.ceil(projectPhotos.length / 21) - 1
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Drag overlay hint */}
                {isDraggingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-2xl pointer-events-none">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{t('Drop photos here')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`min-h-[120px] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl transition-all duration-200 ${isDraggingPhoto ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${!project.is_archived ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''}`}
                onClick={!project.is_archived ? () => photoInputRef.current?.click() : undefined}
                onDrop={!project.is_archived ? handlePhotoDrop : undefined}
                onDragOver={!project.is_archived ? handlePhotoDragOver : undefined}
                onDragLeave={!project.is_archived ? handlePhotoDragLeave : undefined}
              >
                <Image className="w-8 h-8 mb-2 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {isDraggingPhoto ? t('Drop photos here') : t('Click or drag photos here')}
                </span>
              </div>
            )}
          </div>

          {/* History - Mobile only, shown after Photos */}
          <div className="space-y-4 lg:hidden">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
              {(() => {
                const history = getProjectHistory(project.id) || [];

                // Check if history already has a "created" event (case-insensitive)
                const hasCreatedEvent = history.some(e =>
                  e.type && e.type.toLowerCase() === 'created'
                );

                // Only add synthetic "Created" if not already in history (for backwards compatibility)
                let allEvents = [...history];
                if (!hasCreatedEvent && project.created_at) {
                  allEvents.push({ type: 'Created', date: project.created_at });
                }

                // Sort newest first
                allEvents = allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

                return allEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${event.type === 'Created' || event.type === 'created' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-500'}`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t(event.type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {event.date ? new Date(event.date).toLocaleString('sk-SK', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('New room')}</h3>
              <button
                onClick={() => setShowNewRoomModal(false)}
                className="p-1 text-gray-900 dark:text-white hover:opacity-70 transition-all"
                title={t('Cancel')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {roomTypes.map((type) => (
                <button key={type} onClick={() => handleAddRoom(type)} className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  {t(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCustomRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Custom Room Name')}</h3>
              <button
                onClick={() => setShowCustomRoomModal(false)}
                className="p-1 text-gray-900 dark:text-white hover:opacity-70 transition-all"
                title={t('Cancel')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              className="w-full p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomRoomCreate(); }}
              placeholder={t('Enter room name')}
            />
            <button
              onClick={handleCustomRoomCreate}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('Create')}
            </button>
          </div>
        </div>
      )}

      {showClientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 lg:p-6 w-full ${showCreateClientInModal ? 'max-w-7xl h-[85vh]' : 'max-w-md'} lg:h-auto max-h-[85vh] lg:max-h-[90vh] overflow-y-auto transition-all`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{showCreateClientInModal ? t('New client') : t('Select Client')}</h3>
              {showCreateClientInModal && (
                <button onClick={() => setShowCreateClientInModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {showCreateClientInModal ? (
              <ClientForm
                onSave={handleCreateClientInModal}
                onCancel={() => setShowCreateClientInModal(false)}
              />
            ) : (
              <>
                {/* Search bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder={t('Search')}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {clients
                    .filter(client =>
                      !clientSearchQuery ||
                      client.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                      client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())
                    )
                    .map(client => (
                      <button key={client.id} onClick={() => handleClientSelect(client)} className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 text-left">
                        <div className="font-semibold">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => setShowCreateClientInModal(true)}
                  className="w-full mb-3 px-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('Add client')}
                </button>

                <button onClick={() => { setShowClientSelector(false); setClientSearchQuery(''); }} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors">{t('Cancel')}</button>
              </>
            )}
          </div>
        </div>
      )}

      {showRoomDetailsModal && selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          workProperties={workProperties}
          onClose={() => setShowRoomDetailsModal(false)}
          onSave={(workData) => handleSaveRoomWork(selectedRoom.id, workData)}
          isReadOnly={project.is_archived}
          priceList={project.priceListSnapshot}
        />
      )}

      {showProjectPriceList && (
        <ProjectPriceList
          projectId={project.id}
          initialData={project.priceListSnapshot}
          onClose={() => setShowProjectPriceList(false)}
          onSave={handleSaveProjectPriceList}
        />
      )}

      {showContractorModal && (
        <ContractorProfileModal
          onClose={() => setShowContractorModal(false)}
          onSave={handleSaveContractor}
        />
      )}

      {showContractorWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-xl font-semibold">{t('Contractor Required')}</h3>
            </div>
            <p className="text-gray-600 mb-6">{t('A contractor must be assigned to duplicate a project.')}</p>
            <button onClick={() => setShowContractorWarning(false)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors">{t('Cancel')}</button>
          </div>
        </div>
      )}

      {showInvoiceCreationModal && (
        <InvoiceCreationModal
          isOpen={showInvoiceCreationModal}
          onClose={() => setShowInvoiceCreationModal(false)}
          project={project}
          categoryId={project.category}
        />
      )}

      {showInvoiceDetailModal && (
        <InvoiceDetailModal
          isOpen={showInvoiceDetailModal}
          onClose={() => setShowInvoiceDetailModal(false)}
          invoice={getInvoiceForProject(project.id)}
          hideViewProject={true}
        />
      )}

      {/* Receipts Modal */}
      {showReceiptsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[75vh] lg:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Receipts')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('Total')}: {formatPrice(calculateReceiptsTotal())}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReceiptsModal(false);
                  setSelectedReceipt(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {isLoadingReceipts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('No receipts yet')}</p>
                  <p className="text-sm mt-2">{t('Upload a receipt photo to track expenses')}</p>
                </div>
              ) : selectedReceipt ? (
                // Receipt Detail View
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('Back to list')}
                  </button>

                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                    <img
                      src={selectedReceipt.image_url}
                      alt="Receipt"
                      className="w-full max-h-64 object-contain bg-white dark:bg-gray-900"
                    />
                  </div>

                  <div className="space-y-3">
                    {selectedReceipt.merchant_name && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('Vendor')}</span>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReceipt.merchant_name}</p>
                      </div>
                    )}
                    {selectedReceipt.receipt_date && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('Date')}</span>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedReceipt.receipt_date).toLocaleDateString('sk-SK')}
                        </p>
                      </div>
                    )}
                    {selectedReceipt.amount && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('Amount')}</span>
                        <p className="font-semibold text-lg text-gray-900 dark:text-white">
                          {formatPrice(selectedReceipt.amount)}
                        </p>
                      </div>
                    )}
                    {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('Items')}</span>
                        <div className="mt-2 space-y-1">
                          {selectedReceipt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.name} {item.quantity > 1 ? `(${item.quantity}x)` : ''}
                              </span>
                              <span className="text-gray-900 dark:text-white">{formatPrice(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('Delete receipt')}
                  </button>
                </div>
              ) : (
                // Receipts List
                <div className="space-y-3">
                  {receipts.map(receipt => (
                    <div
                      key={receipt.id}
                      onClick={() => setSelectedReceipt(receipt)}
                      className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-gray-900 flex-shrink-0">
                        <img
                          src={receipt.image_url}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {receipt.merchant_name || t('Unknown vendor')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString('sk-SK') : t('No date')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {receipt.amount ? formatPrice(receipt.amount) : '-'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Add Button */}
            {!selectedReceipt && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isAnalyzingReceipt}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isAnalyzingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('Analyzing...')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{t('Add receipt')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animated Lightbox */}
      {selectedPhotoIndex !== null && projectPhotos.length > 0 && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${lightboxOpen
            ? 'bg-black/80 backdrop-blur-md opacity-100'
            : 'bg-black/0 backdrop-blur-none opacity-0'
            }`}
          onClick={() => {
            setLightboxOpen(false);
            setTimeout(() => setSelectedPhotoIndex(null), 300);
          }}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
              setTimeout(() => setSelectedPhotoIndex(null), 300);
            }}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous Arrow */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxDirection(-1);
                setSelectedPhotoIndex(prev => prev - 1);
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next Arrow */}
          {selectedPhotoIndex < projectPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxDirection(1);
                setSelectedPhotoIndex(prev => prev + 1);
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image Container with Slide Animation */}
          <div
            className={`transition-all duration-300 ease-out ${lightboxOpen
              ? 'scale-100 opacity-100'
              : 'scale-95 opacity-0'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={selectedPhotoIndex}
              src={projectPhotos[selectedPhotoIndex]?.url}
              alt={projectPhotos[selectedPhotoIndex]?.name || "Project Photo"}
              className={`max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl ${lightboxDirection === -1
                ? 'animate-slide-from-left'
                : lightboxDirection === 1
                  ? 'animate-slide-from-right'
                  : 'animate-fadeSlideIn'
                }`}
            />
          </div>

          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-semibold">
            {selectedPhotoIndex + 1} / {projectPhotos.length}
          </div>
        </div>
      )}

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={handleClosePDFPreview}
        pdfUrl={pdfUrl}
        onSend={() => {
          handleClosePDFPreview();
          handleSendPriceOffer();
        }}
        title={`${t('Cenová ponuka')} - ${project.name}`}
      />

      {showPaywall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md text-center">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('Become Pro!')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('Unlock PDF export, unlimited projects, and more.')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPaywall(false)} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl">{t('Close')}</button>
              <Link to="/settings" onClick={() => setShowPaywall(false)} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center font-semibold">
                {t('Go to Settings')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailView;
