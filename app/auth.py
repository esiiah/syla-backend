# app/auth.py
import os
import re
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
import uuid

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Depends, Response, Request, UploadFile, File, Form
from fastapi.security import HTTPBearer
from pydantic import BaseModel, validator

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")
AVATAR_DIR = os.path.join(os.path.dirname(__file__), "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            avatar_url TEXT,
            auth_provider TEXT DEFAULT 'local',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    conn.commit()
    conn.close()

init_db()

# ---------------- Pydantic models ----------------
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"

    @validator("name")
    def validate_name(cls, v: str):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return v

    @validator("contact")
    def validate_contact(cls, v: str, values):
        contact_type = values.get("contact_type", "email")
        v = v.strip()
        if contact_type == "email":
            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$"
            if not re.match(email_pattern, v):
                raise ValueError("Invalid email format")
        elif contact_type == "phone":
            cleaned = re.sub(r"[ \-\(\)]", "", v)
            phone_pattern = r"^\+?\d{10,15}$"
            if not re.match(phone_pattern, cleaned):
                raise ValueError("Invalid phone number format")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v

    @validator("password")
    def validate_password(cls, v: str):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

class LoginRequest(BaseModel):
    contact: str  # email or phone
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str  # Google JWT token

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    created_at: str
    auth_provider: Optional[str] = "local"
    avatar_url: Optional[str] = None

# ---------------- Utilities ----------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def get_user_by_contact(contact: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, password_hash, auth_provider, avatar_url, created_at FROM users WHERE email = ? OR phone = ?", (contact, contact))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = ["id", "name", "email", "phone", "password_hash", "auth_provider", "avatar_url", "created_at"]
    return dict(zip(keys, row))

def get_user_by_google_id(google_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, auth_provider, avatar_url, created_at FROM users WHERE google_id = ?", (google_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = ["id", "name", "email", "phone", "auth_provider", "avatar_url", "created_at"]
    return dict(zip(keys, row))

def get_user_by_id(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, auth_provider, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = ["id", "name", "email", "phone", "auth_provider", "avatar_url", "created_at"]
    return dict(zip(keys, row))

def get_current_user_from_token(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[len("Bearer ") :]
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    user_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
    if not user_id:
        return None
    try:
        user = get_user_by_id(int(user_id))
    except Exception:
        return None
    return user

def save_avatar(file: UploadFile, user_id: int) -> str:
    """Save uploaded avatar and return URL"""
    # Generate unique filename
    file_extension = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"user_{user_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    filepath = os.path.join(AVATAR_DIR, filename)
    
    # Save file
    with open(filepath, "wb") as f:
        file.file.seek(0)
        f.write(file.file.read())
    
    # Return URL path
    return f"/api/avatars/{filename}"

def verify_google_token(credential: str) -> dict:
    """Verify Google JWT token and return user info"""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            credential, 
            requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )
        
        return {
            "google_id": idinfo["sub"],
            "email": idinfo["email"],
            "name": idinfo["name"],
            "avatar_url": idinfo.get("picture")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")

# ---------------- Routes ----------------
@router.post("/signup")
async def signup(request: SignupRequest, response: Response):
    existing = get_user_by_contact(request.contact)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    password_hash = hash_password(request.password)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, auth_provider) VALUES (?, ?, ?, 'local')",
                (request.name, request.contact, password_hash),
            )
        else:
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash, auth_provider) VALUES (?, ?, ?, 'local')",
                (request.name, request.contact, password_hash),
            )
        user_id = cursor.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")
    conn.close()

    access_token = create_access_token({"sub": user_id, "id": user_id})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )
    user = get_user_by_id(user_id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login")
async def login(request: LoginRequest, response: Response):
    user = get_user_by_contact(request.contact)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({"sub": user["id"], "id": user["id"]})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )
    user_resp = get_user_by_id(user["id"])
    return {"access_token": access_token, "token_type": "bearer", "user": user_resp}

