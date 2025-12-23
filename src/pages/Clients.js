import React, { useState, useCallback } from 'react';
import { User, Search, ChevronRight, Plus, Trash2, Edit3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import ClientForm from '../components/ClientForm';

// Helper component for editable fields - moved outside to prevent recreation on renders
const EditableField = React.memo(({ label, field, value, type = "text", isEditing, editForm, onInputChange, t }) => {
  if (isEditing) {
    return (
      <div>
        <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400 block">{label}</span>
        <input
          type={type}
          value={editForm[field] || ''}
          onChange={(e) => onInputChange(field, e.target.value)}
          className="w-full mt-1 px-3 py-2 lg:py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent text-lg"
          placeholder={t(`Enter ${label.toLowerCase()}`)}
          autoComplete="off"
        />
      </div>
    );
  }
  
  return (
    <div>
      <span className="text-sm lg:text-base text-gray-600 dark:text-gray-400 block">{label}</span>
      <p className="text-gray-900 dark:text-white font-medium text-lg break-words">{value || '-'}</p>
    </div>
  );
});

const Clients = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { clients, addClient, updateClient, deleteClient, calculateProjectTotalPrice, formatPrice, findProjectById, getProjectRooms } = useAppData();
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [deleteMode, setDeleteMode] = useState(false);

  const handleDeleteClient = (clientId) => {
    if (window.confirm(t('Are you sure you want to delete this client?'))) {
      deleteClient(clientId);
      setSelectedClient(null); // Clear selection if deleting current client
    }
  };

  const handleCreateClient = () => {
    setShowAddClient(true);
  };

  const handleCancel = () => {
    setShowAddClient(false);
    setSelectedClient(null);
  };

  const handleSaveClient = (clientData) => {
    addClient(clientData);
    setShowAddClient(false);
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setIsEditing(false);
    setEditForm({});
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Start editing - populate form with current client data
      setEditForm({ ...selectedClient });
    } else {
      // Cancel editing - reset form
      setEditForm({});
    }
    setIsEditing(!isEditing);
  };

  const handleEditSave = () => {
    // Update the client with edited data
    updateClient(selectedClient.id, editForm);
    setSelectedClient({ ...selectedClient, ...editForm });
    setIsEditing(false);
    setEditForm({});
  };

  const handleEditInputChange = useCallback((field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleProjectOpen = (project) => {
    // Find the full project details including categoryId
    const projectData = findProjectById(project.id);

    if (projectData) {
      // Navigate to projects page with the specific project selected
      navigate('/projects', {
        state: {
          selectedProjectId: project.id,
          selectedCategoryId: projectData.category,
          selectedClient: selectedClient
        }
      });
    }
  };


  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-20 lg:pb-0">
      {/* Client Detail View */}
      {selectedClient ? (
        <div className="space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button 
              onClick={handleBackToList}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors self-start"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-lg">Back</span>
            </button>
            
            {/* Edit Toggle Button */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {isEditing && (
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 lg:py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-lg"
                >
                  Save
                </button>
              )}
              <button
                onClick={handleEditToggle}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm hover:shadow-md"
                title={isEditing ? "Cancel editing" : "Edit client information"}
              >
                <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Client Avatar and Name */}
          <div className="text-center px-4">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 lg:w-12 lg:h-12 text-gray-600 dark:text-gray-400" />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => handleEditInputChange('name', e.target.value)}
                className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-gray-500 focus:outline-none text-center w-full max-w-md mx-auto"
                placeholder={t('Client name')}
              />
            ) : (
              <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words">{selectedClient.name}</h1>
            )}
          </div>

          {/* Contact and Location - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Contact Section */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Contact')}</h2>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <EditableField 
                  label={t('Name')} 
                  field="name" 
                  value={selectedClient.name} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('Email')} 
                  field="email" 
                  value={selectedClient.email} 
                  type="email" 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('Phone number')} 
                  field="phone" 
                  value={selectedClient.phone} 
                  type="tel" 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Location')}</h2>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3 lg:space-y-4">
                <EditableField 
                  label={t('Street')} 
                  field="street" 
                  value={selectedClient.street} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('Additional info')} 
                  field="additionalInfo" 
                  value={selectedClient.additionalInfo} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('City')} 
                  field="city" 
                  value={selectedClient.city} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('Postal code')} 
                  field="postalCode" 
                  value={selectedClient.postalCode} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label={t('Country')} 
                  field="country" 
                  value={selectedClient.country} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
              </div>
            </div>
          </div>

          {/* Business Information Section (if applicable) */}
          {(selectedClient.type === 'business' || selectedClient.businessId || selectedClient.taxId || selectedClient.vatId || selectedClient.contactPerson) && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Business Information')}</h2>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <EditableField 
                  label="Business ID" 
                  field="businessId" 
                  value={selectedClient.businessId} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label="Tax ID" 
                  field="taxId" 
                  value={selectedClient.taxId} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label="VAT Registration Number" 
                  field="vatId" 
                  value={selectedClient.vatId} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
                <EditableField 
                  label="Contact Person" 
                  field="contactPerson" 
                  value={selectedClient.contactPerson} 
                  isEditing={isEditing}
                  editForm={editForm}
                  onInputChange={handleEditInputChange}
                  t={t}
                />
              </div>
            </div>
          )}

          {/* Client's Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t("Client's projects")}</h2>
              <button className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md">
                <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {(selectedClient.projects || []).map((project, index) => {
                const roomCount = getProjectRooms(project.id).length;
                return (
                  <button
                    key={index}
                    onClick={() => handleProjectOpen(project)}
                    className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md gap-3 sm:gap-0"
                  >
                    <div className="text-left flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-lg">{project.name}</h3>
                      <p className="text-base text-gray-600 dark:text-gray-400">{roomCount} {t('room')}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('VAT not included')}</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-lg">{formatPrice(calculateProjectTotalPrice(project.id))}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Edit Client Button */}
          <button 
            onClick={handleEditToggle}
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-3 lg:py-4 rounded-2xl font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-lg"
          >
            <Edit3 className="w-4 h-4 lg:w-5 lg:h-5" />
            {t('Edit client')}
          </button>
        </div>
      ) : showAddClient ? (
        /* Add Client Form */
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <button 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-lg"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">New client</h2>
            <div></div>
          </div>

          <div className="p-4 lg:p-6">
            <ClientForm onSave={handleSaveClient} onCancel={handleCancel} />
          </div>
        </div>
      ) : (
        /* Clients List View */
        <div>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 lg:mb-8 gap-4">
            <h1 className="block text-4xl font-bold text-gray-900 dark:text-white">{t('Clients')}</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <div className="relative flex-1 sm:w-72 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('Search')} 
                  className="w-full pl-10 pr-4 py-2 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500 text-lg"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setDeleteMode(!deleteMode)}
                  className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${deleteMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                  <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
                <button 
                  onClick={handleCreateClient}
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Clients List */}
          {filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div 
                  key={client.id} 
                  className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${deleteMode ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  onClick={() => !deleteMode && handleClientSelect(client)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{client.name}</h3>
                          {client.contactPerson && (
                            <p className="text-gray-600 dark:text-gray-400">{client.contactPerson}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 self-end lg:self-auto items-center">
                      {deleteMode ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shadow-sm"
                          title={t('Delete client')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-96 px-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 lg:p-8 text-center max-w-md w-full shadow-sm">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                  <User className="w-7 h-7 lg:w-8 lg:h-8 text-white dark:text-gray-900" />
                </div>
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-3 lg:mb-4">{t('Add Client')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 lg:mb-6 text-lg leading-relaxed">{t('Fill in your client and then assign a project to them')}</p>
                <button 
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 lg:px-8 py-3 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md text-lg w-full sm:w-auto"
                  onClick={handleCreateClient}
                >
                  {t('Create')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Clients;