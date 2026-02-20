import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  ClipboardList,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  Copy,
  Archive,
  Eye,
  Send,
  Edit3,
  Image,
  X,
  StickyNote,
  BookOpen,
  AlertTriangle,
  Receipt,
  Loader2,
  Camera,
  Flag,
  CheckCircle,
  Euro,
  FileText
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { generatePriceOfferPDF } from '../utils/pdfGenerator';
import { compressImage } from '../utils/imageCompression';
import { calculateWorksCount } from '../utils/priceCalculations';
import { formatProjectNumber, PROJECT_EVENTS, INVOICE_STATUS, PROJECT_STATUS } from '../utils/dataTransformers';
import api from '../services/supabaseApi';
import { workProperties } from '../config/workProperties';
import RoomDetailsModal from './RoomDetailsModal';
import ProjectPriceList from './ProjectPriceList';
import ContractorProfileModal from './ContractorProfileModal';
import InvoiceCreationModal from './InvoiceCreationModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import PDFPreviewModal from './PDFPreviewModal';
import ClientForm from './ClientForm';
import ConfirmationModal from './ConfirmationModal';
import PaywallModal from './PaywallModal';
import ShareProjectModal from './ShareProjectModal';
import DennikModal from './DennikModal';

const LEGACY_PERMISSION_MAP = {
  'client': 'client_supplier',
  'priceOffer': 'total_price_offer',
  'documents': 'issue_document',
  'priceOfferNote': 'price_offer_note',
  'projectNote': 'project_note'
};

