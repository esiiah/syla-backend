# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

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
async def signup(
    name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    password: str = Form(...)
):
    """Register a new user with email/phone and password"""
    if not email and not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone number is required"
        )
    
    contact = email or phone
    
    # Check if user already exists
    existing_user = get_user_by_contact(contact)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )
    
    # Hash password and create user
    password_hash = hash_password(password)
    
    try:
        user_id = create_local_user(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash
        )
        
        # Get the created user
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["id"])}, 
            expires_delta=access_token_expires
        )
        
        # Create response with cookie
        response = JSONResponse(content={
            "message": "User created successfully",
            "user": user,
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login")
async def login(
    contact: str = Form(...),
    password: str = Form(...)
):
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

@router.post("/google")
async def google_signin(token: str = Form(...)):
    """Sign in or sign up with Google"""
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
            # User exists, log them in
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
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_data["id"])}, 
            expires_delta=access_token_expires
        )
        
        # Create response with cookie
        response = JSONResponse(content={
            "message": "Google sign-in successful",
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
    
    return response
