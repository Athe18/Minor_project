import sys
import os

# Add parent directory to path so we can import core
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import core.database as database

if __name__ == "__main__":
    print("Seeding PostgreSQL default users and departments...")
    try:
        database.init_db()
        print("Seeding completed successfully!")
    except Exception as e:
        print("Seeding failed:", e)
        sys.exit(1)
