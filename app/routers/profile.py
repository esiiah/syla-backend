# app/routers/profile.py
import os
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.utils import get_current_user_from_token, hash_password
import shutil

router = APIRouter(prefix="/api/profile", tags=["profile"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----- GET PROFILE -----
@router.get("")
def get_profile(request: Request):
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Example: replace this with real DB query
    return JSONResponse(
        content={
            "name": "John Doe",
            "email": "john@example.com",
            "contact": "+123456789",
            "avatar_url": "/api/files/default_avatar.png",
        }
    )


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
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    update_data = {
        "name": name,
        "email": email,
        "contact": contact,
    }

    if password:
        update_data["password"] = hash_password(password)

    if avatar:
        # Save avatar file
        filename = f"{int(time.time()*1000)}_{avatar.filename}"
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(avatar.file, f)
        update_data["avatar_url"] = f"/api/files/{filename}"

    # Here: actually update the user in DB
    # e.g., db.update_user(user["id"], update_data)

    return JSONResponse(
        content={"message": "Profile updated successfully", "profile": update_data}
    )
