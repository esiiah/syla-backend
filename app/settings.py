import os
from dotenv import load_dotenv

# Always load /app/.env (Docker copies it there)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# === Core Application Settings ===
DATABASE_PUBLIC_URL = os.getenv("DATABASE_PUBLIC_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
VITE_API_BASE_URL = os.getenv("VITE_API_BASE_URL", "http://localhost:8000/api")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", FRONTEND_URL)

# === Security ===
JWT_SECRET = os.getenv("JWT_SECRET")

# === Google OAuth ===
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REACT_APP_GOOGLE_CLIENT_ID = os.getenv("REACT_APP_GOOGLE_CLIENT_ID")

# === AI / OpenAI ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_DEFAULT_MODEL = os.getenv("AI_DEFAULT_MODEL", "gpt-4o-mini")
AI_ENABLED = os.getenv("AI_ENABLED", "true").lower() == "true"
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", 30))
AI_RATE_LIMIT_PER_HOUR = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", 50))

# === Email / Notifications ===
SMTP_ENABLED = os.getenv("SMTP_ENABLED", "false").lower() == "true"
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Syla Analytics")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

# === Redis / Caching ===
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
AI_CACHE_ENABLED = os.getenv("AI_CACHE_ENABLED", "true").lower() == "true"
AI_CACHE_TTL_MINUTES = int(os.getenv("AI_CACHE_TTL_MINUTES", 30))

# === Rate Limiting & Cost Control ===
AI_RATE_LIMIT_PER_DAY = int(os.getenv("AI_RATE_LIMIT_PER_DAY", 200))
AI_DAILY_COST_LIMIT = float(os.getenv("AI_DAILY_COST_LIMIT", 10.0))
AI_MONTHLY_COST_LIMIT = float(os.getenv("AI_MONTHLY_COST_LIMIT", 100.0))
AI_COST_ALERTS = os.getenv("AI_COST_ALERTS", "true").lower() == "true"
AI_COST_ALERT_THRESHOLD = int(os.getenv("AI_COST_ALERT_THRESHOLD", 80))
TRACK_AI_USAGE = os.getenv("TRACK_AI_USAGE", "true").lower() == "true"
USAGE_RESET_TIMEZONE = os.getenv("USAGE_RESET_TIMEZONE", "UTC")
