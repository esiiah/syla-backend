# app/routers/pricing.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from .auth import require_auth, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pricing", tags=["pricing"])

# ==================== MODELS ====================

class SubscriptionRequest(BaseModel):
    plan: str = Field(..., regex="^(free|professional|business)$")
    billing_cycle: str = Field(..., regex="^(monthly|yearly)$")
    payment_method: Optional[str] = None

class UsageLimits(BaseModel):
    plan: str
    ai_forecasts_used: int
    ai_forecasts_limit: int
    uploads_used: int
    uploads_limit: int
    api_calls_used: int
    api_calls_limit: int

# ==================== PRICING DATA ====================

PRICING_PLANS = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "limits": {
            "ai_forecasts_per_month": 50,
            "file_size_mb": 10,
            "api_calls_per_day": 0,
            "team_members": 1,
            "data_retention_days": 30
        },
        "features": [
            "Unlimited file uploads (10MB each)",
            "Basic data visualizations",
            "50 AI forecast requests/month",
            "All file conversion tools",
            "CSV & PNG export",
            "Community support"
        ]
    },
    "professional": {
        "name": "Professional",
        "price_monthly": 12,
        "price_yearly": 120,
        "limits": {
            "ai_forecasts_per_month": 500,
            "file_size_mb": 50,
            "api_calls_per_day": 1000,
            "team_members": 1,
            "data_retention_days": 90
        },
        "features": [
            "Everything in Free, plus:",
            "Unlimited file uploads (50MB each)",
            "500 AI forecast requests/month",
            "Advanced chart customization",
            "Priority AI processing queue",
            "SVG, PDF, JSON export",
            "Email support (24h response)",
            "API access (1000 calls/day)",
            "Remove Syla branding",
            "Chart templates & themes"
        ]
    },
    "business": {
        "name": "Business",
        "price_monthly": 49,
        "price_yearly": 490,
        "limits": {
            "ai_forecasts_per_month": -1,  # unlimited
            "file_size_mb": 500,
            "api_calls_per_day": -1,  # unlimited
            "team_members": 10,
            "data_retention_days": 365
        },
        "features": [
            "Everything in Professional, plus:",
            "Unlimited AI forecast requests",
            "Unlimited file uploads (500MB each)",
            "Custom AI model training",
            "Team collaboration (10 users)",
            "Dedicated support (4h response)",
            "Priority phone support",
            "API access (unlimited)",
            "Custom integrations",
            "Advanced forecasting models",
            "White-label options",
            "SLA guarantee"
        ]
    }
}

# ==================== PRICING ENDPOINTS ====================

@router.get("/plans")
async def get_pricing_plans():
    """Get all pricing plans and their features"""
    return {
        "plans": PRICING_PLANS,
        "currency": "USD",
        "billing_cycles": ["monthly", "yearly"],
        "trial_days": 14,
        "money_back_guarantee_days": 14,
        "yearly_discount_percent": 17
    }

@router.get("/plans/{plan_id}")
async def get_pricing_plan(plan_id: str):
    """Get details for a specific pricing plan"""
    if plan_id not in PRICING_PLANS:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
    
    return {
        "plan": PRICING_PLANS[plan_id],
        "plan_id": plan_id
    }

@router.get("/compare")
async def compare_plans():
    """Get detailed plan comparison data"""
    comparison_features = [
        {
            "category": "Data Processing",
            "features": [
                {"name": "File upload size", "free": "10MB", "professional": "50MB", "business": "500MB"},
                {"name": "Monthly uploads", "free": "Unlimited", "professional": "Unlimited", "business": "Unlimited"},
                {"name": "Supported formats", "free": "CSV, Excel, PDF", "professional": "CSV, Excel, PDF", "business": "CSV, Excel, PDF + Custom"},
                {"name": "Data retention", "free": "30 days", "professional": "90 days", "business": "1 year"}
            ]
        },
        {
            "category": "AI Forecasting",
            "features": [
                {"name": "Monthly forecast requests", "free": "50", "professional": "500", "business": "Unlimited"},
                {"name": "Forecast horizon", "free": "12 periods", "professional": "120 periods", "business": "Unlimited"},
                {"name": "Model selection", "free": "Basic", "professional": "All models", "business": "All + Custom"},
                {"name": "Processing priority", "free": "Standard", "professional": "High", "business": "Highest"}
            ]
        },
        {
            "category": "Visualization",
            "features": [
                {"name": "Chart types", "free": "5 basic", "professional": "15 advanced", "business": "All + Custom"},
                {"name": "Custom themes", "free": "No", "professional": "Yes", "business": "Yes + Templates"},
                {"name": "Export formats", "free": "CSV, PNG", "professional": "CSV, PNG, SVG, PDF", "business": "All formats"},
                {"name": "Resolution", "free": "Standard", "professional": "High (300 DPI)", "business": "Ultra (600 DPI)"}
            ]
        },
        {
            "category": "Support & API",
            "features": [
                {"name": "Support channel", "free": "Community", "professional": "Email", "business": "Email + Phone"},
                {"name": "Response time", "free": "Best effort", "professional": "24 hours", "business": "4 hours"},
                {"name": "API access", "free": "No", "professional": "1000 calls/day", "business": "Unlimited"},
                {"name": "Documentation", "free": "Public docs", "professional": "Public docs", "business": "Private docs"}
            ]
        }
    ]
    
    return {
        "comparison": comparison_features,
        "plans": ["free", "professional", "business"]
    }

