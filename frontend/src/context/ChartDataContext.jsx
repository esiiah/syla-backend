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
    isDataLoaded
  };

  return (
    <ChartDataContext.Provider value={contextValue}>
      {children}
    </ChartDataContext.Provider>
  );
};
