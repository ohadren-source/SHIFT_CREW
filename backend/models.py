from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Date, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # CARETAKER, CLEANER, MAINTENANCE, ADMIN
    active = Column(Boolean, default=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    staff = relationship("Staff", back_populates="role")
    tasks = relationship("Task", back_populates="role")


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # e.g., "GRSCORP Household"
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    staff = relationship("Staff", back_populates="facility")
    shifts = relationship("Shift", back_populates="facility")
    tasks = relationship("Task", back_populates="facility")
    task_entries = relationship("TaskEntry", back_populates="facility")
    carry_over_queue = relationship("CarryOverQueue", back_populates="facility")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), index=True)
    name = Column(String)  # 1st Shift (AM), 2nd Shift (Midday), etc.
    start_time = Column(Time)
    end_time = Column(Time)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    facility = relationship("Facility", back_populates="shifts")
    tasks = relationship("Task", back_populates="shift")
    task_entries = relationship("TaskEntry", back_populates="shift")
    carry_over_queue = relationship("CarryOverQueue", back_populates="shift")


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)  # nullable for Google OAuth
    google_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    first_login = Column(Boolean, default=True)

    # Relationships
    role = relationship("Role", back_populates="staff")
    facility = relationship("Facility", back_populates="staff")
    task_entries = relationship("TaskEntry", back_populates="staff")


class TaskStatus(str, enum.Enum):
    YES = "yes"
    NO = "no"
    NOT_DONE = "not_done"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), index=True)
    room = Column(String)  # e.g., "Azlan's Room"
    task_name = Column(String)  # e.g., "Bed made"
    assigned_role = Column(Integer, ForeignKey("roles.id"), index=True)
    is_critical = Column(Boolean, default=False)
    is_persistent = Column(Boolean, default=False)  # Pet care, must-dos
    default_shift = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    facility = relationship("Facility", back_populates="tasks")
    role = relationship("Role", back_populates="tasks")
    shift = relationship("Shift", back_populates="tasks")
    task_entries = relationship("TaskEntry", back_populates="task")


class TaskEntry(Base):
    __tablename__ = "task_entries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), index=True)
    date = Column(Date, index=True)  # Shift date for daily reset
    status = Column(Enum(TaskStatus), index=True)  # yes, no, not_done
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    carry_over = Column(Boolean, default=False)  # True if this was a carried task
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="task_entries")
    staff = relationship("Staff", back_populates="task_entries")
    shift = relationship("Shift", back_populates="task_entries")
    facility = relationship("Facility", back_populates="task_entries")


class CarryOverQueue(Base):
    __tablename__ = "carry_over_queue"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    task_entry_id = Column(Integer, ForeignKey("task_entries.id"), index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), index=True)
    assigned_to_shift_date = Column(Date, index=True)  # When carry-over should appear
    resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task")
    task_entry = relationship("TaskEntry")
    shift = relationship("Shift", back_populates="carry_over_queue")
    facility = relationship("Facility", back_populates="carry_over_queue")
