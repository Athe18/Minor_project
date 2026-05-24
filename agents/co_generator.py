import json
from tools.llm_client import call_llm_json
from core.schemas import CourseOutcome
from core.state import AgentState

SYSTEM = """
You are an expert curriculum designer specializing in
NBA/NAAC outcome-based education.

Your responsibilities:
- Generate measurable Course Outcomes
- Follow Bloom's Taxonomy
- Ensure NBA compliance
- Avoid vague statements
- Avoid overlapping COs
- Make outcomes practical and implementation-oriented

Return ONLY valid JSON.
"""


def run(state: AgentState, num_cos: int = 6) -> AgentState:

    state.log(
        "COGeneratorAgent",
        "start",
        f"Generating {num_cos} COs"
    )

    # Reflection feedback from human-in-loop
    reflection_feedback = getattr(state, "reflection_feedback", "")

    prompt = f"""
Generate exactly {num_cos} NBA-compliant Course Outcomes.

SUBJECT:
{state.subject_name}

SYLLABUS:
{state.syllabus_text[:4000]}

ADDITIONAL IMPROVEMENT INSTRUCTIONS:
{reflection_feedback}

STRICT RULES:
- Minimum Bloom's level is Level 3
- Absolutely NO Level 1 or Level 2
- Distribute across levels 3, 4, 5, and 6
- Every CO must start with a Bloom's action verb
- COs must be measurable
- COs must be non-overlapping
- Avoid generic wording
- Ensure practical applicability
- Ensure implementation-oriented outcomes

Allowed verbs only:

Level 3 - Apply:
apply, demonstrate, implement, solve, use, execute, perform

Level 4 - Analyze:
analyze, differentiate, compare, examine, break down, categorize

Level 5 - Evaluate:
evaluate, justify, assess, critique, defend, argue

Level 6 - Create:
design, create, formulate, develop, construct, build, produce

RETURN FORMAT:
Return ONLY valid JSON array.

Example:
[
  {{
    "co_id": "CO1",
    "statement": "Apply normalization techniques to design an efficient relational schema",
    "blooms_level": 3,
    "blooms_keyword": "Apply",
    "confidence_score": 0.92
  }}
]
"""

    data = call_llm_json(prompt, SYSTEM)

    state.cos = [
        CourseOutcome(**co)
        for co in data
    ]

    # Save version history
    if not hasattr(state, "co_versions"):
        state["co_versions"] = []

    state.co_versions.append(data)

    state.log(
        "COGeneratorAgent",
        "complete",
        f"Generated {len(state.cos)} COs"
    )

    return state