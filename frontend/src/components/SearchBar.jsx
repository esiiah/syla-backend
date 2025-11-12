// frontend/src/components/SearchBar.jsx
import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Upload, BarChart3, LineChart, PieChart, TrendingUp,
  FileText, Settings, User, HelpCircle, DollarSign, FileCode,
  Repeat, Minimize2, FilePlus, Bell, BookOpen, Zap, Save
} from "lucide-react";
import { UserContext } from "../context/UserContext";

// Static search index for app features
const SEARCH_INDEX = [
  {
    id: "upload",
    title: "Upload Data",
    description: "Upload CSV or Excel files for analysis",
    keywords: ["upload", "import", "csv", "excel", "data", "file"],
    route: "/",
    icon: Upload,
    category: "Data",
    score: 0
  },
  {
    id: "visualize",
    title: "Visualize Data",
    description: "Create charts and visualizations",
    keywords: ["visualize", "chart", "graph", "plot", "visualization"],
    route: "/",
    icon: BarChart3,
    category: "Data",
    score: 0
  },
  {
    id: "editing",
    title: "Chart Editor",
    description: "Advanced chart editing and customization",
    keywords: ["edit", "customize", "chart", "editor", "modify"],
    route: "/editing",
    icon: FileText,
    category: "Tools",
    score: 0
  },
  {
    id: "bar-chart",
    title: "Bar Chart",
    description: "Create bar charts for categorical data",
    keywords: ["bar", "column", "categorical", "comparison"],
    route: "/editing?type=bar",
    icon: BarChart3,
    category: "Charts",
    score: 0
  },
  {
    id: "line-chart",
    title: "Line Chart",
    description: "Visualize trends and time series",
    keywords: ["line", "trend", "time", "series", "continuous"],
    route: "/editing?type=line",
    icon: LineChart,
    category: "Charts",
    score: 0
  },
  {
    id: "pie-chart",
    title: "Pie Chart",
    description: "Show proportions and percentages",
    keywords: ["pie", "proportion", "percentage", "donut"],
    route: "/editing?type=pie",
    icon: PieChart,
    category: "Charts",
    score: 0
  },
  {
    id: "forecast",
    title: "AI Forecasting",
    description: "Generate AI-powered forecasts and predictions",
    keywords: ["forecast", "ai", "prediction", "prophet", "gpt", "ml", "machine learning"],
    route: "/forecast",
    icon: TrendingUp,
    category: "AI",
    score: 0
  },
  {
    id: "convert",
    title: "File Converter",
    description: "Convert between CSV, Excel, PDF formats",
    keywords: ["convert", "csv", "excel", "pdf", "format", "transformation"],
    route: "/tools/convert",
    icon: Repeat,
    category: "Tools",
    score: 0
  },
  {
    id: "compress",
    title: "File Compression",
    description: "Compress images, PDFs, and documents",
    keywords: ["compress", "reduce", "size", "optimize", "image", "pdf"],
    route: "/tools/compress",
    icon: Minimize2,
    category: "Tools",
    score: 0
  },
  {
    id: "merge",
    title: "PDF Merge",
    description: "Merge multiple PDF files into one",
    keywords: ["merge", "combine", "pdf", "join"],
    route: "/tools/merge",
    icon: FilePlus,
    category: "Tools",
    score: 0
  },
  {
    id: "csv-to-excel",
    title: "CSV to Excel",
    description: "Convert CSV files to Excel format",
    keywords: ["csv to excel", "csv excel", "xlsx"],
    route: "/tools/csv-to-excel",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "excel-to-csv",
    title: "Excel to CSV",
    description: "Convert Excel files to CSV format",
    keywords: ["excel to csv", "xlsx csv"],
    route: "/tools/excel-to-csv",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDF to Word document",
    keywords: ["pdf to word", "pdf word", "docx"],
    route: "/tools/pdf-to-word",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert Word document to PDF",
    keywords: ["word to pdf", "docx pdf"],
    route: "/tools/word-to-pdf",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Convert Excel spreadsheet to PDF",
    keywords: ["excel to pdf", "xlsx pdf"],
    route: "/tools/excel-to-pdf",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "image-to-pdf",
    title: "Image to PDF",
    description: "Convert images to PDF format",
    keywords: ["image to pdf", "jpg pdf", "png pdf", "photo pdf"],
    route: "/tools/image-to-pdf",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Convert PDF to Excel spreadsheet",
    keywords: ["pdf to excel", "pdf xlsx", "extract tables"],
    route: "/tools/pdf-to-excel",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "csv-to-pdf",
    title: "CSV to PDF",
    description: "Convert CSV to PDF document",
    keywords: ["csv to pdf", "csv pdf"],
    route: "/tools/csv-to-pdf",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "pdf-to-csv",
    title: "PDF to CSV",
    description: "Extract tables from PDF to CSV",
    keywords: ["pdf to csv", "pdf csv", "extract data"],
    route: "/tools/pdf-to-csv",
    icon: FileCode,
    category: "Conversions",
    score: 0
  },
  {
    id: "profile",
    title: "Profile",
    description: "Manage your account and preferences",
    keywords: ["profile", "account", "user", "me"],
    route: "/profile",
    icon: User,
    category: "Account",
    score: 0
  },
  {
    id: "settings",
    title: "Settings",
    description: "Configure application settings",
    keywords: ["settings", "preferences", "configuration"],
    route: "/settings",
    icon: Settings,
    category: "Account",
    score: 0
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "View your notifications and alerts",
    keywords: ["notifications", "alerts", "messages", "updates"],
    route: "/notifications",
    icon: Bell,
    category: "Account",
    score: 0
  },
  {
    id: "help",
    title: "Help Center",
    description: "Get help and support",
    keywords: ["help", "support", "faq", "guide"],
    route: "/help",
    icon: HelpCircle,
    category: "Support",
    score: 0
  },
  {
    id: "docs",
    title: "Documentation",
    description: "API documentation and guides",
    keywords: ["docs", "documentation", "api", "guide", "tutorial"],
    route: "/docs",
    icon: BookOpen,
    category: "Support",
    score: 0
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "View pricing plans and features",
    keywords: ["pricing", "plans", "cost", "subscription", "payment"],
    route: "/pricing",
    icon: DollarSign,
    category: "Business",
    score: 0
  }
];

