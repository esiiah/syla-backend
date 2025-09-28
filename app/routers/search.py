# app/routers/search.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, or_, and_, func
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel
from datetime import datetime
import re
from app.routers.db import get_db
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])

# Search result models
class SearchResultBase(BaseModel):
    id: Union[int, str]
    type: str  # "chart", "file", "tool", "forecast", "notification", "report"
    title: str
    description: str
    url: str
    relevance_score: float
    created_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultBase]
    total_results: int
    search_time_ms: int
    suggestions: List[str] = []
    filters_applied: Dict[str, Any] = {}

class SearchFilters(BaseModel):
    types: Optional[List[str]] = None  # Filter by result types
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    user_only: bool = True  # Only search user's own content

# Search categories and their searchable fields
SEARCH_CATEGORIES = {
    "charts": {
        "table": "chart_settings",  # Assuming you have this table
        "fields": ["title", "description", "chart_type"],
        "route_template": "/charts/{id}",
        "icon": "BarChart"
    },
    "files": {
        "table": "user_files",  # Assuming you track uploaded files
        "fields": ["filename", "original_name", "file_type"],
        "route_template": "/files/{id}",
        "icon": "FileText"
    },
    "tools": {
        "static": True,  # Static content, not from database
        "items": [
            {
                "id": "pdf-to-word",
                "title": "PDF to Word Converter",
                "description": "Convert PDF documents to editable Word files",
                "url": "/tools/pdf-to-word",
                "keywords": ["pdf", "word", "doc", "docx", "convert", "document"]
            },
            {
                "id": "pdf-to-excel",
                "title": "PDF to Excel Converter", 
                "description": "Extract data from PDF files into Excel spreadsheets",
                "url": "/tools/pdf-to-excel",
                "keywords": ["pdf", "excel", "xls", "xlsx", "data", "extract", "spreadsheet"]
            },
            {
                "id": "merge-pdf",
                "title": "PDF Merger",
                "description": "Combine multiple PDF files into a single document",
                "url": "/tools/merge",
                "keywords": ["pdf", "merge", "combine", "join", "multiple"]
            },
            {
                "id": "compress-pdf",
                "title": "PDF Compressor",
                "description": "Reduce PDF file size while maintaining quality",
                "url": "/tools/compress",
                "keywords": ["pdf", "compress", "reduce", "size", "optimize"]
            },
            {
                "id": "csv-to-excel",
                "title": "CSV to Excel Converter",
                "description": "Convert CSV files to Excel format",
                "url": "/tools/csv-to-excel", 
                "keywords": ["csv", "excel", "convert", "spreadsheet", "data"]
            },
            {
                "id": "excel-to-csv",
                "title": "Excel to CSV Converter",
                "description": "Convert Excel files to CSV format",
                "url": "/tools/excel-to-csv",
                "keywords": ["excel", "csv", "convert", "data", "export"]
            },
            {
                "id": "csv-to-pdf",
                "title": "CSV to PDF Converter",
                "description": "Create PDF reports from CSV data",
                "url": "/tools/csv-to-pdf",
                "keywords": ["csv", "pdf", "report", "convert", "data"]
            },
            {
                "id": "excel-to-pdf", 
                "title": "Excel to PDF Converter",
                "description": "Convert Excel spreadsheets to PDF format",
                "url": "/tools/excel-to-pdf",
                "keywords": ["excel", "pdf", "convert", "spreadsheet", "report"]
            },
            {
                "id": "pdf-to-csv",
                "title": "PDF to CSV Converter",
                "description": "Extract tabular data from PDF to CSV format",
                "url": "/tools/pdf-to-csv",
                "keywords": ["pdf", "csv", "extract", "data", "table"]
            }
        ]
    },
    "forecasts": {
        "table": "forecasts",  # Assuming you have forecasting data
        "fields": ["name", "description", "model_type"],
        "route_template": "/forecast/{id}",
        "icon": "TrendingUp"
    },
    "notifications": {
        "table": "notifications",
        "fields": ["title", "message", "category"],
        "route_template": "/notifications",
        "icon": "Bell"
    },
    "pages": {
        "static": True,
        "items": [
            {
                "id": "dashboard",
                "title": "Dashboard",
                "description": "Main analytics dashboard with data visualization",
                "url": "/",
                "keywords": ["dashboard", "home", "overview", "main", "analytics", "data"]
            },
            {
                "id": "profile",
                "title": "Profile Settings",
                "description": "Manage your profile information and preferences", 
                "url": "/profile",
                "keywords": ["profile", "settings", "account", "user", "personal"]
            },
            {
                "id": "settings",
                "title": "Application Settings",
                "description": "Configure app preferences and account settings",
                "url": "/settings", 
                "keywords": ["settings", "preferences", "config", "account", "options"]
            },
            {
                "id": "ai-forecast",
                "title": "AI Forecasting",
                "description": "Predict trends and generate forecasts using AI",
                "url": "/forecast",
                "keywords": ["ai", "forecast", "predict", "trends", "machine learning", "analysis"]
            },
            {
                "id": "notifications",
                "title": "Notifications",
                "description": "View and manage your notifications and alerts",
                "url": "/notifications",
                "keywords": ["notifications", "alerts", "messages", "updates"]
            }
        ]
    }
}

