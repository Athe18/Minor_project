import pandas as pd
import json
from tools.llm_client import call_llm_json
from core.state import AgentState

SYSTEM = """
You are an outcome-based education data scientist.
Your job is to analyze previous year course outcome attainment data and identify:
1. Attainment percentage for each CO.
2. Attainment level (1, 2, or 3) for each PO based on mappings.
3. Weak COs (attainment below target/threshold).
4. Strong COs (attainment above target/threshold).
5. Gaps in assessment coverage.

Return ONLY valid JSON with this structure:
{
  "co_attainment": {
    "CO1": {"percentage": 75.0, "achieved_level": 3, "status": "strong/weak"}
  },
  "po_attainment": {
    "PO1": {"value": 2.2, "status": "strong/weak"}
  },
  "weak_cos": ["list of weak CO IDs"],
  "strong_cos": ["list of strong CO IDs"],
  "gaps": ["list of assessment or coverage gaps"]
}
"""

def calculate_quantitative_attainment(state: AgentState, csv_path: str) -> dict:
    """Calculates CO and PO attainment from a student marks CSV file."""
    try:
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Detect roll column
        possible_roll = ["roll_no", "rollno", "roll number", "student_id", "studentid", "enrollment_no"]
        roll_col = next((c for c in possible_roll if c in df.columns), None) or df.columns[0]
        
        # Max row detection
        max_rows = df[df[roll_col].astype(str).str.strip().str.upper().str.startswith("MAX")]
        if len(max_rows) == 0:
            print("MAX marks row not found in CSV. Guessing max marks per column...")
            students = df.copy()
            # Synthesize a fallback max_row based on column values
            fallback_max = {}
            for col in df.columns:
                if col.upper().startswith("CO"):
                    try:
                        col_max = df[col].astype(float).max()
                        if col_max <= 10:
                            fallback_max[col] = 10.0
                        elif col_max <= 20:
                            fallback_max[col] = 20.0
                        elif col_max <= 55:
                            fallback_max[col] = 50.0
                        else:
                            fallback_max[col] = 100.0
                    except Exception:
                        fallback_max[col] = 100.0
            max_row = fallback_max
        else:
            max_row = max_rows.iloc[0]
            # Exclude max rows from student marks roster
            students = df[~df[roll_col].astype(str).str.strip().str.upper().str.startswith("MAX")].copy()
        
        co_cols = [c for c in df.columns if c.upper().startswith("CO")]
        if not co_cols:
            raise ValueError("No CO marks columns found in CSV.")
            
        thresholds = {
            1: state.level1_threshold,
            2: state.level2_threshold,
            3: state.level3_threshold
        }
        
        co_attainment = {}
        weak_cos = []
        strong_cos = []
        
        for col in co_cols:
            co_id = col.upper()
            co_obj = next((c for c in state.cos if c.co_id == co_id), None)
            target_attainment = co_obj.target_attainment if co_obj else state.level1_threshold
            
            co_thresholds = {
                1: target_attainment,
                2: target_attainment + (state.level2_threshold - state.level1_threshold),
                3: target_attainment + (state.level3_threshold - state.level1_threshold)
            }
            
            max_mark = float(max_row[col])
            scores = (students[col].astype(float) / max_mark) * 100
            
            avg_pct = float(round(scores.mean(), 2))
            level1_pct = (scores >= co_thresholds[1]).sum() / len(scores) * 100 if len(scores) > 0 else 0.0
            level2_pct = (scores >= co_thresholds[2]).sum() / len(scores) * 100 if len(scores) > 0 else 0.0
            level3_pct = (scores >= co_thresholds[3]).sum() / len(scores) * 100 if len(scores) > 0 else 0.0
            
            achieved = 0
            if level3_pct >= 50:
                achieved = 3
            elif level2_pct >= 50:
                achieved = 2
            elif level1_pct >= 50:
                achieved = 1
                
            status = "weak" if achieved < 2 else "strong"
            if status == "weak":
                weak_cos.append(co_id)
            else:
                strong_cos.append(co_id)
                
            co_attainment[co_id] = {
                "percentage": avg_pct,
                "achieved_level": achieved,
                "status": status
            }
            
        # Compute heuristic PO attainments
        po_attainment = {}
        # Assume PO1 to PO12
        for po_idx in range(1, 13):
            po_id = f"PO{po_idx}"
            # Average of achieved levels of contributing COs (heuristic mapping)
            levels = [val["achieved_level"] for val in co_attainment.values()]
            avg_val = round(sum(levels) / len(levels), 2) if levels else 0.0
            po_attainment[po_id] = {
                "value": avg_val,
                "status": "weak" if avg_val < 1.5 else "strong"
            }
            
        return {
            "co_attainment": co_attainment,
            "po_attainment": po_attainment,
            "weak_cos": weak_cos,
            "strong_cos": strong_cos,
            "gaps": []
        }
    except Exception as e:
        print(f"Error calculating quantitative attainment: {e}")
        return {}

