from pydantic import BaseModel
from typing import Optional

class CourseOutcome(BaseModel):
    co_id: str
    statement: str
    blooms_level: int
    blooms_keyword: str
    confidence_score: float = 0.0
    validation_status: str = "pending"  # pending/approved/rejected
    rejection_reason: Optional[str] = None

class ProgramOutcome(BaseModel):
    po_id: str
    statement: str

class MappingEntry(BaseModel):
    co_id: str
    po_id: str
    strength: int           # 0, 1, 2, 3
    reasoning: str          # WHY this strength was assigned
    confidence: float = 0.0
    validated: bool = False

class COAttainment(BaseModel):
    co_id: str
    avg_percentage: float
    level_1_students_pct: float
    level_2_students_pct: float
    level_3_students_pct: float
    achieved_level: int
    threshold_used: dict

class POAttainment(BaseModel):
    po_id: str
    weighted_attainment: float
    contributing_cos: list[str]
    is_weak: bool
    weakness_reason: Optional[str] = None

class Recommendation(BaseModel):
    target: str             # CO or PO id
    issue: str
    suggestion: str
    priority: str           # High / Medium / Low

class ValidationReport(BaseModel):
    passed: bool
    issues: list[str]
    suggestions: list[str]
    retry_required: bool

class AssignmentQuestion(BaseModel):
    id: str                 # e.g., "1(a)" or "Q1"
    question_text: str
    question_type: str       # "short", "descriptive", "application"
    blooms_level: int
    marks: int
    co_id: str
    answer_key: Optional[str] = None
    rubric: Optional[str] = None

class AssignmentSection(BaseModel):
    section_name: str       # e.g., "Section A"
    co_id: str
    co_statement: str
    blooms_level: int
    questions: list[AssignmentQuestion]

class Assignment(BaseModel):
    college_header: str = "MIT ACADEMY OF ENGINEERING, ALANDI"
    subject_name: str
    title: str
    academic_year: str
    instructions: list[str]
    sections: list[AssignmentSection]
    difficulty: str         # Easy / Medium / Hard
    assignment_type: str    # Theory / Practical / Mixed

class PerformanceIndicator(BaseModel):
    po_id: str
    competency_id: str
    competency_statement: str
    pi_id: str
    pi_statement: str

class PIMappingEntry(BaseModel):
    co_id: str
    pi_id: str
    mapped: str             # "Y" or "N"
    reasoning: Optional[str] = ""
    suggestion: Optional[str] = ""