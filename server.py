from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Request, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
load_dotenv()
import shutil
import json
import uuid
from datetime import datetime

import core.database as database
from core.auth import create_token, decode_token, get_current_user, require_role
from fastapi import Depends
import psycopg2
import psycopg2.extras

from core.state import AgentState
from core.schemas import CourseOutcome, ProgramOutcome, MappingEntry, COAttainment, POAttainment, Recommendation, Assignment, PerformanceIndicator, PIMappingEntry
import agents.co_generator as co_gen
import agents.co_validator as co_val
import agents.po_mapper as po_map
import agents.mapping_validator as map_val
import agents.teaching_philosophy as teach
import agents.co_attainment as co_att
import agents.po_attainment as po_att
import agents.recommendation as rec
import agents.report_generator as reporter
import agents.reflection_agent as reflect
import agents.assignment_generator as assignment_gen
import agents.pi_generator as pi_gen
import agents.pi_mapper as pi_map
import agents.course_context as course_context
import agents.historical_co_analyst as historical_co_analyst
import agents.assessment_analyst as assessment_analyst
import agents.attainment_analyst as attainment_analyst
from tools.syllabus_reader import load_syllabus
from tools.pdf_generator import generate_pdf_report
from tools.assignment_pdf_generator import generate_assignment_pdf
from tools.analysis_pdf_generator import generate_analysis_pdf
from tools.llm_client import call_llm, call_llm_json

app = FastAPI(title="Multi-Agent CO-PO ERP Platform Backend")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def role_restriction_middleware(request: Request, call_next):
    path = request.url.path
    # Allow authentication endpoints, error logging, and standard docs/preflights
    if (
        path.startswith("/api/auth/") 
        or path == "/api/log-error" 
        or path in ["/docs", "/openapi.json", "/redoc"]
        or request.method == "OPTIONS"
    ):
        return await call_next(request)
        
    # Check EventSource stream authenticated via query parameter
    if path.startswith("/api/faculty/upload/status-stream/"):
        token = request.query_params.get("token")
        if token:
            try:
                payload = decode_token(token)
                role = payload.get("role")
                if role != "course_faculty":
                    return JSONResponse(status_code=403, content={"detail": "Forbidden access to status stream"})
            except Exception:
                return JSONResponse(status_code=401, content={"detail": "Invalid token for status stream"})
        else:
            return JSONResponse(status_code=401, content={"detail": "Missing token for status stream"})
        return await call_next(request)

    # Check headers for standard requests
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            role = payload.get("role")
            
            # admin is allowed ONLY /api/admin/*
            if role == "admin":
                if not path.startswith("/api/admin/"):
                    return JSONResponse(status_code=403, content={"detail": "Admins are allowed only on admin operations."})
            
            # course_faculty is allowed ONLY /api/faculty/*
            elif role == "course_faculty":
                if not path.startswith("/api/faculty/"):
                    return JSONResponse(status_code=403, content={"detail": "Faculty members are allowed only on faculty operations."})
                    
            # course_champion is allowed ONLY champion (non-admin, non-faculty) routes
            elif role == "course_champion":
                if path.startswith("/api/admin/") or path.startswith("/api/faculty/"):
                    return JSONResponse(status_code=403, content={"detail": "Course Champions are not allowed on this operation."})
        except Exception as e:
            # Let call_next run, dependency validation in endpoints will handle invalid tokens
            pass
            
    response = await call_next(request)
    return response

# Global multi-subject in-memory state dictionary
subjects: dict[tuple, AgentState] = {}
active_subject_id: Optional[str] = None

def save_subject_state(state: AgentState, user_id: Optional[int] = None):
    try:
        data = {
            "subject_name": state.subject_name,
            "year": state.year,
            "syllabus_text": state.syllabus_text,
            "department": state.department,
            "vision_mission": state.vision_mission,
            "performance_indicators": [pi.model_dump() for pi in state.performance_indicators],
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "level1_threshold": state.level1_threshold,
            "level2_threshold": state.level2_threshold,
            "level3_threshold": state.level3_threshold,
            "cos": [co.model_dump() for co in state.cos],
            "pos": [po.model_dump() for po in state.pos],
            "co_po_mapping": [m.model_dump() for m in state.co_po_mapping],
            "mapping_locked": state.mapping_locked,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment],
            "teaching_philosophy": state.teaching_philosophy,
            "recommendations": [r.model_dump() for r in state.recommendations],
            "audit_trail": state.audit_trail,
            "reflection_feedback": state.reflection_feedback,
            "mapping_reflection": state.mapping_reflection,
            "co_validation_feedback": state.co_validation_feedback,
            "mapping_validation_feedback": state.mapping_validation_feedback,
            "students": state.students,
            "max_marks": state.max_marks,
            "ia_students": state.ia_students,
            "ia_max_marks": state.ia_max_marks,
            "mse_students": state.mse_students,
            "mse_max_marks": state.mse_max_marks,
            "ese_students": state.ese_students,
            "ese_max_marks": state.ese_max_marks,
            "assignment": state.assignment.model_dump() if state.assignment else None,
            "semester": state.semester,
            "course_description_option": state.course_description_option,
            "course_description_text": state.course_description_text,
            "course_context_data": state.course_context_data,
            "previous_cos_option": state.previous_cos_option,
            "previous_cos_raw": state.previous_cos_raw,
            "previous_cos": [co.model_dump() for co in state.previous_cos] if state.previous_cos else [],
            "previous_attainment_analysis": state.previous_attainment_analysis,
            "assessment_analysis": state.assessment_analysis,
            "new_generated_cos": [co.model_dump() for co in state.new_generated_cos] if state.new_generated_cos else [],
        }
        database.save_subject_state(state.subject_name, state.year, data, user_id)
    except Exception as e:
        print(f"Error saving subject state to database: {e}")

def align_co_ids(state: AgentState):
    if not state.cos:
        return
    
    co_id_map = {}
    
    # 1. Gather all unique co_ids currently in co_attainment, students marks, or max_marks
    current_ids = set()
    if state.co_attainment:
        for att in state.co_attainment:
            current_ids.add(att.co_id)
    for roster in [state.students, state.ia_students, state.mse_students, state.ese_students]:
        if roster:
            for stud in roster:
                current_ids.update(stud.get("marks", {}).keys())
    for mm in [state.max_marks, state.ia_max_marks, state.mse_max_marks, state.ese_max_marks]:
        if mm:
            current_ids.update(mm.keys())
        
    def get_matching_co(co_id_str: str, cos: list) -> Optional[str]:
        cleaned_target = "".join(c for c in co_id_str if c.isalnum()).upper()
        for co in cos:
            cleaned_co = "".join(c for c in co.co_id if c.isalnum()).upper()
            if cleaned_co.endswith(cleaned_target) or cleaned_target.endswith(cleaned_co):
                return co.co_id
        return None

    for cid in current_ids:
        matched = get_matching_co(cid, state.cos)
        if matched:
            co_id_map[cid] = matched
            
    # 2. Update state.co_attainment
    if state.co_attainment:
        for att in state.co_attainment:
            if att.co_id in co_id_map:
                att.co_id = co_id_map[att.co_id]
                
    # 3. Update component lists and dicts
    for attr_students, attr_max in [
        ("students", "max_marks"),
        ("ia_students", "ia_max_marks"),
        ("mse_students", "mse_max_marks"),
        ("ese_students", "ese_max_marks")
    ]:
        students_list = getattr(state, attr_students, [])
        if students_list:
            for stud in students_list:
                marks = stud.get("marks", {})
                new_marks = {}
                for k, v in marks.items():
                    new_key = co_id_map.get(k, k)
                    new_marks[new_key] = v
                stud["marks"] = new_marks
        max_dict = getattr(state, attr_max, {})
        if max_dict:
            new_max = {}
            for k, v in max_dict.items():
                new_key = co_id_map.get(k, k)
                new_max[new_key] = v
            setattr(state, attr_max, new_max)

def validate_and_correct_mappings(state: AgentState) -> bool:
    """
    Validates CO-PO mapping strengths against underlying PI coverage percentages.
    If a contradiction is found, prints a console warning and corrects the strength.
    Returns True if any changes were made, False otherwise.
    """
    if not state.co_po_mapping or not state.pi_mappings or not state.performance_indicators:
        return False
        
    has_changes = False
    for entry in state.co_po_mapping:
        # Find all PIs belonging to this PO
        po_pis = [pi for pi in state.performance_indicators if pi.po_id == entry.po_id]
        total_pis = len(po_pis)
        
        if total_pis == 0:
            expected_strength = 0
            pct_rounded = 0
            mapped_count = 0
        else:
            mapped_pis = []
            for pi in po_pis:
                m = next((x for x in state.pi_mappings if x.co_id == entry.co_id and x.pi_id == pi.pi_id), None)
                if m and m.mapped == "Y":
                    mapped_pis.append(pi)
            mapped_count = len(mapped_pis)
            pct_rounded = round((mapped_count / total_pis) * 100)
            
            if mapped_count == 0:
                expected_strength = 0
            elif pct_rounded <= 33:
                expected_strength = 1
            elif pct_rounded <= 66:
                expected_strength = 2
            else:
                expected_strength = 3
                
        if entry.strength != expected_strength:
            print(f"[WARNING] Articulation contradiction detected in subject '{state.subject_name}': {entry.co_id} -> {entry.po_id} has strength {entry.strength} but PI coverage is {mapped_count}/{total_pis} ({pct_rounded}%) (expected {expected_strength}). Recalculating/updating value.")
            entry.strength = expected_strength
            # Optionally update reasoning if strength changes
            if expected_strength == 0:
                entry.reasoning = f"- **Reason for No Mapping**: No performance indicators are mapped between {entry.co_id} and PIs under {entry.po_id}.\n- **Suggested Activities**: None.\n- **Suggested Assignments**: None.\n- **Suggested Assessments**: None.\n- **Syllabus Recommendations**: None."
            else:
                entry.reasoning = f"- **Semantic Alignment**: Aligned mathematically.\n- **Competency & PI Coverage**: Maps to PIs: {', '.join([p.pi_id for p in mapped_pis])}. Mathematical coverage is {pct_rounded}% (Level {expected_strength} mapping).\n- **Academic Evidence Support**: Alignment derived from PI mapping analysis.\n- **Bloom's Level Compatibility**: Levels compatible."
            has_changes = True
            
    return has_changes

def ensure_pos_and_mappings(state: AgentState):
    has_changes = False
    # Load default POs if empty
    if not state.pos:
        sample_path = "data/sample_pos.json"
        if os.path.exists(sample_path):
            try:
                with open(sample_path) as f:
                    data = json.load(f)
                state.pos = [ProgramOutcome(**p) for p in data]
                has_changes = True
            except Exception as e:
                print(f"Error loading sample_pos.json: {e}")
        
        # Fallback list PO1 to PO12 if loading failed or file wasn't there
        if not state.pos:
            defaults = [
                {"po_id": "PO1", "statement": "Engineering knowledge: Apply mathematical, scientific principles"},
                {"po_id": "PO2", "statement": "Problem analysis: Identify, formulate, and analyze complex problems"},
                {"po_id": "PO3", "statement": "Design/development of solutions: Design systems or processes"},
                {"po_id": "PO4", "statement": "Conduct investigations of complex problems: Use research-based knowledge"},
                {"po_id": "PO5", "statement": "Modern tool usage: Create, select, and apply appropriate techniques"},
                {"po_id": "PO6", "statement": "The engineer and society: Assess societal, health, safety, legal issues"},
                {"po_id": "PO7", "statement": "Environment and sustainability: Understand environmental impact"},
                {"po_id": "PO8", "statement": "Ethics: Apply ethical principles and professional ethics"},
                {"po_id": "PO9", "statement": "Individual and team work: Function effectively as an individual/member"},
                {"po_id": "PO10", "statement": "Communication: Communicate effectively on complex activities"},
                {"po_id": "PO11", "statement": "Project management and finance: Demonstrate knowledge of management principles"},
                {"po_id": "PO12", "statement": "Life-long learning: Recognize the need and prepare for continuous learning"}
            ]
            state.pos = [ProgramOutcome(**p) for p in defaults]
            has_changes = True
        state.log("System", "pos_load", f"Self-healed: Loaded default Program Outcomes ({len(state.pos)} loaded)")
        
    # Generate CO-PO mapping if empty and COs exist
    if not state.co_po_mapping and state.cos:
        try:
            po_map.run(state)
            state.log("System", "mappings_generate", "Self-healed: Automatically generated CO-PO mappings")
            has_changes = True
        except Exception as e:
            print(f"Error self-healing CO-PO mappings: {e}")

    # Self-heal performance indicators if empty, department is set, and vision_mission is set
    if not state.performance_indicators and state.department and state.vision_mission.strip():
        try:
            pi_gen.run(state)
            has_changes = True
        except Exception as e:
            print(f"Error self-healing performance indicators: {e}")

    # Align CO IDs
    align_co_ids(state)
    
    # Validation check & auto-correction: Ensure CO-PO mappings are consistent with PI coverage
    if validate_and_correct_mappings(state):
        has_changes = True
        
    if has_changes:
        save_subject_state(state)

