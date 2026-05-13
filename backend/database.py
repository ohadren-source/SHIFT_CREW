import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# Get DATABASE_URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./shift_crew.db")

# Create engine
if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency injection for database session in FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
