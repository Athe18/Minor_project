from tools.llm_client import call_llm_json
from core.schemas import Recommendation
from core.state import AgentState

SYSTEM = """You are an academic improvement consultant for NBA/NAAC accreditation.
You analyze CO and PO attainment data and provide actionable, specific recommendations."""

def run(state: AgentState) -> AgentState:
    state.log("RecommendationAgent", "start", "Generating recommendations")

    weak_cos = [a for a in state.co_attainment if a.achieved_level < 2]
    weak_pos = [a for a in state.po_attainment if a.is_weak]

    weak_co_text = "\n".join([
        f"{a.co_id}: Level {a.achieved_level}, Avg {a.avg_percentage}%"
        for a in weak_cos
    ])
    weak_po_text = "\n".join([
        f"{a.po_id}: Score {a.weighted_attainment} — {a.weakness_reason}"
        for a in weak_pos
    ])

    prompt = f"""
Subject: {state.subject_name} ({state.year})

Weak CO Attainment:
{weak_co_text or "None"}

Weak PO Attainment:
{weak_po_text or "None"}

CO Statements:
{chr(10).join([f"{co.co_id}: {co.statement}" for co in state.cos])}

For each weak CO and PO, provide specific recommendations.

Return ONLY JSON array:
[
  {{
    "target": "CO3",
    "issue": "Only 35% students achieved Level 1 threshold",
    "suggestion": "Add 2 additional lab sessions focused on normalization exercises with real datasets",
    "priority": "High"
  }},
  ...
]
"""
    data = call_llm_json(prompt, SYSTEM)
    state.recommendations = [Recommendation(**r) for r in data]
    state.log("RecommendationAgent", "complete",
              f"Generated {len(state.recommendations)} recommendations")
    return state