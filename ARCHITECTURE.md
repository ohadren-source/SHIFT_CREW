⏳_SHIFT_CREW

ARCHITECTURE DOCUMENT


SYSTEM OVERVIEW

SHIFT_CREW operates on a three-layer architecture:

  1. Frontend (Vite + React) — Task UI, shift selection, checklist completion
  2. Backend (FastAPI) — Auth, task logic, carry-over automation, dashboards
  3. Database (PostgreSQL) — Source of truth for all operations


AUTH FLOW

┌─────────────────────────────────────────────────────────┐
│                    HomeScreen                            │
│  [ Continue with Google ] [ Register with Email/PW ]    │
└─────────────────────────────────────────────────────────┘
           │                                    │
           ├──────────────────────────────────┬─┘
           ▼                                  ▼
    ┌──────────────────┐           ┌──────────────────────┐
    │ OAuth (Google)   │           │ Email/Password Auth  │
    │ POST /auth/google│           │ POST /auth/register  │
    │ callback        │           │ POST /auth/signin    │
    └──────────────────┘           └──────────────────────┘
           │                                    │
           └───────────────────┬────────────────┘
                               ▼
                    ┌─────────────────────────┐
                    │ Check staff table       │
                    │ (email, google_id)     │
                    └─────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
         Exists?              Not Exists?
        Sign In              Create Record
              │                                 │
              └────────────────┬────────────────┘
                               ▼
                    ┌─────────────────────────┐
                    │ Generate Session Token  │
                    │ (JWT or DB-backed)      │
                    │ Store in localStorage   │
                    └─────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ ShiftSelectionScreen    │
                    │ [1st] [2nd] [3rd] [WE]  │
                    └─────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ ChecklistScreen         │
                    │ Load tasks for role     │
                    │ + shift                 │
                    └─────────────────────────┘


DATABASE SCHEMA

TABLE: staff
  id              SERIAL PRIMARY KEY
  email           VARCHAR UNIQUE NOT NULL
  password_hash   VARCHAR (bcrypt, nullable if Google only)
  google_id       VARCHAR UNIQUE (nullable, for OAuth)
  role_id         FOREIGN KEY → roles.id
  facility_id     FOREIGN KEY → facilities.id
  created_at      TIMESTAMP DEFAULT NOW()
  updated_at      TIMESTAMP DEFAULT NOW()
  last_login      TIMESTAMP

TABLE: roles
  id              SERIAL PRIMARY KEY
  name            VARCHAR UNIQUE (CARETAKER, CLEANER, MAINTENANCE)
  active          BOOLEAN DEFAULT true
  description     TEXT

TABLE: facilities
  id              SERIAL PRIMARY KEY
  name            VARCHAR (e.g., "GRSCORP Household")
  location        TEXT
  created_at      TIMESTAMP DEFAULT NOW()

TABLE: shifts
  id              SERIAL PRIMARY KEY
  facility_id     FOREIGN KEY → facilities.id
  name            VARCHAR (1st Shift (AM), 2nd Shift (Midday), etc.)
  start_time      TIME
  end_time        TIME
  created_at      TIMESTAMP DEFAULT NOW()

TABLE: tasks
  id              SERIAL PRIMARY KEY
  facility_id     FOREIGN KEY → facilities.id
  room            VARCHAR (e.g., "Azlan's Room")
  task_name       VARCHAR (e.g., "Bed made")
  assigned_role   FOREIGN KEY → roles.id
  is_critical     BOOLEAN DEFAULT false
  is_persistent   BOOLEAN DEFAULT false (pet care, must-dos)
  default_shift   FOREIGN KEY → shifts.id (optional, if shift-specific)
  created_at      TIMESTAMP DEFAULT NOW()

TABLE: task_entries
  id              SERIAL PRIMARY KEY
  task_id         FOREIGN KEY → tasks.id
  staff_id        FOREIGN KEY → staff.id
  shift_id        FOREIGN KEY → shifts.id
  facility_id     FOREIGN KEY → facilities.id
  date            DATE (shift date, for daily reset)
  status          ENUM ('yes', 'no', 'not_done')
  notes           TEXT (required if status = 'not_done', optional otherwise)
  timestamp       TIMESTAMP DEFAULT NOW()
  carry_over      BOOLEAN DEFAULT false (true if this was a carried task)
  created_at      TIMESTAMP DEFAULT NOW()

