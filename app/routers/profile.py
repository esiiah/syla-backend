# app/routers/profile.py
import os
import time
import shutil
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.utils import get_current_user_from_token, hash_password, verify_password
from app.routers import db  # import your DB helpers

router = APIRouter(prefix="/api/profile", tags=["profile"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----- GET PROFILE -----
@router.get("")
def get_profile(request: Request):
    user_info = get_current_user_from_token(request)
    if not user_info:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.get_user_by_id(user_info["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return JSONResponse(content=user)


# ----- UPDATE PROFILE -----
@router.put("")
async def update_profile(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    contact: str = Form(...),
    bio: str = Form(""),
    location: str = Form(""),
    website: str = Form(""),
    company: str = Form(""),
    job_title: str = Form(""),
    birth_date: str = Form(""),
    gender: str = Form(""),
    language: str = Form("en"),
    timezone: str = Form("UTC"),
    avatar: UploadFile = File(None)
):
    user_info = get_current_user_from_token(request)
    if not user_info:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # fetch DB user
    with db.SessionLocal() as session:
        user = session.query(db.User).filter(db.User.id == user_info["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # update basic fields
        user.name = name
        user.email = email if email else user.email
        user.phone = contact if contact else user.phone
        
        # update extended profile fields
        user.bio = bio
        user.location = location
        user.website = website
        user.company = company
        user.job_title = job_title
        user.birth_date = birth_date
        user.gender = gender
        user.language = language
        user.timezone = timezone

        if avatar and avatar.filename:
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            if avatar.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
            
            # Validate file size (5MB limit)
            if hasattr(avatar, 'size') and avatar.size > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
            
            filename = f"{int(time.time() * 1000)}_{avatar.filename}"
            path = os.path.join(UPLOAD_DIR, filename)
            
            try:
                with open(path, "wb") as f:
                    content = await avatar.read()
                    f.write(content)
                user.avatar_url = f"/api/files/{filename}"
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to save avatar: {str(e)}")

        try:
            session.commit()
            session.refresh(user)
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

    return JSONResponse(content=db._serialize_user(user))


# ----- CHANGE PASSWORD -----
@router.post("/change-password")
async def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...)
):
    user_info = get_current_user_from_token(request)
    if not user_info:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    with db.SessionLocal() as session:
        user = session.query(db.User).filter(db.User.id == user_info["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.password_hash:
            raise HTTPException(status_code=400, detail="No password set for this account")

        if not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        user.password_hash = hash_password(new_password)
        
        try:
            session.commit()
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

    return JSONResponse(content={"message": "Password changed successfully"})


# ----- DELETE AVATAR -----
@router.delete("/avatar")
def delete_avatar(request: Request):
    user_info = get_current_user_from_token(request)
    if not user_info:
        raise HTTPException(status_code=401, detail="Not authenticated")

    with db.SessionLocal() as session:
        user = session.query(db.User).filter(db.User.id == user_info["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Remove avatar file if it exists
        if user.avatar_url and user.avatar_url.startswith("/api/files/"):
            filename = user.avatar_url.replace("/api/files/", "")
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass  # Continue even if file deletion fails

        user.avatar_url = None
        
        try:
            session.commit()
            session.refresh(user)
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete avatar: {str(e)}")

    return JSONResponse(content=db._serialize_user(user))
