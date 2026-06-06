import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("Error: DATABASE_URL is not set in environment or .env file.")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 is not installed. Please install psycopg2-binary.")
    sys.exit(1)

print(f"Connecting to database at {database_url.split('@')[-1]} ...")
try:
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    db_version = cursor.fetchone()[0]
    print("Successfully connected!")
    print("PostgreSQL Version:", db_version)
    conn.close()
except Exception as e:
    print("Connection failed:", e)
    err_str = str(e)
    if "password authentication failed" in err_str:
        print("\n[TIP] Password authentication failed! Please check your PostgreSQL password and update the DATABASE_URL in your `.env` file.")
    elif "does not exist" in err_str:
        print("\n[TIP] Database does not exist! Please run `python scripts/init_pg.py` to automatically create the database and tables.")
    sys.exit(1)
