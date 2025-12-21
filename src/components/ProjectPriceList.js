import React, { useState, useEffect } from 'react';
import { ArrowLeft, Hammer, Package, Menu, Info, RefreshCw, Wrench } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';

const ProjectPriceList = ({ projectId, initialData, onClose, onSave }) => {
  const { generalPriceList } = useAppData();
  const { t } = useLanguage();
  const [projectPriceData, setProjectPriceData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize project price data from general settings or load existing project overrides
  useEffect(() => {
    if (!generalPriceList) return;
    
    // If we have saved project data, use it
    if (initialData) {
      setProjectPriceData(initialData);
      return;
    }
    
    // Otherwise initialize with general prices
    const initializeProjectPrices = () => {
      const projectPrices = JSON.parse(JSON.stringify(generalPriceList)); // Deep clone
      
      // Add isOverridden flag and originalPrice for each item
      Object.keys(projectPrices).forEach(category => {
        projectPrices[category] = projectPrices[category].map(item => ({
          ...item,
          originalPrice: item.price,
          isOverridden: false
        }));
      });
      
      setProjectPriceData(projectPrices);
    };

    initializeProjectPrices();
  }, [projectId, generalPriceList, initialData]);

  const handlePriceChange = (category, itemIndex, newPrice) => {
    // Allow empty string and partial numbers while typing
    if (newPrice === '') {
      setProjectPriceData(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const item = updated[category][itemIndex];
        const isOverride = 0 !== item.originalPrice;
        
        updated[category][itemIndex] = {
          ...item,
          price: 0,
          isOverridden: isOverride
        };
        
        return updated;
      });
      setHasChanges(true);
      return;
    }
    
    const numericPrice = parseFloat(newPrice);
    if (!isNaN(numericPrice)) {
      setProjectPriceData(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const item = updated[category][itemIndex];
        const isOverride = numericPrice !== item.originalPrice;
        
        updated[category][itemIndex] = {
          ...item,
          price: numericPrice,
          isOverridden: isOverride
        };
        
        return updated;
      });
      
      setHasChanges(true);
    }
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
    
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would save project-specific overrides to backend
    onSave(projectPriceData);
    setHasChanges(false);
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className="bg-gray-300 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white leading-tight">{t(item.name)}</h3>
          {item.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t(item.subtitle)}</p>
          )}
          {item.isOverridden && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t('Original')}: {item.originalPrice} {t(item.unit)}
            </p>
          )}
        </div>
        <div className="text-right ml-4 flex items-center gap-2">
          <input
            type="number"
            value={item.price}
            onChange={(e) => handlePriceChange(category, itemIndex, e.target.value)}
            className={`w-20 px-2 py-1 rounded-xl text-center font-semibold border-2 ${
              item.isOverridden 
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100' 
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            step="0.01"
            min="0"
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">{t(item.unit)}</div>
          {item.isOverridden && (
            <button
              onClick={() => handleResetToOriginal(category, itemIndex)}
              className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              title={t('Reset to original price')}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {item.capacity && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {/* Special handling for Adhesive, Plaster, and Facade Plaster */}
              {(item.name === 'Adhesive' || item.name === 'Plaster' || item.name === 'Facade Plaster')
                ? t('capacity per 25kg package')
                : `${t('capacity per')} ${item.unit.includes('pc') ? t('piece') : t('package')}`
              }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('Back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Project Price List')}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Save Changes')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">{t('Override prices for this project only. Original prices are preserved in general settings.')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Work Section */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projectPriceData.work.map((item, index) => (
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
              {projectPriceData.material.map((item, index) => (
                <PriceCard key={index} item={item} category="material" itemIndex={index} />
              ))}
            </div>
          </div>

          {/* Installations Section */}
          {projectPriceData.installations && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <Wrench className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Sanitary installations')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projectPriceData.installations.map((item, index) => (
                  <PriceCard key={index} item={item} category="installations" itemIndex={index} />
                ))}
              </div>
            </div>
          )}

          {/* Others Section */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projectPriceData.others.map((item, index) => (
                <PriceCard key={index} item={item} category="others" itemIndex={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPriceList;