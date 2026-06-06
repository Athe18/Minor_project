import sys
import os
from urllib.parse import urlparse, urlunparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path so we can import core
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psycopg2
from core.database import init_db

def create_database_if_not_exists():
    db_url_str = os.getenv("DATABASE_URL")
    if not db_url_str:
        raise ValueError("DATABASE_URL is not set in environment or .env file.")
    
    parsed = urlparse(db_url_str)
    dbname = parsed.path.lstrip('/')
    
    # Connect to the default 'postgres' database first to check/create target database
    postgres_parsed = parsed._replace(path='/postgres')
    postgres_url = urlunparse(postgres_parsed)
    
    print(f"Checking if database '{dbname}' exists on server...")
    conn = psycopg2.connect(postgres_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s;", (dbname,))
    exists = cursor.fetchone()
    if not exists:
        print(f"Database '{dbname}' does not exist. Creating it...")
        cursor.execute(f'CREATE DATABASE "{dbname}";')
        print(f"Database '{dbname}' created successfully.")
    else:
        print(f"Database '{dbname}' already exists.")
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("Initializing PostgreSQL database...")
    try:
        create_database_if_not_exists()
        print("Initializing tables...")
        init_db()
        print("Initialization completed successfully!")
    except Exception as e:
        print("Initialization failed:", e)
        sys.exit(1)