def calculate_relevance_score(query: str, title: str, description: str, keywords: List[str] = None) -> float:
    """Calculate relevance score based on query match"""
    query_lower = query.lower()
    title_lower = title.lower()
    description_lower = description.lower()
    
    score = 0.0
    
    # Exact title match gets highest score
    if query_lower == title_lower:
        score += 100
    elif query_lower in title_lower:
        score += 75
    elif any(word in title_lower for word in query_lower.split()):
        score += 50
    
    # Description matches
    if query_lower in description_lower:
        score += 30
    elif any(word in description_lower for word in query_lower.split()):
        score += 15
    
    # Keywords match
    if keywords:
        keyword_matches = sum(1 for keyword in keywords if query_lower in keyword.lower())
        score += keyword_matches * 10
        
        # Partial keyword matches
        for word in query_lower.split():
            partial_matches = sum(1 for keyword in keywords if word in keyword.lower())
            score += partial_matches * 5
    
    # Boost score for shorter titles (more specific matches)
    if len(title) < 50 and score > 0:
        score *= 1.2
    
    return round(score, 2)

def search_static_items(query: str, category: str, items: List[Dict]) -> List[SearchResultBase]:
    """Search through static items like tools and pages"""
    results = []
    
    for item in items:
        keywords = item.get("keywords", [])
        relevance = calculate_relevance_score(
            query=query,
            title=item["title"],
            description=item["description"],
            keywords=keywords
        )
        
        if relevance > 0:
            results.append(SearchResultBase(
                id=item["id"],
                type=category,
                title=item["title"],
                description=item["description"],
                url=item["url"],
                relevance_score=relevance,
                metadata={
                    "keywords": keywords,
                    "category": category
                }
            ))
    
    return results

def search_database_content(
    db: Session, 
    query: str, 
    category: str, 
    config: Dict,
    user_id: int,
    filters: SearchFilters
) -> List[SearchResultBase]:
    """Search through database content"""
    results = []
    table_name = config["table"]
    fields = config["fields"]
    route_template = config["route_template"]
    
    try:
        # Build search conditions
        search_conditions = []
        for field in fields:
            search_conditions.append(f"{field} ILIKE '%{query}%'")
        
        search_where = " OR ".join(search_conditions)
        
        # Base query
        sql_query = f"""
            SELECT id, {', '.join(fields)}, created_at
            FROM {table_name}
            WHERE ({search_where})
        """
        
        # Add user filter if applicable
        if filters.user_only and table_name != "chart_settings":  # Adjust based on your schema
            sql_query += f" AND user_id = {user_id}"
        
        # Add date filters
        if filters.date_from:
            sql_query += f" AND created_at >= '{filters.date_from}'"
        if filters.date_to:
            sql_query += f" AND created_at <= '{filters.date_to}'"
        
        sql_query += " ORDER BY created_at DESC LIMIT 50"
        
        # Execute query
        result = db.execute(sql_query)
        rows = result.fetchall()
        
        for row in rows:
            # Calculate relevance based on available fields
            title = str(row[1]) if len(row) > 1 else f"{category} {row[0]}"
            description = str(row[2]) if len(row) > 2 else f"{category} item"
            
            relevance = calculate_relevance_score(query, title, description)
            
            if relevance > 0:
                url = route_template.format(id=row[0])
                
                results.append(SearchResultBase(
                    id=row[0],
                    type=category,
                    title=title,
                    description=description,
                    url=url,
                    relevance_score=relevance,
                    created_at=row[-1] if len(row) > 3 else None,
                    metadata={"category": category}
                ))
    
    except Exception as e:
        print(f"Error searching {table_name}: {e}")
        # Continue with other categories even if one fails
    
    return results

