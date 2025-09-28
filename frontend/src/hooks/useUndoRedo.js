// frontend/src/hooks/useUndoRedo.js
import { useState, useCallback, useRef } from "react";

export const useUndoRedo = (initialState, maxHistorySize = 50) => {
  const [history, setHistory] = useState([{ ...initialState, timestamp: Date.now() }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUpdatingRef = useRef(false);

  const addToHistory = useCallback((newState, action = 'change') => {
    if (isUpdatingRef.current) return; // Prevent infinite loops
    
    setHistory(prevHistory => {
      const newEntry = {
        ...newState,
        timestamp: Date.now(),
        action
      };
      
      // Remove any history after current index (for when user made changes after undo)
      const newHistory = prevHistory.slice(0, currentIndex + 1);
      newHistory.push(newEntry);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setCurrentIndex(prev => prev - 1);
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex, maxHistorySize]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const getCurrentState = () => history[currentIndex];

  const setIsUpdating = (updating) => {
    isUpdatingRef.current = updating;
  };

  const clearHistory = useCallback(() => {
    setHistory([{ ...initialState, timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, [initialState]);

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentState,
    setIsUpdating,
    clearHistory,
    history,
    currentIndex
  };
};
