
# syla-backend/app/models/chart_settings.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.routers.db import Base

class ChartSettings(Base):
    __tablename__ = "chart_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    settings = Column(Text, nullable=False)  # JSON string of chart options
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, index=True)
    tags = Column(Text, nullable=True)  # JSON array of tags
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="chart_settings")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ChartSettings(id={self.id}, name='{self.name}', user_id={self.user_id})>"

class ChartTemplate(Base):
    """Predefined chart templates for common use cases"""
    __tablename__ = "chart_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(String(50), nullable=False, index=True)  # e.g., 'sales', 'marketing', 'finance'
    settings = Column(Text, nullable=False)  # JSON string of chart options
    description = Column(Text, nullable=True)
    preview_image = Column(String(255), nullable=True)  # URL to preview image
    is_featured = Column(Boolean, default=False, index=True)
    usage_count = Column(Integer, default=0)  # Track popularity
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ChartTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"
