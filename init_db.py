#!/usr/bin/env python3
"""
Database initialization script
Run this before starting the app: python init_db.py
"""
import os
from app.database import Base, engine

def init_database():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database()
