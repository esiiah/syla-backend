# app/routers/db.py
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, select
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import IntegrityError

# ---------- DATABASE SETUP ----------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")  # default to SQLite

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------- USER MODEL ----------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)  # nullable for Google users
    google_id = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Create tables
Base.metadata.create_all(bind=engine)


# ---------- CRUD FUNCTIONS ----------
def get_user_by_contact(contact: str):
    """Get a user by email or phone."""
    with SessionLocal() as session:
        return session.execute(
            select(User).where((User.email == contact) | (User.phone == contact))
        ).scalars().first()


def get_user_with_hash_by_contact(contact: str):
    """Get user with password hash by email/phone (for login)."""
    return get_user_by_contact(contact)


def get_user_by_id(user_id: int):
    """Get user by ID."""
    with SessionLocal() as session:
        return session.execute(select(User).where(User.id == user_id)).scalars().first()


def create_local_user(name: str, email: str = None, phone: str = None, password_hash: str = None):
    """Create a local user with email/phone and hashed password."""
    user = User(name=name, email=email, phone=phone, password_hash=password_hash)
    with SessionLocal() as session:
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
            return user.id
        except IntegrityError:
            session.rollback()
            raise ValueError("User with this email or phone already exists")


def get_user_by_google_id(google_id: str):
    """Get a user by Google ID."""
    with SessionLocal() as session:
        return session.execute(select(User).where(User.google_id == google_id)).scalars().first()


def create_google_user(name: str, email: str = None, google_id: str = None, avatar_url: str = None):
    """Create a Google user."""
    user = User(name=name, email=email, google_id=google_id, avatar_url=avatar_url)
    with SessionLocal() as session:
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
            return user.id
        except IntegrityError:
            session.rollback()
            raise ValueError("Google account already exists")


def link_google_to_user(user_id: int, google_id: str, avatar_url: str = None):
    """Link a Google account to an existing user."""
    with SessionLocal() as session:
        user = session.execute(select(User).where(User.id == user_id)).scalars().first()
        if not user:
            raise ValueError("User not found")
        user.google_id = google_id
        if avatar_url:
            user.avatar_url = avatar_url
        session.commit()
        return True
