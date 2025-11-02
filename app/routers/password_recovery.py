# app/routers/password_recovery.py
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, validator

from app import utils
from . import db
from sqlalchemy import Column, String, DateTime
from .db import Base, SessionLocal, engine

router = APIRouter(prefix="/api/auth", tags=["password_recovery"])

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(String, primary_key=True)  # token itself as ID
    user_id = Column(String, nullable=False)
    contact = Column(String, nullable=False)  # email or phone
    expires_at = Column(DateTime, nullable=False)
    used = Column(String, default="false")  # SQLite doesn't have boolean
    created_at = Column(DateTime, default=datetime.utcnow)

# Create the table
#Base.metadata.create_all(bind=engine)

class ForgotPasswordRequest(BaseModel):
    contact: str  # email or phone

    @validator("contact")
    def validate_contact(cls, v: str):
        v = v.strip().lower()
        if not v:
            raise ValueError("Email or phone is required")
        return v

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @validator("new_password")
    def validate_password(cls, v: str):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v

def send_reset_email(email: str, token: str, name: str = "User"):
    """Send password reset email (mock implementation)"""
    try:
        # In production, use a proper email service like SendGrid, AWS SES, etc.
        reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
        
        # For development, just log the email content
        email_content = f"""
        Hi {name},
        
        You requested a password reset for your Syla Analytics account.
        
        Click the link below to reset your password:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        Syla Analytics Team
        """
        
        print(f"[EMAIL MOCK] Sending to {email}:")
        print(email_content)
        print("-" * 50)
        
        # TODO: Implement actual email sending here
        # smtp_server = os.getenv("SMTP_SERVER")
        # smtp_port = int(os.getenv("SMTP_PORT", 587))
        # smtp_user = os.getenv("SMTP_USER")
        # smtp_pass = os.getenv("SMTP_PASS")
        
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def send_reset_sms(phone: str, token: str):
    """Send password reset SMS (mock implementation)"""
    try:
        # In production, use Twilio, AWS SNS, etc.
        reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
        
        sms_content = f"Reset your Syla Analytics password: {reset_link} (expires in 1 hour)"
        
        print(f"[SMS MOCK] Sending to {phone}:")
        print(sms_content)
        print("-" * 50)
        
        # TODO: Implement actual SMS sending here
        return True
    except Exception as e:
        print(f"SMS sending failed: {e}")
        return False

def create_reset_token(user_id: int, contact: str) -> str:
    """Create a password reset token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    with SessionLocal() as session:
        # Clean up old tokens for this user
        session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == str(user_id)
        ).delete()
        
        # Create new token
        reset_token = PasswordResetToken(
            id=token,
            user_id=str(user_id),
            contact=contact,
            expires_at=expires_at
        )
        session.add(reset_token)
        session.commit()
    
    return token

def validate_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate a password reset token"""
    with SessionLocal() as session:
        token_obj = session.query(PasswordResetToken).filter(
            PasswordResetToken.id == token
        ).first()
        
        if not token_obj:
            return None
        
        # Check if expired
        if datetime.utcnow() > token_obj.expires_at:
            return None
        
        # Check if already used
        if token_obj.used == "true":
            return None
        
        return {
            "user_id": int(token_obj.user_id),
            "contact": token_obj.contact,
            "expires_at": token_obj.expires_at
        }

def mark_token_used(token: str):
    """Mark a token as used"""
    with SessionLocal() as session:
        token_obj = session.query(PasswordResetToken).filter(
            PasswordResetToken.id == token
        ).first()
        if token_obj:
            token_obj.used = "true"
            session.commit()

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Send password reset link/SMS"""
    user = db.get_user_by_contact(req.contact)
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If this email/phone is registered, you will receive reset instructions."}
    
    try:
        # Create reset token
        token = create_reset_token(user["id"], req.contact)
        
        # Send reset instructions
        if "@" in req.contact:
            # It's an email
            success = send_reset_email(req.contact, token, user["name"])
        else:
            # It's a phone number
            success = send_reset_sms(req.contact, token)
        
        if not success:
            # Log the error but don't reveal it to prevent information leakage
            print(f"Failed to send reset instructions to {req.contact}")
        
        return {"message": "If this email/phone is registered, you will receive reset instructions."}
    
    except Exception as e:
        print(f"Password reset error: {e}")
        return {"message": "If this email/phone is registered, you will receive reset instructions."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, response: Response):
    """Reset password using token"""
    token_data = validate_reset_token(req.token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    try:
        user_id = token_data["user_id"]
        
        # Update password
        password_hash = utils.hash_password(req.new_password)
        
        with SessionLocal() as session:
            user = session.query(db.User).filter(db.User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=400, detail="User not found")
            
            user.password_hash = password_hash
            user.updated_at = datetime.utcnow()
            session.commit()
        
        # Mark token as used
        mark_token_used(req.token)
        
        # Create new access token and log user in
        access_token = utils.create_access_token({"sub": user_id, "id": user_id})
        
        # Set auth cookie
        max_age = 3600  # 1 hour
        response.set_cookie(
            key="auth_token",
            value=access_token,
            max_age=max_age,
            httponly=True,
            secure=(os.getenv("ENV") == "production"),
            samesite="lax",
        )
        
        # Get user data
        user_data = db.get_user_by_id(user_id)
        
        return {
            "message": "Password reset successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Password reset error: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed")

@router.get("/validate-reset-token/{token}")
async def validate_token_endpoint(token: str):
    """Validate a reset token (for frontend to check before showing reset form)"""
    token_data = validate_reset_token(token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    return {
        "valid": True,
        "contact": token_data["contact"],
        "expires_at": token_data["expires_at"].isoformat()
    }
