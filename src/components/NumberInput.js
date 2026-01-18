import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';


const evaluateExpression = (str) => {
  try {
    // Replace comma with dot for calculation
    let expr = str.replace(/,/g, '.').replace(/\s/g, '');

    // Check if the first or last character is an operator (invalid for standalone evaluation)
    if (['+', '-', '*', '/'].includes(expr.slice(-1))) return null;
    if (['+', '*', '/'].includes(expr.slice(0, 1))) return null;

    // Allow only numbers, operators (+, -, *, /), dots, and parentheses
    // This is a safety check before using Function constructor
    if (!/^[0-9.+\-*/()]+$/.test(expr)) return null;

    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (e) {
    return null;
  }
};



const NumberInput = ({
  value,
  onChange,
  className = "",
  min = 0,
  disabled = false,
  size = "normal", // "small" or "normal"
  placeholder = "0",
  forceDecimal = null, // New prop: number of decimal places to enforce (e.g., 2)
  ...props
}) => {
  // Helper to format value according to props
  const formatValue = useCallback((val) => {
    if (val === '' || val === null || val === undefined || val === 0) return '';
    if (forceDecimal !== null && typeof val === 'number') {
      return val.toFixed(forceDecimal).replace('.', ',');
    }
    return val.toString().replace('.', ',');
  }, [forceDecimal]);

  const [internalValue, setInternalValue] = useState(
    value !== undefined && value !== null && value !== '' ? formatValue(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced onChange for arrow button clicks to prevent scroll jumping
  const debouncedOnChange = useCallback((val) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(val);
    }, 300); // 300ms delay
  }, [onChange]);

  // Update internal value when prop changes (from external source)
  useEffect(() => {
    // Only update if not currently focused to avoid jumping while typing
    if (!isFocused) {
      setInternalValue(
        value !== undefined && value !== null && value !== '' ? formatValue(value) : ''
      );
    }
  }, [value, isFocused, forceDecimal, formatValue]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    // Allow digits, comma, dot, and operators
    if (/^[0-9.,+\-*/() ]*$/.test(newValue)) {
      setInternalValue(newValue);
    }
  };

  const processAndSubmit = () => {
    if (internalValue === '' || internalValue === null || internalValue === undefined) {
      onChange(0);
      setInternalValue('');
      return;
    }

    // Try to evaluate as expression first
    const evaluatedValue = evaluateExpression(internalValue);

    if (evaluatedValue !== null) {
      const roundedValue = Math.round(evaluatedValue * 100) / 100;
      const finalValue = Math.max(min, roundedValue);
      setInternalValue(formatValue(finalValue));
      onChange(finalValue);
    } else {
      // Fallback to simple parse if expression evaluation failed
      const numericValue = parseFloat(internalValue.replace(',', '.'));
      if (!isNaN(numericValue)) {
        let finalValue = Math.max(min, Math.round(numericValue * 100) / 100);
        setInternalValue(formatValue(finalValue));
        onChange(finalValue);
      } else {
        setInternalValue(value !== 0 ? formatValue(value) : '');
        onChange(value || 0);
      }
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Unregister from global keyboard toolbar
    // unregisterActiveInput(inputRef);
    processAndSubmit();
  };

  const handleInputFocus = () => {
    setIsFocused(true);

    // Always move cursor to the end of text so user can see what they're typing
    if (inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    }
  };

  const incrementValue = (step) => {
    const currentValue = parseFloat(internalValue.replace(',', '.')) || 0;
    const newValue = Math.max(min, currentValue + step);
    const roundedValue = Math.round(newValue * 100) / 100;
    setInternalValue(formatValue(roundedValue));
    debouncedOnChange(roundedValue);
  };

  const decrementValue = (step) => {
    const currentValue = parseFloat(internalValue.replace(',', '.')) || 0;
    const newValue = Math.max(min, currentValue - step);
    const roundedValue = Math.round(newValue * 100) / 100;
    setInternalValue(formatValue(roundedValue));
    debouncedOnChange(roundedValue);
  };

  const isSmall = size === "small";
  const inputWidth = isSmall ? "w-full sm:w-24" : "w-full sm:w-32";
  const paddingRight = isSmall ? "pr-9" : "pr-12";
  const fontSize = "text-base"; // Use text-base (16px) to prevent iOS auto-zoom
  const borderRadius = isSmall ? "rounded" : "rounded-xl";

  return (
    <div className="relative inline-block w-full sm:w-auto">
      {/* Math Toolbar is now handled by the global MathKeyboardToolbar component */}

      <div className={`relative flex w-full sm:inline-flex sm:w-auto overflow-hidden ${borderRadius} ${className}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={internalValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              processAndSubmit();
              inputRef.current.blur();
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`hide-number-arrows ${inputWidth} pl-2 py-2 ${paddingRight} ${borderRadius} text-right font-semibold border-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fontSize}`}
          {...props}
        />

        {/* Arrow controls - side by side */}
        <div className={`absolute ${isSmall ? 'right-0.5' : 'right-1'} top-0 bottom-0 flex`}>
          {/* Big increment arrows (±1) */}
          <div className="flex flex-col h-full">
            <button
              type="button"
              onClick={() => incrementValue(1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="+1"
            >
              <ChevronUp className={`${isSmall ? 'w-2 h-2' : 'w-3 h-3'} text-gray-600 dark:text-gray-400`} />
            </button>
            <button
              type="button"
              onClick={() => decrementValue(1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
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
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-200 dark:hover:bg-gray-700 ${isSmall ? 'rounded-tr rounded-br' : 'rounded-tr-xl rounded-br-xl'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="+0.1"
            >
              <ChevronUp className={`${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} text-gray-500 dark:text-gray-500`} />
            </button>
            <button
              type="button"
              onClick={() => decrementValue(0.1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled}
              className={`flex-1 ${isSmall ? 'px-0.5' : 'px-1'} hover:bg-gray-200 dark:hover:bg-gray-700 ${isSmall ? 'rounded-br' : 'rounded-br-xl'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="-0.1"
            >
              <ChevronDown className={`${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} text-gray-500 dark:text-gray-500`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberInput;