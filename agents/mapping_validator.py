from tools.llm_client import call_llm_json
from core.schemas import ValidationReport
from core.state import AgentState

def run(state: AgentState) -> tuple[AgentState, ValidationReport]:
    state.log("MappingValidatorAgent", "start", "Validating CO-PO mappings")

    # Rule-based checks first (no LLM needed)
    issues = []
    suggestions = []

    # Check: every CO should map to at least one PO with strength >= 2
    for co in state.cos:
        strong_mappings = [
            m for m in state.co_po_mapping
            if m.co_id == co.co_id and m.strength >= 2
        ]
        if len(strong_mappings) == 0:
            issues.append(f"{co.co_id} has no strong mapping (>=2) to any PO")

    # Check: PO1 and PO2 should always have some mappings (NBA requirement)
    for critical_po in ["PO1", "PO2", "PO3"]:
        strong = [
            m for m in state.co_po_mapping
            if m.po_id == critical_po and m.strength >= 2
        ]
        if len(strong) == 0:
            issues.append(f"{critical_po} has no strong CO mappings — NBA requirement not met")
            suggestions.append(f"Ensure at least 2 COs map strongly to {critical_po}")

    # Flag low-confidence mappings
    low_conf = [m for m in state.co_po_mapping if m.confidence < 0.5 and m.strength > 0]
    if low_conf:
        issues.append(f"{len(low_conf)} mappings have low confidence scores")

    passed = len(issues) == 0
    state.log("MappingValidatorAgent", "result",
              f"Passed={passed}, Issues={len(issues)}")

    return state, ValidationReport(
        passed=passed, issues=issues,
        suggestions=suggestions, retry_required=not passed
    )