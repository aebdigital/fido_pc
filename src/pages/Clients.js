import React, { useState } from 'react';
import { User, Search, ChevronRight, Plus, Trash2, Edit3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const Clients = () => {
  const navigate = useNavigate();
  const { clients, addClient, findProjectById, calculateProjectTotalPrice, formatPrice } = useAppData();
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientType, setClientType] = useState('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    additionalInfo: '',
    city: '',
    postalCode: '',
    country: '',
    businessId: '',
    taxId: '',
    vatId: '',
    contactPerson: ''
  });

  const handleCreateClient = () => {
    setShowAddClient(true);
    setClientForm({
      name: '',
      email: '',
      phone: '',
      street: '',
      additionalInfo: '',
      city: '',
      postalCode: '',
      country: '',
      businessId: '',
      taxId: '',
      vatId: '',
      contactPerson: ''
    });
  };

  const handleCancel = () => {
    setShowAddClient(false);
    setSelectedClient(null);
  };

  const handleInputChange = (field, value) => {
    setClientForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveClient = () => {
    if (clientForm.name.trim()) {
      const clientData = {
        ...clientForm,
        type: clientType
      };
      addClient(clientData);
      setShowAddClient(false);
      setClientForm({
        name: '',
        email: '',
        phone: '',
        street: '',
        additionalInfo: '',
        city: '',
        postalCode: '',
        country: '',
        businessId: '',
        taxId: '',
        vatId: '',
        contactPerson: ''
      });
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
  };

  const handleProjectOpen = (project) => {
    // Navigate to projects page with the specific project selected
    navigate('/projects', { state: { selectedProjectId: project.id, selectedClient: selectedClient } });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Client Detail View */}
      {selectedClient ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToList}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>

          {/* Client Avatar and Name */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedClient.name}</h1>
          </div>

          {/* Contact and Location - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Section */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact</h2>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Phone number</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.phone}</p>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location</h2>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Street</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.street}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Additional info</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.additionalInfo}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">City</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.city}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Postal code</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.postalCode}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Country</span>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedClient.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Client's Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Client's projects</h2>
              <button className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedClient.projects.map((project, index) => (
                <button
                  key={index}
                  onClick={() => handleProjectOpen(project)}
                  className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{project.rooms} room</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">VAT not included</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculateProjectTotalPrice(project.id))}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Edit Client Button */}
          <button className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-4 rounded-2xl font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
            <Edit3 className="w-4 h-4" />
            Edit client
          </button>
        </div>
      ) : showAddClient ? (
        /* Add Client Form */
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <button 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New client</h2>
            <div></div>
          </div>

          <div className="p-6 flex gap-8">
            {/* Left Side - Client Type Selection */}
            <div className="w-80 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Type of client?</h3>
              <div className="flex flex-col gap-3 mb-8">
                <button
                  className={`py-3 px-6 rounded-2xl font-medium transition-all text-left ${
                    clientType === 'private' 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-400 dark:border-gray-500' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setClientType('private')}
                >
                  Private
                </button>
                <button
                  className={`py-3 px-6 rounded-2xl font-medium transition-all text-left ${
                    clientType === 'business' 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-400 dark:border-gray-500' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setClientType('business')}
                >
                  Business
                </button>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white dark:text-gray-900" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {clientType === 'private' ? 'Private entity' : 'Business entity'}
                </h2>
              </div>
            </div>

            {/* Right Side - Form Fields */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Name</label>
                  <input 
                    type="text" 
                    value={clientForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={clientType === 'private' ? 'Name and surname' : 'Name of company'}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Email</label>
                  <input 
                    type="email" 
                    value={clientForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Email address"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Phone number</label>
                  <input 
                    type="tel" 
                    value={clientForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Number"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Street</label>
                  <input 
                    type="text" 
                    value={clientForm.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="Street"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Additional info</label>
                  <input 
                    type="text" 
                    value={clientForm.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    placeholder="App #, Suite (optional)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">City</label>
                  <input 
                    type="text" 
                    value={clientForm.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Postal code</label>
                  <input 
                    type="text" 
                    value={clientForm.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="ZIP Code"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Country</label>
                  <input 
                    type="text" 
                    value={clientForm.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Country"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                {clientType === 'business' && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">Business ID</label>
                      <input 
                        type="text" 
                        value={clientForm.businessId}
                        onChange={(e) => handleInputChange('businessId', e.target.value)}
                        placeholder="BID"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">Tax ID</label>
                      <input 
                        type="text" 
                        value={clientForm.taxId}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        placeholder="TID"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">VAT Registration Number</label>
                      <input 
                        type="text" 
                        value={clientForm.vatId}
                        onChange={(e) => handleInputChange('vatId', e.target.value)}
                        placeholder="VAT ID"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">Contact person</label>
                      <input 
                        type="text" 
                        value={clientForm.contactPerson}
                        onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                        placeholder="Name and surname"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  </>
                )}
                
                <div className="mt-8 col-span-full">
                  <button 
                    onClick={handleSaveClient}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Add client
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Clients List View */
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
            <div className="flex items-center gap-4">
              <div className="w-72 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search" 
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleCreateClient}
                  className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Clients List */}
          {filteredClients.length > 0 ? (
            <div className="space-y-3">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{client.name}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-96">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 text-center max-w-md">
                <div className="w-16 h-16 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <User className="w-8 h-8 text-white dark:text-gray-900" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Add Client</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Fill in your client and then assign a project to them</p>
                <button 
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  onClick={handleCreateClient}
                >
                  Create
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