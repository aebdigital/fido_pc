import React, { useState, useEffect, useRef } from 'react';
import { searchRpoEntitiesByName } from '../services/rpoApi';
import { Search, Loader2 } from 'lucide-react';

const RpoAutocomplete = ({ onSelect, t }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchRpoEntitiesByName(query);
        if (!cancelled) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error("Error searching RPO:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (entity) => {
    onSelect(entity);
    setQuery('');
    setSuggestions([]);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${t('Enter')} ${t('Business ID Abbr')}...`}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          autoFocus
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((entity) => (
            <li
              key={entity.id}
              onClick={() => handleSelect(entity)}
              className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="font-medium text-gray-900 dark:text-white">{entity.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                {entity.ico && <span>{t('BID')}: {entity.ico}</span>}
                {entity.dic && <span>• {t('TID')}: {entity.dic}</span>}
                {entity.address?.municipality && (
                  <span>• {entity.address.municipality}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RpoAutocomplete;