def generate_search_suggestions(query: str) -> List[str]:
    """Generate search suggestions based on query"""
    suggestions = []
    
    # Common search terms and their suggestions
    suggestion_map = {
        "pdf": ["PDF to Word", "PDF to Excel", "PDF Merger", "PDF Compressor"],
        "excel": ["Excel to PDF", "Excel to CSV", "CSV to Excel"],
        "csv": ["CSV to Excel", "CSV to PDF", "PDF to CSV"],
        "chart": ["Bar Chart", "Line Chart", "Pie Chart", "Data Visualization"],
        "data": ["Data Analysis", "Data Export", "Data Visualization", "Data Cleaning"],
        "forecast": ["AI Forecasting", "Trend Analysis", "Predictive Analytics"],
        "convert": ["File Conversion", "PDF Converter", "Excel Converter"],
        "merge": ["PDF Merger", "Combine Files"],
        "compress": ["File Compression", "PDF Compressor", "Optimize Files"]
    }
    
    query_lower = query.lower()
    
    # Find suggestions based on partial matches
    for key, values in suggestion_map.items():
        if key in query_lower or any(word in key for word in query_lower.split()):
            suggestions.extend(values)
    
    # Remove duplicates and limit
    suggestions = list(set(suggestions))[:5]
    
    return suggestions