# Helper to resolve subject state
def get_subject_state(
    x_subject_id: Optional[str] = Header(None),
    user_id: Optional[int] = None,
    role: Optional[str] = None
) -> AgentState:
    def sanitize_state_data(data: dict) -> dict:
        list_keys = [
            "students", "ia_students", "mse_students", "ese_students",
            "co_attainment", "po_attainment", "recommendations", "audit_trail",
            "performance_indicators", "pi_mappings", "cos", "pos", "co_po_mapping",
            "previous_cos", "new_generated_cos"
        ]
        dict_keys = [
            "max_marks", "ia_max_marks", "mse_max_marks", "ese_max_marks",
            "course_context_data", "previous_attainment_analysis", "assessment_analysis"
        ]
        for k in list_keys:
            if k not in data or not isinstance(data[k], list):
                data[k] = []
        for k in dict_keys:
            if k not in data or not isinstance(data[k], dict):
                data[k] = {}
        return data

    global active_subject_id
    target_id = x_subject_id or active_subject_id
    if not target_id:
        if subjects:
            # Find any key matching this user/role or fallback to first
            keys = list(subjects.keys())
            matched_key = next((k for k in keys if isinstance(k, tuple) and k[1] == (user_id if role == "course_faculty" else None)), None)
            if matched_key:
                target_id = matched_key[0]
            else:
                target_id = keys[0][0] if isinstance(keys[0], tuple) else keys[0]
            active_subject_id = target_id
        else:
            raise HTTPException(status_code=400, detail="No subjects configured. Please add a subject first.")
            
    # Key in global subjects: (subject_name, user_id) for faculty, (subject_name, None) for champion/admin
    db_user_id = user_id if role == "course_faculty" else None
    state_key = (target_id, db_user_id)
    
    if state_key not in subjects:
        # Load from DB
        try:
            # 1. Always load master state first (for configuration)
            master_data = database.get_subject_state(target_id, None)
            if not master_data:
                raise HTTPException(status_code=404, detail=f"Subject state not found for '{target_id}'.")
                
            # 2. If faculty, load or initialize user state
            if role == "course_faculty" and user_id:
                user_data = database.get_subject_state(target_id, user_id)
                
                if not user_data:
                    # Initialize user state from master config
                    user_data = dict(master_data)
                    # Clear marks fields so the faculty starts with a clean slate
                    user_data["students"] = []
                    user_data["max_marks"] = {}
                    user_data["ia_students"] = []
                    user_data["ia_max_marks"] = {}
                    user_data["mse_students"] = []
                    user_data["mse_max_marks"] = {}
                    user_data["ese_students"] = []
                    user_data["ese_max_marks"] = {}
                    user_data["co_attainment"] = []
                    user_data["po_attainment"] = []
                    user_data["recommendations"] = []
                    user_data["assessment_analysis"] = {}
                    
                    user_data = sanitize_state_data(user_data)
                    user_data["upload_status"] = "available"
                    user_data["locked_by"] = None
                    user_data["locked_at"] = None
                    database.save_subject_state(target_id, master_data.get("year", ""), user_data, user_id)
                else:
                    # Sanitize existing user data types
                    user_data = sanitize_state_data(user_data)
                    
                    # Self-heal and clear out any old dummy/seeded mock marks (e.g. S001) that polluted the state
                    has_dummy_marks = False
                    for phase in ["ia_students", "mse_students", "ese_students", "students"]:
                        students_list = user_data.get(phase, []) or []
                        if any(s.get("roll_no") == "S001" or s.get("roll_no") == "S002" for s in students_list):
                            has_dummy_marks = True
                            break
                    if has_dummy_marks:
                        user_data["students"] = []
                        user_data["max_marks"] = {}
                        user_data["ia_students"] = []
                        user_data["ia_max_marks"] = {}
                        user_data["mse_students"] = []
                        user_data["mse_max_marks"] = {}
                        user_data["ese_students"] = []
                        user_data["ese_max_marks"] = {}
                        user_data["co_attainment"] = []
                        user_data["po_attainment"] = []
                        user_data["recommendations"] = []
                        user_data["assessment_analysis"] = {}
                        user_data = sanitize_state_data(user_data)
                        database.save_subject_state(target_id, master_data.get("year", ""), user_data, user_id)
                
                # Merge latest master configuration fields into user state
                merged_data = dict(user_data)
                config_fields = [
                    "year", "syllabus_text", "department", "vision_mission", 
                    "performance_indicators", "pi_mappings", "level1_threshold", 
                    "level2_threshold", "level3_threshold", "cos", "pos", 
                    "co_po_mapping", "mapping_locked", "teaching_philosophy", 
                    "reflection_feedback", "mapping_reflection", "co_validation_feedback", 
                    "mapping_validation_feedback", "semester", "course_description_option", 
                    "course_description_text", "course_context_data", "previous_cos_option", 
                    "previous_cos_raw", "previous_cos", "previous_attainment_analysis", 
                    "new_generated_cos"
                ]
                for f in config_fields:
                    if f in master_data:
                        merged_data[f] = master_data[f]
                data = merged_data
            else:
                data = master_data
                
            # Deserialization to AgentState
            data = sanitize_state_data(data)
            state = AgentState()
            state.subject_name = data.get("subject_name", target_id)
            state.year = data.get("year", "")
            state.syllabus_text = data.get("syllabus_text", "")
            state.department = data.get("department", "")
            state.vision_mission = data.get("vision_mission", "")
            state.performance_indicators = [PerformanceIndicator(**pi) for pi in data.get("performance_indicators", [])]
            state.pi_mappings = [PIMappingEntry(**m) for m in data.get("pi_mappings", [])]
            state.update_thresholds(
                data.get("level1_threshold", 55.0),
                data.get("level2_threshold", 65.0),
                data.get("level3_threshold", 75.0)
            )
            state.cos = [CourseOutcome(**co) for co in data.get("cos", [])]
            state.pos = [ProgramOutcome(**po) for po in data.get("pos", [])]
            state.co_po_mapping = [MappingEntry(**m) for m in data.get("co_po_mapping", [])]
            state.mapping_locked = data.get("mapping_locked", False)
            state.co_attainment = [COAttainment(**a) for a in data.get("co_attainment", [])]
            state.po_attainment = [POAttainment(**a) for a in data.get("po_attainment", [])]
            state.teaching_philosophy = data.get("teaching_philosophy", "")
            state.recommendations = [Recommendation(**r) for r in data.get("recommendations", [])]
            state.audit_trail = data.get("audit_trail", [])
            state.reflection_feedback = data.get("reflection_feedback", "")
            state.mapping_reflection = data.get("mapping_reflection", "")
            state.co_validation_feedback = data.get("co_validation_feedback", "")
            state.mapping_validation_feedback = data.get("mapping_validation_feedback", "")
            state.students = data.get("students", [])
            state.max_marks = data.get("max_marks", {})
            state.ia_students = data.get("ia_students", [])
            state.ia_max_marks = data.get("ia_max_marks", {})
            state.mse_students = data.get("mse_students", [])
            state.mse_max_marks = data.get("mse_max_marks", {})
            state.ese_students = data.get("ese_students", [])
            state.ese_max_marks = data.get("ese_max_marks", {})
            assignment_data = data.get("assignment", None)
            state.assignment = Assignment(**assignment_data) if assignment_data else None
            state.semester = data.get("semester", "")
            state.course_description_option = data.get("course_description_option", "")
            state.course_description_text = data.get("course_description_text", "")
            state.course_context_data = data.get("course_context_data", {})
            state.previous_cos_option = data.get("previous_cos_option", "")
            state.previous_cos_raw = data.get("previous_cos_raw", "")
            state.previous_cos = [CourseOutcome(**co) for co in data.get("previous_cos", [])] if data.get("previous_cos") else []
            state.previous_attainment_analysis = data.get("previous_attainment_analysis", {})
            state.assessment_analysis = data.get("assessment_analysis", {})
            state.new_generated_cos = [CourseOutcome(**co) for co in data.get("new_generated_cos", [])] if data.get("new_generated_cos") else []

            subjects[state_key] = state
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=404, detail=f"Subject not found: {str(e)}")

    state = subjects[state_key]
    ensure_pos_and_mappings(state)
    return state

def load_all_subjects():
    global subjects, active_subject_id
    
    # 1. Initialize SQLite Database schemas and seed default users
    try:
        database.init_db()
    except Exception as e:
        print(f"Error initializing database: {e}")
        
    # 2. Migrate existing JSON-based subjects to the database (if any)
    if os.path.exists("data/subjects"):
        for filename in os.listdir("data/subjects"):
            if filename.endswith(".json"):
                file_path = os.path.join("data/subjects", filename)
                try:
                    with open(file_path) as f:
                        data = json.load(f)
                    subject_name = data.get("subject_name", "")
                    year = data.get("year", "")
                    if subject_name and year:
                        migrated = database.migrate_subject_if_not_exists(subject_name, year, data)
                        if migrated:
                            print(f"Migrated subject '{subject_name}' from JSON file to SQLite.")
                except Exception as e:
                    print(f"Error migrating subject from JSON {filename}: {e}")
                    
    # 3. Load all subjects from SQLite database
    try:
        db_subjects = database.list_subjects()
        for sub in db_subjects:
            try:
                state = AgentState()
                data = sub["data"]
                state.subject_name = data.get("subject_name", "")
                state.year = data.get("year", "")
                state.syllabus_text = data.get("syllabus_text", "")
                state.department = data.get("department", "")
                state.vision_mission = data.get("vision_mission", "")
                state.performance_indicators = [PerformanceIndicator(**pi) for pi in data.get("performance_indicators", [])]
                state.pi_mappings = [PIMappingEntry(**m) for m in data.get("pi_mappings", [])]
                state.update_thresholds(
                    data.get("level1_threshold", 55.0),
                    data.get("level2_threshold", 65.0),
                    data.get("level3_threshold", 75.0)
                )
                state.cos = [CourseOutcome(**co) for co in data.get("cos", [])]
                state.pos = [ProgramOutcome(**po) for po in data.get("pos", [])]
                state.co_po_mapping = [MappingEntry(**m) for m in data.get("co_po_mapping", [])]
                state.mapping_locked = data.get("mapping_locked", False)
                state.co_attainment = [COAttainment(**a) for a in data.get("co_attainment", [])]
                state.po_attainment = [POAttainment(**a) for a in data.get("po_attainment", [])]
                state.teaching_philosophy = data.get("teaching_philosophy", "")
                state.recommendations = [Recommendation(**r) for r in data.get("recommendations", [])]
                state.audit_trail = data.get("audit_trail", [])
                state.reflection_feedback = data.get("reflection_feedback", "")
                state.mapping_reflection = data.get("mapping_reflection", "")
                state.co_validation_feedback = data.get("co_validation_feedback", "")
                state.mapping_validation_feedback = data.get("mapping_validation_feedback", "")
                state.students = data.get("students", [])
                state.max_marks = data.get("max_marks", {})
                state.ia_students = data.get("ia_students", [])
                state.ia_max_marks = data.get("ia_max_marks", {})
                state.mse_students = data.get("mse_students", [])
                state.mse_max_marks = data.get("mse_max_marks", {})
                state.ese_students = data.get("ese_students", [])
                state.ese_max_marks = data.get("ese_max_marks", {})
                assignment_data = data.get("assignment", None)
                state.assignment = Assignment(**assignment_data) if assignment_data else None
                
                # Deserialization of redesigned CO workflow state
                state.semester = data.get("semester", "")
                state.course_description_option = data.get("course_description_option", "")
                state.course_description_text = data.get("course_description_text", "")
                state.course_context_data = data.get("course_context_data", {})
                state.previous_cos_option = data.get("previous_cos_option", "")
                state.previous_cos_raw = data.get("previous_cos_raw", "")
                state.previous_cos = [CourseOutcome(**co) for co in data.get("previous_cos", [])] if data.get("previous_cos") else []
                state.previous_attainment_analysis = data.get("previous_attainment_analysis", {})
                state.assessment_analysis = data.get("assessment_analysis", {})
                state.new_generated_cos = [CourseOutcome(**co) for co in data.get("new_generated_cos", [])] if data.get("new_generated_cos") else []

                subjects[(state.subject_name, None)] = state
                
                # Auto-heal loaded subject states
                ensure_pos_and_mappings(state)
                
                # Recalculate PO attainment if it was all-zero but we have CO attainment and mappings
                if state.co_attainment and state.co_po_mapping:
                    has_real_attainment = any(po.weighted_attainment > 0 for po in state.po_attainment)
                    if not has_real_attainment:
                        try:
                            po_att.run(state)
                            save_subject_state(state)
                        except Exception as e:
                            print(f"Error recalculating PO attainment for {state.subject_name} on startup: {e}")
            except Exception as e:
                print(f"Error parsing subject {sub['subject_name']} from database: {e}")
    except Exception as e:
        print(f"Error listing subjects from database: {e}")
        
    if subjects:
        active_subject_id = list(subjects.keys())[0][0]
    
    # 5. Auto-migrate: Ensure all departments referenced by subjects exist in the departments table
    # and fix subjects that have the wrong department_id
    try:
        dept_names_in_states = set()
        for (name, uid), state in subjects.items():
            if uid is None and state.department and state.department.strip():
                dept_names_in_states.add(state.department.strip())
        
        for dept_name in dept_names_in_states:
            try:
                existing = database.get_department_by_name(dept_name)
                if not existing:
                    database.create_department(dept_name)
                    print(f"[Startup Migration] Auto-created department '{dept_name}' in database.")
            except Exception as e:
                print(f"[Startup Migration] Warning: Could not create department '{dept_name}': {e}")
        
        # Re-save all subjects to fix their department_id in the subjects table
        for (name, uid), state in subjects.items():
            if uid is None:
                try:
                    save_subject_state(state)
                except Exception as e:
                    print(f"[Startup Migration] Warning: Could not re-save subject '{state.subject_name}': {e}")
        print("[Startup Migration] Department sync and subject department_id fix complete.")
    except Exception as e:
        print(f"[Startup Migration] Error during department sync: {e}")

