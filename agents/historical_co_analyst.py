from tools.llm_client import call_llm_json
from core.schemas import CourseOutcome
from core.state import AgentState

SYSTEM = """
You are an expert curriculum design reviewer.
Your job is to read raw text describing a set of Course Outcomes (COs) from a previous year, parse them, and return a structured JSON list of outcomes.

For each Course Outcome, identify:
- co_id: (e.g., "CO1", "CO2")
- statement: The outcome statement itself.
- blooms_level: Cognitive level (1 to 6).
- blooms_keyword: Action verb keyword (e.g. "Apply", "Analyze", "Evaluate").

Return ONLY valid JSON array of objects like:
[
  {
    "co_id": "CO1",
    "statement": "Apply SQL commands to create database schemas.",
    "blooms_level": 3,
    "blooms_keyword": "Apply"
  }
]
"""

def run(state: AgentState) -> list[CourseOutcome]:
    state.log("HistoricalCOAnalystAgent", "start", "Analyzing previous year Course Outcomes")

    if not state.previous_cos_raw or not state.previous_cos_raw.strip():
        state.log("HistoricalCOAnalystAgent", "skip", "No historical CO raw content provided.")
        state.previous_cos = []
        return []

    prompt = f"""
Previous Year's Course Outcomes (Raw Text):
\"\"\"
{state.previous_cos_raw}
\"\"\"

Please parse this text and extract all listed Course Outcomes into the requested JSON structure.
"""
    try:
        data = call_llm_json(prompt, SYSTEM)
        
        parsed_cos = []
        for index, item in enumerate(data):
            co_id = item.get("co_id") or f"CO{index + 1}"
            statement = item.get("statement") or ""
            blooms_level = int(item.get("blooms_level") or 3)
            blooms_keyword = item.get("blooms_keyword") or "Apply"
            
            parsed_cos.append(CourseOutcome(
                co_id=co_id,
                statement=statement,
                blooms_level=blooms_level,
                blooms_keyword=blooms_keyword,
                validation_status="approved"  # Historical ones are pre-approved
            ))
            
        state.previous_cos = parsed_cos
        state.log("HistoricalCOAnalystAgent", "complete", f"Successfully parsed {len(parsed_cos)} previous COs.")
        return parsed_cos
    except Exception as e:
        state.log("HistoricalCOAnalystAgent", "error", f"Failed to parse historical COs: {str(e)}")
        state.previous_cos = []
        return []
