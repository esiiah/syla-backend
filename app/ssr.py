# app/ssr.py
"""Server-Side Rendering for crawlers and SEO"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def get_route_metadata(path: str = "/"):
    """Provide metadata for SSR/crawlers based on route"""
    routes = {
        "/": {
            "title": "Syla Analytics - AI Data Forecasting & Visualization",
            "description": "Transform raw data into actionable insights with AI-powered forecasting using Prophet and GPT-4. Upload CSV/Excel files for instant data cleaning, interactive Chart.js visualizations, and predictive analytics. Free tools include PDF to Word/Excel conversion, file merging, and compression.",
            "keywords": "AI forecasting, data visualization, CSV analysis, Excel tools, data cleaning, Prophet forecasting, GPT-4 analytics, Chart.js, PDF converter, business intelligence",
            "content": """
    <h1>Syla Analytics - AI-Powered Data Intelligence Platform</h1>
    <p>Welcome to Syla Analytics, your complete solution for data analysis and visualization.</p>
    
    <h2>Core Features</h2>
    <ul>
        <li><strong>AI Forecasting:</strong> Generate accurate predictions using hybrid Prophet + GPT-4 models</li>
        <li><strong>Data Visualization:</strong> Create interactive charts from CSV and Excel files</li>
        <li><strong>Automated Data Cleaning:</strong> Smart detection and handling of missing values, outliers, and inconsistencies</li>
        <li><strong>File Conversion Tools:</strong> Convert between PDF, Word, Excel, and CSV formats</li>
    </ul>
    
    <h2>How It Works</h2>
    <ol>
        <li>Upload your CSV or Excel file (up to 10MB)</li>
        <li>Automatic data cleaning and type detection</li>
        <li>Choose from multiple chart types (bar, line, pie, scatter, area)</li>
        <li>Generate AI forecasts with customizable horizons</li>
        <li>Export visualizations and predictions</li>
    </ol>
    
    <h2>Supported File Formats</h2>
    <p>CSV, XLSX, XLS, PDF, DOCX - all processed with intelligent automation</p>
    
    <h2>Pricing</h2>
    <p>Free tier: 50 AI forecasts/month, unlimited uploads. Professional plans available.</p>
    """
        },
        "/forecast": {
            "title": "AI Forecasting - Syla Analytics",
            "description": "Generate accurate time series forecasts using Prophet statistical models and GPT-4 AI. Upload your historical data for predictions with 85-95% accuracy. Supports custom scenarios, multiple regressors, and confidence intervals.",
            "keywords": "AI forecasting, predictive analytics, time series, Prophet, GPT forecasting, data prediction, business forecasting",
            "content": """
    <h1>AI-Powered Forecasting</h1>
    <p>Generate accurate predictions from your historical data using advanced AI models.</p>
    
    <h2>Forecasting Methods</h2>
    <ul>
        <li><strong>Prophet:</strong> Facebook's robust statistical forecasting for time series with trends and seasonality</li>
        <li><strong>GPT-4:</strong> Advanced AI analysis for pattern recognition and anomaly detection</li>
        <li><strong>Hybrid:</strong> Combined approach for maximum accuracy (recommended)</li>
    </ul>
    
    <h2>Key Features</h2>
    <ul>
        <li>Custom forecast horizons (daily, weekly, monthly, yearly)</li>
        <li>Confidence intervals (80%, 90%, 95%)</li>
        <li>Multiple regressor support</li>
        <li>Scenario-based predictions</li>
        <li>Automated data validation</li>
    </ul>
    
    <h2>Accuracy</h2>
    <p>Achieves 85-95% accuracy with sufficient historical data (12+ data points recommended)</p>
    """
        },
        "/tools/pdf-to-word": {
            "title": "PDF to Word Converter - Syla Analytics",
            "description": "Convert PDF files to editable Word documents (DOCX) with preserved formatting. Free online tool with no registration required. Supports text extraction, table conversion, and image handling.",
            "keywords": "PDF to Word, PDF converter, DOCX conversion, document converter, PDF tools",
            "content": """
    <h1>PDF to Word Converter</h1>
    <p>Convert your PDF documents to editable Word format instantly.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Preserves original formatting</li>
        <li>Handles tables and images</li>
        <li>Fast conversion (under 30 seconds)</li>
        <li>No registration required</li>
        <li>Files up to 10MB</li>
    </ul>
    """
        },
        "/tools/pdf-to-excel": {
            "title": "PDF to Excel Converter - Syla Analytics",
            "description": "Convert PDF files to Excel spreadsheets with automatic table detection and formatting. Extract data tables from PDFs into XLSX format.",
            "keywords": "PDF to Excel, XLSX converter, PDF table extraction, spreadsheet tools",
            "content": """
    <h1>PDF to Excel Converter</h1>
    <p>Extract tables and data from PDFs into Excel format.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Automatic table detection</li>
        <li>Preserves data structure</li>
        <li>Multi-page support</li>
        <li>Clean formatting</li>
    </ul>
    """
        },
        "/tools/csv-to-excel": {
            "title": "CSV to Excel Converter - Syla Analytics",
            "description": "Convert CSV files to Excel (XLSX) format with automatic formatting, data type detection, and header styling. Free online tool supporting large datasets.",
            "keywords": "CSV to Excel, XLSX converter, spreadsheet conversion, data tools",
            "content": """
    <h1>CSV to Excel Converter</h1>
    <p>Transform CSV files into formatted Excel spreadsheets.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Automatic data type detection</li>
        <li>Formatted headers</li>
        <li>Preserves data integrity</li>
        <li>Handles large files</li>
    </ul>
    """
        },
        "/tools/merge": {
            "title": "PDF Merge Tool - Syla Analytics",
            "description": "Combine multiple PDF files into a single document. Free online PDF merger with drag-and-drop interface.",
            "keywords": "PDF merge, combine PDFs, PDF tools, document merger",
            "content": """
    <h1>PDF Merge Tool</h1>
    <p>Combine multiple PDF files into one document.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Unlimited file merging</li>
        <li>Drag-and-drop interface</li>
        <li>Preserves quality</li>
        <li>Fast processing</li>
    </ul>
    """
        },
        "/tools/compress": {
            "title": "File Compression Tools - Syla Analytics",
            "description": "Compress images, PDFs, and documents with smart AI-powered optimization. Reduce file sizes while maintaining quality.",
            "keywords": "file compression, image optimization, PDF compression, document compressor",
            "content": """
    <h1>File Compression Tools</h1>
    <p>Reduce file sizes while maintaining quality.</p>
    
    <h2>Features</h2>
    <ul>
        <li>AI-powered optimization</li>
        <li>Multiple format support</li>
        <li>Quality preservation</li>
        <li>Batch processing</li>
    </ul>
    """
        },
        "/tools/excel-to-csv": {
            "title": "Excel to CSV Converter - Syla Analytics",
            "description": "Convert Excel files to CSV format. Free online XLSX to CSV converter with data preservation.",
            "keywords": "Excel to CSV, XLSX to CSV, spreadsheet converter, data export",
            "content": """
    <h1>Excel to CSV Converter</h1>
    <p>Convert Excel spreadsheets to CSV format.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Preserves data structure</li>
        <li>Multiple sheet support</li>
        <li>Fast conversion</li>
        <li>No data loss</li>
    </ul>
    """
        },
        "/tools/csv-to-pdf": {
            "title": "CSV to PDF Converter - Syla Analytics",
            "description": "Convert CSV files to PDF format. Create formatted PDF documents from CSV data.",
            "keywords": "CSV to PDF, data to PDF, PDF converter, report generation",
            "content": """
    <h1>CSV to PDF Converter</h1>
    <p>Convert CSV data into formatted PDF documents.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Professional formatting</li>
        <li>Table layout</li>
        <li>Custom styling</li>
        <li>High quality output</li>
    </ul>
    """
        },
        "/tools/excel-to-pdf": {
            "title": "Excel to PDF Converter - Syla Analytics",
            "description": "Convert Excel spreadsheets to PDF format. Preserve formatting and create professional PDF reports.",
            "keywords": "Excel to PDF, XLSX to PDF, spreadsheet to PDF, report generation",
            "content": """
    <h1>Excel to PDF Converter</h1>
    <p>Convert Excel files to professional PDF documents.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Formatting preservation</li>
        <li>Multiple sheet support</li>
        <li>Print-ready output</li>
        <li>Professional quality</li>
    </ul>
    """
        },
        "/tools/pdf-to-csv": {
            "title": "PDF to CSV Converter - Syla Analytics",
            "description": "Extract data from PDF files and convert to CSV format. Automatic table detection and data extraction.",
            "keywords": "PDF to CSV, PDF data extraction, table extraction, data conversion",
            "content": """
    <h1>PDF to CSV Converter</h1>
    <p>Extract tables and data from PDFs into CSV format.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Automatic table detection</li>
        <li>Data structure preservation</li>
        <li>Multi-page support</li>
        <li>Clean CSV output</li>
    </ul>
    """
        },
        "/pricing": {
            "title": "Pricing - Syla Analytics",
            "description": "Flexible pricing plans for individuals, professionals, and businesses. Free tier includes 50 AI forecasts/month, unlimited data uploads, and all file conversion tools. Professional and Business plans offer higher limits and priority support.",
            "keywords": "pricing, plans, subscription, AI tools, business intelligence pricing",
            "content": """
    <h1>Syla Analytics Pricing</h1>
    
    <h2>Free Tier</h2>
    <ul>
        <li>50 AI forecasts per month</li>
        <li>Unlimited data uploads</li>
        <li>All file conversion tools</li>
        <li>Basic visualizations</li>
    </ul>
    
    <h2>Professional - $29/month</h2>
    <ul>
        <li>500 AI forecasts per month</li>
        <li>Advanced chart customization</li>
        <li>Priority support</li>
        <li>API access</li>
    </ul>
    
    <h2>Business - $99/month</h2>
    <ul>
        <li>Unlimited forecasts</li>
        <li>Team collaboration</li>
        <li>Custom integrations</li>
        <li>Dedicated support</li>
    </ul>
    """
        },
        "/help": {
            "title": "Help & Support - Syla Analytics",
            "description": "Get help with using Syla Analytics features and tools. Documentation, tutorials, and FAQs.",
            "keywords": "help, support, documentation, FAQ, tutorials",
            "content": """
    <h1>Help & Support</h1>
    <p>Find answers to common questions and learn how to use Syla Analytics.</p>
    
    <h2>Getting Started</h2>
    <ul>
        <li>How to upload data</li>
        <li>Creating visualizations</li>
        <li>Running forecasts</li>
        <li>Using file tools</li>
    </ul>
    """
        },
        "/docs": {
            "title": "Documentation - Syla Analytics",
            "description": "Complete documentation for Syla Analytics API and features. Developer guides and API reference.",
            "keywords": "documentation, API docs, guides, tutorials, developer documentation",
            "content": """
    <h1>Documentation</h1>
    <p>Complete guide to using Syla Analytics API and features.</p>
    
    <h2>API Reference</h2>
    <ul>
        <li>Authentication</li>
        <li>Data Upload</li>
        <li>Forecasting API</li>
        <li>Visualization API</li>
    </ul>
    """
        }
    }
    
    meta = routes.get(path, routes["/"])
    return {
        "title": meta["title"],
        "description": meta["description"],
        "keywords": meta["keywords"],
        "url": f"https://sylaanalytics.com{path}",
        "image": "https://sylaanalytics.com/favicon.png",
        "content": meta.get("content", "")
    }


@router.get("/ssr-meta")
def ssr_meta_endpoint(path: str = "/"):
    """API endpoint for metadata"""
    return get_route_metadata(path)


@router.get("/ssr/{full_path:path}")
async def serve_ssr_page(full_path: str):
    """Serve server-rendered HTML for crawlers"""
    try:
        # Normalize path
        if not full_path or full_path == "ssr" or full_path == "ssr/":
            clean_path = "/"
        else:
            # Remove leading 'ssr/' if present
            clean_path = full_path.replace("ssr/", "", 1)
            if not clean_path.startswith("/"):
                clean_path = f"/{clean_path}"
        
        meta = get_route_metadata(clean_path)
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{meta['title']}</title>
    <meta name="description" content="{meta['description']}">
    <meta name="keywords" content="{meta['keywords']}">
    <link rel="canonical" href="{meta['url']}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{meta['title']}">
    <meta property="og:description" content="{meta['description']}">
    <meta property="og:url" content="{meta['url']}">
    <meta property="og:image" content="{meta['image']}">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{meta['title']}">
    <meta name="twitter:description" content="{meta['description']}">
    <meta name="twitter:image" content="{meta['image']}">
    
    <!-- Redirect to SPA after 3 seconds (for real users, ignored by crawlers) -->
    <meta http-equiv="refresh" content="3;url={clean_path}">
    
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #1f2937;
        }}
        h1 {{ 
            color: #3b82f6; 
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }}
        h2 {{ 
            color: #1e40af; 
            margin-top: 2rem;
            font-size: 1.75rem;
        }}
        ul {{ 
            line-height: 1.8;
            margin: 1rem 0;
        }}
        li {{
            margin: 0.5rem 0;
        }}
        .notice {{ 
            background: #eff6ff; 
            border-left: 4px solid #3b82f6; 
            padding: 15px; 
            margin: 20px 0;
            border-radius: 4px;
        }}
        .notice strong {{
            color: #1e40af;
        }}
        a {{
            color: #3b82f6;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        footer {{
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }}
        footer a {{
            margin: 0 10px;
        }}
    </style>
</head>
<body>
    <div class="notice">
        <strong>⚡ Loading interactive version...</strong> If you're not redirected automatically, <a href="{clean_path}">click here</a>.
    </div>
    
    {meta.get('content', '')}
    
    <footer>
        <p>&copy; 2025 Syla Analytics. All rights reserved.</p>
        <p>
            <a href="/">Home</a> |
            <a href="/forecast">AI Forecasting</a> |
            <a href="/pricing">Pricing</a> |
            <a href="/help">Help</a> |
            <a href="/docs">Docs</a>
        </p>
    </footer>
</body>
</html>"""
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"SSR rendering failed for path '{path}': {e}")
        raise HTTPException(status_code=500, detail="SSR rendering failed")
