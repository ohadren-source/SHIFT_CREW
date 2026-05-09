⏳_SHIFT_CREW BACKEND

FastAPI application for task management, authentication, and dashboards.


SETUP

Prerequisites:
  - Python 3.9+
  - PostgreSQL 14+
  - pip/venv

1. Create virtual environment:
   python3 -m venv venv
   source venv/bin/activate  (on Windows: venv\Scripts\activate)

2. Install dependencies:
   pip install -r requirements.txt

3. Set up environment variables:
   cp .env.example .env
   # Edit .env with your DATABASE_URL and SECRET_KEY

4. Create database:
   createdb shift_crew

5. Run migrations (when ready):
   alembic upgrade head

6. Seed database with initial data:
   python seed.py

7. Run development server:
   uvicorn main:app --reload

Server will be available at: http://localhost:8000
API docs available at: http://localhost:8000/docs


PROJECT STRUCTURE

main.py
  - FastAPI app initialization
  - Auth endpoints (register, signin, google-auth)
  - Task endpoints (get tasks, submit task entry, carry-over)
  - Dashboard endpoints (daily, weekly)
  - Error handlers

models.py
  - SQLAlchemy ORM models
  - Tables: Role, Facility, Shift, Staff, Task, TaskEntry, CarryOverQueue

database.py
  - Database connection and session management
  - DATABASE_URL from environment variable

auth.py
  - Password hashing (bcrypt)
  - JWT token generation and validation
  - Helper functions for auth flow

schemas.py
  - Pydantic request/response schemas
  - Data validation and serialization

seed.py
  - Database seeding script
  - Populates initial roles, facility, shifts, tasks


API ENDPOINTS (PHASE 1)

AUTH
  POST /auth/register         Register new staff
  POST /auth/signin           Sign in with email/password
  POST /auth/google-callback  Google OAuth (not yet implemented)

TASKS
  GET /tasks                  Get tasks for shift and role
  GET /tasks/carry-over       Get carry-over tasks for next shift
  POST /task-entry            Submit a completed task

DASHBOARD
  GET /dashboard/daily        Daily metrics (under construction)
  GET /dashboard/weekly       Weekly metrics (under construction)

HEALTH
  GET /health                 Health check endpoint


ENVIRONMENT VARIABLES

DATABASE_URL
  PostgreSQL connection string
  Format: postgresql://user:password@host:port/database
  Example: postgresql://postgres:password@localhost:5432/shift_crew

SECRET_KEY
  Secret key for JWT signing
  Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"

GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  Google OAuth credentials (optional for v1, required for Google login)


DEVELOPMENT

Run tests:
  pytest

Check code style:
  flake8 .

Format code:
  black .

Database migrations:
  # Create new migration
  alembic revision --autogenerate -m "Add new column"
  
  # Apply migrations
  alembic upgrade head
  
  # Rollback
  alembic downgrade -1


DEPLOYMENT

For production deployment:

1. Set ENVIRONMENT=production
2. Set DEBUG=False
3. Generate strong SECRET_KEY
4. Configure CORS appropriately (not "*")
5. Use SSL/TLS
6. Set up proper logging
7. Use production-grade PostgreSQL (managed service)
8. Deploy with Gunicorn or similar:
   gunicorn -w 4 -b 0.0.0.0:8000 main:app


COMMON ISSUES

"No module named 'fastapi'"
  → Activate venv and run: pip install -r requirements.txt

"psycopg2 error"
  → Install PostgreSQL dev headers, then: pip install psycopg2-binary

"Invalid DATABASE_URL"
  → Check .env file, ensure PostgreSQL is running

"401 Unauthorized"
  → Token might be expired, or authorization header format is wrong
  → Format: Authorization: Bearer <token>


⏳_SHIFT_CREW Backend
Phase 1 scaffolding complete.
