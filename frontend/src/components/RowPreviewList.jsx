// frontend/src/components/RowPreviewList.jsx
import React, { useState, useMemo } from "react";
import { Search, CheckSquare, Square, SortAsc, SortDesc } from "lucide-react";

export default function RowPreviewList({
  data = [],
  columns = [],
  selectedIndices = [],
  onSelectionChange = () => {},
  maxHeight = "500px"
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = data.map((row, index) => ({ ...row, _index: index }));

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const modifier = sortDirection === "asc" ? 1 : -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * modifier;
        }
        return String(aVal).localeCompare(String(bVal)) * modifier;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection]);

  const handleSelectAll = () => {
    if (selectedIndices.length === processedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(processedData.map(row => row._index));
    }
  };

  const handleRowToggle = (index) => {
    const newSelection = selectedIndices.includes(index)
      ? selectedIndices.filter(i => i !== index)
      : [...selectedIndices, index];
    onSelectionChange(newSelection);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const previewColumns = columns.slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b dark:border-slate-600">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search rows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
          />
        </div>
      </div>

      {/* Sort dropdown */}
      <div className="p-3 border-b dark:border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-slate-400">Sort by:</label>
          <select
            value={sortColumn}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm border rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
          >
            <option value="">None</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {sortColumn && (
            <button
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              {sortDirection === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500">
          Selected: {selectedIndices.length} of {data.length}
        </span>
      </div>

      {/* Select all / Clear all */}
      <div className="p-3 border-b dark:border-slate-600 flex gap-2">
        <button
          onClick={handleSelectAll}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          {selectedIndices.length === processedData.length ? "Clear All" : "Select All"}
        </button>
      </div>

      {/* Row list */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
        {processedData.map((row) => {
          const isSelected = selectedIndices.includes(row._index);
          return (
            <div
              key={row._index}
              onClick={() => handleRowToggle(row._index)}
              className={`p-3 border-b dark:border-slate-700 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  : "hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isSelected ? (
                    <CheckSquare size={18} className="text-blue-600" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                    Row #{row._index + 1}
                  </div>
                  <div className="text-sm space-y-1">
                    {previewColumns.map(col => (
                      <div key={col} className="truncate">
                        <span className="font-medium text-gray-600 dark:text-slate-400">{col}:</span>{" "}
                        <span className="text-gray-800 dark:text-slate-200">{String(row[col] || "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
