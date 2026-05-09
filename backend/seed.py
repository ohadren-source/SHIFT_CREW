"""
Seed script for SHIFT_CREW — populates initial database with roles, facilities, shifts, and tasks.
Run after migrations: python seed.py
"""

from datetime import time
from database import SessionLocal
from models import Role, Facility, Shift, Task
from sqlalchemy.exc import IntegrityError

db = SessionLocal()


def seed_database():
    """Populate database with initial data"""
    
    print("🌱 Seeding SHIFT_CREW database...")
    
    # =====================
    # 1. CREATE ROLES
    # =====================
    print("Creating roles...")
    
    roles_data = [
        {"name": "CARETAKER", "active": True, "description": "Household/facility caretaker"},
        {"name": "CLEANER", "active": False, "description": "Dedicated cleaning staff"},
        {"name": "MAINTENANCE", "active": False, "description": "Maintenance and repairs"},
        {"name": "ADMIN", "active": True, "description": "Administrator - dashboard access"},
    ]
    
    roles = {}
    for role_data in roles_data:
        role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not role:
            role = Role(**role_data)
            db.add(role)
        roles[role_data["name"]] = role
    
    db.commit()
    print(f"✓ Created {len(roles)} roles")
    
    # =====================
    # 2. CREATE FACILITY
    # =====================
    print("Creating facility...")
    
    facility = db.query(Facility).filter(Facility.name == "GRSCORP Household").first()
    if not facility:
        facility = Facility(name="GRSCORP Household", location="Selkirk, NY")
        db.add(facility)
        db.commit()
    
    print(f"✓ Created facility: {facility.name}")
    
    # =====================
    # 3. CREATE SHIFTS
    # =====================
    print("Creating shifts...")
    
    shifts_data = [
        {"name": "1st Shift (AM)", "start_time": time(6, 0), "end_time": time(14, 0)},
        {"name": "2nd Shift (Midday)", "start_time": time(14, 0), "end_time": time(22, 0)},
        {"name": "3rd Shift (PM)", "start_time": time(22, 0), "end_time": time(6, 0)},
        {"name": "Weekend Shift", "start_time": time(6, 0), "end_time": time(22, 0)},
    ]
    
    shifts = {}
    for shift_data in shifts_data:
        shift = db.query(Shift).filter(
            Shift.facility_id == facility.id,
            Shift.name == shift_data["name"]
        ).first()
        if not shift:
            shift = Shift(facility_id=facility.id, **shift_data)
            db.add(shift)
        shifts[shift_data["name"]] = shift
    
    db.commit()
    print(f"✓ Created {len(shifts)} shifts")
    
    # =====================
    # 4. CREATE TASKS
    # =====================
    print("Creating tasks...")
    
    caretaker_role = roles["CARETAKER"]
    
    tasks_data = [
        # Azlan's Room
        {"room": "Azlan's Room", "task_name": "Bed made", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Toys organized", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Clothes put away", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Surfaces wiped", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Sheets changed (Mon/Wed/Fri)", "is_critical": False},
        {"room": "Azlan's Room", "task_name": "Laundry basket checked", "is_critical": False},
        
        # Azlan's Bathroom
        {"room": "Azlan's Bathroom", "task_name": "Sink cleaned", "is_critical": False},
        {"room": "Azlan's Bathroom", "task_name": "Toilet cleaned", "is_critical": False},
        {"room": "Azlan's Bathroom", "task_name": "Shower/tub rinsed", "is_critical": False},
        {"room": "Azlan's Bathroom", "task_name": "Mirror wiped", "is_critical": False},
        {"room": "Azlan's Bathroom", "task_name": "Trash emptied", "is_critical": False},
        {"room": "Azlan's Bathroom", "task_name": "Towels replaced", "is_critical": False},
        
        # Asad's Room
        {"room": "Asad's Room", "task_name": "Bed made", "is_critical": False},
        {"room": "Asad's Room", "task_name": "Clothes organized", "is_critical": False},
        {"room": "Asad's Room", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Asad's Room", "task_name": "Surfaces wiped", "is_critical": False},
        {"room": "Asad's Room", "task_name": "Trash emptied", "is_critical": False},
        {"room": "Asad's Room", "task_name": "Laundry basket checked", "is_critical": False},
        
        # Asad's Bathroom
        {"room": "Asad's Bathroom", "task_name": "Sink cleaned", "is_critical": False},
        {"room": "Asad's Bathroom", "task_name": "Toilet cleaned", "is_critical": False},
        {"room": "Asad's Bathroom", "task_name": "Shower cleaned", "is_critical": False},
        {"room": "Asad's Bathroom", "task_name": "Mirror wiped", "is_critical": False},
        {"room": "Asad's Bathroom", "task_name": "Trash emptied", "is_critical": False},
        {"room": "Asad's Bathroom", "task_name": "Towels replaced", "is_critical": False},
        
        # Study Room
        {"room": "Study Room", "task_name": "Desk organized", "is_critical": False},
        {"room": "Study Room", "task_name": "Books arranged", "is_critical": False},
        {"room": "Study Room", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Study Room", "task_name": "Surfaces wiped", "is_critical": False},
        {"room": "Study Room", "task_name": "Trash emptied", "is_critical": False},
        
        # Kitchen
        {"room": "Kitchen", "task_name": "Dishes done", "is_critical": False},
        {"room": "Kitchen", "task_name": "Sink cleaned", "is_critical": False},
        {"room": "Kitchen", "task_name": "Counters wiped", "is_critical": False},
        {"room": "Kitchen", "task_name": "Stove wiped", "is_critical": False},
        {"room": "Kitchen", "task_name": "Floor swept", "is_critical": False},
        {"room": "Kitchen", "task_name": "Trash checked", "is_critical": False},
        
        # Dining Area
        {"room": "Dining Area", "task_name": "Table wiped", "is_critical": False},
        {"room": "Dining Area", "task_name": "Chairs cleaned", "is_critical": False},
        {"room": "Dining Area", "task_name": "Area swept", "is_critical": False},
        
        # Sitting Area
        {"room": "Sitting Area", "task_name": "Couch organized", "is_critical": False},
        {"room": "Sitting Area", "task_name": "Cushions arranged", "is_critical": False},
        {"room": "Sitting Area", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Sitting Area", "task_name": "Surfaces wiped", "is_critical": False},
        
        # Hallways
        {"room": "Hallways", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Hallways", "task_name": "Shoes organized", "is_critical": False},
        {"room": "Hallways", "task_name": "Items removed", "is_critical": False},
        {"room": "Hallways", "task_name": "Walls spot-cleaned", "is_critical": False},
        
        # Downstairs Bathroom
        {"room": "Downstairs Bathroom", "task_name": "Sink cleaned", "is_critical": False},
        {"room": "Downstairs Bathroom", "task_name": "Toilet cleaned", "is_critical": False},
        {"room": "Downstairs Bathroom", "task_name": "Mirror wiped", "is_critical": False},
        {"room": "Downstairs Bathroom", "task_name": "Trash emptied", "is_critical": False},
        {"room": "Downstairs Bathroom", "task_name": "Floor mopped", "is_critical": False},
        
        # Stairs
        {"room": "Stairs", "task_name": "Steps vacuumed", "is_critical": False},
        {"room": "Stairs", "task_name": "Railings wiped", "is_critical": False},
        
        # Office
        {"room": "Office", "task_name": "Desk organized", "is_critical": False},
        {"room": "Office", "task_name": "Trash emptied", "is_critical": False},
        {"room": "Office", "task_name": "Floor vacuumed", "is_critical": False},
        {"room": "Office", "task_name": "Surfaces wiped", "is_critical": False},
        
        # Pet Care (PERSISTENT)
        {"room": "Pet Care", "task_name": "Coco's food bowl full", "is_critical": True, "is_persistent": True},
        {"room": "Pet Care", "task_name": "Coco's water bowl full", "is_critical": True, "is_persistent": True},
        {"room": "Pet Care", "task_name": "Take Coco out (pee/poop)", "is_critical": True, "is_persistent": True},
        {"room": "Pet Care", "task_name": "Feed birds", "is_critical": False, "is_persistent": True},
        {"room": "Pet Care", "task_name": "Clean bird cages", "is_critical": False},
        {"room": "Pet Care", "task_name": "Feed tortoise", "is_critical": False, "is_persistent": True},
        {"room": "Pet Care", "task_name": "Tortoise water refreshed", "is_critical": False},
        
        # Azlan's Needs
        {"room": "Azlan's Needs", "task_name": "Refill Azlan's water bottles (min 5 in fridge)", "is_critical": False},
        
        # General/Final Checks (CRITICAL)
        {"room": "General/Final Checks", "task_name": "Everything in place — fix anything out of order", "is_critical": True},
        {"room": "General/Final Checks", "task_name": "Trash taken out", "is_critical": True},
        {"room": "General/Final Checks", "task_name": "All lights checked", "is_critical": True},
        {"room": "General/Final Checks", "task_name": "Doors locked", "is_critical": True},
    ]
    
    task_count = 0
    for task_data in tasks_data:
        task = db.query(Task).filter(
            Task.facility_id == facility.id,
            Task.room == task_data["room"],
            Task.task_name == task_data["task_name"]
        ).first()
        
        if not task:
            # Add defaults if not provided
            task_data["facility_id"] = facility.id
            task_data["assigned_role"] = caretaker_role.id
            task_data.setdefault("is_persistent", False)
            
            task = Task(**task_data)
            db.add(task)
            task_count += 1
    
    db.commit()
    print(f"✓ Created {task_count} tasks")
    
    print("\n✅ Database seeded successfully!")
    print(f"   Facility: {facility.name}")
    print(f"   Roles: {len(roles)}")
    print(f"   Shifts: {len(shifts)}")
    print(f"   Tasks: {task_count}")


if __name__ == "__main__":
    try:
        seed_database()
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()
