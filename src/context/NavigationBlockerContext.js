import React, { createContext, useContext, useState, useRef } from 'react';

const NavigationBlockerContext = createContext();

export const useNavigationBlocker = () => {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error('useNavigationBlocker must be used within a NavigationBlockerProvider');
  }
  return context;
};

export const NavigationBlockerProvider = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const blockingCallbacksRef = useRef({});

  const blockNavigation = (blockerId, callbacks) => {
    blockingCallbacksRef.current[blockerId] = callbacks;
    setIsBlocked(Object.keys(blockingCallbacksRef.current).length > 0);
  };

  const unblockNavigation = (blockerId) => {
    delete blockingCallbacksRef.current[blockerId];
    setIsBlocked(Object.keys(blockingCallbacksRef.current).length > 0);
  };

  const attemptNavigation = (path) => {
    if (isBlocked) {
      setPendingPath(path);
      setShowModal(true);
      return false; // Navigation blocked
    }
    return true; // Navigation allowed
  };

  const handleSaveAndProceed = () => {
    // Call save on all blocking components
    Object.values(blockingCallbacksRef.current).forEach(callbacks => {
      if (callbacks.onSave) callbacks.onSave();
    });
    
    setShowModal(false);
    
    // Clear all blocks
    blockingCallbacksRef.current = {};
    setIsBlocked(false);
    
    // Return the pending path so parent can handle navigation
    const path = pendingPath;
    setPendingPath(null);
    return path;
  };

  const handleDiscardAndProceed = () => {
    // Call discard on all blocking components
    Object.values(blockingCallbacksRef.current).forEach(callbacks => {
      if (callbacks.onDiscard) callbacks.onDiscard();
    });
    
    setShowModal(false);
    
    // Clear all blocks
    blockingCallbacksRef.current = {};
    setIsBlocked(false);
    
    // Return the pending path so parent can handle navigation
    const path = pendingPath;
    setPendingPath(null);
    return path;
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingPath(null);
  };

  return (
    <NavigationBlockerContext.Provider
      value={{
        isBlocked,
        blockNavigation,
        unblockNavigation,
        attemptNavigation,
        showModal,
        pendingPath,
        handleSaveAndProceed,
        handleDiscardAndProceed,
        handleCancel
      }}
    >
      {children}
    </NavigationBlockerContext.Provider>
  );
};