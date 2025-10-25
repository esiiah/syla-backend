// frontend/src/context/ChartDataContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ChartDataContext = createContext();

export const useChartData = () => {
  const context = useContext(ChartDataContext);
  if (!context) {
    throw new Error("useChartData must be used within ChartDataProvider");
  }
  return context;
};

export const ChartDataProvider = ({ children }) => {
  const [chartData, setChartData] = useState({
    data: [], columns: [], types: {}, summary: {}, chartTitle: "", xAxis: "",
    yAxis: "", chartOptions: { type: "bar", color: "#2563eb", gradient: false,
      showLabels: false, sort: "none", orientation: "vertical", selectedRowIndices: null, rowSelectionMode: "auto",
      totalRowCount: 0, isRowSelectionModalOpen: false,
    }
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from localStorage on initialization
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to localStorage whenever chartData changes
  useEffect(() => {
    if (isDataLoaded) {
      saveToStorage();
    }
  }, [chartData, isDataLoaded]);

  const loadFromStorage = () => {
    try {
      const storedData = localStorage.getItem("chartData");
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setChartData(prev => ({ ...prev, ...parsed }));
      }
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Failed to load chart data from storage:", error);
      setIsDataLoaded(true);
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem("chartData", JSON.stringify(chartData));
      // Also maintain backwards compatibility with existing storage keys
      localStorage.setItem("uploadedData", JSON.stringify(chartData.data));
      localStorage.setItem("uploadedColumns", JSON.stringify(chartData.columns));
      localStorage.setItem("chartTitle", chartData.chartTitle);
      localStorage.setItem("currentXAxis", chartData.xAxis);
      localStorage.setItem("currentYAxis", chartData.yAxis);
    } catch (error) {
      console.error("Failed to save chart data to storage:", error);
    }
  };

  const updateChartData = (updates) => {
    setChartData(prev => ({ ...prev, ...updates }));
  };

  const updateData = (data) => {
    setChartData(prev => ({ ...prev, data }));
  };

  const updateColumns = (columns) => {
    setChartData(prev => ({ ...prev, columns }));
  };

  const updateChartOptions = (options) => {
    setChartData(prev => ({ 
      ...prev, 
      chartOptions: { ...prev.chartOptions, ...options }
    }));
  };

  const updateAxes = (xAxis, yAxis) => {
    setChartData(prev => ({ ...prev, xAxis, yAxis }));
  };

  const clearData = () => {
    const emptyData = {
      data: [],
      columns: [],
      types: {},
      summary: {},
      chartTitle: "",
      xAxis: "",
      yAxis: "",
      chartOptions: {
        type: "bar",
        color: "#2563eb",
        gradient: false,
        showLabels: false,
        sort: "none",
        orientation: "vertical"
      }
    };
    setChartData(emptyData);
    localStorage.removeItem("chartData");
    localStorage.removeItem("uploadedData");
    localStorage.removeItem("uploadedColumns");
    localStorage.removeItem("chartTitle");
    localStorage.removeItem("currentXAxis");
    localStorage.removeItem("currentYAxis");
  };

  const setSelectedRows = (indices) => {
    setChartData(prev => ({ ...prev, selectedRowIndices: indices }));
  };

  const toggleRowSelectionModal = () => {
    setChartData(prev => ({ 
      ...prev, 
      isRowSelectionModalOpen: !prev.isRowSelectionModalOpen 
    }));
  };

  const loadSavedRowSelection = async (chartId) => {
    try {
      const response = await fetch(`/api/charts/${chartId}/row-selection`, {
        credentials: 'include'
      });
      if (response.ok) {
        const selection = await response.json();
        setChartData(prev => ({
          ...prev,
          selectedRowIndices: selection.selected_row_indices,
          rowSelectionMode: selection.selection_mode
        }));
      }
    } catch (error) {
      console.error('Failed to load row selection:', error);
    }
  };

  const saveRowSelection = async (chartId, selectionData) => {
    try {
      const response = await fetch(`/api/charts/${chartId}/row-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(selectionData)
      });
      if (!response.ok) throw new Error('Failed to save row selection');
      return await response.json();
    } catch (error) {
      console.error('Failed to save row selection:', error);
      throw error;
    }
  };

  const resetRowSelection = () => {
    setChartData(prev => ({
      ...prev,
      selectedRowIndices: null,
      rowSelectionMode: "auto"
    }));
  };

  const hasData = chartData.data.length > 0;

  const contextValue = {
    chartData,
    updateChartData,
    updateData,
    updateColumns,
    updateChartOptions,
    updateAxes,
    clearData,
    hasData,
    isDataLoaded,
    setSelectedRows,
    toggleRowSelectionModal,
    loadSavedRowSelection,
    saveRowSelection,
    resetRowSelection
  };

  return (
    <ChartDataContext.Provider value={contextValue}>
      {children}
    </ChartDataContext.Provider>
  );
};
