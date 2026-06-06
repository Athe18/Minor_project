import json
from datetime import datetime
from typing import Dict, Any
import core.database as database
import agents.co_attainment as co_att
import agents.po_attainment as po_att
from core.state import AgentState

# Global job states dictionary to track background jobs
# Format: {subject_name: {"status": "idle" | "processing" | "completed" | "failed", "progress": int, "error": str}}
job_states: Dict[tuple, Dict[str, Any]] = {}

def get_job_status(subject_name: str, user_id: int) -> Dict[str, Any]:
    """Retrieves the background job status for a subject and user, defaulting to idle."""
    return job_states.get((subject_name, user_id), {"status": "idle", "progress": 0})

def queue_attainment_recalculation(state: AgentState, subject_name: str, user_id: int, background_tasks):
    """
    Sets job status to 'processing' and schedules the recalculation task.
    """
    job_states[(subject_name, user_id)] = {
        "status": "processing",
        "progress": 10,
        "started_at": datetime.utcnow().isoformat()
    }
    background_tasks.add_task(process_attainment, state, subject_name, user_id)

def process_attainment(state: AgentState, subject_name: str, user_id: int):
    """
    Asynchronous runner for recalculating attainment in the background.
    """
    try:
        # Resolve subject_id for audit logs
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE subject_name = %s", (subject_name,))
        row = cursor.fetchone()
        subject_id = row[0] if row else None
        cursor.close()
        conn.close()

        # Log ATTAINMENT_STARTED
        database.log_audit_action(
            "ATTAINMENT_STARTED",
            "attainment",
            None,
            {"subject_name": subject_name, "message": "Background attainment calculation started"},
            user_id,
            subject_id
        )

        job_states[(subject_name, user_id)]["progress"] = 30

        # Recalculate CO Attainment
        co_att.recalculate_attainment(state)
        job_states[(subject_name, user_id)]["progress"] = 60

        # Recalculate PO Attainment
        po_att.run(state)
        job_states[(subject_name, user_id)]["progress"] = 80

        # Save state to DB
        # This calls the db serializer via server's save function
        # To avoid importing save_subject_state from server (circular dependency),
        # we serialize and save it directly using database.save_subject_state
        state_data = {
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
        database.save_subject_state(state.subject_name, state.year, state_data, user_id)

        # Log ATTAINMENT_COMPLETED
        database.log_audit_action(
            "ATTAINMENT_COMPLETED",
            "attainment",
            None,
            {"subject_name": subject_name, "message": "Background attainment calculation completed successfully"},
            user_id,
            subject_id
        )

        job_states[(subject_name, user_id)].update({
            "status": "completed",
            "progress": 100,
            "completed_at": datetime.utcnow().isoformat()
        })
    except Exception as e:
        import traceback
        err_msg = str(e)
        stack = traceback.format_exc()
        print(f"Error in background recalculation for {subject_name}: {err_msg}\n{stack}")
        
        job_states[(subject_name, user_id)].update({
            "status": "failed",
            "progress": 100,
            "error": err_msg,
            "failed_at": datetime.utcnow().isoformat()
        })