load_all_subjects()


class LoginRequest(BaseModel):
    username: str
    password: str

class CoUpdateRequest(BaseModel):
    cos: List[CourseOutcome]

class CoRegenerateRequest(BaseModel):
    feedback: str
    num_cos: int

class PoLoadRequest(BaseModel):
    pos: List[ProgramOutcome]

class MappingUpdateRequest(BaseModel):
    mappings: List[MappingEntry]

class PiMappingUpdateRequest(BaseModel):
    mappings: List[PIMappingEntry]

class PiSuggestRequest(BaseModel):
    co_id: str
    pi_id: str

class SubjectCreateRequest(BaseModel):
    subject_name: str
    year: str
    semester: Optional[str] = None

class ActiveSubjectRequest(BaseModel):
    subject_id: str


class RefreshRequest(BaseModel):
    refresh_token: str

@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    ip_address = request.client.host if request.client else "127.0.0.1"
    user = database.verify_user(req.username, req.password)
    if user:
        if user.get("status") == "disabled":
            raise HTTPException(status_code=403, detail="Your account has been disabled. Please contact the administrator.")
        try:
            database.log_login_attempt(req.username, ip_address)
        except Exception as e:
            print(f"Error logging login: {e}")
            
        access_token = create_token(user["id"], user["username"], user["role"])
        refresh_token = create_token(user["id"], user["username"], user["role"], is_refresh=True)
        
        # Log successful login to audit logs
        database.log_audit_action("LOGIN", "user", None, {"username": user["username"]}, user["id"])
        
        return {
            "success": True,
            "token": access_token,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "username": user["username"],
            "name": user["name"],
            "role": user["role"]
        }
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/api/auth/refresh")
async def refresh_token_endpoint(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if payload.get("token_type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type. Refresh token expected.")
    
    new_access_token = create_token(payload["user_id"], payload["username"], payload["role"])
    return {
        "success": True,
        "access_token": new_access_token,
        "token": new_access_token
    }

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    conn = database.get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT name, role, username FROM users WHERE id = %s", (user["user_id"],))
    db_user = cursor.fetchone()
    conn.close()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "success": True,
        "username": db_user["username"],
        "name": db_user["name"],
        "role": db_user["role"]
    }

@app.get("/api/auth/login-logs")
async def get_login_logs(user: dict = Depends(require_role("admin", "course_champion"))):
    try:
        return database.get_login_logs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ErrorLogRequest(BaseModel):
    message: str
    stack: Optional[str] = None
    componentStack: Optional[str] = None

@app.post("/api/log-error")
async def log_error(req: ErrorLogRequest):
    print("---------------- FRONTEND ERROR DETECTED ----------------", flush=True)
    print(f"Message: {req.message}", flush=True)
    print(f"Stack: {req.stack}", flush=True)
    print(f"Component Stack: {req.componentStack}", flush=True)
    print("---------------------------------------------------------", flush=True)
    return {"success": True}


# Subject Management Endpoints
@app.get("/api/subjects")
async def list_subjects():
    return [
        {
            "subject_name": s.subject_name,
            "year": s.year,
            "semester": s.semester or "",
            "has_syllabus": bool(s.syllabus_text),
            "has_cos": len(s.cos) > 0,
            "has_mappings": len(s.co_po_mapping) > 0,
            "has_attainment": len(s.co_attainment) > 0,
            "avg_co_attainment": round(
                sum(co.avg_percentage for co in s.co_attainment) / len(s.co_attainment)
                if s.co_attainment else 0,
                1
            ),
            "weak_pos_count": len([po for po in s.po_attainment if po.is_weak]),
            "summary": s.summary()
        }
        for (name, uid), s in subjects.items() if uid is None
    ]

@app.post("/api/subjects")
async def create_subject(req: SubjectCreateRequest):
    if (req.subject_name, None) in subjects:
        raise HTTPException(status_code=400, detail="Subject already exists.")
    state = AgentState()
    state.subject_name = req.subject_name
    state.year = req.year
    if req.semester:
        state.semester = req.semester
    subjects[(req.subject_name, None)] = state
    global active_subject_id
    active_subject_id = req.subject_name
    state.log("System", "subject_create", f"Subject '{req.subject_name}' created.")
    save_subject_state(state)
    return {"success": True, "subject_id": req.subject_name}

@app.delete("/api/subjects/{subject_id}")
async def delete_subject(subject_id: str):
    global active_subject_id
    keys_to_delete = [k for k in subjects.keys() if k[0] == subject_id]
    if keys_to_delete:
        for k in keys_to_delete:
            del subjects[k]
        try:
            database.delete_subject(subject_id)
        except Exception as e:
            print(f"Error deleting subject {subject_id} from database: {e}")
            
        file_path = f"data/subjects/{subject_id}.json"
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing legacy file {file_path}: {e}")
                
        if active_subject_id == subject_id:
            active_subject_id = list(subjects.keys())[0][0] if subjects else None
        return {"success": True, "message": f"Subject '{subject_id}' deleted."}
    raise HTTPException(status_code=404, detail="Subject not found.")

@app.post("/api/subjects/active")
async def set_active_subject(req: ActiveSubjectRequest):
    global active_subject_id
    if not any(k[0] == req.subject_id for k in subjects.keys()):
        raise HTTPException(status_code=404, detail="Subject not found.")
    active_subject_id = req.subject_id
    return {"success": True, "active_subject_id": active_subject_id}

@app.get("/api/subjects/active")
async def get_active_subject():
    return {"active_subject_id": active_subject_id}

@app.get("/api/subjects/overall-analysis")
async def get_overall_analysis():
    master_subjects = [s for (name, uid), s in subjects.items() if uid is None]
    total_subjects = len(master_subjects)
    if total_subjects == 0:
        return {
            "total_subjects": 0,
            "avg_co_attainment": 0,
            "weak_po_distribution": {},
            "subjects_summary": []
        }
    
    all_co_attainments = []
    po_weakness_counts = {}
    subjects_summary = []
    
    for s in master_subjects:
        avg_co = (
            sum(co.avg_percentage for co in s.co_attainment) / len(s.co_attainment)
            if s.co_attainment else 0
        )
        if s.co_attainment:
            all_co_attainments.append(avg_co)
        
        weak_pos = [po.po_id for po in s.po_attainment if po.is_weak]
        for po_id in weak_pos:
            po_weakness_counts[po_id] = po_weakness_counts.get(po_id, 0) + 1
            
        subjects_summary.append({
            "subject_name": s.subject_name,
            "year": s.year,
            "total_cos": len(s.cos),
            "total_mappings": len(s.co_po_mapping),
            "has_attainment": len(s.co_attainment) > 0,
            "avg_co_attainment": round(avg_co, 1),
            "weak_pos_count": len(weak_pos),
            "weak_pos": weak_pos
        })
        
    overall_avg_co = sum(all_co_attainments) / len(all_co_attainments) if all_co_attainments else 0
    
    return {
        "total_subjects": total_subjects,
        "avg_co_attainment": round(overall_avg_co, 1),
        "weak_po_distribution": po_weakness_counts,
        "subjects_summary": subjects_summary
    }

