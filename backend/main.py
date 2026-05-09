from fastapi import FastAPI, Depends, HTTPException, status, Header
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from database import get_db, engine
from models import Base, Staff, Role, Facility, Shift, Task, TaskEntry, CarryOverQueue, TaskStatus
from auth import hash_password, verify_password, create_access_token, decode_access_token, extract_token_from_header
from schemas import (
    RegisterRequest, SignInRequest, GoogleAuthRequest, AuthResponse,
    TaskEntryRequest, TaskEntryResponse, CarryOverTaskDetail,
    DailyDashboardResponse, WeeklyDashboardResponse, ErrorResponse
)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="⏳_SHIFT_CREW", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================
# DEPENDENCY: Get current staff from token
# =====================

async def get_current_staff(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Staff:
    """Extract and validate current staff from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    staff_id = payload.get("sub")
    if not staff_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=401, detail="Staff not found")
    
    return staff


# =====================
# AUTH ENDPOINTS
# =====================

@app.post("/auth/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register new staff member with email and password"""
    
    # Check if email already exists
    existing = db.query(Staff).filter(Staff.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if role exists and is active
    role = db.query(Role).filter(Role.id == request.role_id, Role.active == True).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid or inactive role")
    
    # Check if facility exists
    facility = db.query(Facility).filter(Facility.id == request.facility_id).first()
    if not facility:
        raise HTTPException(status_code=400, detail="Facility not found")
    
    # Create staff record
    staff = Staff(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        role_id=request.role_id,
        facility_id=request.facility_id
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    
    # Generate token
    token = create_access_token(data={"sub": str(staff.id)})
    expires_at = datetime.utcnow() + timedelta(hours=12)
    
    return AuthResponse(
        id=staff.id,
        email=staff.email,
        name=staff.name,
        role_id=staff.role_id,
        facility_id=staff.facility_id,
        session_token=token,
        expires_at=expires_at
    )


@app.post("/auth/signin", response_model=AuthResponse)
def signin(request: SignInRequest, db: Session = Depends(get_db)):
    """Sign in with email and password"""
    
    staff = db.query(Staff).filter(Staff.email == request.email).first()
    if not staff or not staff.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, staff.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    staff.last_login = datetime.utcnow()
    db.commit()
    
    # Generate token
    token = create_access_token(data={"sub": str(staff.id)})
    expires_at = datetime.utcnow() + timedelta(hours=12)
    
    return AuthResponse(
        id=staff.id,
        email=staff.email,
        name=staff.name,
        role_id=staff.role_id,
        facility_id=staff.facility_id,
        session_token=token,
        expires_at=expires_at
    )


@app.post("/auth/google-callback", response_model=AuthResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth token"""
    # TODO: Implement Google OAuth token verification
    # For now, accept google_token and return mock response
    
    raise HTTPException(status_code=501, detail="Google OAuth not yet implemented")


# =====================
# TASK ENDPOINTS
# =====================

@app.get("/tasks")
def get_tasks(
    shift_id: int,
    facility_id: int,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get all tasks for given shift and role"""
    
    tasks = db.query(Task).filter(
        Task.shift_id == shift_id,
        Task.facility_id == facility_id,
        Task.assigned_role == current_staff.role_id
    ).all()
    
    # Group by room
    tasks_by_room = {}
    for task in tasks:
        room = task.room
        if room not in tasks_by_room:
            tasks_by_room[room] = []
        tasks_by_room[room].append({
            "id": task.id,
            "room": task.room,
            "task_name": task.task_name,
            "is_critical": task.is_critical,
            "is_persistent": task.is_persistent,
            "status": None
        })
    
    # Count carry-overs for this shift
    carry_over_count = db.query(CarryOverQueue).filter(
        CarryOverQueue.shift_id == shift_id,
        CarryOverQueue.facility_id == facility_id,
        CarryOverQueue.resolved == False
    ).count()
    
    return {
        "tasks": tasks_by_room,
        "carry_over_count": carry_over_count
    }


@app.get("/tasks/carry-over")
def get_carry_over_tasks(
    shift_id: int,
    facility_id: int,
    date: str,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get carry-over tasks for next shift"""
    
    carry_overs = db.query(CarryOverQueue).filter(
        CarryOverQueue.shift_id == shift_id,
        CarryOverQueue.facility_id == facility_id,
        CarryOverQueue.assigned_to_shift_date == date,
        CarryOverQueue.resolved == False
    ).all()
    
    result = []
    for co in carry_overs:
        task = co.task
        task_entry = co.task_entry
        result.append({
            "id": co.id,
            "task_id": task.id,
            "room": task.room,
            "task_name": task.task_name,
            "notes": task_entry.notes if task_entry else None,
            "created_at": co.created_at.isoformat(),
            "previous_staff_id": task_entry.staff_id if task_entry else None
        })
    
    return {"carry_over_tasks": result}


# =====================
# TASK ENTRY (COMPLETION) ENDPOINTS
# =====================

@app.post("/task-entry", response_model=TaskEntryResponse)
def submit_task_entry(
    request: TaskEntryRequest,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Submit a completed task"""
    
    # Validate notes: required if status is "not_done"
    if request.status == TaskStatusEnum.NOT_DONE and not request.notes:
        raise HTTPException(status_code=400, detail="Notes required when status is 'Not Done'")
    
    # Create task entry
    today = datetime.utcnow().date()
    task_entry = TaskEntry(
        task_id=request.task_id,
        staff_id=request.staff_id,
        shift_id=request.shift_id,
        facility_id=request.facility_id,
        date=today,
        status=request.status,
        notes=request.notes,
        carry_over=False
    )
    db.add(task_entry)
    db.flush()  # Get the ID without committing
    
    # If status is "not_done", create carry-over
    carry_over_id = None
    if request.status == TaskStatusEnum.NOT_DONE:
        # Find next occurrence of this shift (tomorrow, same shift type)
        next_shift_date = today + timedelta(days=1)
        
        carry_over = CarryOverQueue(
            task_id=request.task_id,
            task_entry_id=task_entry.id,
            shift_id=request.shift_id,
            facility_id=request.facility_id,
            assigned_to_shift_date=next_shift_date,
            resolved=False
        )
        db.add(carry_over)
        db.flush()
        carry_over_id = carry_over.id
    
    db.commit()
    db.refresh(task_entry)
    
    response = TaskEntryResponse.from_orm(task_entry)
    # Add carry_over_id to response if created
    if carry_over_id:
        response.carry_over = True
    
    return response


# =====================
# DASHBOARD ENDPOINTS
# =====================

@app.get("/dashboard/daily")
def get_daily_dashboard(
    facility_id: int,
    date: str,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get daily dashboard metrics"""
    # TODO: Implement full dashboard logic
    return {"message": "Dashboard endpoint under construction"}


@app.get("/dashboard/weekly")
def get_weekly_dashboard(
    facility_id: int,
    week_start: str,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get weekly dashboard metrics"""
    # TODO: Implement full dashboard logic
    return {"message": "Dashboard endpoint under construction"}


# =====================
# HEALTH CHECK
# =====================

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "1.0.0"}


# =====================
# ERROR HANDLERS
# =====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail,
            "details": None
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
