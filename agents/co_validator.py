from tools.llm_client import call_llm_json
from core.schemas import ValidationReport
from core.state import AgentState

MAX_RETRIES = 3

SYSTEM = """You are a strict academic quality controller for NBA accreditation.
Your job is to critically evaluate Course Outcomes and reject poor quality ones."""

def run(state: AgentState) -> tuple[AgentState, ValidationReport]:
    state.log("COValidatorAgent", "start", "Validating COs")

    cos_text = "\n".join([
        f"{co.co_id} (Bloom's L{co.blooms_level}): {co.statement}"
        for co in state.cos
    ])

    prompt = f"""
Critically evaluate these Course Outcomes for subject "{state.subject_name}":

{cos_text}

Check for:
1. Bloom's taxonomy coverage (all 6 levels should be covered)
2. Duplicate or overlapping COs
3. Vague or non-measurable statements
4. Missing action verbs
5. Overall quality and relevance

Return ONLY JSON:
{{
  "passed": true/false,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"],
  "retry_required": true/false,
  "co_feedback": {{
    "CO1": {{"status": "approved/rejected", "reason": "..."}},
    ...
  }}
}}
"""
    data = call_llm_json(prompt, SYSTEM)

    report = ValidationReport(
        passed=data["passed"],
        issues=data.get("issues", []),
        suggestions=data.get("suggestions", []),
        retry_required=data.get("retry_required", False)
    )

    # Update individual CO statuses
    for co in state.cos:
        feedback = data.get("co_feedback", {}).get(co.co_id, {})
        co.validation_status = feedback.get("status", "approved")
        co.rejection_reason = feedback.get("reason")

    state.log("COValidatorAgent", "result",
              f"Passed={report.passed}, Issues={len(report.issues)}")
    return state, report