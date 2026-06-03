import json
from tools.llm_client import call_llm_json
from core.schemas import CourseOutcome
from core.state import AgentState

SYSTEM = """
You are an expert curriculum designer specializing in NBA/NAAC outcome-based education (OBE) for Computer Science and Engineering.

Your responsibilities:
- Generate measurable Course Outcomes (COs)
- Follow Bloom's Taxonomy (Levels L3 to L6 only)
- Maintain academic continuity by aligning with historical outcomes where appropriate
- Design outcomes to address/improve weak areas and gaps identified in previous year attainment analysis
- Ensure outcomes are practical, implementation-oriented, and specific to the department context (CSE Data Science)
- Return ONLY valid JSON array of objects.
"""

def run(state: AgentState, num_cos: int = 6) -> AgentState:
    state.log("COGeneratorAgent", "start", f"Generating {num_cos} COs utilizing multi-agent historical context.")

    # Reflection feedback from human-in-the-loop if available
    reflection_feedback = getattr(state, "reflection_feedback", "")

    # Retrieve context data
    topics = state.course_context_data.get("topics", [])
    skills = state.course_context_data.get("skills", [])
    summary = state.course_context_data.get("summary", "")
    
    # Historical COs text
    prev_cos_text = ""
    if state.previous_cos:
        prev_cos_text = "\n".join([f"- {co.co_id}: {co.statement} (Bloom's L{co.blooms_level})" for co in state.previous_cos])
    else:
        prev_cos_text = "No previous year outcomes provided."

    # Previous Year Attainment Analysis
    past_attainment_text = "No previous year attainment analysis available."
    if state.previous_attainment_analysis:
        weak_cos = state.previous_attainment_analysis.get("weak_cos", [])
        gaps = state.previous_attainment_analysis.get("gaps", [])
        past_attainment_text = f"Weak Outcomes to Improve: {', '.join(weak_cos) or 'None'}\nAssessment Gaps: {', '.join(gaps) or 'None'}"

    prompt = f"""
Generate exactly {num_cos} NBA-compliant Course Outcomes.

DEPARTMENT: {state.department or 'CSE (Data Science)'}
SUBJECT: {state.subject_name}
STUDY LEVEL: {state.year}

CURRENT COURSE TOPICS:
{chr(10).join(['- ' + t for t in topics])}

CURRENT COURSE SKILLS:
{chr(10).join(['- ' + s for s in skills])}

COURSE SCOPE SUMMARY:
{summary}

HISTORICAL (PREVIOUS YEAR) COURSE OUTCOMES:
{prev_cos_text}

PAST PERFORMANCE / ATTAINMENT HIGHLIGHTS:
{past_attainment_text}

ADDITIONAL REFINE INSTRUCTIONS:
{reflection_feedback}

STRICT RULES:
- Minimum Bloom's level is Level 3 (L3). Absolutely NO Level 1 or Level 2.
- Distribute across cognitive levels: L3 (Apply), L4 (Analyze), L5 (Evaluate), and L6 (Create).
- Every CO statement must begin with a strong, measurable Bloom's action verb.
- Make outcomes practical, project-centric, and implementation-oriented.
- Address weak areas: If a previous CO or topic was weak, write a new CO that strengthens learning criteria in that specific topic (e.g., adding hands-on lab projects or detailed analysis requirements).
- Preserve learning integrity while modernizing outcomes.

Allowed action verbs:
Level 3 - Apply: apply, demonstrate, implement, solve, use, execute, perform, calculate
Level 4 - Analyze: analyze, differentiate, compare, examine, break down, categorize, classify
Level 5 - Evaluate: evaluate, justify, assess, critique, defend, argue, audit
Level 6 - Create: design, create, formulate, develop, construct, build, produce, optimize

RETURN FORMAT:
Return ONLY a valid JSON array. Do not add markdown syntax or chat responses.

Example:
[
  {{
    "co_id": "CO1",
    "statement": "Apply data warehousing principles to formulate multi-dimensional schemas for predictive analysis",
    "blooms_level": 3,
    "blooms_keyword": "Apply",
    "confidence_score": 0.95
  }}
]
"""

    data = call_llm_json(prompt, SYSTEM)

    state.cos = [
        CourseOutcome(
            co_id=co.get("co_id") or f"CO{i+1}",
            statement=co.get("statement"),
            blooms_level=int(co.get("blooms_level") or 3),
            blooms_keyword=co.get("blooms_keyword") or "Apply",
            confidence_score=float(co.get("confidence_score") or 0.8)
        )
        for i, co in enumerate(data)
    ]

    # Save to unapproved list first (so side-by-side comparison works)
    state.new_generated_cos = state.cos

    state.log("COGeneratorAgent", "complete", f"Generated {len(state.cos)} Course Outcomes.")
    return state