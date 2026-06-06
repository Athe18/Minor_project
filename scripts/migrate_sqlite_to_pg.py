import sys
import os
import sqlite3
import json
from dotenv import load_dotenv

# Add parent directory to path so we can import core
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psycopg2
import psycopg2.extras

load_dotenv()

SQLITE_DB_PATH = "data/db.sqlite"

def run_migration():
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"No SQLite database found at {SQLITE_DB_PATH}. Nothing to migrate.")
        return

    print(f"Starting migration from SQLite ({SQLITE_DB_PATH}) to PostgreSQL...")

    # 1. Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 2. Connect to PostgreSQL
    pg_url = os.getenv("DATABASE_URL")
    if not pg_url:
        print("DATABASE_URL not found in environment. Migration aborted.")
        sqlite_conn.close()
        return

    pg_conn = None
    pg_cur = None
    try:
        try:
            pg_conn = psycopg2.connect(pg_url)
            pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        except Exception as e:
            print("PostgreSQL Connection failed:", e)
            err_str = str(e)
            if "password authentication failed" in err_str:
                print("\n[TIP] Password authentication failed! Please check your PostgreSQL password and update the DATABASE_URL in your `.env` file.")
            elif "does not exist" in err_str:
                print("\n[TIP] Database does not exist! Please run `python scripts/init_pg.py` first to automatically create the database and tables.")
            sqlite_conn.close()
            return

        # 3. Retrieve or create default department in PG
        pg_cur.execute("SELECT id FROM departments LIMIT 1")
        dept_row = pg_cur.fetchone()
        if not dept_row:
            pg_cur.execute("""
                INSERT INTO departments (department_name, vision, mission)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (
                "Department of Computer Engineering",
                "To be a premier center of excellence in computer science education and research.",
                "To impart quality computer education, promote innovative research, and nurture ethical professionals."
            ))
            dept_id = pg_cur.fetchone()["id"]
        else:
            dept_id = dept_row["id"]

        print(f"Using Department ID: {dept_id}")

        # 4. Migrate users
        sqlite_cur.execute("SELECT * FROM users")
        user_rows = sqlite_cur.fetchall()
        user_map = {} # Maps username to PG user ID
        
        for u in user_rows:
            # Map sqlite roles to matching postgres checks
            role = u["role"]
            if role == "faculty":
                role = "course_faculty"
            elif role == "admin":
                role = "admin"
                
            pg_cur.execute("""
                INSERT INTO users (username, password_hash, salt, role, name, department_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE 
                SET password_hash = EXCLUDED.password_hash,
                    salt = EXCLUDED.salt,
                    role = EXCLUDED.role,
                    name = EXCLUDED.name,
                    department_id = EXCLUDED.department_id
                RETURNING id, username
            """, (u["username"], u["password_hash"], u["salt"], role, u["name"], dept_id))
            
            res = pg_cur.fetchone()
            user_map[res["username"]] = res["id"]
            
        print(f"Migrated {len(user_rows)} users.")

        # 5. Migrate login_logs
        sqlite_cur.execute("SELECT * FROM login_logs")
        log_rows = sqlite_cur.fetchall()
        
        for l in log_rows:
            username = l["username"]
            user_id = user_map.get(username)
            # Parse SQLite timestamp
            try:
                login_time = datetime.fromisoformat(l["login_time"])
            except Exception:
                login_time = datetime.utcnow()
                
            pg_cur.execute("""
                INSERT INTO login_logs (user_id, username, login_time, ip_address)
                VALUES (%s, %s, %s, %s)
            """, (user_id, username, login_time, l["ip_address"]))
            
        print(f"Migrated {len(log_rows)} login logs.")

        # 6. Migrate subjects and subject_states
        sqlite_cur.execute("SELECT * FROM subjects")
        sub_rows = sqlite_cur.fetchall()
        
        for s in sub_rows:
            subject_name = s["subject_name"]
            year = s["year"]
            data_dict = json.loads(s["data_json"])
            semester = data_dict.get("semester", "")

            # Insert normalized subject record
            pg_cur.execute("""
                INSERT INTO subjects (subject_name, year, semester, department_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (subject_name, year, department_id) DO UPDATE 
                SET semester = EXCLUDED.semester
                RETURNING id
            """, (subject_name, year, semester, dept_id))
            
            subject_id = pg_cur.fetchone()["id"]

            # Save state data inside subject_states
            data_dict["schema_version"] = 1
            pg_cur.execute("""
                INSERT INTO subject_states (subject_id, state_data, schema_version, updated_at)
                VALUES (%s, %s, 1, NOW())
                ON CONFLICT (subject_id) DO UPDATE 
                SET state_data = EXCLUDED.state_data,
                    updated_at = NOW()
            """, (subject_id, json.dumps(data_dict)))
            
        print(f"Migrated {len(sub_rows)} subjects and state histories.")

        pg_conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        if pg_conn:
            pg_conn.rollback()
        print("Migration failed due to database transaction error:", e)
    finally:
        if pg_cur:
            pg_cur.close()
        if pg_conn:
            pg_conn.close()
        sqlite_conn.close()

if __name__ == "__main__":
    from datetime import datetime
    run_migration()
