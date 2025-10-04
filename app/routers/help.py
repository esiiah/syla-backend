# app/routers/help.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from .auth import require_auth, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/help", tags=["help"])

# ==================== MODELS ====================

class FAQCategory(BaseModel):
    id: str
    title: str
    icon: str
    faqs: List[Dict[str, str]]

class FAQSearchRequest(BaseModel):
    query: str = Field(..., max_length=200)
    categories: Optional[List[str]] = None

class ContactSupportRequest(BaseModel):
    name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=200)
    subject: str = Field(..., max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)
    category: str = Field(default="general")

# ==================== FAQ DATA ====================

FAQ_CATEGORIES = [
    {
        "id": "getting-started",
        "title": "Getting Started",
        "icon": "zap",
        "faqs": [
            {
                "question": "How do I upload my first file?",
                "answer": "Click the upload area on the homepage, select your CSV or Excel file (max 10MB), and our system will automatically process it. You'll see a preview with column types and summary statistics within seconds.",
                "tags": ["upload", "file", "getting-started"]
            },
            {
                "question": "What file formats are supported?",
                "answer": "Syla supports CSV (.csv), Excel (.xlsx, .xls), and can also process PDF files for data extraction. For visualization features, CSV and Excel work best.",
                "tags": ["formats", "csv", "excel", "pdf"]
            },
            {
                "question": "Do I need to sign up to use Syla?",
                "answer": "You can explore file conversion tools without an account, but data visualization, AI forecasting, and chart editing require a free account. Sign up takes less than 30 seconds with email or Google.",
                "tags": ["signup", "account", "free"]
            },
            {
                "question": "Is my data secure?",
                "answer": "Yes. All files are encrypted in transit (HTTPS) and at rest. We never share your data with third parties. Files are automatically deleted after 30 days of inactivity. You can manually delete files anytime from your account.",
                "tags": ["security", "privacy", "encryption"]
            }
        ]
    },
    {
        "id": "data-visualization",
        "title": "Data Visualization",
        "icon": "bar-chart",
        "faqs": [
            {
                "question": "How do I create a chart?",
                "answer": "After uploading your file, select X-axis and Y-axis columns from the dropdown menus. Choose a chart type (bar, line, pie, scatter) from the chart options panel. Your visualization updates in real-time.",
                "tags": ["chart", "visualization", "graph"]
            },
            {
                "question": "Can I customize chart colors and styles?",
                "answer": "Yes! Click the settings icon in the chart panel to access color schemes, font sizes, grid options, and background colors. You can save custom themes for future use.",
                "tags": ["customization", "colors", "theme"]
            },
            {
                "question": "How do I export my chart?",
                "answer": "Go to the Editing page, click the export button, and choose your format: PNG (web), SVG (scalable), PDF (print), or CSV (data). You can also adjust DPI for high-resolution exports.",
                "tags": ["export", "download", "save"]
            },
            {
                "question": "What if my data has missing values?",
                "answer": "Syla automatically handles missing values by either removing rows with nulls or filling them with statistical defaults (mean/median). You can control this behavior in chart settings under 'Data Cleaning'.",
                "tags": ["missing-data", "null", "cleaning"]
            }
        ]
    },
    {
        "id": "ai-forecasting",
        "title": "AI Forecasting",
        "icon": "brain",
        "faqs": [
            {
                "question": "What is AI forecasting?",
                "answer": "Our AI forecasting uses advanced language models (GPT-4) and statistical models (Prophet) to predict future trends based on your historical data and business scenarios. Simply describe your scenario in plain English.",
                "tags": ["ai", "forecasting", "prediction"]
            },
            {
                "question": "How accurate are the forecasts?",
                "answer": "Forecast accuracy depends on data quality and quantity. With 12+ months of clean historical data, our hybrid model typically achieves 85-95% accuracy for short-term (3-6 month) predictions. Longer forecasts have wider confidence intervals.",
                "tags": ["accuracy", "forecast", "prediction"]
            },
            {
                "question": "What's a 'scenario' in forecasting?",
                "answer": "A scenario is a plain-English description of business conditions like 'increase marketing budget by 15% starting next month' or 'seasonal 20% sales boost during holidays'. The AI interprets this and adjusts forecasts accordingly.",
                "tags": ["scenario", "what-if", "business"]
            },
            {
                "question": "Can I forecast any type of data?",
                "answer": "Best results come from time-series data (sales over time, website traffic, inventory levels). You need at least 6 data points, though 12+ is recommended. The target column must be numeric.",
                "tags": ["data-requirements", "time-series"]
            },
            {
                "question": "What's the difference between Prophet and GPT models?",
                "answer": "Prophet is a statistical model great for seasonal patterns and holidays. GPT uses AI to understand business context and scenarios. Hybrid combines both for best accuracy. We recommend starting with Hybrid.",
                "tags": ["models", "prophet", "gpt", "hybrid"]
            }
        ]
    },
    {
        "id": "file-tools",
        "title": "File Tools",
        "icon": "file",
        "faqs": [
            {
                "question": "How do I convert PDF to Excel?",
                "answer": "Navigate to Tools → PDF to Excel, upload your PDF file, and click Convert. Our system extracts tables and converts them to Excel format. Works best with PDFs containing clear table structures.",
                "tags": ["pdf", "excel", "conversion"]
            },
            {
                "question": "Can I merge multiple PDFs?",
                "answer": "Yes! Go to Tools → Merge PDF, upload up to 15 PDF files, arrange them in your preferred order (drag-and-drop), and click Merge. The combined PDF downloads instantly.",
                "tags": ["merge", "pdf", "combine"]
            },
            {
                "question": "How does file compression work?",
                "answer": "We offer three compression levels: Light (10-30% reduction), Medium (30-50%), and Strong (50-70%). Higher compression may slightly reduce quality for images. PDFs and documents compress without quality loss.",
                "tags": ["compression", "reduce-size", "optimize"]
            },
            {
                "question": "Are converted files stored on your servers?",
                "answer": "Converted files are temporarily stored for 10 minutes for download, then automatically deleted. You can also manually delete files immediately after download from the Tools → Files page.",
                "tags": ["storage", "privacy", "retention"]
            }
        ]
    },
    {
        "id": "troubleshooting",
        "title": "Troubleshooting",
        "icon": "alert-circle",
        "faqs": [
            {
                "question": "My file upload failed. What should I do?",
                "answer": "Check: (1) File size under 10MB, (2) Supported format (CSV/Excel/PDF), (3) File isn't corrupted (try opening locally first), (4) Stable internet connection. Try clearing browser cache if issue persists.",
                "tags": ["upload-error", "troubleshooting", "fix"]
            },
            {
                "question": "Charts aren't displaying correctly",
                "answer": "Ensure your data has numeric columns for Y-axis. Try refreshing the page, selecting different columns, or using a different chart type. Contact support if specific chart types consistently fail.",
                "tags": ["chart-error", "display-issue"]
            },
            {
                "question": "AI forecast request failed",
                "answer": "Check: (1) Target column is numeric, (2) At least 6 data points exist, (3) You haven't exceeded monthly limit (50/month free tier), (4) Scenario text is under 500 characters. Try simplifying your scenario.",
                "tags": ["forecast-error", "ai-error"]
            },
            {
                "question": "I forgot my password",
                "answer": "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox. Check spam folder if not received within 5 minutes. Links expire after 1 hour.",
                "tags": ["password", "login", "reset"]
            },
            {
                "question": "How do I delete my account?",
                "answer": "Go to Settings → Account → Delete Account. This permanently removes all your data, files, and charts. This action cannot be undone. Export any data you want to keep first.",
                "tags": ["delete-account", "privacy", "data-removal"]
            }
        ]
    }
]

