import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Plus,
  Clock,
  Building2,
  Mail,
  Phone,
  Globe,
  Save,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import ContractorProfileModal from '../components/ContractorProfileModal';

const PriceOfferSettings = ({ onBack }) => {
  const { t } = useLanguage();
  const { 
    contractors, 
    priceOfferSettings, 
    addContractor, 
    updateContractor, 
    deleteContractor,
    updatePriceOfferSettings 
  } = useAppData();

  const [showContractorModal, setShowContractorModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [timeLimit, setTimeLimit] = useState(priceOfferSettings.timeLimit || 30);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateContractor = () => {
    setEditingContractor(null);
    setShowContractorModal(true);
  };

  const handleEditContractor = (contractor) => {
    setEditingContractor(contractor);
    setShowContractorModal(true);
  };

  const handleSaveContractor = async (contractorData) => {
    try {
      if (editingContractor) {
        await updateContractor(editingContractor.id, contractorData);
      } else {
        await addContractor(contractorData);
      }
      setShowContractorModal(false);
      setEditingContractor(null);
    } catch (error) {
      console.error('Error saving contractor:', error);
      // Show user-friendly error message
      if (error.userFriendly) {
        alert(error.message);
      } else {
        alert('Failed to save contractor. Please try again.');
      }
    }
  };

  const handleDeleteContractor = async (contractorId) => {
    if (window.confirm(t('Are you sure you want to delete this contractor?'))) {
      try {
        await deleteContractor(contractorId);
      } catch (error) {
        console.error('Error deleting contractor:', error);
        if (error.userFriendly) {
          alert(error.message);
        } else {
          alert('Failed to delete contractor. Please try again.');
        }
      }
    }
  };

  const handleTimeLimitChange = (newTimeLimit) => {
    setTimeLimit(newTimeLimit);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updatePriceOfferSettings({ timeLimit: timeLimit });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('Failed to save settings. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 lg:mb-8">
        <button 
          onClick={onBack}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('Supplier')}</h1>
      </div>

      <div>
        
        {/* Time Limit Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 lg:mb-6">
            <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Validity Period')}</h2>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left side - Save button */}
              <div className="flex items-center gap-3 order-2 sm:order-1">
                <button
                  onClick={handleSaveSettings}
                  disabled={!hasChanges || isSaving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    hasChanges && !isSaving
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 opacity-100 scale-100'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50 scale-95'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? t('Saving...') : t('Save')}</span>
                </button>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1">{t('Offer validity period')}</h3>
                  <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{t('How long price offers remain valid')}</p>
                </div>
              </div>
              {/* Right side - Input */}
              <div className="flex items-center gap-3 order-1 sm:order-2">
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => handleTimeLimitChange(parseInt(e.target.value) || 30)}
                  min="1"
                  max="365"
                  className="w-20 p-2 bg-white dark:bg-gray-900 rounded-xl text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-center"
                />
                <span className="text-gray-600 dark:text-gray-400">{t('days')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contractors List */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Contractors')}</h2>
            </div>
            <button
              onClick={handleCreateContractor}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Add contractor')}</span>
            </button>
          </div>

          {contractors.length === 0 ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('No contractors yet')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('Add your first contractor to start creating price offers')}</p>
              <button
                onClick={handleCreateContractor}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {t('Create first contractor')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {contractors.map((contractor) => (
                <div key={contractor.id} className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{contractor.name}</h3>
                          {contractor.contactPerson && (
                            <p className="text-gray-600 dark:text-gray-400">{contractor.contactPerson}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {contractor.email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{contractor.email}</span>
                          </div>
                        )}
                        {contractor.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{contractor.phone}</span>
                          </div>
                        )}
                        {contractor.website && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Globe className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{contractor.website}</span>
                          </div>
                        )}
                      </div>
                      
                      {(contractor.street || contractor.city) && (
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                          <p>
                            {contractor.street && `${contractor.street}`}
                            {contractor.additionalInfo && `, ${contractor.additionalInfo}`}
                          </p>
                          {contractor.city && (
                            <p>
                              {contractor.postalCode && `${contractor.postalCode} `}
                              {contractor.city}
                              {contractor.country && `, ${contractor.country}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 self-end lg:self-auto">
                      <button
                        onClick={() => handleEditContractor(contractor)}
                        className="p-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
                        title={t('Edit contractor')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContractor(contractor.id)}
                        className="p-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-800 transition-colors border border-red-200 dark:border-red-700"
                        title={t('Delete contractor')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contractor Profile Modal */}
      {showContractorModal && (
        <ContractorProfileModal
          editingContractor={editingContractor}
          onClose={() => {
            setShowContractorModal(false);
            setEditingContractor(null);
          }}
          onSave={handleSaveContractor}
        />
      )}
    </div>
  );
};

export default PriceOfferSettings;