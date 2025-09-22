# app/routers/profile.py
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
from . import db
from .. import utils
import os

router = APIRouter(prefix="/api/profile", tags=["profile"])


def get_current_user(request: Request):
    """
    Check Authorization header first, then fallback to cookie.
    Returns user dict or None.
    """
    # 1️⃣ Header check
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        # 2️⃣ Cookie fallback
        token = request.cookies.get("auth_token")

    if not token:
        return None

    try:
        payload = utils.jwt.decode(token, utils.SECRET_KEY, algorithms=[utils.ALGORITHM])
        return {"id": payload.get("id"), "sub": payload.get("sub")}
    except utils.JWTError:
        return None


@router.patch("")
async def update_profile(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    avatar: Optional[UploadFile] = File(None),
):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    avatar_url = user.get("avatar_url")
    if avatar and avatar.filename:
        avatar_url = await utils.save_avatar(avatar, user["id"])

    try:
        db.update_user_profile(user["id"], name, email, phone, avatar_url)
        updated = db.get_user_by_id(user["id"])
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.post("/change-password")
async def change_password(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    full_user = db.get_user_with_hash_by_contact(user.get("email") or user.get("phone"))
    if not full_user or not utils.verify_password(current_password, full_user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    try:
        new_hash = utils.hash_password(new_password)
        db.update_password(user["id"], new_hash)
        return {"message": "Password changed successfully"}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to change password")


@router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    return utils.serve_avatar(filename)
