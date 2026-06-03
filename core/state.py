from typing import Optional
from core.schemas import *
import json
import os
from datetime import datetime


class AgentState:
    """
    Central shared state object passed between all agents.
    Acts as the memory/context of the entire pipeline.
    """

    def __init__(self):

        # =====================================================
        # BASIC COURSE INFO
        # =====================================================

        self.subject_name: str = ""
        self.year: str = ""
        self.syllabus_text: str = ""
        self.department: str = ""
        self.vision_mission: str = ""
        self.performance_indicators: list[PerformanceIndicator] = []
        self.pi_mappings: list[PIMappingEntry] = []

        # =====================================================
        # GENERATED COs + POs
        # =====================================================

        self.cos: list[CourseOutcome] = []
        self.pos: list[ProgramOutcome] = []
        self.assignment: Optional[Assignment] = None

        # =====================================================
        # CO-PO MAPPING
        # =====================================================

        self.co_po_mapping: list[MappingEntry] = []
        # When True: matrix is frozen — AI regeneration and manual edits are blocked
        self.mapping_locked: bool = False

        # =====================================================
        # ATTAINMENT
        # =====================================================

        self.co_attainment: list[COAttainment] = []
        self.po_attainment: list[POAttainment] = []

        # =====================================================
        # DYNAMIC THRESHOLDS
        # =====================================================

        # Individual threshold values

        self.level1_threshold: float = 55.0
        self.level2_threshold: float = 65.0
        self.level3_threshold: float = 75.0

        # Dictionary format used by attainment agent

        self.attainment_thresholds = {
            1: self.level1_threshold,
            2: self.level2_threshold,
            3: self.level3_threshold
        }

        # =====================================================
        # TEACHING PHILOSOPHY
        # =====================================================

        self.teaching_philosophy: str = ""

        # =====================================================
        # AI RECOMMENDATIONS
        # =====================================================

        self.recommendations: list[Recommendation] = []

        # =====================================================
        # AUDIT + RETRIES
        # =====================================================

        self.audit_trail: list[dict] = []

        self.retry_counts: dict = {}

        # =====================================================
        # VERSION TRACKING
        # =====================================================

        # Stores all CO versions
        self.co_versions: list = []

        # Stores all mapping versions
        self.mapping_versions: list = []

        # =====================================================
        # REFLECTION MEMORY
        # =====================================================

        # Reflection feedback for CO generation
        self.reflection_feedback: str = ""

        # Reflection feedback for mapping
        self.mapping_reflection: str = ""

        # =====================================================
        # VALIDATION MEMORY
        # =====================================================

        # CO validation issues
        self.co_validation_feedback: str = ""

        # Mapping validation issues
        self.mapping_validation_feedback: str = ""

        # =====================================================
        # REPORT CUSTOMIZATION
        # =====================================================

        self.excel_customization: str = ""

        # =====================================================
        # STUDENT MARKS ROSTER & METRICS
        # =====================================================
        self.students: list = []
        self.max_marks: dict = {}
        self.ia_students: list = []
        self.ia_max_marks: dict = {}
        self.mse_students: list = []
        self.mse_max_marks: dict = {}
        self.ese_students: list = []
        self.ese_max_marks: dict = {}

        # =====================================================
        # REDESIGNED CO WORKFLOW STATE
        # =====================================================
        self.semester: str = ""
        self.course_description_option: str = ""  # "pdf", "txt", "typed"
        self.course_description_text: str = ""
        self.course_context_data: dict = {}       # topics, skills, prerequisites, summary
        self.previous_cos_option: str = ""        # "upload", "paste", "skip"
        self.previous_cos_raw: str = ""           # raw previous CO text
        self.previous_cos: list[CourseOutcome] = []  # parsed previous COs
        self.previous_attainment_analysis: dict = {} # calculated/qualitative past analysis
        self.assessment_analysis: dict = {}        # parsed IA/Assignment question mappings
        self.new_generated_cos: list[CourseOutcome] = [] # unapproved generated outcomes

    # =========================================================
    # LOGGING
    # =========================================================

    def log(
        self,
        agent: str,
        action: str,
        detail: str
    ):

        """
        Every agent action is logged
        for explainability and audit trail.
        """

        entry = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent,
            "action": action,
            "detail": detail
        }

        self.audit_trail.append(entry)

        # Save to audit file
        try:
            os.makedirs("logs", exist_ok=True)
            with open(
                "logs/audit_trail.jsonl",
                "a"
            ) as f:
                f.write(
                    json.dumps(entry) + "\n"
                )
        except Exception:
            pass  # Non-critical: audit file write failure should not crash the app

    # =========================================================
    # RETRY TRACKER
    # =========================================================

    def increment_retry(
        self,
        agent: str
    ) -> int:

        self.retry_counts[agent] = (
            self.retry_counts.get(agent, 0) + 1
        )

        return self.retry_counts[agent]

    # =========================================================
    # HELPER METHODS
    # =========================================================

    def get_co_by_id(
        self,
        co_id: str
    ) -> Optional[CourseOutcome]:

        return next(
            (
                co
                for co in self.cos
                if co.co_id == co_id
            ),
            None
        )

    def get_po_by_id(
        self,
        po_id: str
    ) -> Optional[ProgramOutcome]:

        return next(
            (
                po
                for po in self.pos
                if po.po_id == po_id
            ),
            None
        )

    # =========================================================
    # UPDATE THRESHOLDS
    # =========================================================

    def update_thresholds(
        self,
        level1,
        level2,
        level3
    ):

        self.level1_threshold = level1
        self.level2_threshold = level2
        self.level3_threshold = level3

        self.attainment_thresholds = {
            1: level1,
            2: level2,
            3: level3
        }

    # =========================================================
    # THRESHOLD DISPLAY
    # =========================================================

    def get_thresholds(self):

        return {
            "Level 1": self.level1_threshold,
            "Level 2": self.level2_threshold,
            "Level 3": self.level3_threshold
        }

    # =========================================================
    # DEBUG / STATE SUMMARY
    # =========================================================

    def summary(self):

        return {
            "subject_name": self.subject_name,
            "year": self.year,
            "total_cos": len(self.cos),
            "total_pos": len(self.pos),
            "total_mappings": len(self.co_po_mapping),
            "co_attainment_count": len(self.co_attainment),
            "po_attainment_count": len(self.po_attainment),
            "recommendation_count": len(self.recommendations),
            "total_students": len(self.students)
        }