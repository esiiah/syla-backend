# app/models/user.py

"""
Re-export the User model from app.routers.db to avoid duplicate table definitions.

This prevents SQLAlchemy InvalidRequestError:
  "Table 'users' is already defined for this MetaData instance."
"""

from app.routers.db import User

__all__ = ["User"]
