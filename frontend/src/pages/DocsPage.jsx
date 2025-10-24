// frontend/src/pages/DocsPage.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Book, Code, Terminal, Zap, Database, FileText, Settings,
  ChevronRight, Copy, Check, ExternalLink
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { UserContext } from "../context/UserContext";

const DocsPage = () => {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const [activeSection, setActiveSection] = useState("overview");
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: "overview", label: "Overview", icon: Book },
    { id: "quickstart", label: "Quick Start", icon: Zap },
    { id: "api", label: "API Reference", icon: Code },
    { id: "data-viz", label: "Data Visualization", icon: Database },
    { id: "ai-forecast", label: "AI Forecasting", icon: Terminal },
    { id: "file-tools", label: "File Tools", icon: FileText },
    { id: "advanced", label: "Advanced", icon: Settings }
  ];

  // Local sidebar for docs
  const DocsSidebar = ({ sections, activeSection, setActiveSection }) => (
   <div className="w-64 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 hidden lg:block">
     <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Documentation</h2>
      {sections.map((s) => (
       <button
         key={s.id}
         onClick={() => setActiveSection(s.id)}
          className={`flex items-center w-full text-left p-2 rounded-lg mb-2 transition-colors ${
            activeSection === s.id
              ? "bg-blue-600 text-white"
              : "text-gray-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700"
          }`}
       >
          <s.icon className="w-4 h-4 mr-2" />
         {s.label}
        </button>
     ))}
   </div>
  );

  const CodeBlock = ({ code, language = "javascript", id }) => (
    <div className="relative group">
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => copyToClipboard(code, id)}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          {copiedCode === id ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Copy size={16} className="text-slate-300" />
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">Syla Analytics Documentation</h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mb-6">
              Complete guide to building data-driven applications with Syla
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                <Database className="text-blue-600 dark:text-blue-400 mb-3" size={32} />
                <h3 className="font-semibold text-lg mb-2">Data Processing</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Upload CSV/Excel files up to 10MB. Automatic cleaning, type detection, and summary statistics.
                </p>
              </div>

              <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                <Zap className="text-purple-600 dark:text-purple-400 mb-3" size={32} />
                <h3 className="font-semibold text-lg mb-2">AI Forecasting</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Natural language scenarios with GPT-4 + Prophet models. 85-95% accuracy for short-term forecasts.
                </p>
              </div>

              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-700">
                <FileText className="text-green-600 dark:text-green-400 mb-3" size={32} />
                <h3 className="font-semibold text-lg mb-2">File Tools</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Convert between PDF, Excel, CSV, Word. Merge PDFs. Compress files with 3 levels.
                </p>
              </div>

              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-700">
                <Code className="text-orange-600 dark:text-orange-400 mb-3" size={32} />
                <h3 className="font-semibold text-lg mb-2">REST API</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  FastAPI backend with JWT auth. OpenAPI docs at /api/docs. Rate limits: 50/hour.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Technology Stack</h2>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Frontend:</strong> React 18, Chart.js, TailwindCSS, Vite</li>
              <li><strong>Backend:</strong> Python 3.11+, FastAPI, Pandas, Prophet</li>
              <li><strong>AI:</strong> OpenAI GPT-4o-mini, Prophet time-series</li>
              <li><strong>Database:</strong> PostgreSQL with SQLAlchemy ORM</li>
              <li><strong>Auth:</strong> JWT tokens, Google OAuth 2.0</li>
            </ul>
          </div>
        );

      case "quickstart":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">Quick Start Guide</h1>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Upload Your First File</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Upload a CSV or Excel file from the homepage:
            </p>
            <CodeBlock
              id="upload-curl"
              language="bash"
              code={`curl -X POST "https://api.syla.ai/api/upload" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@data.csv"

# Response:
{
  "file_id": "1234567890_data.csv",
  "rows": 1000,
  "columns": ["Date", "Revenue", "Customers"],
  "types": {"Date": "datetime", "Revenue": "numeric"},
  "summary": {...},
  "data": [...]
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Create a Visualization</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              After upload, charts are created automatically. Customize via UI or API:
            </p>
            <CodeBlock
              id="viz-js"
              language="javascript"
              code={`// Using fetch API
const response = await fetch('/api/chart/payload', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    file_id: "1234567890_data.csv",
    display: {
      chart_type: "line",
      x_axis: "Date",
      y_axis: "Revenue"
    }
  })
});

