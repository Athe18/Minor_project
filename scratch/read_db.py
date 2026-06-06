import os
import sys
import json
from dotenv import load_dotenv
load_dotenv()

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import core.database as database

try:
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ss.user_id, s.subject_name, ss.state_data 
        FROM subject_states ss
        JOIN subjects s ON ss.subject_id = s.id
    """)
    rows = cursor.fetchall()
    
    output = []
    for user_id, subject_name, state_data in rows:
        data = state_data if isinstance(state_data, dict) else json.loads(state_data)
        ia_count = len(data.get("ia_students", [])) if isinstance(data.get("ia_students"), list) else "not_a_list"
        mse_count = len(data.get("mse_students", [])) if isinstance(data.get("mse_students"), list) else "not_a_list"
        ese_count = len(data.get("ese_students", [])) if isinstance(data.get("ese_students"), list) else "not_a_list"
        output.append(f"User: {user_id}, Subject: {subject_name}\n"
                      f"  ia_students: {ia_count} (type: {type(data.get('ia_students'))})\n"
                      f"  mse_students: {mse_count} (type: {type(data.get('mse_students'))})\n"
                      f"  ese_students: {ese_count} (type: {type(data.get('ese_students'))})\n"
                      f"  co_attainment_keys: {[c.get('co_id') for c in data.get('co_attainment', [])]}\n")
                      
    with open("scratch/db_output.txt", "w") as f:
        f.write("\n".join(output))
    print("DB query written to scratch/db_output.txt")
except Exception as e:
    with open("scratch/db_output.txt", "w") as f:
        f.write(f"Error: {str(e)}")
