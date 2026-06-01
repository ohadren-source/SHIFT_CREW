#!/usr/bin/env python3
"""
Database verification script — check current seeding state
Usage: python verify-database.py (uses DATABASE_URL from environment)
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set")
    print("Usage: DATABASE_URL='postgresql://...' python verify-database.py")
    sys.exit(1)

print(f"🔗 Checking database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'database'}")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Role, Facility, Shift, Task, Staff

# Create engine
if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Check counts
    facilities = db.query(Facility).all()
    roles = db.query(Role).all()
    shifts = db.query(Shift).all()
    tasks = db.query(Task).all()
    staff = db.query(Staff).all()

    print(f"\n📊 Database Status:")
    print(f"   Facilities: {len(facilities)}")
    for f in facilities:
        print(f"      - {f.name} (id={f.id})")

    print(f"   Roles: {len(roles)}")
    for r in roles:
        print(f"      - {r.name} (active={r.active})")

    print(f"   Shifts: {len(shifts)}")
    shifts_by_facility = {}
    for s in shifts:
        if s.facility_id not in shifts_by_facility:
            shifts_by_facility[s.facility_id] = []
        shifts_by_facility[s.facility_id].append(s.name)
    for fid, shift_names in shifts_by_facility.items():
        print(f"      - Facility {fid}: {len(shift_names)} shifts")

    print(f"   Tasks: {len(tasks)}")
    tasks_by_facility = {}
    for t in tasks:
        if t.facility_id not in tasks_by_facility:
            tasks_by_facility[t.facility_id] = []
        tasks_by_facility[t.facility_id].append(t.task_name)
    for fid, task_names in tasks_by_facility.items():
        print(f"      - Facility {fid}: {len(task_names)} tasks")

    print(f"   Staff: {len(staff)}")
    for s in staff[:5]:  # Show first 5
        print(f"      - {s.name or s.email} (facility_id={s.facility_id})")
    if len(staff) > 5:
        print(f"      ... and {len(staff) - 5} more")

    # Check facility_id=1
    print(f"\n🎯 Facility ID=1 Status:")
    facility_1_tasks = db.query(Task).filter(Task.facility_id == 1).count()
    facility_1_shifts = db.query(Shift).filter(Shift.facility_id == 1).count()
    facility_1_staff = db.query(Staff).filter(Staff.facility_id == 1).count()

    print(f"   Tasks: {facility_1_tasks}")
    print(f"   Shifts: {facility_1_shifts}")
    print(f"   Staff: {facility_1_staff}")

    if facility_1_tasks == 0 or facility_1_shifts == 0:
        print(f"\n⚠️  Facility ID=1 is not fully seeded!")
        print(f"   Run: DATABASE_URL='...' python seed-production.py")
    else:
        print(f"\n✅ Facility ID=1 appears to be seeded")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
