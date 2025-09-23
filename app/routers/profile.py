# app/routers/profile.py
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os
import uuid
from pathlib import Path
import shutil

from passlib.context import CryptContext
from .db import (
    get_user_by_id,
    update_user_profile,
    update_user_password,
    remove_user_avatar,
    get_user_with_hash_by_contact
)
from .auth import get_current_user, require_auth

router = APIRouter(prefix="/api/profile", tags=["profile"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Upload configuration
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def save_avatar(file: UploadFile) -> str:
    """Save uploaded avatar file and return URL"""
    # Validate file type
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPG, PNG, GIF, and WebP are allowed."
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return relative URL
    return f"/uploads/avatars/{filename}"

@router.get("/me")
async def get_profile(request: Request):
    """Get current user profile"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

@router.put("")
async def update_profile(
    request: Request,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),  # Alternative field name for phone
    bio: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    job_title: Optional[str] = Form(None),
    birth_date: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    timezone: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None)
):
    """Update user profile"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_id = user["id"]
    avatar_url = None
    
    # Handle avatar upload
    if avatar:
        # Validate file size
        contents = await avatar.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 5MB."
            )
        
        # Reset file pointer
        await avatar.seek(0)
        
        try:
            avatar_url = save_avatar(avatar)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload avatar: {str(e)}"
            )
    
    # Use contact as phone if phone is not provided
    if not phone and contact:
        phone = contact
    
    # Clean empty strings to None
    def clean_field(value):
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return None
        return value.strip() if isinstance(value, str) else value
    
    try:
        updated_user = update_user_profile(
            user_id=user_id,
            name=clean_field(name),
            email=clean_field(email),
            phone=clean_field(phone),
            bio=clean_field(bio),
            location=clean_field(location),
            website=clean_field(website),
            company=clean_field(company),
            job_title=clean_field(job_title),
            birth_date=clean_field(birth_date),
            gender=clean_field(gender),
            language=clean_field(language) or "en",
            timezone=clean_field(timezone) or "UTC",
            avatar_url=avatar_url
        )
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        return updated_user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.post("/change-password")
async def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...)
):
    """Change user password"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Validate new password
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    # Get user with password hash to verify current password
    contact = user.get("email") or user.get("phone")
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email or phone found for user"
        )
    
    user_with_hash = get_user_with_hash_by_contact(contact)
    if not user_with_hash or not user_with_hash.get("_password_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set for this account"
        )
    
    # Verify current password
    if not verify_password(current_password, user_with_hash["_password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password and update
    new_password_hash = hash_password(new_password)
    
    try:
        success = update_user_password(user["id"], new_password_hash)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password changed successfully"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )

@router.delete("/avatar")
async def remove_avatar(request: Request):
    """Remove user avatar"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        updated_user = remove_user_avatar(user["id"])
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove avatar"
            )
        
        return updated_user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove avatar: {str(e)}"
        )
