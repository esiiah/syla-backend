# app/routers/profile.py
import os
from typing import Optional
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, status
from fastapi import Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.routers import db
from app import utils

router = APIRouter(prefix="/api/profile", tags=["profile"])

# Directory to save uploaded avatars (ensure exists)
AVATAR_UPLOAD_DIR = os.getenv("AVATAR_UPLOAD_DIR", "./static/avatars")
os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)


class ProfileUpdateResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    website: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    birth_date: Optional[str]
    gender: Optional[str]
    language: Optional[str]
    timezone: Optional[str]


def _require_user_from_request(request: Request):
    payload = utils.get_current_user_from_request(request)
    if not payload or not payload.get("user_id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return int(payload["user_id"])


@router.put("", status_code=200, response_model=ProfileUpdateResponse)
async def update_profile(
    request: Request,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),  # frontend may send phone as "contact"
    phone: Optional[str] = Form(None),
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
    """
    Update profile fields and optional avatar file upload.
    Requires authentication (cookie or Bearer header).
    """
    user_id = _require_user_from_request(request)
    # Load user via SQLAlchemy session and update fields
    from app.routers.db import SessionLocal, User
    session = SessionLocal()
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        session.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # update fields only if present (preserve existing else)
    if name is not None:
        user.name = name
    if email is not None:
        user.email = email or user.email
    if phone is not None:
        user.phone = phone or user.phone
    if contact and not phone:
        user.phone = contact or user.phone

    user.bio = bio if bio is not None else user.bio
    user.location = location if location is not None else user.location
    user.website = website if website is not None else user.website
    user.company = company if company is not None else user.company
    user.job_title = job_title if job_title is not None else user.job_title
    user.birth_date = birth_date if birth_date is not None else user.birth_date
    user.gender = gender if gender is not None else user.gender
    user.language = language if language is not None else user.language
    user.timezone = timezone if timezone is not None else user.timezone

    # Avatar upload handling
    if avatar:
        # sanitize file name and save
        filename = f"user_{user_id}_{int(os.times().system*100000)}_{avatar.filename}"
        filepath = os.path.join(AVATAR_UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            content = await avatar.read()
            f.write(content)
        # assign accessible URL (assumes static served from /static)
        user.avatar_url = f"/static/avatars/{filename}"

    user.updated_at = user.updated_at  # trigger update timestamp if using DB onupdate
    session.add(user)
    session.commit()
    session.refresh(user)
    result = db.get_user_by_id(user_id)
    session.close()
    return JSONResponse(content=result)


@router.delete("/avatar", status_code=200)
def remove_avatar(request: Request):
    user_id = _require_user_from_request(request)
    from app.routers.db import SessionLocal, User
    session = SessionLocal()
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        session.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.avatar_url = None
    session.add(user)
    session.commit()
    session.refresh(user)
    result = db.get_user_by_id(user_id)
    session.close()
    return JSONResponse(content=result)


@router.post("/change-password")
def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
):
    user_id = _require_user_from_request(request)
    from app.routers.db import SessionLocal, User
    session = SessionLocal()
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        session.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # verify current password
    if not utils.verify_password(current_password, user.password_hash):
        session.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    if len(new_password) < 6:
        session.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password too short")

    user.password_hash = utils.hash_password(new_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    result = db.get_user_by_id(user_id)
    session.close()
    return JSONResponse(content={"detail": "Password changed", "user": result})
