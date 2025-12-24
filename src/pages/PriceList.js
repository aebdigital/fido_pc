import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Hammer, Package, Info, Menu, Loader2, Check, TrendingUp, Wrench } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from '../components/NumberInput';

const PriceList = ({ onBack, onHasChangesChange, onSaveRef }) => {
  const { t } = useLanguage();
  const { generalPriceList, updateGeneralPriceList } = useAppData();
  const [localPriceList, setLocalPriceList] = useState(null);
  const [originalPrices, setOriginalPrices] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'modified'
  const [percentageIncrease, setPercentageIncrease] = useState('');
  const [showPercentageModal, setShowPercentageModal] = useState(false);

  const lastSavedData = useRef(null);
  const isUnmounting = useRef(false);

  // Initialize local state with data from context
  useEffect(() => {
    if (generalPriceList) {
      // Deep clone the price list for local editing
      const clonedPriceList = {};
      Object.keys(generalPriceList).forEach(category => {
        clonedPriceList[category] = generalPriceList[category].map(item => ({ ...item }));
      });
      
      // Only set if not already set or if explicitly needed (e.g. initial load)
      // For autosave, we want to keep local state if user is typing, but if context updates from elsewhere?
      // Since this is a page, it mounts once.
      if (!localPriceList) {
        setLocalPriceList(clonedPriceList);
        setOriginalPrices(clonedPriceList);
        lastSavedData.current = JSON.stringify(clonedPriceList);
      }
    }
  }, [generalPriceList]);

  // Autosave Logic
  useEffect(() => {
    if (!localPriceList || isUnmounting.current) return;

    const currentDataString = JSON.stringify(localPriceList);
    // Only save if data has changed from last save AND lastSavedData is initialized
    if (lastSavedData.current && currentDataString !== lastSavedData.current) {
      setSaveStatus('modified');
      
      const timer = setTimeout(() => {
        if (isUnmounting.current) return;
        
        setSaveStatus('saving');
        
        // Perform save
        Object.keys(localPriceList).forEach(category => {
          localPriceList[category].forEach((item, index) => {
            if (originalPrices[category] && originalPrices[category][index]) {
              if (item.price !== originalPrices[category][index].price) {
                updateGeneralPriceList(category, index, item.price);
              }
            }
          });
        });
        
        setOriginalPrices(JSON.parse(currentDataString));
        lastSavedData.current = currentDataString;
        
        setTimeout(() => {
          if (!isUnmounting.current) setSaveStatus('saved');
        }, 800);
      }, 1000); 

      return () => clearTimeout(timer);
    }
  }, [localPriceList, originalPrices, updateGeneralPriceList]);

  const handlePriceChange = (category, itemIndex, newPrice) => {
    const processedPrice = newPrice || 0;

    setLocalPriceList(prev => ({
      ...prev,
      [category]: prev[category].map((item, index) =>
        index === itemIndex ? { ...item, price: processedPrice } : item
      )
    }));
  };

  const handleCapacityChange = (category, itemIndex, newCapacity) => {
    const processedCapacity = newCapacity || 0;

    setLocalPriceList(prev => ({
      ...prev,
      [category]: prev[category].map((item, index) =>
        index === itemIndex
          ? { ...item, capacity: { ...item.capacity, value: processedCapacity } }
          : item
      )
    }));
  };

  const handlePercentageIncrease = () => {
    const percentage = parseFloat(percentageIncrease);
    if (isNaN(percentage) || percentage <= 0) return;

    const multiplier = 1 + (percentage / 100);
    
    setLocalPriceList(prev => {
      const updatedPrices = { ...prev };
      Object.keys(updatedPrices).forEach(category => {
        updatedPrices[category] = updatedPrices[category].map(item => ({
          ...item,
          price: item.name === 'VAT' ? item.price : Math.round(item.price * multiplier * 100) / 100
        }));
      });
      return updatedPrices;
    });
    
    setShowPercentageModal(false);
    setPercentageIncrease('');
  };

  const handleCancelPercentageIncrease = () => {
    setShowPercentageModal(false);
    setPercentageIncrease('');
  };

  const handleBack = () => {
    // If pending changes, save immediately
    if (saveStatus === 'modified' && localPriceList) {
        Object.keys(localPriceList).forEach(category => {
          localPriceList[category].forEach((item, index) => {
            if (originalPrices[category] && originalPrices[category][index]) {
              if (item.price !== originalPrices[category][index].price) {
                updateGeneralPriceList(category, index, item.price);
              }
            }
          });
        });
    }
    isUnmounting.current = true;
    onBack();
  };

  const isItemModified = (category, itemIndex) => {
    if (!originalPrices[category] || !originalPrices[category][itemIndex] || !localPriceList) return false;
    return originalPrices[category][itemIndex].price !== localPriceList[category][itemIndex].price;
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className={`${category === 'material' ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'} rounded-2xl p-3 lg:p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {category === 'installations' && item.subtitle ? (
            <h3 className="font-medium text-gray-900 dark:text-white leading-tight text-base lg:text-lg">{t(item.subtitle)}</h3>
          ) : (
            <>
              <h3 className="font-medium text-gray-900 dark:text-white leading-tight text-base lg:text-lg">{t(item.name)}</h3>
              {item.subtitle && (
                <p className="text-sm lg:text-base text-black dark:text-white mt-1">{t(item.subtitle)}</p>
              )}
            </>
          )}
          {isItemModified(category, itemIndex) && (
            <p className="text-xs lg:text-sm text-blue-600 dark:text-blue-400 mt-1">
              {t('Original')}: {originalPrices[category][itemIndex].price} {t(item.unit)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NumberInput
            value={item.price}
            onChange={(newValue) => handlePriceChange(category, itemIndex, newValue)}
            className={isItemModified(category, itemIndex)
              ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }
            min={0}
          />
          <div className="text-sm lg:text-base text-black dark:text-white flex-shrink-0">{t(item.unit)}</div>
        </div>
      </div>

      {item.capacity && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm lg:text-base text-black dark:text-white flex-shrink-0">
              {(item.name === 'Adhesive' || item.name === 'Plaster' || item.name === 'Facade Plaster')
                ? t('capacity per 25kg package')
                : `${t('capacity per')} ${item.unit.includes('pc') ? t('piece') : t('package')}`
              }
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <NumberInput
                value={item.capacity.value}
                onChange={(newValue) => handleCapacityChange(category, itemIndex, newValue)}
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                min={0}
                step={0.1}
              />
              <span className="text-sm lg:text-base text-black dark:text-white">{item.capacity.unit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!localPriceList) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center text-lg">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <>
      <div className="pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('General price list')}</h1>
          </div>
          
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              saveStatus === 'saved'
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
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-start lg:items-center gap-2 text-gray-600 dark:text-gray-400">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 lg:mt-0" />
            <span className="text-sm lg:text-base">{t('Edit prices here. New projects will inherit these prices. Existing project overrides are preserved.')}</span>
          </div>
          <button
            onClick={() => setShowPercentageModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md text-sm lg:text-base self-start lg:self-auto"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('Increase All Prices')}</span>
          </button>
        </div>

        {/* Content */}
        <div>
          {/* Work Section */}
          <div className="mb-8 lg:mb-10 pt-4 lg:pt-6">
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
              {localPriceList.work?.map((item, index) => (
                <PriceCard key={index} item={item} category="work" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Material Section */}
          <div className="mb-8 lg:mb-10">
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Material')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
              {localPriceList.material?.map((item, index) => (
                <PriceCard key={index} item={item} category="material" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Installations Section */}
          <div className="mb-8 lg:mb-10">
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Sanitary installations')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
              {localPriceList.installations?.map((item, index) => (
                <PriceCard key={index} item={item} category="installations" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Others Section */}
          <div className="mb-8 lg:mb-10">
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4 animate-slide-in">
              {localPriceList.others?.map((item, index) => (
                <PriceCard key={index} item={item} category="others" itemIndex={index} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Percentage Increase Modal */}
      {showPercentageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md animate-slide-in">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Increase All Prices')}</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                {t('Percentage Increase')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={percentageIncrease}
                  onChange={(e) => setPercentageIncrease(e.target.value)}
                  placeholder="10"
                  min="0"
                  step="0.1"
                  className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 transition-colors text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePercentageIncrease();
                    }
                    if (e.key === 'Escape') {
                      handleCancelPercentageIncrease();
                    }
                  }}
                />
                <span className="text-gray-600 dark:text-gray-400 text-lg">%</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('Example: Enter 10 for 10% increase. All prices will be updated.')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelPercentageIncrease}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handlePercentageIncrease}
                disabled={!percentageIncrease || parseFloat(percentageIncrease) <= 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
              >
                {t('Apply')}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default PriceList;