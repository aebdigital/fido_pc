import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  useValueAsPlaceholder = false, // Show current value as placeholder and keep input empty until user types
  ...props
}) => {
  // Helper to format value according to props
  const formatValue = useCallback((val) => {
    if (val === '' || val === null || val === undefined) return '';
    if (forceDecimal !== null && typeof val === 'number') {
      return val.toFixed(forceDecimal).replace('.', ',');
    }
    return val.toString().replace('.', ',');
  }, [forceDecimal]);

  const parseNumberLike = useCallback((val) => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, []);

  const getValueFromProp = useCallback(() => {
    return Math.max(min, Math.round(parseNumberLike(value) * 100) / 100);
  }, [value, min, parseNumberLike]);

  const effectivePlaceholder = useMemo(() => {
    if (useValueAsPlaceholder && value !== undefined && value !== null && value !== '') {
      return formatValue(value);
    }
    return placeholder;
  }, [useValueAsPlaceholder, value, formatValue, placeholder]);

  const [internalValue, setInternalValue] = useState(
    useValueAsPlaceholder
      ? ''
      : (value !== undefined && value !== null && value !== '' ? formatValue(value) : '')
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const touchStartYRef = useRef(0);
  const touchMovedRef = useRef(false);
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);
  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  const findScrollableAncestor = (element) => {
    let current = element?.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
      if (canScrollY) return current;
      current = current.parentElement;
    }
    return null;
  };

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
      if (useValueAsPlaceholder) {
        setInternalValue('');
      } else {
        setInternalValue(
          value !== undefined && value !== null && value !== '' ? formatValue(value) : ''
        );
      }
    }
  }, [value, isFocused, forceDecimal, formatValue, useValueAsPlaceholder]);

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
      if (useValueAsPlaceholder) {
        // Empty means "keep current value" in placeholder mode.
        setInternalValue('');
        onChange(getValueFromProp());
      } else {
        const zeroVal = 0;
        onChange(zeroVal);
        setInternalValue(formatValue(zeroVal));
      }
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
        if (useValueAsPlaceholder) {
          setInternalValue('');
          onChange(getValueFromProp());
        } else {
          setInternalValue(value !== undefined && value !== null ? formatValue(value) : '');
          onChange(value || 0);
        }
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

    // On touch devices (especially iOS), auto-selecting text can trigger focus jumps.
    // Keep native caret behavior there and only auto-select on non-touch devices.
    if (!isTouchDevice && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 0);
    }
  };

  const handleTouchStart = (e) => {
    if (!isIOS) return;
    touchMovedRef.current = false;
    touchStartYRef.current = e.changedTouches?.[0]?.clientY || 0;
  };

  const handleTouchMove = (e) => {
    if (!isIOS) return;
    const currentY = e.changedTouches?.[0]?.clientY || 0;
    if (Math.abs(currentY - touchStartYRef.current) > 8) {
      touchMovedRef.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isIOS || touchMovedRef.current) return;
    if (!inputRef.current) return;

    const inFixedModal = !!inputRef.current.closest('.fixed.inset-0');
    if (!inFixedModal) return;

    const scrollContainer = findScrollableAncestor(inputRef.current);

    inputRef.current.focus({ preventScroll: true });

    // After keyboard animation starts, smoothly move the field into visible area.
    let shouldPreventDefault = false;
    if (scrollContainer) {
      const initialRect = inputRef.current.getBoundingClientRect();
      const initialContainerRect = scrollContainer.getBoundingClientRect();
      const initialKeyboardTop = window.visualViewport?.height || window.innerHeight;
      const initialVisibleTop = initialContainerRect.top + 16;
      const initialVisibleBottom = Math.min(initialContainerRect.bottom - 20, initialKeyboardTop - 20);
      shouldPreventDefault = initialRect.bottom > initialVisibleBottom || initialRect.top < initialVisibleTop;

      setTimeout(() => {
        const inputRect = inputRef.current?.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        if (!inputRect) return;

        const keyboardTop = window.visualViewport?.height || window.innerHeight;
        const visibleTop = containerRect.top + 16;
        const visibleBottom = Math.min(containerRect.bottom - 20, keyboardTop - 20);

        if (inputRect.bottom > visibleBottom) {
          scrollContainer.scrollBy({
            top: inputRect.bottom - visibleBottom + 10,
            behavior: 'smooth'
          });
        } else if (inputRect.top < visibleTop) {
          scrollContainer.scrollBy({
            top: inputRect.top - visibleTop - 10,
            behavior: 'smooth'
          });
        }
      }, 220);
    }

    // Prevent default only when we manually scrolled to avoid iOS ghost-tap behavior.
    if (shouldPreventDefault) {
      e.preventDefault();
    }
  };

  const incrementValue = (step) => {
    const currentValue = internalValue !== ''
      ? (parseFloat(internalValue.replace(',', '.')) || 0)
      : getValueFromProp();
    const newValue = Math.max(min, currentValue + step);
    const roundedValue = Math.round(newValue * 100) / 100;
    setInternalValue(formatValue(roundedValue));
    debouncedOnChange(roundedValue);
  };

  const decrementValue = (step) => {
    const currentValue = internalValue !== ''
      ? (parseFloat(internalValue.replace(',', '.')) || 0)
      : getValueFromProp();
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              processAndSubmit();
              inputRef.current.blur();
            }
          }}
          disabled={disabled}
          placeholder={effectivePlaceholder}
          className={`hide-number-arrows ${inputWidth} pl-2 py-2 ${paddingRight} ${borderRadius} text-right font-semibold border-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fontSize}`}
          {...props}
        />

        {/* Arrow controls */}
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
