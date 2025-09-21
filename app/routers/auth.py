# app/routers/auth.py
import os
from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel, validator
from typing import Optional

from app import utils
from . import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    contact: str
    password: str
    confirm_password: str
    contact_type: str = "email"

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
            import re
            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$"
            if not re.match(email_pattern, v):
                raise ValueError("Invalid email format")
        else:
            import re
            cleaned = v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
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
    contact: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


def _set_auth_cookie(response: Response, access_token: str):
    max_age = int(utils.ACCESS_TOKEN_EXPIRE_MINUTES) * 60 if hasattr(utils, "ACCESS_TOKEN_EXPIRE_MINUTES") else 3600
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )


@router.post("/signup")
async def signup(req: SignupRequest, response: Response):
    # check existing by contact (email/phone)
    existing = db.get_user_by_contact(req.contact)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")

    password_hash = utils.hash_password(req.password)
    try:
        user_id = db.create_local_user(
            req.name,
            req.contact if req.contact_type == "email" else None,
            req.contact if req.contact_type == "phone" else None,
            password_hash,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create user")

    access_token = utils.create_access_token({"sub": user_id, "id": user_id})
    _set_auth_cookie(response, access_token)
    user = db.get_user_by_id(user_id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    user = db.get_user_with_hash_by_contact(req.contact)
    if not user or not user.get("_password_hash"):
        # do not reveal which part failed
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # verify password using utils (expects plain password + stored hash)
    if not utils.verify_password(req.password, user.get("_password_hash")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = utils.create_access_token({"sub": user["id"], "id": user["id"]})
    _set_auth_cookie(response, access_token)

    # fetch latest sanitized user (without password)
    user_resp = db.get_user_by_id(user["id"])
    return {"access_token": access_token, "token_type": "bearer", "user": user_resp}


@router.post("/google")
async def google_auth(body: GoogleAuthRequest, response: Response):
    try:
        google_user = utils.verify_google_token(body.credential)
        if not google_user or not google_user.get("google_id"):
            raise HTTPException(status_code=400, detail="Invalid Google token")

        existing_user = db.get_user_by_google_id(google_user["google_id"])

        if existing_user:
            user_id = existing_user["id"]
        else:
            # if email exists, link; else create new
            existing_email_user = db.get_user_by_contact(google_user.get("email")) if google_user.get("email") else None
            if existing_email_user:
                db.link_google_to_user(existing_email_user["id"], google_user["google_id"], google_user.get("avatar_url"))
                user_id = existing_email_user["id"]
            else:
                user_id = db.create_google_user(
                    google_user.get("name") or "Google User",
                    google_user.get("email"),
                    google_user.get("google_id"),
                    google_user.get("avatar_url"),
                )

        access_token = utils.create_access_token({"sub": user_id, "id": user_id})
        _set_auth_cookie(response, access_token)
        user = db.get_user_by_id(user_id)
        return {"access_token": access_token, "token_type": "bearer", "user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google authentication failed: {str(e)}")


@router.get("/me")
async def get_current_user_info(request: Request):
    user = utils.get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
