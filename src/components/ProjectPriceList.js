import React, { useState, useEffect } from 'react';
import { Hammer, Package, Menu, Info, RefreshCw, Wrench, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from './NumberInput';

const ProjectPriceList = ({ projectId, initialData, onClose, onSave }) => {
  const { generalPriceList } = useAppData();
  const { t } = useLanguage();
  const [projectPriceData, setProjectPriceData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    work: true,
    material: true,
    installations: true,
    others: true
  });

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
        projectPrices[category] = projectPrices[category].map(item => {
          // Normalize names for old projects to new localized constants
          let normalizedName = item.name;
          if (item.name === 'Skirting') normalizedName = 'Lištovanie'; // Update Skirting -> Lištovanie
          if (item.name === 'Skirting board') normalizedName = 'Soklové lišty'; // Update Skirting board -> Soklové lišty
          
          return {
            ...item,
            name: normalizedName, // Use normalized name
            originalPrice: item.price,
            isOverridden: false
          };
        });
      });
      
      setProjectPriceData(projectPrices);
    };

    initializeProjectPrices();
  }, [projectId, generalPriceList, initialData]);

  const handlePriceChange = (category, itemIndex, newPrice) => {
    // NumberInput component handles validation and returns numeric value
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
    
    setHasChanges(true);
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
    onSave(projectPriceData);
    setHasChanges(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className={`${category === 'material' ? 'bg-gray-400 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'} rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
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
          {item.isOverridden && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
              {t('Original')}: {item.originalPrice} {t(item.unit)}
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
            className={item.isOverridden
              ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100'
              : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white'
            }
            min={0}
            size="small"
          />
          <div className="text-xs text-black dark:text-white flex-shrink-0 whitespace-nowrap">{t(item.unit)}</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[85vh] lg:h-[90vh] max-h-[calc(100vh-2rem)] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t('Project Price List')}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                hasChanges
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Save')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Info className="w-4 h-4" />
          <span className="text-sm">{t('Override prices for this project only. Original prices are preserved in general settings.')}</span>
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
                {projectPriceData.others.map((item, index) => (
                  <PriceCard key={index} item={item} category="others" itemIndex={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPriceList;