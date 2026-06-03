from tools.llm_client import call_llm_json
from core.state import AgentState

SYSTEM = """
You are an expert academic evaluator.
Your job is to read previous year assessment documents (question papers, assignments, quizzes, lab sheets) and extract:
1. List of questions, their marks, and their alignment/mapping to historical Course Outcomes (COs).
2. Any coverage gaps (e.g. historical COs that were not assessed at all).

Return ONLY valid JSON with the following structure:
{
  "questions": [
    {
      "id": "Question ID (e.g. Q1a, Assignment 1 Q2)",
      "text": "Brief description or summary of what was asked",
      "marks": 5,
      "mapped_co": "CO ID (e.g. CO1, CO2)",
      "assessment_type": "IA Question Paper / Assignment / Quiz / Lab"
    }
  ],
  "coverage_gaps": [
    "Description of a CO that was not assessed, or had very low marks weightage"
  ]
}
"""

def run(state: AgentState, raw_assessments_text: str) -> dict:
    state.log("AssessmentAnalystAgent", "start", "Analyzing previous year assessment items")

    if not raw_assessments_text or not raw_assessments_text.strip():
        state.log("AssessmentAnalystAgent", "skip", "No raw assessment text provided.")
        state.assessment_analysis = {"questions": [], "coverage_gaps": ["No assessment evidence provided."]}
        return state.assessment_analysis

    previous_cos_text = "\n".join([
        f"{co.co_id}: {co.statement}"
        for co in state.previous_cos
    ])

    prompt = f"""
Subject: {state.subject_name}
Previous Year COs:
{previous_cos_text or "No previous COs available"}

Assessment Document Raw Text:
\"\"\"
{raw_assessments_text[:8000]}
\"\"\"

Please analyze the assessment text and map each question/item to the historical COs (CO1, CO2, etc.). Identify any COs that have no question mapped to them (coverage gaps).
"""
    try:
        data = call_llm_json(prompt, SYSTEM)
        state.assessment_analysis = data
        state.log("AssessmentAnalystAgent", "complete", f"Extracted {len(data.get('questions', []))} questions. Found {len(data.get('coverage_gaps', []))} coverage gaps.")
        return data
    except Exception as e:
        state.log("AssessmentAnalystAgent", "error", f"Failed to analyze assessments: {str(e)}")
        fallback = {
            "questions": [],
            "coverage_gaps": ["Analysis failed. Unable to map questions."]
        }
        state.assessment_analysis = fallback
        return fallback
