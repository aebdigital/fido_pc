import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const NumberInput = ({ 
  value, 
  onChange, 
  className = "", 
  min = 0,
  disabled = false,
  size = "normal", // "small" or "normal"
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState(value?.toString() || '0');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value?.toString() || '0');
    }
  }, [value, isFocused]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // Allow empty string while typing
    if (newValue === '') {
      onChange(0);
      return;
    }
    
    const numericValue = parseFloat(newValue);
    if (!isNaN(numericValue) && numericValue >= min) {
      onChange(numericValue);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Format the display value on blur
    const numericValue = parseFloat(displayValue);
    if (!isNaN(numericValue)) {
      setDisplayValue(numericValue.toString());
    } else {
      setDisplayValue('0');
      onChange(0);
    }
  };

  const incrementValue = (step) => {
    const currentValue = parseFloat(displayValue) || 0;
    const newValue = Math.max(min, currentValue + step);
    const roundedValue = Math.round(newValue * 100) / 100; // Round to 2 decimal places
    setDisplayValue(roundedValue.toString());
    onChange(roundedValue);
  };

  const decrementValue = (step) => {
    const currentValue = parseFloat(displayValue) || 0;
    const newValue = Math.max(min, currentValue - step);
    const roundedValue = Math.round(newValue * 100) / 100; // Round to 2 decimal places
    setDisplayValue(roundedValue.toString());
    onChange(roundedValue);
  };

  const isSmall = size === "small";
  const inputWidth = isSmall ? "w-20" : "w-28"; // Made wider to show all numbers
  const paddingRight = isSmall ? "pr-10" : "pr-14"; // More padding for two arrow sets
  const fontSize = isSmall ? "text-xs" : "text-sm";
  const borderRadius = isSmall ? "rounded" : "rounded-xl";

  return (
    <>
      <style jsx>{`
        /* Hide default number input arrows */
        .hide-number-arrows::-webkit-outer-spin-button,
        .hide-number-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-number-arrows[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className={`relative inline-flex overflow-hidden ${borderRadius} ${className}`}>
        <input
          ref={inputRef}
          type="number"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={`hide-number-arrows ${inputWidth} px-2 py-1 ${paddingRight} ${borderRadius} text-center font-semibold border-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fontSize}`}
          min={min}
          step="0.01"
          {...props}
        />
        
        {/* Arrow controls - side by side */}
        <div className={`absolute ${isSmall ? 'right-0.5' : 'right-1'} top-0 bottom-0 flex`}>
          {/* Big increment arrows (±1) */}
          <div className="flex flex-col h-full">
            <button
              type="button"
              onClick={() => incrementValue(1)}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="+1"
            >
              <ChevronUp className={`${isSmall ? 'w-2 h-2' : 'w-3 h-3'} text-gray-600 dark:text-gray-400`} />
            </button>
            <button
              type="button"
              onClick={() => decrementValue(1)}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="-1"
            >
              <ChevronDown className={`${isSmall ? 'w-2 h-2' : 'w-3 h-3'} text-gray-600 dark:text-gray-400`} />
            </button>
          </div>
          
          {/* Small increment arrows (±0.1) */}
          <div className="flex flex-col h-full">
            <button
              type="button"
              onClick={() => incrementValue(0.1)}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-100 dark:hover:bg-gray-700 ${isSmall ? 'rounded-tr rounded-br' : 'rounded-tr-xl rounded-br-xl'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="+0.1"
            >
              <ChevronUp className={`${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} text-gray-500 dark:text-gray-500`} />
            </button>
            <button
              type="button"
              onClick={() => decrementValue(0.1)}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-100 dark:hover:bg-gray-700 ${isSmall ? 'rounded-br' : 'rounded-br-xl'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="-0.1"
            >
              <ChevronDown className={`${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} text-gray-500 dark:text-gray-500`} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NumberInput;