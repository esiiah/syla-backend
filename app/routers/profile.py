# app/routers/profile.py
import os
import time
import shutil
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.utils import get_current_user_from_token, hash_password
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
    password: str = Form(None),
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

        # update fields
        user.name = name
        user.email = email
        user.phone = contact
        if password:
            user.password_hash = hash_password(password)

        if avatar:
            filename = f"{int(time.time() * 1000)}_{avatar.filename}"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as f:
                shutil.copyfileobj(avatar.file, f)
            user.avatar_url = f"/api/files/{filename}"

        session.commit()
        session.refresh(user)

    return JSONResponse(content=db._serialize_user(user))