@router.post("/subscribe")
async def create_subscription(
    request: SubscriptionRequest,
    current_user: dict = Depends(require_auth)
):
    """Create or update a subscription"""
    user_id = current_user.get("id")
    
    if request.plan not in PRICING_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")
    
    plan_details = PRICING_PLANS[request.plan]
    
    # Handle free plan (downgrade)
    if request.plan == "free":
        logger.info(f"User {user_id} downgraded to free plan")
        return {
            "success": True,
            "message": "Successfully downgraded to Free plan",
            "plan": "free",
            "effective_date": datetime.now().isoformat(),
            "features_retained": plan_details["features"]
        }
    
    # TODO: Integrate with payment provider (Stripe, PayPal, etc.)
    # For now, return mock subscription data
    logger.info(f"User {user_id} subscribing to {request.plan} ({request.billing_cycle})")
    
    price = plan_details[f"price_{request.billing_cycle}"]
    trial_end = datetime.now() + timedelta(days=14)
    
    return {
        "success": True,
        "message": f"Subscription to {request.plan.title()} plan initiated",
        "plan": request.plan,
        "billing_cycle": request.billing_cycle,
        "price": price,
        "currency": "USD",
        "trial_ends": trial_end.isoformat(),
        "next_billing_date": trial_end.isoformat(),
        "payment_method": request.payment_method,
        "subscription_id": f"sub_{user_id}_{int(datetime.now().timestamp())}",
        "features": plan_details["features"]
    }

@router.get("/usage")
async def get_usage_limits(current_user: dict = Depends(require_auth)):
    """Get current user's usage statistics and limits"""
    user_id = current_user.get("id")
    
    # TODO: Fetch actual usage from database
    # For now, return mock data based on user's plan
    user_plan = current_user.get("plan", "free")
    
    if user_plan not in PRICING_PLANS:
        user_plan = "free"
    
    plan_limits = PRICING_PLANS[user_plan]["limits"]
    
    # Mock usage data - replace with actual database queries
    usage = UsageLimits(
        plan=user_plan,
        ai_forecasts_used=23,
        ai_forecasts_limit=plan_limits["ai_forecasts_per_month"],
        uploads_used=147,
        uploads_limit=-1,  # unlimited uploads
        api_calls_used=450 if plan_limits["api_calls_per_day"] > 0 else 0,
        api_calls_limit=plan_limits["api_calls_per_day"]
    )
    
    # Calculate reset date (first day of next month)
    now = datetime.now()
    if now.month == 12:
        reset_date = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0)
    else:
        reset_date = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0)
    
    return {
        "usage": usage.dict(),
        "reset_date": reset_date.isoformat(),
        "upgrade_available": user_plan == "free",
        "plan_details": PRICING_PLANS[user_plan]
    }

@router.delete("/subscription")
async def cancel_subscription(current_user: dict = Depends(require_auth)):
    """Cancel current subscription"""
    user_id = current_user.get("id")
    user_plan = current_user.get("plan", "free")
    
    if user_plan == "free":
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # TODO: Cancel via payment provider (Stripe, etc.)
    logger.info(f"User {user_id} canceling {user_plan} subscription")
    
    access_until = datetime.now() + timedelta(days=30)
    plan_details = PRICING_PLANS[user_plan]
    
    return {
        "success": True,
        "message": "Subscription canceled successfully",
        "canceled_plan": user_plan,
        "access_until": access_until.isoformat(),
        "refund_eligible": True,
        "refund_amount": plan_details["price_monthly"],
        "downgrade_to": "free",
        "effective_date": access_until.isoformat()
    }

@router.get("/discounts")
async def get_available_discounts():
    """Get available discounts and promotions"""
    return {
        "student_discount": {
            "percent": 50,
            "description": "50% off for students and educators",
            "verification_required": "Valid .edu email address",
            "applies_to": ["professional", "business"]
        },
        "annual_discount": {
            "percent": 17,
            "description": "Save 17% with annual billing",
            "applies_to": ["professional", "business"]
        },
        "nonprofit_discount": {
            "percent": 30,
            "description": "30% off for registered nonprofits",
            "verification_required": "Nonprofit registration documents",
            "applies_to": ["professional", "business"]
        }
    }

@router.get("/health")
async def pricing_health_check():
    """Health check for pricing endpoints"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "pricing"
    }
