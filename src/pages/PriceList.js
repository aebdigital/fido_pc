import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Hammer, Package, Info, Menu, Save } from 'lucide-react';
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



  const handleBack = () => {
    onBack();
  };


  const isItemModified = (category, itemIndex) => {
    if (!originalPrices[category] || !originalPrices[category][itemIndex] || !localPriceList) return false;
    return originalPrices[category][itemIndex].price !== localPriceList[category][itemIndex].price;
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white leading-tight">{t(item.name)}</h3>
          {item.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t(item.subtitle)}</p>
          )}
          {isItemModified(category, itemIndex) && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t('Original')}: {originalPrices[category][itemIndex].price} {item.unit}
            </p>
          )}
        </div>
        <div className="text-right ml-4 flex items-center gap-2">
          <NumberInput
            value={item.price}
            onChange={(newValue) => handlePriceChange(category, itemIndex, newValue)}
            className={isItemModified(category, itemIndex)
              ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100' 
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }
            min={0}
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</div>
        </div>
      </div>
      
      {item.capacity && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('capacity per')} {item.unit.includes('pc') ? t('piece') : t('package')}
            </span>
            <div className="flex items-center gap-2">
              <div className="bg-white dark:bg-gray-900 rounded-xl px-3 py-1 font-semibold text-gray-900 dark:text-white">
                {item.capacity.value}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.capacity.unit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!localPriceList) {
    return (
      <div className="p-6">
        <div className="text-center">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('Back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('General price list')}</h1>
          <div className="w-20"></div>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">{t('Edit prices here. New projects will inherit these prices. Existing project overrides are preserved.')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Work Section */}
          <div className="mb-10 pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {localPriceList.work?.map((item, index) => (
                <PriceCard key={index} item={item} category="work" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Material Section */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Material')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {localPriceList.material?.map((item, index) => (
                <PriceCard key={index} item={item} category="material" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Others Section */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {localPriceList.others?.map((item, index) => (
                <PriceCard key={index} item={item} category="others" itemIndex={index} />
              ))}
            </div>
          </div>
        </div>

        {/* Floating Save Button */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleSave}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200"
              title={t('Save changes')}
            >
              <Save className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

    </>
  );
};

export default PriceList;