# app/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, desc, asc, and_, or_
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import List, Optional, Dict, Any

from pydantic import BaseModel

from app.routers.db import get_db
from app.models.user import User
from app.routers.auth import get_current_user

import json

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

Base = declarative_base()

# ------------------------------
# SQLAlchemy Model
# ------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    type = Column(String(50), default="info", nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="general", nullable=False)
    priority = Column(String(50), default="medium", nullable=False)
    read = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)
    action_url = Column(String(512), nullable=True)
    meta_info = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)

    @property
    def metadata(self):
        if self.meta_info:
            try:
                return json.loads(self.meta_info)
            except:
                return {}
        return {}

# ------------------------------
# Pydantic Models
# ------------------------------
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"
    category: str = "general"
    priority: str = "medium"
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
    action: str  # "read", "unread", "archive", "unarchive", "delete"

class NotificationFilters(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    read: Optional[bool] = None
    archived: Optional[bool] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# ------------------------------
# Helper Functions
# ------------------------------
def create_notification_for_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    category: str = "general",
    priority: str = "medium",
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        category=category,
        priority=priority,
        action_url=action_url,
        meta_info=json.dumps(metadata) if metadata else None
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def build_notification_query(db: Session, user_id: int, filters: NotificationFilters):
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
        term = f"%{filters.search}%"
        query = query.filter(
            or_(
                Notification.title.ilike(term),
                Notification.message.ilike(term)
            )
        )
    if filters.date_from:
        query = query.filter(Notification.created_at >= filters.date_from)
    if filters.date_to:
        query = query.filter(Notification.created_at <= filters.date_to)
    return query

# ------------------------------
# API Endpoints
# ------------------------------
@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    read: Optional[bool] = None,
    archived: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|title|priority|read)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filters = NotificationFilters(
        type=type,
        category=category,
        priority=priority,
        read=read,
        archived=archived,
        search=search
    )
    query = build_notification_query(db, current_user.id, filters)

    # Sorting
    if sort_by == "created_at":
        order_by = desc(Notification.created_at) if sort_order=="desc" else asc(Notification.created_at)
    elif sort_by == "title":
        order_by = desc(Notification.title) if sort_order=="desc" else asc(Notification.title)
    elif sort_by == "priority":
        priority_order = {"high":3, "medium":2, "low":1}
        order_by = desc(Notification.priority) if sort_order=="desc" else asc(Notification.priority)
    elif sort_by == "read":
        order_by = desc(Notification.read) if sort_order=="desc" else asc(Notification.read)
    else:
        order_by = desc(Notification.created_at)

    notifications = query.order_by(order_by).offset(skip).limit(limit).all()
    return notifications

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    base = db.query(Notification).filter(Notification.user_id==current_user.id)
    total = base.count()
    unread = base.filter(Notification.read==False).count()
    read = base.filter(Notification.read==True).count()
    archived = base.filter(Notification.archived==True).count()

    by_type = {}
    for t in base.with_entities(Notification.type).distinct():
        by_type[t[0]] = base.filter(Notification.type==t[0]).count()

    by_category = {}
    for c in base.with_entities(Notification.category).distinct():
        by_category[c[0]] = base.filter(Notification.category==c[0]).count()

    by_priority = {}
    for p in base.with_entities(Notification.priority).distinct():
        by_priority[p[0]] = base.filter(Notification.priority==p[0]).count()

    return NotificationStats(
        total=total, unread=unread, read=read, archived=archived,
        by_type=by_type, by_category=by_category, by_priority=by_priority
    )

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(notification_id:int,
                           db:Session=Depends(get_db),
                           current_user:User=Depends(get_current_user)):
    notification = db.query(Notification).filter(
        and_(Notification.id==notification_id,
             Notification.user_id==current_user.id)
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data:NotificationCreate,
    db:Session=Depends(get_db),
    current_user:User=Depends(get_current_user)
):
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
async def update_notification(notification_id:int,
                              update_data:NotificationUpdate,
                              db:Session=Depends(get_db),
                              current_user:User=Depends(get_current_user)):
    notification = db.query(Notification).filter(
        and_(Notification.id==notification_id,
             Notification.user_id==current_user.id)
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    update_dict = update_data.dict(exclude_unset=True)
    for field,value in update_dict.items():
        setattr(notification, field, value)
        if field=="read":
            notification.read_at = datetime.utcnow() if value else None
        if field=="archived":
            notification.archived_at = datetime.utcnow() if value else None

    db.commit()
    db.refresh(notification)
    return notification

@router.post("/bulk-action")
async def bulk_action(action_request:BulkActionRequest,
                      db:Session=Depends(get_db),
                      current_user:User=Depends(get_current_user)):
    if not action_request.notification_ids:
        raise HTTPException(status_code=400, detail="No notification IDs provided")
    notifications = db.query(Notification).filter(
        and_(Notification.id.in_(action_request.notification_ids),
             Notification.user_id==current_user.id)
    ).all()
    if len(notifications)!=len(action_request.notification_ids):
        raise HTTPException(status_code=404, detail="Some notifications not found")
    now=datetime.utcnow()
    affected=0
    if action_request.action=="read":
        for n in notifications:
            if not n.read:
                n.read=True
                n.read_at=now
                affected+=1
    elif action_request.action=="unread":
        for n in notifications:
            if n.read:
                n.read=False
                n.read_at=None
                affected+=1
    elif action_request.action=="archive":
        for n in notifications:
            if not n.archived:
                n.archived=True
                n.archived_at=now
                affected+=1
    elif action_request.action=="unarchive":
        for n in notifications:
            if n.archived:
                n.archived=False
                n.archived_at=None
                affected+=1
    elif action_request.action=="delete":
        for n in notifications:
            db.delete(n)
            affected+=1
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    db.commit()
    return {"message":f"{action_request.action} done on {affected} notifications","affected_count":affected}

@router.delete("/{notification_id}")
async def delete_notification(notification_id:int,
                              db:Session=Depends(get_db),
                              current_user:User=Depends(get_current_user)):
    notification=db.query(Notification).filter(
        and_(Notification.id==notification_id,
             Notification.user_id==current_user.id)
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()
    return {"message":"Notification deleted"}

@router.post("/mark-all-read")
async def mark_all_notifications_read(db:Session=Depends(get_db),
                                      current_user:User=Depends(get_current_user)):
    now=datetime.utcnow()
    updated=db.query(Notification).filter(
        and_(Notification.user_id==current_user.id,
             Notification.read==False)
    ).update({"read":True,"read_at":now})
    db.commit()
    return {"message":f"Marked {updated} notifications as read","updated_count":updated}

@router.delete("/clear-all")
async def clear_all_notifications(archived_only:bool=Query(False),
                                  db:Session=Depends(get_db),
                                  current_user:User=Depends(get_current_user)):
    query=db.query(Notification).filter(Notification.user_id==current_user.id)
    if archived_only:
        query=query.filter(Notification.archived==True)
    count=query.count()
    query.delete()
    db.commit()
    return {"message":f"Cleared {count} notifications","deleted_count":count}

# ------------------------------
# System Notification Helpers
# ------------------------------
async def notify_file_processing_complete(db:Session,user_id:int,filename:str,
                                          file_type:str="file",action_url:Optional[str]=None):
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title=f"{file_type.title()} Processing Complete",
        message=f"Your {file_type} '{filename}' has been processed successfully and is ready for use.",
        type="success",
        category="processing",
        priority="medium",
        action_url=action_url
    )

async def notify_file_processing_failed(db:Session,user_id:int,filename:str,
                                        error_message:str,file_type:str="file"):
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title=f"{file_type.title()} Processing Failed",
        message=f"Failed to process '{filename}': {error_message}",
        type="error",
        category="processing",
        priority="high"
    )

async def notify_export_ready(db:Session,user_id:int,export_type:str,
                              record_count:int,download_url:str):
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="Export Ready",
        message=f"Your {export_type} export containing {record_count:,} records is ready for download.",
        type="success",
        category="export",
        priority="medium",
        action_url=download_url
    )

async def notify_forecast_complete(db:Session,user_id:int,forecast_name:str,
                                   accuracy:float,view_url:str):
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="AI Forecast Complete",
        message=f"Your forecast '{forecast_name}' has been generated with {accuracy:.1%} accuracy. View your predictions now.",
        type="success",
        category="forecast",
        priority="high",
        action_url=view_url,
        metadata={"accuracy":accuracy,"forecast_name":forecast_name}
    )
