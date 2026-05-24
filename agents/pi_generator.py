import json
from tools.llm_client import call_llm_json
from core.schemas import PerformanceIndicator
from core.state import AgentState
from core.default_pis import get_default_pis

SYSTEM = """
You are an NBA accreditation expert specializing in Outcome-Based Education (OBE).
Your task is to customize and refine a list of competencies and Performance Indicators (PIs) for an academic department, aligning them with the department's Vision & Mission.

STRICT RULES:
- Return ONLY a valid JSON array of objects.
- Each object must have: po_id, competency_id, competency_statement, pi_id, pi_statement.
- Maintain the same IDs (po_id, competency_id, pi_id) as provided in the default template.
- Do not output any conversational text or markdown blocks, only the JSON.
"""

def run(state: AgentState) -> AgentState:
    state.log(
        "PIGeneratorAgent",
        "start",
        f"Generating/customizing Program Indicators for department: {state.department}"
    )

    # 1. Load default template for the department
    defaults = get_default_pis(state.department)
    
    # If no custom vision/mission is uploaded/entered, we can use the defaults directly
    if not state.vision_mission.strip():
        state.performance_indicators = [PerformanceIndicator(**pi) for pi in defaults]
        state.log(
            "PIGeneratorAgent",
            "complete",
            f"Loaded {len(state.performance_indicators)} default indicators (no custom Vision & Mission provided)."
        )
        return state

    # 2. Call LLM to customize the indicators to fit the department's Vision & Mission
    prompt = f"""
Customize the following default competencies and Performance Indicators (PIs) to align with the Vision and Mission of the {state.department}.

DEPARTMENT VISION & MISSION:
{state.vision_mission}

DEFAULT TEMPLATE LIST:
{json.dumps(defaults, indent=2)}

INSTRUCTIONS:
1. For each entry, keep the same `po_id`, `competency_id`, and `pi_id`.
2. Refine the `competency_statement` and `pi_statement` to reflect the specific context of the department (e.g. software architectures for computer engineering, processes for chemical engineering, structural systems for civil, etc.) and reference concepts or values from the Vision & Mission where relevant.
3. Ensure all indicators remain specific, measurable, and action-oriented.
4. Keep the same array length (do not omit or add POs).

Return ONLY the customized JSON array of objects.
"""

    try:
        data = call_llm_json(prompt, SYSTEM)
        state.performance_indicators = [
            PerformanceIndicator(**pi)
            for pi in data
        ]
        state.log(
            "PIGeneratorAgent",
            "complete",
            f"Successfully customized {len(state.performance_indicators)} indicators using LLM."
        )
    except Exception as e:
        print(f"Error generating customized PIs: {e}. Falling back to default PIs.")
        state.performance_indicators = [PerformanceIndicator(**pi) for pi in defaults]
        state.log(
            "PIGeneratorAgent",
            "fallback",
            "Customization failed; fell back to default program indicators."
        )
        
    return state
