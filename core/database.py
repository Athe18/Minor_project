import os
import sqlite3
import json
import hashlib
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = "data/db.sqlite"

def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with dict factory enabled."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: str) -> str:
    """Hashes a password with a salt using SHA-256."""
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def init_db():
    """Initializes the database schema and seeds the default users if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        login_time TEXT NOT NULL,
        ip_address TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        subject_name TEXT PRIMARY KEY,
        year TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    conn.commit()
    
    # 2. Seed default users if they don't exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        default_users = [
            ("admin", "admin123", "admin", "System Administrator"),
            ("faculty", "faculty123", "faculty", "Dr. Atharva Kamble")
        ]
        for username, password, role, name in default_users:
            salt = uuid.uuid4().hex
            pwd_hash = hash_password(password, salt)
            cursor.execute(
                "INSERT INTO users (username, password_hash, salt, role, name) VALUES (?, ?, ?, ?, ?)",
                (username, pwd_hash, salt, role, name)
            )
        conn.commit()
        print("Database seeded with default users.")
        
    conn.close()

def verify_user(username: str, password_plain: str) -> Optional[Dict[str, Any]]:
    """Verifies user credentials. Returns user details on success, or None on failure."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return None
        
    expected_hash = hash_password(password_plain, user["salt"])
    if expected_hash == user["password_hash"]:
        return {
            "username": user["username"],
            "role": user["role"],
            "name": user["name"]
        }
    return None

def log_login_attempt(username: str, ip_address: str):
    """Inserts a login log entry into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    login_time = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO login_logs (username, login_time, ip_address) VALUES (?, ?, ?)",
        (username, login_time, ip_address)
    )
    conn.commit()
    conn.close()

def get_login_logs() -> List[Dict[str, Any]]:
    """Fetches all login logs, ordered by login_time descending."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM login_logs ORDER BY login_time DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_subject_state(subject_name: str, year: str, data_dict: Dict[str, Any]):
    """Saves or updates subject state in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    data_json = json.dumps(data_dict)
    updated_at = datetime.now().isoformat()
    cursor.execute(
        """
        INSERT OR REPLACE INTO subjects (subject_name, year, data_json, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (subject_name, year, data_json, updated_at)
    )
    conn.commit()
    conn.close()

def get_subject_state(subject_name: str) -> Optional[Dict[str, Any]]:
    """Retrieves subject state data from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT data_json FROM subjects WHERE subject_name = ?", (subject_name,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row["data_json"])
    return None

def list_subjects() -> List[Dict[str, Any]]:
    """Retrieves all subjects from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT subject_name, year, data_json FROM subjects ORDER BY subject_name")
    rows = cursor.fetchall()
    conn.close()
    
    subjects_list = []
    for row in rows:
        try:
            data = json.loads(row["data_json"])
            subjects_list.append({
                "subject_name": row["subject_name"],
                "year": row["year"],
                "data": data
            })
        except Exception as e:
            print(f"Error parsing subject state JSON for {row['subject_name']}: {e}")
            
    return subjects_list

def delete_subject(subject_name: str):
    """Deletes a subject from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subjects WHERE subject_name = ?", (subject_name,))
    conn.commit()
    conn.close()

def migrate_subject_if_not_exists(subject_name: str, year: str, data_dict: Dict[str, Any]) -> bool:
    """Migrates a file-based subject state to the database only if not already present."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM subjects WHERE subject_name = ?", (subject_name,))
    exists = cursor.fetchone()["count"] > 0
    
    if not exists:
        data_json = json.dumps(data_dict)
        updated_at = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO subjects (subject_name, year, data_json, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (subject_name, year, data_json, updated_at)
        )
        conn.commit()
        conn.close()
        return True
        
    conn.close()
    return False
