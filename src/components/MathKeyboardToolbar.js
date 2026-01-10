import React, { useState, useEffect, useCallback } from 'react';

/**
 * MathKeyboardToolbar - iOS-style keyboard accessory bar
 *
 * Matches iOS InvoiceItemInputsToolBar / WorkInputsToolBar:
 * - Fixed at bottom of visible viewport (above virtual keyboard)
 * - Layout: [Done] [- + * =] [Next] or [Spacer] [- + * =] [Done]
 * - Appears only on touch devices when input is focused
 *
 * Uses window.visualViewport API to detect keyboard height and position
 * the toolbar just above the keyboard, making it appear as part of it.
 */

// Context to manage which input is currently active
let activeInputRef = null;
let activeInputCallback = null;
let toolbarUpdateCallback = null;

export const registerActiveInput = (inputRef, callbacks) => {
  activeInputRef = inputRef;
  activeInputCallback = callbacks;
  if (toolbarUpdateCallback) {
    toolbarUpdateCallback();
  }
};

export const unregisterActiveInput = (inputRef) => {
  if (activeInputRef === inputRef) {
    activeInputRef = null;
    activeInputCallback = null;
    if (toolbarUpdateCallback) {
      toolbarUpdateCallback();
    }
  }
};

export const getActiveInput = () => ({
  ref: activeInputRef,
  callbacks: activeInputCallback
});

const MathKeyboardToolbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [, forceUpdate] = useState(0);

  // Register for updates when active input changes
  useEffect(() => {
    toolbarUpdateCallback = () => forceUpdate(n => n + 1);
    return () => {
      toolbarUpdateCallback = null;
    };
  }, []);

  // Detect virtual keyboard using visualViewport API
  const handleViewportResize = useCallback(() => {
    if (window.visualViewport) {
      const viewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const calculatedKeyboardHeight = windowHeight - viewportHeight - viewport.offsetTop;

      // Only show if keyboard is open (height > 100px threshold)
      if (calculatedKeyboardHeight > 100 && activeInputRef) {
        setKeyboardHeight(calculatedKeyboardHeight);
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setKeyboardHeight(0);
      }
    }
  }, []);

  useEffect(() => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);

      // Initial check
      handleViewportResize();

      return () => {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      };
    }
  }, [handleViewportResize]);

  // Also listen for focus/blur events to update visibility
  useEffect(() => {
    const checkVisibility = () => {
      setTimeout(handleViewportResize, 100); // Small delay to let keyboard appear
    };

    document.addEventListener('focusin', checkVisibility);
    document.addEventListener('focusout', checkVisibility);

    return () => {
      document.removeEventListener('focusin', checkVisibility);
      document.removeEventListener('focusout', checkVisibility);
    };
  }, [handleViewportResize]);

  const handleAddSymbol = (symbol) => {
    if (activeInputCallback?.addSymbol) {
      activeInputCallback.addSymbol(symbol);
    }
  };

  const handleDone = () => {
    if (activeInputCallback?.done) {
      activeInputCallback.done();
    }
  };

  const handleEquals = () => {
    if (activeInputCallback?.evaluate) {
      activeInputCallback.evaluate();
    }
  };

  if (!isVisible || !activeInputRef) {
    return null;
  }

  return (
    <div
      className="math-keyboard-toolbar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: keyboardHeight,
        zIndex: 99999,
        backgroundColor: '#d1d5db', // iOS keyboard gray
        borderTop: '1px solid #9ca3af',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        // Prevent any touch events from reaching elements behind
        touchAction: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent blur
      onTouchStart={(e) => e.preventDefault()} // Prevent blur on touch
    >
      {/* Done button - left side */}
      <button
        onClick={handleDone}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleDone();
        }}
        style={{
          padding: '6px 14px',
          backgroundColor: '#1f2937',
          color: 'white',
          borderRadius: '9999px',
          fontWeight: '600',
          fontSize: '15px',
          border: 'none',
          minWidth: '65px',
          cursor: 'pointer',
        }}
      >
        Done
      </button>

      {/* Math symbols - center */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          gap: '2px',
        }}
      >
        {['-', '+', '*'].map((symbol) => (
          <button
            key={symbol}
            onClick={() => handleAddSymbol(symbol)}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleAddSymbol(symbol);
            }}
            style={{
              width: '44px',
              height: '38px',
              backgroundColor: 'white',
              border: '1px solid #9ca3af',
              borderRadius: '6px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1f2937',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {symbol === '*' ? '×' : symbol}
          </button>
        ))}
        <button
          onClick={handleEquals}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleEquals();
          }}
          style={{
            width: '44px',
            height: '38px',
            backgroundColor: '#3b82f6',
            border: '1px solid #2563eb',
            borderRadius: '6px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          =
        </button>
      </div>

      {/* Spacer to balance the Done button */}
      <div style={{ minWidth: '65px' }} />
    </div>
  );
};

export default MathKeyboardToolbar;
