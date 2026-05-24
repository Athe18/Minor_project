from tools.llm_client import call_llm
from core.state import AgentState

SYSTEM = """You are an academic curriculum expert writing teaching philosophies
for NBA/NAAC accreditation documents."""

def run(state: AgentState) -> AgentState:
    state.log("TeachingPhilosophyAgent", "start", "Generating teaching philosophy")

    cos_text = "\n".join([
        f"{co.co_id} (Bloom's L{co.blooms_level} - {co.blooms_keyword}): {co.statement}"
        for co in state.cos
    ])

    prompt = f"""
Write a professional teaching philosophy (150-200 words) for the subject "{state.subject_name}".

Based on these Course Outcomes:
{cos_text}

The philosophy must mention:
- Pedagogical approaches (lectures, labs, case studies, projects)
- How each CO level will be achieved
- Assessment strategies aligned to Bloom's levels
- Student-centered learning approach
- Feedback and improvement mechanisms

Return plain paragraph text only. No bullet points, no headings.
"""
    state.teaching_philosophy = call_llm(prompt, SYSTEM, expect_json=False)
    state.log("TeachingPhilosophyAgent", "complete", "Teaching philosophy generated")
    return state