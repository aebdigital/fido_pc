import React, { useState, useRef, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { generatePriceOfferPDF } from '../utils/pdfGenerator';
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
    priceOfferSettings
  } = useAppData();

  // Local state
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
  const [photoPage, setPhotoPage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState(0); // -1 for left, 1 for right, 0 for initial
  
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

    setProjectDetailNotes(project.detail_notes || '');
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
    const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
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
    setShowProjectPriceList(false);
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
      await updateProject(project.category, project.id, { c_id: newContractorId });
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
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      newPhotos.push({
        id: Date.now() + Math.random(),
        url: base64,
        name: file.name,
        createdAt: new Date().toISOString()
      });
    }

    const updatedPhotos = [...projectPhotos, ...newPhotos];
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, project.id, { photos: updatedPhotos });
  };

  const handleDeletePhoto = (photoId) => {
    const updatedPhotos = projectPhotos.filter(p => p.id !== photoId);
    setProjectPhotos(updatedPhotos);
    updateProject(project.category, project.id, { photos: updatedPhotos });
  };

  const handleSaveDetailNotes = () => {
    updateProject(project.category, project.id, { detail_notes: projectDetailNotes });
    setIsEditingDetailNotes(false);
  };

  const handlePreviewPriceOffer = () => {
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
      const result = generatePriceOfferPDF({
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
        offerValidityPeriod: priceOfferSettings?.timeLimit || 30
      }, t); // Pass t as the second argument
      setPdfUrl(result.blobUrl);
      setShowPDFPreview(true);
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
    }
  };

  const handleSendPriceOffer = async () => {
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

    // Track history
    addProjectHistoryEntry(project.id, {
      type: 'Price offer sent'
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('Cenová ponuka')} - ${project.name}`,
          text: text,
        });
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
                className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
                autoFocus
              />
            ) : (
              <>
                <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
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
            <span className="text-base lg:text-lg text-gray-700 dark:text-gray-300">{project.number || project.id}</span>
            {project.is_archived && (
              <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-400 text-xs lg:text-sm font-medium rounded-full">
                {t('Archived')}
              </span>
            )}
            {project.invoiceStatus && (
              <span className={`px-2 py-1 text-xs lg:text-sm font-medium rounded-full ${ 
                project.invoiceStatus === 'sent'
                  ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : project.invoiceStatus === 'paid'
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
              }`}>
                {t(project.invoiceStatus === 'sent' ? 'sent' : project.invoiceStatus === 'paid' ? 'Paid' : 'unsent')}
              </span>
            )}
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
                <div className="font-medium text-gray-900 dark:text-white text-lg">
                  {selectedClientForProject ? selectedClientForProject.name : t('No client')}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-400 truncate">
                  {selectedClientForProject ? selectedClientForProject.email : t('Associate project with a client')}
                </div>
              </div>
              {!project.is_archived && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
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
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
                    onClick={() => setDeleteMode(!deleteMode)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    onClick={() => setShowNewRoomModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {isLoadingDetails ? (
                <div className="text-center py-12">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                   <p className="text-gray-500 dark:text-gray-400 font-medium">{t('Loading project details...')}</p>
                </div>
              ) : (
                <>
                  {getProjectRooms(project.id).map(room => (
                    <div 
                      key={room.id}
                      className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center transition-all duration-300 shadow-sm ${deleteMode ? 'justify-between' : 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:shadow-md'}`}
                      onClick={deleteMode ? undefined : () => {
                        setSelectedRoom(room);
                        setShowRoomDetailsModal(true);
                      }}
                    >
                      <div className={`transition-all duration-300 flex-1 ${deleteMode ? 'mr-4' : ''}`}> 
                        <div className="font-medium text-gray-900 dark:text-white text-lg">{t(room.name) !== room.name ? t(room.name) : room.name}</div>
                        <div className="text-base text-gray-600 dark:text-gray-400">{room.workItems?.length || 0} {t('works')}</div>
                      </div>
                      
                      {deleteMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          className="bg-red-500 hover:bg-red-600 rounded-2xl p-3 transition-all duration-300 animate-in slide-in-from-right-5 self-end sm:self-auto mt-3 sm:mt-0"
                        >
                          <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </button>
                      ) : (
                        <div className="flex items-center justify-between sm:justify-end sm:gap-2 mt-3 sm:mt-0">
                          <div className="text-left sm:text-right">
                            <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</div>
                            <div className="font-semibold text-gray-900 dark:text-white text-lg">
                              {formatPrice((() => {
                                const calc = calculateRoomPriceWithMaterials(room, project.priceListSnapshot);
                                return calc.workTotal + calc.materialTotal + calc.othersTotal;
                              })())}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
                    className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Náhľad')}</span>
                  </button>
                  <button
                    onClick={handleSendPriceOffer}
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
                  onClick={() => setShowInvoiceCreationModal(true)}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
                        <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Invoice')} {invoice.invoiceNumber}</div>
                        <div className="text-base text-gray-600 dark:text-gray-400">{new Date(invoice.issueDate).toLocaleDateString('sk-SK')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${ 
                        invoice.status === 'sent'
                          ? 'bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400'
                          : invoice.status === 'paid'
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400'
                      }`}>
                        {t(invoice.status === 'sent' ? 'sent' : invoice.status === 'paid' ? 'Paid' : 'unsent')}
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
                    <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Project price list')}</div>
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
                      <div className="font-medium text-gray-900 dark:text-white text-lg">{t('Project contractor')}</div>
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
                              className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between ${ 
                                (project.c_id || activeContractorId) === contractor.id
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                              }`}
                            >
                              <span className="font-medium truncate">{contractor.name}</span>
                              {(project.c_id || activeContractorId) === contractor.id && (
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
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Archive className="w-4 h-4" />
                    <span className="text-sm sm:text-lg">{t('Unarchive')}</span>
                  </button>
                  <button 
                    onClick={() => {
                      deleteArchivedProject(project.id);
                      onBack();
                    }}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-2xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" /> 
                    <span className="text-sm sm:text-lg">{t('Delete Forever')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleDuplicateProject}
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Copy className="w-4 h-4" /> 
                    <span className="text-sm sm:text-lg">{t('Duplicate')}</span>
                  </button>
                  <button 
                    onClick={() => {
                      archiveProject(project.category, project.id);
                      onBack();
                    }}
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Archive className="w-4 h-4" /> 
                    <span className="text-sm sm:text-lg">{t('Archive')}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('History')}</h2>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
              {(() => {
                const history = getProjectHistory(project.id) || [];
                const createdEvent = { type: 'Created', date: project.created_at };
                
                const allEvents = [...history, createdEvent]
                  .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

                const formatHistoryEventType = (eventType) => {
                  return eventType
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                };

                return allEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${event.type === 'Created' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-500'}`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(formatHistoryEventType(event.type))}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {event.date ? new Date(event.date).toLocaleString('sk-SK') : '-'}
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
                  <button onClick={() => setIsEditingDetailNotes(false)} className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl">{t('Cancel')}</button>
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
                <button onClick={() => photoInputRef.current?.click()} className="p-2 text-gray-600 hover:text-gray-900">
                  <Plus className="w-5 h-5" />
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </div>
            {projectPhotos.length > 0 ? (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
                {/* Photo Grid - 3 columns, max 7 rows = 21 photos per page */}
                <div className="grid grid-cols-3 gap-2">
                  {projectPhotos.slice(photoPage * 21, (photoPage + 1) * 21).map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => {
                        setSelectedPhotoIndex(photoPage * 21 + index);
                        setLightboxOpen(true);
                        setLightboxDirection(0);
                      }}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {!project.is_archived && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination - only show if more than 21 photos */}
                {projectPhotos.length > 21 && (
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setPhotoPage(p => Math.max(0, p - 1))}
                      disabled={photoPage === 0}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        photoPage === 0
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
                      onClick={() => setPhotoPage(p => Math.min(Math.ceil(projectPhotos.length / 21) - 1, p + 1))}
                      disabled={photoPage >= Math.ceil(projectPhotos.length / 21) - 1}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        photoPage >= Math.ceil(projectPhotos.length / 21) - 1
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[120px] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <Image className="w-8 h-8 mb-2 text-gray-400" />
                <span className="text-sm text-gray-500">{t('Click to add photos')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">{t('New room')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {roomTypes.map((type) => (
                <button key={type} onClick={() => handleAddRoom(type)} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200">
                  {t(type)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewRoomModal(false)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl">{t('Cancel')}</button>
          </div>
        </div>
      )}

      {showCustomRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">{t('Custom Room Name')}</h3>
            <input
              type="text"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomRoomCreate(); }}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCustomRoomModal(false)} className="flex-1 px-4 py-3 bg-gray-100 rounded-xl">{t('Cancel')}</button>
              <button onClick={handleCustomRoomCreate} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl">{t('Create')}</button>
            </div>
          </div>
        </div>
      )}

      {showClientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full ${showCreateClientInModal ? 'max-w-7xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto transition-all`}>
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
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {clients.map(client => (
                    <button key={client.id} onClick={() => handleClientSelect(client)} className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 text-left">
                      <div className="font-medium">{client.name}</div>
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
                
                <button onClick={() => setShowClientSelector(false)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl">{t('Cancel')}</button>
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
            <button onClick={() => setShowContractorWarning(false)} className="w-full px-4 py-3 bg-gray-100 rounded-xl">{t('Cancel')}</button>
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
        />
      )}

      {/* Animated Lightbox */}
      {selectedPhotoIndex !== null && projectPhotos.length > 0 && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
            lightboxOpen
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
            className={`transition-all duration-300 ease-out ${
              lightboxOpen
                ? 'scale-100 opacity-100'
                : 'scale-95 opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={selectedPhotoIndex}
              src={projectPhotos[selectedPhotoIndex]?.url}
              alt={projectPhotos[selectedPhotoIndex]?.name || "Project Photo"}
              className={`max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl ${
                lightboxDirection === -1
                  ? 'animate-slide-from-left'
                  : lightboxDirection === 1
                  ? 'animate-slide-from-right'
                  : 'animate-fadeSlideIn'
              }`}
            />
          </div>

          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium">
            {selectedPhotoIndex + 1} / {projectPhotos.length}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
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
    </div>
  );
};

export default ProjectDetailView;
