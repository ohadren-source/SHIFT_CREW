from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from database import get_db, engine
from models import Base, Staff, Role, Facility, Shift, Task, TaskEntry, CarryOverQueue, TaskStatus
from auth import hash_password, verify_password, create_access_token, decode_access_token, extract_token_from_header
from schemas import (
    RegisterRequest, AdminCreateStaffRequest, SignInRequest, GoogleAuthRequest, AuthResponse,
    TaskEntryRequest, TaskEntryResponse, CarryOverTaskDetail,
    DailyDashboardResponse, WeeklyDashboardResponse, ErrorResponse
)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize admin on startup
def init_admin():
    db = next(get_db())

    # Create roles if they don't exist
    role_names = ["ADMIN", "CARETAKER", "CLEANER", "MAINTENANCE"]
    for role_name in role_names:
        existing_role = db.query(Role).filter(Role.name == role_name).first()
        if not existing_role:
            db.add(Role(name=role_name, active=True))
    db.commit()

    admin_exists = db.query(Staff).filter(Staff.email == "amb@grscorp.us").first()
    if not admin_exists:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()

        facility = db.query(Facility).first()
        if not facility:
            facility = Facility(name="Default Facility")
            db.add(facility)
            db.commit()

        admin = Staff(
            email="amb@grscorp.us",
            password_hash=hash_password("pakiman"),
            name="Admin",
            role_id=admin_role.id,
            facility_id=facility.id,
            first_login=False
        )
        db.add(admin)
        db.commit()
    db.close()

init_admin()

# Initialize FastAPI app
app = FastAPI(title="⏳_SHIFT_CREW", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://shift-crew.vercel.app",
        "https://shift-crew-174auuepf-ohadren-7008s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================
# EXCEPTION HANDLERS
# =====================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Log detailed validation errors"""
    import sys
    print(f"VALIDATION ERROR: {exc.errors()}", file=sys.stderr)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
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
        first_login=staff.first_login,
        session_token=token,
        expires_at=expires_at
    )


@app.get("/auth/me", response_model=AuthResponse)
def get_current_user(current_staff: Staff = Depends(get_current_staff)):
    """Get current authenticated staff member"""
    expires_at = datetime.utcnow() + timedelta(hours=12)
    return AuthResponse(
        id=current_staff.id,
        email=current_staff.email,
        name=current_staff.name,
        role_id=current_staff.role_id,
        facility_id=current_staff.facility_id,
        first_login=current_staff.first_login,
        session_token="",
        expires_at=expires_at
    )


