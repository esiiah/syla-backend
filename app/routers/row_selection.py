# app/routers/row_selection.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.routers.db import get_db
from app.models.chart_row_selection import ChartRowSelection
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter()

# Pydantic schemas
class RowSelectionCreate(BaseModel):
    selected_row_indices: List[int] = Field(..., description="Array of selected row indices")
    selection_mode: str = Field(default="custom", description="Selection mode: auto, custom, top_n, bottom_n")
    sort_column: Optional[str] = Field(None, description="Column used for sorting")
    sort_direction: str = Field(default="asc", description="Sort direction: asc or desc")

class RowSelectionResponse(BaseModel):
    id: int
    chart_id: str
    user_id: int
    selected_row_indices: List[int]
    selection_mode: str
    sort_column: Optional[str]
    sort_direction: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.post("/charts/{chart_id}/row-selection", response_model=RowSelectionResponse)
async def save_row_selection(
    chart_id: str,
    selection_data: RowSelectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save or update row selection for a chart"""
    try:
        # Check if selection already exists
        existing = db.query(ChartRowSelection).filter(
            ChartRowSelection.chart_id == chart_id,
            ChartRowSelection.user_id == current_user.id
        ).first()
        
        if existing:
            # Update existing
            existing.selected_row_indices = selection_data.selected_row_indices
            existing.selection_mode = selection_data.selection_mode
            existing.sort_column = selection_data.sort_column
            existing.sort_direction = selection_data.sort_direction
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new
            new_selection = ChartRowSelection(
                chart_id=chart_id,
                user_id=current_user.id,
                selected_row_indices=selection_data.selected_row_indices,
                selection_mode=selection_data.selection_mode,
                sort_column=selection_data.sort_column,
                sort_direction=selection_data.sort_direction
            )
            db.add(new_selection)
            db.commit()
            db.refresh(new_selection)
            return new_selection
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save row selection: {str(e)}"
        )

@router.get("/charts/{chart_id}/row-selection", response_model=RowSelectionResponse)
async def get_row_selection(
    chart_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve saved row selection for a chart"""
    selection = db.query(ChartRowSelection).filter(
        ChartRowSelection.chart_id == chart_id,
        ChartRowSelection.user_id == current_user.id
    ).first()
    
    if not selection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No row selection found for this chart"
        )
    
    return selection

@router.delete("/charts/{chart_id}/row-selection")
async def delete_row_selection(
    chart_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset row selection to default"""
    selection = db.query(ChartRowSelection).filter(
        ChartRowSelection.chart_id == chart_id,
        ChartRowSelection.user_id == current_user.id
    ).first()
    
    if not selection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No row selection found for this chart"
        )
    
    try:
        db.delete(selection)
        db.commit()
        return {"message": "Row selection reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete row selection: {str(e)}"
        )
