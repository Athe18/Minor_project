import pandas as pd

from core.schemas import COAttainment
from core.state import AgentState


def run(state: AgentState, csv_path: str) -> AgentState:

    state.log(
        "COAttainmentAgent",
        "start",
        f"Loading marks from {csv_path}"
    )

    # =====================================================
    # LOAD CSV
    # =====================================================

    df = pd.read_csv(csv_path)

    # Clean column names
    df.columns = [c.strip().lower() for c in df.columns]

    # =====================================================
    # DETECT ROLL COLUMN
    # =====================================================

    possible_roll_columns = [
        "roll_no",
        "rollno",
        "roll number",
        "student_id",
        "studentid",
        "enrollment_no",
        "enrollment"
    ]

    roll_column = None

    for col in possible_roll_columns:

        if col in df.columns:
            roll_column = col
            break

    if roll_column is None:

        raise Exception(
            "\n❌ Could not find Roll Number column.\n"
            "Expected one of:\n"
            f"{possible_roll_columns}\n\n"
            f"Found columns:\n{list(df.columns)}"
        )

    # =====================================================
    # FIND MAX ROW
    # =====================================================

    max_rows = df[
        df[roll_column]
        .astype(str)
        .str.upper()
        == "MAX"
    ]

    if len(max_rows) == 0:

        raise Exception(
            "\n❌ MAX row not found in CSV.\n"
            "Add a row like:\n"
            "MAX,100,100,100..."
        )

    max_row = max_rows.iloc[0]

    # =====================================================
    # STUDENT DATA
    # =====================================================

    students = df[
        df[roll_column]
        .astype(str)
        .str.upper()
        != "MAX"
    ].copy()

    # =====================================================
    # USER THRESHOLDS
    # =====================================================

    thresholds = {
        1: state.level1_threshold,
        2: state.level2_threshold,
        3: state.level3_threshold
    }

    # =====================================================
    # FIND CO COLUMNS
    # =====================================================

    co_cols = [
        c for c in df.columns
        if c.upper().startswith("CO")
    ]

    if len(co_cols) == 0:

        raise Exception(
            "\n❌ No CO columns found.\n"
            "Expected columns like CO1, CO2, CO3..."
        )

    # =====================================================
    # CALCULATE ATTAINMENT
    # =====================================================

    results = []

    for co_col in co_cols:

        co_id = co_col.upper()

        max_mark = float(max_row[co_col])

        # Percentage calculation
        pcts = (
            students[co_col].astype(float)
            / max_mark
        ) * 100

        avg_percentage = round(
            pcts.mean(),
            2
        )

        # =================================================
        # LEVEL-WISE STUDENT %
        # =================================================

        level1_pct = round(
            (pcts >= thresholds[1]).sum()
            / len(pcts) * 100,
            2
        )

        level2_pct = round(
            (pcts >= thresholds[2]).sum()
            / len(pcts) * 100,
            2
        )

        level3_pct = round(
            (pcts >= thresholds[3]).sum()
            / len(pcts) * 100,
            2
        )

        # =================================================
        # ACHIEVED LEVEL
        # =================================================

        achieved = 0

        if level3_pct >= 50:
            achieved = 3

        elif level2_pct >= 50:
            achieved = 2

        elif level1_pct >= 50:
            achieved = 1

        # =================================================
        # STORE RESULT
        # =================================================

        results.append(

            COAttainment(

                co_id=co_id,

                avg_percentage=avg_percentage,

                level_1_students_pct=level1_pct,

                level_2_students_pct=level2_pct,

                level_3_students_pct=level3_pct,

                achieved_level=achieved,

                threshold_used=thresholds
            )
        )

    # =====================================================
    # SAVE STATE
    # =====================================================

    state.co_attainment = results

    state.log(
        "COAttainmentAgent",
        "complete",
        f"Calculated attainment for {len(results)} COs"
    )

    return state