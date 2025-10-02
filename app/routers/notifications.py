
# app/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, desc, asc, and_, or_
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import enum
from pydantic import BaseModel
from app.routers.db import get_db
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# SQLAlchemy Models
Base = declarative_base()

class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class NotificationCategory(str, enum.Enum):
    PROCESSING = "processing"
    EXPORT = "export"
    UPLOAD = "upload"
    REPORT = "report"
    SECURITY = "security"
    SYSTEM = "system"
    FORECAST = "forecast"
    CHART = "chart"

# In app/routers/notifications.py, line ~37
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.INFO)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(Enum(NotificationCategory), default=NotificationCategory.SYSTEM)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    read = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)
    action_url = Column(String(512), nullable=True)
    # FIX: Change this line
    meta_info = Column(Text, nullable=True)  # Changed from meta_info with name="metadata"
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)

# Pydantic Models
class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    category: NotificationCategory = NotificationCategory.SYSTEM
    priority: NotificationPriority = NotificationPriority.MEDIUM
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    read: Optional[bool] = None
    archived: Optional[bool] = None

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    read: bool
    archived: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationStats(BaseModel):
    total: int
    unread: int
    read: int
    archived: int
    by_type: Dict[str, int]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]

class BulkActionRequest(BaseModel):
    notification_ids: List[int]
    action: str  # "read", "unread", "archive", "unarchive", "delete"

class NotificationFilters(BaseModel):
    type: Optional[NotificationType] = None
    category: Optional[NotificationCategory] = None
    priority: Optional[NotificationPriority] = None
    read: Optional[bool] = None
    archived: Optional[bool] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# In app/routers/notifications.py, around line ~95
def create_notification_for_user(
    db: Session, 
    user_id: int, 
    title: str, 
    message: str, 
    type: NotificationType = NotificationType.INFO,
    category: NotificationCategory = NotificationCategory.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Notification:
    """Create a new notification for a specific user"""
    import json
    
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        category=category,
        priority=priority,
        action_url=action_url,
        meta_info=json.dumps(metadata) if metadata else None  # Changed from meta_info
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def build_notification_query(db: Session, user_id: int, filters: NotificationFilters):
    """Build a filtered query for notifications"""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if filters.type:
        query = query.filter(Notification.type == filters.type)
    if filters.category:
        query = query.filter(Notification.category == filters.category)
    if filters.priority:
        query = query.filter(Notification.priority == filters.priority)
    if filters.read is not None:
        query = query.filter(Notification.read == filters.read)
    if filters.archived is not None:
        query = query.filter(Notification.archived == filters.archived)
    if filters.search:
        search_term = f"%{filters.search}%"
        query = query.filter(
            or_(
                Notification.title.ilike(search_term),
                Notification.message.ilike(search_term)
            )
        )
    if filters.date_from:
        query = query.filter(Notification.created_at >= filters.date_from)
    if filters.date_to:
        query = query.filter(Notification.created_at <= filters.date_to)
    
    return query

# API Endpoints

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: Optional[NotificationType] = None,
    category: Optional[NotificationCategory] = None,
    priority: Optional[NotificationPriority] = None,
    read: Optional[bool] = None,
    archived: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|title|priority|read)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get paginated notifications for the current user"""
    filters = NotificationFilters(
        type=type,
        category=category,
        priority=priority,
        read=read,
        archived=archived,
        search=search
    )
    
    query = build_notification_query(db, current_user.id, filters)
    
    # Apply sorting
    if sort_by == "created_at":
        order_by = desc(Notification.created_at) if sort_order == "desc" else asc(Notification.created_at)
    elif sort_by == "title":
        order_by = asc(Notification.title) if sort_order == "asc" else desc(Notification.title)
    elif sort_by == "priority":
        # Custom priority ordering: high -> medium -> low
        priority_case = db.query(Notification.priority).case(
            [(Notification.priority == NotificationPriority.HIGH, 3),
             (Notification.priority == NotificationPriority.MEDIUM, 2),
             (Notification.priority == NotificationPriority.LOW, 1)],
            else_=1
        )
        order_by = desc(priority_case) if sort_order == "desc" else asc(priority_case)
    elif sort_by == "read":
        order_by = asc(Notification.read) if sort_order == "asc" else desc(Notification.read)
    else:
        order_by = desc(Notification.created_at)
    
    query = query.order_by(order_by)
    
    notifications = query.offset(skip).limit(limit).all()
    return notifications

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification statistics for the current user"""
    base_query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    total = base_query.count()
    unread = base_query.filter(Notification.read == False).count()
    read = base_query.filter(Notification.read == True).count()
    archived = base_query.filter(Notification.archived == True).count()
    
    # Get counts by type
    by_type = {}
    for type_enum in NotificationType:
        count = base_query.filter(Notification.type == type_enum).count()
        by_type[type_enum.value] = count
    
    # Get counts by category
    by_category = {}
    for category_enum in NotificationCategory:
        count = base_query.filter(Notification.category == category_enum).count()
        by_category[category_enum.value] = count
    
    # Get counts by priority
    by_priority = {}
    for priority_enum in NotificationPriority:
        count = base_query.filter(Notification.priority == priority_enum).count()
        by_priority[priority_enum.value] = count
    
    return NotificationStats(
        total=total,
        unread=unread,
        read=read,
        archived=archived,
        by_type=by_type,
        by_category=by_category,
        by_priority=by_priority
    )

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific notification"""
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return notification

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new notification (admin/system use)"""
    notification = create_notification_for_user(
        db=db,
        user_id=current_user.id,
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        category=notification_data.category,
        priority=notification_data.priority,
        action_url=notification_data.action_url,
        metadata=notification_data.metadata
    )
    return notification

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    update_data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a notification (mark as read/unread, archive/unarchive)"""
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    for field, value in update_dict.items():
        setattr(notification, field, value)
        
        # Set timestamps
        if field == "read" and value:
            notification.read_at = datetime.utcnow()
        elif field == "read" and not value:
            notification.read_at = None
        elif field == "archived" and value:
            notification.archived_at = datetime.utcnow()
        elif field == "archived" and not value:
            notification.archived_at = None
    
    db.commit()
    db.refresh(notification)
    return notification

@router.post("/bulk-action")
async def bulk_action(
    action_request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform bulk actions on multiple notifications"""
    if not action_request.notification_ids:
        raise HTTPException(status_code=400, detail="No notification IDs provided")
    
    # Verify all notifications belong to the current user
    notifications = db.query(Notification).filter(
        and_(
            Notification.id.in_(action_request.notification_ids),
            Notification.user_id == current_user.id
        )
    ).all()
    
    if len(notifications) != len(action_request.notification_ids):
        raise HTTPException(status_code=404, detail="Some notifications not found")
    
    affected_count = 0
    current_time = datetime.utcnow()
    
    if action_request.action == "read":
        for notification in notifications:
            if not notification.read:
                notification.read = True
                notification.read_at = current_time
                affected_count += 1
    elif action_request.action == "unread":
        for notification in notifications:
            if notification.read:
                notification.read = False
                notification.read_at = None
                affected_count += 1
    elif action_request.action == "archive":
        for notification in notifications:
            if not notification.archived:
                notification.archived = True
                notification.archived_at = current_time
                affected_count += 1
    elif action_request.action == "unarchive":
        for notification in notifications:
            if notification.archived:
                notification.archived = False
                notification.archived_at = None
                affected_count += 1
    elif action_request.action == "delete":
        for notification in notifications:
            db.delete(notification)
            affected_count += 1
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    db.commit()
    
    return {
        "message": f"Successfully performed {action_request.action} on {affected_count} notifications",
        "affected_count": affected_count
    }

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific notification"""
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted successfully"}

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all unread notifications as read"""
    current_time = datetime.utcnow()
    
    updated_count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False
        )
    ).update({
        "read": True,
        "read_at": current_time
    })
    
    db.commit()
    
    return {
        "message": f"Marked {updated_count} notifications as read",
        "updated_count": updated_count
    }

