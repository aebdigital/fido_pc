import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Clock,
  Building2,
  Loader2,
  ChevronRight
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
  const [isSaving, setIsSaving] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const debounceRef = useRef(null);

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

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTimeLimitChange = (newTimeLimit) => {
    const value = parseInt(newTimeLimit) || 30;
    setTimeLimit(value);

    // Debounced autosave
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsSaving(true);
    debounceRef.current = setTimeout(async () => {
      try {
        await updatePriceOfferSettings({ timeLimit: value });
      } catch (error) {
        console.error('Error saving settings:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500);
  };



  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('Supplier')}</h1>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${deleteMode ? 'bg-gray-600 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <button
            onClick={handleCreateContractor}
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
        </div>
      </div>

      <div>
        {/* Time Limit Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 lg:mb-6">
            <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Price offer validity')}</h2>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="grid grid-cols-4 gap-2 flex-1 lg:flex lg:flex-initial lg:gap-3">
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleTimeLimitChange(days)}
                      className={`py-1.5 lg:px-4 lg:py-2 rounded-xl font-semibold transition-colors text-sm lg:text-base text-center ${timeLimit === days
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      {days} {t('days')}
                    </button>
                  ))}
                </div>
                {isSaving && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-2" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('Validity of your price offers will be set for')} {timeLimit} {t('days')} {t('since creation')}.
              </p>
            </div>
          </div>
        </div>



        {/* Contractors List */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 lg:mb-6">
            <Building2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Contractors')}</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractors.map((contractor) => (
                <div
                  key={contractor.id}
                  className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${deleteMode ? '' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  onClick={() => !deleteMode && handleEditContractor(contractor)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">{contractor.name}</h3>
                          {contractor.businessId && (
                            <p className="text-gray-600 dark:text-gray-400 truncate">{contractor.businessId}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      {deleteMode ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteContractor(contractor.id); }}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shadow-sm"
                          title={t('Delete contractor')}
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