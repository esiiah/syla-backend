# app/auth.py - NEW FILE
import os
import jwt
import bcrypt
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize database on import
init_db()

# Request/Response Models
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('contact')
    def validate_contact(cls, v, values):
        contact_type = values.get('contact_type', 'email')
        if contact_type == 'email':
            # Basic email validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize database on import
init_db()

# Request/Response Models
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('contact')
    def validate_contact(cls, v, values):
        contact_type = values.get('contact_type', 'email')
        if contact_type == 'email':
            # Basic email validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
    
            if not re.match(email_pattern, v):
                raise ValueError('Invalid email format')
        elif contact_type == 'phone':
            # Basic phone validation (digits, +, -, spaces allowed)
            phone_pattern = r'^[\+\d\-\s\(\)]{10,}
    
            if not re.match(phone_pattern, v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')):
                raise ValueError('Invalid phone number format')
        return v.strip()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
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

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_contact(contact: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Try email first, then phone
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (contact, contact))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "phone": user[3],
            "password_hash": user[4],
            "created_at": user[5],
            "updated_at": user[6]
        }
    return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "created_at": user[5]
    }

# Routes
@router.post("/signup")
async def signup(request: SignupRequest):
    # Check if user already exists
    existing_user = get_user_by_contact(request.contact)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Insert user into database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        else:  # phone
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Return user data
        user_data = {
            "id": user_id,
            "name": request.name,
            "email": request.contact if request.contact_type == "email" else None,
            "phone": request.contact if request.contact_type == "phone" else None,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
    
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.post("/login")
async def login(request: LoginRequest):
    # Find user by contact
    user = get_user_by_contact(request.contact)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Return user data (without password hash)
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "created_at": user["created_at"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout():
    # JWT tokens are stateless, so we just return success
    # Client should remove the token from storage
    return {"message": "Successfully logged out"}
    
            if not re.match(email_pattern, v):
                raise ValueError('Invalid email format')
        elif contact_type == 'phone':
            # Basic phone validation (digits, +, -, spaces allowed)
            phone_pattern = r'^[\+\d\-\s\(\)]{10,}

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize database on import
init_db()

# Request/Response Models
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('contact')
    def validate_contact(cls, v, values):
        contact_type = values.get('contact_type', 'email')
        if contact_type == 'email':
            # Basic email validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
    
            if not re.match(email_pattern, v):
                raise ValueError('Invalid email format')
        elif contact_type == 'phone':
            # Basic phone validation (digits, +, -, spaces allowed)
            phone_pattern = r'^[\+\d\-\s\(\)]{10,}
    
            if not re.match(phone_pattern, v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')):
                raise ValueError('Invalid phone number format')
        return v.strip()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
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

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_contact(contact: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Try email first, then phone
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (contact, contact))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "phone": user[3],
            "password_hash": user[4],
            "created_at": user[5],
            "updated_at": user[6]
        }
    return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "created_at": user[5]
    }

# Routes
@router.post("/signup")
async def signup(request: SignupRequest):
    # Check if user already exists
    existing_user = get_user_by_contact(request.contact)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Insert user into database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        else:  # phone
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Return user data
        user_data = {
            "id": user_id,
            "name": request.name,
            "email": request.contact if request.contact_type == "email" else None,
            "phone": request.contact if request.contact_type == "phone" else None,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
    
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.post("/login")
async def login(request: LoginRequest):
    # Find user by contact
    user = get_user_by_contact(request.contact)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Return user data (without password hash)
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "created_at": user["created_at"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout():
    # JWT tokens are stateless, so we just return success
    # Client should remove the token from storage
    return {"message": "Successfully logged out"}
    
            if not re.match(phone_pattern, v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')):
                raise ValueError('Invalid phone number format')
        return v.strip()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
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

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_contact(contact: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Try email first, then phone
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (contact, contact))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "phone": user[3],
            "password_hash": user[4],
            "created_at": user[5],
            "updated_at": user[6]
        }
    return None

def get_current_user(request: Request):
    """Get current user from cookie or Authorization header"""
    token = None
    
    # Try to get token from cookie first
    token = request.cookies.get("auth_token")
    
    # If no cookie, try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        return None
    
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "created_at": user[5]
    }

# Routes
@router.post("/signup")
async def signup(request: SignupRequest, response: Response):
    # Check if user already exists
    existing_user = get_user_by_contact(request.contact)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Insert user into database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        else:  # phone
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Set HTTP-only cookie
        response.set_cookie(
            key="auth_token",
            value=access_token,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 7 days in seconds
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )
        
        # Return user data
        user_data = {
            "id": user_id,
            "name": request.name,
            "email": request.contact if request.contact_type == "email" else None,
            "phone": request.contact if request.contact_type == "phone" else None,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
    
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.post("/login")
async def login(request: LoginRequest, response: Response):
    # Find user by contact
    user = get_user_by_contact(request.contact)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Set HTTP-only cookie
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 7 days in seconds
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    # Return user data (without password hash)
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "created_at": user["created_at"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_current_user_info(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.post("/logout")
async def logout(response: Response):
    # Clear the auth cookie
    response.delete_cookie(key="auth_token")
    return {"message": "Successfully logged out"}

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize database on import
init_db()

# Request/Response Models
class SignupRequest(BaseModel):
    name: str
    contact: str  # email or phone
    password: str
    confirm_password: str
    contact_type: str = "email"  # "email" or "phone"
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('contact')
    def validate_contact(cls, v, values):
        contact_type = values.get('contact_type', 'email')
        if contact_type == 'email':
            # Basic email validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
    
            if not re.match(email_pattern, v):
                raise ValueError('Invalid email format')
        elif contact_type == 'phone':
            # Basic phone validation (digits, +, -, spaces allowed)
            phone_pattern = r'^[\+\d\-\s\(\)]{10,}
    
            if not re.match(phone_pattern, v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')):
                raise ValueError('Invalid phone number format')
        return v.strip()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
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

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_contact(contact: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Try email first, then phone
    cursor.execute("SELECT * FROM users WHERE email = ? OR phone = ?", (contact, contact))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "phone": user[3],
            "password_hash": user[4],
            "created_at": user[5],
            "updated_at": user[6]
        }
    return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "phone": user[3],
        "created_at": user[5]
    }

# Routes
@router.post("/signup")
async def signup(request: SignupRequest):
    # Check if user already exists
    existing_user = get_user_by_contact(request.contact)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Insert user into database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if request.contact_type == "email":
            cursor.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        else:  # phone
            cursor.execute(
                "INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)",
                (request.name, request.contact, password_hash)
            )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Return user data
        user_data = {
            "id": user_id,
            "name": request.name,
            "email": request.contact if request.contact_type == "email" else None,
            "phone": request.contact if request.contact_type == "phone" else None,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
    
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email/phone already exists")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.post("/login")
async def login(request: LoginRequest):
    # Find user by contact
    user = get_user_by_contact(request.contact)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Return user data (without password hash)
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "created_at": user["created_at"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout():
    # JWT tokens are stateless, so we just return success
    # Client should remove the token from storage
    return {"message": "Successfully logged out"}