const ProjectDetailView = ({ project, onBack, viewSource = 'projects' }) => {
  const { t, tPlural } = useLanguage();

  // Normalize project ID (Dennik projects use c_id, standard projects use id or c_id)
  const projectId = project?.id || project?.c_id;

  const {
    clients,
    generalPriceList,
    contractors,
    activeContractorId,
    setActiveContractor,
    addContractor,
    addClient, // Add this
    updateClient, // Add this for fixing the lint error
    projectCategories,
    updateProject,
    archiveProject,
    deleteArchivedProject,
    addRoomToProject,
    updateProjectRoom,
    deleteProjectRoom,
    getProjectRooms,
    projectRoomsData,
    calculateRoomPriceWithMaterials,
    calculateProjectTotalPrice,
    calculateProjectTotalPriceWithBreakdown,
    formatPrice,
    getInvoiceForProject,
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
    isPro, // Added Pro check
    findProjectById,
    invoices
  } = useAppData();
  const { user } = useAuth();

  // Permissions logic
  const memberPermissions = useMemo(() => {
    let raw = project?.memberPermissions || {};
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse memberPermissions', e);
        raw = {};
      }
    }
    return raw;
  }, [project?.memberPermissions]);

  const isProjectOwner = project?.user_id === user?.id || project?.userRole === 'owner';

  const getEffectivePermission = useCallback((sectionId) => {
    // Check direct key first
    let rawValue = memberPermissions[sectionId];

    // If not found, check legacy key mapping
    if (rawValue === undefined) {
      const legacyKey = Object.keys(LEGACY_PERMISSION_MAP).find(key => LEGACY_PERMISSION_MAP[key] === sectionId);
      if (legacyKey) {
        rawValue = memberPermissions[legacyKey];
      }
    }

    // Map legacy values (e.g., 'interact' -> 'edit')
    if (rawValue === 'interact') return 'edit';

    return rawValue || null;
  }, [memberPermissions]);

  const canView = useCallback((sectionId) => {
    if (isProjectOwner) return true;
    // Special case: if it's a member project from Dennik, check permissions
    if (project?.memberPermissions) {
      const perm = getEffectivePermission(sectionId);
      return perm !== 'hidden';
    }
    // Default for other shared projects (teams)
    return true;
  }, [isProjectOwner, project?.memberPermissions, getEffectivePermission]);

  const canEdit = useCallback((sectionId) => {
    if (isProjectOwner) return true;
    if (project?.memberPermissions) {
      const perm = getEffectivePermission(sectionId);
      return perm === 'edit';
    }
    return true;
  }, [isProjectOwner, project?.memberPermissions, getEffectivePermission]);

  // Check if user can edit this project (owner or viewing their own project)
  // Team members viewing via team_modal can only view, not edit
  const canEditProject = !project?.is_archived && (viewSource !== 'team_modal' || isProjectOwner);

  // Local state
  const clientFormRef = useRef(null);
  const createClientFormRef = useRef(null);
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
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showContractorWarning, setShowContractorWarning] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showInvoiceCreationModal, setShowInvoiceCreationModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [projectDetailNotes, setProjectDetailNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const notesSaveTimeoutRef = useRef(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [photoPage, setPhotoPage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState(0); // -1 for left, 1 for right, 0 for initial
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoDeleteMode, setPhotoDeleteMode] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [showDennikModal, setShowDennikModal] = useState(false);
  const [dennikInitialDate, setDennikInitialDate] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Invoices for this project to show in ClientForm
  const projectInvoices = useMemo(() => {
    // Use current project ID
    if (!projectId || !invoices) return [];
    return invoices.filter(inv => inv.projectId === projectId).sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  }, [projectId, invoices]);

  const clientWithInvoices = useMemo(() => {
    if (!selectedClientForProject) return null;
    return { ...selectedClientForProject, invoices: projectInvoices, projectName: project?.name };
  }, [selectedClientForProject, projectInvoices, project?.name]);

  // Touch handling state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [currentTranslate, setCurrentTranslate] = useState(0);

  // Receipt state
  const [receipts, setReceipts] = useState([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState({ current: 0, total: 0 });
  const receiptInputRef = useRef(null);

  // Refs
  const photoInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initialize data on mount or project change
  useEffect(() => {
    const initializeData = async () => {
      if (!projectId) return;

      setIsLoadingDetails(true);
      await loadProjectDetails(projectId);
      // Load receipts for total display in header
      const projectReceipts = await getProjectReceipts(projectId);
      setReceipts(projectReceipts);
      setIsLoadingDetails(false);
    };

    initializeData();
  }, [projectId, loadProjectDetails, getProjectReceipts]);

  // Handle event to open Dennik modal remotely (e.g. from quick travel)
  useEffect(() => {
    const handleOpenDennik = (e) => {
      const { projectId: targetId, dennikDate } = e.detail;
      if (targetId === projectId) {
        if (dennikDate) {
          setDennikInitialDate(new Date(dennikDate + 'T12:00:00'));
        }
        setShowDennikModal(true);
      }
    };
    window.addEventListener('open-dennik-modal', handleOpenDennik);
    return () => window.removeEventListener('open-dennik-modal', handleOpenDennik);
  }, [projectId]);

  // Sync local state with project data (also check latest from context for realtime updates)
  const latestProjectResult = findProjectById(projectId);
  const latestProject = latestProjectResult?.project || project;
  const effectiveClientId = latestProject?.clientId || latestProject?.client_id || project?.clientId || project?.client_id;

  useEffect(() => {
    if (!project) return;

    if (effectiveClientId) {
      const assignedClient = clients.find(client => client.id === effectiveClientId);
      if (assignedClient) {
        setSelectedClientForProject(assignedClient);
      } else {
        // Client not in local array (likely member viewing owner's client)
        // Try fetching directly from the API
        api.clients.getById(effectiveClientId)
          .then(fetchedClient => {
            if (fetchedClient) {
              setSelectedClientForProject(fetchedClient);
            } else {
              // API also failed (RLS), fall back to project's embedded clientName
              const clientName = project.clientName || project.client_name || latestProject?.clientName || latestProject?.client_name;
              if (clientName) {
                setSelectedClientForProject({ id: effectiveClientId, name: clientName, email: '', _readOnly: true });
              } else {
                setSelectedClientForProject(null);
              }
            }
          })
          .catch(() => {
            // RLS blocked fetch, fall back to project's embedded clientName
            const clientName = project.clientName || project.client_name || latestProject?.clientName || latestProject?.client_name;
            if (clientName) {
              setSelectedClientForProject({ id: effectiveClientId, name: clientName, email: '', _readOnly: true });
            } else {
              setSelectedClientForProject(null);
            }
          });
      }
    } else {
      setSelectedClientForProject(null);
    }

    setProjectDetailNotes(project.detailNotes || latestProject?.detailNotes || '');
    setProjectPhotos(project.photos || latestProject?.photos || []);
  }, [project, clients, effectiveClientId, latestProject]);

  // Memoized price list with safety parsing
  const activePriceList = useMemo(() => {
    let pl = project?.priceListSnapshot || generalPriceList;
    if (typeof pl === 'string') {
      try {
        return JSON.parse(pl);
      } catch (e) {
        console.error("Failed to parse project.priceListSnapshot in ProjectDetailView", e);
        return generalPriceList;
      }
    }
    return pl;
  }, [project?.priceListSnapshot, generalPriceList]);

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
    // Use the memoized active price list
    const vatItem = activePriceList?.others?.find(item => item.name === 'VAT');
    return vatItem ? vatItem.price / 100 : 0.23;
  };

  const getCurrentContractor = () => {
    // Use project's contractor_id first, then fall back to active contractor
    const cId = project?.contractor_id || project?.contractorId || activeContractorId;
    return contractors.find(c => c.id === cId);
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
      updateProject(project.category, projectId, { name: editingProjectName.trim() });
      setIsEditingProjectName(false);
    }
  };

  const handleEditProjectNotes = () => {
    setIsEditingProjectNotes(true);
    setEditingProjectNotes(project.notes || '');
  };

  const handleSaveProjectNotes = () => {
    updateProject(project.category, projectId, { notes: editingProjectNotes.trim() });
    setIsEditingProjectNotes(false);
  };

  const handleClientSelect = (client) => {
    setSelectedClientForProject(client);
    setShowClientSelector(false);

    // Update project with client info
    assignProjectToClient(client.id, projectId, project.name);
    updateProject(project.category, projectId, {
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

    const newRoom = await addRoomToProject(projectId, { name: englishRoomType });
    setShowNewRoomModal(false);
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleCustomRoomCreate = async () => {
    if (!customRoomName.trim()) return;
    const newRoom = await addRoomToProject(projectId, { name: customRoomName.trim() });
    setShowNewRoomModal(false);
    setShowCustomRoomModal(false);
    setCustomRoomName('');
    setSelectedRoom(newRoom);
    setShowRoomDetailsModal(true);
  };

  const handleSaveRoomWork = (roomId, workData, originalWorkItems = null) => {
    updateProjectRoom(projectId, roomId, { workItems: workData }, originalWorkItems);
  };

  const handleDeleteRoom = (room) => {
    setRoomToDelete(room);
  };

  const confirmDeleteRoom = () => {
    if (roomToDelete) {
      deleteProjectRoom(projectId, roomToDelete.id);
      setRoomToDelete(null);
    }
  };

  const handleSaveProjectPriceList = (priceData) => {
    return updateProject(project.category, projectId, { priceListSnapshot: priceData });
    // Don't close the modal - let user continue editing
    // Modal will close when user clicks the X button
  };

  const handleUpdateClient = useCallback(async (clientData) => {
    try {
      await updateClient(clientData.id, clientData);
      setSelectedClientForProject({ ...selectedClientForProject, ...clientData });
    } catch (error) {
      console.error('[SUPABASE] Error updating client:', error);
    }
  }, [updateClient, selectedClientForProject]);


  const handleDuplicateProject = async () => {
    if (!activeContractorId) {
      setShowContractorWarning(true);
      return;
    }

    // Show loading state
    setIsDuplicating(true);

    try {
      // 1. Create the new project structure (Basic info)
      // Name it "Copy of [Name]"
      const newProjectData = {
        name: `${t('Copy of')} ${project.name}`,
        category: project.category,
        clientId: project.clientId,
        // Exclude invoice_id/has_invoice
        hasInvoice: false,
        invoiceId: null,
        invoiceStatus: null,
        // Copy notes
        notes: project.notes,
        detailNotes: project.detailNotes,
        // Copy photos (will need to be treated as new entries ideally, but sharing URL is fine for now)
        // If we want true deep copy of photos, we'd re-upload, but usually same URL is fine for Supabase storage if file isn't deleted individually
        photos: project.photos ? JSON.parse(JSON.stringify(project.photos)).map(p => ({ ...p, id: crypto.randomUUID() })) : []
      };

      // Create project
      const newProject = await addProject(project.category, newProjectData);

      if (!newProject) throw new Error("Failed to create new project");

      // CRITICAL: Explicitly update the new project with the rich data (notes, photos, detailNotes) 
      // because addProject only sets basic fields initially.
      // Also re-assert clientId to be safe.
      await updateProject(project.category, newProject.id, {
        notes: project.notes,
        detailNotes: project.detailNotes,
        clientId: project.clientId, // Ensure client is linked
        photos: project.photos ? JSON.parse(JSON.stringify(project.photos)).map(p => ({ ...p, id: crypto.randomUUID() })) : [],
        // Explicitly set invoice related fields to null/false
        hasInvoice: false,
        invoiceId: null,
        invoiceStatus: null
      });

      // 2. Fetch all rooms and work items from the ORIGINAL project
      // We need to ensure we have the full details loaded
      let sourceRooms = projectRoomsData[projectId];
      if (!sourceRooms) {
        // Force load if not available
        await loadProjectDetails(projectId);
        sourceRooms = projectRoomsData[projectId] || [];
      }

      // 3. Duplicate Rooms and Work Items
      for (const room of sourceRooms) {
        // Create new room
        const newRoomData = {
          name: room.name,
          roomType: room.room_type,
          floorLength: room.floor_length,
          floorWidth: room.floor_width,
          wallHeight: room.wall_height,
          commuteLength: room.commute_length,
          daysInWork: room.days_in_work,
          toolRental: room.tool_rental
        };
        const createdRoom = await addRoomToProject(newProject.id, newRoomData);

        // Process work items for this room
        if (room.workItems && room.workItems.length > 0) {
          // Prepare items for the new room - STRIP IDs to ensure creation and prevent stealing of items
          const itemsToDuplicate = room.workItems.map(item => {
            const { id, cId, c_id, ...rest } = item; // Strip ALL identifiers

            // Deep copy fields/calculation to avoid reference issues
            const newItem = {
              ...rest,
              // Also handle nested objects like doorWindowItems
              // Ensure we strip IDs from nested items too
              doorWindowItems: item.doorWindowItems ? {
                doors: (item.doorWindowItems.doors || []).map(({ id, cId, c_id, ...d }) => d),
                windows: (item.doorWindowItems.windows || []).map(({ id, cId, c_id, ...w }) => w)
              } : undefined
            };

            return newItem;
          });

          // Save items to the new room
          await updateProjectRoom(newProject.id, createdRoom.id, { workItems: itemsToDuplicate });
        }
      }

      // 4. Duplicate Receipts
      try {
        const sourceReceipts = await getProjectReceipts(projectId);
        if (sourceReceipts && sourceReceipts.length > 0) {
          for (const receipt of sourceReceipts) {
            // Prepare duplicate receipt data
            const receiptData = {
              totalAmount: receipt.amount,
              vendorName: receipt.merchant_name,
              date: receipt.receipt_date, // Keeping original date as per copy logic
              imageUrl: receipt.image_url,
              rawText: receipt.raw_ocr_text,
              items: receipt.items ? (typeof receipt.items === 'string' ? JSON.parse(receipt.items) : receipt.items) : []
            };

            await addReceipt(newProject.id, receiptData);
          }
        }
      } catch (receiptError) {
        console.error('Error duplicating receipts:', receiptError);
        // Continue event if receipts fail
      }

      // 5. Add 'Duplicated' history event to both projects
      await addProjectHistoryEntry(projectId, {
        type: PROJECT_EVENTS.DUPLICATED,
        description: `${t('Duplicated to')} ${newProject.name}`
      });

      await addProjectHistoryEntry(newProject.id, {
        type: PROJECT_EVENTS.CREATED,
        description: `${t('Duplicated from')} ${project.name}`
      });

      alert(t('Project duplicated successfully.'));

      // Optional: Navigate to the new project? 
      // For now, stay here as per previous logic, or maybe refresh?

    } catch (error) {
      console.error('Error duplicating project:', error);
      alert(t('Failed to duplicate project.'));
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleAssignProjectContractor = async (newContractorId) => {
    try {
      await updateProject(project.category, projectId, { contractor_id: newContractorId });
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
      if (file.type === 'application/pdf') {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newPhotos.push({
          id: crypto.randomUUID(),
          url: base64, // Data URI
          name: file.name,
          type: 'pdf',
          createdAt: new Date().toISOString()
        });
      } else {
        // Compress image before storing
        const compressedBase64 = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.7
        });
        newPhotos.push({
          id: crypto.randomUUID(),
          url: compressedBase64,
          name: file.name,
          type: 'image',
          createdAt: new Date().toISOString()
        });
      }
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, projectId, { photos: updatedPhotos });
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);

    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;

    const newPhotos = [];
    for (const file of files) {
      if (file.type === 'application/pdf') {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newPhotos.push({
          id: crypto.randomUUID(),
          url: base64,
          name: file.name,
          type: 'pdf',
          createdAt: new Date().toISOString()
        });
      } else if (file.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.7
        });
        newPhotos.push({
          id: crypto.randomUUID(),
          url: compressedBase64,
          name: file.name,
          type: 'image',
          createdAt: new Date().toISOString()
        });
      }
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, projectId, { photos: updatedPhotos });
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
    updateProject(project.category, projectId, { photos: updatedPhotos });
  };

  const handleNotesChange = (e) => {
    setProjectDetailNotes(e.target.value);
  };

  const handleSaveNotes = async () => {
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);

    setIsSavingNotes(true);
    try {
      await updateProject(project.category, projectId, { detailNotes: projectDetailNotes });
    } catch (error) {
      console.error('Error saving notes:', error);
      alert(t('Failed to save notes'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    setProjectDetailNotes(project.detailNotes || '');
    setIsNoteFocused(false);
  };

  const handleNotesBlur = (e) => {
    // If we're clicking the cancel button, don't save. 
    // We use a small timeout to allow the Cancel button's onClick to fire first/concurrently
    // or to be checked if we could inspect relatedTarget (though touch events can be tricky)

    // Check if the related target (where focus went) is the cancel button
    // But relatedTarget isn't always reliable (e.g. clicking iframe or non-focusable).
    // The robust way: delay the save. If Cancel is clicked, it clears the timeout.

    notesSaveTimeoutRef.current = setTimeout(() => {
      // If content changed, save
      if (projectDetailNotes !== (project.detailNotes || '')) {
        handleSaveNotes();
      }
      setIsNoteFocused(false);
    }, 200);
  };

  const handleNotesFocus = () => {
    setIsNoteFocused(true);
  };

  // === RECEIPT HANDLERS ===

  const loadReceipts = async () => {
    if (!project?.id) return;
    setIsLoadingReceipts(true);
    try {
      const projectReceipts = await getProjectReceipts(projectId);
      setReceipts(projectReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
    setIsLoadingReceipts(false);
  };

  // Touch Handlers for Lightbox
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setCurrentTranslate(0);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart) {
      const currentTouch = e.targetTouches[0].clientX;
      const diff = currentTouch - touchStart;
      setCurrentTranslate(diff);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedPhotoIndex < projectPhotos.length - 1) {
      // Swipe Left -> Next Photo
      setLightboxDirection(1);
      setSelectedPhotoIndex(prev => prev + 1);
    } else if (isRightSwipe && selectedPhotoIndex > 0) {
      // Swipe Right -> Prev Photo
      setLightboxDirection(-1);
      setSelectedPhotoIndex(prev => prev - 1);
    } else {
      // Snap back if swipe wasn't strong enough or at boundaries
      // (Optional: Implement snap back animation if desired, but state reset handles it)
    }

    setTouchStart(null);
    setTouchEnd(null);
    setCurrentTranslate(0);
  };

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsAnalyzingReceipt(true);
    setAnalyzingProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setAnalyzingProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          // Compress image before analysis/upload (also converts HEIC to JPEG)
          const base64Image = await compressImage(file, {
            maxWidth: 1500, // Higher resolution for receipt scanning
            maxHeight: 1500,
            quality: 0.8
          });

          // Analyze with GPT-4 Vision
          const analysisResult = await analyzeReceiptImage(base64Image);

          // Save receipt with analyzed data
          await addReceipt(projectId, {
            imageUrl: base64Image,
            totalAmount: analysisResult.total_amount || null,
            vendorName: analysisResult.vendor_name || null,
            date: analysisResult.date || null,
            items: analysisResult.items || [],
            rawText: analysisResult.raw_text || ''
          });

        } catch (error) {
          console.error(`Error processing receipt ${file.name}:`, error);
          // Continue with next file even if one fails
        }
      }

      // Refresh receipts list after all are done
      await loadReceipts();

    } catch (error) {
      console.error('Error in batch upload:', error);
      alert(t('Error uploading receipts. Please try again.'));
    } finally {
      setIsAnalyzingReceipt(false);
      setAnalyzingProgress({ current: 0, total: 0 });

      // Reset input
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
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
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(projectId);

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
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
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
        projectCategory: project.category,
        offerValidityPeriod: priceOfferSettings?.timeLimit || 30,
        priceList: project.priceListSnapshot
      }, t); // Pass t as the second argument

      // On mobile, open directly in browser's native PDF viewer
      if (isMobile) {
        // Create a link with download attribute for proper filename
        const filename = `${t('Price offer')} - ${project.name}.pdf`;
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
    if (isSharing) return;

    const contractor = getCurrentContractor();
    const client = clients.find(c => c.id === project.clientId);
    const projectBreakdown = calculateProjectTotalPriceWithBreakdown(projectId);
    const vatRate = getVATRate();
    const totalWithoutVAT = projectBreakdown?.total || 0;
    const vat = totalWithoutVAT * vatRate;
    const totalWithVAT = totalWithoutVAT + vat;

    const text = `
${t('Price offer')}
${project.name}

${t('Contractor')}: ${contractor?.name || '-'}
${t('Client')}: ${client?.name || '-'}

${t('without VAT')}: ${formatPrice(totalWithoutVAT)}
${t('VAT')} (${Math.round(vatRate * 100)}%): ${formatPrice(vat)}
${t('Total price')}: ${formatPrice(totalWithVAT)}
${project.notes ? `
${t('Notes_CP')}: ${project.notes}` : ''}
    `.trim();

    // Track history - iOS compatible
    addProjectHistoryEntry(projectId, {
      type: PROJECT_EVENTS.SENT // iOS compatible: 'sent'
    });

    // Update project status to SENT (1) - iOS compatible
    const category = projectCategories.find(cat => cat.projects.some(p => p.id === projectId));
    if (category && updateProject) {
      updateProject(category.id, projectId, {
        status: PROJECT_STATUS.SENT // iOS: 1
      });
    }

    if (navigator.share) {
      setIsSharing(true);
      try {
        let currentBlob = pdfBlob;

        // If we don't have a blob (e.g. user clicked Send without Preview), generate it now
        if (!currentBlob) {
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
            projectNotes: project.notes
          }, t);
          currentBlob = result.pdfBlob;
          setPdfBlob(currentBlob);
          setPdfUrl(result.blobUrl);
        }

        const shareData = {
          title: `${t('Price offer')} - ${project.name}`,
        };

        // If we have a PDF blob, try to share it as a file
        if (currentBlob && navigator.canShare && navigator.canShare({ files: [new File([currentBlob], 'test.pdf', { type: 'application/pdf' })] })) {
          const file = new File([currentBlob], `${t('Price offer')} - ${project.name}.pdf`, { type: 'application/pdf' });
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
      } finally {
        setIsSharing(false);
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
    <div className="flex-1 p-0 lg:p-0 min-w-0">

      {/* Project Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 lg:gap-4">

          {/* Mobile: Back arrow on its own row */}
          {viewSource !== 'team_modal' && (
            <div className="lg:hidden">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
          )}

          {/* Mobile: Project number + status + action buttons */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <span className="text-base text-gray-700 dark:text-gray-300">{formatProjectNumber(project) || projectId}</span>
              {project.is_archived && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full">
                  {t('Archived')}
                </span>
              )}
              {(() => {
                const statusConfig = {
                  [PROJECT_STATUS.NOT_SENT]: { color: '#FF857C', icon: X, label: 'not sent' },
                  [PROJECT_STATUS.SENT]: { color: '#51A2F7', icon: null, label: 'sent' },
                  [PROJECT_STATUS.APPROVED]: { color: '#73D38A', icon: CheckCircle, label: 'approved' },
                  [PROJECT_STATUS.FINISHED]: { color: '#C4C4C4', icon: Flag, label: 'finished' }
                };
                const config = statusConfig[project.status] || statusConfig[PROJECT_STATUS.NOT_SENT];
                const StatusIcon = config.icon;
                return (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full shadow-sm"
                    style={{ backgroundColor: config.color }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-white">
                      {project.status === PROJECT_STATUS.SENT ? (
                        <span className="text-[10px] font-bold" style={{ color: config.color }}>?</span>
                      ) : (
                        <StatusIcon size={10} color={config.color} strokeWidth={3} />
                      )}
                    </div>
                    <span className="text-xs font-medium text-white">{t(config.label)}</span>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!project.is_archived && viewSource !== 'team_modal' && (
                <>
                  <button
                    onClick={() => {
                      if (!project.is_dennik_enabled && !project.isDennikEnabled) {
                        api.dennik.enableDennik(project.c_id || projectId).catch(err => console.error('Error enabling dennik:', err));
                      }
                      setShowDennikModal(true);
                    }}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  {canView('project_pricelist') && (
                    <button
                      onClick={() => setShowProjectPriceList(true)}
                      title={t('Project price list')}
                      className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                    >
                      <Euro className="w-4 h-4 text-purple-500" />
                    </button>
                  )}
                  {canView('duplicate') && (
                    <button
                      onClick={handleDuplicateProject}
                      disabled={isDuplicating}
                      title={t('Duplicate')}
                      className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center"
                    >
                      {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-blue-500" />}
                    </button>
                  )}
                  {canView('archive') && (
                    <button
                      onClick={() => setShowArchiveConfirmation(true)}
                      title={t('ArchiveProjectAction')}
                      className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                    >
                      <Archive className="w-4 h-4 text-yellow-500" />
                    </button>
                  )}
                </>
              )}
              {viewSource === 'team_modal' && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile: Project name on its own row */}
          <div className="lg:hidden">
            {isEditingProjectName && isProjectOwner ? (
              <input
                type="text"
                value={editingProjectName}
                onChange={(e) => setEditingProjectName(e.target.value)}
                onBlur={handleSaveProjectName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveProjectName();
                  if (e.key === 'Escape') setIsEditingProjectName(false);
                }}
                className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {project.name}
                </h1>
                {!project.is_archived && canEditProject && isProjectOwner && (
                  <button
                    onClick={handleEditProjectName}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Original layout - name + icons on one row, number + status below */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {viewSource !== 'team_modal' && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
              )}
              {isEditingProjectName && isProjectOwner ? (
                <input
                  type="text"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onBlur={handleSaveProjectName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveProjectName();
                    if (e.key === 'Escape') setIsEditingProjectName(false);
                  }}
                  className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {project.name}
                  </h1>
                  {!project.is_archived && canEditProject && isProjectOwner && (
                    <button
                      onClick={handleEditProjectName}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Dennik Button & Management Actions - Desktop */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {!project.is_archived && viewSource !== 'team_modal' && (
                <>
                  <button
                    onClick={() => {
                      if (!project.is_dennik_enabled && !project.isDennikEnabled) {
                        api.dennik.enableDennik(project.c_id || projectId).catch(err => console.error('Error enabling dennik:', err));
                      }
                      setShowDennikModal(true);
                    }}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Denník</span>
                  </button>

                  <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>

                  {canView('project_pricelist') && (
                    <button
                      onClick={() => setShowProjectPriceList(true)}
                      title={t('Project price list')}
                      className="p-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                    >
                      <Euro className="w-5 h-5 text-purple-500" />
                    </button>
                  )}

                  {canView('duplicate') && (
                    <button
                      onClick={handleDuplicateProject}
                      disabled={isDuplicating}
                      title={t('Duplicate')}
                      className="p-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center"
                    >
                      {isDuplicating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5 text-blue-500" />}
                    </button>
                  )}

                  {canView('archive') && (
                    <button
                      onClick={() => setShowArchiveConfirmation(true)}
                      title={t('ArchiveProjectAction')}
                      className="p-2.5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center"
                    >
                      <Archive className="w-5 h-5 text-yellow-500" />
                    </button>
                  )}
                </>
              )}
            </div>

            {viewSource === 'team_modal' && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors ml-2"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Desktop: Project number + status below name */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-lg text-gray-700 dark:text-gray-300">{formatProjectNumber(project) || projectId}</span>
            {project.is_archived && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-semibold rounded-full">
                {t('Archived')}
              </span>
            )}
            {(() => {
              const statusConfig = {
                [PROJECT_STATUS.NOT_SENT]: { color: '#FF857C', icon: X, label: 'not sent' },
                [PROJECT_STATUS.SENT]: { color: '#51A2F7', icon: null, label: 'sent' },
                [PROJECT_STATUS.APPROVED]: { color: '#73D38A', icon: CheckCircle, label: 'approved' },
                [PROJECT_STATUS.FINISHED]: { color: '#C4C4C4', icon: Flag, label: 'finished' }
              };
              const config = statusConfig[project.status] || statusConfig[PROJECT_STATUS.NOT_SENT];
              const StatusIcon = config.icon;
              return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm"
                  style={{ backgroundColor: config.color }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white">
                    {project.status === PROJECT_STATUS.SENT ? (
                      <span className="text-xs font-bold" style={{ color: config.color }}>?</span>
                    ) : (
                      <StatusIcon size={12} color={config.color} strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{t(config.label)}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Project Notes mirroring body layout width */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {canView('price_offer_note') && (
              <div className="mt-2">
                <input
                  ref={(el) => { if (el && isEditingProjectNotes) el.focus(); }}
                  type="text"
                  value={isEditingProjectNotes ? editingProjectNotes : (project.notes || '')}
                  onChange={(e) => setEditingProjectNotes(e.target.value)}
                  onFocus={(!project.is_archived && canEdit('price_offer_note')) ? handleEditProjectNotes : undefined}
                  onBlur={handleSaveProjectNotes}
                  readOnly={!isEditingProjectNotes || !canEdit('price_offer_note')}
                  className={`w-full text-sm font-medium ${isEditingProjectNotes ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'} bg-transparent border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none no-gradient inline-note ${!project.is_archived && !isEditingProjectNotes && canEdit('price_offer_note') ? 'cursor-pointer' : ''}`}
                  placeholder={t('Notes_CP')}
                />
              </div>
            )}
          </div>
          {/* Spacer mirroring Sidebar width */}
          <div className="lg:w-80 xl:w-96 hidden lg:block"></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 space-y-4 lg:space-y-6 min-w-0">

          {/* Client & Supplier Section */}
          {canView('client_supplier') && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">Klient a Dodávateľ</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Block */}
                <div
                  onClick={() => {
                    if (!project.is_archived && canEdit('client_supplier')) {
                      if (selectedClientForProject) {
                        setShowEditClientModal(true);
                      } else {
                        setShowClientSelector(true);
                      }
                    }
                  }}
                  className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm ${!project.is_archived && canEdit('client_supplier') ? 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md' : ''}`}
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
                    {!project.is_archived && selectedClientForProject && canEdit('client_supplier') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProjectFromClient(selectedClientForProject.id, projectId);
                          updateProject(project.category, projectId, { clientId: null });
                          setSelectedClientForProject(null);
                        }}
                        className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title={t('Remove')}
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                    {!project.is_archived && canEdit('client_supplier') && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  </div>
                </div>

                {/* Supplier (Contractor) Block - Moved here and made half-width on desktop */}
                {!project.is_archived && (
                  <div className="relative">
                    <div
                      onClick={() => canEdit('client_supplier') && setShowContractorSelector(!showContractorSelector)}
                      className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm h-full ${canEdit('client_supplier') ? 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md transition-colors' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">{t('Project contractor')}</div>
                        <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                          {getCurrentContractor()?.name || t('assign contractor to project')}
                        </div>
                      </div>
                      {canEdit('client_supplier') && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
                    </div>

                    {showContractorSelector && canEdit('client_supplier') && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-4 pt-20 md:pt-4 overflow-y-auto" onClick={() => setShowContractorSelector(false)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in my-auto md:my-0" onClick={(e) => e.stopPropagation()}>
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
                )}
              </div>
            </div>
          )}

          {/* Project Rooms Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Project')}</h2>
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
                    onClick={async () => {
                      if (project.category === 'services') {
                        // For services projects, skip room type selection and create directly
                        const newRoom = await addRoomToProject(projectId, { name: 'Položky projektu' });
                        setSelectedRoom(newRoom);
                        setShowRoomDetailsModal(true);
                      } else {
                        setShowNewRoomModal(true);
                      }
                    }}
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
                  {getProjectRooms(projectId).map(room => {
                    const worksCount = calculateWorksCount(room, activePriceList);
                    return (
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
                          <div className="text-base text-gray-600 dark:text-gray-400">{worksCount} {tPlural(worksCount, 'work_singular', 'works', 'works_many')}</div>
                        </div>

                        {deleteMode ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoom(room);
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
                                  const calc = calculateRoomPriceWithMaterials(room, activePriceList);
                                  return calc.workTotal + calc.materialTotal + calc.othersTotal;
                                })())}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {getProjectRooms(projectId).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>{t('No rooms added yet. Click the + button to add a room.')}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Price Overview */}
          {canView('total_price_offer') && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h2>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{t('without VAT')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{formatPrice(calculateProjectTotalPrice(projectId, project))}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{t('VAT')} ({Math.round(getVATRate() * 100)}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{formatPrice(calculateProjectTotalPrice(projectId, project) * getVATRate())}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{t('Total price')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">{formatPrice(calculateProjectTotalPrice(projectId, project) * (1 + getVATRate()))}</span>
                  </div>
                </div>

                {!project.is_archived && canEdit('total_price_offer') && (
                  <>
                    <hr className="border-gray-300 dark:border-gray-600 my-4" />
                    <div className="flex gap-2 lg:gap-3">
                      <button
                        onClick={handlePreviewPriceOffer}
                        className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-2.5 lg:py-3 px-4 rounded-xl lg:rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <span className="text-sm lg:text-lg">{t('Preview')}</span>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSendPriceOffer}
                        className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 lg:py-3 px-4 rounded-xl lg:rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <span className="text-sm lg:text-lg">{t('Send')}</span>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Create/View Invoice Button - For project owner or if permitted */}
              {(isProjectOwner || canView('issue_document')) && !project.is_archived && (
                <button
                  onClick={() => {
                    if (!isPro && isProjectOwner) { setShowPaywall(true); return; }
                    if (canEdit('issue_document') || isProjectOwner) {
                      setShowInvoiceCreationModal(true);
                    } else {
                      // Maybe show read-only list? Or just disable.
                    }
                  }}
                  disabled={!isProjectOwner && !canEdit('issue_document')}
                  className={`w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white py-3 px-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${(!isProjectOwner && !canEdit('issue_document')) ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
                >
                  <span className="text-sm sm:text-lg">{t('Issue Document')}</span>
                  <Plus className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          )}

          {/* Invoices List (if exists) - For project owner or if permitted */}
          {(isProjectOwner || canView('issue_document')) && projectInvoices.length > 0 && (
            <div className="space-y-3">
              {projectInvoices // Show all invoices
                .filter(Boolean) // Safety check
                .map(invoice => (
                  <div
                    key={invoice.id}
                    onClick={() => {
                      if (!project.is_archived) {
                        setSelectedInvoice(invoice);
                        setShowInvoiceDetailModal(true);
                      }
                    }}
                    className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm ${!project.is_archived ? 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg">
                        {(() => {
                          const type = invoice.invoiceType || 'regular';
                          if (type === 'proforma') return t('Proforma Invoice');
                          if (type === 'delivery') return t('Delivery Note');
                          if (type === 'credit_note') return t('Credit Note');
                          return t('Invoice');
                        })()} {invoice.invoiceType !== 'delivery' ? invoice.invoiceNumber : ''}
                      </div>
                      <div className="text-base text-gray-600 dark:text-gray-400">{new Date(invoice.issueDate).toLocaleDateString('sk-SK')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 text-sm font-semibold rounded-full text-white ${invoice.status === INVOICE_STATUS.PAID
                        ? 'bg-green-500'
                        : invoice.status === INVOICE_STATUS.AFTER_MATURITY
                          ? 'bg-red-500'
                          : 'bg-blue-500'
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


          {/* Receipts Section */}
          {canView('receipts') && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
                  {t('Receipts')} - {calculateReceiptsTotal().toFixed(2).replace('.', ',')} €
                </h2>
              </div>
              <div className="flex flex-row gap-2">
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isAnalyzingReceipt || !canEdit('receipts')}
                  className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 px-2 lg:px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm lg:text-base font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors whitespace-nowrap ${(!canEdit('receipts')) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAnalyzingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('Analyzing...')} ({analyzingProgress.current}/{analyzingProgress.total})</span>
                    </>
                  ) : (
                    <>
                      <span>{t('Add receipts')}</span>
                      <Camera className="w-4 h-4" />
                    </>
                  )}
                </button>
                <input
                  ref={receiptInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptUpload}
                />
                <button
                  onClick={() => setShowReceiptsModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-2.5 lg:py-3 px-2 lg:px-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl text-sm lg:text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                >
                  <span>{t('View receipts')}</span>
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* History - Hidden on mobile, shown on desktop */}
          {canView('history') && (
            <div className="space-y-2.5 hidden lg:block">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                {(() => {
                  const history = getProjectHistory(projectId) || [];

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
          )}
        </div>

        {/* Right column - Notes and Photos */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Notes */}
          {canView('project_note') && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Notes_Project')}</h2>
              </div>
              <div onBlur={handleNotesBlur} onFocus={canEdit('project_note') ? handleNotesFocus : undefined}>
                <textarea
                  value={projectDetailNotes}
                  onChange={handleNotesChange}
                  placeholder={t('Add project notes...')}
                  className="w-full h-40 p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none mb-2"
                  disabled={project.is_archived || !canEdit('project_note')}
                />
                {!project.is_archived && isNoteFocused && canEdit('project_note') && (
                  <div className="flex gap-2 animate-fade-in">
                    <button
                      onClick={handleCancelNotes}
                      onMouseDown={() => {
                        // Prevent blur from firing immediately on mousedown
                        if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
                      }}
                      className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
                        handleSaveNotes();
                        setIsNoteFocused(false);
                      }}
                      onMouseDown={() => {
                        if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
                      }}
                      disabled={isSavingNotes}
                      className="flex-1 py-2 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                      {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {t('Save')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photos */}
          {canView('files') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Files')}</h2>
                </div>
                {canEditProject && canEdit('files') && (
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
                      className="p-3 rounded-2xl flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  </div>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handlePhotoUpload} className="hidden" />
              {projectPhotos.length > 0 ? (
                <div
                  className={`relative rounded-2xl no-border no-gradient transition-all duration-200 ${isDraggingPhoto ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' : ''
                    } ${canEditProject && !photoDeleteMode ? 'cursor-pointer' : ''}`}
                  style={{ boxShadow: 'none', border: 'none' }}
                  onClick={canEditProject && !photoDeleteMode ? () => photoInputRef.current?.click() : undefined}
                  onDrop={canEditProject && !photoDeleteMode ? handlePhotoDrop : undefined}
                  onDragOver={canEditProject && !photoDeleteMode ? handlePhotoDragOver : undefined}
                  onDragLeave={canEditProject && !photoDeleteMode ? handlePhotoDragLeave : undefined}
                >
                  {/* Photo Grid - 3 columns, max 7 rows = 21 photos per page */}
                  <div className="grid grid-cols-3 gap-2">
                    {projectPhotos.slice(photoPage * 21, (photoPage + 1) * 21).map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photoDeleteMode) {
                            handleDeletePhoto(photo.id);
                          } else {
                            if (photo.type === 'pdf' || photo.name?.toLowerCase().endsWith('.pdf') || photo.url?.startsWith('data:application/pdf')) {
                              setPdfUrl(photo.url);
                              setShowPDFPreview(true);
                            } else {
                              setSelectedPhotoIndex(photoPage * 21 + index);
                              setLightboxOpen(true);
                              setLightboxDirection(0);
                            }
                          }
                        }}
                      >
                        {photo.type === 'pdf' || photo.name?.toLowerCase().endsWith('.pdf') || photo.url?.startsWith('data:application/pdf') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <FileText className="w-10 h-10 text-red-500 mb-2" />
                            <span className="text-xs text-center text-gray-600 dark:text-gray-300 truncate w-full px-1">{photo.name}</span>
                          </div>
                        ) : (
                          <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        {photoDeleteMode && (
                          <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center z-10">
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
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{t('Drop files here')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`min-h-[120px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ${isDraggingPhoto ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' : ''
                    } ${canEditProject ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30' : ''}`}
                  onClick={canEditProject ? () => photoInputRef.current?.click() : undefined}
                  onDrop={canEditProject ? handlePhotoDrop : undefined}
                  onDragOver={canEditProject ? handlePhotoDragOver : undefined}
                  onDragLeave={canEditProject ? handlePhotoDragLeave : undefined}
                >
                  <Image className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {canEditProject ? (isDraggingPhoto ? t('Drop files here') : t('Click or drag files here')) : t('No files yet')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* History - Mobile only, shown after Photos */}
          {canView('history') && (
            <div className="space-y-2.5 lg:hidden">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                {(() => {
                  const history = getProjectHistory(projectId) || [];

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
          )}
        </div>
      </div>

      {/* Modals */}
      {
        showNewRoomModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewRoomModal(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
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
        )
      }

      {
        showCustomRoomModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-4 pt-20 md:pt-4 overflow-y-auto" onClick={() => setShowCustomRoomModal(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md relative my-auto md:my-0" onClick={(e) => e.stopPropagation()}>
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
        )
      }

      {
        showEditClientModal && selectedClientForProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-hidden animate-fade-in" onClick={() => clientFormRef.current?.submit()}>
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
                  onSave={handleUpdateClient}
                  onCancel={() => setShowEditClientModal(false)}
                />
              </div>
            </div>
          </div>
        )
      }

      {
        showClientSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-2 lg:p-4 pt-8 md:pt-4 overflow-y-auto" onClick={() => {
            if (showCreateClientInModal && createClientFormRef.current) {
              createClientFormRef.current.submit();
            } else {
              setShowClientSelector(false);
              setClientSearchQuery('');
            }
          }}>
            <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 lg:p-6 w-full ${showCreateClientInModal ? 'max-w-7xl h-[85vh]' : 'max-w-md'} lg:h-auto max-h-[85vh] lg:max-h-[90vh] overflow-y-auto transition-all my-auto md:my-0`} onClick={(e) => e.stopPropagation()}>
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
                  ref={createClientFormRef}
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
        )
      }

      {
        showRoomDetailsModal && selectedRoom && (
          <RoomDetailsModal
            room={selectedRoom}
            workProperties={workProperties}
            onSave={(workData, originalWorkItems) => handleSaveRoomWork(selectedRoom.id, workData, originalWorkItems)}
            onClose={() => setShowRoomDetailsModal(false)}
            isReadOnly={project.is_archived}
            priceList={activePriceList}
            projectOwnerId={project.user_id}
            isServicesProject={project.category === 'services'}
          />
        )
      }

      {
        showProjectPriceList && (
          <ProjectPriceList
            projectId={projectId}
            initialData={activePriceList}
            onClose={() => setShowProjectPriceList(false)}
            onSave={handleSaveProjectPriceList}
          />
        )
      }

      {
        showContractorModal && (
          <ContractorProfileModal
            onClose={() => setShowContractorModal(false)}
            onSave={handleSaveContractor}
          />
        )
      }

      {
        showContractorWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowContractorWarning(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-xl font-semibold">{t('Contractor Required')}</h3>
              </div>
              <p className="text-gray-600 mb-6">{t('A contractor must be assigned to duplicate a project.')}</p>
              <button onClick={() => setShowContractorWarning(false)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors">{t('Cancel')}</button>
            </div>
          </div>
        )
      }

      {
        showInvoiceCreationModal && (
          <InvoiceCreationModal
            isOpen={showInvoiceCreationModal}
            onClose={() => setShowInvoiceCreationModal(false)}
            project={project}
            categoryId={project.category}
          />
        )
      }

      {
        showInvoiceDetailModal && (
          <InvoiceDetailModal
            isOpen={showInvoiceDetailModal}
            onClose={() => {
              setShowInvoiceDetailModal(false);
              setSelectedInvoice(null);
            }}
            invoice={selectedInvoice || getInvoiceForProject(projectId)}
            hideViewProject={true}
          />
        )
      }

      {/* Receipts Modal */}
      {
        showReceiptsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4" onClick={() => setShowReceiptsModal(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[75vh] lg:max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Receipts')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('Total')}: {calculateReceiptsTotal().toFixed(2).replace('.', ',')} €
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
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {selectedReceipt.merchant_name === 'Unknown' ? t('Unknown vendor') : selectedReceipt.merchant_name}
                          </p>
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
                            {(receipt.merchant_name && receipt.merchant_name !== 'Unknown') ? receipt.merchant_name : t('Unknown vendor')}
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
                        <span>{t('Analyzing...')} ({analyzingProgress.current}/{analyzingProgress.total})</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{t('Add receipts')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Animated Lightbox */}
      {
        selectedPhotoIndex !== null && projectPhotos.length > 0 && (
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
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 z-10"
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
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 z-10"
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
              onClick={(e) => {
                e.stopPropagation();
                // Keep click for next photo for desktop users, but touch users will swipe
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                transform: currentTranslate ? `translateX(${currentTranslate}px)` : 'none',
                transition: currentTranslate ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              <img
                key={selectedPhotoIndex}
                draggable={false} // Prevent native drag
                src={projectPhotos[selectedPhotoIndex]?.url}
                alt={projectPhotos[selectedPhotoIndex]?.name || "Project Photo"}
                className={`max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none ${!currentTranslate && (lightboxDirection === -1
                  ? 'animate-slide-from-left'
                  : lightboxDirection === 1
                    ? 'animate-slide-from-right'
                    : 'animate-fadeSlideIn')
                  }`}
              />
            </div>

            {/* Photo Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-semibold">
              {selectedPhotoIndex + 1} / {projectPhotos.length}
            </div>
          </div>
        )
      }

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={handleClosePDFPreview}
        pdfUrl={pdfUrl}
        onSend={() => {
          handleClosePDFPreview();
          handleSendPriceOffer();
        }}
        title={`${t('Price offer')} - ${project.name}`}
      />

      {/* Paywall Modal with Stripe integration */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Archive Confirmation Modal */}
      {
        showArchiveConfirmation && (
          project.is_archived ? (
            <ConfirmationModal
              isOpen={showArchiveConfirmation}
              onClose={() => setShowArchiveConfirmation(false)}
              onConfirm={() => {
                deleteArchivedProject(projectId);
                onBack();
              }}
              title={t('Delete Archived Project')}
              message={t('Are you sure you want to permanently delete this archived project? This action cannot be undone.')}
              confirmText={t('Delete')}
              confirmColor="bg-red-600"
            />
          ) : (
            <ConfirmationModal
              isOpen={showArchiveConfirmation}
              onClose={() => setShowArchiveConfirmation(false)}
              onConfirm={() => {
                archiveProject(project.category, projectId);
                onBack();
              }}
              title={t('Archive project {name}?').replace('{name}', project.name)}
              message="Archiving this project will not result in data loss. You can find this project in the 'Archive' tab in the app settings."
              confirmLabel="ArchiveProjectAction"
              cancelLabel="Cancel"
              icon="info"
            />
          )
        )
      }

      {
        showShareModal && (
          <ShareProjectModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            projectId={projectId}
            projectName={project.name}
          />
        )
      }

      {/* Dennik Modal */}
      {
        showDennikModal && (
          <DennikModal
            isOpen={showDennikModal}
            onClose={() => { setShowDennikModal(false); setDennikInitialDate(null); }}
            project={project}
            isOwner={isProjectOwner}
            currentUser={user}
            initialDate={dennikInitialDate}
          />
        )
      }

      {/* Room Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDeleteRoom}
        title={t('Delete room?')}
        message={t('Are you sure you want to delete "{name}"? This action cannot be undone.').replace('{name}', roomToDelete ? (t(roomToDelete.name) !== roomToDelete.name ? t(roomToDelete.name) : roomToDelete.name) : '')}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div >
  );
};

export default ProjectDetailView;
