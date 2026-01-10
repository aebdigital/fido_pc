import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { registerActiveInput, unregisterActiveInput } from './MathKeyboardToolbar';

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

// Check if device uses touch/coarse pointer (phone, tablet) vs fine pointer (mouse/trackpad)
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
};

const NumberInput = ({
  value,
  onChange,
  className = "",
  min = 0,
  disabled = false,
  size = "normal", // "small" or "normal"
  placeholder = "0",
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(
    value !== undefined && value !== null && value !== '' && value !== 0 ? value.toString().replace('.', ',') : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const [showMathToolbar, setShowMathToolbar] = useState(false);
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
        value !== undefined && value !== null && value !== '' && value !== 0 ? value.toString().replace('.', ',') : ''
      );
    }
  }, [value, isFocused]);

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
      setInternalValue(finalValue.toString().replace('.', ','));
      onChange(finalValue);
    } else {
      // Fallback to simple parse if expression evaluation failed
      const numericValue = parseFloat(internalValue.replace(',', '.'));
      if (!isNaN(numericValue)) {
        const finalValue = Math.max(min, Math.round(numericValue * 100) / 100);
        setInternalValue(finalValue.toString().replace('.', ','));
        onChange(finalValue);
      } else {
        setInternalValue(value !== 0 ? value.toString().replace('.', ',') : '');
        onChange(value || 0);
      }
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    setShowMathToolbar(false);
    // Unregister from global keyboard toolbar
    unregisterActiveInput(inputRef);
    processAndSubmit();
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    // Only show math toolbar on touch devices (no hardware keyboard)
    const isTouch = isTouchDevice();
    setShowMathToolbar(isTouch);

    // Register with global keyboard toolbar for touch devices
    if (isTouch) {
      registerActiveInput(inputRef, {
        addSymbol: (symbol) => {
          if (inputRef.current) {
            const start = inputRef.current.selectionStart;
            const end = inputRef.current.selectionEnd;
            const text = internalValue;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newValue = before + symbol + after;
            setInternalValue(newValue);

            // Reset cursor position after state update
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.selectionStart = inputRef.current.selectionEnd = start + symbol.length;
                inputRef.current.focus();
              }
            }, 0);
          }
        },
        done: () => {
          processAndSubmit();
          if (inputRef.current) {
            inputRef.current.blur();
          }
        },
        evaluate: () => {
          processAndSubmit();
        }
      });
    }
  };

  const incrementValue = (step) => {
    const currentValue = parseFloat(internalValue.replace(',', '.')) || 0;
    const newValue = Math.max(min, currentValue + step);
    const roundedValue = Math.round(newValue * 100) / 100;
    setInternalValue(roundedValue.toString().replace('.', ','));
    debouncedOnChange(roundedValue);
  };

  const decrementValue = (step) => {
    const currentValue = parseFloat(internalValue.replace(',', '.')) || 0;
    const newValue = Math.max(min, currentValue - step);
    const roundedValue = Math.round(newValue * 100) / 100;
    setInternalValue(roundedValue.toString().replace('.', ','));
    debouncedOnChange(roundedValue);
  };

  const isSmall = size === "small";
  const inputWidth = isSmall ? "w-24" : "w-32";
  const paddingRight = isSmall ? "pr-10" : "pr-14";
  const fontSize = "text-base"; // Use text-base (16px) to prevent iOS auto-zoom
  const borderRadius = isSmall ? "rounded" : "rounded-xl";

  return (
    <div className="relative inline-block">
      {/* Math Toolbar is now handled by the global MathKeyboardToolbar component */}

      <div className={`relative inline-flex overflow-hidden ${borderRadius} ${className}`}>
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
          className={`hide-number-arrows ${inputWidth} pl-3 pr-2 py-2 ${paddingRight} ${borderRadius} text-center font-semibold border-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fontSize}`}
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