@router.delete("/clear-all")
async def clear_all_notifications(
    archived_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all notifications (or only archived ones)"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if archived_only:
        query = query.filter(Notification.archived == True)
    
    deleted_count = query.count()
    query.delete()
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} {'archived ' if archived_only else ''}notifications",
        "deleted_count": deleted_count
    }

# System notification helpers (for use by other parts of the application)

async def notify_file_processing_complete(
    db: Session,
    user_id: int,
    filename: str,
    file_type: str = "file",
    action_url: Optional[str] = None
):
    """Create notification when file processing is complete"""
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title=f"{file_type.title()} Processing Complete",
        message=f"Your {file_type} '{filename}' has been processed successfully and is ready for use.",
        type=NotificationType.SUCCESS,
        category=NotificationCategory.PROCESSING,
        priority=NotificationPriority.MEDIUM,
        action_url=action_url
    )

async def notify_file_processing_failed(
    db: Session,
    user_id: int,
    filename: str,
    error_message: str,
    file_type: str = "file"
):
    """Create notification when file processing fails"""
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title=f"{file_type.title()} Processing Failed",
        message=f"Failed to process '{filename}': {error_message}",
        type=NotificationType.ERROR,
        category=NotificationCategory.PROCESSING,
        priority=NotificationPriority.HIGH
    )

async def notify_export_ready(
    db: Session,
    user_id: int,
    export_type: str,
    record_count: int,
    download_url: str
):
    """Create notification when export is ready"""
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="Export Ready",
        message=f"Your {export_type} export containing {record_count:,} records is ready for download.",
        type=NotificationType.SUCCESS,
        category=NotificationCategory.EXPORT,
        priority=NotificationPriority.MEDIUM,
        action_url=download_url
    )

async def notify_forecast_complete(
    db: Session,
    user_id: int,
    forecast_name: str,
    accuracy: float,
    view_url: str
):
    """Create notification when AI forecast is complete"""
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="AI Forecast Complete",
        message=f"Your forecast '{forecast_name}' has been generated with {accuracy:.1%} accuracy. View your predictions now.",
        type=NotificationType.SUCCESS,
        category=NotificationCategory.FORECAST,
        priority=NotificationPriority.HIGH,
        action_url=view_url,
        metadata={"accuracy": accuracy, "forecast_name": forecast_name}
    )
