import React, { useState, useEffect } from 'react';
import { ArrowLeft, Hammer, Package, Info, Menu, Save, RefreshCw } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const PriceList = ({ onBack }) => {
  const { generalPriceList, updateGeneralPriceList, resetGeneralPriceItem } = useAppData();
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPrices, setOriginalPrices] = useState({});

  // Store original prices on mount
  useEffect(() => {
    if (generalPriceList) {
      const original = {};
      Object.keys(generalPriceList).forEach(category => {
        original[category] = generalPriceList[category].map(item => ({ ...item }));
      });
      setOriginalPrices(original);
    }
  }, []);

  const handlePriceChange = (category, itemIndex, newPrice) => {
    // Allow empty string and partial numbers while typing
    if (newPrice === '') {
      updateGeneralPriceList(category, itemIndex, 0);
      setHasChanges(true);
      return;
    }
    
    const numericPrice = parseFloat(newPrice);
    if (!isNaN(numericPrice)) {
      updateGeneralPriceList(category, itemIndex, numericPrice);
      setHasChanges(true);
    }
  };

  const handleResetToOriginal = (category, itemIndex) => {
    if (originalPrices[category] && originalPrices[category][itemIndex]) {
      const originalPrice = originalPrices[category][itemIndex].price;
      updateGeneralPriceList(category, itemIndex, originalPrice);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    // Update original prices to current prices
    const updated = {};
    Object.keys(generalPriceList).forEach(category => {
      updated[category] = generalPriceList[category].map(item => ({ ...item }));
    });
    setOriginalPrices(updated);
    setHasChanges(false);
  };

  const isItemModified = (category, itemIndex) => {
    if (!originalPrices[category] || !originalPrices[category][itemIndex]) return false;
    return originalPrices[category][itemIndex].price !== generalPriceList[category][itemIndex].price;
  };

  const PriceCard = ({ item, category, itemIndex }) => (
    <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white leading-tight">{item.name}</h3>
          {item.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.subtitle}</p>
          )}
          {isItemModified(category, itemIndex) && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Original: {originalPrices[category][itemIndex].price} {item.unit}
            </p>
          )}
        </div>
        <div className="text-right ml-4 flex items-center gap-2">
          <input
            type="number"
            value={item.price}
            onChange={(e) => handlePriceChange(category, itemIndex, e.target.value)}
            className={`w-20 px-2 py-1 rounded-xl text-center font-semibold border-2 ${
              isItemModified(category, itemIndex)
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100' 
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            step="0.01"
            min="0"
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</div>
          {isItemModified(category, itemIndex) && (
            <button
              onClick={() => handleResetToOriginal(category, itemIndex)}
              className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
              title="Reset to original price"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {item.capacity && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">capacity per {item.unit.includes('pc') ? 'piece' : 'package'}</span>
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

  if (!generalPriceList) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">General Price List</h1>
        <div className="w-20"></div>
      </div>

      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <Info className="w-4 h-4" />
        <span className="text-sm">Edit prices here. New projects will inherit these prices. Existing project overrides are preserved.</span>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Work Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Work</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generalPriceList.work?.map((item, index) => (
              <PriceCard key={index} item={item} category="work" itemIndex={index} />
            ))}
          </div>
        </div>

        {/* Material Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Material</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generalPriceList.material?.map((item, index) => (
              <PriceCard key={index} item={item} category="material" itemIndex={index} />
            ))}
          </div>
        </div>

        {/* Others Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Others</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generalPriceList.others?.map((item, index) => (
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
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 animate-in slide-in-from-bottom-5"
          >
            <Save className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PriceList;