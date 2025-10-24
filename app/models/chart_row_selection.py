# app/models/chart_row_selection.py
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.routers.db import Base

class ChartRowSelection(Base):
    __tablename__ = "chart_row_selections"
    
    id = Column(Integer, primary_key=True, index=True)
    chart_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    selected_row_indices = Column(JSON, nullable=False, default=[])
    selection_mode = Column(String, default="auto")  # "auto", "custom", "top_n", "bottom_n"
    sort_column = Column(String, nullable=True)
    sort_direction = Column(String, default="asc")  # "asc" or "desc"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="row_selections")
