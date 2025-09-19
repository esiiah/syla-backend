# app/auth.py
import os
import re
import jwt
import bcrypt
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# Database setup
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


# Pydantic models
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
            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            if not re.match(email_pattern, v):
                raise ValueError("Invalid email format")
        elif contact_type == "phone":
            # Normalize and validate digits + optional + - spaces parentheses
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


class GoogleAuthRequest(BaseModel):
    token: str  # Google ID token


# Utilities
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": data.get("sub")})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    # In PyJWT >=2.0 jwt.encode returns a str. If bytes, decode.
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn


def get_user_by_contact(contact: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (contact, contact))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "password_hash": user[4],
        "google_id": user[5],
        "avatar_url": user[6],
        "auth_provider": user[7],
        "created_at": user[8],
        "updated_at": user[9] if len(user) > 9 else None,
    }


def get_user_by_id(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "password_hash": user[4],
        "google_id": user[5],
        "avatar_url": user[6],
        "auth_provider": user[7],
        "created_at": user[8],
        "updated_at": user[9] if len(user) > 9 else None,
    }


def get_user_by_google_id(google_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return None
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "password_hash": user[4],
        "google_id": user[5],
        "avatar_url": user[6],
        "auth_provider": user[7],
        "created_at": user[8],
        "updated_at": user[9] if len(user) > 9 else None,
    }


def verify_google_token(token: str):
    """
    Verify a Google ID token via Google's tokeninfo endpoint.
    Returns dict with 'google_id','email','name','avatar_url' on success, otherwise None.
    """
    try:
        # tokeninfo endpoint is simple and doesn't require client secret for ID token validation.
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            return None
        data = resp.json()
        # Validate audience if a client id is configured
        if GOOGLE_CLIENT_ID and data.get("aud") != GOOGLE_CLIENT_ID:
            return None
        return {
            "google_id": data.get("sub"),
            "email": data.get("email"),
            "name": data.get("name") or data.get("email").split("@")[0],
            "avatar_url": data.get("picture"),
        }
    except Exception:
        return None


# Dependency to get current user from Authorization header (Bearer token)
def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# Helper: read token from cookies or Authorization header
def get_current_user_from_request(request: Request):
    # check cookie first
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

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = get_user_by_id(int(user_id))
    return user


# Routes
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

    access_token = create_access_token({"sub": user_id})
    # Set HTTP-only cookie (secure flag should be True in production with HTTPS)
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

    access_token = create_access_token({"sub": user["id"]})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )

    # Return user object (omit password_hash)
    user_resp = get_user_by_id(user["id"])
    return {"access_token": access_token, "token_type": "bearer", "user": user_resp}


@router.get("/me")
async def get_current_user_info(user=Depends(get_current_user_from_token)):
    # Using dependency that requires a bearer token
    return user


@router.post("/logout")
async def logout(response: Response):
    # Clear the auth cookie
    response.delete_cookie(key="auth_token")
    return {"message": "Successfully logged out"}


@router.post("/google")
async def google_auth(request: GoogleAuthRequest, response: Response):
    google_user = verify_google_token(request.token)
    if not google_user:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # Check existing user by google_id or email
    user = None
    if google_user.get("google_id"):
        user = get_user_by_google_id(google_user["google_id"])
    if not user and google_user.get("email"):
        # maybe previously signed up with same email (local)
        existing = get_user_by_contact(google_user["email"])
        if existing:
            # attach google id if not already set
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "UPDATE users SET google_id = ?, avatar_url = ?, auth_provider = 'google' WHERE id = ?",
                    (google_user["google_id"], google_user.get("avatar_url"), existing["id"]),
                )
                conn.commit()
            except Exception:
                conn.rollback()
            finally:
                conn.close()
            user = get_user_by_id(existing["id"])

    # If still not found, create a new user record using google info
    if not user:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (name, email, google_id, avatar_url, auth_provider) VALUES (?, ?, ?, ?, 'google')",
                (
                    google_user.get("name"),
                    google_user.get("email"),
                    google_user.get("google_id"),
                    google_user.get("avatar_url"),
                ),
            )
            user_id = cursor.lastrowid
            conn.commit()
        except Exception:
            conn.rollback()
            conn.close()
            raise HTTPException(status_code=500, detail="Failed to create user")
        conn.close()
        user = get_user_by_id(user_id)

    # Issue token & set cookie
    access_token = create_access_token({"sub": user["id"]})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=(os.getenv("ENV") == "production"),
        samesite="lax",
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user}
