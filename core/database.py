import os
from dotenv import load_dotenv
load_dotenv()

import psycopg2
import psycopg2.extras
import json
import hashlib
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

def get_db_connection():
    """Returns a connection to the PostgreSQL database with cursor factory configured for dictionaries."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not set in environment or .env file.")
    conn = psycopg2.connect(db_url)
    return conn

def hash_password(password: str, salt: str) -> str:
    """Hashes a password with a salt using SHA-256."""
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def init_db():
    """Initializes the database schema and seeds default departments, settings and users."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id              SERIAL PRIMARY KEY,
        department_name TEXT UNIQUE NOT NULL,
        vision          TEXT NOT NULL DEFAULT '',
        mission         TEXT NOT NULL DEFAULT '',
        academic_year   TEXT DEFAULT '2025-26',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        username        TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        salt            TEXT NOT NULL,
        role            TEXT NOT NULL CHECK (role IN ('admin', 'course_champion', 'course_faculty')),
        name            TEXT NOT NULL,
        department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        status          TEXT NOT NULL DEFAULT 'active',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id              SERIAL PRIMARY KEY,
        subject_code    TEXT,
        subject_name    TEXT NOT NULL,
        semester        TEXT NOT NULL DEFAULT '',
        year            TEXT NOT NULL,
        department_id   INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(subject_name, year, department_id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS course_assignments (
        id          SERIAL PRIMARY KEY,
        subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        faculty_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role        TEXT NOT NULL CHECK (role IN ('COURSE_CHAMPION', 'COURSE_FACULTY')),
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(subject_id, faculty_id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subject_states (
        id              SERIAL PRIMARY KEY,
        subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
        schema_version  INTEGER NOT NULL DEFAULT 1,
        state_data      JSONB NOT NULL DEFAULT '{}',
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)

    # Migration to support user-specific subject states
    try:
        # Drop any existing unique constraints on subject_states
        cursor.execute(
            """
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'subject_states'::regclass AND contype = 'u'
            """
        )
        for con in cursor.fetchall():
            cursor.execute(f"ALTER TABLE subject_states DROP CONSTRAINT IF EXISTS {con[0]};")
            
        # Add user_id column if not exists
        cursor.execute("ALTER TABLE subject_states ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;")
        
        # Re-create index constraints
        cursor.execute("DROP INDEX IF EXISTS idx_subject_states_master;")
        cursor.execute("CREATE UNIQUE INDEX idx_subject_states_master ON subject_states (subject_id) WHERE user_id IS NULL;")
        
        cursor.execute("DROP INDEX IF EXISTS idx_subject_states_user;")
        cursor.execute("CREATE UNIQUE INDEX idx_subject_states_user ON subject_states (subject_id, user_id) WHERE user_id IS NOT NULL;")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Subject states migration warning: {e}")
    
    # Check if index exists before creating it
    cursor.execute("""
    SELECT 1 FROM pg_class WHERE relname = 'idx_subject_states_data';
    """)
    if not cursor.fetchone():
        cursor.execute("CREATE INDEX idx_subject_states_data ON subject_states USING GIN (state_data);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username    TEXT NOT NULL,
        login_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address  TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id          SERIAL PRIMARY KEY,
        action      TEXT NOT NULL,
        entity      TEXT,
        old_value   JSONB,
        new_value   JSONB,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subject_id  INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)
    
    # 1.1 Create System Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        id                    SERIAL PRIMARY KEY,
        academic_year         TEXT NOT NULL DEFAULT '2025-26',
        fy_thresholds         TEXT NOT NULL DEFAULT '50,55,60',
        sy_thresholds         TEXT NOT NULL DEFAULT '60,65,70',
        ty_thresholds         TEXT NOT NULL DEFAULT '65,75,80',
        jwt_session_timeout   INTEGER NOT NULL DEFAULT 45,
        theme                 TEXT NOT NULL DEFAULT 'light',
        branding_college_name TEXT NOT NULL DEFAULT 'MIT Academy of Engineering',
        branding_logo_text    TEXT NOT NULL DEFAULT 'MIT'
    );
    """)

    # 1.2 Perform migrations if columns are missing
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';")
    cursor.execute("ALTER TABLE departments ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-26';")
    cursor.execute("ALTER TABLE subject_states ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'available';")
    cursor.execute("ALTER TABLE subject_states ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;")
    cursor.execute("ALTER TABLE subject_states ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;")
    
    conn.commit()

    # 2. Seed Default Department
    cursor.execute("SELECT COUNT(*) as count FROM departments")
    dept_count = cursor.fetchone()[0]
    dept_id = None
    if dept_count == 0:
        cursor.execute("""
            INSERT INTO departments (department_name, vision, mission)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (
            "Department of Computer Engineering",
            "To be a premier center of excellence in computer science education and research.",
            "To impart quality computer education, promote innovative research, and nurture ethical professionals."
        ))
        dept_id = cursor.fetchone()[0]
        conn.commit()
    else:
        cursor.execute("SELECT id FROM departments LIMIT 1")
        dept_id = cursor.fetchone()[0]

    # 3. Seed Default System Settings
    cursor.execute("SELECT COUNT(*) as count FROM system_settings")
    settings_count = cursor.fetchone()[0]
    if settings_count == 0:
        cursor.execute("""
            INSERT INTO system_settings (
                academic_year, fy_thresholds, sy_thresholds, ty_thresholds,
                jwt_session_timeout, theme, branding_college_name, branding_logo_text
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            "2025-26", "50,55,60", "60,65,70", "65,75,80", 45, "light", "MIT Academy of Engineering", "MIT"
        ))
        conn.commit()

    # 4. Seed Default Users
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()[0]
    if user_count == 0:
        default_users = [
            ("admin", "admin123", "admin", "System Administrator", dept_id),
            ("faculty", "faculty123", "course_faculty", "Dr. Atharva Kamble", dept_id),
            ("champion", "champion123", "course_champion", "Course Champion Prof.", dept_id)
        ]
        for username, password, role, name, department_id in default_users:
            salt = uuid.uuid4().hex
            pwd_hash = hash_password(password, salt)
            cursor.execute(
                """
                INSERT INTO users (username, password_hash, salt, role, name, department_id, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'active')
                """,
                (username, pwd_hash, salt, role, name, department_id)
            )
        conn.commit()
        print("Database seeded with default department, settings and users.")
        
    cursor.close()
    conn.close()

def verify_user(username: str, password_plain: str) -> Optional[Dict[str, Any]]:
    """Verifies user credentials. Returns user details on success, or None on failure."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT u.*, d.department_name 
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.username = %s
    """, (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return None
        
    expected_hash = hash_password(password_plain, user["salt"])
    if expected_hash == user["password_hash"]:
        return {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "name": user["name"],
            "status": user.get("status", "active"),
            "department_name": user["department_name"]
        }
    return None

def log_login_attempt(username: str, ip_address: str):
    """Inserts a login log entry into the database."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Retrieve user_id if exists
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = cursor.fetchone()
    user_id = row["id"] if row else None
    
    cursor.execute(
        "INSERT INTO login_logs (user_id, username, login_time, ip_address) VALUES (%s, %s, NOW(), %s)",
        (user_id, username, ip_address)
    )
    conn.commit()
    cursor.close()
    conn.close()

def get_login_logs() -> List[Dict[str, Any]]:
    """Fetches all login logs, ordered by login_time descending."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM login_logs ORDER BY login_time DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    
    # Convert datetime values to ISO string for JSON serialization
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("login_time"), datetime):
            d["login_time"] = d["login_time"].isoformat()
        results.append(d)
    return results

def save_subject_state(subject_name: str, year: str, data_dict: Dict[str, Any], user_id: Optional[int] = None):
    """Saves or updates subject state in the database, supporting user-specific scopes."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Resolve the correct department from the subject's state data
        dept_name = data_dict.get("department", "").strip()
        dept_id = None
        if dept_name:
            cursor.execute("SELECT id FROM departments WHERE department_name = %s", (dept_name,))
            row = cursor.fetchone()
            if row:
                dept_id = row["id"]
            else:
                # Auto-create the department if it doesn't exist yet
                cursor.execute(
                    "INSERT INTO departments (department_name, vision, mission) VALUES (%s, %s, %s) RETURNING id",
                    (dept_name, "", "")
                )
                dept_id = cursor.fetchone()["id"]
                conn.commit()
        
        # Fallback to first department only if no department name was specified
        if dept_id is None:
            cursor.execute("SELECT id FROM departments LIMIT 1")
            row = cursor.fetchone()
            dept_id = row["id"] if row else None

        # Upsert subject - use UPDATE-first approach to handle department_id changes
        cursor.execute(
            "SELECT id FROM subjects WHERE subject_name = %s AND year = %s",
            (subject_name, year)
        )
        existing = cursor.fetchone()
        if existing:
            subject_id = existing["id"]
            cursor.execute(
                "UPDATE subjects SET semester = %s, department_id = %s WHERE id = %s",
                (data_dict.get("semester", ""), dept_id, subject_id)
            )
        else:
            cursor.execute(
                "INSERT INTO subjects (subject_name, year, semester, department_id) VALUES (%s, %s, %s, %s) RETURNING id",
                (subject_name, year, data_dict.get("semester", ""), dept_id)
            )
            subject_id = cursor.fetchone()["id"]

        # Upsert subject state (user-specific or default master)
        if user_id is not None:
            cursor.execute(
                """
                INSERT INTO subject_states (subject_id, user_id, state_data, schema_version, updated_at)
                VALUES (%s, %s, %s, 1, NOW())
                ON CONFLICT (subject_id, user_id) WHERE user_id IS NOT NULL DO UPDATE 
                SET state_data = EXCLUDED.state_data,
                    updated_at = NOW()
                """,
                (subject_id, user_id, json.dumps(data_dict))
            )
        else:
            cursor.execute(
                """
                INSERT INTO subject_states (subject_id, user_id, state_data, schema_version, updated_at)
                VALUES (%s, NULL, %s, 1, NOW())
                ON CONFLICT (subject_id) WHERE user_id IS NULL DO UPDATE 
                SET state_data = EXCLUDED.state_data,
                    updated_at = NOW()
                """,
                (subject_id, json.dumps(data_dict))
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_subject_state(subject_name: str, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Retrieves subject state data (default master or user-specific) from the database."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if user_id is not None:
        cursor.execute(
            """
            SELECT ss.state_data 
            FROM subject_states ss
            JOIN subjects s ON ss.subject_id = s.id
            WHERE s.subject_name = %s AND ss.user_id = %s
            """,
            (subject_name, user_id)
        )
    else:
        cursor.execute(
            """
            SELECT ss.state_data 
            FROM subject_states ss
            JOIN subjects s ON ss.subject_id = s.id
            WHERE s.subject_name = %s AND ss.user_id IS NULL
            """,
            (subject_name,)
        )
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["state_data"]
    return None

def list_subjects() -> List[Dict[str, Any]]:
    """Retrieves all subjects from the database."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        """
        SELECT s.subject_name, s.year, ss.state_data 
        FROM subjects s
        LEFT JOIN subject_states ss ON s.id = ss.subject_id
        ORDER BY s.subject_name
        """
    )
    rows = cursor.fetchall()
    conn.close()
    
    subjects_list = []
    for row in rows:
        if row["state_data"]:
            subjects_list.append({
                "subject_name": row["subject_name"],
                "year": row["year"],
                "data": row["state_data"]
            })
    return subjects_list

def delete_subject(subject_name: str):
    """Deletes a subject from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subjects WHERE subject_name = %s", (subject_name,))
    conn.commit()
    cursor.close()
    conn.close()

def migrate_subject_if_not_exists(subject_name: str, year: str, data_dict: Dict[str, Any]) -> bool:
    """Migrates a subject state to the database only if not already present."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT COUNT(*) as count FROM subjects WHERE subject_name = %s AND year = %s", (subject_name, year))
    exists = cursor.fetchone()["count"] > 0
    conn.close()
    
    if not exists:
        save_subject_state(subject_name, year, data_dict)
        return True
    return False

# --- Department functions ---
def create_department(name: str, vision: str = "", mission: str = "") -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO departments (department_name, vision, mission) VALUES (%s, %s, %s) RETURNING id",
        (name, vision, mission)
    )
    dept_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return dept_id

def get_department(department_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM departments WHERE id = %s", (department_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_department_by_name(name: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM departments WHERE department_name = %s", (name,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def list_departments() -> list:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM departments ORDER BY department_name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Subject functions (normalized) ---
def create_subject(name: str, year: str, semester: str, department_id: int) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO subjects (subject_name, year, semester, department_id) VALUES (%s, %s, %s, %s) RETURNING id",
        (name, year, semester, department_id)
    )
    subject_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return subject_id

def get_subject(subject_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM subjects WHERE id = %s", (subject_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_subject_by_name(name: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM subjects WHERE subject_name = %s", (name,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def list_subjects_by_department(department_id: int) -> list:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM subjects WHERE department_id = %s ORDER BY subject_name", (department_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Course assignments ---
def assign_faculty_to_subject(faculty_id: int, subject_id: int, role: str) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO course_assignments (subject_id, faculty_id, role)
        VALUES (%s, %s, %s)
        ON CONFLICT (subject_id, faculty_id) DO UPDATE SET role = EXCLUDED.role
        RETURNING id
        """,
        (subject_id, faculty_id, role)
    )
    assignment_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return assignment_id

def get_faculty_subjects(faculty_id: int) -> list:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        """
        SELECT s.* FROM subjects s
        JOIN course_assignments ca ON s.id = ca.subject_id
        WHERE ca.faculty_id = %s
        """,
        (faculty_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Subject state (JSONB) ---
def save_subject_state_by_id(subject_id: int, state_dict: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO subject_states (subject_id, state_data, schema_version, updated_at)
        VALUES (%s, %s, 1, NOW())
        ON CONFLICT (subject_id) DO UPDATE SET
            state_data = EXCLUDED.state_data,
            updated_at = NOW()
        """,
        (subject_id, json.dumps(state_dict))
    )
    conn.commit()
    conn.close()

def get_subject_state_by_id(subject_id: int) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT state_data FROM subject_states WHERE subject_id = %s", (subject_id,))
    row = cursor.fetchone()
    conn.close()
    return row["state_data"] if row else None

def delete_subject_state(subject_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subject_states WHERE subject_id = %s", (subject_id,))
    conn.commit()
    conn.close()

# --- Improved Audit Logging ---
def log_audit_action(action: str, entity: str = None, old_value: dict = None, new_value: dict = None, user_id: int = None, subject_id: int = None):
    """Logs an administrative or faculty action in the audit_logs table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    old_json = json.dumps(old_value) if old_value else None
    new_json = json.dumps(new_value) if new_value else None
    
    cursor.execute(
        """
        INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """,
        (action, entity, old_json, new_json, user_id, subject_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

# --- Administrative Helpers ---

def get_system_settings() -> dict:
    """Fetches the current settings from the system_settings table."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM system_settings ORDER BY id LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def save_system_settings(academic_year: str, fy_thresholds: str, sy_thresholds: str, ty_thresholds: str, jwt_session_timeout: int, theme: str, branding_college_name: str, branding_logo_text: str):
    """Saves system settings. Creates a default setting row if it does not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM system_settings LIMIT 1")
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE system_settings 
            SET academic_year = %s, fy_thresholds = %s, sy_thresholds = %s, ty_thresholds = %s,
                jwt_session_timeout = %s, theme = %s, branding_college_name = %s, branding_logo_text = %s
            WHERE id = %s
            """,
            (academic_year, fy_thresholds, sy_thresholds, ty_thresholds, jwt_session_timeout, theme, branding_college_name, branding_logo_text, row[0])
        )
    else:
        cursor.execute(
            """
            INSERT INTO system_settings (academic_year, fy_thresholds, sy_thresholds, ty_thresholds, jwt_session_timeout, theme, branding_college_name, branding_logo_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (academic_year, fy_thresholds, sy_thresholds, ty_thresholds, jwt_session_timeout, theme, branding_college_name, branding_logo_text)
        )
    conn.commit()
    cursor.close()
    conn.close()

def list_users_detailed() -> list:
    """Lists all users with department names and statuses."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        """
        SELECT u.id, u.username, u.name, u.role, u.status, u.created_at, d.department_name, u.department_id
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.created_at DESC
        """
    )
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        results.append(d)
    return results

def create_user_db(username: str, password_plain: str, role: str, name: str, department_id: Optional[int]) -> int:
    """Creates a user in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    salt = uuid.uuid4().hex
    pwd_hash = hash_password(password_plain, salt)
    cursor.execute(
        """
        INSERT INTO users (username, password_hash, salt, role, name, department_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'active')
        RETURNING id
        """,
        (username, pwd_hash, salt, role, name, department_id)
    )
    user_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return user_id

def update_user_db(user_id: int, username: str, role: str, name: str, department_id: Optional[int], status: str):
    """Updates user information."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE users
        SET username = %s, role = %s, name = %s, department_id = %s, status = %s
        WHERE id = %s
        """,
        (username, role, name, department_id, status, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def reset_password_db(user_id: int, password_plain: str):
    """Resets a user's password with a new salt and hash."""
    conn = get_db_connection()
    cursor = conn.cursor()
    salt = uuid.uuid4().hex
    pwd_hash = hash_password(password_plain, salt)
    cursor.execute(
        """
        UPDATE users
        SET password_hash = %s, salt = %s
        WHERE id = %s
        """,
        (pwd_hash, salt, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def toggle_user_status_db(user_id: int) -> str:
    """Toggles a user's status between 'active' and 'disabled'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
    new_status = 'disabled' if row[0] == 'active' else 'active'
    cursor.execute("UPDATE users SET status = %s WHERE id = %s", (new_status, user_id))
    conn.commit()
    cursor.close()
    conn.close()
    return new_status

def list_departments_detailed() -> list:
    """Lists all departments."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM departments ORDER BY department_name")
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        if isinstance(d.get("updated_at"), datetime):
            d["updated_at"] = d["updated_at"].isoformat()
        results.append(d)
    return results

def update_department_db(dept_id: int, name: str, vision: str, mission: str, academic_year: str):
    """Updates academic department info."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE departments
        SET department_name = %s, vision = %s, mission = %s, academic_year = %s, updated_at = NOW()
        WHERE id = %s
        """,
        (name, vision, mission, academic_year, dept_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def list_subjects_detailed() -> list:
    """Lists all subjects joined with department names."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        """
        SELECT s.id, s.subject_code, s.subject_name, s.semester, s.year, s.department_id, d.department_name
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.subject_name
        """
    )
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        results.append(d)
    return results

def create_subject_db(subject_code: str, subject_name: str, semester: str, year: str, department_id: int) -> int:
    """Creates a subject and initializes its subject state."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO subjects (subject_code, subject_name, semester, year, department_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (subject_code, subject_name, semester, year, department_id)
        )
        subject_id = cursor.fetchone()[0]
        
        # Initialize default subject state data
        default_state = {
            "schema_version": 1,
            "subject_name": subject_name,
            "year": year,
            "semester": semester,
            "syllabus_text": "",
            "department": "",
            "vision_mission": "",
            "performance_indicators": [],
            "pi_mappings": [],
            "level1_threshold": 55.0,
            "level2_threshold": 65.0,
            "level3_threshold": 75.0,
            "cos": [],
            "pos": [],
            "co_po_mapping": [],
            "mapping_locked": False,
            "co_attainment": [],
            "po_attainment": [],
            "teaching_philosophy": "",
            "recommendations": [],
            "audit_trail": [],
            "students": [],
            "max_marks": {}
        }
        
        cursor.execute(
            """
            INSERT INTO subject_states (subject_id, state_data, schema_version, updated_at)
            VALUES (%s, %s, 1, NOW())
            """,
            (subject_id, json.dumps(default_state))
        )
        conn.commit()
        return subject_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def delete_subject_db(subject_id: int):
    """Deletes a subject and its associated states/assignments from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subjects WHERE id = %s", (subject_id,))
    conn.commit()
    cursor.close()
    conn.close()

def list_assignments_detailed() -> list:
    """Lists subjects and their assignments (champions & faculty)."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Get all subjects
    cursor.execute(
        """
        SELECT s.id, s.subject_code, s.subject_name, s.semester, s.year, d.department_name
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.subject_name
        """
    )
    subjects_rows = cursor.fetchall()
    
    # Get all assignments
    cursor.execute(
        """
        SELECT ca.subject_id, ca.faculty_id, ca.role, u.name as faculty_name, u.username as faculty_username
        FROM course_assignments ca
        JOIN users u ON ca.faculty_id = u.id
        """
    )
    assignments_rows = cursor.fetchall()
    conn.close()
    
    # Map assignments by subject_id
    assign_map = {}
    for a in assignments_rows:
        sid = a["subject_id"]
        if sid not in assign_map:
            assign_map[sid] = []
        assign_map[sid].append(a)
        
    results = []
    for s in subjects_rows:
        subj = dict(s)
        s_assigns = assign_map.get(s["id"], [])
        
        champion = None
        faculty_list = []
        
        for a in s_assigns:
            if a["role"] == "COURSE_CHAMPION":
                champion = {
                    "faculty_id": a["faculty_id"],
                    "name": a["faculty_name"],
                    "username": a["faculty_username"]
                }
            elif a["role"] == "COURSE_FACULTY":
                faculty_list.append({
                    "faculty_id": a["faculty_id"],
                    "name": a["faculty_name"],
                    "username": a["faculty_username"]
                })
                
        subj["champion"] = champion
        subj["faculties"] = faculty_list
        results.append(subj)
        
    return results

def assign_champion_db(subject_id: int, faculty_id: int):
    """Assigns exactly one Course Champion to a subject. Removes existing champion assignment."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Delete existing champion assignment for the subject
        cursor.execute(
            "DELETE FROM course_assignments WHERE subject_id = %s AND role = 'COURSE_CHAMPION'",
            (subject_id,)
        )
        # Also remove this person if they are assigned as faculty to keep it clean (or keep both if database UNIQUE allows, but UNIQUE is subject_id + faculty_id)
        cursor.execute(
            "DELETE FROM course_assignments WHERE subject_id = %s AND faculty_id = %s",
            (subject_id, faculty_id)
        )
        # Insert new champion assignment
        cursor.execute(
            """
            INSERT INTO course_assignments (subject_id, faculty_id, role)
            VALUES (%s, %s, 'COURSE_CHAMPION')
            """,
            (subject_id, faculty_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def add_faculty_db(subject_id: int, faculty_id: int):
    """Adds a faculty member to a subject."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO course_assignments (subject_id, faculty_id, role)
            VALUES (%s, %s, 'COURSE_FACULTY')
            ON CONFLICT (subject_id, faculty_id) DO UPDATE SET role = 'COURSE_FACULTY'
            """,
            (subject_id, faculty_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def remove_faculty_db(subject_id: int, faculty_id: int):
    """Removes a faculty assignment from a subject."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM course_assignments WHERE subject_id = %s AND faculty_id = %s AND role = 'COURSE_FACULTY'",
        (subject_id, faculty_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

def get_admin_dashboard_stats() -> dict:
    """Compiles overview statistics for the administrative dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    stats = {}
    
    # 1. Total Departments
    cursor.execute("SELECT COUNT(*) FROM departments")
    stats["total_departments"] = cursor.fetchone()["count"]
    
    # 2. Total Users
    cursor.execute("SELECT COUNT(*) FROM users")
    stats["total_users"] = cursor.fetchone()["count"]
    
    # 3. Total Subjects
    cursor.execute("SELECT COUNT(*) FROM subjects")
    stats["total_subjects"] = cursor.fetchone()["count"]
    
    # 4. Total Champions
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'course_champion'")
    stats["total_champions"] = cursor.fetchone()["count"]
    
    # 5. Total Faculty
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'course_faculty'")
    stats["total_faculty"] = cursor.fetchone()["count"]
    
    # 6. Active Sessions (unique login_logs users in last 24h)
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM login_logs WHERE login_time >= NOW() - INTERVAL '24 hours'")
    stats["active_sessions"] = cursor.fetchone()["count"]
    
    # 7. Completed Subjects (attainment populated in JSONB state)
    cursor.execute(
        """
        SELECT COUNT(DISTINCT subject_id) FROM subject_states 
        WHERE state_data->'co_attainment' IS NOT NULL 
          AND jsonb_array_length(state_data->'co_attainment') > 0
        """
    )
    stats["subjects_completed"] = cursor.fetchone()["count"]
    
    # 8. Pending Subjects
    stats["pending_subjects"] = max(0, stats["total_subjects"] - stats["subjects_completed"])
    
    # 9. Recent login logs
    cursor.execute(
        """
        SELECT l.id, l.username, u.name, u.role, l.login_time, l.ip_address
        FROM login_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.login_time DESC
        LIMIT 5
        """
    )
    logins = cursor.fetchall()
    stats["recent_login_activity"] = []
    for l in logins:
        d = dict(l)
        if isinstance(d.get("login_time"), datetime):
            d["login_time"] = d["login_time"].isoformat()
        stats["recent_login_activity"].append(d)
        
    # 10. Recent actions
    cursor.execute(
        """
        SELECT a.id, a.action, a.entity, a.created_at, u.name as user_name, u.username
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 5
        """
    )
    actions = cursor.fetchall()
    stats["recent_actions"] = []
    for a in actions:
        d = dict(a)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        stats["recent_actions"].append(d)
        
    conn.close()
    return stats

def get_monitoring_data() -> list:
    """Returns read-only subjects statistics: progress details, attainment values."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Fetch all subjects and states
    cursor.execute(
        """
        SELECT s.id, s.subject_code, s.subject_name, s.semester, s.year, d.department_name, ss.state_data
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN subject_states ss ON s.id = ss.subject_id
        ORDER BY s.subject_name
        """
    )
    rows = cursor.fetchall()
    
    # Get active champions
    cursor.execute(
        """
        SELECT ca.subject_id, u.name as champion_name
        FROM course_assignments ca
        JOIN users u ON ca.faculty_id = u.id
        WHERE ca.role = 'COURSE_CHAMPION'
        """
    )
    champion_rows = cursor.fetchall()
    conn.close()
    
    champion_map = {r["subject_id"]: r["champion_name"] for r in champion_rows}
    
    results = []
    for r in rows:
        d = dict(r)
        state_data = d.pop("state_data") or {}
        
        # Calculate progress status
        has_syllabus = bool(state_data.get("syllabus_text", "").strip())
        cos = state_data.get("cos", [])
        has_cos = len(cos) > 0
        has_mappings = len(state_data.get("co_po_mapping", [])) > 0
        co_attainment = state_data.get("co_attainment", [])
        has_attainment = len(co_attainment) > 0
        
        if has_attainment:
            status = "Completed"
        elif has_mappings:
            status = "CO-PO Mapped"
        elif has_cos:
            status = "COs Generated"
        elif has_syllabus:
            status = "Syllabus Uploaded"
        else:
            status = "Syllabus Pending"
            
        # Calculate average attainment
        avg_attainment = 0.0
        if has_attainment:
            avg_attainment = round(
                sum(co.get("avg_percentage", 0.0) for co in co_attainment) / len(co_attainment),
                1
            )
            
        d["champion_name"] = champion_map.get(d["id"], "Not Assigned")
        d["status"] = status
        d["avg_attainment"] = avg_attainment
        results.append(d)
        
    return results

def list_audit_logs(action: Optional[str] = None, entity: Optional[str] = None, user_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list:
    """Lists audit logs with optional filters."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    query = """
        SELECT a.id, a.action, a.entity, a.old_value, a.new_value, a.created_at, u.name as user_name, u.username, s.subject_name
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN subjects s ON a.subject_id = s.id
        WHERE 1=1
    """
    params = []
    
    if action:
        query += " AND a.action = %s"
        params.append(action)
    if entity:
        query += " AND a.entity = %s"
        params.append(entity)
    if user_id:
        query += " AND a.user_id = %s"
        params.append(user_id)
    if start_date:
        query += " AND a.created_at >= %s"
        params.append(start_date)
    if end_date:
        query += " AND a.created_at <= %s"
        params.append(end_date)
        
    query += " ORDER BY a.created_at DESC LIMIT 500"
    
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        results.append(d)
        
    return results

def acquire_upload_lock(subject_name: str, user_id: int) -> bool:
    """
    Attempts to acquire the upload lock for a subject.
    If the lock is held by another user and has not expired (< 15 mins), returns False.
    If lock is expired, auto-unlocks and acquires it, logging UPLOAD_LOCK_TIMEOUT and UPLOAD_LOCK_ACQUIRED.
    If available, acquires it, logging UPLOAD_LOCK_ACQUIRED.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # Resolve subject_id
        cursor.execute("SELECT id FROM subjects WHERE subject_name = %s", (subject_name,))
        row = cursor.fetchone()
        if not row:
            return False
        subject_id = row["id"]
        
        # Check current lock state
        cursor.execute("SELECT upload_status, locked_by, locked_at FROM subject_states WHERE subject_id = %s AND user_id IS NULL", (subject_id,))
        state = cursor.fetchone()
        if not state:
            return False
            
        # Check if currently locked
        if state["upload_status"] == "locked":
            if state["locked_by"] == user_id:
                # Same user already has lock, extend it!
                cursor.execute(
                    "UPDATE subject_states SET locked_at = NOW() WHERE subject_id = %s AND user_id IS NULL",
                    (subject_id,)
                )
                conn.commit()
                return True
                
            locked_at = state["locked_at"]
            # Check timeout (15 minutes = 900 seconds)
            if locked_at:
                from datetime import timezone
                locked_at_utc = locked_at.astimezone(timezone.utc).replace(tzinfo=None) if locked_at.tzinfo is not None else locked_at
                if (datetime.utcnow() - locked_at_utc).total_seconds() > 900:
                    # Lock has timed out, log timeout
                    cursor.execute(
                        """
                        INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
                        VALUES ('UPLOAD_LOCK_TIMEOUT', 'marks', %s, NULL, %s, %s, NOW())
                        """,
                        (json.dumps({"locked_by": state["locked_by"], "locked_at": locked_at.isoformat()}), state["locked_by"], subject_id)
                    )
                    # Now acquire lock for new user
                    cursor.execute(
                        "UPDATE subject_states SET upload_status = 'locked', locked_by = %s, locked_at = NOW() WHERE subject_id = %s AND user_id IS NULL",
                        (user_id, subject_id)
                    )
                    cursor.execute(
                        """
                        INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
                        VALUES ('UPLOAD_LOCK_ACQUIRED', 'marks', NULL, %s, %s, %s, NOW())
                        """,
                        (json.dumps({"locked_by": user_id}), user_id, subject_id)
                    )
                    conn.commit()
                    return True
                else:
                    # Lock is active and belongs to someone else
                    return False
            else:
                # No locked_at timestamp, treat as expired and acquire lock
                cursor.execute(
                    "UPDATE subject_states SET upload_status = 'locked', locked_by = %s, locked_at = NOW() WHERE subject_id = %s AND user_id IS NULL",
                    (user_id, subject_id)
                )
                cursor.execute(
                    """
                    INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
                    VALUES ('UPLOAD_LOCK_ACQUIRED', 'marks', NULL, %s, %s, %s, NOW())
                    """,
                    (json.dumps({"locked_by": user_id}), user_id, subject_id)
                )
                conn.commit()
                return True
        else:
            # Available, acquire lock
            cursor.execute(
                "UPDATE subject_states SET upload_status = 'locked', locked_by = %s, locked_at = NOW() WHERE subject_id = %s AND user_id IS NULL",
                (user_id, subject_id)
            )
            cursor.execute(
                """
                INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
                VALUES ('UPLOAD_LOCK_ACQUIRED', 'marks', NULL, %s, %s, %s, NOW())
                """,
                (json.dumps({"locked_by": user_id}), user_id, subject_id)
            )
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def release_upload_lock(subject_name: str, user_id: int) -> bool:
    """
    Releases the upload lock for a subject.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("SELECT id FROM subjects WHERE subject_name = %s", (subject_name,))
        row = cursor.fetchone()
        if not row:
            return False
        subject_id = row["id"]
        
        cursor.execute("SELECT upload_status, locked_by FROM subject_states WHERE subject_id = %s AND user_id IS NULL", (subject_id,))
        state = cursor.fetchone()
        if not state or state["upload_status"] != "locked":
            return True
            
        cursor.execute(
            "UPDATE subject_states SET upload_status = 'available', locked_by = NULL, locked_at = NULL WHERE subject_id = %s AND user_id IS NULL",
            (subject_id,)
        )
        cursor.execute(
            """
            INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
            VALUES ('UPLOAD_LOCK_RELEASED', 'marks', %s, NULL, %s, %s, NOW())
            """,
            (json.dumps({"released_by": user_id}), user_id, subject_id)
        )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_upload_lock_status(subject_name: str) -> dict:
    """
    Checks the current lock status of a subject, auto-unlocking if expired.
    Returns: {"locked": bool, "locked_by_name": str, "locked_by_id": int, "locked_at": str, "expires_in_seconds": int}
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute("SELECT id FROM subjects WHERE subject_name = %s", (subject_name,))
        row = cursor.fetchone()
        if not row:
            return {"locked": False}
        subject_id = row["id"]
        
        cursor.execute(
            """
            SELECT ss.upload_status, ss.locked_by, ss.locked_at, u.name as locked_by_name 
            FROM subject_states ss
            LEFT JOIN users u ON ss.locked_by = u.id
            WHERE ss.subject_id = %s AND ss.user_id IS NULL
            """, 
            (subject_id,)
        )
        state = cursor.fetchone()
        if not state or state["upload_status"] != "locked":
            return {"locked": False}
            
        locked_at = state["locked_at"]
        if locked_at:
            from datetime import timezone
            locked_at_utc = locked_at.astimezone(timezone.utc).replace(tzinfo=None) if locked_at.tzinfo is not None else locked_at
            delta = (datetime.utcnow() - locked_at_utc).total_seconds()
            if delta > 900:
                # Lock expired, release it
                cursor.execute(
                    "UPDATE subject_states SET upload_status = 'available', locked_by = NULL, locked_at = NULL WHERE subject_id = %s AND user_id IS NULL",
                    (subject_id,)
                )
                cursor.execute(
                    """
                    INSERT INTO audit_logs (action, entity, old_value, new_value, user_id, subject_id, created_at)
                    VALUES ('UPLOAD_LOCK_TIMEOUT', 'marks', %s, NULL, %s, %s, NOW())
                    """,
                    (json.dumps({"locked_by": state["locked_by"], "locked_at": locked_at.isoformat()}), state["locked_by"], subject_id)
                )
                conn.commit()
                return {"locked": False}
            else:
                return {
                    "locked": True,
                    "locked_by_id": state["locked_by"],
                    "locked_by_name": state["locked_by_name"],
                    "locked_at": locked_at.isoformat(),
                    "expires_in_seconds": int(900 - delta)
                }
        return {"locked": False}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def get_user_login_logs(user_id: int) -> list:
    """Fetches login logs for a specific user, ordered by login_time descending."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT login_time, ip_address FROM login_logs WHERE user_id = %s ORDER BY login_time DESC LIMIT 10", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("login_time"), datetime):
            d["login_time"] = d["login_time"].isoformat()
        results.append(d)
    return results
