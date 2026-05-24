from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import json
import uuid
from datetime import datetime

import core.database as database

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
from tools.syllabus_reader import load_syllabus
from tools.pdf_generator import generate_pdf_report
from tools.assignment_pdf_generator import generate_assignment_pdf
from tools.llm_client import call_llm

app = FastAPI(title="Multi-Agent CO-PO ERP Platform Backend")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global multi-subject in-memory state dictionary
subjects: dict[str, AgentState] = {}
active_subject_id: Optional[str] = None

def save_subject_state(state: AgentState):
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
            "assignment": state.assignment.model_dump() if state.assignment else None,
        }
        database.save_subject_state(state.subject_name, state.year, data)
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
    if state.students:
        for stud in state.students:
            current_ids.update(stud.get("marks", {}).keys())
    if state.max_marks:
        current_ids.update(state.max_marks.keys())
        
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
                
    # 3. Update state.students
    if state.students:
        for stud in state.students:
            marks = stud.get("marks", {})
            new_marks = {}
            for k, v in marks.items():
                new_key = co_id_map.get(k, k)
                new_marks[new_key] = v
            stud["marks"] = new_marks
            
    # 4. Update state.max_marks
    if state.max_marks:
        new_max_marks = {}
        for k, v in state.max_marks.items():
            new_key = co_id_map.get(k, k)
            new_max_marks[new_key] = v
        state.max_marks = new_max_marks

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

    # Self-heal performance indicators if empty and department is set
    if not state.performance_indicators and state.department:
        try:
            pi_gen.run(state)
            has_changes = True
        except Exception as e:
            print(f"Error self-healing performance indicators: {e}")

    # Align CO IDs
    align_co_ids(state)
    
    if has_changes:
        save_subject_state(state)

# Helper to resolve subject state
def get_subject_state(x_subject_id: Optional[str] = Header(None)) -> AgentState:
    global active_subject_id
    target_id = x_subject_id or active_subject_id
    if not target_id:
        if subjects:
            target_id = list(subjects.keys())[0]
            active_subject_id = target_id
        else:
            raise HTTPException(status_code=400, detail="No subjects configured. Please add a subject first.")
    
    if target_id not in subjects:
        if subjects:
            fallback_id = list(subjects.keys())[0]
            print(f"Warning: Subject '{target_id}' not found. Falling back to '{fallback_id}'.")
            active_subject_id = fallback_id
            state = subjects[fallback_id]
            ensure_pos_and_mappings(state)
            return state
        raise HTTPException(status_code=404, detail=f"Subject '{target_id}' not found.")
    
    state = subjects[target_id]
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
                assignment_data = data.get("assignment", None)
                state.assignment = Assignment(**assignment_data) if assignment_data else None
                
                subjects[state.subject_name] = state
                
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
        active_subject_id = list(subjects.keys())[0]

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

class ActiveSubjectRequest(BaseModel):
    subject_id: str


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    ip_address = request.client.host if request.client else "127.0.0.1"
    user = database.verify_user(req.username, req.password)
    if user:
        try:
            database.log_login_attempt(req.username, ip_address)
        except Exception as e:
            print(f"Error logging login: {e}")
        return {
            "success": True,
            "token": f"mock-jwt-token-{uuid.uuid4().hex[:12]}",
            "username": user["username"],
            "name": user["name"]
        }
    raise HTTPException(status_code=401, detail="Invalid username or password")


@app.get("/api/auth/login-logs")
async def get_login_logs():
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
        for s in subjects.values()
    ]

@app.post("/api/subjects")
async def create_subject(req: SubjectCreateRequest):
    if req.subject_name in subjects:
        raise HTTPException(status_code=400, detail="Subject already exists.")
    state = AgentState()
    state.subject_name = req.subject_name
    state.year = req.year
    subjects[req.subject_name] = state
    global active_subject_id
    active_subject_id = req.subject_name
    state.log("System", "subject_create", f"Subject '{req.subject_name}' created.")
    save_subject_state(state)
    return {"success": True, "subject_id": req.subject_name}

@app.delete("/api/subjects/{subject_id}")
async def delete_subject(subject_id: str):
    global active_subject_id
    if subject_id in subjects:
        del subjects[subject_id]
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
            active_subject_id = list(subjects.keys())[0] if subjects else None
        return {"success": True, "message": f"Subject '{subject_id}' deleted."}
    raise HTTPException(status_code=404, detail="Subject not found.")

@app.post("/api/subjects/active")
async def set_active_subject(req: ActiveSubjectRequest):
    global active_subject_id
    if req.subject_id not in subjects:
        raise HTTPException(status_code=404, detail="Subject not found.")
    active_subject_id = req.subject_id
    return {"success": True, "active_subject_id": active_subject_id}

@app.get("/api/subjects/active")
async def get_active_subject():
    return {"active_subject_id": active_subject_id}

