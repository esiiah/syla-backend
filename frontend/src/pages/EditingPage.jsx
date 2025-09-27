// frontend/src/pages/EditingPage.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Menu, X, Settings, Palette, Type, Undo2, Redo2, 
  TrendingUp, Download, Upload, Eye, ChevronDown, 
  ChevronUp, Save, RefreshCw, Grid, BarChart3,
  FileSpreadsheet, Trash2, Edit3, Move
} from "lucide-react";

// Import components
import ChartView from "../components/ChartView";
import ChartOptions from "../components/ChartOptions";
import ChartExportTool from "../components/export/ChartExportTool";
import { UserContext } from "../context/UserContext";

export default function EditingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, theme } = useContext(UserContext);
  
  // Core data state
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [chartTitle, setChartTitle] = useState("Untitled Chart");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  
  // Chart options state
  const [chartOptions, setChartOptions] = useState({
    type: "bar",
    color: "#2563eb",
    gradient: false,
    showLabels: false,
    sort: "none",
    orientation: "vertical"
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState(null);
  const [showExportTool, setShowExportTool] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedBars, setSelectedBars] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadChartData();
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const loadChartData = () => {
    try {
      const savedData = JSON.parse(localStorage.getItem("uploadedData") || "[]");
      const savedColumns = JSON.parse(localStorage.getItem("uploadedColumns") || "[]");
      const savedTitle = localStorage.getItem("chartTitle") || "Untitled Chart";
      const savedXAxis = localStorage.getItem("currentXAxis") || "";
      const savedYAxis = localStorage.getItem("currentYAxis") || "";

      if (savedData.length > 0) {
        setData(savedData);
        setColumns(savedColumns);
        setChartTitle(savedTitle);
        setXAxis(savedXAxis || savedColumns[0] || "");
        setYAxis(savedYAxis || savedColumns[1] || "");
        
        // Initialize history
        addToHistory({
          data: savedData,
          options: chartOptions,
          title: savedTitle,
          xAxis: savedXAxis,
          yAxis: savedYAxis
        });
      }
    } catch (error) {
      console.error("Failed to load chart data:", error);
    }
  };

  // History management
  const addToHistory = (state) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setData(prevState.data);
      setChartOptions(prevState.options);
      setChartTitle(prevState.title);
      setXAxis(prevState.xAxis);
      setYAxis(prevState.yAxis);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setData(nextState.data);
      setChartOptions(nextState.options);
      setChartTitle(nextState.title);
      setXAxis(nextState.xAxis);
      setYAxis(nextState.yAxis);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // File upload handler
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
              // Try to parse as number
              const numValue = parseFloat(value);
              row[header] = isNaN(numValue) ? value : numValue;
            });
            return row;
          });

        setPreviewData(csvData);
        setShowFilePreview(true);
      } catch (error) {
        console.error("File parsing error:", error);
        alert("Failed to parse file. Please ensure it's a valid CSV.");
      }
    };
    reader.readAsText(file);
  };

  // Chart interaction handlers
  const handleBarClick = (seriesKey, label) => {
    const newSelected = selectedBars.includes(label)
      ? selectedBars.filter(s => s !== label)
      : [...selectedBars, label];
    setSelectedBars(newSelected);
  };

  const deleteSelectedBars = () => {
    if (selectedBars.length === 0) return;
    
    const filteredData = data.filter(row => !selectedBars.includes(row[xAxis]));
    setData(filteredData);
    setSelectedBars([]);
    
    addToHistory({
      data: filteredData,
      options: chartOptions,
      title: chartTitle,
      xAxis,
      yAxis
    });
  };

  const saveChart = () => {
    localStorage.setItem("uploadedData", JSON.stringify(data));
    localStorage.setItem("chartTitle", chartTitle);
    localStorage.setItem("currentXAxis", xAxis);
    localStorage.setItem("currentYAxis", yAxis);
    alert("Chart saved successfully!");
  };

  // Tool panel management
  const toggleToolPanel = (panelName) => {
    setActiveToolPanel(activeToolPanel === panelName ? null : panelName);
  };

  const toolPanels = [
    { 
      id: "settings", 
      icon: Settings, 
      label: "Chart Settings",
      component: ChartOptions
    },
    { 
      id: "colors", 
      icon: Palette, 
      label: "Colors & Style" 
    },
    { 
      id: "text", 
      icon: Type, 
      label: "Text & Labels" 
    },
    { 
      id: "data", 
      icon: Grid, 
      label: "Data Management" 
    }
  ];

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Enhanced Navbar with Two Layers */}
      <nav className="sticky top-0 z-30 bg-gray-100 dark:bg-slate-800 border-b-2 border-blue-500 shadow-lg">
        {/* First Layer - App Info & User */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-600">
          {/* Left - App Logo */}
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Syla logo" className="w-8 h-8" />
            <div>
              <span className="font-display text-lg tracking-wide">
                Syla <span className="text-blue-600">Editor</span>
              </span>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Advanced Chart Editing
              </div>
            </div>
          </div>

          {/* Right - User Info */}
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url || "/default-avatar.png"}
              alt="User avatar"
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-white/10"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              {user?.name || "User"}
            </span>
          </div>
        </div>

        {/* Second Layer - Editing Tools */}
        <div className="px-4 py-2 flex items-center justify-between">
          {/* Left - Sidebar Toggle + Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            <div className="h-6 w-px bg-gray-300 dark:bg-slate-600 mx-2" />

            {/* Tool Icons */}
            {toolPanels.map(tool => (
              <button
                key={tool.id}
                onClick={() => toggleToolPanel(tool.id)}
                className={`p-2 rounded-lg transition-colors ${
                  activeToolPanel === tool.id
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "hover:bg-gray-200 dark:hover:bg-slate-700"
                }`}
                title={tool.label}
              >
                <tool.icon size={18} />
              </button>
            ))}

            <div className="h-6 w-px bg-gray-300 dark:bg-slate-600 mx-2" />

            {/* History Controls */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
          </div>

          {/* Right - Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveChart}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 relative">
        {/* Collapsible Sidebar */}
        {sidebarOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed lg:relative left-0 top-0 h-full w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-600 z-30 lg:z-10 transform lg:transform-none transition-transform">
              <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                <h3 className="font-semibold">Editor Panels</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-4 space-y-3">
                {toolPanels.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      toggleToolPanel(tool.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeToolPanel === tool.id
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <tool.icon size={18} />
                    <span className="font-medium">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex relative">
          {/* Chart Display Area */}
          <div className={`flex-1 p-6 transition-all duration-300 ${showFilePreview ? 'pr-96' : ''}`}>
            {/* Top Action Buttons */}
            <div className="flex justify-between items-center mb-4">
              {/* Chart Title */}
              <div className="flex items-center gap-2">
                {editingTitle ? (
                  <input
                    type="text"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyPress={(e) => e.key === 'Enter' && setEditingTitle(false)}
                    className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                    onClick={() => setEditingTitle(true)}
                  >
                    {chartTitle}
                    <Edit3 size={16} className="opacity-50" />
                  </h1>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/forecast")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <TrendingUp size={16} />
                  Forecast
                </button>
                <button
                  onClick={() => setShowExportTool(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            {/* Selection Actions */}
            {selectedBars.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {selectedBars.length} item(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteSelectedBars}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedBars([])}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Component */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
              <ChartView
                data={data}
                columns={columns}
                options={chartOptions}
                chartTitle={chartTitle}
                xAxis={xAxis}
                yAxis={yAxis}
                setXAxis={setXAxis}
                setYAxis={setYAxis}
                onBarClick={handleBarClick}
                selectedBars={selectedBars}
              />
            </div>
          </div>

          {/* File Preview Panel */}
          {showFilePreview && (
            <div className="fixed right-0 top-20 bottom-0 w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-600 shadow-xl z-20 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                <h3 className="font-semibold">File Preview</h3>
                <button
                  onClick={() => setShowFilePreview(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {previewData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-600">
                          {Object.keys(previewData[0]).map(header => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                            {Object.values(row).map((value, j) => (
                              <td key={j} className="p-2 text-gray-600 dark:text-slate-300">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No file loaded</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Right Action Button */}
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

          {/* Tool Panel Overlay */}
          {activeToolPanel && (
            <div className="fixed right-0 top-32 bottom-0 w-96 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-600 shadow-xl z-20 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                <h3 className="font-semibold">
                  {toolPanels.find(p => p.id === activeToolPanel)?.label}
                </h3>
                <button
                  onClick={() => setActiveToolPanel(null)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-4">
                {activeToolPanel === "settings" && (
                  <ChartOptions
                    options={chartOptions}
                    setOptions={setChartOptions}
                    columns={columns}
                    data={data}
                  />
                )}
                {activeToolPanel === "colors" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Color and styling options coming soon...
                    </p>
                  </div>
                )}
                {activeToolPanel === "text" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Text editing tools coming soon...
                    </p>
                  </div>
                )}
                {activeToolPanel === "data" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Data management tools coming soon...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Tool */}
          {showExportTool && (
            <ChartExportTool
              onClose={() => setShowExportTool(false)}
              chartData={data}
              chartTitle={chartTitle}
              onExportImage={(format) => {
                console.log("Exporting image:", format);
                // Handle image export
              }}
              onExportCSV={() => {
                console.log("Exporting CSV");
                // Handle CSV export
              }}
              onExportJSON={() => {
                console.log("Exporting JSON");
                // Handle JSON export
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
