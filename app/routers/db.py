# app/routers/db.py
import os
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import create_engine, Column, Integer, String, DateTime, or_
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import IntegrityError

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ---- helpers ----
def _serialize_user(user: Optional[User]) -> Optional[Dict[str, Any]]:
    if not user:
        return None
    return {
        "id": int(user.id),
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "google_id": user.google_id,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


# ---- CRUD ----
def get_user_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Return serialized user by email or phone, or None."""
    with SessionLocal() as session:
        user = session.query(User).filter(
            (User.email == contact) | (User.phone == contact)
        ).first()
        return _serialize_user(user)


def get_user_with_hash_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Return serialized user including password_hash (for login)."""
    with SessionLocal() as session:
        user = session.query(User).filter(
            (User.email == contact) | (User.phone == contact)
        ).first()
        if not user:
            return None
        d = _serialize_user(user)
        # add password_hash for internal use (do NOT leak to client)
        d["_password_hash"] = user.password_hash
        return d


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        return _serialize_user(user)


def create_local_user(name: str, email: Optional[str] = None, phone: Optional[str] = None, password_hash: Optional[str] = None) -> int:
    user = User(name=name, email=email, phone=phone, password_hash=password_hash)
    with SessionLocal() as session:
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
            return int(user.id)
        except IntegrityError:
            session.rollback()
            raise ValueError("User with this email or phone already exists")


def get_user_by_google_id(google_id: str) -> Optional[Dict[str, Any]]:
    with SessionLocal() as session:
        user = session.query(User).filter(User.google_id == google_id).first()
        return _serialize_user(user)


def create_google_user(name: str, email: Optional[str] = None, google_id: Optional[str] = None, avatar_url: Optional[str] = None) -> int:
    user = User(name=name, email=email, google_id=google_id, avatar_url=avatar_url)
    with SessionLocal() as session:
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
            return int(user.id)
        except IntegrityError:
            session.rollback()
            raise ValueError("Google account already exists")


def link_google_to_user(user_id: int, google_id: str, avatar_url: Optional[str] = None) -> bool:
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        user.google_id = google_id
        if avatar_url:
            user.avatar_url = avatar_url
        session.commit()
        return True