const chartData = await response.json();
// Use chartData.chart_payload with Chart.js`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Generate AI Forecast</h2>
            <CodeBlock
              id="forecast-js"
              language="javascript"
              code={`const forecastResponse = await fetch('/api/forecast/whatif', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    csv_data: yourDataArray,
    scenario_text: "Increase marketing by 15% next quarter",
    target_column: "Revenue",
    date_column: "Date",
    model_preference: "hybrid",
    periods_ahead: 12
  })
});

const forecast = await forecastResponse.json();
console.log(forecast.forecast.forecast); // [123.4, 145.2, ...]`}
            />

            <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-700">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Zap className="text-yellow-600 dark:text-yellow-400" size={20} />
                Rate Limits
              </h3>
              <ul className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                <li>• Free tier: 50 AI forecasts/month, 100 uploads/hour</li>
                <li>• Professional: 500 forecasts/month, priority queue</li>
                <li>• Business: Unlimited forecasts, dedicated resources</li>
              </ul>
            </div>
          </div>
        );

      case "api":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">API Reference</h1>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Base URL: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">https://api.syla.ai/api</code>
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Authentication</h2>
            <p className="mb-4">All API requests require JWT authentication:</p>
            <CodeBlock
              id="auth-header"
              code={`Authorization: Bearer YOUR_JWT_TOKEN

# Get token via login:
POST /api/auth/login
{
  "contact": "user@example.com",
  "password": "yourpassword"
}

# Response includes:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">Core Endpoints</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-lg mb-2">POST /api/upload</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Upload CSV/Excel file for processing</p>
                <CodeBlock
                  id="upload-endpoint"
                  code={`# Request (multipart/form-data):
file: <binary>

# Response:
{
  "file_id": "string",
  "rows": 1000,
  "columns": ["col1", "col2"],
  "types": {"col1": "numeric", "col2": "categorical"},
  "data": [{...}]
}`}
                />
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-lg mb-2">POST /api/forecast/whatif</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Generate AI-powered forecast</p>
                <CodeBlock
                  id="forecast-endpoint"
                  code={`# Request:
{
  "csv_data": [{...}],
  "scenario_text": "10% growth next quarter",
  "target_column": "Revenue",
  "model_preference": "hybrid",
  "periods_ahead": 12,
  "confidence_level": 0.95
}

# Response:
{
  "forecast": {
    "forecast": [100.2, 105.3, ...],
    "lower": [95.1, 99.8, ...],
    "upper": [105.3, 110.8, ...],
    "timestamps": ["2025-01-01", ...]
  },
  "explanation": "Based on scenario...",
  "metadata": {...}
}`}
                />
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-lg mb-2">POST /api/filetools/pdf-to-excel</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Convert PDF to Excel</p>
                <CodeBlock
                  id="pdf-convert"
                  code={`# Request (multipart/form-data):
file: <pdf_binary>

# Response:
{
  "message": "PDF successfully converted to Excel",
  "download_url": "/api/filetools/files/converted_123.xlsx",
  "filename": "converted_123.xlsx"
}`}
                />
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Error Handling</h2>
            <CodeBlock
              id="errors"
              code={`# Standard error response:
{
  "detail": "Error message",
  "status_code": 400
}

# Common status codes:
400 - Bad Request (invalid parameters)
401 - Unauthorized (missing/invalid token)
403 - Forbidden (insufficient permissions)
429 - Rate Limit Exceeded
500 - Internal Server Error`}
            />

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm flex items-center gap-2">
                <ExternalLink size={16} />
                Interactive API docs available at:
                <a href="https://api.syla.ai/docs" className="text-blue-600 dark:text-blue-400 hover:underline">
                  api.syla.ai/docs
                </a>
              </p>
            </div>
          </div>
        );

      case "data-viz":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">Data Visualization Guide</h1>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Supported Chart Types</h2>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Bar Charts:</strong> Compare categories, show distributions</li>
              <li><strong>Line Charts:</strong> Time-series data, trends over time</li>
              <li><strong>Pie Charts:</strong> Show proportions and percentages</li>
              <li><strong>Scatter Plots:</strong> Correlation analysis, outlier detection</li>
              <li><strong>Area Charts:</strong> Cumulative trends, stacked data</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Creating Charts via UI</h2>
            <ol className="space-y-3 text-gray-700 dark:text-slate-300">
              <li>1. Upload your CSV/Excel file on the homepage</li>
              <li>2. Select X-axis column (usually date/category)</li>
              <li>3. Select Y-axis column (numeric values)</li>
              <li>4. Click settings icon to choose chart type</li>
              <li>5. Customize colors, labels, and gridlines</li>
              <li>6. Export as PNG, SVG, or PDF</li>
            </ol>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Programmatic Chart Creation</h2>
            <CodeBlock
              id="chart-code"
              language="javascript"
              code={`import { useChartData } from "./context/ChartDataContext";

function MyComponent() {
  const { chartData, updateChartOptions } = useChartData();

  const customizeChart = () => {
    updateChartOptions({
      chartType: "line",
      backgroundColor: "#ffffff",
      gridColor: "#e5e7eb",
      fontSize: 14,
      showLegend: true,
      colors: ["#3b82f6", "#10b981", "#f59e0b"]
    });
  };

  return <ChartView data={chartData} />;
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Cleaning</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Syla automatically cleans your data before visualization:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li>• Removes duplicate rows</li>
              <li>• Handles missing values (mean/median imputation)</li>
              <li>• Converts data types (strings to numbers where applicable)</li>
              <li>• Detects and formats dates automatically</li>
              <li>• Trims whitespace from text columns</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Chart Options Reference</h2>
            <CodeBlock
              id="chart-options"
              code={`{
  chartType: "bar" | "line" | "pie" | "scatter" | "area",
  backgroundColor: "#ffffff",
  gridColor: "#e5e7eb",
  fontSize: 12-24,
  fontFamily: "Inter",
  showLegend: boolean,
  showGrid: boolean,
  colors: string[], // hex colors
  xAxisLabel: string,
  yAxisLabel: string,
  title: string,
  responsive: boolean,
  maintainAspectRatio: boolean
}`}
            />
          </div>
        );

      case "ai-forecast":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">AI Forecasting Guide</h1>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Overview</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Syla combines GPT-4o-mini language understanding with Prophet statistical modeling to generate
              accurate, scenario-aware forecasts from natural language descriptions.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Model Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold mb-2">GPT Model</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Uses AI to interpret scenarios. Fast, context-aware, good for what-if analysis.
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <h3 className="font-semibold mb-2">Prophet Model</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Statistical time-series. Excellent for seasonality, holidays, trend detection.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <h3 className="font-semibold mb-2">Hybrid (Recommended)</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Combines both. Statistical base + AI scenario adjustments. Best accuracy.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Writing Effective Scenarios</h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                <p className="font-semibold text-green-800 dark:text-green-300 mb-2">✓ Good Example:</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  "Increase marketing budget by 15% starting next month, expecting 10% revenue boost in months 2-6, then stabilizing at 8% ongoing growth due to brand awareness."
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-2">✗ Bad Example:</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  "Things will get better"
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Scenario Best Practices</h2>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li>• Include specific percentages (10%, 15%, 20%)</li>
              <li>• Mention timeframes (next month, Q2, starting January)</li>
              <li>• Describe business context (marketing campaign, price increase)</li>
              <li>• Reference external factors (seasonality, competition, economy)</li>
              <li>• Keep under 500 characters for best results</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Forecast Parameters</h2>
            <CodeBlock
              id="forecast-params"
              code={`{
  target_column: "Revenue",        // What to forecast
  date_column: "Date",            // Optional, auto-generated if missing
  model_preference: "hybrid",     // gpt | prophet | hybrid | auto
  periods_ahead: 12,              // 1-120 periods
  confidence_level: 0.95,         // 0.5-0.99 (80%, 90%, 95%, 99%)
  scenario_text: "Your scenario"  // Max 500 chars
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">Understanding Results</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Forecast responses include:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>forecast:</strong> Predicted values (most likely outcome)</li>
              <li><strong>lower:</strong> Lower confidence bound (pessimistic scenario)</li>
              <li><strong>upper:</strong> Upper confidence bound (optimistic scenario)</li>
              <li><strong>timestamps:</strong> Future dates for each prediction</li>
              <li><strong>explanation:</strong> AI-generated interpretation</li>
            </ul>

            <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-700">
              <h3 className="font-semibold mb-2">Data Requirements</h3>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-300">
                <li>• Minimum 6 data points (12+ recommended)</li>
                <li>• Target column must be numeric</li>
                <li>• Clean data (no excessive nulls or outliers)</li>
                <li>• Consistent time intervals (daily, weekly, monthly)</li>
              </ul>
            </div>
          </div>
        );

      case "file-tools":
        return (
          <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold mb-4">File Tools Documentation</h1>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Available Conversions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                "PDF → Excel",
                "PDF → Word",
                "PDF → CSV",
                "Excel → PDF",
                "Excel → CSV",
                "CSV → Excel",
                "CSV → PDF"
              ].map((conversion) => (
                <div key={conversion} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="font-semibold">{conversion}</p>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4">PDF to Excel</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Extracts tables from PDF files into Excel format. Works best with structured PDFs containing clear tables.
            </p>
            <CodeBlock
              id="pdf-excel"
              code={`POST /api/filetools/pdf-to-excel

# Request:
Content-Type: multipart/form-data
file: <pdf_binary>

# Response:
{
  "message": "PDF table data successfully converted to Excel",
  "download_url": "/api/filetools/files/converted_123.xlsx",
  "filename": "converted_123.xlsx"
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">File Compression</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Compress PDFs and other files with three levels:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Light:</strong> 10-30% reduction, minimal quality loss</li>
              <li><strong>Medium:</strong> 30-50% reduction, balanced quality</li>
              <li><strong>Strong:</strong> 50-70% reduction, may affect images</li>
            </ul>

            <CodeBlock
              id="compress"
              code={`POST /api/filetools/pdf/compress

# Request:
Content-Type: multipart/form-data
file: <file_binary>
level: "medium"  # light | medium | strong

# Response:
{
  "message": "PDF compressed successfully (medium level)",
  "download_url": "/api/filetools/files/compressed_123.pdf",
  "size_before": 5242880,
  "size_after": 2621440,
  "reduction_percent": 50.0
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">Merge PDFs</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Combine up to 15 PDF files into a single document:
            </p>
            <CodeBlock
              id="merge-pdf"
              code={`POST /api/filetools/pdf/merge

# Request:
Content-Type: multipart/form-data
files: <pdf_binary_1>
files: <pdf_binary_2>
files: <pdf_binary_3>

# Response:
{
  "message": "Successfully merged 3 PDF files",
  "download_url": "/api/filetools/files/merged_123.pdf",
  "filename": "merged_123.pdf"
}`}
            />

            <h2 className="text-2xl font-semibold mt-8 mb-4">File Limits</h2>
            <ul className="space-y-2 text-gray-700 dark:text-slate-300">
              <li>• Maximum file size: 10MB per file</li>
              <li>• PDF merge: Up to 15 files</li>
              <li>• Conversion formats: PDF, Excel, CSV, Word</li>
              <li>• Files auto-delete after 30 days</li>
              <li>• Rate limit: 100 conversions per hour</li>
            </ul>

            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
              <h3 className="font-semibold mb-2">Tips for Best Results</h3>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-300">
                <li>• Use high-quality source PDFs with clear tables</li>
                <li>• Avoid scanned images (use OCR tools first)</li>
                <li>• Test compression levels on a sample first</li>
                <li>• Ensure PDF files aren't password-protected</li>
              </ul>
            </div>
          </div>
        );

case "advanced":
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1 className="text-3xl font-display font-bold mb-4">Advanced Topics</h1>

      <h2 className="text-2xl font-semibold mt-6 mb-4">Authentication Flow</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Syla uses JWT (JSON Web Tokens) for authentication with httpOnly cookies for security.
      </p>
      <CodeBlock
        id="auth-flow"
        code={`// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contact: 'user@example.com',
    password: 'password123'
  })
});