def run(state: AgentState, marks_csv_path: str = None, uploaded_files: list = None) -> dict:
    state.log("AttainmentAnalystAgent", "start", "Running attainment analysis")
    
    validation_errors = []
    
    # 1. Python-based checks
    has_papers = False
    has_marks = False
    if uploaded_files:
        has_papers = any(f["type"] != "student_marks" for f in uploaded_files)
        has_marks = any(f["type"] == "student_marks" for f in uploaded_files)
        
    if has_papers and not has_marks:
        validation_errors.append("Question paper(s) uploaded, but student marks CSV is missing. Attainment analysis requires both.")
    
    # 2. Try quantitative attainment first if student marks are uploaded
    analysis = {}
    if marks_csv_path:
        analysis = calculate_quantitative_attainment(state, marks_csv_path)
        
    # 3. Integrate qualitative gap and coverage context if quantitative results are missing/incomplete
    co_list_text = "\n".join([f"{co.co_id}: {co.statement}" for co in state.previous_cos])
    q_text = ""
    if state.assessment_analysis:
        questions = state.assessment_analysis.get("questions", [])
        q_text = json.dumps(questions[:15])
        coverage_gaps = state.assessment_analysis.get("coverage_gaps", [])
    else:
        coverage_gaps = ["No assessment mapping data available."]
        
    files_list_str = ""
    if uploaded_files:
        files_list_str = "\n".join([
            f"- {f['filename']} (Type: {f['type']})"
            for f in uploaded_files
        ])
    else:
        files_list_str = "None"

    system_prompt = f"""
You are an outcome-based education data scientist.
Your job is to analyze previous year course outcome attainment data and validate input consistency.
Analyze the provided course name, question papers, and marks CSV calculation to identify:
1. Attainment percentage for each CO.
2. Attainment level (1, 2, or 3) for each PO based on mappings.
3. Weak COs (attainment below target/threshold).
4. Strong COs (attainment above target/threshold).
5. Gaps in assessment coverage.
6. Validation errors or mismatches. Specifically check and report if:
   - The question papers or marks data belong to a different subject/course than the active subject: "{state.subject_name}".
   - There are multiple question papers uploaded (e.g. IA1, IA2) but student marks CSV is missing or only contains marks for one of them (e.g. missing CO columns that are mapped in the question papers, or marks data is incomplete/mismatched).
   - Any other inconsistencies between the uploaded documents.

Return ONLY valid JSON with this structure:
{{
  "co_attainment": {{
    "CO1": {{"percentage": 75.0, "achieved_level": 3, "status": "strong/weak"}}
  }},
  "po_attainment": {{
    "PO1": {{"value": 2.2, "status": "strong/weak"}}
  }},
  "weak_cos": ["list of weak CO IDs"],
  "strong_cos": ["list of strong CO IDs"],
  "gaps": ["list of assessment or coverage gaps"],
  "validation_errors": ["list of validation errors or mismatches, or empty list if valid"]
}}
"""

    prompt = f"""
Subject: {state.subject_name}
Department: {state.department}

Uploaded Files:
{files_list_str}

Previous Year Course Outcomes:
{co_list_text or "None"}

Assessment Question Mappings:
{q_text or "None"}

Pre-computed Quantitative Analysis:
{json.dumps(analysis) if analysis else "None"}

Assessment Coverage Gaps:
{json.dumps(coverage_gaps)}

Please perform a final OBE Attainment and Gap Analysis.
If pre-computed quantitative analysis is provided, verify it, identify weak/strong areas, and list gaps.
If not, synthesize a qualitative assessment analysis, estimate weak/strong outcomes based on coverage gaps and subject complexity, and outline gaps.
Also evaluate consistency and populate the "validation_errors" list with any mismatches.
"""
    try:
        final_analysis = call_llm_json(prompt, system_prompt)
        
        # Blend in quantitative calculations if available
        if analysis:
            if not final_analysis.get("co_attainment"):
                final_analysis["co_attainment"] = analysis["co_attainment"]
            if not final_analysis.get("po_attainment"):
                final_analysis["po_attainment"] = analysis["po_attainment"]
            final_analysis["weak_cos"] = list(set(final_analysis.get("weak_cos", []) + analysis["weak_cos"]))
            final_analysis["strong_cos"] = list(set(final_analysis.get("strong_cos", []) + analysis["strong_cos"]))
            
        # Combine python-based validation errors and LLM-based validation errors
        llm_errors = final_analysis.get("validation_errors", [])
        if not isinstance(llm_errors, list):
            llm_errors = [str(llm_errors)]
        validation_errors.extend(llm_errors)
        
        final_analysis["validation_errors"] = list(set(validation_errors))
        
        state.previous_attainment_analysis = final_analysis
        state.log("AttainmentAnalystAgent", "complete", f"Identified {len(final_analysis.get('weak_cos', []))} weak COs, {len(final_analysis.get('gaps', []))} gaps, and {len(final_analysis.get('validation_errors', []))} validation errors.")
        return final_analysis
    except Exception as e:
        state.log("AttainmentAnalystAgent", "error", f"Attainment analysis execution failed: {str(e)}")
        fallback = {
            "co_attainment": {},
            "po_attainment": {},
            "weak_cos": [],
            "strong_cos": [],
            "gaps": ["Unable to complete attainment analysis."],
            "validation_errors": validation_errors
        }
        state.previous_attainment_analysis = fallback
        return fallback

