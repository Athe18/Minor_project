import json
from tools.llm_client import call_llm_json, call_llm
from core.schemas import Assignment, AssignmentSection, AssignmentQuestion
from core.state import AgentState

SYSTEM = """
You are an expert university professor and curriculum evaluator specializing in Outcome-Based Education (OBE) and NBA compliance.
Your task is to generate high-quality, university-level assignment questions that map precisely to a specific Course Outcome (CO) and its Bloom's Taxonomy level.
You must return ONLY a valid JSON array of question objects. No markdown, no extra text, no explanations.
"""

def _generate_section(
    subject_name: str,
    syllabus_text: str,
    co,
    section_name: str,
    difficulty: str,
    assignment_type: str,
    num_questions: int,
    generate_answer_key: bool,
    generate_rubric: bool
) -> list:
    """Generate questions for a single CO section. Returns a list of question dicts."""

    if difficulty == "Easy":
        marks_guide = "Short questions: 2 marks, Descriptive: 5 marks."
    elif difficulty == "Medium":
        marks_guide = "Short: 2-3 marks, Descriptive: 5-6 marks, Application: 8 marks."
    else:
        marks_guide = "Short: 3 marks, Descriptive: 7-8 marks, Application: 10 marks."

    if assignment_type == "Theory":
        type_guide = "Generate conceptual, descriptive, and explanatory questions."
    elif assignment_type == "Practical":
        type_guide = "Generate implementation tasks, code writing, and hands-on questions."
    else:
        type_guide = "Mix short conceptual questions with implementation/application questions."

    prompt = f"""
Generate exactly {num_questions} university-level exam questions for the following Course Outcome (CO).

COURSE: {subject_name}
SYLLABUS REFERENCE:
{syllabus_text[:2500]}

TARGET COURSE OUTCOME:
- CO ID: {co.co_id}
- Statement: {co.statement}
- Bloom's Level: L{co.blooms_level} ({co.blooms_keyword})

CONFIGURATION:
- Difficulty: {difficulty} — {marks_guide}
- Type: {assignment_type} — {type_guide}
- Answer Key Required: {generate_answer_key}
- Rubric Required: {generate_rubric}

RULES:
1. All questions MUST directly test the CO: "{co.statement}"
2. Questions must match Bloom's Level L{co.blooms_level} ({co.blooms_keyword})
3. Vary question types: "short", "descriptive", "application"
4. If Answer Key is false, set "answer_key" to null
5. If Rubric is false, set "rubric" to null
6. Number questions as {co.co_id}_Q1, {co.co_id}_Q2, etc.

RETURN FORMAT — a JSON array only:
[
  {{
    "id": "{co.co_id}_Q1",
    "question_text": "Question here?",
    "question_type": "short",
    "blooms_level": {co.blooms_level},
    "marks": 3,
    "co_id": "{co.co_id}",
    "answer_key": null,
    "rubric": null
  }}
]

Return ONLY the JSON array. No markdown, no backticks, no explanation.
"""

    try:
        data = call_llm_json(prompt, SYSTEM, temperature=0)
        if isinstance(data, list):
            return data
        # If LLM returned a dict with a list inside, try to extract it
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, list):
                    return v
    except Exception as e:
        print(f"Error generating questions for {co.co_id}: {e}")

    # Fallback: return a minimal placeholder question
    return [
        {
            "id": f"{co.co_id}_Q{i+1}",
            "question_text": f"Explain the concept related to {co.statement}.",
            "question_type": "descriptive",
            "blooms_level": co.blooms_level,
            "marks": 5,
            "co_id": co.co_id,
            "answer_key": None,
            "rubric": None
        }
        for i in range(num_questions)
    ]


