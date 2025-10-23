# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
from pydantic import BaseModel

from jose import JWTError, jwt
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from app.routers.notifications import create_notification_for_user, NotificationType, NotificationCategory, NotificationPriority
from app.routers.db import get_db


from .db import (
    get_user_by_contact, 
    get_user_with_hash_by_contact,
    get_user_by_id,
    create_local_user,
    get_user_by_google_id,
    create_google_user,
    link_google_to_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# ------------------- Pydantic Models -------------------
class LoginRequest(BaseModel):
    contact: str
    password: str

class SignupRequest(BaseModel):
    name: str
    contact: str
    password: str
    confirm_password: str
    contact_type: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_payload(request: Request) -> Optional[Dict]:
    """Extract user payload from JWT token in cookie or header"""
    # Try cookie first
    token = request.cookies.get("auth_token")
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Get current user data from token"""
    payload = get_current_user_payload(request)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    try:
        user = get_user_by_id(int(user_id))
        return user
    except (ValueError, TypeError):
        return None

def require_auth(request: Request) -> Dict[str, Any]:
    """Dependency that requires authentication"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

@router.post("/signup")
async def signup(payload: SignupRequest):
    name = payload.name
    contact = payload.contact
    password = payload.password
    confirm_password = payload.confirm_password
    contact_type = payload.contact_type

    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if contact_type == "email":
        email = contact
        phone = None
    elif contact_type == "phone":
        email = None
        phone = contact
    else:
        raise HTTPException(status_code=400, detail="Invalid contact type")
    
    # Check if user already exists
    existing_user = get_user_by_contact(contact)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )
    
    # Hash password and create user
    password_hash = hash_password(password)
    
    user_id = create_local_user(
        name=name,
        email=email,
        phone=phone,
        password_hash=password_hash
    )
    
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    # --- WELCOME NOTIFICATION ---
    db = next(get_db())
    create_notification_for_user(
        db=db,
        user_id=user["id"],
        title="Welcome to Syla Analytics",
        message="Clean, Analyse, Visualise, Convert and Forecast in just few minutes. Enjoy your easy work with SYLA.",
        type=NotificationType.INFO,
        category=NotificationCategory.SYSTEM,
        priority=NotificationPriority.MEDIUM
    )


    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, 
        expires_delta=access_token_expires
    )
    
    response = JSONResponse(content={
        "user": user,
        "access_token": access_token,
        "token_type": "bearer"
    })
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,  # True in production
        samesite="lax"
    )
    
    return response

@router.post("/login")
async def login(payload: LoginRequest):
    contact = payload.contact
    password = payload.password

    """Login with email/phone and password"""
    user = get_user_with_hash_by_contact(contact)
    if not user or not user.get("_password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(password, user["_password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Remove password hash from user data
    user_data = {k: v for k, v in user.items() if k != "_password_hash"}

    # --- WELCOME NOTIFICATION ---
    db = next(get_db())
    create_notification_for_user(
        db=db,
        user_id=user_data["id"],
        title="Welcome to Syla Analytics",
        message="Clean, Analyse, Visualise, Convert and Forecast in just few minutes. Enjoy your easy work with SYLA.",
        type=NotificationType.INFO,
        category=NotificationCategory.SYSTEM,
        priority=NotificationPriority.MEDIUM
    )
       
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_data["id"])}, 
        expires_delta=access_token_expires
    )
    
    # Create response with cookie
    response = JSONResponse(content={
        "message": "Login successful",
        "user": user_data,
        "access_token": access_token,
        "token_type": "bearer"
    })
    
    # Set cookie
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    return response

class GoogleLoginRequest(BaseModel):
    credential: str