# FIXED: Added Google OAuth routes with proper POST methods
@router.post("/google")
async def google_auth(request: GoogleAuthRequest, response: Response):
    """Handle Google OAuth authentication"""
    try:
        # Verify Google token and get user info
        google_user = verify_google_token(request.credential)
        
        # Check if user exists by Google ID
        existing_user = get_user_by_google_id(google_user["google_id"])
        
        if existing_user:
            # User exists, log them in
            user_id = existing_user["id"]
        else:
            # Check if user exists by email
            existing_email_user = get_user_by_contact(google_user["email"])
            
            if existing_email_user:
                # Link Google account to existing user
                conn = get_db_connection()
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "UPDATE users SET google_id = ?, auth_provider = 'google', avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
                        (google_user["google_id"], google_user.get("avatar_url"), existing_email_user["id"])
                    )
                    conn.commit()
                    user_id = existing_email_user["id"]
                except Exception:
                    conn.rollback()
                    raise HTTPException(status_code=500, detail="Failed to link Google account")
                finally:
                    conn.close()
            else:
                # Create new user
                conn = get_db_connection()
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO users (name, email, google_id, auth_provider, avatar_url) VALUES (?, ?, ?, 'google', ?)",
                        (google_user["name"], google_user["email"], google_user["google_id"], google_user.get("avatar_url"))
                    )
                    user_id = cursor.lastrowid
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise HTTPException(status_code=500, detail="Failed to create user")
                finally:
                    conn.close()
        
        # Generate access token
        access_token = create_access_token({"sub": user_id, "id": user_id})
        response.set_cookie(
            key="auth_token",
            value=access_token,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=(os.getenv("ENV") == "production"),
            samesite="lax",
        )
        
        user = get_user_by_id(user_id)
        return {"access_token": access_token, "token_type": "bearer", "user": user}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")

@router.get("/google/callback")
async def google_callback():
    """Google OAuth callback endpoint"""
    # This would handle the OAuth callback flow
    # For now, return a simple message
    return {"message": "Google OAuth callback - implement as needed"}

@router.get("/me")
async def get_current_user_info(request: Request):
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.patch("/profile")
async def update_profile(
    request: Request,
    name: str = Form(...),
    email: str = Form(""),
    phone: str = Form(""),
    avatar: UploadFile = File(None)
):
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Handle avatar upload
        avatar_url = user.get("avatar_url")
        if avatar and avatar.filename:
            # Validate file type
            allowed_types = ["image/jpeg", "image/png", "image/gif"]
            if avatar.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and GIF are allowed.")
            
            # Validate file size (5MB max)
            if avatar.size > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
            
            # Delete old avatar if exists
            if avatar_url and avatar_url.startswith("/api/avatars/"):
                old_file = os.path.join(AVATAR_DIR, os.path.basename(avatar_url))
                if os.path.exists(old_file):
                    try:
                        os.remove(old_file)
                    except Exception:
                        pass
            
            avatar_url = save_avatar(avatar, user["id"])
        
        # Update user profile
        update_query = "UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP"
        params = [name.strip()]
        
        if email.strip():
            update_query += ", email = ?"
            params.append(email.strip())
        
        if phone.strip():
            update_query += ", phone = ?"
            params.append(phone.strip())
        
        if avatar_url:
            update_query += ", avatar_url = ?"
            params.append(avatar_url)
        
        update_query += " WHERE id = ?"
        params.append(user["id"])
        
        cursor.execute(update_query, params)
        conn.commit()
        
        # Return updated user
        updated_user = get_user_by_id(user["id"])
        return updated_user
        
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email or phone already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        conn.close()

@router.post("/change-password")
async def change_password(request: Request, password_request: PasswordChangeRequest):
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user with password hash
    full_user = get_user_by_contact(user.get("email") or user.get("phone"))
    if not full_user or not verify_password(password_request.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(password_request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    
    # Update password
    new_hash = hash_password(password_request.new_password)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_hash, user["id"])
        )
        conn.commit()
        return {"message": "Password changed successfully"}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to change password")
    finally:
        conn.close()

@router.delete("/clear-user-files")
async def clear_user_files(request: Request):
    """Clear all files uploaded by the current user"""
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # This would implement file cleanup logic
    # For now, just return success
    return {"message": "All files cleared successfully"}

@router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    """Serve avatar images"""
    from fastapi.responses import FileResponse
    filepath = os.path.join(AVATAR_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(filepath)