@app.post("/auth/google-callback", response_model=AuthResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth token"""
    # TODO: Implement Google OAuth token verification
    raise HTTPException(status_code=501, detail="Google OAuth not yet implemented")


@app.post("/auth/change-password")
def change_password(
    old_password: str,
    new_password: str,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Change password (required on first login)"""
    if not verify_password(old_password, current_staff.password_hash):
        raise HTTPException(status_code=401, detail="Invalid current password")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    current_staff.password_hash = hash_password(new_password)
    current_staff.first_login = False
    db.commit()

    return {"message": "Password changed successfully"}


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
    """Get all tasks for given shift, excluding completed YES tasks from today. Include carry-over tasks."""

    today = datetime.utcnow().date()

    # Get tasks marked 'yes' today by this staff (only yes disappears, no/carry-over stay)
    completed_task_ids = db.query(TaskEntry.task_id).filter(
        TaskEntry.staff_id == current_staff.id,
        TaskEntry.facility_id == facility_id,
        TaskEntry.date == today,
        TaskEntry.status.in_([TaskStatus.YES])
    ).all()
    completed_ids = {task_id[0] for task_id in completed_task_ids}

    # Get ALL unresolved carry-over tasks (perpetual until marked complete)
    carry_over_tasks = db.query(CarryOverQueue).filter(
        CarryOverQueue.facility_id == facility_id,
        CarryOverQueue.resolved == False
    ).all()

    carry_over_task_ids = {co.task_id for co in carry_over_tasks}

    # Get all base tasks for facility (1st shift tasks always included in all shifts)
    tasks = db.query(Task).filter(
        Task.facility_id == facility_id,
        (Task.default_shift == 1) | (Task.default_shift == shift_id) | (Task.default_shift == None)
    ).all()

    # Create task lookup by ID
    task_lookup = {t.id: t for t in tasks}

    # Group by room, excluding completed tasks
    tasks_by_room = {}
    for task in tasks:
        if task.id in completed_ids:
            continue
        room = task.room
        if room not in tasks_by_room:
            tasks_by_room[room] = []
        tasks_by_room[room].append({
            "id": task.id,
            "room": task.room,
            "task_name": task.task_name,
            "is_critical": task.is_critical,
            "is_persistent": task.is_persistent,
            "is_carry_over": task.id in carry_over_task_ids,
            "status": None
        })

    # Add carry-over tasks that aren't in base tasks
    for co_task_id in carry_over_task_ids:
        if co_task_id not in task_lookup:
            continue  # Task doesn't exist
        task = task_lookup[co_task_id]
        if task.id in completed_ids:
            continue  # Already completed

        room = task.room
        if room not in tasks_by_room:
            tasks_by_room[room] = []

        # Check if task already added (as base task)
        if not any(t["id"] == co_task_id for t in tasks_by_room[room]):
            tasks_by_room[room].append({
                "id": task.id,
                "room": task.room,
                "task_name": task.task_name,
                "is_critical": task.is_critical,
                "is_persistent": task.is_persistent,
                "is_carry_over": True,
                "status": None
            })

    # Sort each room: carry-over tasks first
    for room in tasks_by_room:
        tasks_by_room[room].sort(key=lambda t: (not t["is_carry_over"], t["id"]))

    return tasks_by_room


@app.get("/task-entries")
def get_task_entries(
    shift_id: int,
    facility_id: int,
    date: str,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get task entries for a specific shift and date"""

    entries = db.query(TaskEntry).filter(
        TaskEntry.shift_id == shift_id,
        TaskEntry.facility_id == facility_id,
        TaskEntry.date == date
    ).all()

    return {
        "entries": [
            {
                "id": entry.id,
                "task_id": entry.task_id,
                "status": entry.status,
                "notes": entry.notes,
                "timestamp": entry.timestamp.isoformat() if entry.timestamp else None
            }
            for entry in entries
        ]
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
    if request.status == TaskStatus.NOT_DONE and not request.notes:
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
    db.flush()

    # If status is "yes", mark any existing carry-overs as resolved
    if request.status == TaskStatus.YES:
        db.query(CarryOverQueue).filter(
            CarryOverQueue.task_id == request.task_id,
            CarryOverQueue.facility_id == request.facility_id,
            CarryOverQueue.resolved == False
        ).update({CarryOverQueue.resolved: True})
        db.flush()

    # If status is "not_done", create carry-over for next shift
    carry_over_id = None
    if request.status == TaskStatus.NOT_DONE:
        # Get all shifts ordered by ID to find next shift
        shifts = db.query(Shift).filter(Shift.facility_id == request.facility_id).order_by(Shift.id).all()
        shift_ids = [s.id for s in shifts]

        # Find next shift
        current_index = shift_ids.index(request.shift_id) if request.shift_id in shift_ids else -1
        if current_index >= 0 and current_index < len(shift_ids) - 1:
            # Next shift exists today
            next_shift_id = shift_ids[current_index + 1]
            carry_over_date = today
        else:
            # Last shift of the day, carry to first shift tomorrow
            next_shift_id = shift_ids[0] if shift_ids else request.shift_id
            carry_over_date = today + timedelta(days=1)

        carry_over = CarryOverQueue(
            task_id=request.task_id,
            task_entry_id=task_entry.id,
            shift_id=next_shift_id,
            facility_id=request.facility_id,
            assigned_to_shift_date=carry_over_date,
            resolved=False
        )
        db.add(carry_over)
        db.flush()
        carry_over_id = carry_over.id

    db.commit()
    db.refresh(task_entry)

    response = TaskEntryResponse.from_orm(task_entry)
    if carry_over_id:
        response.carry_over = True

    return response


# =====================
# DEPENDENCY: Check if user is admin
# =====================

async def check_admin(current_staff: Staff = Depends(get_current_staff), db: Session = Depends(get_db)) -> Staff:
    """Verify user has ADMIN role"""
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role or current_staff.role_id != admin_role.id:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_staff


# =====================
# ADMIN ENDPOINTS
# =====================
# All admin endpoints require check_admin dependency
# Returns 403 Forbidden if user is not ADMIN role
# This is enforced server-side for security

@app.post("/admin/staff")
def create_staff(
    request: AdminCreateStaffRequest,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Create new staff account with temporary password (admin only)"""
    import secrets

    # Check if email exists
    existing = db.query(Staff).filter(Staff.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Check role and facility exist
    role = db.query(Role).filter(Role.id == request.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    facility = db.query(Facility).filter(Facility.id == request.facility_id).first()
    if not facility:
        raise HTTPException(status_code=400, detail="Invalid facility")

    # Generate temporary password
    temp_password = secrets.token_urlsafe(12)

    staff = Staff(
        email=request.email,
        name=request.name,
        password_hash=hash_password(temp_password),
        role_id=request.role_id,
        facility_id=request.facility_id,
        first_login=True
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)

    return {
        "id": staff.id,
        "email": staff.email,
        "name": staff.name,
        "temp_password": temp_password,
        "message": "Staff created. Share temp_password with staff member. They must change it on first login."
    }


@app.get("/admin/staff")
def list_staff(
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Get all staff (admin only)"""
    staff = db.query(Staff).all()
    return [
        {
            "id": s.id,
            "email": s.email,
            "name": s.name,
            "role_id": s.role_id,
            "facility_id": s.facility_id
        }
        for s in staff
    ]


@app.delete("/admin/staff/{staff_id}")
def delete_staff(
    staff_id: int,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Delete a staff member (admin only)"""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if staff.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(staff)
    db.commit()
    return {"message": f"Staff {staff.email} deleted successfully"}


@app.get("/admin/tasks")
def list_tasks(
    facility_id: int,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Get all tasks for a facility (admin only)"""
    tasks = db.query(Task).filter(Task.facility_id == facility_id).all()
    return [
        {
            "id": t.id,
            "room": t.room,
            "task_name": t.task_name,
            "assigned_role": t.assigned_role,
            "is_critical": t.is_critical,
            "is_persistent": t.is_persistent,
            "default_shift": t.default_shift
        }
        for t in tasks
    ]


@app.post("/admin/tasks")
def create_task(
    facility_id: int,
    room: str,
    task_name: str,
    assigned_role: int,
    is_critical: bool = False,
    is_persistent: bool = False,
    default_shift: int = None,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Create a new task (admin only)"""
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=400, detail="Facility not found")

    role = db.query(Role).filter(Role.id == assigned_role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")

    task = Task(
        facility_id=facility_id,
        room=room,
        task_name=task_name,
        assigned_role=assigned_role,
        is_critical=is_critical,
        is_persistent=is_persistent,
        default_shift=default_shift
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "room": task.room,
        "task_name": task.task_name,
        "assigned_role": task.assigned_role,
        "is_critical": task.is_critical,
        "is_persistent": task.is_persistent,
        "default_shift": task.default_shift
    }


@app.delete("/admin/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Delete a task (admin only)"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": f"Task deleted successfully"}


@app.get("/roles")
def get_roles(
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get all roles"""
    roles = db.query(Role).filter(Role.active == True).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description
        }
        for r in roles
    ]


@app.get("/facilities")
def get_facilities(
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get all facilities"""
    facilities = db.query(Facility).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "location": f.location
        }
        for f in facilities
    ]


@app.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    """Seed database with test data (dev only)"""
    facility = db.query(Facility).first()
    if not facility:
        facility = Facility(name="Default Facility")
        db.add(facility)
        db.commit()
        db.refresh(facility)

    cleaner_role = db.query(Role).filter(Role.name == "CLEANER").first()
    if not cleaner_role:
        cleaner_role = Role(name="CLEANER")
        db.add(cleaner_role)
        db.commit()
        db.refresh(cleaner_role)

    shift = db.query(Shift).filter(Shift.facility_id == facility.id).first()
    if not shift:
        from datetime import time
        shift = Shift(
            facility_id=facility.id,
            name="1st Shift (AM)",
            start_time=time(6, 0),
            end_time=time(14, 0)
        )
        db.add(shift)
        db.commit()
        db.refresh(shift)

    # Create tasks from spec if none exist
    existing_tasks = db.query(Task).filter(Task.facility_id == facility.id).count()
    if existing_tasks == 0:
        spec_tasks = {
            "Azlan's Room": ["Bed made", "Toys organized", "Clothes put away", "Floor vacuumed", "Surfaces wiped", "Sheets changed", "Laundry basket checked"],
            "Azlan's Bathroom": ["Sink cleaned", "Toilet cleaned", "Shower/tub rinsed", "Mirror wiped", "Trash emptied", "Towels replaced"],
            "Asad's Room": ["Bed made", "Clothes organized", "Floor vacuumed", "Surfaces wiped", "Trash emptied", "Laundry basket checked"],
            "Asad's Bathroom": ["Sink cleaned", "Toilet cleaned", "Shower cleaned", "Mirror wiped", "Trash emptied", "Towels replaced"],
            "Study Room": ["Desk organized", "Books arranged", "Floor vacuumed", "Surfaces wiped", "Trash emptied"],
            "Kitchen": ["Dishes done", "Sink cleaned", "Counters wiped", "Stove wiped", "Floor swept", "Trash checked"],
            "Dining Area": ["Table wiped", "Chairs cleaned", "Area swept"],
            "Sitting Area": ["Couch organized", "Cushions arranged", "Floor vacuumed", "Surfaces wiped"],
            "Hallways": ["Floor vacuumed", "Shoes organized", "Items removed", "Walls spot-cleaned"],
            "Downstairs Bathroom": ["Sink cleaned", "Toilet cleaned", "Mirror wiped", "Trash emptied", "Floor mopped"],
            "Stairs": ["Steps vacuumed", "Railings wiped"],
            "Office": ["Desk organized", "Trash emptied", "Floor vacuumed", "Surfaces wiped"],
            "Pets": ["Coco food full", "Coco water full", "Coco morning walk", "Coco evening walk", "Birds feeding", "Birds cage cleaning", "Tortoise feeding", "Tortoise water"],
            "Laundry": ["Wash clothes", "Dry clothes", "Fold clothes", "Iron clothes"],
            "Final Checks": ["Doors locked", "Lights checked", "Trash out"]
        }

        for room, tasks in spec_tasks.items():
            for task_name in tasks:
                is_crit = task_name in ["Bed made", "Coco food full", "Coco water full", "Doors locked"]
                is_pers = "Coco" in task_name or room == "Pets"
                task = Task(
                    facility_id=facility.id,
                    room=room,
                    task_name=task_name,
                    assigned_role=cleaner_role.id,
                    is_critical=is_crit,
                    is_persistent=is_pers,
                    default_shift=shift.id
                )
                db.add(task)
        db.commit()

    return {"message": "Database seeded successfully"}


# =====================
# DASHBOARD ENDPOINTS
# =====================
# All dashboard endpoints require check_admin dependency
# Only ADMIN role can view facility-wide metrics

@app.get("/dashboard/daily")
def get_daily_dashboard(
    facility_id: int,
    date: str,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Get daily dashboard metrics (admin only)"""
    from datetime import datetime as dt

    try:
        query_date = dt.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    shifts = db.query(Shift).filter(Shift.facility_id == facility_id).all()

    shifts_metrics = []
    facility_completed = 0
    facility_total = 0
    facility_critical_missed = 0

    for shift in shifts:
        task_entries = db.query(TaskEntry).filter(
            TaskEntry.shift_id == shift.id,
            TaskEntry.facility_id == facility_id,
            TaskEntry.date == query_date
        ).all()

        staff_on_duty = {}
        for entry in task_entries:
            if entry.staff_id not in staff_on_duty:
                staff = db.query(Staff).filter(Staff.id == entry.staff_id).first()
                role = db.query(Role).filter(Role.id == staff.role_id).first()
                staff_on_duty[entry.staff_id] = {
                    "staff_id": staff.id,
                    "name": staff.name,
                    "role": role.name,
                    "completed": 0,
                    "total": 0,
                    "critical_missed": 0
                }

        for entry in task_entries:
            staff_on_duty[entry.staff_id]["total"] += 1
            if entry.status == "yes":
                staff_on_duty[entry.staff_id]["completed"] += 1
            if entry.status != "yes" and db.query(Task).filter(Task.id == entry.task_id).first().is_critical:
                staff_on_duty[entry.staff_id]["critical_missed"] += 1

            facility_total += 1
            if entry.status == "yes":
                facility_completed += 1
            if entry.status != "yes" and db.query(Task).filter(Task.id == entry.task_id).first().is_critical:
                facility_critical_missed += 1

        shift_staff = []
        for staff_id, metrics in staff_on_duty.items():
            completion_pct = (metrics["completed"] / metrics["total"] * 100) if metrics["total"] > 0 else 0

            # Get latest completion timestamp
            latest_yes = db.query(TaskEntry).filter(
                TaskEntry.staff_id == staff_id,
                TaskEntry.shift_id == shift.id,
                TaskEntry.facility_id == facility_id,
                TaskEntry.date == query_date,
                TaskEntry.status == "yes"
            ).order_by(TaskEntry.timestamp.desc()).first()

            latest_completion = latest_yes.timestamp.isoformat() if latest_yes else None

            shift_staff.append({
                "staff_id": metrics["staff_id"],
                "name": metrics["name"],
                "role": metrics["role"],
                "tasks_completed": metrics["completed"],
                "tasks_total": metrics["total"],
                "completion_pct": round(completion_pct, 1),
                "critical_missed": metrics["critical_missed"],
                "carry_over_count": db.query(CarryOverQueue).filter(
                    CarryOverQueue.shift_id == shift.id,
                    CarryOverQueue.facility_id == facility_id,
                    CarryOverQueue.resolved == False
                ).count(),
                "last_completion_time": latest_completion
            })

        shifts_metrics.append({
            "shift_id": shift.id,
            "shift_name": shift.name,
            "staff_on_duty": shift_staff
        })

    facility_completion_pct = (facility_completed / facility_total * 100) if facility_total > 0 else 0

    return {
        "date": date,
        "shifts": shifts_metrics,
        "facility_totals": {
            "tasks_completed": facility_completed,
            "tasks_total": facility_total,
            "completion_pct": round(facility_completion_pct, 1),
            "critical_missed": facility_critical_missed
        }
    }


@app.get("/dashboard/weekly")
def get_weekly_dashboard(
    facility_id: int,
    week_start: str,
    current_admin: Staff = Depends(check_admin),
    db: Session = Depends(get_db)
):
    """Get weekly dashboard metrics (admin only)"""
    from datetime import datetime as dt, timedelta

    try:
        start_date = dt.strptime(week_start, "%Y-%m-%d").date()
        end_date = start_date + timedelta(days=6)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    week_entries = db.query(TaskEntry).filter(
        TaskEntry.facility_id == facility_id,
        TaskEntry.date >= start_date,
        TaskEntry.date <= end_date
    ).all()

    staff_metrics = {}
    for entry in week_entries:
        if entry.staff_id not in staff_metrics:
            staff = db.query(Staff).filter(Staff.id == entry.staff_id).first()
            staff_metrics[entry.staff_id] = {
                "staff_id": staff.id,
                "name": staff.name,
                "shifts_worked": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "critical_missed": 0,
                "notes_written": 0
            }

        staff_metrics[entry.staff_id]["total_tasks"] += 1
        if entry.status == "yes":
            staff_metrics[entry.staff_id]["completed_tasks"] += 1
        if entry.status != "yes" and db.query(Task).filter(Task.id == entry.task_id).first().is_critical:
            staff_metrics[entry.staff_id]["critical_missed"] += 1
        if entry.notes:
            staff_metrics[entry.staff_id]["notes_written"] += 1

    for staff_id in staff_metrics:
        shifts_count = db.query(TaskEntry.shift_id).filter(
            TaskEntry.staff_id == staff_id,
            TaskEntry.facility_id == facility_id,
            TaskEntry.date >= start_date,
            TaskEntry.date <= end_date
        ).distinct().count()
        staff_metrics[staff_id]["shifts_worked"] = shifts_count

    by_staff = []
    for staff_id, metrics in staff_metrics.items():
        completion_pct = (metrics["completed_tasks"] / metrics["total_tasks"] * 100) if metrics["total_tasks"] > 0 else 0
        by_staff.append({
            "staff_id": metrics["staff_id"],
            "name": metrics["name"],
            "shifts_worked": metrics["shifts_worked"],
            "avg_completion_pct": round(completion_pct, 1),
            "critical_missed": metrics["critical_missed"],
            "notes_written": metrics["notes_written"]
        })

    role_metrics = {}
    for entry in week_entries:
        staff = db.query(Staff).filter(Staff.id == entry.staff_id).first()
        role = db.query(Role).filter(Role.id == staff.role_id).first()

        if role.name not in role_metrics:
            role_metrics[role.name] = {
                "role": role.name,
                "total_tasks": 0,
                "completed_tasks": 0,
                "critical_missed": 0,
                "staff_count": set()
            }

        role_metrics[role.name]["total_tasks"] += 1
        if entry.status == "yes":
            role_metrics[role.name]["completed_tasks"] += 1
        if entry.status != "yes" and db.query(Task).filter(Task.id == entry.task_id).first().is_critical:
            role_metrics[role.name]["critical_missed"] += 1
        role_metrics[role.name]["staff_count"].add(entry.staff_id)

    by_role = []
    for role_name, metrics in role_metrics.items():
        completion_pct = (metrics["completed_tasks"] / metrics["total_tasks"] * 100) if metrics["total_tasks"] > 0 else 0
        by_role.append({
            "role": metrics["role"],
            "avg_completion_pct": round(completion_pct, 1),
            "critical_missed": metrics["critical_missed"],
            "staff_count": len(metrics["staff_count"])
        })

    return {
        "week": f"{week_start} to {end_date.strftime('%Y-%m-%d')}",
        "by_staff": by_staff,
        "by_role": by_role
    }


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
