# db.py
import os
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, or_
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import IntegrityError

# Get environment-aware database URL
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    DATABASE_URL = os.getenv("DATABASE_PROD_URL")
else:
    DATABASE_URL = os.getenv("DATABASE_LOCAL_URL")

# Validate that DATABASE_URL is set
if not DATABASE_URL:
    raise EnvironmentError(
        f"Database URL not configured for environment: {ENVIRONMENT}. "
        f"Please set DATABASE_LOCAL_URL or DATABASE_PROD_URL in your .env file."
    )

print(f"🔌 [db.py] Connecting to database for {ENVIRONMENT}: {DATABASE_URL[:30]}...")

# Create engine with PostgreSQL-appropriate settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,         # Connection pool size
    max_overflow=10,     # Max connections beyond pool_size
    echo=False           # Set to True for SQL query logging during debugging
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
    
    # Extended profile fields
    bio = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)
    company = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)  # Store as string for flexibility
    gender = Column(String, nullable=True)
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chart_settings = relationship("ChartSettings", back_populates="user")    


# ⚠️ Do not auto-create tables in production.
# Use Alembic migrations instead.
# Base.metadata.create_all(bind=engine)



# ---- Helper Functions ----
def _serialize_user(user: Optional[User]) -> Optional[Dict[str, Any]]:
    """Serialize user object to dictionary"""
    if not user:
        return None
    return {
        "id": int(user.id),
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "google_id": user.google_id,
        "bio": user.bio,
        "location": user.location,
        "website": user.website,
        "company": user.company,
        "job_title": user.job_title,
        "birth_date": user.birth_date,
        "gender": user.gender,
        "language": user.language,
        "timezone": user.timezone,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


# ---- User CRUD Operations ----
def get_user_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Return serialized user by email or phone, or None."""
    with SessionLocal() as session:
        user = session.query(User).filter(
            or_(User.email == contact, User.phone == contact)
        ).first()
        return _serialize_user(user)


def get_user_with_hash_by_contact(contact: str) -> Optional[Dict[str, Any]]:
    """Return serialized user including password_hash (for login)."""
    with SessionLocal() as session:
        user = session.query(User).filter(
            or_(User.email == contact, User.phone == contact)
        ).first()
        if not user:
            return None
        
        user_data = _serialize_user(user)
        if user_data and user.password_hash:
            user_data["_password_hash"] = user.password_hash
        
        return user_data


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        return _serialize_user(user)


def create_local_user(
    name: str, 
    email: Optional[str] = None, 
    phone: Optional[str] = None, 
    password_hash: Optional[str] = None
) -> int:
    """Create a new local user with email/phone and password"""
    user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=password_hash
    )
    
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
    """Get user by Google ID"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.google_id == google_id).first()
        return _serialize_user(user)


def create_google_user(
    name: str, 
    email: Optional[str] = None, 
    google_id: Optional[str] = None, 
    avatar_url: Optional[str] = None
) -> int:
    """Create a new Google user"""
    user = User(
        name=name,
        email=email,
        google_id=google_id,
        avatar_url=avatar_url
    )
    
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
    """Link Google account to existing user"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        user.google_id = google_id
        if avatar_url:
            user.avatar_url = avatar_url
        user.updated_at = datetime.utcnow()
        
        try:
            session.commit()
            return True
        except IntegrityError:
            session.rollback()
            raise ValueError("Google account already linked to another user")


def update_user_profile(
    user_id: int,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None,
    website: Optional[str] = None,
    company: Optional[str] = None,
    job_title: Optional[str] = None,
    birth_date: Optional[str] = None,
    gender: Optional[str] = None,
    language: Optional[str] = None,
    timezone: Optional[str] = None,
    avatar_url: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Update user profile information"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Update fields if provided
        if name is not None:
            user.name = name
        if email is not None:
            user.email = email if email else None
        if phone is not None:
            user.phone = phone if phone else None
        if bio is not None:
            user.bio = bio if bio else None
        if location is not None:
            user.location = location if location else None
        if website is not None:
            user.website = website if website else None
        if company is not None:
            user.company = company if company else None
        if job_title is not None:
            user.job_title = job_title if job_title else None
        if birth_date is not None:
            user.birth_date = birth_date if birth_date else None
        if gender is not None:
            user.gender = gender if gender else None
        if language is not None:
            user.language = language if language else "en"
        if timezone is not None:
            user.timezone = timezone if timezone else "UTC"
        if avatar_url is not None:
            user.avatar_url = avatar_url
        
        user.updated_at = datetime.utcnow()
        
        try:
            session.commit()
            session.refresh(user)
            return _serialize_user(user)
        except IntegrityError:
            session.rollback()
            raise ValueError("Email or phone already exists for another user")


def update_user_password(user_id: int, password_hash: str) -> bool:
    """Update user password"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        user.password_hash = password_hash
        user.updated_at = datetime.utcnow()
        
        session.commit()
        return True


def remove_user_avatar(user_id: int) -> Optional[Dict[str, Any]]:
    """Remove user avatar"""
    with SessionLocal() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        user.avatar_url = None
        user.updated_at = datetime.utcnow()
        
        session.commit()
        session.refresh(user)
        return _serialize_user(user)


# ---- FastAPI Dependency ----
def get_db():
    """Provide a database session for FastAPI dependency injection"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
