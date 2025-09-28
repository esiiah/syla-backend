# syla-backend/app/routers/chart_settings.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import json
from datetime import datetime

from .db import get_db
from app.models.user import User
from app.models.chart_settings import ChartSettings
from .auth import get_current_user

router = APIRouter(prefix="/api/chart-settings", tags=["Chart Settings"])

class ChartSettingsCreate(BaseModel):
    name: str = Field(..., max_length=100)
    settings: Dict[str, Any]
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = False
    tags: List[str] = Field(default_factory=list, max_items=10)

class ChartSettingsUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    settings: Optional[Dict[str, Any]] = None
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = Field(None, max_items=10)

class ChartSettingsResponse(BaseModel):
    id: int
    name: str
    settings: Dict[str, Any]
    description: Optional[str]
    is_public: bool
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    owner_name: Optional[str] = None

@router.post("/", response_model=ChartSettingsResponse)
async def create_chart_settings(
    settings_data: ChartSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chart settings preset"""
    try:
        # Validate settings structure
        required_keys = ["type", "color", "gradient", "showLabels", "sort"]
        if not all(key in settings_data.settings for key in required_keys):
            raise HTTPException(
                status_code=400,
                detail="Settings must contain required keys: type, color, gradient, showLabels, sort"
            )

        # Check if user already has a preset with this name
        existing = db.query(ChartSettings).filter(
            ChartSettings.user_id == current_user.id,
            ChartSettings.name == settings_data.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A preset with this name already exists"
            )

        # Create new settings
        chart_settings = ChartSettings(
            name=settings_data.name,
            settings=json.dumps(settings_data.settings),
            description=settings_data.description,
            is_public=settings_data.is_public,
            tags=json.dumps(settings_data.tags),
            user_id=current_user.id
        )
        
        db.add(chart_settings)
        db.commit()
        db.refresh(chart_settings)
        
        return ChartSettingsResponse(
            id=chart_settings.id,
            name=chart_settings.name,
            settings=json.loads(chart_settings.settings),
            description=chart_settings.description,
            is_public=chart_settings.is_public,
            tags=json.loads(chart_settings.tags) if chart_settings.tags else [],
            created_at=chart_settings.created_at,
            updated_at=chart_settings.updated_at,
            owner_name=current_user.name
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ChartSettingsResponse])
async def get_user_chart_settings(
    include_public: bool = False,
    tag_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's chart settings presets"""
    try:
        query = db.query(ChartSettings).filter(ChartSettings.user_id == current_user.id)
        
        if include_public:
            public_query = db.query(ChartSettings).filter(ChartSettings.is_public == True)
            # Union the queries
            query = query.union(public_query)
        
        settings_list = query.all()
        
        # Filter by tag if provided
        if tag_filter:
            filtered_settings = []
            for setting in settings_list:
                tags = json.loads(setting.tags) if setting.tags else []
                if tag_filter.lower() in [tag.lower() for tag in tags]:
                    filtered_settings.append(setting)
            settings_list = filtered_settings
        
        return [
            ChartSettingsResponse(
                id=setting.id,
                name=setting.name,
                settings=json.loads(setting.settings),
                description=setting.description,
                is_public=setting.is_public,
                tags=json.loads(setting.tags) if setting.tags else [],
                created_at=setting.created_at,
                updated_at=setting.updated_at,
                owner_name=current_user.name if setting.user_id == current_user.id else "Public"
            )
            for setting in settings_list
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{settings_id}", response_model=ChartSettingsResponse)
async def get_chart_settings(
    settings_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chart settings preset"""
    try:
        setting = db.query(ChartSettings).filter(ChartSettings.id == settings_id).first()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        # Check if user has access (owner or public)
        if setting.user_id != current_user.id and not setting.is_public:
            raise HTTPException(status_code=403, detail="Access denied")
        
        owner = db.query(User).filter(User.id == setting.user_id).first()
        
        return ChartSettingsResponse(
            id=setting.id,
            name=setting.name,
            settings=json.loads(setting.settings),
            description=setting.description,
            is_public=setting.is_public,
            tags=json.loads(setting.tags) if setting.tags else [],
            created_at=setting.created_at,
            updated_at=setting.updated_at,
            owner_name=owner.name if owner else "Unknown"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{settings_id}", response_model=ChartSettingsResponse)
async def update_chart_settings(
    settings_id: int,
    settings_update: ChartSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chart settings preset"""
    try:
        setting = db.query(ChartSettings).filter(ChartSettings.id == settings_id).first()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        # Check ownership
        if setting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only edit your own settings")
        
        # Update fields
        update_data = settings_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "settings":
                setattr(setting, field, json.dumps(value))
            elif field == "tags":
                setattr(setting, field, json.dumps(value))
            else:
                setattr(setting, field, value)
        
        setting.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(setting)
        
        return ChartSettingsResponse(
            id=setting.id,
            name=setting.name,
            settings=json.loads(setting.settings),
            description=setting.description,
            is_public=setting.is_public,
            tags=json.loads(setting.tags) if setting.tags else [],
            created_at=setting.created_at,
            updated_at=setting.updated_at,
            owner_name=current_user.name
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{settings_id}")
async def delete_chart_settings(
    settings_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chart settings preset"""
    try:
        setting = db.query(ChartSettings).filter(ChartSettings.id == settings_id).first()
        
        if not setting:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        # Check ownership
        if setting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete your own settings")
        
        db.delete(setting)
        db.commit()
        
        return {"message": "Settings deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{settings_id}/clone", response_model=ChartSettingsResponse)
async def clone_chart_settings(
    settings_id: int,
    new_name: str = Field(..., max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clone a chart settings preset (useful for public presets)"""
    try:
        original_setting = db.query(ChartSettings).filter(ChartSettings.id == settings_id).first()
        
        if not original_setting:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        # Check access
        if original_setting.user_id != current_user.id and not original_setting.is_public:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if user already has a preset with the new name
        existing = db.query(ChartSettings).filter(
            ChartSettings.user_id == current_user.id,
            ChartSettings.name == new_name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A preset with this name already exists"
            )
        
        # Create clone
        cloned_setting = ChartSettings(
            name=new_name,
            settings=original_setting.settings,
            description=f"Cloned from {original_setting.name}",
            is_public=False,  # Clones are private by default
            tags=original_setting.tags,
            user_id=current_user.id
        )
        
        db.add(cloned_setting)
        db.commit()
        db.refresh(cloned_setting)
        
        return ChartSettingsResponse(
            id=cloned_setting.id,
            name=cloned_setting.name,
            settings=json.loads(cloned_setting.settings),
            description=cloned_setting.description,
            is_public=cloned_setting.is_public,
            tags=json.loads(cloned_setting.tags) if cloned_setting.tags else [],
            created_at=cloned_setting.created_at,
            updated_at=cloned_setting.updated_at,
            owner_name=current_user.name
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/public/featured", response_model=List[ChartSettingsResponse])
async def get_featured_public_settings(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get featured public chart settings (no auth required)"""
    try:
        settings_list = db.query(ChartSettings).filter(
            ChartSettings.is_public == True
        ).limit(limit).all()
        
        result = []
        for setting in settings_list:
            owner = db.query(User).filter(User.id == setting.user_id).first()
            result.append(
                ChartSettingsResponse(
                    id=setting.id,
                    name=setting.name,
                    settings=json.loads(setting.settings),
                    description=setting.description,
                    is_public=setting.is_public,
                    tags=json.loads(setting.tags) if setting.tags else [],
                    created_at=setting.created_at,
                    updated_at=setting.updated_at,
                    owner_name=owner.name if owner else "Unknown"
                )
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
