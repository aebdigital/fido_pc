import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Pencil } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from './NumberInput';

/**
 * InvoiceItemBubble - Expandable invoice item editor matching iOS InvoiceBuilderItemBubble
 *
 * Features:
 * - Collapsed view: title, count, total price
 * - Expanded view: editable fields (count, price/piece, VAT%, total)
 * - Include/Exclude toggle
 * - Tax obligation transfer toggle (reverse charge for EU B2B)
 * - Auto-calculation of prices
 * - Category-based background colors (material vs work)
 */
const InvoiceItemBubble = ({
  item,
  onUpdate,
  category = 'work',
  suggestions = []
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(item.isNew || false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Local state for editing
  const [title, setTitle] = useState(item.title || '');
  const [pieces, setPieces] = useState(item.pieces || 0);
  const [pricePerPiece, setPricePerPiece] = useState(item.pricePerPiece || 0);
  const [vat, setVat] = useState(item.vat || 23);
  const [price, setPrice] = useState(item.price || 0);
  const [active, setActive] = useState(item.active !== false);
  const [taxObligationTransfer, setTaxObligationTransfer] = useState(item.taxObligationTransfer || false);
  const [unit, setUnit] = useState(item.unit || 'm2');
  const [vatInputString, setVatInputString] = useState(item.vat !== undefined ? String(item.vat) : '23');

  // Filter suggestions based on title input
  const filteredSuggestions = useMemo(() => {
    // Show suggestions only after user types at least one non-space character
    if (!suggestions || suggestions.length === 0 || !title || title.trim().length === 0) return [];

    const lower = title.toLowerCase();
    // Filter by name match, limit results to 6 to fit screen
    return suggestions
      .filter(s => s.title && s.title.toLowerCase().includes(lower) && s.title !== title)
      .slice(0, 6);
  }, [title, suggestions]);

  const handleSuggestionClick = (suggestion) => {
    setTitle(suggestion.title);
    setPricePerPiece(suggestion.price || 0);
    setUnit(suggestion.unit || 'ks');

    // Update VAT if present in suggestion
    const newVat = suggestion.vat !== undefined ? suggestion.vat : vat;
    if (suggestion.vat !== undefined) {
      setVat(suggestion.vat);
      setVatInputString(String(suggestion.vat));
    }

    const newPrice = pieces * (suggestion.price || 0);
    setPrice(newPrice);
    setShowSuggestions(false);

    if (onUpdate) {
      onUpdate(item.id, {
        ...item,
        title: suggestion.title,
        pricePerPiece: suggestion.price || 0,
        unit: suggestion.unit || 'ks',
        price: newPrice,
        vat: newVat
      });
    }
  };


  // Sync with parent item changes
  useEffect(() => {
    setTitle(item.title || '');
    setPieces(item.pieces || 0);
    setPricePerPiece(item.pricePerPiece || 0);
    setVat(item.vat !== undefined ? item.vat : 23);
    setPrice(item.price || 0);
    setActive(item.active !== false);
    setTaxObligationTransfer(item.taxObligationTransfer || false);
    setUnit(item.unit || 'm2');
    setVatInputString(item.vat !== undefined ? String(item.vat) : '23'); // Sync vatInputString
  }, [item]);

  // Calculate price when pieces or pricePerPiece changes
  useEffect(() => {
    const calculatedPrice = pieces * pricePerPiece;
    if (Math.abs(calculatedPrice - price) > 0.01) {
      setPrice(calculatedPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, pricePerPiece]);

  // Notify parent of changes
  const notifyUpdate = (updates) => {
    if (onUpdate) {
      onUpdate(item.id, {
        ...item,
        title,
        pieces,
        pricePerPiece,
        vat,
        price,
        active,
        taxObligationTransfer,
        unit,
        ...updates
      });
    }
  };

  // Handle field changes
  const handlePiecesChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setPieces(numValue);
    const newPrice = numValue * pricePerPiece;
    setPrice(newPrice);
    notifyUpdate({ pieces: numValue, price: newPrice });
  };

  const handlePricePerPieceChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setPricePerPiece(numValue);
    const newPrice = pieces * numValue;
    setPrice(newPrice);
    notifyUpdate({ pricePerPiece: numValue, price: newPrice });
  };

  const handlePriceChange = (value) => {
    const numValue = parseFloat(value) || 0;
    setPrice(numValue);
    // Recalculate pricePerPiece
    const newPricePerPiece = pieces > 0 ? numValue / pieces : 0;
    setPricePerPiece(newPricePerPiece);
    notifyUpdate({ price: numValue, pricePerPiece: newPricePerPiece });
  };

  const handleVatInputStringChange = (value) => {
    setVatInputString(value);
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setVat(numValue);
    notifyUpdate({ vat: numValue });
  };

  const handleActiveToggle = () => {
    const newActive = !active;
    setActive(newActive);
    notifyUpdate({ active: newActive });
  };

  const handleTaxTransferToggle = () => {
    const newValue = !taxObligationTransfer;
    setTaxObligationTransfer(newValue);
    notifyUpdate({ taxObligationTransfer: newValue });
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    notifyUpdate({ title: newTitle });
  };

  // Calculate VAT amount and total
  const calculateVatAmount = () => {
    if (taxObligationTransfer) return 0;
    return price * (vat / 100);
  };

  const calculateTotalPrice = () => {
    if (taxObligationTransfer) return price;
    return price * (1 + vat / 100);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return (amount || 0).toFixed(2).replace('.', ',') + ' €';
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${!active ? 'opacity-60' : ''}`}
      style={{ backgroundColor: category === 'material' ? '#e5e7eb' : '#f3f4f6' }}
    >
      {/* Header - Always visible */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          {/* Title and count */}
          <div className="flex-1 min-w-0">
            {isExpanded ? (
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    handleTitleChange(e);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full text-lg font-medium text-gray-900 dark:text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-2 focus:border-gray-900 outline-none"
                  placeholder={t('Item name')}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mt-1 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent blur from closing before click
                          handleSuggestionClick(s);
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{s.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                          <span>{formatCurrency(s.price)} / {t(s.unit)} {s.vat !== undefined ? `(${s.vat}%)` : ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <h4 className={`text-lg font-medium truncate ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                {t(title) || title}
              </h4>
            )}
            {!isExpanded && (
              <p className={`text-xs ${active ? 'text-gray-600' : 'text-gray-400'}`}>
                {t('count')}: {pieces} {t(unit)}
              </p>
            )}
          </div>

          {/* Price or Done button */}
          <div className="flex items-center gap-2 ml-3">
            {isExpanded ? (
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('Done')}
              </button>
            ) : (
              <div className="text-right">
                <p className={`text-[10px] ${active ? 'text-gray-600' : 'text-gray-400'}`}>
                  {t('VAT not included')}
                </p>
                <p className={`text-lg font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                  {formatCurrency(price)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - Collapsed state */}
        {!isExpanded && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleActiveToggle}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {active ? t('Exclude') : t('Include')}
            </button>
            <button
              onClick={() => {
                if (!active) {
                  setActive(true);
                  notifyUpdate({ active: true });
                }
                setIsExpanded(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t('Edit')}
            </button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Input fields grid */}
          <div className="bg-white rounded-xl p-4 mb-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Count */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('Count')}
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={pieces}
                    onChange={handlePiecesChange}
                    className="flex-1"
                    min={0}
                    step={0.01}
                  />
                  <select
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      notifyUpdate({ unit: e.target.value });
                    }}
                    className="text-sm text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer p-0 pr-1"
                  >
                    {['m2', 'm', 'bm', 'ks', 'h', 'km', 'kpl', 'deň'].map(u => (
                      <option key={u} value={u}>{t(u)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price per piece */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('Price per piece')}
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={pricePerPiece}
                    onChange={handlePricePerPieceChange}
                    className="flex-1"
                    min={0}
                    step={0.01}
                    forceDecimal={2}
                  />
                  <span className="text-sm text-gray-600">€</span>
                </div>
              </div>

              {/* VAT */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('VAT')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={vatInputString}
                    onChange={(e) => handleVatInputStringChange(e.target.value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 text-base"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>

              {/* Total without VAT */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('Without VAT')}
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={price}
                    onChange={handlePriceChange}
                    className="flex-1"
                    min={0}
                    step={0.01}
                  />
                  <span className="text-sm text-gray-600">€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax obligation transfer toggle */}
          <div className="bg-white rounded-xl px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {t('Tax obligation transfer')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxObligationTransfer}
                  onChange={handleTaxTransferToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>

          {/* Price summary */}
          <div className="space-y-2 text-right">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('VAT')}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(calculateVatAmount())}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">{t('Total price')}</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(calculateTotalPrice())}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemBubble;
