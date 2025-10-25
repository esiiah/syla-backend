// frontend/src/pages/EditingPage.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { UserContext } from "../context/UserContext";
import { useChartData } from "../context/ChartDataContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import EditingBar from "../components/EditingBar";
import EditingPanel from "../components/EditingPanel";
import EditingPreviewPanel from "../components/EditingPreviewPanel";
import ChartExportTool from "../components/export/ChartExportTool";
import RowSelectionModal from "../components/RowSelectionModal";

export default function EditingPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const { chartData, updateChartOptions, updateChartData, hasData, isDataLoaded } = useChartData();
  
  const [showRowSelectionModal, setShowRowSelectionModal] = useState(false);  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showExportTool, setShowExportTool] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [selectedBars, setSelectedBars] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const fileInputRef = useRef(null);
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (isDataLoaded && !hasData) {
      navigate("/");
      return;
    }
  }, [user, hasData, isDataLoaded, navigate]);

  useEffect(() => {
    const handleOpenModal = () => setShowRowSelectionModal(true);
    window.addEventListener('openRowSelectionModal', handleOpenModal);
    return () => window.removeEventListener('openRowSelectionModal', handleOpenModal);
  }, []);

  const handleRowSelectionApply = (selectedIndices) => {
    updateChartData({ 
      selectedRowIndices: selectedIndices,
      rowSelectionMode: "custom",
      totalRowCount: chartData.data.length
    });
  };

  // Initialize history with current state
  useEffect(() => {
    if (chartData && history.length === 0) {
      const initialState = {
        chartData: { ...chartData },
        timestamp: Date.now(),
        action: 'initial'
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [chartData, history.length]);

  // Scrollable navbar behavior
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      
      const currentScrollY = mainContentRef.current.scrollTop;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 50;

      if (currentScrollY > scrollThreshold) {
        setNavbarHidden(scrollingDown);
      } else {
        setNavbarHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY]);

  const addToHistory = (newData, action = 'change') => {
    const newState = {
      chartData: { ...newData },
      timestamp: Date.now(),
      action
    };
    
    // Remove any history after current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setHistoryIndex(newIndex);
      updateChartData(previousState.chartData);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setHistoryIndex(newIndex);
      updateChartData(nextState.chartData);
    }
  };

  const handleOptionsChange = (newOptions) => {
    // Accept both partial updates and full option objects
    const mergedOptions = typeof newOptions === 'object' && newOptions !== null
      ? { ...chartData.chartOptions, ...newOptions }
      : chartData.chartOptions;
    
    const updatedData = {
      ...chartData,
      chartOptions: mergedOptions
    };
    updateChartOptions(mergedOptions);
    addToHistory(updatedData, 'options_change');
  };

  const handleDataChange = (updates) => {
    const updatedData = { ...chartData, ...updates };
    updateChartData(updates);
    addToHistory(updatedData, 'data_change');
  };

  const handleSave = () => {
    const saveData = {
      ...chartData,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem("chartSaved", JSON.stringify(saveData));
    
    // Also save to backend if user is authenticated
    if (user) {
      // TODO: Implement backend save
      console.log("Saving to backend:", saveData);
    }
    
    alert("Chart saved successfully!");
  };

  const handleExport = () => {
    setShowExportTool(true);
  };

  const handleForecast = () => {
    // Store current state before navigating
    localStorage.setItem("chartBeforeForecast", JSON.stringify(chartData));
    navigate("/forecast");
  };

  const handleBarClick = (seriesKey, label) => {
    const newSelected = selectedBars.includes(label)
      ? selectedBars.filter(s => s !== label)
      : [...selectedBars, label];
    setSelectedBars(newSelected);
  };

  const handleSelectionDelete = () => {
    if (selectedBars.length === 0) return;
    
    const filteredData = chartData.data.filter((row, index) => {
      const rowLabel = row[chartData.xAxis] || `Row ${index + 1}`;
      return !selectedBars.includes(rowLabel);
    });
    
    const updatedData = { ...chartData, data: filteredData };
    updateChartData({ data: filteredData });
    addToHistory(updatedData, 'delete_selection');
    setSelectedBars([]);
    
    alert(`Deleted ${selectedBars.length} items`);
  };

  const handleSelectionClear = () => {
    setSelectedBars([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const csvData = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              const value = values[index] || '';
              const numValue = parseFloat(value);
              row[header] = isNaN(numValue) ? value : numValue;
            });
            return row;
          });

        setShowPreviewPanel(true);
      } catch (error) {
        console.error("File parsing error:", error);
        alert("Failed to parse file. Please ensure it's a valid CSV.");
      }
    };
    reader.readAsText(file);
  };

  const exportImage = (format) => {
    console.log("Exporting image:", format);
    setShowExportTool(false);
  };

  const exportData = (format) => {
    if (!chartData.data.length) return;
    
    if (format === "csv") {
      const keys = Object.keys(chartData.data[0]);
      const csvContent = [
        keys.join(","),
        ...chartData.data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chartData.chartTitle || 'data'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExportTool(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the chart editor.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* User Navbar - Scrollable, hidden on mobile */}
      <div className={`hidden md:block transition-transform duration-300 ${navbarHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <Navbar user={user} />
      </div>
      
      {/* Editing Toolbar - Hidden on mobile */}
      <div className="hidden md:block">
      <EditingBar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chartOptions={chartData.chartOptions}
        onOptionsChange={handleOptionsChange}
        onSave={handleSave}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onResetView={() => console.log("Reset view")}
        onFitToScreen={() => console.log("Fit to screen")}
        className="sticky top-0 z-40"
      />
      </div>

      {/* Main Content Area */}
      <div 
        ref={mainContentRef}
        className="flex flex-1 relative overflow-auto"
        style={{ height: window.innerWidth < 768 ? 'calc(100vh - 60px)' : 'calc(100vh - 120px)', paddingBottom: '40px' }}
      >
        {/* Sidebar - Hidden on mobile */}
        {sidebarOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-20 hidden lg:block"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed lg:relative left-0 top-0 h-full w-64 z-30 lg:z-10 hidden lg:block">
              <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
            </div>
          </>
        )}

        {/* Main Editing Panel */}
        <EditingPanel
          sidebarOpen={sidebarOpen}
          onTitleEdit={(title) => handleDataChange({ chartTitle: title })}
          onExport={handleExport}
          onForecast={handleForecast}
          selectedBars={selectedBars}
          onBarClick={handleBarClick}
          onSelectionDelete={handleSelectionDelete}
          onSelectionClear={handleSelectionClear}
        />

        {/* Floating Preview Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-6 right-6 p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors z-10"
          title="Upload File for Preview"
        >
          <Eye size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Preview Panel */}
        <EditingPreviewPanel
          isOpen={showPreviewPanel}
          onClose={() => setShowPreviewPanel(false)}
          data={chartData.data}
          columns={chartData.columns}
          title="Data Preview"
        />

        {/* Export Tool */}
        {showExportTool && (
          <ChartExportTool
            onClose={() => setShowExportTool(false)}
            onExportImage={exportImage}
            onExportCSV={() => exportData("csv")}
            onExportJSON={() => exportData("json")}
            chartData={chartData.data}
            chartTitle={chartData.chartTitle}
          />
        )}
      </div>

      <RowSelectionModal
          isOpen={showRowSelectionModal}
          onClose={() => setShowRowSelectionModal(false)}
          data={chartData.data}
          columns={chartData.columns}
          chartData={chartData}
          onApply={handleRowSelectionApply}
        />
      
    </div>
  );
}
