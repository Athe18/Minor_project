# Database Documentation & Integration Guide

This document explains the architecture, schemas, and integration details of the **SQLite Database** introduced in the Multi-Agent CO-PO ERP Platform.

---

## 📁 Database Overview
- **Database Engine**: SQLite 3 (Standard Python Library `sqlite3`)
- **Database File**: `data/db.sqlite`
- **Location in Workspace**: [data/](file:///C:/Users/Atharva/OneDrive/Desktop/udaya/CO_PO/data)

The database replaces the previous filesystem-based storage (`data/subjects/*.json`) and hardcoded user credentials, providing a secure, queryable, relational repository for subject records, credentials, and access logs.

---

## 🗄️ Database Schemas

The database contains three tables:

### 1. `users` Table
Stores user accounts for system access.
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL
);
```
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary key, autoincremented. |
| `username` | `TEXT` | Unique identifier used for logging in. |
| `password_hash` | `TEXT` | Salty SHA-256 hash of the password. |
| `salt` | `TEXT` | Unique random salt (UUID hex format) generated per user on creation. |
| `role` | `TEXT` | System role (e.g., `admin` or `faculty`). |
| `name` | `TEXT` | Display name of the user (e.g., `Dr. Atharva Kamble`). |

### 2. `login_logs` Table
Audits system access by recording login attempts.
```sql
CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    login_time TEXT NOT NULL,
    ip_address TEXT
);
```
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary key, autoincremented. |
| `username` | `TEXT` | Username that initiated the login attempt. |
| `login_time` | `TEXT` | ISO-8601 formatted timestamp of the login event. |
| `ip_address` | `TEXT` | The client source IP address (e.g. `127.0.0.1` or remote IP). |

### 3. `subjects` Table
Persists course states and multi-agent pipeline records.
```sql
CREATE TABLE IF NOT EXISTS subjects (
    subject_name TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```
| Column | Type | Description |
| :--- | :--- | :--- |
| `subject_name` | `TEXT` | Primary Key. The unique identifier of the course. |
| `year` | `TEXT` | Academic year (e.g., `FY`, `SY`, `TY`, `BTech`). |
| `data_json` | `TEXT` | Complete serialized JSON payload containing the course state (Course Outcomes, Program Outcomes, Attainments, recommendations, audit logs, and student marks roster). |
| `updated_at` | `TEXT` | ISO-8601 formatted timestamp of the last modification. |

---

## 🔒 Security & Password Hashing
Authentication relies on the built-in python `hashlib` library to hash passwords with a unique salt:
1. **Hashing Function**: `SHA-256`
2. **Procedure**:
   - When a user is registered, a random hexadecimal string (UUID hex) is generated as the `salt`.
   - The password hash is calculated as:
     `SHA-256(password + salt)`
   - Both the salt and hash are stored in the database.
   - When logging in, the server retrieves the salt, hashes the input password, and compares it to the stored hash.

---

## 🔄 Automatic JSON-to-SQL Data Migration
To preserve legacy data, the platform implements a self-healing migration pipeline on startup:
1. When the server launches, `load_all_subjects()` initializes the SQLite database schema.
2. It looks for files under the folder `data/subjects/`.
3. If JSON files are found, the server checks if a subject with the same name exists in the SQLite `subjects` table.
4. If not found, it parses the JSON and calls `migrate_subject_if_not_exists()`, converting flat files to database rows.

---

## 🛠️ Code Integration

All database management code is isolated in [database.py](file:///C:/Users/Atharva/OneDrive/Desktop/udaya/CO_PO/core/database.py). 

The backend server [server.py](file:///C:/Users/Atharva/OneDrive/Desktop/udaya/CO_PO/server.py) interfaces with the database during key events:
- **Startup**: Invokes `init_db()` and migrates any remaining JSON files.
- **Login**: Calls `verify_user(username, password)` and logs successful logins with `log_login_attempt(username, ip_address)`.
- **Subject Lifecycle**:
  - `save_subject_state(state)`: Serializes current state to JSON and calls `save_subject_state(subject_name, year, data)`.
  - `create_subject(...)`: Initializes the class in memory and database.
  - `delete_subject(subject_id)`: Removes the entry from database via `delete_subject(subject_id)`.

---

## 🔍 How to Inspect the Database

You can read or modify the database using the following methods:

### Method A: Using Python script
```python
import sqlite3

conn = sqlite3.connect("data/db.sqlite")
cursor = conn.cursor()

# Query users
cursor.execute("SELECT username, role, name FROM users")
for row in cursor.fetchall():
    print(row)

# Query access logs
cursor.execute("SELECT * FROM login_logs ORDER BY login_time DESC LIMIT 5")
for row in cursor.fetchall():
    print(row)

conn.close()
```

### Method B: Using SQL CLI
If you have `sqlite3` CLI installed:
```bash
sqlite3 data/db.sqlite
# Run SQL queries:
SELECT * FROM users;
.exit
```

### Method C: IDE Extensions
Install an extension like **SQLite Viewer** or **SQLTools** in your IDE to open and view the `data/db.sqlite` file with a graphical UI.
