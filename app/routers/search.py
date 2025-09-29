# app/routers/search.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
from app.routers.db import get_db
from app.models.user import User
from app.models.chart_settings import ChartSettings
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])

class SearchResult:
    def __init__(self, title: str, description: str, url: str, type: str, category: str = "general"):
        self.title = title
        self.description = description
        self.url = url
        self.type = type
        self.category = category

@router.get("/")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Universal search across charts, data, files, and help content
    """
    try:
        results = []
        query_lower = q.lower().strip()
        
        # Search in chart settings/presets
        chart_settings = db.query(ChartSettings).filter(
            ChartSettings.user_id == current_user.id
        ).all()
        
        for setting in chart_settings:
            # Search in chart names and descriptions
            if (query_lower in setting.name.lower() or 
                (setting.description and query_lower in setting.description.lower())):
                
                results.append({
                    "title": f"Chart Preset: {setting.name}",
                    "description": setting.description or "No description available",
                    "url": f"/editing?preset={setting.id}",
                    "type": "Chart Preset",
                    "category": "charts"
                })
        
        # Search in predefined help/feature content
        help_content = [
            {
                "title": "Upload Data Files",
                "description": "Upload CSV, Excel files for data visualization and analysis",
                "url": "/",
                "keywords": ["upload", "file", "csv", "excel", "data", "import"]
            },
            {
                "title": "Chart Editor",
                "description": "Advanced chart editing with customization options",
                "url": "/editing",
                "keywords": ["chart", "edit", "customize", "visualization", "graph"]
            },
            {
                "title": "AI Forecasting",
                "description": "Create predictive models and forecasts using AI",
                "url": "/forecast",
                "keywords": ["forecast", "ai", "prediction", "model", "future", "trend"]
            },
            {
                "title": "File Tools",
                "description": "Convert, clean, and process data files",
                "url": "/tools/convert",
                "keywords": ["convert", "clean", "process", "tools", "format"]
            },
            {
                "title": "Chart Settings",
                "description": "Save and manage chart presets and configurations",
                "url": "/settings",
                "keywords": ["settings", "preset", "configuration", "save", "manage"]
            },
            {
                "title": "User Profile",
                "description": "Manage your account settings and preferences",
                "url": "/profile",
                "keywords": ["profile", "account", "user", "preferences", "settings"]
            },
            {
                "title": "Notifications",
                "description": "View system notifications and activity updates",
                "url": "/notifications",
                "keywords": ["notifications", "alerts", "updates", "activity", "messages"]
            }
        ]
        
        for item in help_content:
            # Check if query matches title, description, or keywords
            if (query_lower in item["title"].lower() or 
                query_lower in item["description"].lower() or
                any(query_lower in keyword for keyword in item["keywords"])):
                
                results.append({
                    "title": item["title"],
                    "description": item["description"],
                    "url": item["url"],
                    "type": "Feature",
                    "category": "help"
                })
        
        # Search chart types and operations
        chart_operations = [
            {
                "title": "Bar Chart",
                "description": "Create bar charts for categorical data comparison",
                "url": "/editing?type=bar",
                "keywords": ["bar", "column", "categorical", "comparison"]
            },
            {
                "title": "Line Chart", 
                "description": "Visualize trends and time series data",
                "url": "/editing?type=line",
                "keywords": ["line", "trend", "time", "series", "continuous"]
            },
            {
                "title": "Pie Chart",
                "description": "Show proportions and percentages",
                "url": "/editing?type=pie",
                "keywords": ["pie", "proportion", "percentage", "parts", "whole"]
            },
            {
                "title": "Scatter Plot",
                "description": "Explore relationships between two variables",
                "url": "/editing?type=scatter",
                "keywords": ["scatter", "correlation", "relationship", "variables"]
            },
            {
                "title": "Area Chart",
                "description": "Display cumulative data over time",
                "url": "/editing?type=area",
                "keywords": ["area", "cumulative", "filled", "stacked"]
            }
        ]
        
        for chart_type in chart_operations:
            if (query_lower in chart_type["title"].lower() or 
                query_lower in chart_type["description"].lower() or
                any(query_lower in keyword for keyword in chart_type["keywords"])):
                
                results.append({
                    "title": chart_type["title"],
                    "description": chart_type["description"],
                    "url": chart_type["url"],
                    "type": "Chart Type",
                    "category": "visualization"
                })
        
        # Data analysis keywords
        analysis_keywords = {
            "filter": {
                "title": "Data Filtering",
                "description": "Filter and subset your data based on conditions",
                "url": "/editing",
                "type": "Data Operation"
            },
            "aggregate": {
                "title": "Data Aggregation", 
                "description": "Group and summarize data by categories",
                "url": "/editing",
                "type": "Data Operation"
            },
            "sort": {
                "title": "Data Sorting",
                "description": "Sort data in ascending or descending order",
                "url": "/editing", 
                "type": "Data Operation"
            },
            "export": {
                "title": "Export Data",
                "description": "Export charts and data in various formats",
                "url": "/editing",
                "type": "Export Operation"
            },
            "clean": {
                "title": "Data Cleaning",
                "description": "Clean and prepare your data for analysis",
                "url": "/tools/clean",
                "type": "Data Operation"
            }
        }
        
        for keyword, info in analysis_keywords.items():
            if query_lower in keyword or keyword in query_lower:
                results.append({
                    "title": info["title"],
                    "description": info["description"],
                    "url": info["url"],
                    "type": info["type"],
                    "category": "analysis"
                })
        
        # File format keywords
        if any(fmt in query_lower for fmt in ["csv", "excel", "xlsx", "json", "pdf"]):
            results.append({
                "title": "File Format Support",
                "description": "Syla supports CSV, Excel, JSON, and other data formats",
                "url": "/tools/convert",
                "type": "File Format",
                "category": "files"
            })
        
        # AI and machine learning keywords
        ai_keywords = ["ai", "machine learning", "ml", "prediction", "forecast", "model", "algorithm"]
        if any(keyword in query_lower for keyword in ai_keywords):
            results.append({
                "title": "AI & Machine Learning",
                "description": "Use AI-powered forecasting and predictive analytics",
                "url": "/forecast",
                "type": "AI Feature",
                "category": "ai"
            })
        
        # Limit results and remove duplicates based on URL
        seen_urls = set()
        unique_results = []
        for result in results:
            if result["url"] not in seen_urls:
                seen_urls.add(result["url"])
                unique_results.append(result)
                if len(unique_results) >= limit:
                    break
        
        return {
            "results": unique_results[:limit],
            "total": len(unique_results),
            "query": q
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(5, ge=1, le=10)
):
    """
    Get quick search suggestions as user types
    """
    try:
        query_lower = q.lower().strip()
        
        # Common search terms and suggestions
        suggestions = []
        
        common_terms = [
            "upload data",
            "create chart",
            "bar chart",
            "line chart",
            "pie chart",
            "scatter plot",
            "export chart",
            "ai forecast",
            "data cleaning",
            "convert file",
            "csv to excel",
            "filter data",
            "sort data",
            "aggregate data",
            "chart settings",
            "notifications",
            "profile settings"
        ]
        
        for term in common_terms:
            if query_lower in term or term.startswith(query_lower):
                suggestions.append(term)
                if len(suggestions) >= limit:
                    break
        
        return {
            "suggestions": suggestions,
            "query": q
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")


@router.get("/recent")
async def get_recent_searches(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's recent search queries (if we implement search history)
    """
    # This would require a search_history table in the database
    # For now, return empty list
    return {
        "recent_searches": [],
        "message": "Recent searches feature coming soon"
    }
