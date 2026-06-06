import pandas as pd
from typing import Optional
from core.schemas import COAttainment
from core.state import AgentState

def recalculate_attainment(state: AgentState) -> AgentState:
    """
    Calculates CO attainment from component marks (IA, MSE, ESE) in state
    following the strict NBA/OBE methodology.
    """
    state.log("COAttainmentAgent", "recalculate", "Starting CO attainment recalculation")
    
    l1 = state.level1_threshold
    l3 = state.level3_threshold
    
    def get_continuous_level(pct: Optional[float]) -> Optional[float]:
        if pct is None:
            return None
        if pct < l1:
            return 0.0
        if pct >= l3:
            return 3.0
        if l3 > l1:
            val = 1.0 + (pct - l1) / (l3 - l1) * 2.0
            return round(val, 2)
        return 3.0

    results = []
    
    for co in state.cos:
        co_id = co.co_id
        target_pct = co.target_attainment or state.level1_threshold or 60.0
        
        # Check active status of each component for this CO
        has_ia = bool(state.ia_students and co_id in state.ia_max_marks and state.ia_max_marks[co_id] > 0)
        has_mse = bool(state.mse_students and co_id in state.mse_max_marks and state.mse_max_marks[co_id] > 0)
        has_ese = bool(state.ese_students and co_id in state.ese_max_marks and state.ese_max_marks[co_id] > 0)
        
        if has_ia or has_mse or has_ese:
            # 1. IA Calculation
            ia_pct = None
            ia_level = None
            ia_max = 0.0
            if has_ia:
                ia_max = state.ia_max_marks[co_id]
                target_marks = ia_max * (target_pct / 100.0)
                passed = sum(1 for s in state.ia_students if s.get("marks", {}).get(co_id, 0.0) >= target_marks)
                ia_pct = round((passed / len(state.ia_students)) * 100.0, 2)
                ia_level = get_continuous_level(ia_pct)
                
            # 2. MSE Calculation
            mse_pct = None
            mse_level = None
            mse_max = 0.0
            if has_mse:
                mse_max = state.mse_max_marks[co_id]
                target_marks = mse_max * (target_pct / 100.0)
                passed = sum(1 for s in state.mse_students if s.get("marks", {}).get(co_id, 0.0) >= target_marks)
                mse_pct = round((passed / len(state.mse_students)) * 100.0, 2)
                mse_level = get_continuous_level(mse_pct)
                
            # 3. CIE Total Calculation (sum student-level raw marks for IA and MSE)
            cie_pct = None
            cie_level = None
            if has_ia or has_mse:
                cie_max = ia_max + mse_max
                target_marks = cie_max * (target_pct / 100.0)
                ia_rolls = {s["roll_no"]: s for s in state.ia_students if "roll_no" in s}
                mse_rolls = {s["roll_no"]: s for s in state.mse_students if "roll_no" in s}
                all_rolls = set(ia_rolls.keys()).union(set(mse_rolls.keys()))
                if all_rolls:
                    passed = 0
                    for roll in all_rolls:
                        ia_mark = ia_rolls.get(roll, {}).get("marks", {}).get(co_id, 0.0) if roll in ia_rolls else 0.0
                        mse_mark = mse_rolls.get(roll, {}).get("marks", {}).get(co_id, 0.0) if roll in mse_rolls else 0.0
                        if (ia_mark + mse_mark) >= target_marks:
                            passed += 1
                    cie_pct = round((passed / len(all_rolls)) * 100.0, 2)
                    cie_level = get_continuous_level(cie_pct)
                    
            # 4. ESE Calculation
            ese_pct = None
            ese_level = None
            ese_max = 0.0
            if has_ese:
                ese_max = state.ese_max_marks[co_id]
                target_marks = ese_max * (target_pct / 100.0)
                passed = sum(1 for s in state.ese_students if s.get("marks", {}).get(co_id, 0.0) >= target_marks)
                ese_pct = round((passed / len(state.ese_students)) * 100.0, 2)
                ese_level = get_continuous_level(ese_pct)
                
            # 5. Weighted Average Achieved %
            weighted_sum = 0.0
            total_weight = 0.0
            if ia_pct is not None:
                weighted_sum += ia_pct * ia_max
                total_weight += ia_max
            if mse_pct is not None:
                weighted_sum += mse_pct * mse_max
                total_weight += mse_max
            if ese_pct is not None:
                weighted_sum += ese_pct * ese_max
                total_weight += ese_max
                
            avg_percentage = round(weighted_sum / total_weight, 2) if total_weight > 0.0 else 0.0
            achieved_level = get_continuous_level(avg_percentage)
            
        else:
            # Manual / existing values fallback when no student rosters are loaded
            existing = next((a for a in state.co_attainment if a.co_id == co_id), None)
            if existing:
                ia_pct = existing.ia_percentage
                mse_pct = existing.mse_percentage
                ese_pct = existing.ese_percentage
            else:
                ia_pct = None
                mse_pct = None
                ese_pct = None
                
            # Default weights: IA=30, MSE=20, ESE=50
            ia_max = 30.0 if ia_pct is not None else 0.0
            mse_max = 20.0 if mse_pct is not None else 0.0
            ese_max = 50.0 if ese_pct is not None else 0.0
            
            ia_level = get_continuous_level(ia_pct) if ia_pct is not None else None
            mse_level = get_continuous_level(mse_pct) if mse_pct is not None else None
            
            cie_pct = None
            cie_level = None
            if ia_pct is not None or mse_pct is not None:
                cie_sum = (ia_pct * ia_max if ia_pct is not None else 0.0) + (mse_pct * mse_max if mse_pct is not None else 0.0)
                cie_weight = ia_max + mse_max
                cie_pct = round(cie_sum / cie_weight, 2) if cie_weight > 0.0 else 0.0
                cie_level = get_continuous_level(cie_pct)
                
            ese_level = get_continuous_level(ese_pct) if ese_pct is not None else None
            
            # Weighted average achieved %
            weighted_sum = 0.0
            total_weight = 0.0
            if ia_pct is not None:
                weighted_sum += ia_pct * ia_max
                total_weight += ia_max
            if mse_pct is not None:
                weighted_sum += mse_pct * mse_max
                total_weight += mse_max
            if ese_pct is not None:
                weighted_sum += ese_pct * ese_max
                total_weight += ese_max
                
            avg_percentage = round(weighted_sum / total_weight, 2) if total_weight > 0.0 else 0.0
            achieved_level = get_continuous_level(avg_percentage)
            
        results.append(COAttainment(
            co_id=co_id,
            ia_percentage=ia_pct,
            ia_level=ia_level,
            mse_percentage=mse_pct,
            mse_level=mse_level,
            cie_percentage=cie_pct,
            cie_level=cie_level,
            ese_percentage=ese_pct,
            ese_level=ese_level,
            avg_percentage=avg_percentage,
            achieved_level=achieved_level if achieved_level is not None else 0.0,
            threshold_used={1: l1, 2: state.level2_threshold, 3: l3}
        ))
        
    state.co_attainment = results
    state.log("COAttainmentAgent", "recalculate_complete", f"Calculated attainment for {len(results)} COs")
    return state

