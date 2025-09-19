# app/auth.py
import os
import re
import sqlite3
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel, validator

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            avatar_url TEXT,
            auth_provider TEXT DEFAULT 'local',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    conn.commit()
    conn.close()


init_db()


# ---------------- Pydantic models ----------------
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"

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
            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$"
            if not re.match(email_pattern, v):
                raise ValueError("Invalid email format")
        elif contact_type == "phone":
            cleaned = re.sub(r"[ \-\(\)]", "", v)
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
    contact: str  # email or phone
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    created_at: str
    auth_provider: Optional[str] = "local"
    avatar_url: Optional[str] = None


# ---------------- Utilities ----------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    # PyJWT returns str for >=2.x
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def get_db_connection():
    return sqlite3.connect(DB_PATH)


def get_user_by_contact(contact: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, password_hash, auth_provider, avatar_url, created_at FROM users WHERE email = ? OR phone = ?", (contact, contact))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = ["id", "name", "email", "phone", "password_hash", "auth_provider", "avatar_url", "created_at"]
    return dict(zip(keys, row))


def get_user_by_id(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, auth_provider, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = ["id", "name", "email", "phone", "auth_provider", "avatar_url", "created_at"]
    return dict(zip(keys, row))


def get_current_user_from_token(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[len("Bearer ") :]
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    user_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
    if not user_id:
        return None
    try:
        user = get_user_by_id(int(user_id))
    except Exception:
        return None
    return user


# ---------------- Routes ----------------
@router.post("/signup")
async def signup(request: SignupRequest, response: Response):
    # ensure contact uniqueness
    existing = get_user_by_contact(request.contact)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    password_hash = hash_password(request.password)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, auth_provider) VALUES (?, ?, ?, 'local')",
                (request.name, request.contact, password_hash),
            )
        else:
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash, auth_provider) VALUES (?, ?, ?, 'local')",
                (request.name, request.contact, password_hash),
            )
        user_id = cursor.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")
    conn.close()

    access_token = create_access_token({"sub": user_id, "id": user_id})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )
    user = get_user_by_id(user_id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/login")
async def login(request: LoginRequest, response: Response):
    user = get_user_by_contact(request.contact)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({"sub": user["id"], "id": user["id"]})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )
    user_resp = get_user_by_id(user["id"])
    return {"access_token": access_token, "token_type": "bearer", "user": user_resp}


@router.get("/me")
async def get_current_user_info(request: Request):
    user = get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