TABLE: carry_over_queue
  id              SERIAL PRIMARY KEY
  task_id         FOREIGN KEY → tasks.id
  task_entry_id   FOREIGN KEY → task_entries.id (original incomplete entry)
  shift_id        FOREIGN KEY → shifts.id (next shift type)
  facility_id     FOREIGN KEY → facilities.id
  assigned_to_shift_date DATE (when carry-over should appear)
  resolved        BOOLEAN DEFAULT false
  resolved_at     TIMESTAMP
  created_at      TIMESTAMP DEFAULT NOW()


CORE ENDPOINTS

AUTH

POST /auth/register
  Request:
    {
      "email": "john@example.com",
      "password": "securepassword123",
      "name": "John Doe",
      "role_id": 1,
      "facility_id": 1
    }
  Response:
    {
      "id": 1,
      "email": "john@example.com",
      "role_id": 1,
      "session_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "expires_at": "2026-05-10T10:00:00"
    }

POST /auth/signin
  Request:
    {
      "email": "john@example.com",
      "password": "securepassword123"
    }
  Response:
    {
      "id": 1,
      "email": "john@example.com",
      "role_id": 1,
      "session_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "expires_at": "2026-05-10T10:00:00"
    }

POST /auth/google-callback
  Request:
    {
      "google_token": "ya29.a0AfH..."
    }
  Response:
    {
      "id": 1,
      "email": "john@gmail.com",
      "role_id": 1,
      "session_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "expires_at": "2026-05-10T10:00:00"
    }

POST /auth/logout
  Request: { "session_token": "..." }
  Response: { "success": true }


TASKS

GET /tasks?shift_id=1&role_id=1&facility_id=1
  Returns all tasks for given shift + role + facility
  Grouped by room
  Response:
    {
      "tasks": [
        {
          "id": 1,
          "room": "Azlan's Room",
          "task_name": "Bed made",
          "is_critical": false,
          "is_persistent": false,
          "status": null
        },
        ...
      ],
      "carry_over_count": 3
    }

GET /tasks/carry-over?shift_id=1&facility_id=1&date=2026-05-10
  Returns only carry-over tasks for next shift
  Response:
    {
      "carry_over_tasks": [
        {
          "id": 1,
          "task_id": 5,
          "room": "Kitchen",
          "task_name": "Dishes done",
          "notes": "Dishwasher broken, hand-washed instead",
          "created_at": "2026-05-09T14:00:00",
          "previous_staff_id": 2
        },
        ...
      ]
    }


TASK COMPLETION

POST /task-entry
  Request:
    {
      "task_id": 1,
      "staff_id": 2,
      "shift_id": 1,
      "facility_id": 1,
      "status": "yes" | "no" | "not_done",
      "notes": "optional for yes/no, required for not_done"
    }
  Response:
    {
      "id": 100,
      "task_id": 1,
      "status": "not_done",
      "timestamp": "2026-05-10T08:30:00",
      "carry_over_queued": true,
      "carry_over_id": 50
    }

  Backend Logic (on POST /task-entry):
    1. Insert record into task_entries
    2. If status == "not_done":
       - Create entry in carry_over_queue
       - Find next occurrence of this shift type
       - Assign carry-over to that shift's date
       - Mark as carry_over = true
    3. Return task_entry + carry_over status


GET /task-entry/:id
  Returns single task entry (for viewing history)

PUT /task-entry/:id
  Update a task entry (admin only, for corrections)


DASHBOARD

GET /dashboard/daily?facility_id=1&date=2026-05-10
  Returns metrics for a single day, all shifts
  Response:
    {
      "date": "2026-05-10",
      "shifts": [
        {
          "shift_id": 1,
          "shift_name": "1st Shift (AM)",
          "staff_on_duty": [
            {
              "staff_id": 1,
              "name": "Jane Doe",
              "role": "CARETAKER",
              "tasks_completed": 45,
              "tasks_total": 73,
              "completion_pct": 61,
              "critical_missed": 2,
              "carry_over_count": 5
            }
          ]
        }
      ],
      "facility_totals": {
        "tasks_completed": 150,
        "tasks_total": 220,
        "completion_pct": 68,
        "critical_missed": 5,
        "total_carry_over": 12
      }
    }

GET /dashboard/weekly?facility_id=1&week_start=2026-05-05
  Returns aggregated metrics for one week
  Response:
    {
      "week": "2026-05-05 to 2026-05-11",
      "by_staff": [
        {
          "staff_id": 1,
          "name": "Jane Doe",
          "shifts_worked": 7,
          "avg_completion_pct": 72,
          "critical_missed": 3,
          "notes_written": 8
        }
      ],
      "by_role": [
        {
          "role": "CARETAKER",
          "avg_completion_pct": 75,
          "critical_missed": 4,
          "staff_count": 2
        }
      ]
    }


CARRY-OVER LOGIC

