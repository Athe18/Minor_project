import json, os
from core.state import AgentState

SAVE_PATH = "data/session_state.json"

def save_state(state: AgentState):
    """Save current state to disk so you can resume if agent crashes."""
    os.makedirs("data", exist_ok=True)
    data = {
        "subject_name": state.subject_name,
        "year": state.year,
        "cos": [co.model_dump() for co in state.cos],
        "pos": [po.model_dump() for po in state.pos],
        "co_po_mapping": [m.model_dump() for m in state.co_po_mapping],
        "teaching_philosophy": state.teaching_philosophy,
        "co_attainment": [a.model_dump() for a in state.co_attainment],
        "po_attainment": [a.model_dump() for a in state.po_attainment],
        "recommendations": [r.model_dump() for r in state.recommendations],
        "retry_counts": state.retry_counts,
    }
    with open(SAVE_PATH, "w") as f:
        json.dump(data, f, indent=2)

def load_state(state: AgentState) -> AgentState:
    """Resume from a saved session."""
    from core.schemas import (CourseOutcome, ProgramOutcome, MappingEntry,
                               COAttainment, POAttainment, Recommendation)
    if not os.path.exists(SAVE_PATH):
        return state
    with open(SAVE_PATH) as f:
        data = json.load(f)
    state.subject_name = data.get("subject_name", "")
    state.year = data.get("year", "")
    state.cos = [CourseOutcome(**c) for c in data.get("cos", [])]
    state.pos = [ProgramOutcome(**p) for p in data.get("pos", [])]
    state.co_po_mapping = [MappingEntry(**m) for m in data.get("co_po_mapping", [])]
    state.teaching_philosophy = data.get("teaching_philosophy", "")
    state.co_attainment = [COAttainment(**a) for a in data.get("co_attainment", [])]
    state.po_attainment = [POAttainment(**a) for a in data.get("po_attainment", [])]
    state.recommendations = [Recommendation(**r) for r in data.get("recommendations", [])]
    state.retry_counts = data.get("retry_counts", {})
    return state