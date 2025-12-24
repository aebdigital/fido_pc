import React, { useState } from 'react';
import { User, Search, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import ClientForm from '../components/ClientForm';

const Clients = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { clients, addClient, updateClient, deleteClient, calculateProjectTotalPrice, formatPrice, findProjectById, getProjectRooms } = useAppData();
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);

  const handleDeleteClient = (clientId) => {
    if (window.confirm(t('Are you sure you want to delete this client?'))) {
      deleteClient(clientId);
      setSelectedClient(null);
    }
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setShowClientModal(true);
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const handleSaveClient = (clientData) => {
    if (selectedClient) {
      // Editing existing client
      updateClient(selectedClient.id, clientData);
    } else {
      // Creating new client
      addClient(clientData);
    }
    setShowClientModal(false);
    setSelectedClient(null);
  };

  const handleCloseModal = () => {
    setShowClientModal(false);
    setSelectedClient(null);
  };

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
    (client.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientAddress = (client) => {
    const parts = [client.street, client.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Clients List View */}
      <div>
        {/* Header */}
        <div className="mb-6 lg:mb-8 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <h1 className="block text-4xl font-bold text-gray-900 dark:text-white">{t('Clients')}</h1>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setDeleteMode(!deleteMode)}
                className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${deleteMode ? 'bg-gray-600 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
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
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-72 sm:flex-none lg:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search')}
              className="w-full pl-10 pr-4 py-2 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500 text-lg"
            />
          </div>
        </div>

        {/* Clients List - 4 per row on desktop */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${deleteMode ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => !deleteMode && handleClientSelect(client)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate">{client.name}</h3>
                    {getClientAddress(client) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{getClientAddress(client)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2">
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

      {/* Client Modal - Used for both Create and Edit */}
      {showClientModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center items-center p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedClient ? t('Edit client') : t('New client')}
              </h2>
            </div>
            <div className="p-4 lg:p-6">
              <ClientForm
                onSave={handleSaveClient}
                onCancel={handleCloseModal}
                initialData={selectedClient}
              />

              {/* Client's Projects Section - Only shown when editing */}
              {selectedClient && (selectedClient.projects || []).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("Client's projects")}</h3>
                  <div className="space-y-2">
                    {(selectedClient.projects || []).map((project, index) => {
                      const roomCount = getProjectRooms(project.id).length;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            handleCloseModal();
                            handleProjectOpen(project);
                          }}
                          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="text-left">
                            <h4 className="font-medium text-gray-900 dark:text-white">{project.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{roomCount} {t('room')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('VAT not included')}</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(project.id))}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;