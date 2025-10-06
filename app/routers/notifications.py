# app/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, desc, asc, and_, or_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import enum
import json
from pydantic import BaseModel, validator
from app.routers.db import get_db, Base  # Import Base from your db module
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Use string type for enums in database to match PostgreSQL enum values
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

# SQLAlchemy Model - use your main Base
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    type = Column(String, default="info")  # Store as string
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String, default="system")  # Store as string
    priority = Column(String, default="medium")  # Store as string
    read = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)
    action_url = Column(String(512), nullable=True)
    meta_info = Column(Text, nullable=True)
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

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    category: str
    priority: str
    read: bool
    archived: bool
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    
    @validator('metadata', pre=True)
    def parse_metadata(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v) if v else None
            except:
                return None
        return v
    
    class Config:
        from_attributes = True
        orm_mode = True

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
    action: str

class NotificationFilters(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    read: Optional[bool] = None
    archived: Optional[bool] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

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
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type.value,  # Use .value to get string
        category=category.value,
        priority=priority.value,
        action_url=action_url,
        meta_info=json.dumps(metadata) if metadata else None
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
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    read: Optional[bool] = None,
    archived: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """Get paginated notifications for the current user"""
    current_user = get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    filters = NotificationFilters(
        type=type,
        category=category,
        priority=priority,
        read=read,
        archived=archived,
        search=search
    )
    
    query = build_notification_query(db, current_user["id"], filters)
    
    # Apply sorting
    if sort_by == "created_at":
        order_by = desc(Notification.created_at) if sort_order == "desc" else asc(Notification.created_at)
    elif sort_by == "title":
        order_by = asc(Notification.title) if sort_order == "asc" else desc(Notification.title)
    else:
        order_by = desc(Notification.created_at)
    
    query = query.order_by(order_by)
    notifications = query.offset(skip).limit(limit).all()
    
    # Convert to response format
    result = []
    for n in notifications:
        result.append(NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            title=n.title,
            message=n.message,
            category=n.category,
            priority=n.priority,
            read=n.read,
            archived=n.archived,
            action_url=n.action_url,
            metadata=json.loads(n.meta_info) if n.meta_info else None,
            created_at=n.created_at,
            read_at=n.read_at,
            archived_at=n.archived_at
        ))
    
    return result

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get notification statistics for the current user"""
    current_user = get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    base_query = db.query(Notification).filter(Notification.user_id == current_user["id"])
    
    total = base_query.count()
    unread = base_query.filter(Notification.read == False).count()
    read = base_query.filter(Notification.read == True).count()
    archived = base_query.filter(Notification.archived == True).count()
    
    # Get counts by type
    by_type = {}
    for type_enum in NotificationType:
        count = base_query.filter(Notification.type == type_enum.value).count()
        by_type[type_enum.value] = count
    
    # Get counts by category
    by_category = {}
    for category_enum in NotificationCategory:
        count = base_query.filter(Notification.category == category_enum.value).count()
        by_category[category_enum.value] = count
    
    # Get counts by priority
    by_priority = {}
    for priority_enum in NotificationPriority:
        count = base_query.filter(Notification.priority == priority_enum.value).count()
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

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    update_data: NotificationUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a notification (mark as read/unread, archive/unarchive)"""
    current_user = get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user["id"]
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    for field, value in update_dict.items():
        setattr(notification, field, value)
        
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
    
    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        category=notification.category,
        priority=notification.priority,
        read=notification.read,
        archived=notification.archived,
        action_url=notification.action_url,
        metadata=json.loads(notification.meta_info) if notification.meta_info else None,
        created_at=notification.created_at,
        read_at=notification.read_at,
        archived_at=notification.archived_at
    )

@router.post("/bulk-action")
async def bulk_action(
    action_request: BulkActionRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Perform bulk actions on multiple notifications"""
    current_user = get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not action_request.notification_ids:
        raise HTTPException(status_code=400, detail="No notification IDs provided")
    
    notifications = db.query(Notification).filter(
        and_(
            Notification.id.in_(action_request.notification_ids),
            Notification.user_id == current_user["id"]
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

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    request: Request,
    db: Session = Depends(get_db)
):
    """Mark all unread notifications as read"""
    current_user = get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    current_time = datetime.utcnow()
    
    updated_count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user["id"],
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
