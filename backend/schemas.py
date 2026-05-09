from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class TaskStatusEnum(str, Enum):
    YES = "yes"
    NO = "no"
    NOT_DONE = "not_done"


# =====================
# AUTH SCHEMAS
# =====================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role_id: int
    facility_id: int


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    google_token: str


class AuthResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role_id: int
    facility_id: int
    session_token: str
    expires_at: datetime

    class Config:
        from_attributes = True


# =====================
# ROLE SCHEMAS
# =====================

class RoleResponse(BaseModel):
    id: int
    name: str
    active: bool
    description: Optional[str]

    class Config:
        from_attributes = True


# =====================
# SHIFT SCHEMAS
# =====================

class ShiftResponse(BaseModel):
    id: int
    facility_id: int
    name: str
    start_time: str
    end_time: str

    class Config:
        from_attributes = True


# =====================
# TASK SCHEMAS
# =====================

class TaskResponse(BaseModel):
    id: int
    room: str
    task_name: str
    assigned_role: int
    is_critical: bool
    is_persistent: bool
    default_shift: Optional[int]

    class Config:
        from_attributes = True


# =====================
# TASK ENTRY SCHEMAS
# =====================

class TaskEntryRequest(BaseModel):
    task_id: int
    staff_id: int
    shift_id: int
    facility_id: int
    status: TaskStatusEnum
    notes: Optional[str]


class TaskEntryResponse(BaseModel):
    id: int
    task_id: int
    staff_id: int
    shift_id: int
    facility_id: int
    status: TaskStatusEnum
    notes: Optional[str]
    timestamp: datetime
    carry_over: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# CARRY-OVER SCHEMAS
# =====================

class CarryOverResponse(BaseModel):
    id: int
    task_id: int
    task_entry_id: int
    shift_id: int
    facility_id: int
    assigned_to_shift_date: str
    resolved: bool

    class Config:
        from_attributes = True


class CarryOverTaskDetail(BaseModel):
    id: int
    task_id: int
    room: str
    task_name: str
    notes: Optional[str]
    created_at: datetime
    previous_staff_id: Optional[int]

    class Config:
        from_attributes = True


# =====================
# DASHBOARD SCHEMAS
# =====================

class ShiftStaffMetrics(BaseModel):
    staff_id: int
    name: str
    role: str
    tasks_completed: int
    tasks_total: int
    completion_pct: float
    critical_missed: int
    carry_over_count: int


class ShiftMetrics(BaseModel):
    shift_id: int
    shift_name: str
    staff_on_duty: list[ShiftStaffMetrics]


class DailyDashboardResponse(BaseModel):
    date: str
    shifts: list[ShiftMetrics]
    facility_totals: dict


class StaffWeeklyMetrics(BaseModel):
    staff_id: int
    name: str
    shifts_worked: int
    avg_completion_pct: float
    critical_missed: int
    notes_written: int


class RoleWeeklyMetrics(BaseModel):
    role: str
    avg_completion_pct: float
    critical_missed: int
    staff_count: int


class WeeklyDashboardResponse(BaseModel):
    week: str
    by_staff: list[StaffWeeklyMetrics]
    by_role: list[RoleWeeklyMetrics]


# =====================
# ERROR SCHEMAS
# =====================

class ErrorResponse(BaseModel):
    status: str = "error"
    code: int
    message: str
    details: Optional[dict]