def run(state: AgentState, csv_path: str = None) -> AgentState:
    """
    Backwards compatibility: If a CSV is passed directly (e.g. from tests or scripts),
    we treat it as overall ESE marks and run recalculations.
    """
    if csv_path:
        state.log("COAttainmentAgent", "start", f"Loading fallback marks from {csv_path}")
        df = pd.read_csv(csv_path)
        df.columns = [c.strip().lower() for c in df.columns]
        
        possible_roll_columns = ["roll_no", "rollno", "roll number", "student_id", "studentid", "enrollment_no"]
        roll_col = next((c for c in possible_roll_columns if c in df.columns), None) or df.columns[0]
        
        max_rows = df[df[roll_col].astype(str).str.upper() == "MAX"]
        if len(max_rows) > 0:
            max_row = max_rows.iloc[0]
            max_marks = {}
            for col in df.columns:
                if col.upper().startswith("CO"):
                    max_marks[col.upper()] = float(max_row[col])
            state.ese_max_marks = max_marks
            state.max_marks = max_marks
            
        student_rows = df[df[roll_col].astype(str).str.upper() != "MAX"]
        students_list = []
        for _, row in student_rows.iterrows():
            stud = {
                "roll_no": str(row[roll_col]),
                "name": str(row.get("name", "Unknown")),
                "marks": {}
            }
            for col in df.columns:
                if col.upper().startswith("CO"):
                    stud["marks"][col.upper()] = float(row[col])
            students_list.append(stud)
        state.ese_students = students_list
        state.students = students_list

    return recalculate_attainment(state)