@app.post("/api/setup")
async def setup(
    subject_name: str = Form(...),
    year: str = Form(...),
    level1_threshold: float = Form(...),
    level2_threshold: float = Form(...),
    level3_threshold: float = Form(...),
    syllabus_file: Optional[UploadFile] = File(None),
    x_subject_id: Optional[str] = Header(None)
):
    try:
        global active_subject_id
        
        # Look up by subject_name directly. If it exists in state, retrieve it.
        # Otherwise, initialize a new AgentState for this subject.
        if subject_name in subjects:
            state = subjects[subject_name]
        else:
            state = AgentState()
            state.subject_name = subject_name
            subjects[subject_name] = state
            
        active_subject_id = subject_name
            
        state.year = year
        state.update_thresholds(level1_threshold, level2_threshold, level3_threshold)
        state.log("System", "setup", f"Configured subject: {subject_name}, year: {year}")
        
        if syllabus_file:
            os.makedirs("data/syllabus", exist_ok=True)
            file_path = f"data/syllabus/{syllabus_file.filename}"
            with open(file_path, "wb") as f:
                shutil.copyfileobj(syllabus_file.file, f)
            
            # Read syllabus text
            state.syllabus_text = load_syllabus(file_path)
            state.log("System", "syllabus_upload", f"Uploaded and parsed {syllabus_file.filename}")
            
        save_subject_state(state)
        return {
            "success": True,
            "subject_name": state.subject_name,
            "summary": state.summary(),
            "syllabus_length": len(state.syllabus_text)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/state")
async def get_state(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        return {
            "subject_name": state.subject_name,
            "year": state.year,
            "semester": state.semester,
            "syllabus_text": state.syllabus_text,
            "department": state.department,
            "vision_mission": state.vision_mission,
            "performance_indicators": [pi.model_dump() for pi in state.performance_indicators],
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "level1_threshold": state.level1_threshold,
            "level2_threshold": state.level2_threshold,
            "level3_threshold": state.level3_threshold,
            "cos": [co.model_dump() for co in state.cos],
            "pos": [po.model_dump() for po in state.pos],
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "mapping_locked": state.mapping_locked,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment],
            "teaching_philosophy": state.teaching_philosophy,
            "recommendations": [r.model_dump() for r in state.recommendations],
            "audit_trail": state.audit_trail,
            "co_validation_feedback": state.co_validation_feedback,
            "mapping_validation_feedback": state.mapping_validation_feedback,
            "students": state.students,
            "max_marks": state.max_marks,
            "ia_students": state.ia_students,
            "ia_max_marks": state.ia_max_marks,
            "mse_students": state.mse_students,
            "mse_max_marks": state.mse_max_marks,
            "ese_students": state.ese_students,
            "ese_max_marks": state.ese_max_marks,
            "assignment": state.assignment.model_dump() if state.assignment else None,
            "previous_attainment_analysis": state.previous_attainment_analysis,
            "assessment_analysis": state.assessment_analysis,
            "course_description_option": state.course_description_option,
            "course_description_text": state.course_description_text,
            "course_context_data": state.course_context_data,
            "previous_cos_option": state.previous_cos_option,
            "previous_cos_raw": state.previous_cos_raw,
            "previous_cos": [co.model_dump() for co in state.previous_cos] if state.previous_cos else [],
            "new_generated_cos": [co.model_dump() for co in state.new_generated_cos] if state.new_generated_cos else [],
            "summary": state.summary()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/state/reset")
async def reset_state(x_subject_id: Optional[str] = Header(None)):
    global active_subject_id
    target_id = x_subject_id or active_subject_id
    if target_id in subjects:
        subjects[target_id] = AgentState()
        subjects[target_id].subject_name = target_id
        save_subject_state(subjects[target_id])
        return {"success": True, "message": f"State for '{target_id}' reset successfully"}
    return {"success": True, "message": "State reset successfully"}

@app.get("/api/cos")
async def get_cos(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return [co.model_dump() for co in state.cos]

@app.post("/api/cos/generate")
async def generate_cos(payload: dict, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    num_cos = payload.get("num_cos", 6)
    if not state.subject_name:
        raise HTTPException(status_code=400, detail="Setup has not been completed. Please set up the course first.")
    try:
        # Generate COs
        co_gen.run(state, num_cos)
        # Validate COs
        _, report = co_val.run(state)
        state.co_validation_feedback = "\n".join(report.issues)
        
        save_subject_state(state)
        return {
            "cos": [co.model_dump() for co in state.cos],
            "validation": {
                "passed": report.passed,
                "issues": report.issues,
                "suggestions": report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/cos/update")
async def update_cos(req: CoUpdateRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    state.cos = req.cos
    state.log("System", "cos_update", "Manually updated course outcomes")
    save_subject_state(state)
    return {"success": True, "cos": [co.model_dump() for co in state.cos]}

@app.post("/api/cos/regenerate")
async def regenerate_cos(req: CoRegenerateRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    if not state.cos:
        raise HTTPException(status_code=400, detail="No COs to regenerate")
    try:
        old_cos = [co.model_dump() for co in state.cos]
        reflection = reflect.generate_reflection(
            previous_output=old_cos,
            validator_feedback=state.co_validation_feedback,
            user_feedback=req.feedback
        )
        state.reflection_feedback = reflection
        co_gen.run(state, req.num_cos)
        _, report = co_val.run(state)
        state.co_validation_feedback = "\n".join(report.issues)
        
        save_subject_state(state)
        return {
            "cos": [co.model_dump() for co in state.cos],
            "reflection": reflection,
            "validation": {
                "passed": report.passed,
                "issues": report.issues,
                "suggestions": report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cos/approve")
async def approve_cos(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    for co in state.cos:
        co.validation_status = "approved"
    state.log("System", "cos_approve", "Approved and finalized Course Outcomes")
    save_subject_state(state)
    return {"success": True, "cos": [co.model_dump() for co in state.cos]}

@app.get("/api/pos")
async def get_pos(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return [po.model_dump() for po in state.pos]

@app.post("/api/pos/default")
async def load_default_pos(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    sample_path = "data/sample_pos.json"
    if os.path.exists(sample_path):
        with open(sample_path) as f:
            data = json.load(f)
        state.pos = [ProgramOutcome(**p) for p in data]
    else:
        # Fallback list PO1 to PO12
        defaults = [
            {"po_id": "PO1", "statement": "Engineering knowledge: Apply mathematical, scientific principles"},
            {"po_id": "PO2", "statement": "Problem analysis: Identify, formulate, and analyze complex problems"},
            {"po_id": "PO3", "statement": "Design/development of solutions: Design systems or processes"},
            {"po_id": "PO4", "statement": "Conduct investigations of complex problems: Use research-based knowledge"},
            {"po_id": "PO5", "statement": "Modern tool usage: Create, select, and apply appropriate techniques"},
            {"po_id": "PO6", "statement": "The engineer and society: Assess societal, health, safety, legal issues"},
            {"po_id": "PO7", "statement": "Environment and sustainability: Understand environmental impact"},
            {"po_id": "PO8", "statement": "Ethics: Apply ethical principles and professional ethics"},
            {"po_id": "PO9", "statement": "Individual and team work: Function effectively as an individual/member"},
            {"po_id": "PO10", "statement": "Communication: Communicate effectively on complex activities"},
            {"po_id": "PO11", "statement": "Project management and finance: Demonstrate knowledge of management principles"},
            {"po_id": "PO12", "statement": "Life-long learning: Recognize the need and prepare for continuous learning"}
        ]
        state.pos = [ProgramOutcome(**p) for p in defaults]
    
    state.log("System", "pos_load", f"Loaded default POs ({len(state.pos)} loaded)")
    save_subject_state(state)
    return {"success": True, "pos": [po.model_dump() for po in state.pos]}

@app.post("/api/pos/load")
async def load_custom_pos(req: PoLoadRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    state.pos = req.pos
    state.log("System", "pos_load", f"Loaded custom POs ({len(state.pos)} loaded)")
    save_subject_state(state)
    return {"success": True, "pos": [po.model_dump() for po in state.pos]}

@app.get("/api/mappings")
async def get_mappings(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    # Run mapping validator just in case
    passed, issues, suggestions = True, [], []
    if state.co_po_mapping:
        _, report = map_val.run(state)
        passed, issues, suggestions = report.passed, report.issues, report.suggestions
    
    pi_coverage = po_map.calculate_pi_coverage(state)
    
    return {
        "mappings": [m.model_dump() for m in state.co_po_mapping],
        "pi_mappings": [m.model_dump() for m in state.pi_mappings],
        "pi_coverage_analytics": pi_coverage,
        "evidence_analysis_report": {
            "attainment": state.previous_attainment_analysis,
            "assessment": state.assessment_analysis
        },
        "validation": {
            "passed": passed,
            "issues": issues,
            "suggestions": suggestions
        }
    }

@app.post("/api/mappings/generate")
async def generate_mappings(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    if state.mapping_locked:
        raise HTTPException(status_code=403, detail="CO-PO mapping is locked. Unlock it before regenerating.")
    if not state.cos or not state.pos:
        raise HTTPException(status_code=400, detail="Cannot generate mapping without finalized COs and POs")
    try:
        # Chain mapping workflow: CO-PI mapping first, then Articulation mapping
        pi_map.run(state)
        po_map.run(state)
        
        _, report = map_val.run(state)
        save_subject_state(state)
        
        pi_coverage = po_map.calculate_pi_coverage(state)
        
        return {
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "pi_coverage_analytics": pi_coverage,
            "evidence_analysis_report": {
                "attainment": state.previous_attainment_analysis,
                "assessment": state.assessment_analysis
            },
            "validation": {
                "passed": report.passed,
                "issues": report.issues,
                "suggestions": report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/mappings/update")
async def update_mappings(req: MappingUpdateRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    if state.mapping_locked:
        raise HTTPException(status_code=403, detail="CO-PO mapping is locked. Unlock it before making changes.")
    state.co_po_mapping = req.mappings
    state.log("System", "mappings_update", "Manually updated CO-PO mappings")
    
    # Validate and auto-correct any contradictions in the manually updated mappings
    validate_and_correct_mappings(state)
    
    _, report = map_val.run(state)
    save_subject_state(state)
    
    pi_coverage = po_map.calculate_pi_coverage(state)
    
    return {
        "success": True,
        "mappings": [m.model_dump() for m in state.co_po_mapping],
        "pi_mappings": [m.model_dump() for m in state.pi_mappings],
        "pi_coverage_analytics": pi_coverage,
        "evidence_analysis_report": {
            "attainment": state.previous_attainment_analysis,
            "assessment": state.assessment_analysis
        },
        "validation": {
            "passed": report.passed,
            "issues": report.issues,
            "suggestions": report.suggestions
        }
    }

@app.post("/api/mappings/lock")
async def lock_mappings(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    """Lock the CO-PO articulation matrix to prevent further AI regeneration or manual edits."""
    state = get_subject_state(x_subject_id)
    if not state.co_po_mapping:
        raise HTTPException(status_code=400, detail="Cannot lock an empty mapping matrix. Generate the matrix first.")
    state.mapping_locked = True
    state.log("System", "mapping_lock", "CO-PO mapping matrix has been locked by faculty.")
    save_subject_state(state)
    
    # Log to audit logs
    database.log_audit_action("GENERATE_MAPPING", "mappings", None, {"action": "lock"}, user["user_id"])
    
    return {"success": True, "mapping_locked": True}

@app.post("/api/mappings/unlock")
async def unlock_mappings(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    """Unlock the CO-PO articulation matrix to allow edits again."""
    state = get_subject_state(x_subject_id)
    state.mapping_locked = False
    state.log("System", "mapping_unlock", "CO-PO mapping matrix has been unlocked.")
    save_subject_state(state)
    
    # Log to audit logs
    database.log_audit_action("GENERATE_MAPPING", "mappings", None, {"action": "unlock"}, user["user_id"])
    
    return {"success": True, "mapping_locked": False}

@app.post("/api/mappings/recalculate")
async def recalculate_mappings(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    """
    Force-recalculates ALL CO-PO articulation strengths mathematically from current PI mappings.
    This corrects any stale or inconsistent strength values (e.g. LLM-generated strengths that
    contradict the actual PI coverage evidence).
    
    Thresholds applied:
      0% PI coverage       → strength 0 (no mapping, shown as '–')
      1%  – 33% coverage   → strength 1 (Level 1)
      34% – 66% coverage   → strength 2 (Level 2)
      67% – 100% coverage  → strength 3 (Level 3)
    """
    state = get_subject_state(x_subject_id)
    if not state.cos or not state.pos:
        raise HTTPException(status_code=400, detail="Cannot recalculate without COs and POs configured.")
    if not state.pi_mappings and not state.performance_indicators:
        raise HTTPException(status_code=400, detail="Cannot recalculate without PI data. Please generate PI mappings first.")
    
    try:
        corrections = 0
        before_strengths = {(m.co_id, m.po_id): m.strength for m in state.co_po_mapping}
        
        # Use the mathematical recalculation function from po_mapper
        po_map.recalculate_strengths_mathematically(state)
        
        # Count corrections
        for m in state.co_po_mapping:
            old = before_strengths.get((m.co_id, m.po_id))
            if old is not None and old != m.strength:
                corrections += 1
                print(f"[RECALCULATE] Corrected {m.co_id}→{m.po_id}: {old} → {m.strength}")
        
        state.log("System", "mappings_recalculate",
                  f"Force-recalculated CO-PO articulation matrix from PI coverage data. {corrections} cell(s) corrected.")
        save_subject_state(state)
        
        pi_coverage = po_map.calculate_pi_coverage(state)
        _, report = map_val.run(state)
        
        # Log to audit logs
        database.log_audit_action("GENERATE_MAPPING", "mappings", None, {"action": "recalculate", "corrections": corrections}, user["user_id"])
        
        return {
            "success": True,
            "corrections": corrections,
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "pi_coverage_analytics": pi_coverage,
            "validation": {
                "passed": report.passed,
                "issues": report.issues,
                "suggestions": report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/department/setup")
async def setup_department(
    department: str = Form(...),
    vision_mission: Optional[str] = Form(""),
    vision_file: Optional[UploadFile] = File(None),
    x_subject_id: Optional[str] = Header(None)
):
    state = get_subject_state(x_subject_id)
    try:
        state.department = department
        
        # Auto-create department in database if it doesn't already exist
        if department:
            try:
                existing_dept = database.get_department_by_name(department)
                if not existing_dept:
                    database.create_department(department)
                    print(f"Auto-created department '{department}' in database.")
            except Exception as e:
                print(f"Warning: Could not auto-create department '{department}': {e}")
        
        vision_text = vision_mission or ""
        if vision_file:
            os.makedirs("data/syllabus", exist_ok=True)
            file_path = f"data/syllabus/dept_{vision_file.filename}"
            with open(file_path, "wb") as f:
                shutil.copyfileobj(vision_file.file, f)
            vision_text = load_syllabus(file_path)
            
        state.vision_mission = vision_text
        state.log("System", "department_setup", f"Configured department: {department}")
        
        # Generate PIs
        pi_gen.run(state)
        
        save_subject_state(state)
        return {
            "success": True,
            "department": state.department,
            "vision_mission": state.vision_mission,
            "performance_indicators": [pi.model_dump() for pi in state.performance_indicators]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mappings/pi/generate")
async def generate_pi_mappings(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    try:
        # Chain generation: generate PI mapping first, then mathematically update CO-PO articulation matrix
        pi_map.run(state)
        po_map.run(state)
        save_subject_state(state)
        
        pi_coverage = po_map.calculate_pi_coverage(state)
        
        # Log to audit logs
        database.log_audit_action("GENERATE_MAPPING", "mappings", None, {"action": "generate_pi"}, user["user_id"])
        
        return {
            "success": True,
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "pi_coverage_analytics": pi_coverage,
            "evidence_analysis_report": {
                "attainment": state.previous_attainment_analysis,
                "assessment": state.assessment_analysis
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/mappings/pi/update")
async def update_pi_mappings(req: PiMappingUpdateRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        # Update PI mappings and mathematically recalculate CO-PO articulation matrix
        state.pi_mappings = req.mappings
        po_map.recalculate_strengths_mathematically(state)
        state.log("System", "pi_mappings_update", "Manually updated PI mappings and recalculated CO-PO articulation matrix")
        save_subject_state(state)
        
        pi_coverage = po_map.calculate_pi_coverage(state)
        
        return {
            "success": True,
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "pi_coverage_analytics": pi_coverage,
            "evidence_analysis_report": {
                "attainment": state.previous_attainment_analysis,
                "assessment": state.assessment_analysis
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mappings/pi/suggest")
async def suggest_pi_mapping(req: PiSuggestRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        co = next((c for c in state.cos if c.co_id == req.co_id), None)
        pi = next((p for p in state.performance_indicators if p.pi_id == req.pi_id), None)
        
        if not co or not pi:
            raise HTTPException(status_code=400, detail=f"CO {req.co_id} or PI {req.pi_id} not found in the current subject.")
            
        system = "You are an expert in Outcome-Based Education (OBE) and NBA accreditation. Your task is to recommend changes or additions in syllabus topics, pedagogical methods, or assessment questions to establish a meaningful alignment between a Course Outcome (CO) and a Performance Indicator (PI)."
        
        prompt = f"""
Subject: {state.subject_name}
Course Outcome: {co.co_id} - {co.statement}
Performance Indicator: {pi.pi_id} - {pi.pi_statement} (under PO {pi.po_id})

Currently, there is no mapping between this CO and PI.
Please provide:
1. A clear diagnosis of why they don't map.
2. Specific concrete changes to make (e.g. syllabus additions, practical topics, or assignments) that would justify a mapping.
3. A suggested question, assessment, or activity that directly tests this connection.

Be extremely specific, professional, and concise. Make sure your suggestions are actionable.
"""
        recommendation = call_llm(prompt=prompt, system=system, expect_json=False)
        return {"suggestion": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/philosophy")
async def get_philosophy(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return {"philosophy": state.teaching_philosophy}

@app.post("/api/philosophy/generate")
async def generate_philosophy(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    if not state.cos:
        raise HTTPException(status_code=400, detail="Cannot generate teaching philosophy without Course Outcomes")
    try:
        teach.run(state)
        save_subject_state(state)
        return {"philosophy": state.teaching_philosophy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/attainment/upload-marks")
async def upload_marks(
    assessment_type: str = Form(...),
    marks_file: UploadFile = File(...),
    co_targets: Optional[str] = Form(None),
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(get_current_user)
):
    state = get_subject_state(x_subject_id)
    ensure_pos_and_mappings(state)
    try:
        # Parse and save custom CO targets if provided
        if co_targets:
            import json
            targets_dict = json.loads(co_targets)
            for co in state.cos:
                if co.co_id in targets_dict:
                    co.target_attainment = float(targets_dict[co.co_id])

        os.makedirs("data/students", exist_ok=True)
        csv_path = f"data/students/{assessment_type}_{marks_file.filename}"
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(marks_file.file, f)
            
        # Read the student details from uploaded CSV to display in student management table
        import pandas as pd
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Detect roll column
        possible_roll_columns = ["roll_no", "rollno", "roll number", "student_id", "studentid", "enrollment_no"]
        roll_col = next((c for c in possible_roll_columns if c in df.columns), None) or df.columns[0]
        
        students_list = []
        max_marks = {}
        
        # Find MAX row
        max_rows = df[df[roll_col].astype(str).str.upper() == "MAX"]
        if len(max_rows) > 0:
            max_row = max_rows.iloc[0]
            for col in df.columns:
                if col.upper().startswith("CO"):
                    max_marks[col.upper()] = float(max_row[col])
        
        # Add students
        student_rows = df[df[roll_col].astype(str).str.upper() != "MAX"]
        for _, row in student_rows.iterrows():
            stud = {
                "roll_no": str(row[roll_col]),
                "name": str(row.get("name", "Unknown")),
                "marks": {}
            }
            for col in df.columns:
                if col.upper().startswith("CO"):
                    stud["marks"][col.upper()] = float(row[col])
            students_list.append(stud)
            
        atype = assessment_type.upper()
        if atype == "IA":
            state.ia_students = students_list
            state.ia_max_marks = max_marks
        elif atype == "MSE":
            state.mse_students = students_list
            state.mse_max_marks = max_marks
        elif atype == "ESE":
            state.ese_students = students_list
            state.ese_max_marks = max_marks

        # Backwards compatible state sync
        state.students = state.ese_students or state.ia_students or state.mse_students
        state.max_marks = state.ese_max_marks or state.ia_max_marks or state.mse_max_marks

        # Align CO IDs
        align_co_ids(state)

        # Run attainment calculations
        co_att.recalculate_attainment(state)
        
        # Run PO attainment calculations
        po_att.run(state)

        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action(
            "UPLOAD_MARKS", 
            "marks", 
            None, 
            {"assessment_type": assessment_type, "filename": marks_file.filename}, 
            user["user_id"]
        )
        
        return {
            "success": True,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment],
            "students": state.students,
            "max_marks": state.max_marks,
            "ia_students": state.ia_students,
            "ia_max_marks": state.ia_max_marks,
            "mse_students": state.mse_students,
            "mse_max_marks": state.mse_max_marks,
            "ese_students": state.ese_students,
            "ese_max_marks": state.ese_max_marks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attainment")
async def get_attainment(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return {
        "co_attainment": [a.model_dump() for a in state.co_attainment],
        "po_attainment": [a.model_dump() for a in state.po_attainment]
    }

class ManualAttainmentItem(BaseModel):
    co_id: str
    ia_percentage: Optional[float] = None
    mse_percentage: Optional[float] = None
    ese_percentage: Optional[float] = None

class ManualAttainmentRequest(BaseModel):
    attainments: List[ManualAttainmentItem]
    co_targets: Optional[Dict[str, float]] = None

@app.post("/api/attainment/manual-input")
async def save_manual_attainment(
    req: ManualAttainmentRequest, 
    x_subject_id: Optional[str] = Header(None), 
    user: dict = Depends(require_role("admin", "course_champion"))
):
    state = get_subject_state(x_subject_id)
    ensure_pos_and_mappings(state)
    try:
        # Parse and save custom CO targets if provided
        if req.co_targets:
            for co in state.cos:
                if co.co_id in req.co_targets:
                    co.target_attainment = req.co_targets[co.co_id]

        # Initialize temporary attainment list with manual percentages
        results = []
        for item in req.attainments:
            results.append(COAttainment(
                co_id=item.co_id,
                ia_percentage=item.ia_percentage,
                ia_level=None,
                mse_percentage=item.mse_percentage,
                mse_level=None,
                cie_percentage=None,
                cie_level=None,
                ese_percentage=item.ese_percentage,
                ese_level=None,
                avg_percentage=0.0,
                achieved_level=0.0,
                threshold_used={}
            ))
            
        state.co_attainment = results
        
        # Clear student lists and marks since we are doing manual input overrides
        state.students = []
        state.max_marks = {}
        state.ia_students = []
        state.ia_max_marks = {}
        state.mse_students = []
        state.mse_max_marks = {}
        state.ese_students = []
        state.ese_max_marks = {}
        
        # Recalculate using unified attainment agent
        co_att.recalculate_attainment(state)
        
        # Run PO attainment calculations
        po_att.run(state)
        
        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action("GENERATE_ATTAINMENT", "attainment", None, {"type": "manual_input"}, user["user_id"])
        
        return {
            "success": True,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/attainment/clear")
async def clear_attainment(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    state.co_attainment = []
    state.po_attainment = []
    state.students = []
    state.max_marks = {}
    state.ia_students = []
    state.ia_max_marks = {}
    state.mse_students = []
    state.mse_max_marks = {}
    state.ese_students = []
    state.ese_max_marks = {}
    state.log("System", "attainment_clear", "Cleared student marks and attainment calculations")
    save_subject_state(state)
    
    # Log to audit logs
    database.log_audit_action("GENERATE_ATTAINMENT", "attainment", None, {"action": "clear"}, user["user_id"])
    
    return {"success": True}

@app.get("/api/recommendations")
async def get_recommendations(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return [r.model_dump() for r in state.recommendations]

@app.post("/api/recommendations/generate")
async def generate_recommendations(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    ensure_pos_and_mappings(state)
    if state.co_attainment:
        has_real_attainment = any(po.weighted_attainment > 0 for po in state.po_attainment)
        if not has_real_attainment:
            try:
                po_att.run(state)
            except Exception as e:
                print(f"Error running self-healing PO attainment: {e}")
            
    if not state.co_attainment or not state.po_attainment:
        raise HTTPException(status_code=400, detail="Cannot generate recommendations without calculated attainment levels")
    try:
        rec.run(state)
        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action("EXPORT_REPORT", "recommendations", None, None, user["user_id"])
        
        return [r.model_dump() for r in state.recommendations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/excel")
async def get_excel_report(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    try:
        path = reporter.run(state)
        
        # Log to audit logs
        database.log_audit_action("EXPORT_REPORT", "excel", None, None, user["user_id"])
        
        return FileResponse(path, filename=os.path.basename(path), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/pdf")
async def get_pdf_report(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_MultiAgent_{timestamp}.pdf"
        
        generate_pdf_report(state, path)
        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action("EXPORT_REPORT", "pdf", None, None, user["user_id"])
        
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analysis/pdf")
async def get_analysis_pdf(x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    if not state.co_attainment:
        raise HTTPException(status_code=400, detail="No attainment data calculated yet.")
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_AnalysisDossier_{timestamp}.pdf"
        
        generate_analysis_pdf(state, path)
        
        # Log to audit logs
        database.log_audit_action("EXPORT_REPORT", "analysis_pdf", None, None, user["user_id"])
        
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class AssignmentGenerateRequest(BaseModel):
    difficulty: str = "Medium"
    assignment_type: str = "Theory"
    num_questions_per_co: int = 3
    generate_answer_key: bool = False
    generate_rubric: bool = False

@app.post("/api/assignment/generate")
async def generate_assignment_endpoint(
    req: AssignmentGenerateRequest, 
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("admin", "course_champion"))
):
    state = get_subject_state(x_subject_id)
    try:
        assignment_gen.run(
            state=state,
            difficulty=req.difficulty,
            assignment_type=req.assignment_type,
            num_questions_per_co=req.num_questions_per_co,
            generate_answer_key=req.generate_answer_key,
            generate_rubric=req.generate_rubric
        )
        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action("GENERATE_ASSIGNMENT", "assignments", None, {"difficulty": req.difficulty, "assignment_type": req.assignment_type}, user["user_id"])
        
        return state.assignment.model_dump() if state.assignment else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assignment")
async def get_assignment_endpoint(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return state.assignment.model_dump() if state.assignment else {}

@app.get("/api/assignment/pdf")
async def get_assignment_pdf_endpoint(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    if not state.assignment:
        raise HTTPException(status_code=400, detail="No assignment has been generated yet for this subject.")
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_Assignment_{timestamp}.pdf"
        
        generate_assignment_pdf(state.assignment, path)
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/subjects/auto-pipeline/phase1")
async def run_pipeline_phase1(
    subject_name: str = Form(...),
    year: str = Form(...),
    level1_threshold: float = Form(...),
    level2_threshold: float = Form(...),
    level3_threshold: float = Form(...),
    syllabus_file: UploadFile = File(...),
    num_cos: int = Form(6)
):
    try:
        # 1. Initialize / Setup Subject State
        if subject_name not in subjects:
            subjects[subject_name] = AgentState()
        
        state = subjects[subject_name]
        state.subject_name = subject_name
        state.year = year
        state.update_thresholds(level1_threshold, level2_threshold, level3_threshold)
        state.log("System", "setup", f"Configured subject: {subject_name}, year: {year}")
        
        global active_subject_id
        active_subject_id = subject_name

        # 2. Upload & Parse Syllabus
        os.makedirs("data/syllabus", exist_ok=True)
        file_path = f"data/syllabus/{syllabus_file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(syllabus_file.file, f)
        
        state.syllabus_text = load_syllabus(file_path)
        state.log("System", "syllabus_upload", f"Uploaded and parsed {syllabus_file.filename}")

        # 3. Generate Course Outcomes (COs)
        co_gen.run(state, num_cos)
        _, co_report = co_val.run(state)
        state.co_validation_feedback = "\n".join(co_report.issues)

        # 4. Load Default Program Outcomes (POs)
        sample_path = "data/sample_pos.json"
        if os.path.exists(sample_path):
            with open(sample_path) as f:
                data = json.load(f)
            state.pos = [ProgramOutcome(**p) for p in data]
        else:
            defaults = [
                {"po_id": "PO1", "statement": "Engineering knowledge: Apply mathematical, scientific principles"},
                {"po_id": "PO2", "statement": "Problem analysis: Identify, formulate, and analyze complex problems"},
                {"po_id": "PO3", "statement": "Design/development of solutions: Design systems or processes"},
                {"po_id": "PO4", "statement": "Conduct investigations of complex problems: Use research-based knowledge"},
                {"po_id": "PO5", "statement": "Modern tool usage: Create, select, and apply appropriate techniques"},
                {"po_id": "PO6", "statement": "The engineer and society: Assess societal, health, safety, legal issues"},
                {"po_id": "PO7", "statement": "Environment and sustainability: Understand environmental impact"},
                {"po_id": "PO8", "statement": "Ethics: Apply ethical principles and professional ethics"},
                {"po_id": "PO9", "statement": "Individual and team work: Function effectively as an individual/member"},
                {"po_id": "PO10", "statement": "Communication: Communicate effectively on complex activities"},
                {"po_id": "PO11", "statement": "Project management and finance: Demonstrate knowledge of management principles"},
                {"po_id": "PO12", "statement": "Life-long learning: Recognize the need and prepare for continuous learning"}
            ]
            state.pos = [ProgramOutcome(**p) for p in defaults]
        state.log("System", "pos_load", f"Loaded default POs ({len(state.pos)} loaded)")

        # 5. Generate CO-PO Mapping Matrix
        po_map.run(state)
        _, map_report = map_val.run(state)
        state.mapping_validation_feedback = "\n".join(map_report.issues)

        # 6. Generate Teaching Philosophy
        teach.run(state)

        # Save State to Disk
        save_subject_state(state)

        return {
            "success": True,
            "subject_name": state.subject_name,
            "year": state.year,
            "cos": [co.model_dump() for co in state.cos],
            "pos": [po.model_dump() for po in state.pos],
            "mappings": [m.model_dump() for m in state.co_po_mapping],
            "teaching_philosophy": state.teaching_philosophy,
            "co_validation": {
                "passed": co_report.passed,
                "issues": co_report.issues,
                "suggestions": co_report.suggestions
            },
            "mapping_validation": {
                "passed": map_report.passed,
                "issues": map_report.issues,
                "suggestions": map_report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/subjects/auto-pipeline/phase2")
async def run_pipeline_phase2(
    marks_file: UploadFile = File(...),
    x_subject_id: Optional[str] = Header(None)
):
    state = get_subject_state(x_subject_id)
    ensure_pos_and_mappings(state)
    if not state.cos:
        raise HTTPException(status_code=400, detail="Prerequisites incomplete. Make sure Course Outcomes are generated first.")
    try:
        # 1. Upload Marks
        os.makedirs("data/students", exist_ok=True)
        csv_path = f"data/students/{marks_file.filename}"
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(marks_file.file, f)

        # 2. Run Direct Attainment Calculations
        co_att.run(state, csv_path)

        # 3. Read the student details from uploaded CSV & build student database
        import pandas as pd
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Detect roll column
        possible_roll_columns = ["roll_no", "rollno", "roll number", "student_id", "studentid", "enrollment_no"]
        roll_col = next((c for c in possible_roll_columns if c in df.columns), None) or df.columns[0]
        
        students_list = []
        max_marks = {}
        
        # Find MAX row
        max_rows = df[df[roll_col].astype(str).str.upper() == "MAX"]
        if len(max_rows) > 0:
            max_row = max_rows.iloc[0]
            for col in df.columns:
                if col.upper().startswith("CO"):
                    max_marks[col.upper()] = float(max_row[col])
        
        # Add students
        student_rows = df[df[roll_col].astype(str).str.upper() != "MAX"]
        for _, row in student_rows.iterrows():
            stud = {
                "roll_no": str(row[roll_col]),
                "name": str(row.get("name", "Unknown")),
                "marks": {}
            }
            for col in df.columns:
                if col.upper().startswith("CO"):
                    stud["marks"][col.upper()] = float(row[col])
            students_list.append(stud)

        state.students = students_list
        state.max_marks = max_marks

        # 4. Align CO IDs
        align_co_ids(state)

        # 5. Run PO Attainment Calculations
        po_att.run(state)

        # 6. Generate AI Improvement Recommendations
        rec.run(state)

        # Save State to Disk
        save_subject_state(state)

        return {
            "success": True,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment],
            "recommendations": [r.model_dump() for r in state.recommendations],
            "students": state.students,
            "max_marks": state.max_marks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

class SuggestMappingRequest(BaseModel):
    co_id: str
    po_id: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, x_subject_id: Optional[str] = Header(None)):
    try:
        # Resolve active subject state to inject context
        subject_context = ""
        try:
            state = get_subject_state(x_subject_id)
            if state:
                co_text = "\n".join([f"- {co.co_id}: {co.statement}" for co in state.cos])
                po_text = "\n".join([f"- {po.po_id}: {po.statement}" for po in state.pos])
                mapping_text = "\n".join([
                    f"- {m.co_id} maps to {m.po_id} (Strength: {m.strength}, Reasoning: {m.reasoning})"
                    for m in state.co_po_mapping if m.strength > 0
                ])
                subject_context = f"""
Active Subject Context:
- Subject Name: {state.subject_name}
- Year: {state.year}
- Syllabus: {state.syllabus_text[:1000]}...
- Course Outcomes (COs):
{co_text}
- Program Outcomes (POs):
{po_text}
- Current Mappings:
{mapping_text}
"""
        except Exception:
            # If no subject is active or it fails, continue without subject context
            subject_context = "No active subject has been configured yet."

        system = f"""You are the MIT AOE AI Assistant, a helpful assistant integrated into the MIT AOE OBE (Outcome-Based Education) ERP system.
Your goal is to assist faculty members with OBE concepts, syllabus uploads, CO-PO mapping, attainment thresholds, and general queries about the subjects they teach.
Be supportive, professional, and reference OBE terminology (such as Bloom's Taxonomy, direct/indirect attainment, program outcomes) when relevant.
Always answer concisely.

{subject_context}
"""
        
        # Build prompt history
        prompt = "Conversation history:\n"
        for msg in req.history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            prompt += f"{role.upper()}: {content}\n"
        prompt += f"USER: {req.message}\nASSISTANT:"

        response_text = call_llm(prompt=prompt, system=system, expect_json=False)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations/suggest-mapping")
async def suggest_mapping_endpoint(req: SuggestMappingRequest, x_subject_id: Optional[str] = Header(None)):
    try:
        state = get_subject_state(x_subject_id)
        # Find matching CO and PO statements
        co = next((c for c in state.cos if c.co_id == req.co_id), None)
        po = next((p for p in state.pos if p.po_id == req.po_id), None)
        
        if not co or not po:
            raise HTTPException(status_code=400, detail=f"CO {req.co_id} or PO {req.po_id} not found in the current subject.")
            
        system = "You are an expert in Outcome-Based Education (OBE) and NBA accreditation. Your task is to recommend changes or additions in syllabus topics, pedagogical methods, or assessment questions to establish a meaningful alignment between a Course Outcome (CO) and a Program Outcome (PO)."
        
        pis_under_po = [
            {"pi_id": pi.pi_id, "pi_statement": pi.pi_statement}
            for pi in state.performance_indicators if pi.po_id == po.po_id
        ]
        
        prompt = f"""
Subject: {state.subject_name}
Course Outcome: {co.co_id} - {co.statement} (Bloom's Level: L{co.blooms_level})
Program Outcome: {po.po_id} - {po.statement}
Available PIs under {po.po_id}:
{json.dumps(pis_under_po, indent=2)}

Currently, there is no mapping between this CO and PO.
Please analyze the CO, PO, and the PIs, and return a JSON object with the following fields:
1. "target_pi": Identify which specific Performance Indicator (PI) under {po.po_id} could be targeted to establish a map. Explain why.
2. "activity_suggestions": A concrete active learning pedagogical activity or tutorial to build this skill.
3. "assignment_suggestions": A specific assignment question or task.
4. "assessment_suggestions": A test question or evaluation method.
5. "reason_for_no_mapping": A brief academic reason why there is currently no mapping.

Return ONLY a valid JSON object. Do not include markdown wraps or code fences.
"""
        result = call_llm_json(prompt=prompt, system=system, temperature=0)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# REDESIGNED CO WORKFLOW ENDPOINTS
# =====================================================

import config

class AcademicSetupRequest(BaseModel):
    department: str
    year: str
    semester: str
    subject_name: str
    vision_mission: Optional[str] = ""

class FinalizeCosRequest(BaseModel):
    cos: List[CourseOutcome]

@app.get("/api/curriculum")
async def get_curriculum():
    return config.CURRICULUM

@app.post("/api/workflow/academic-setup")
async def workflow_academic_setup(req: AcademicSetupRequest):
    global active_subject_id
    subject_name = req.subject_name
    
    if subject_name not in subjects:
        state = AgentState()
        state.subject_name = subject_name
        subjects[subject_name] = state
    else:
        state = subjects[subject_name]
        
    active_subject_id = subject_name
    state.year = req.year
    state.semester = req.semester
    state.department = req.department
    if req.vision_mission:
        state.vision_mission = req.vision_mission.strip()
    
    # Auto-create department in database if it doesn't already exist
    if req.department:
        try:
            existing_dept = database.get_department_by_name(req.department)
            if not existing_dept:
                database.create_department(req.department)
                print(f"Auto-created department '{req.department}' in database.")
        except Exception as e:
            print(f"Warning: Could not auto-create department '{req.department}': {e}")
    
    # Auto-set thresholds from admin portal system_settings (falls back to config.py)
    try:
        settings = database.get_system_settings()
        year_key_map = {"FY": "fy_thresholds", "SY": "sy_thresholds", "TY": "ty_thresholds"}
        threshold_str = settings.get(year_key_map.get(req.year, ""), "")
        if threshold_str:
            parts = [float(x.strip()) for x in threshold_str.split(",") if x.strip()]
            if len(parts) == 3:
                state.update_thresholds(parts[0], parts[1], parts[2])
            else:
                raise ValueError(f"Expected 3 threshold values, got {len(parts)}")
        else:
            raise ValueError("No threshold setting found for year")
    except Exception as e:
        print(f"Warning: Could not load thresholds from system_settings for {req.year}: {e}. Using config.py defaults.")
        threshold_vals = config.ATTAINMENT_LEVELS.get(req.year, {1: 60, 2: 65, 3: 70})
        state.update_thresholds(threshold_vals[1], threshold_vals[2], threshold_vals[3])
    
    state.log("System", "academic_setup", f"Selected {subject_name} for {req.department} ({req.year}, {req.semester})")
    save_subject_state(state)
    return {"success": True, "subject_id": subject_name}

@app.post("/api/workflow/course-input")
async def workflow_course_input(
    option: str = Form(...),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    x_subject_id: Optional[str] = Header(None)
):
    state = get_subject_state(x_subject_id)
    state.course_description_option = option
    
    desc_text = ""
    if option in ["pdf", "txt"] and file:
        os.makedirs("data/syllabus", exist_ok=True)
        file_path = f"data/syllabus/workflow_{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        desc_text = load_syllabus(file_path)
    else:
        desc_text = text or ""
        
    state.course_description_text = desc_text
    state.syllabus_text = desc_text  # maintain backward compatibility
    
    # Run Course Context Agent
    context_data = course_context.run(state)
    save_subject_state(state)
    return {
        "success": True,
        "description_length": len(desc_text),
        "context_data": context_data
    }

@app.post("/api/workflow/previous-cos")
async def workflow_previous_cos(
    option: str = Form(...),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    x_subject_id: Optional[str] = Header(None)
):
    state = get_subject_state(x_subject_id)
    state.previous_cos_option = option
    
    raw_text = ""
    if option == "upload" and file:
        os.makedirs("data/syllabus", exist_ok=True)
        file_path = f"data/syllabus/prev_co_{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        raw_text = load_syllabus(file_path)
    elif option == "paste":
        raw_text = text or ""
        
    state.previous_cos_raw = raw_text
    
    # Run Historical CO Analyst Agent
    parsed_cos = historical_co_analyst.run(state)
    save_subject_state(state)
    return {
        "success": True,
        "previous_cos": [co.model_dump() for co in parsed_cos]
    }

@app.post("/api/workflow/previous-performance")
async def workflow_previous_performance(
    x_subject_id: Optional[str] = Header(None),
    request: Request = None
):
    state = get_subject_state(x_subject_id)
    form = await request.form()
    
    # Extract multiple files
    files = form.getlist("files")
    types = form.getlist("types")
    
    raw_assessments_text = ""
    marks_file_path = None
    
    os.makedirs("data/students", exist_ok=True)
    os.makedirs("data/syllabus", exist_ok=True)
    
    uploaded_files = []
    for i, file_item in enumerate(files):
        if not file_item.filename:
            continue
        file_type = types[i] if i < len(types) else "ia_paper"
        uploaded_files.append({
            "filename": file_item.filename,
            "type": file_type
        })
        
        if file_type == "student_marks":
            # Save marks CSV
            marks_file_path = f"data/students/prev_marks_{file_item.filename}"
            with open(marks_file_path, "wb") as f:
                shutil.copyfileobj(file_item.file, f)
        else:
            # Save and extract question paper text
            paper_path = f"data/syllabus/prev_assess_{file_item.filename}"
            with open(paper_path, "wb") as f:
                shutil.copyfileobj(file_item.file, f)
            text_extracted = load_syllabus(paper_path)
            raw_assessments_text += f"\n--- {file_type.upper()} ---\n" + text_extracted
            
    # Run Assessment Analyst Agent
    assessment_analyst.run(state, raw_assessments_text)
    
    # Run Attainment Analyst Agent
    attainment_analysis = attainment_analyst.run(state, marks_file_path, uploaded_files)
    
    save_subject_state(state)
    return {
        "success": True,
        "assessment_analysis": state.assessment_analysis,
        "attainment_analysis": attainment_analysis
    }

@app.post("/api/workflow/generate-cos")
async def workflow_generate_cos(payload: dict, x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    num_cos = payload.get("num_cos", 6)
    feedback = payload.get("feedback", "")
    
    if feedback:
        state.reflection_feedback = feedback
        
    try:
        # Run Generation Agent
        co_gen.run(state, num_cos)
        
        # Run Validation Agent
        _, report = co_val.run(state)
        state.co_validation_feedback = "\n".join(report.issues)
        
        # Run Recommendation Agent to establish recommendations for target COs
        try:
            if state.previous_attainment_analysis and "co_attainment" in state.previous_attainment_analysis:
                mock_co_atts = []
                for co_id, co_data in state.previous_attainment_analysis["co_attainment"].items():
                    mock_co_atts.append(COAttainment(
                        co_id=co_id,
                        avg_percentage=co_data.get("percentage", 0),
                        level_1_students_pct=0, level_2_students_pct=0, level_3_students_pct=0,
                        achieved_level=co_data.get("achieved_level", 0),
                        threshold_used={}
                    ))
                original_co_atts = state.co_attainment
                state.co_attainment = mock_co_atts
                rec.run(state)
                state.co_attainment = original_co_atts
            else:
                rec.run(state)
        except Exception as re_err:
            print(f"Non-critical recommendation running error: {re_err}")
            
        save_subject_state(state)
        
        # Log to audit logs
        database.log_audit_action("GENERATE_CO", "course_outcomes", None, {"num_cos": num_cos}, user["user_id"])
        
        return {
            "success": True,
            "cos": [co.model_dump() for co in state.new_generated_cos],
            "validation": {
                "passed": report.passed,
                "issues": report.issues,
                "suggestions": report.suggestions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/workflow/finalize-cos")
async def workflow_finalize_cos(req: FinalizeCosRequest, x_subject_id: Optional[str] = Header(None), user: dict = Depends(require_role("admin", "course_champion"))):
    state = get_subject_state(x_subject_id)
    state.cos = req.cos
    for co in state.cos:
        co.validation_status = "approved"
    
    # Auto-initialize default Program Outcomes (POs) and generate mappings for the finalized subject
    ensure_pos_and_mappings(state)
    
    state.log("System", "workflow_finalize_cos", f"Finalized and approved set of {len(state.cos)} Course Outcomes.")
    save_subject_state(state)
    
    # Log to audit logs
    database.log_audit_action("FINALIZE_CO", "course_outcomes", None, {"cos_count": len(req.cos)}, user["user_id"])
    
    return {
        "success": True,
        "cos": [co.model_dump() for co in state.cos]
    }

# ==============================================================================
# ADMINISTRATIVE PORTAL ENDPOINTS
# ==============================================================================

class SystemSettingsRequest(BaseModel):
    academic_year: str
    fy_thresholds: str
    sy_thresholds: str
    ty_thresholds: str
    jwt_session_timeout: int
    theme: str
    branding_college_name: str
    branding_logo_text: str

class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str
    name: str
    department_id: Optional[int] = None

class UserUpdateRequest(BaseModel):
    username: str
    role: str
    name: str
    department_id: Optional[int] = None
    status: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class DepartmentUpdateRequest(BaseModel):
    department_name: str
    vision: str
    mission: str
    academic_year: str

class AdminSubjectCreateRequest(BaseModel):
    subject_code: str
    subject_name: str
    semester: str
    year: str
    department_id: int

class AssignChampionRequest(BaseModel):
    subject_id: int
    faculty_id: int

class AddFacultyRequest(BaseModel):
    subject_id: int
    faculty_id: int

@app.get("/api/admin/dashboard-stats")
async def admin_dashboard_stats(user: dict = Depends(require_role("admin"))):
    try:
        return database.get_admin_dashboard_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users")
async def admin_list_users(user: dict = Depends(require_role("admin"))):
    try:
        return database.list_users_detailed()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/users")
async def admin_create_user(req: UserCreateRequest, user: dict = Depends(require_role("admin"))):
    try:
        user_id = database.create_user_db(req.username, req.password, req.role, req.name, req.department_id)
        database.log_audit_action("CREATE_USER", "users", None, {"username": req.username, "role": req.role, "name": req.name}, user["user_id"])
        return {"success": True, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/users/{user_id}")
async def admin_update_user(user_id: int, req: UserUpdateRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.update_user_db(user_id, req.username, req.role, req.name, req.department_id, req.status)
        database.log_audit_action("EDIT_USER", "users", None, {"user_id": user_id, "username": req.username, "status": req.status}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: int, req: ResetPasswordRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.reset_password_db(user_id, req.new_password)
        database.log_audit_action("RESET_PASSWORD", "users", None, {"target_user_id": user_id}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/users/{user_id}/toggle-status")
async def admin_toggle_status(user_id: int, user: dict = Depends(require_role("admin"))):
    try:
        new_status = database.toggle_user_status_db(user_id)
        database.log_audit_action("DISABLE_USER" if new_status == "disabled" else "ENABLE_USER", "users", None, {"target_user_id": user_id, "new_status": new_status}, user["user_id"])
        return {"success": True, "status": new_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/departments")
async def admin_list_departments(user: dict = Depends(require_role("admin"))):
    try:
        return database.list_departments_detailed()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/departments/{dept_id}")
async def admin_update_department(dept_id: int, req: DepartmentUpdateRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.update_department_db(dept_id, req.department_name, req.vision, req.mission, req.academic_year)
        database.log_audit_action("EDIT_DEPARTMENT", "departments", None, {"dept_id": dept_id, "name": req.department_name}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/subjects")
async def admin_list_subjects(user: dict = Depends(require_role("admin"))):
    try:
        return database.list_subjects_detailed()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/subjects")
async def admin_create_subject(req: AdminSubjectCreateRequest, user: dict = Depends(require_role("admin"))):
    try:
        subject_id = database.create_subject_db(req.subject_code, req.subject_name, req.semester, req.year, req.department_id)
        try:
            load_all_subjects()
        except Exception:
            pass
        database.log_audit_action("CREATE_SUBJECT", "subjects", None, {"code": req.subject_code, "name": req.subject_name}, user["user_id"])
        return {"success": True, "subject_id": subject_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/subjects/{subject_id}")
async def admin_delete_subject(subject_id: int, user: dict = Depends(require_role("admin"))):
    try:
        database.delete_subject_db(subject_id)
        try:
            load_all_subjects()
        except Exception:
            pass
        database.log_audit_action("DELETE_SUBJECT", "subjects", None, {"subject_id": subject_id}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/assignments")
async def admin_list_assignments(user: dict = Depends(require_role("admin"))):
    try:
        return database.list_assignments_detailed()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/assignments/assign-champion")
async def admin_assign_champion(req: AssignChampionRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.assign_champion_db(req.subject_id, req.faculty_id)
        database.log_audit_action("ASSIGN_CHAMPION", "course_assignments", None, {"subject_id": req.subject_id, "faculty_id": req.faculty_id}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/assignments/add-faculty")
async def admin_add_faculty(req: AddFacultyRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.add_faculty_db(req.subject_id, req.faculty_id)
        database.log_audit_action("ADD_FACULTY", "course_assignments", None, {"subject_id": req.subject_id, "faculty_id": req.faculty_id}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/assignments/remove-faculty")
async def admin_remove_faculty(req: AddFacultyRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.remove_faculty_db(req.subject_id, req.faculty_id)
        database.log_audit_action("REMOVE_FACULTY", "course_assignments", None, {"subject_id": req.subject_id, "faculty_id": req.faculty_id}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/monitoring")
async def admin_monitoring(user: dict = Depends(require_role("admin"))):
    try:
        return database.get_monitoring_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/audit-logs")
async def admin_audit_logs(
    action: Optional[str] = None, 
    entity: Optional[str] = None, 
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(require_role("admin"))
):
    try:
        return database.list_audit_logs(action, entity, user_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/settings")
async def admin_get_settings(user: dict = Depends(require_role("admin"))):
    try:
        return database.get_system_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/settings")
async def admin_save_settings(req: SystemSettingsRequest, user: dict = Depends(require_role("admin"))):
    try:
        database.save_system_settings(
            req.academic_year, req.fy_thresholds, req.sy_thresholds, req.ty_thresholds,
            req.jwt_session_timeout, req.theme, req.branding_college_name, req.branding_logo_text
        )
        database.log_audit_action("SAVE_SETTINGS", "system_settings", None, {"academic_year": req.academic_year}, user["user_id"])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/reports/export-excel")
async def export_excel_report(user: dict = Depends(require_role("admin"))):
    try:
        from fastapi.responses import StreamingResponse
        import io
        import pandas as pd
        
        depts = database.list_departments_detailed()
        users = database.list_users_detailed()
        subjects = database.list_assignments_detailed()
        monitoring = database.get_monitoring_data()
        
        df_depts = pd.DataFrame(depts)
        df_users = pd.DataFrame(users)
        
        subj_rows = []
        for s in subjects:
            champion_name = s["champion"]["name"] if s["champion"] else "Not Assigned"
            fac_names = ", ".join(f["name"] for f in s["faculties"]) if s["faculties"] else "None"
            subj_rows.append({
                "Subject ID": s["id"],
                "Subject Code": s["subject_code"] or "N/A",
                "Subject Name": s["subject_name"],
                "Semester": s["semester"],
                "Year": s["year"],
                "Department": s["department_name"],
                "Course Champion": champion_name,
                "Assigned Faculty": fac_names
            })
        df_subjects = pd.DataFrame(subj_rows)
        
        mon_rows = []
        for m in monitoring:
            mon_rows.append({
                "Subject Code": m["subject_code"] or "N/A",
                "Subject Name": m["subject_name"],
                "Department": m["department_name"],
                "Year/Semester": f"{m['year']} / {m['semester']}",
                "Champion": m["champion_name"],
                "Progress Status": m["status"],
                "Avg Attainment (%)": m["avg_attainment"]
            })
        df_monitoring = pd.DataFrame(mon_rows)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df_depts.to_excel(writer, sheet_name="Departments", index=False)
            df_users.to_excel(writer, sheet_name="Users & Faculty", index=False)
            df_subjects.to_excel(writer, sheet_name="Subjects & Assignments", index=False)
            df_monitoring.to_excel(writer, sheet_name="Attainment & Progress", index=False)
            
        output.seek(0)
        
        database.log_audit_action("EXPORT_REPORT", "excel", None, {"report_type": "admin_overall_excel"}, user["user_id"])
        
        headers = {
            'Content-Disposition': 'attachment; filename="MIT_OBE_Overall_Report.xlsx"'
        }
        return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/reports/export-pdf")
async def export_pdf_report(user: dict = Depends(require_role("admin"))):
    try:
        from fastapi.responses import FileResponse
        from tools.admin_pdf_generator import generate_admin_pdf_report
        import uuid
        
        depts = database.list_departments_detailed()
        users = database.list_users_detailed()
        subjects = database.list_assignments_detailed()
        monitoring = database.get_monitoring_data()
        
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = f"data/output/MIT_OBE_AdminReport_{timestamp}.pdf"
        
        generate_admin_pdf_report(depts, users, subjects, monitoring, path)
        
        database.log_audit_action("EXPORT_REPORT", "pdf", None, {"report_type": "admin_overall_pdf"}, user["user_id"])
        
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Course Faculty Portal Endpoints ---

from core.jobs import queue_attainment_recalculation, get_job_status
from fastapi import BackgroundTasks, Query
import asyncio

class ChangePasswordRequest(BaseModel):
    new_password: str

class FacultyManualEntryRequest(BaseModel):
    subject_name: str
    assessment_type: str
    students: List[dict]
    max_marks: Dict[str, float]

@app.get("/api/faculty/dashboard")
async def get_faculty_dashboard(user: dict = Depends(require_role("course_faculty"))):
    try:
        # 1. Fetch assigned subjects
        assigned_subjects = database.get_faculty_subjects(user["user_id"])
        
        # 2. Compute upload and attainment statistics
        pending_uploads = 0
        completed_uploads = 0
        attainment_values = []
        upcoming_tasks = []
        notifications = []
        
        for sub in assigned_subjects:
            s_name = sub["subject_name"]
            state = get_subject_state(s_name, user_id=user["user_id"], role=user["role"])
            if state:
                # Check IA
                if not state.ia_students:
                    pending_uploads += 1
                    upcoming_tasks.append({
                        "id": f"up-ia-{s_name}",
                        "subject_name": s_name,
                        "task": f"Upload IA marks for {s_name}",
                        "due": "Pending"
                    })
                else:
                    completed_uploads += 1
                    
                # Check MSE
                if not state.mse_students:
                    pending_uploads += 1
                    upcoming_tasks.append({
                        "id": f"up-mse-{s_name}",
                        "subject_name": s_name,
                        "task": f"Upload MSE marks for {s_name}",
                        "due": "Pending"
                    })
                else:
                    completed_uploads += 1
                    
                # Check ESE
                if not state.ese_students:
                    pending_uploads += 1
                    upcoming_tasks.append({
                        "id": f"up-ese-{s_name}",
                        "subject_name": s_name,
                        "task": f"Upload ESE marks for {s_name}",
                        "due": "Pending"
                    })
                else:
                    completed_uploads += 1
                
                # Attainment average
                if state.co_attainment:
                    avg_att = sum(co.avg_percentage for co in state.co_attainment) / len(state.co_attainment)
                    attainment_values.append(avg_att)
                    if avg_att < 55.0:
                        notifications.append({
                            "id": f"warn-{s_name}",
                            "type": "warning",
                            "message": f"Average attainment for {s_name} ({round(avg_att, 1)}%) is below threshold."
                        })
        
        # 3. Fetch recent audit logs for subjects assigned to this faculty
        recent_activity = []
        if assigned_subjects:
            subj_ids = [sub["id"] for sub in assigned_subjects]
            conn = database.get_db_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Using placeholders for dynamic IN clause
            placeholders = ",".join(["%s"] * len(subj_ids))
            query = f"""
                SELECT al.id, al.action, al.created_at, u.name as user_name, s.subject_name 
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                LEFT JOIN subjects s ON al.subject_id = s.id
                WHERE al.subject_id IN ({placeholders})
                ORDER BY al.created_at DESC LIMIT 5
            """
            cursor.execute(query, tuple(subj_ids))
            rows = cursor.fetchall()
            conn.close()
            
            for r in rows:
                d = dict(r)
                if isinstance(d.get("created_at"), datetime):
                    d["created_at"] = d["created_at"].isoformat()
                recent_activity.append(d)
                
        # Fallback notifications if empty
        if not notifications:
            notifications.append({
                "id": "notif-welcome",
                "type": "info",
                "message": "Welcome to the Course Faculty Portal. Please complete your pending uploads."
            })
            
        return {
            "assigned_subjects_count": len(assigned_subjects),
            "pending_uploads_count": pending_uploads,
            "completed_uploads_count": completed_uploads,
            "average_attainment": round(sum(attainment_values) / len(attainment_values), 1) if attainment_values else 0.0,
            "recent_activity": recent_activity,
            "notifications": notifications,
            "upcoming_tasks": upcoming_tasks[:5]
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/subjects")
async def get_faculty_subjects(user: dict = Depends(require_role("course_faculty"))):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            """
            SELECT s.id, s.subject_code, s.subject_name, s.semester, s.year,
                   (SELECT u.name FROM users u JOIN course_assignments ca ON u.id = ca.faculty_id WHERE ca.subject_id = s.id AND ca.role = 'COURSE_CHAMPION' LIMIT 1) as champion_name
            FROM subjects s
            JOIN course_assignments ca ON s.id = ca.subject_id
            WHERE ca.faculty_id = %s
            ORDER BY s.subject_name
            """,
            (user["user_id"],)
        )
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            subj_name = r["subject_name"]
            state = get_subject_state(subj_name, user_id=user["user_id"], role=user["role"])
            
            status = "Syllabus Pending"
            if state:
                if state.co_attainment:
                    status = "Completed"
                elif state.co_po_mapping:
                    status = "CO-PO Mapped"
                elif state.syllabus_text:
                    status = "Syllabus Uploaded"
            
            results.append({
                "id": r["id"],
                "subject_code": r["subject_code"] or "N/A",
                "subject_name": subj_name,
                "semester": r["semester"],
                "year": r["year"],
                "champion": r["champion_name"] or "Not Assigned",
                "status": status
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/upload/lock-status/{subject_name}")
async def get_faculty_upload_lock_status(subject_name: str, user: dict = Depends(require_role("course_faculty"))):
    try:
        return database.get_upload_lock_status(subject_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/faculty/upload/validate-file")
async def validate_faculty_upload_file(
    assessment_type: str = Form(...),
    subject_name: str = Form(...),
    marks_file: UploadFile = File(...),
    user: dict = Depends(require_role("course_faculty"))
):
    import pandas as pd
    try:
        # 1. Check lock
        lock_status = database.get_upload_lock_status(subject_name)
        if lock_status.get("locked") and lock_status.get("locked_by_id") != user["user_id"]:
            raise HTTPException(status_code=409, detail=f"Marks upload already in progress by {lock_status.get('locked_by_name')}.")

        # 2. Parse file
        os.makedirs("data/students", exist_ok=True)
        temp_path = f"data/students/temp_fac_{user['user_id']}_{marks_file.filename}"
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(marks_file.file, f)
            
        # Determine format
        if marks_file.filename.endswith(".csv"):
            df = pd.read_csv(temp_path)
        elif marks_file.filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(temp_path)
        else:
            os.remove(temp_path)
            return {
                "success": False,
                "errors": ["Invalid file format. Only CSV and Excel files are allowed."],
                "warnings": [],
                "students": [],
                "max_marks": {}
            }
            
        os.remove(temp_path)
        
        # Standardize columns
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Find roll number column
        possible_roll = ["ROLL_NO", "ROLLNO", "ROLL NUMBER", "STUDENT_ID", "STUDENTID", "ENROLLMENT_NO", "ROLL"]
        roll_col = next((c for c in possible_roll if c in df.columns), None) or df.columns[0]
        
        # Find CO columns
        co_cols = [c for c in df.columns if c.startswith("CO")]
        errors = []
        warnings = []
        
        if not co_cols:
            errors.append("No Course Outcome (CO) columns detected. Columns should start with 'CO' (e.g. CO1, CO2).")
            
        # Check duplicate rolls
        roll_values = df[df[roll_col].astype(str).str.upper() != "MAX"][roll_col].dropna().tolist()
        if len(roll_values) != len(set(roll_values)):
            errors.append("Duplicate student roll numbers detected in sheet.")
            
        # Check MAX row
        max_rows = df[df[roll_col].astype(str).str.upper() == "MAX"]
        max_marks = {}
        if len(max_rows) == 0:
            errors.append("The sheet must contain a row with roll number 'MAX' to define maximum marks.")
        else:
            max_row = max_rows.iloc[0]
            for col in co_cols:
                try:
                    val = float(max_row[col])
                    if val <= 0:
                        errors.append(f"Max marks for {col} must be greater than 0.")
                    max_marks[col] = val
                except Exception:
                    errors.append(f"Max marks for {col} in MAX row is invalid or non-numeric.")
                    
        # Parse students & validate marks
        students_list = []
        student_rows = df[df[roll_col].astype(str).str.upper() != "MAX"]
        
        # Check active subject state for roster warnings
        state = get_subject_state(subject_name, user_id=user["user_id"], role=user["role"])
        existing_rolls = set()
        if state and state.students:
            existing_rolls = {str(s.get("roll_no", "")).strip().upper() for s in state.students if isinstance(s, dict)}
            
        uploaded_rolls = set()
        
        for idx, row in student_rows.iterrows():
            roll_val = str(row[roll_col]).strip()
            if not roll_val or roll_val.upper() == "NAN" or roll_val.upper() == "NONE":
                continue
                
            uploaded_rolls.add(roll_val.upper())
            name_val = str(row.get("NAME", "Unknown")).strip()
            
            marks_dict = {}
            for col in co_cols:
                raw_mark = row[col]
                # Allow empty cells as 0
                if pd.isna(raw_mark) or str(raw_mark).strip().upper() == "NAN" or str(raw_mark).strip().upper() == "NONE":
                    marks_dict[col] = 0.0
                    warnings.append(f"Missing mark for roll {roll_val} in {col} assumed as 0.")
                    continue
                    
                try:
                    mark = float(raw_mark)
                    if mark < 0:
                        errors.append(f"Negative mark detected for roll {roll_val} in column {col}.")
                    elif col in max_marks and mark > max_marks[col]:
                        errors.append(f"Mark ({mark}) for roll {roll_val} in column {col} exceeds maximum marks of {max_marks[col]}.")
                    marks_dict[col] = mark
                except Exception:
                    errors.append(f"Invalid non-numeric mark '{raw_mark}' for roll {roll_val} in column {col}.")
                    
            students_list.append({
                "roll_no": roll_val,
                "name": name_val,
                "marks": marks_dict
            })
            
        # Roster warnings
        if existing_rolls:
            missing_in_upload = existing_rolls - uploaded_rolls
            if missing_in_upload:
                warnings.append(f"Roster warning: {len(missing_in_upload)} students from course roster are missing in upload.")
                
        return {
            "success": len(errors) == 0,
            "errors": errors,
            "warnings": list(set(warnings)),
            "students": students_list,
            "max_marks": max_marks
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/faculty/upload/validate-manual")
async def validate_faculty_upload_manual(
    req: FacultyManualEntryRequest,
    user: dict = Depends(require_role("course_faculty"))
):
    try:
        # Check lock
        lock_status = database.get_upload_lock_status(req.subject_name)
        if lock_status.get("locked") and lock_status.get("locked_by_id") != user["user_id"]:
            raise HTTPException(status_code=409, detail=f"Marks upload already in progress by {lock_status.get('locked_by_name')}.")

        errors = []
        warnings = []
        
        rolls = [s["roll_no"] for s in req.students]
        if len(rolls) != len(set(rolls)):
            errors.append("Duplicate roll numbers detected.")
            
        for s in req.students:
            roll = s["roll_no"]
            for col, val in s["marks"].items():
                try:
                    mark = float(val)
                    if mark < 0:
                        errors.append(f"Negative mark detected for roll {roll} in {col}.")
                    elif col in req.max_marks and mark > req.max_marks[col]:
                        errors.append(f"Mark ({mark}) for roll {roll} in {col} exceeds maximum of {req.max_marks[col]}.")
                except Exception:
                    errors.append(f"Invalid non-numeric mark for roll {roll} in {col}.")
                    
        return {
            "success": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FacultySaveUploadRequest(BaseModel):
    subject_name: str
    assessment_type: str
    students: List[dict]
    max_marks: Dict[str, float]

@app.post("/api/faculty/upload/save")
async def save_faculty_upload(
    req: FacultySaveUploadRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_role("course_faculty"))
):
    # 1. Acquire Lock
    acquired = database.acquire_upload_lock(req.subject_name, user["user_id"])
    if not acquired:
        raise HTTPException(status_code=409, detail="Marks upload already in progress by another faculty.")
        
    try:
        # 2. Get active subject ID and state
        state = get_subject_state(req.subject_name, user_id=user["user_id"], role=user["role"])
        if not state:
            # Release lock before raising
            database.release_upload_lock(req.subject_name, user["user_id"])
            raise HTTPException(status_code=404, detail=f"Subject state not found for {req.subject_name}")
            
        # Save to memory state (students, max_marks)
        # Parse strings to floats for student marks
        cleaned_students = []
        for s in req.students:
            cleaned_marks = {k.upper(): float(v) for k, v in s["marks"].items()}
            cleaned_students.append({
                "roll_no": str(s["roll_no"]),
                "name": str(s.get("name", "Unknown")),
                "marks": cleaned_marks
            })
            
        cleaned_max = {k.upper(): float(v) for k, v in req.max_marks.items()}
        
        atype = req.assessment_type.upper()
        if atype == "IA":
            state.ia_students = cleaned_students
            state.ia_max_marks = cleaned_max
        elif atype == "MSE":
            state.mse_students = cleaned_students
            state.mse_max_marks = cleaned_max
        elif atype == "ESE":
            state.ese_students = cleaned_students
            state.ese_max_marks = cleaned_max
            
        # Sync to general students list (backwards compatibility)
        state.students = state.ese_students or state.ia_students or state.mse_students
        state.max_marks = state.ese_max_marks or state.ia_max_marks or state.mse_max_marks
        
        # Align CO IDs
        align_co_ids(state)
        
        # Log MARKS_UPLOADED to audit_logs
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE subject_name = %s", (req.subject_name,))
        row = cursor.fetchone()
        subject_id = row[0] if row else None
        cursor.close()
        conn.close()
        
        database.log_audit_action(
            "MARKS_UPLOADED",
            "marks",
            None,
            {"assessment_type": req.assessment_type, "student_count": len(cleaned_students)},
            user["user_id"],
            subject_id
        )
        
        # 3. Release Lock
        database.release_upload_lock(req.subject_name, user["user_id"])
        
        # 4. Dispatch calculation task to background
        queue_attainment_recalculation(state, req.subject_name, user["user_id"], background_tasks)
        
        return {"status": "processing"}
    except Exception as e:
        # Ensure lock is released on error
        database.release_upload_lock(req.subject_name, user["user_id"])
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/upload/status-stream/{subject_name}")
async def get_faculty_upload_status_stream(
    subject_name: str,
    token: str = Query(...)
):
    # Verify token since EventSource doesn't send headers
    try:
        payload = decode_token(token)
        if payload.get("role") != "course_faculty":
            raise HTTPException(status_code=403, detail="Forbidden access to status stream")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token for status stream")
        
    user_id = payload.get("user_id")
    async def event_generator():
        while True:
            status = get_job_status(subject_name, user_id)
            yield f"data: {json.dumps(status)}\n\n"
            if status.get("status") in ["completed", "failed"]:
                break
            await asyncio.sleep(1.5)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/faculty/state/{subject_name}")
async def get_faculty_subject_state(
    subject_name: str,
    user: dict = Depends(require_role("course_faculty"))
):
    try:
        state = get_subject_state(subject_name, user_id=user["user_id"], role=user["role"])
        return {
            "ia_students": state.ia_students,
            "ia_max_marks": state.ia_max_marks,
            "mse_students": state.mse_students,
            "mse_max_marks": state.mse_max_marks,
            "ese_students": state.ese_students,
            "ese_max_marks": state.ese_max_marks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/co")
async def get_faculty_co_overview(
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("course_faculty"))
):
    state = get_subject_state(x_subject_id, user_id=user["user_id"], role=user["role"])
    return {
        "course_description": state.course_description_text,
        "cos": [co.model_dump() for co in state.cos],
        "pos": [po.model_dump() for po in state.pos],
        "performance_indicators": [pi.model_dump() for pi in state.performance_indicators],
        "mappings": [m.model_dump() for m in state.co_po_mapping],
        "pi_mappings": [m.model_dump() for m in state.pi_mappings]
    }

@app.get("/api/faculty/attainment")
async def get_faculty_attainment(
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("course_faculty"))
):
    state = get_subject_state(x_subject_id, user_id=user["user_id"], role=user["role"])
    return {
        "co_attainment": [a.model_dump() for a in state.co_attainment],
        "po_attainment": [a.model_dump() for a in state.po_attainment],
        "recommendations": [r.model_dump() for r in state.recommendations]
    }

@app.get("/api/faculty/profile")
async def get_faculty_profile(user: dict = Depends(require_role("course_faculty"))):
    try:
        # Get detailed user info
        conn = database.get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            """
            SELECT u.name, u.role, d.department_name 
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = %s
            """,
            (user["user_id"],)
        )
        db_user = cursor.fetchone()
        conn.close()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        assigned_subjects = database.get_faculty_subjects(user["user_id"])
        login_logs = database.get_user_login_logs(user["user_id"])
        
        return {
            "name": db_user["name"],
            "department": db_user["department_name"] or "Computer Engineering",
            "role": db_user["role"],
            "assigned_subjects": [s["subject_name"] for s in assigned_subjects],
            "login_history": login_logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/faculty/profile/change-password")
async def faculty_change_password(
    req: ChangePasswordRequest,
    user: dict = Depends(require_role("course_faculty"))
):
    try:
        database.reset_password_db(user["user_id"], req.new_password)
        return {"success": True, "message": "Password updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/reports/excel")
async def faculty_export_excel(
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("course_faculty"))
):
    state = get_subject_state(x_subject_id, user_id=user["user_id"], role=user["role"])
    try:
        path = reporter.run(state)
        database.log_audit_action("EXPORT_REPORT", "excel", None, {"portal": "faculty"}, user["user_id"])
        return FileResponse(path, filename=os.path.basename(path), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/reports/pdf")
async def faculty_export_pdf(
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("course_faculty"))
):
    state = get_subject_state(x_subject_id, user_id=user["user_id"], role=user["role"])
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_MultiAgent_{timestamp}.pdf"
        
        generate_pdf_report(state, path)
        database.log_audit_action("EXPORT_REPORT", "pdf", None, {"portal": "faculty"}, user["user_id"])
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/faculty/reports/analysis-pdf")
async def faculty_export_analysis_pdf(
    x_subject_id: Optional[str] = Header(None),
    user: dict = Depends(require_role("course_faculty"))
):
    state = get_subject_state(x_subject_id, user_id=user["user_id"], role=user["role"])
    if not state.co_attainment:
        raise HTTPException(status_code=400, detail="No attainment data calculated yet.")
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_AnalysisDossier_{timestamp}.pdf"
        
        generate_analysis_pdf(state, path)
        database.log_audit_action("EXPORT_REPORT", "analysis_pdf", None, {"portal": "faculty"}, user["user_id"])
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/db-state")
async def debug_db_state():
    conn = database.get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        """
        SELECT ss.id, s.subject_name, ss.user_id, u.username, ss.state_data 
        FROM subject_states ss
        JOIN subjects s ON ss.subject_id = s.id
        LEFT JOIN users u ON ss.user_id = u.id
        """
    )
    rows = cursor.fetchall()
    conn.close()
    
    formatted = []
    for r in rows:
        sd = r["state_data"]
        formatted.append({
            "id": r["id"],
            "subject_name": r["subject_name"],
            "user_id": r["user_id"],
            "username": r["username"],
            "ia_students": [{"roll": s.get("roll_no"), "name": s.get("name")} for s in sd.get("ia_students", []) or []],
            "mse_students": [{"roll": s.get("roll_no"), "name": s.get("name")} for s in sd.get("mse_students", []) or []],
            "ese_students": [{"roll": s.get("roll_no"), "name": s.get("name")} for s in sd.get("ese_students", []) or []],
        })
    return formatted

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

