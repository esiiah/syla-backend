# app/settings.py
import os
from dotenv import load_dotenv, find_dotenv

# Locate .env (for local dev only; in production, use platform env vars)
dotenv_file = find_dotenv(usecwd=True)
if dotenv_file:
    load_dotenv(dotenv_file)

# Core settings
DATABASE_PUBLIC_URL = os.getenv("DATABASE_PUBLIC_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")

VITE_API_BASE_URL = os.getenv("VITE_API_BASE_URL", "http://localhost:8000/api")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
