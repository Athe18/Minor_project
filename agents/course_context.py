from tools.llm_client import call_llm_json
from core.state import AgentState

SYSTEM = """
You are an expert academic curriculum analyst.
Your job is to read a raw course description or syllabus text and extract a structured representation of the course context.

Return ONLY valid JSON with the following structure:
{
  "topics": ["list of main subject modules or topics"],
  "skills": ["list of technical skills or core capabilities learned"],
  "prerequisites": ["list of prerequisite knowledge or courses required"],
  "summary": "A concise paragraph summarizing the course's purpose, focus, and scope."
}
"""

def run(state: AgentState) -> dict:
    state.log("CourseContextAgent", "start", "Analyzing course description and syllabus context")

    prompt = f"""
Subject Name: {state.subject_name}
Academic Year Level: {state.year}

Syllabus / Course Description Text:
\"\"\"
{state.syllabus_text[:8000]}
\"\"\"

Please analyze the syllabus above and extract key topics, expected skills, prerequisites, and a brief, professional summary.
"""
    try:
        data = call_llm_json(prompt, SYSTEM)
        state.course_context_data = data
        state.log("CourseContextAgent", "complete", f"Extracted {len(data.get('topics', []))} topics and {len(data.get('skills', []))} skills.")
        return data
    except Exception as e:
        state.log("CourseContextAgent", "error", f"Failed to extract course context: {str(e)}")
        # Fallback empty context
        fallback = {
            "topics": ["Core Syllabus Content"],
            "skills": ["General Technical Capability"],
            "prerequisites": ["Basic Mathematics"],
            "summary": "Course description loaded from syllabus document."
        }
        state.course_context_data = fallback
        return fallback