# ==================== FAQ ENDPOINTS ====================

@router.get("/faqs")
async def get_all_faqs():
    """Get all FAQ categories and questions"""
    return {
        "categories": FAQ_CATEGORIES,
        "total_faqs": sum(len(cat["faqs"]) for cat in FAQ_CATEGORIES),
        "last_updated": "2025-01-15"
    }

@router.get("/faqs/{category_id}")
async def get_faq_category(category_id: str):
    """Get FAQs for a specific category"""
    category = next((cat for cat in FAQ_CATEGORIES if cat["id"] == category_id), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.post("/faqs/search")
async def search_faqs(request: FAQSearchRequest):
    """Search FAQs by query"""
    query = request.query.lower()
    results = []
    
    for category in FAQ_CATEGORIES:
        if request.categories and category["id"] not in request.categories:
            continue
            
        for faq in category["faqs"]:
            score = 0
            if query in faq["question"].lower():
                score += 3
            if query in faq["answer"].lower():
                score += 1
            if any(query in tag for tag in faq.get("tags", [])):
                score += 2
                
            if score > 0:
                results.append({
                    "category_id": category["id"],
                    "category_title": category["title"],
                    "faq": faq,
                    "relevance_score": score
                })
    
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    return {
        "query": request.query,
        "results": results,
        "total_results": len(results)
    }

@router.post("/contact")
async def contact_support(request: ContactSupportRequest):
    """Submit a support request"""
    logger.info(f"Support request from {request.email}: {request.subject}")
    
    # TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    # For now, just log and return success
    
    ticket_id = f"SUPPORT-{datetime.now().strftime('%Y%m%d')}-{hash(request.email) % 10000:04d}"
    
    return {
        "success": True,
        "message": "Your support request has been received. We'll respond within 24 hours.",
        "ticket_id": ticket_id,
        "estimated_response_time": "24 hours"
    }

# ==================== DOCUMENTATION ENDPOINTS ====================

@router.get("/docs/sections")
async def get_doc_sections():
    """Get available documentation sections"""
    sections = [
        {"id": "overview", "label": "Overview", "icon": "book"},
        {"id": "quickstart", "label": "Quick Start", "icon": "zap"},
        {"id": "api", "label": "API Reference", "icon": "code"},
        {"id": "data-viz", "label": "Data Visualization", "icon": "database"},
        {"id": "ai-forecast", "label": "AI Forecasting", "icon": "terminal"},
        {"id": "file-tools", "label": "File Tools", "icon": "file-text"},
        {"id": "advanced", "label": "Advanced", "icon": "settings"}
    ]
    
    return {
        "sections": sections,
        "base_url": "/docs",
        "api_docs_url": "/api/docs"
    }

@router.get("/docs/search")
async def search_documentation(q: str):
    """Search documentation (basic keyword matching)"""
    query = q.lower()
    results = []
    
    # Simple keyword matching - expand this with real search later
    keyword_map = {
        "upload": {"section": "quickstart", "title": "Upload Your First File", "excerpt": "Upload a CSV or Excel file from the homepage..."},
        "file": {"section": "quickstart", "title": "Upload Your First File", "excerpt": "Upload a CSV or Excel file from the homepage..."},
        "forecast": {"section": "ai-forecast", "title": "AI Forecasting Guide", "excerpt": "Generate AI-powered forecasts from natural language scenarios..."},
        "ai": {"section": "ai-forecast", "title": "AI Forecasting Guide", "excerpt": "Generate AI-powered forecasts from natural language scenarios..."},
        "api": {"section": "api", "title": "API Reference", "excerpt": "Complete API documentation with examples..."},
        "chart": {"section": "data-viz", "title": "Data Visualization Guide", "excerpt": "Create beautiful charts and visualizations..."},
        "convert": {"section": "file-tools", "title": "File Tools", "excerpt": "Convert between PDF, Excel, CSV, and more..."}
    }
    
    for keyword, data in keyword_map.items():
        if keyword in query:
            results.append({
                "section": data["section"],
                "title": data["title"],
                "excerpt": data["excerpt"],
                "url": f"/docs#{data['section']}"
            })
    
    return {
        "query": q,
        "results": results,
        "total": len(results)
    }

@router.get("/health")
async def help_health_check():
    """Health check for help endpoints"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "help"
    }