def run(
    state: AgentState,
    difficulty: str = "Medium",
    assignment_type: str = "Theory",
    num_questions_per_co: int = 3,
    generate_answer_key: bool = False,
    generate_rubric: bool = False
) -> AgentState:
    
    state.log(
        "AssignmentGeneratorAgent",
        "start",
        f"Generating assignment (difficulty={difficulty}, type={assignment_type}, questions_per_co={num_questions_per_co}, answers={generate_answer_key}, rubrics={generate_rubric})"
    )

    if not state.cos:
        raise ValueError("No Course Outcomes (COs) found in the course state. Please generate and approve COs first.")

    # Filter approved COs, fallback to all if none approved
    target_cos = [co for co in state.cos if co.validation_status == "approved"]
    if not target_cos:
        target_cos = state.cos

    # Define instructions based on assignment type
    if assignment_type == "Theory":
        instructions = [
            "All questions are compulsory.",
            "Figures to the right indicate full marks.",
            "Make neat diagrams/sketches wherever necessary.",
            "Assume suitable data if required."
        ]
    elif assignment_type == "Practical":
        instructions = [
            "Implementation should be done in the lab environment.",
            "Submit the code, output screenshots, and write-up in PDF format.",
            "Viva-voce will be conducted based on the implementation.",
            "Code optimization and styling will be graded."
        ]
    else:
        instructions = [
            "All sections are compulsory.",
            "Theoretical explanations should be backed by neat diagrams.",
            "Implementations must be verified on terminal/compiler.",
            "Figures to the right indicate full marks."
        ]

    section_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    sections = []

    # Generate questions CO-by-CO to keep prompts manageable
    for idx, co in enumerate(target_cos):
        section_name = f"Section {section_letters[idx]}"
        
        questions_raw = _generate_section(
            subject_name=state.subject_name,
            syllabus_text=state.syllabus_text,
            co=co,
            section_name=section_name,
            difficulty=difficulty,
            assignment_type=assignment_type,
            num_questions=num_questions_per_co,
            generate_answer_key=generate_answer_key,
            generate_rubric=generate_rubric
        )

        # Build validated question objects
        questions = []
        for q_idx, q in enumerate(questions_raw[:num_questions_per_co]):
            try:
                question = AssignmentQuestion(
                    id=q.get("id", f"{co.co_id}_Q{q_idx+1}"),
                    question_text=q.get("question_text", ""),
                    question_type=q.get("question_type", "descriptive"),
                    blooms_level=int(q.get("blooms_level", co.blooms_level)),
                    marks=int(q.get("marks", 5)),
                    co_id=q.get("co_id", co.co_id),
                    answer_key=q.get("answer_key") or None,
                    rubric=q.get("rubric") or None
                )
                questions.append(question)
            except Exception as e:
                print(f"Skipping malformed question for {co.co_id}: {e}")

        # Pad with fallback if we got fewer questions than requested
        while len(questions) < num_questions_per_co:
            q_idx = len(questions)
            questions.append(AssignmentQuestion(
                id=f"{co.co_id}_Q{q_idx+1}",
                question_text=f"Describe and illustrate the concept related to: {co.statement}.",
                question_type="descriptive",
                blooms_level=co.blooms_level,
                marks=5,
                co_id=co.co_id,
                answer_key=None,
                rubric=None
            ))

        section = AssignmentSection(
            section_name=section_name,
            co_id=co.co_id,
            co_statement=co.statement,
            blooms_level=co.blooms_level,
            questions=questions
        )
        sections.append(section)

    assignment = Assignment(
        college_header="MIT ACADEMY OF ENGINEERING, ALANDI",
        subject_name=state.subject_name,
        title="Course Outcome-Based Assignment",
        academic_year="AY 2025-26",
        instructions=instructions,
        sections=sections,
        difficulty=difficulty,
        assignment_type=assignment_type
    )

    state.assignment = assignment

    state.log(
        "AssignmentGeneratorAgent",
        "complete",
        f"Generated assignment with {len(assignment.sections)} sections and {sum(len(s.questions) for s in assignment.sections)} total questions"
    )

    return state
