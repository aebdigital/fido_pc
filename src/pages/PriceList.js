import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Hammer, Package, Info, Menu, Save, TrendingUp, Wrench } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigationBlocker } from '../context/NavigationBlockerContext';
import NumberInput from '../components/NumberInput';

const PriceList = ({ onBack, onHasChangesChange, onSaveRef }) => {
  const { t } = useLanguage();
  const { generalPriceList, updateGeneralPriceList } = useAppData();
  const { blockNavigation, unblockNavigation } = useNavigationBlocker();
  const [localPriceList, setLocalPriceList] = useState(null);
  const [originalPrices, setOriginalPrices] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [percentageIncrease, setPercentageIncrease] = useState('');
  const [showPercentageModal, setShowPercentageModal] = useState(false);

  // Initialize local state with data from context
  useEffect(() => {
    if (generalPriceList) {
      // Deep clone the price list for local editing
      const clonedPriceList = {};
      Object.keys(generalPriceList).forEach(category => {
        clonedPriceList[category] = generalPriceList[category].map(item => ({ ...item }));
      });
      setLocalPriceList(clonedPriceList);
      setOriginalPrices(clonedPriceList);
      setHasChanges(false);
      if (onHasChangesChange) {
        onHasChangesChange(false);
      }
    }
  }, [generalPriceList, onHasChangesChange]);

  // Define handleSave with useCallback to avoid dependency issues
  const handleSave = useCallback(() => {
    if (!localPriceList) return;
    
    // Update the context with all the local changes
    Object.keys(localPriceList).forEach(category => {
      localPriceList[category].forEach((item, index) => {
        if (originalPrices[category] && originalPrices[category][index]) {
          if (item.price !== originalPrices[category][index].price) {
            updateGeneralPriceList(category, index, item.price);
          }
        }
      });
    });
    
    // Update original prices to current prices
    setOriginalPrices({ ...localPriceList });
    setHasChanges(false);
    if (onHasChangesChange) {
      onHasChangesChange(false);
    }
    
    // Unblock navigation after saving
    unblockNavigation('priceList');
  }, [localPriceList, originalPrices, updateGeneralPriceList, onHasChangesChange, unblockNavigation]);

  // Expose save function to parent
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = {
        save: handleSave,
        discardChanges: () => {
          setLocalPriceList({ ...originalPrices });
          setHasChanges(false);
          if (onHasChangesChange) {
            onHasChangesChange(false);
          }
        }
      };
    }
  }, [handleSave, originalPrices, onHasChangesChange, onSaveRef]);

  // Cleanup navigation blocking on unmount
  useEffect(() => {
    return () => {
      unblockNavigation('priceList');
    };
  }, [unblockNavigation]);

  // Check if there are any changes between local and original
  const checkForChanges = (newLocalPrices) => {
    if (!originalPrices || !newLocalPrices) return false;
    
    for (const category in newLocalPrices) {
      if (!originalPrices[category]) continue;
      
      for (let i = 0; i < newLocalPrices[category].length; i++) {
        if (!originalPrices[category][i]) continue;
        
        if (newLocalPrices[category][i].price !== originalPrices[category][i].price) {
          return true;
        }
      }
    }
    return false;
  };

  const handlePriceChange = (category, itemIndex, newPrice) => {
    // NumberInput component already handles validation and returns a numeric value
    const processedPrice = newPrice || 0;
    
    const updatedPrices = {
      ...localPriceList,
      [category]: localPriceList[category].map((item, index) =>
        index === itemIndex ? { ...item, price: processedPrice } : item
      )
    };
    
    setLocalPriceList(updatedPrices);
    const newHasChanges = checkForChanges(updatedPrices);
    setHasChanges(newHasChanges);
    if (onHasChangesChange) {
      onHasChangesChange(newHasChanges);
    }
    
    // Block/unblock navigation based on changes
    if (newHasChanges) {
      blockNavigation('priceList', {
        onSave: handleSave,
        onDiscard: () => {
          setLocalPriceList({ ...originalPrices });
          setHasChanges(false);
          if (onHasChangesChange) {
            onHasChangesChange(false);
          }
        }
      });
    } else {
      unblockNavigation('priceList');
    }
  };

  const handlePercentageIncrease = () => {
    const percentage = parseFloat(percentageIncrease);
    if (isNaN(percentage) || percentage <= 0) return;

    const multiplier = 1 + (percentage / 100);
    
    const updatedPrices = { ...localPriceList };
    
    // Apply percentage increase to all categories, but skip VAT
    Object.keys(updatedPrices).forEach(category => {
      updatedPrices[category] = updatedPrices[category].map(item => ({
        ...item,
        // Skip VAT items when applying percentage increase
        price: item.name === 'VAT' ? item.price : Math.round(item.price * multiplier * 100) / 100 // Round to 2 decimal places
      }));
    });
    
    setLocalPriceList(updatedPrices);
    const newHasChanges = checkForChanges(updatedPrices);
    setHasChanges(newHasChanges);
    if (onHasChangesChange) {
      onHasChangesChange(newHasChanges);
    }
    
    // Block/unblock navigation based on changes
    if (newHasChanges) {
      blockNavigation('priceList', {
        onSave: handleSave,
        onDiscard: () => {
          setLocalPriceList({ ...originalPrices });
          setHasChanges(false);
          if (onHasChangesChange) {
            onHasChangesChange(false);
          }
        }
      });
    } else {
      unblockNavigation('priceList');
    }
    
    // Close modal and reset input
    setShowPercentageModal(false);
    setPercentageIncrease('');
  };

  const handleCancelPercentageIncrease = () => {
    setShowPercentageModal(false);
    setPercentageIncrease('');
  };

  const handleBack = () => {
    onBack();
  };


  const isItemModified = (category, itemIndex) => {
    if (!originalPrices[category] || !originalPrices[category][itemIndex] || !localPriceList) return false;
    return originalPrices[category][itemIndex].price !== localPriceList[category][itemIndex].price;
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className={`${category === 'material' ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'} rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* For installations category, show only subtitle as the main heading */}
          {category === 'installations' && item.subtitle ? (
            <h3 className="font-medium text-gray-900 dark:text-white leading-tight text-sm lg:text-lg truncate">{t(item.subtitle)}</h3>
          ) : (
            <>
              <h3 className="font-medium text-gray-900 dark:text-white leading-tight text-sm lg:text-lg truncate">{t(item.name)}</h3>
              {item.subtitle && (
                <p className="text-xs lg:text-base text-black dark:text-white mt-0.5 lg:mt-1 truncate">{t(item.subtitle)}</p>
              )}
            </>
          )}
          {isItemModified(category, itemIndex) && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
              {t('Original')}: {originalPrices[category][itemIndex].price} {t(item.unit)}
            </p>
          )}
          {/* Capacity info - now below the title on left side */}
          {item.capacity && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 truncate">
              {(item.name === 'Adhesive' || item.name === 'Plaster' || item.name === 'Facade Plaster')
                ? t('capacity per 25kg package')
                : `${t('capacity per')} ${item.unit.includes('pc') ? t('piece') : t('package')}`
              }: {item.capacity.value} {item.capacity.unit}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <NumberInput
            value={item.price}
            onChange={(newValue) => handlePriceChange(category, itemIndex, newValue)}
            className={isItemModified(category, itemIndex)
              ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100'
              : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white'
            }
            min={0}
            size="small"
          />
          <div className="text-xs text-black dark:text-white flex-shrink-0 whitespace-nowrap">{t(item.unit)}</div>
        </div>
      </div>
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
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <button 
            onClick={handleBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-4xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t('General price list')}</h1>
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

        {/* Floating Save Button */}
        {hasChanges && (
          <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50">
            <button
              onClick={handleSave}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-xl transition-all"
              title={t('Save changes')}
            >
              <Save className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        )}
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