const SearchBar = ({ className = "" }) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Fuzzy search function
  const fuzzyMatch = (str, pattern) => {
    const lowerStr = str.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    if (lowerStr.includes(lowerPattern)) return true;
    
    let patternIdx = 0;
    for (let i = 0; i < lowerStr.length && patternIdx < lowerPattern.length; i++) {
      if (lowerStr[i] === lowerPattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === lowerPattern.length;
  };

  // Client-side search for app features
  const searchClientSide = (searchQuery) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matches = [];

    SEARCH_INDEX.forEach(item => {
      let score = 0;

      if (item.title.toLowerCase() === searchLower) {
        score += 100;
      } else if (item.title.toLowerCase().includes(searchLower)) {
        score += 50;
      } else if (fuzzyMatch(item.title, searchLower)) {
        score += 25;
      }

      item.keywords.forEach(keyword => {
        if (keyword === searchLower) {
          score += 80;
        } else if (keyword.includes(searchLower)) {
          score += 40;
        } else if (fuzzyMatch(keyword, searchLower)) {
          score += 20;
        }
      });

      if (item.description.toLowerCase().includes(searchLower)) {
        score += 10;
      }

      if (score > 0) {
        matches.push({ ...item, score });
      }
    });

    return matches;
  };

  // Backend search for user's saved content
  const searchBackend = async (searchQuery) => {
    if (!user) return [];

    try {
      setIsLoadingBackend(true);
      const response = await fetch(
        `/api/search/saved-charts?q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return (data.results || []).map(result => ({
          id: `saved-${result.id}`,
          title: result.title,
          description: result.description,
          route: result.url,
          icon: Save,
          category: "Saved",
          score: 30 // Lower score than exact matches but visible
        }));
      }
    } catch (error) {
      console.error("Backend search failed:", error);
    } finally {
      setIsLoadingBackend(false);
    }

    return [];
  };

  // Combined search (client + backend)
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Get client-side results immediately
    const clientResults = searchClientSide(searchQuery);

    // Show client results right away
    const sortedClient = clientResults.sort((a, b) => b.score - a.score).slice(0, 6);
    setResults(sortedClient);

    // Then fetch backend results if user is logged in
    if (user) {
      const backendResults = await searchBackend(searchQuery);
      
      // Merge and deduplicate
      const allResults = [...sortedClient, ...backendResults];
      const uniqueResults = allResults
        .filter((result, index, self) => 
          index === self.findIndex(r => r.route === result.route)
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setResults(uniqueResults);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query, user]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showResults || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case "Escape":
          setShowResults(false);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showResults, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (result) => {
    navigate(result.route);
    setShowResults(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Data": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "Charts": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "AI": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      "Tools": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      "Conversions": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      "Account": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      "Support": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
      "Business": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      "Saved": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
    };
    return colors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
          size={18} 
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search features, charts, or your saved content..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            if (query.trim()) setShowResults(true);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                     dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200
                     placeholder:text-gray-400 dark:placeholder:text-slate-500"
        />
        {isLoadingBackend && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div 
          className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 
                     border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg 
                     max-h-96 overflow-y-auto z-50"
        >
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className={`w-full p-3 text-left border-b border-gray-100 dark:border-slate-700 
                           last:border-b-0 transition-colors flex items-start gap-3
                           ${index === selectedIndex 
                             ? 'bg-blue-50 dark:bg-blue-900/20' 
                             : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                           }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <Icon size={20} className="text-gray-600 dark:text-slate-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-gray-900 dark:text-slate-200 truncate">
                      {result.title}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getCategoryColor(result.category)}`}>
                      {result.category}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400 line-clamp-1">
                    {result.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showResults && query.trim() && results.length === 0 && !isLoadingBackend && (
        <div 
          className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 
                     border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-4 z-50"
        >
          <div className="text-center text-gray-500 dark:text-slate-400">
            <Search size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No results found for "{query}"</p>
            <p className="text-xs mt-1">Try searching for features, charts, or tools</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;