@router.get("/", response_model=SearchResponse)
async def search_app_content(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    types: Optional[List[str]] = Query(None, description="Filter by content types"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return"),
    include_suggestions: bool = Query(True, description="Include search suggestions"),
    date_from: Optional[datetime] = Query(None, description="Filter results from date"),
    date_to: Optional[datetime] = Query(None, description="Filter results to date"),
    user_only: bool = Query(True, description="Search only user's content"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search across all app content including charts, files, tools, pages, and more
    """
    start_time = datetime.now()
    
    # Clean and validate query
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    # Setup filters
    filters = SearchFilters(
        types=types,
        date_from=date_from,
        date_to=date_to,
        user_only=user_only
    )
    
    all_results = []
    
    # Search through each category
    for category, config in SEARCH_CATEGORIES.items():
        # Skip categories not in type filter
        if filters.types and category not in filters.types:
            continue
        
        if config.get("static", False):
            # Search static content
            results = search_static_items(query, category, config["items"])
        else:
            # Search database content
            results = search_database_content(db, query, category, config, current_user.id, filters)
        
        all_results.extend(results)
    
    # Sort all results by relevance score
    all_results.sort(key=lambda x: x.relevance_score, reverse=True)
    
    # Limit results
    limited_results = all_results[:limit]
    
    # Generate suggestions
    suggestions = []
    if include_suggestions:
        suggestions = generate_search_suggestions(query)
    
    # Calculate search time
    end_time = datetime.now()
    search_time_ms = int((end_time - start_time).total_seconds() * 1000)
    
    # Prepare filters applied info
    filters_applied = {
        "types": filters.types,
        "date_from": filters.date_from,
        "date_to": filters.date_to,
        "user_only": filters.user_only
    }
    
    return SearchResponse(
        query=query,
        results=limited_results,
        total_results=len(all_results),
        search_time_ms=search_time_ms,
        suggestions=suggestions,
        filters_applied=filters_applied
    )

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query("", description="Partial query for suggestions"),
    limit: int = Query(5, ge=1, le=10)
):
    """Get search suggestions based on partial query"""
    if not q.strip():
        # Return popular search terms when no query
        return {
            "suggestions": [
                "PDF converter",
                "Excel to CSV", 
                "Data visualization",
                "AI forecasting",
                "File compression",
                "Chart analysis"
            ][:limit]
        }
    
    suggestions = generate_search_suggestions(q)
    return {"suggestions": suggestions[:limit]}

@router.get("/popular")
async def get_popular_searches():
    """Get popular/trending search terms"""
    # This could be enhanced with actual usage tracking
    popular_searches = [
        {
            "query": "PDF to Word",
            "category": "tools",
            "description": "Convert PDF documents to editable Word files"
        },
        {
            "query": "Data visualization", 
            "category": "charts",
            "description": "Create charts and graphs from your data"
        },
        {
            "query": "AI forecasting",
            "category": "forecast", 
            "description": "Predict future trends with machine learning"
        },
        {
            "query": "Excel converter",
            "category": "tools",
            "description": "Convert Excel files to various formats"
        },
        {
            "query": "PDF merger",
            "category": "tools",
            "description": "Combine multiple PDF files into one"
        },
        {
            "query": "Settings",
            "category": "pages",
            "description": "Manage your account and app preferences"
        }
    ]
    
    return {"popular_searches": popular_searches}

@router.get("/categories")
async def get_search_categories():
    """Get available search categories and their descriptions"""
    categories = []
    
    for category, config in SEARCH_CATEGORIES.items():
        icon = config.get("icon", "Search")
        
        if config.get("static", False):
            count = len(config["items"])
        else:
            count = "Dynamic"  # Could query actual counts from database
        
        categories.append({
            "id": category,
            "name": category.title(),
            "icon": icon,
            "count": count,
            "description": f"Search through {category}"
        })
    
    return {"categories": categories}

# Quick search endpoint for navbar autocomplete
@router.get("/quick")
async def quick_search(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(8, ge=1, le=15),
    current_user: User = Depends(get_current_user)
):
    """
    Quick search for navbar autocomplete - returns minimal data for fast response
    """
    query = q.strip().lower()
    
    quick_results = []
    
    # Search tools first (most commonly searched)
    tool_items = SEARCH_CATEGORIES["tools"]["items"]
    for tool in tool_items:
        if any(query in keyword.lower() for keyword in tool.get("keywords", [])) or \
           query in tool["title"].lower():
            quick_results.append({
                "id": tool["id"],
                "title": tool["title"],
                "type": "tool",
                "url": tool["url"],
                "icon": "Tool"
            })
    
    # Search pages
    page_items = SEARCH_CATEGORIES["pages"]["items"] 
    for page in page_items:
        if query in page["title"].lower() or \
           any(query in keyword.lower() for keyword in page.get("keywords", [])):
            quick_results.append({
                "id": page["id"],
                "title": page["title"],
                "type": "page",
                "url": page["url"],
                "icon": "FileText"
            })
    
    # Limit and return
    return {
        "query": q,
        "results": quick_results[:limit],
        "has_more": len(quick_results) > limit
    }

# Advanced search with more complex filtering
@router.post("/advanced")
async def advanced_search(
    search_request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advanced search with complex filters and sorting options
    """
    query = search_request.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Extract advanced filters
    filters = SearchFilters(
        types=search_request.get("types"),
        date_from=search_request.get("date_from"),
        date_to=search_request.get("date_to"),
        user_only=search_request.get("user_only", True)
    )
    
    # Additional advanced options
    sort_by = search_request.get("sort_by", "relevance")  # relevance, date, title
    sort_order = search_request.get("sort_order", "desc")
    exclude_types = search_request.get("exclude_types", [])
    min_relevance = search_request.get("min_relevance", 0.0)
    
    all_results = []
    
    # Perform search across all categories
    for category, config in SEARCH_CATEGORIES.items():
        if filters.types and category not in filters.types:
            continue
        if category in exclude_types:
            continue
            
        if config.get("static", False):
            results = search_static_items(query, category, config["items"])
        else:
            results = search_database_content(db, query, category, config, current_user.id, filters)
        
        # Filter by minimum relevance
        results = [r for r in results if r.relevance_score >= min_relevance]
        all_results.extend(results)
    
    # Apply sorting
    if sort_by == "relevance":
        all_results.sort(key=lambda x: x.relevance_score, reverse=(sort_order == "desc"))
    elif sort_by == "date":
        all_results.sort(key=lambda x: x.created_at or datetime.min, reverse=(sort_order == "desc"))
    elif sort_by == "title":
        all_results.sort(key=lambda x: x.title.lower(), reverse=(sort_order == "desc"))
    
    return {
        "query": query,
        "results": all_results,
        "total_results": len(all_results),
        "filters_applied": {
            "types": filters.types,
            "exclude_types": exclude_types,
            "date_range": [filters.date_from, filters.date_to],
            "min_relevance": min_relevance,
            "sort_by": sort_by,
            "sort_order": sort_order
        }
    }

# Helper function to create search index (for future implementation)
async def create_search_index(db: Session):
    """
    Create/update search index for better performance
    This is a placeholder for future full-text search implementation
    """
    # Could implement Elasticsearch, PostgreSQL full-text search, etc.
    pass

# Endpoint for search analytics (track what users search for)
@router.post("/analytics")
async def log_search_analytics(
    search_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log search analytics for improving search functionality
    """
    try:
        # This would typically log to an analytics table
        # For now, just return success
        return {"status": "logged", "timestamp": datetime.utcnow()}
    except Exception as e:
        # Don't fail the search if analytics logging fails
        print(f"Search analytics logging failed: {e}")
        return {"status": "failed", "timestamp": datetime.utcnow()}