const { access_token, user } = await loginResponse.json();

// Token automatically stored in httpOnly cookie
// For API calls, include in Authorization header:
const apiCall = await fetch('/api/forecast/whatif', {
  headers: {
    'Authorization': \`Bearer \${access_token}\`,
    'Content-Type': 'application/json'
  }
});`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Rate Limiting</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        All API endpoints are rate-limited to ensure fair usage:
      </p>
      <ul className="space-y-2 text-gray-700 dark:text-slate-300">
        <li><strong>Free tier:</strong> 100 requests/hour for uploads, 50 AI forecasts/month</li>
        <li><strong>Professional:</strong> 500 requests/hour, 500 AI forecasts/month</li>
        <li><strong>Business:</strong> Unlimited requests, dedicated rate limits</li>
      </ul>
      
      <CodeBlock
        id="rate-limit-headers"
        code={`// Rate limit info in response headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704124800

// Handle 429 responses:
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(\`Rate limited. Retry after \${retryAfter} seconds\`);
}`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Error Handling Best Practices</h2>
      <CodeBlock
        id="error-handling"
        code={`// Robust error handling with retries
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API request failed');
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Webhook Integration</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Business plan users can configure webhooks for real-time notifications:
      </p>
      <CodeBlock
        id="webhooks"
        code={`// Configure webhook
POST /api/webhooks
{
  "url": "https://your-app.com/syla-webhook",
  "events": ["forecast.completed", "upload.processed"],
  "secret": "your_webhook_secret"
}

// Webhook payload example:
{
  "event": "forecast.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "forecast_id": "fcast_123",
    "user_id": "user_456",
    "status": "completed",
    "result": {...}
  },
  "signature": "sha256=..."
}`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Custom Data Pipelines</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Integrate Syla into your data pipeline:
      </p>
      <CodeBlock
        id="pipeline"
        code={`// Example: Automated daily forecast pipeline
import cron from 'node-cron';
import SylaClient from 'syla-sdk';

const syla = new SylaClient({ apiKey: process.env.SYLA_API_KEY });

// Run every day at 6 AM
cron.schedule('0 6 * * *', async () => {
  try {
    // 1. Fetch latest data from your database
    const data = await fetchLatestSalesData();
    
    // 2. Upload to Syla
    const upload = await syla.upload(data);
    
    // 3. Generate forecast
    const forecast = await syla.forecast({
      file_id: upload.file_id,
      scenario: "Standard growth projection",
      target_column: "revenue",
      periods_ahead: 30
    });
    
    // 4. Store results
    await storeForecast(forecast);
    
    // 5. Send alerts if needed
    if (forecast.trend === 'declining') {
      await sendAlert('Revenue forecast shows decline');
    }
  } catch (error) {
    console.error('Forecast pipeline failed:', error);
  }
});`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Performance Optimization</h2>
      <ul className="space-y-3 text-gray-700 dark:text-slate-300">
        <li>
          <strong>Batch Uploads:</strong> Group multiple files into a single API call to reduce overhead
        </li>
        <li>
          <strong>Caching:</strong> Cache frequently accessed charts and forecasts locally
        </li>
        <li>
          <strong>Compression:</strong> Enable gzip compression on API requests
        </li>
        <li>
          <strong>Pagination:</strong> Use pagination for large datasets (limit=100 recommended)
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Security Best Practices</h2>
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Never expose API keys</h3>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Store API keys in environment variables, never commit them to git
          </p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">✓ Use HTTPS only</h3>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            All API calls must use HTTPS. HTTP requests are rejected.
          </p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
          <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">✓ Rotate tokens regularly</h3>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Refresh JWT tokens every 24 hours using /api/auth/refresh endpoint
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">SDK Libraries</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Official SDKs available for popular languages:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold mb-2">JavaScript/TypeScript</h4>
          <code className="text-sm text-blue-600 dark:text-blue-400">npm install @syla/sdk</code>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold mb-2">Python</h4>
          <code className="text-sm text-blue-600 dark:text-blue-400">pip install syla-client</code>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold mb-2">Ruby</h4>
          <code className="text-sm text-blue-600 dark:text-blue-400">gem install syla</code>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold mb-2">Go</h4>
          <code className="text-sm text-blue-600 dark:text-blue-400">go get github.com/syla/sdk-go</code>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Environment Configuration</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Recommended environment variables for production:
      </p>
      <CodeBlock
        id="env-config"
        code={`# .env file
SYLA_API_KEY=your_api_key_here
SYLA_API_URL=https://api.sylaanalytics.com
SYLA_TIMEOUT=30000
SYLA_RETRY_ATTEMPTS=3
SYLA_LOG_LEVEL=info

# Node.js example
import dotenv from 'dotenv';
dotenv.config();

const sylaConfig = {
  apiKey: process.env.SYLA_API_KEY,
  timeout: parseInt(process.env.SYLA_TIMEOUT),
  retryAttempts: parseInt(process.env.SYLA_RETRY_ATTEMPTS)
};`}
      />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Monitoring & Logging</h2>
      <p className="text-gray-600 dark:text-slate-400 mb-4">
        Track API usage and performance:
      </p>
      <CodeBlock
        id="monitoring"
        code={`// Custom logging middleware
const sylaLogger = {
  logRequest: (endpoint, params) => {
    console.log(\`[\${new Date().toISOString()}] Syla API Request\`, {
      endpoint,
      params: JSON.stringify(params)
    });
  },
  
  logResponse: (endpoint, duration, success) => {
    console.log(\`[\${new Date().toISOString()}] Syla API Response\`, {
      endpoint,
      duration: \`\${duration}ms\`,
      success
    });
  },
  
  logError: (endpoint, error) => {
    console.error(\`[\${new Date().toISOString()}] Syla API Error\`, {
      endpoint,
      error: error.message,
      stack: error.stack
    });
  }
};

// Usage with fetch wrapper
async function monitoredFetch(url, options) {
  const start = Date.now();
  const endpoint = new URL(url).pathname;
  
  sylaLogger.logRequest(endpoint, options.body);
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    sylaLogger.logResponse(endpoint, duration, response.ok);
    return response;
  } catch (error) {
    sylaLogger.logError(endpoint, error);
    throw error;
  }
}`}
      />

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold text-lg mb-2 text-blue-800 dark:text-blue-200">Need More Help?</h3>
        <p className="text-sm text-gray-700 dark:text-slate-300 mb-4">
          For advanced use cases, custom integrations, or enterprise support:
        </p>
        <div className="flex gap-3">
          <a
            href="mailto:enterprise@syla.ai"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Contact Enterprise Team
          </a>
          <a
            href="/help"
            className="px-4 py-2 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
          >
            View FAQ
          </a>
        </div>
      </div>
    </div>
  );

// This completes the "advanced" section of DocsPage.jsx

    default:
      return <div>Select a section from the sidebar</div>;
  } // closes switch
}; // closes renderContent()

return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-slate-900">
    <DocsSidebar
      sections={sections}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    />
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{renderContent()}</main>
      <Footer />
    </div>
  </div>
);
} 

export default DocsPage;
