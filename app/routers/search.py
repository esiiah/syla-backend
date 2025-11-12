# app/routers/search.py (SIMPLIFIED - Optional for user content only)
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.routers.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
import logging

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)

@router.get("/saved-charts")
async def search_saved_charts(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search user's saved chart presets only
    Frontend handles all navigation/feature search
    """
    try:
        # Try to import ChartSettings, but handle if it doesn't exist
        try:
            from app.models.chart_settings import ChartSettings
        except ImportError:
            logger.warning("ChartSettings model not found, returning empty results")
            return {
                "results": [],
                "total": 0,
                "query": q
            }
        
        query_lower = q.lower().strip()
        results = []
        
        # Search only user's chart settings
        chart_settings = db.query(ChartSettings).filter(
            ChartSettings.user_id == current_user.id
        ).all()
        
        for setting in chart_settings:
            if (query_lower in setting.name.lower() or 
                (setting.description and query_lower in setting.description.lower())):
                
                results.append({
                    "id": setting.id,
                    "title": f"Chart: {setting.name}",
                    "description": setting.description or "No description",
                    "url": f"/editing?preset={setting.id}",
                    "type": "Saved Chart",
                    "category": "user_content"
                })
        
        return {
            "results": results[:limit],
            "total": len(results),
            "query": q
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        # Return empty results instead of crashing
        return {
            "results": [],
            "total": 0,
            "query": q,
            "error": "Search temporarily unavailable"
        }

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(5, ge=1, le=10)
):
    """
    Quick autocomplete suggestions - static list
    """
    query_lower = q.lower().strip()
    
    suggestions = [
        "upload data",
        "create chart",
        "bar chart",
        "line chart",
        "pie chart",
        "ai forecast",
        "convert csv to excel",
        "compress pdf",
        "merge pdf",
        "export chart",
        "chart settings",
        "help center",
        "pricing plans",
        "pdf to word",
        "excel to pdf",
        "word to pdf"
    ]
    
    matches = [s for s in suggestions if query_lower in s]
    
    return {
        "suggestions": matches[:limit],
        "query": q
    }
    