@app.get("/api/subjects/overall-analysis")
async def get_overall_analysis():
    total_subjects = len(subjects)
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
    
    for s in subjects.values():
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
            "students": state.students,
            "max_marks": state.max_marks,
            "assignment": state.assignment.model_dump() if state.assignment else None,
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
    return {
        "mappings": [m.model_dump() for m in state.co_po_mapping],
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
        po_map.run(state)
        _, report = map_val.run(state)
        save_subject_state(state)
        return {
            "mappings": [m.model_dump() for m in state.co_po_mapping],
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
    _, report = map_val.run(state)
    save_subject_state(state)
    return {
        "success": True,
        "mappings": [m.model_dump() for m in state.co_po_mapping],
        "validation": {
            "passed": report.passed,
            "issues": report.issues,
            "suggestions": report.suggestions
        }
    }

@app.post("/api/mappings/lock")
async def lock_mappings(x_subject_id: Optional[str] = Header(None)):
    """Lock the CO-PO articulation matrix to prevent further AI regeneration or manual edits."""
    state = get_subject_state(x_subject_id)
    if not state.co_po_mapping:
        raise HTTPException(status_code=400, detail="Cannot lock an empty mapping matrix. Generate the matrix first.")
    state.mapping_locked = True
    state.log("System", "mapping_lock", "CO-PO mapping matrix has been locked by faculty.")
    save_subject_state(state)
    return {"success": True, "mapping_locked": True}

@app.post("/api/mappings/unlock")
async def unlock_mappings(x_subject_id: Optional[str] = Header(None)):
    """Unlock the CO-PO articulation matrix to allow edits again."""
    state = get_subject_state(x_subject_id)
    state.mapping_locked = False
    state.log("System", "mapping_unlock", "CO-PO mapping matrix has been unlocked.")
    save_subject_state(state)
    return {"success": True, "mapping_locked": False}

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
async def generate_pi_mappings(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        # PI mapping runs independently — does NOT affect CO-PO articulation matrix
        pi_map.run(state)
        save_subject_state(state)
        return {
            "success": True,
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            # Return the existing LLM-based CO-PO matrix (unchanged)
            "mappings": [m.model_dump() for m in state.co_po_mapping]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/mappings/pi/update")
async def update_pi_mappings(req: PiMappingUpdateRequest, x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        # Only update PI mappings — CO-PO articulation matrix remains unchanged (LLM-based)
        state.pi_mappings = req.mappings
        state.log("System", "pi_mappings_update", "Manually updated PI mappings (accreditation support layer only)")
        save_subject_state(state)
        return {
            "success": True,
            "pi_mappings": [m.model_dump() for m in state.pi_mappings],
            # Return the existing LLM-based CO-PO matrix (unchanged)
            "mappings": [m.model_dump() for m in state.co_po_mapping]
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
async def upload_marks(marks_file: UploadFile = File(...), x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    ensure_pos_and_mappings(state)
    try:
        os.makedirs("data/students", exist_ok=True)
        csv_path = f"data/students/{marks_file.filename}"
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(marks_file.file, f)
            
        # Run attainment calculations
        co_att.run(state, csv_path)
        
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
            
        state.students = students_list
        state.max_marks = max_marks

        # Align CO IDs
        align_co_ids(state)

        # Run PO attainment calculations
        po_att.run(state)

        save_subject_state(state)
        return {
            "success": True,
            "co_attainment": [a.model_dump() for a in state.co_attainment],
            "po_attainment": [a.model_dump() for a in state.po_attainment],
            "students": state.students,
            "max_marks": state.max_marks
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

@app.get("/api/recommendations")
async def get_recommendations(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    return [r.model_dump() for r in state.recommendations]

@app.post("/api/recommendations/generate")
async def generate_recommendations(x_subject_id: Optional[str] = Header(None)):
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
        return [r.model_dump() for r in state.recommendations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/excel")
async def get_excel_report(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        path = reporter.run(state)
        return FileResponse(path, filename=os.path.basename(path), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/pdf")
async def get_pdf_report(x_subject_id: Optional[str] = Header(None)):
    state = get_subject_state(x_subject_id)
    try:
        os.makedirs("data/output", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        safe_name = (state.subject_name or "Course").replace(" ", "_")
        path = f"data/output/{safe_name}_MultiAgent_{timestamp}.pdf"
        
        generate_pdf_report(state, path)
        save_subject_state(state)
        return FileResponse(path, filename=os.path.basename(path), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AssignmentGenerateRequest(BaseModel):
    difficulty: str = "Medium"
    assignment_type: str = "Theory"
    num_questions_per_co: int = 3
    generate_answer_key: bool = False
    generate_rubric: bool = False

@app.post("/api/assignment/generate")
async def generate_assignment_endpoint(req: AssignmentGenerateRequest, x_subject_id: Optional[str] = Header(None)):
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
        
        prompt = f"""
Subject: {state.subject_name}
Course Outcome: {co.co_id} - {co.statement}
Program Outcome: {po.po_id} - {po.statement}

Currently, there is no mapping between this CO and PO (strength is 0 or unmapped).
Please provide:
1. A clear diagnosis of why they don't map.
2. Specific concrete changes to make (e.g. syllabus additions, practical topics, or assignments) that would justify a mapping (strength 1, 2, or 3).
3. A suggested question, assessment, or activity that directly tests this connection.

Be extremely specific, professional, and concise. Make sure your suggestions are actionable.
"""
        recommendation = call_llm(prompt=prompt, system=system, expect_json=False)
        return {"suggestion": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
