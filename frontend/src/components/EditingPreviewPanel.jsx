// frontend/src/components/EditingPreviewPanel.jsx
import React, { useState, useRef, useEffect } from "react";
import { X, Minimize2, Maximize2, Upload, FileSpreadsheet, Search, Filter, Download } from "lucide-react";

export default function EditingPreviewPanel({ 
  isOpen, 
  onClose, 
  data = [], 
  columns = [], 
  title = "Data Preview" 
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const rowsPerPage = 50;

  // Handle drag functionality
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y
    };
  };

  // Filter and sort data
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return String(aVal).localeCompare(String(bVal)) * modifier;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl"
      style={{
        right: position.x || 20,
        top: position.y || 100,
        width: isMinimized ? '300px' : '500px',
        height: isMinimized ? '60px' : '600px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-600 cursor-move bg-gray-50 dark:bg-slate-700 rounded-t-xl"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-sm text-gray-800 dark:text-slate-200">
            {title}
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            ({data.length} rows)
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Search and Controls */}
          <div className="p-3 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <button
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                title="Filter options"
              >
                <Filter size={16} />
              </button>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-400">
              <span>Showing {paginatedData.length} of {filteredData.length}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-auto">
            {data.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-slate-400 text-sm">No data to preview</p>
                  <button className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload size={14} className="inline mr-1" />
                    Upload File
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100 dark:bg-slate-600">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="text-left p-2 font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors border-r border-gray-200 dark:border-slate-500"
                          onClick={() => handleSort(column)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[100px]" title={column}>
                              {column}
                            </span>
                            {sortColumn === column && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        {columns.map((column) => (
                          <td 
                            key={column} 
                            className="p-2 text-gray-600 dark:text-slate-300 border-r border-gray-100 dark:border-slate-700"
                          >
                            <div className="truncate max-w-[120px]" title={String(row[column] || '')}>
                              {String(row[column] || '')}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = currentPage - 2 + i;
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