When staff marks a task "Not Done":

  1. POST /task-entry with status: "not_done"
  
  2. Backend:
     - Inserts task_entry record
     - Queries shifts table for next occurrence of current shift type
     - Calculates shift_date = next shift's date
     - Inserts carry_over_queue record with:
       shift_id: next shift ID
       assigned_to_shift_date: next shift's date
       resolved: false
  
  3. Next shift loads:
     - GET /tasks/carry-over?shift_id=1&date=2026-05-11
     - Returns all carry-over tasks pre-filled
     - Frontend renders in RED at top of checklist
  
  4. Staff completes carry-over task:
     - POST /task-entry with same task_id
     - Backend checks if this completes any carry-over_queue entries
     - If yes: update carry_over_queue.resolved = true
     - Task leaves queue


PERSISTENT TASKS

Persistent tasks (pet care, critical operations) have special handling:

  1. Query tasks WHERE is_persistent = true OR is_critical = true
  
  2. Frontend:
     - Separate into "PERSISTENT" group at top of screen
     - RED background, warning icon
     - Cannot collapse or hide
     - Submit button DISABLED until all persistent = "yes"
  
  3. Reset at shift change:
     - When new shift starts, reset status to null
     - Persistent tasks appear on-screen immediately
     - Staff cannot proceed until completed


SESSION MANAGEMENT

Session token issued on auth, stored in localStorage:

  GET /api/protected-endpoint
  Headers: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Backend validates token on every request:
  - Decode JWT
  - Verify signature (SECRET_KEY)
  - Check expiration
  - Return 401 if invalid

Token expires after 12 hours or explicit logout.


ROLE-BASED TASK FILTERING

When staff logs in:
  1. Fetch staff.role_id
  2. GET /tasks?role_id=1&shift_id=1&facility_id=1
  3. Backend returns only tasks WHERE assigned_role = staff.role_id
  4. Frontend renders task list
  
  Example:
    - CARETAKER sees all 73 tasks
    - MAINTENANCE (if activated) sees only HVAC, plumbing, electrical tasks
    - CLEANER sees only cleaning tasks


ERROR HANDLING

All endpoints return standardized error responses:

  {
    "status": "error",
    "code": 400,
    "message": "Validation failed",
    "details": {
      "field": "notes",
      "reason": "Required when status is 'not_done'"
    }
  }

Common errors:
  400 — Bad request (missing fields, validation failure)
  401 — Unauthorized (invalid token, expired session)
  403 — Forbidden (staff trying to access another staff's data)
  404 — Not found (task, shift, facility doesn't exist)
  500 — Server error


FRONTEND STATE MANAGEMENT

React component structure:

  <App>
    <AuthContext> (session token, staff info, role)
      <ShiftSelectionScreen> (pick shift)
      <ChecklistScreen>
        <PersistentTasksPanel> (locked, must complete)
        <RoomTabs>
          <RoomSection> (one room's tasks)
            <TaskItem> (single task with Yes/No/Not Done buttons)
        </RoomTabs>
        <SubmitButton> (disabled until persistent tasks done)
      <DashboardScreen> (admin only)
        <DailyMetrics>
        <WeeklyMetrics>
        <StaffPerformance>
      <HistoryScreen> (staff can see their past entries)


DEPLOYMENT CHECKLIST

Before going live:

  ☐ DATABASE_URL env var set (PostgreSQL)
  ☐ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET configured
  ☐ SECRET_KEY generated (for JWT signing)
  ☐ Migrations run (alembic upgrade head)
  ☐ Backend API running and accessible
  ☐ Frontend built and served (npm run build)
  ☐ CORS enabled (FastAPI)
  ☐ SSL/TLS enabled on production
  ☐ Test auth flow (email + password, Google)
  ☐ Test task completion and carry-over
  ☐ Test dashboard access (admin)
  ☐ Load test (verify database connection pooling)


SCALING CONSIDERATIONS

Multi-facility support:
  - Add facility_id to all relevant queries
  - Staff table can have facility_id (one staff per facility, or multi-facility later)
  - Tasks inherit facility_id (each facility has its own task list)

Multi-role support:
  - Role already in schema, just activate in roles table
  - Task-to-role assignment is data-driven
  - No code changes needed

API rate limiting:
  - Implement per-user rate limiting on /task-entry (prevent spam)
  - Implement dashboard query caching (expensive aggregations)

Data archival:
  - After 90 days, move old task_entries to archive table
  - Keep carry_over_queue only for active/future dates
  - Keep dashboard metrics for compliance audit trail


⏳_SHIFT_CREW
Architecture locked. Ready for Phase 1.