# Replace your @router.post("/google") endpoint with this:
@router.post("/google")
async def google_signin(body: GoogleLoginRequest):
    """Sign in or sign up with Google - FIXED VERSION"""
    token = body.credential
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication not configured"
        )
    
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), client_id)
        
        google_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name", "Google User")
        avatar_url = idinfo.get("picture")
        
        # Check if user exists with this Google ID
        user = get_user_by_google_id(google_id)
        
        if user:
            # User exists - check if avatar needs updating
            if avatar_url and user.get("avatar_url") != avatar_url:
                # Update avatar URL if it changed
                user_data = update_user_profile(
                    user_id=user["id"],
                    avatar_url=avatar_url
                )
            else:
                user_data = user
        else:
            # Check if user exists with this email
            if email:
                existing_user = get_user_by_contact(email)
                if existing_user:
                    # Link Google account to existing user
                    link_google_to_user(existing_user["id"], google_id, avatar_url)
                    user_data = get_user_by_id(existing_user["id"])
                else:
                    # Create new user
                    user_id = create_google_user(name, email, google_id, avatar_url)
                    user_data = get_user_by_id(user_id)
            else:
                # Create new user without email
                user_id = create_google_user(name, None, google_id, avatar_url)
                user_data = get_user_by_id(user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create or retrieve user"
            )

            # --- WELCOME NOTIFICATION ---
            db = next(get_db())
            create_notification_for_user(
                db=db,
                user_id=user_data["id"],
                title="Welcome to Syla Analytics",
                message="Clean, Analyse, Visualise, Convert and Forecast in just few minutes. Enjoy your easy work with SYLA.",
                type=NotificationType.INFO,
                category=NotificationCategory.SYSTEM,
                priority=NotificationPriority.MEDIUM
            )

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create or retrieve user"
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_data["id"])}, 
            expires_delta=access_token_expires
        )
        
        # Create response with cookie
        response = JSONResponse(content={
            "message": "Google sign-in successful",
            "user": user_data,  # ENSURE full user data is returned
            "access_token": access_token,
            "token_type": "bearer"
        })
        
        # Set cookie
        response.set_cookie(
            key="auth_token",
            value=access_token,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google token: {str(e)}"
        )

@router.get("/me")
async def get_current_user_endpoint(request: Request):
    """Get current authenticated user"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

@router.post("/logout")
async def logout():
    """Logout user by clearing cookie"""
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="auth_token")
    return response

@router.post("/refresh")
async def refresh_token(request: Request):
    """Refresh access token"""
    payload = get_current_user_payload(request)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, 
        expires_delta=access_token_expires
    )
    
    # Create response with cookie
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer"
    })
    
    # Set cookie
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
class FirebasePhoneLoginRequest(BaseModel):
    firebase_token: str
    phone: str
    password: str

class FirebasePhoneSignupRequest(BaseModel):
    firebase_token: str
    name: str
    phone: str
    password: str
    confirm_password: str

@router.post("/firebase-phone-login")
async def firebase_phone_login(payload: FirebasePhoneLoginRequest):
    """Login with Firebase-verified phone number"""
    # In production, verify the Firebase token here
    # For now, we trust the frontend verification
    
    user = get_user_with_hash_by_contact(payload.phone)
    if not user or not user.get("_password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(payload.password, user["_password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    user_data = {k: v for k, v in user.items() if k != "_password_hash"}
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user_data["id"])}, 
        expires_delta=access_token_expires
    )
    
    response = JSONResponse(content={
        "message": "Login successful",
        "user": user_data,
        "access_token": access_token,
        "token_type": "bearer"
    })
    
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return response

@router.post("/firebase-phone-signup")
async def firebase_phone_signup(payload: FirebasePhoneSignupRequest):
    """Signup with Firebase-verified phone number"""
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    existing_user = get_user_by_contact(payload.phone)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone already exists"
        )
    
    password_hash = hash_password(payload.password)
    
    user_id = create_local_user(
        name=payload.name,
        phone=payload.phone,
        password_hash=password_hash
    )
    
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, 
        expires_delta=access_token_expires
    )
    
    response = JSONResponse(content={
        "user": user,
        "access_token": access_token,
        "token_type": "bearer"
    })
    
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return response
