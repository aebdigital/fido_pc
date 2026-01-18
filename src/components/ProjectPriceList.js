import React, { useState, useEffect, useRef } from 'react';
import { Hammer, Package, Menu, Info, RefreshCw, RefreshCcw, Wrench, ChevronDown, ChevronUp, Loader2, Check, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from './NumberInput';
import ConfirmationModal from './ConfirmationModal';

const ProjectPriceList = ({ projectId, initialData, onClose, onSave }) => {
  const { generalPriceList } = useAppData();
  const { t } = useLanguage();
  const [projectPriceData, setProjectPriceData] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'modified'
  const [expandedSections, setExpandedSections] = useState({
    work: true,
    material: true,
    installations: true,
    others: true
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const lastSavedData = useRef(null);
  const onSaveRef = useRef(onSave);
  const isUnmounting = useRef(false);
  const saveTimerRef = useRef(null);

  // Update ref when prop changes
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Initialize project price data from general settings or load existing project overrides
  useEffect(() => {
    if (!generalPriceList) return;

    // If we have saved project data, use it; otherwise use general prices
    let initialPrices;
    if (initialData) {
      initialPrices = JSON.parse(JSON.stringify(initialData)); // Deep clone
    } else {
      // Otherwise initialize with general prices
      initialPrices = JSON.parse(JSON.stringify(generalPriceList)); // Deep clone
    }

    // ALWAYS ensure originalPrice and isOverridden flags exist for each item
    // This is needed because:
    // 1. Projects created on iOS store prices in price_lists table without these flags
    // 2. Projects loaded from database need the general price as reference for override detection
    Object.keys(initialPrices).forEach(category => {
      if (!Array.isArray(initialPrices[category])) return;

      initialPrices[category] = initialPrices[category].map((item, index) => {
        // Normalize names for old projects to new localized constants
        let normalizedName = item.name;
        if (item.name === 'Skirting') normalizedName = 'Lištovanie';
        if (item.name === 'Skirting board') normalizedName = 'Soklové lišty';

        // Get the original price from general price list for comparison
        const generalItem = generalPriceList[category]?.[index];
        const originalPrice = item.originalPrice !== undefined
          ? item.originalPrice
          : (generalItem?.price ?? item.price);

        // Determine if this item is overridden (price differs from original)
        const isOverridden = item.isOverridden !== undefined
          ? item.isOverridden
          : (item.price !== originalPrice);

        return {
          ...item,
          name: normalizedName,
          originalPrice,
          isOverridden
        };
      });
    });

    setProjectPriceData(initialPrices);
    lastSavedData.current = JSON.stringify(initialPrices);
  }, [projectId, generalPriceList, initialData]);

  // Autosave Logic with proper debouncing
  useEffect(() => {
    if (!projectPriceData || isUnmounting.current) return;

    const currentDataString = JSON.stringify(projectPriceData);
    // Only save if data has changed from last save AND lastSavedData is initialized
    if (lastSavedData.current && currentDataString !== lastSavedData.current) {
      setSaveStatus('modified');

      // Clear any existing timer before setting a new one
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        if (isUnmounting.current) return;

        setSaveStatus('saving');
        onSaveRef.current(projectPriceData);
        lastSavedData.current = currentDataString;
        saveTimerRef.current = null;

        setTimeout(() => {
          if (!isUnmounting.current) setSaveStatus('saved');
        }, 800);
      }, 1500); // 1.5 second debounce for more buffer while typing
    }

    // Cleanup on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [projectPriceData]);

  const handleClose = async () => {
    if (saveStatus === 'modified') {
      try {
        await onSaveRef.current(projectPriceData);
      } catch (error) {
        console.error('Auto-save failed on close:', error);
      }
    }
    isUnmounting.current = true;
    onClose();
  };

  const handlePriceChange = (category, itemIndex, newPrice) => {
    const processedPrice = newPrice || 0;

    setProjectPriceData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = updated[category][itemIndex];
      const isOverride = processedPrice !== item.originalPrice;

      updated[category][itemIndex] = {
        ...item,
        price: processedPrice,
        isOverridden: isOverride
      };

      return updated;
    });
  };

  const handleResetToOriginal = (category, itemIndex) => {
    setProjectPriceData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = updated[category][itemIndex];

      updated[category][itemIndex] = {
        ...item,
        price: item.originalPrice,
        isOverridden: false
      };

      return updated;
    });
  };

  const handleCapacityChange = (category, itemIndex, newCapacity) => {
    const processedCapacity = newCapacity || 0;

    setProjectPriceData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = updated[category][itemIndex];

      updated[category][itemIndex] = {
        ...item,
        capacity: { ...item.capacity, value: processedCapacity }
      };

      return updated;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  const handleResetAll = () => {
    if (!generalPriceList) return;

    // Reset to general price list
    let initialPrices = JSON.parse(JSON.stringify(generalPriceList)); // Deep clone

    // Initialize with correct structure and flags
    Object.keys(initialPrices).forEach(category => {
      if (!Array.isArray(initialPrices[category])) return;

      initialPrices[category] = initialPrices[category].map((item, index) => {
        // Normalize names for old projects to new localized constants
        let normalizedName = item.name;
        if (item.name === 'Skirting') normalizedName = 'Lištovanie';
        if (item.name === 'Skirting board') normalizedName = 'Soklové lišty';

        return {
          ...item,
          name: normalizedName,
          originalPrice: item.price, // Since it's reset, current price IS original
          isOverridden: false
        };
      });
    });

    setProjectPriceData(initialPrices);
    setShowResetConfirm(false);
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className={`${category === 'material' ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'} rounded-2xl p-3 lg:p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {category === 'installations' && item.subtitle ? (
            <h3 className="font-semibold text-gray-900 dark:text-white leading-tight text-base lg:text-lg">{t(item.subtitle)}</h3>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight text-base lg:text-lg">{t(item.name)}</h3>
              {item.subtitle && (
                <p className="text-xs lg:text-sm text-black dark:text-white -mt-0.5 leading-tight">{t(item.subtitle)}</p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-28 sm:w-auto">
            <NumberInput
              value={item.price}
              onChange={(newValue) => handlePriceChange(category, itemIndex, newValue)}
              className={item.isOverridden
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100'
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
              }
              min={0}
            />
          </div>
          <div className="text-sm lg:text-base text-black dark:text-white flex-shrink-0">{t(item.unit)}</div>
          {item.isOverridden && (
            <button
              onClick={() => handleResetToOriginal(category, itemIndex)}
              className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center flex-shrink-0"
              title={t('Reset to original price')}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {item.capacity && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm lg:text-base text-black dark:text-white">
              {(item.name === 'Adhesive' || item.name === 'Plaster' || item.name === 'Facade Plaster')
                ? t('capacity per 25kg package')
                : `${t('capacity per')} ${item.unit.includes('pc') ? t('piece') : t('package')}`
              }
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-28 sm:w-auto">
                <NumberInput
                  value={item.capacity.value}
                  onChange={(newValue) => handleCapacityChange(category, itemIndex, newValue)}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  min={0}
                  step={0.1}
                />
              </div>
              <span className="text-sm lg:text-base text-black dark:text-white">{item.capacity.unit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!projectPriceData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 animate-slide-in">
          <div className="text-center">{t('Loading...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 animate-fade-in" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[75vh] lg:h-[85vh] max-h-[calc(100vh-6rem)] flex flex-col animate-slide-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Project Price List')}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title={t('Update prices from general price list?')}
            >
              <RefreshCcw className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${saveStatus === 'saved'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : saveStatus === 'saving'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                }`}
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Loader2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {saveStatus === 'saved' ? t('Saved') : saveStatus === 'saving' ? t('Saving...') : t('Saving...')}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{t('Changing the price list will overwrite the prices in this project only')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {/* Work Section */}
          <div className="mb-6">
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('work')}
            >
              <div className="flex items-center gap-2">
                <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h2>
              </div>
              {expandedSections.work ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>

            {expandedSections.work && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
                {projectPriceData.work.map((item, index) => (
                  <PriceCard key={index} item={item} category="work" itemIndex={index} />
                ))}
              </div>
            )}
          </div>

          {/* Material Section */}
          <div className="mb-6">
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('material')}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Material')}</h2>
              </div>
              {expandedSections.material ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>

            {expandedSections.material && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
                {projectPriceData.material.map((item, index) => (
                  <PriceCard key={index} item={item} category="material" itemIndex={index} />
                ))}
              </div>
            )}
          </div>

          {/* Installations Section */}
          {projectPriceData.installations && (
            <div className="mb-6">
              <div
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('installations')}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Sanitary installations')}</h2>
                </div>
                {expandedSections.installations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>

              {expandedSections.installations && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
                  {projectPriceData.installations.map((item, index) => (
                    <PriceCard key={index} item={item} category="installations" itemIndex={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Others Section */}
          <div className="mb-6">
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('others')}
            >
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h2>
              </div>
              {expandedSections.others ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>

            {expandedSections.others && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
                {projectPriceData.others.filter(item => item.name !== 'Custom work and material').map((item, index) => (
                  <PriceCard key={index} item={item} category="others" itemIndex={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAll}
        title="Update prices from general price list?"
        message="By updating the prices, you will replace all existing prices with those from the general price list. This action is irreversible."
        confirmLabel="Update"
        icon="warning"
      />
    </div>
  );
};

export default ProjectPriceList;