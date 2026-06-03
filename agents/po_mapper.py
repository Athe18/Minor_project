import json
from tools.llm_client import call_llm_json
from core.schemas import MappingEntry
from core.state import AgentState

SYSTEM = """You are an NBA accreditation expert and OBE curriculum designer.
Generate CO-PO articulation justifications for the given CO-PO cells.
Return ONLY a valid JSON array. No markdown, no code fences."""


# ─── Mathematical strength calculator ────────────────────────────────────────

def _compute_strength(mapped_count: int, total_count: int) -> int:
    if total_count == 0 or mapped_count == 0:
        return 0
    pct = (mapped_count / total_count) * 100
    if pct < 34.0:
        return 1
    elif pct < 67.0:
        return 2
    else:
        return 3


def calculate_pi_coverage(state: AgentState) -> dict:
    """Calculates unique overall PI coverage metrics for each PO."""
    coverage = {}
    for po in state.pos:
        po_pis = [pi for pi in state.performance_indicators if pi.po_id == po.po_id]
        total_pis = len(po_pis)

        if total_pis == 0:
            coverage[po.po_id] = {"percentage": 0.0, "mapped_count": 0, "total_count": 0, "level": "No Coverage"}
            continue

        mapped_pi_ids = set()
        for m in state.pi_mappings:
            if m.mapped == "Y" and any(p.pi_id == m.pi_id for p in po_pis):
                mapped_pi_ids.add(m.pi_id)

        mapped_count = len(mapped_pi_ids)
        pct = (mapped_count / total_pis) * 100

        if mapped_count == 0:
            level = "No Coverage"
        elif pct >= 67.0:
            level = "Level 3"
        elif pct >= 34.0:
            level = "Level 2"
        else:
            level = "Level 1"

        coverage[po.po_id] = {
            "percentage": round(pct, 1),
            "mapped_count": mapped_count,
            "total_count": total_pis,
            "level": level,
        }
    return coverage


# ─── Per-CO LLM batch call ───────────────────────────────────────────────────

def _generate_reasoning_for_co(
    co,
    state: AgentState,
    pre_calculated: list,
    attainment_context: dict,
) -> list:
    """
    Call the LLM for a SINGLE CO across all POs.
    Returns a list of dicts: [{co_id, po_id, strength, reasoning, confidence}]
    Keeps the output token budget small (~12 cells × ~100 tokens = ~1 200 tokens).
    """
    po_text = "\n".join([f"- {po.po_id}: {po.statement}" for po in state.pos])

    # Only include cells for this CO
    co_cells = [c for c in pre_calculated if c["co_id"] == co.co_id]

    cell_context = []
    for c in co_cells:
        cell_context.append({
            "co_id": c["co_id"],
            "po_id": c["po_id"],
            "strength": c["strength"],
            "pi_coverage": c["coverage_pct"],
            "mapped_pis": c["mapped_pis"],
        })

    prompt = f"""Subject: {state.subject_name}

CO: {co.co_id} — {co.statement} (Bloom's L{co.blooms_level}, keyword: {co.blooms_keyword})

PROGRAM OUTCOMES:
{po_text}

MAPPING DATA FOR THIS CO (pre-calculated, do NOT change strength values):
{json.dumps(cell_context, indent=2)}

PREVIOUS ATTAINMENT (if available):
{json.dumps(attainment_context.get("co_attainment", {}).get(co.co_id, {}), indent=2)}

INSTRUCTIONS:
Write a CONCISE reasoning for every CO-PO cell listed above.
- If strength > 0: Include "**Semantic Alignment**", "**Competency & PI Coverage**", "**Bloom's Level Compatibility**" (3 lines max each).
- If strength = 0: Include "**Reason for No Mapping**" and "**Suggested Activities**" (2 lines max each).
Keep each reasoning under 200 words.
Return strength EXACTLY as given — do NOT change it.

JSON format (one object per cell):
[
  {{
    "co_id": "CO1",
    "po_id": "PO1",
    "strength": 2,
    "reasoning": "- **Semantic Alignment**: ...\\n- **Competency & PI Coverage**: ...\\n- **Bloom's Level Compatibility**: ...",
    "confidence": 0.9
  }}
]
"""

    try:
        data = call_llm_json(prompt, SYSTEM, temperature=0)
        if isinstance(data, dict):
            data = [data]
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[POMapper] LLM call failed for {co.co_id}: {e}")
        return []


# ─── Main run function ───────────────────────────────────────────────────────

def run(state: AgentState) -> AgentState:
    state.log("POMapperAgent", "start",
              "Running Articulation Agent (batched per-CO to avoid token truncation)")

    if not state.cos or not state.pos:
        state.log("POMapperAgent", "error", "Cannot run articulation without COs and POs.")
        return state

    # 1. Pre-calculate all strengths mathematically from PI mappings
    pre_calculated_mappings = []
    for co in state.cos:
        for po in state.pos:
            po_pis = [pi for pi in state.performance_indicators if pi.po_id == po.po_id]
            total_count = len(po_pis)

            if total_count == 0:
                pre_calculated_mappings.append({
                    "co_id": co.co_id, "po_id": po.po_id,
                    "strength": 0, "coverage_pct": 0.0,
                    "mapped_pis": [], "total_pis": 0
                })
                continue

            mapped_pis = []
            for pi in po_pis:
                m = next(
                    (e for e in state.pi_mappings if e.co_id == co.co_id and e.pi_id == pi.pi_id),
                    None
                )
                if m and m.mapped == "Y":
                    mapped_pis.append(pi)

            mapped_count = len(mapped_pis)
            pct = (mapped_count / total_count) * 100
            strength = _compute_strength(mapped_count, total_count)

            pre_calculated_mappings.append({
                "co_id": co.co_id, "po_id": po.po_id,
                "strength": strength,
                "coverage_pct": round(pct, 1),
                "mapped_pis": [p.pi_id for p in mapped_pis],
                "total_pis": total_count,
            })

    # 2. Build a lookup from (co_id, po_id) → math entry
    math_lookup = {(m["co_id"], m["po_id"]): m for m in pre_calculated_mappings}

    # 3. LLM calls — ONE PER CO to keep output tokens manageable
    attainment_context = state.previous_attainment_analysis or {}
    llm_results_lookup = {}  # (co_id, po_id) → {reasoning, confidence}

    for co in state.cos:
        co_results = _generate_reasoning_for_co(co, state, pre_calculated_mappings, attainment_context)
        for item in co_results:
            try:
                key = (str(item["co_id"]), str(item["po_id"]))
                llm_results_lookup[key] = {
                    "reasoning": item.get("reasoning", ""),
                    "confidence": float(item.get("confidence", 0.8)),
                }
            except Exception:
                continue

    # 4. Build final MappingEntry list — math strength always wins
    final_mappings = []
    for pre in pre_calculated_mappings:
        co_id = pre["co_id"]
        po_id = pre["po_id"]
        math_strength = pre["strength"]

        llm = llm_results_lookup.get((co_id, po_id))

        if llm and llm["reasoning"].strip():
            reasoning = llm["reasoning"]
            confidence = llm["confidence"]
        else:
            # Fallback — generate deterministic reasoning from math data
            if math_strength > 0:
                reasoning = (
                    f"- **Semantic Alignment**: Aligned mathematically.\n"
                    f"- **Competency & PI Coverage**: Maps to PIs: {', '.join(pre['mapped_pis'])}. "
                    f"Coverage is {pre['coverage_pct']}% (Level {math_strength} mapping).\n"
                    f"- **Bloom's Level Compatibility**: Bloom's levels align with engineering requirements."
                )
            else:
                reasoning = (
                    f"- **Reason for No Mapping**: No performance indicators are mapped between "
                    f"{co_id} and PIs under {po_id}.\n"
                    f"- **Suggested Activities**: Include targeted activities addressing this PO."
                )
            confidence = 0.5

        final_mappings.append(MappingEntry(
            co_id=co_id,
            po_id=po_id,
            strength=math_strength,   # ALWAYS the math value
            reasoning=reasoning,
            confidence=confidence,
            validated=True,
        ))

    state.co_po_mapping = final_mappings

    if not hasattr(state, "mapping_versions"):
        state.mapping_versions = []
    state.mapping_versions.append([m.model_dump() for m in state.co_po_mapping])

    state.log(
        "POMapperAgent", "complete",
        f"Articulated {len(state.co_po_mapping)} CO-PO cells "
        f"({len(state.cos)} COs × {len(state.pos)} POs, batched per-CO)."
    )
    return state


# ─── Recalculate strengths without LLM ───────────────────────────────────────

def recalculate_strengths_mathematically(state: AgentState) -> AgentState:
    """Recalculates CO-PO mapping strengths from PI mappings without any LLM calls."""

    if not state.co_po_mapping or not state.pi_mappings:
        # Build from scratch
        computed = []
        for co in state.cos:
            for po in state.pos:
                po_pis = [pi for pi in state.performance_indicators if pi.po_id == po.po_id]
                total_pis = len(po_pis)

                if total_pis == 0:
                    computed.append(MappingEntry(
                        co_id=co.co_id, po_id=po.po_id, strength=0,
                        reasoning=(
                            "- **Reason for No Mapping**: No performance indicators defined under this PO.\n"
                            "- **Suggested Activities**: None."
                        ),
                        confidence=1.0, validated=True
                    ))
                    continue

                mapped_pis = []
                for pi in po_pis:
                    m = next(
                        (e for e in state.pi_mappings if e.co_id == co.co_id and e.pi_id == pi.pi_id),
                        None
                    )
                    if m and m.mapped == "Y":
                        mapped_pis.append(pi)

                mapped_count = len(mapped_pis)
                pct = (mapped_count / total_pis) * 100
                strength = _compute_strength(mapped_count, total_pis)

                if strength > 0:
                    reasoning = (
                        f"- **Semantic Alignment**: Aligned mathematically.\n"
                        f"- **Competency & PI Coverage**: Maps to PIs: {', '.join([p.pi_id for p in mapped_pis])}. "
                        f"Coverage is {round(pct, 1)}% (Level {strength} mapping).\n"
                        f"- **Bloom's Level Compatibility**: Levels compatible."
                    )
                else:
                    reasoning = (
                        f"- **Reason for No Mapping**: No performance indicators are mapped between "
                        f"{co.co_id} and PIs under {po.po_id}.\n"
                        f"- **Suggested Activities**: None."
                    )

                computed.append(MappingEntry(
                    co_id=co.co_id, po_id=po.po_id, strength=strength,
                    reasoning=reasoning,
                    confidence=round(pct / 100.0, 2),
                    validated=True,
                ))
        state.co_po_mapping = computed
        return state

    # Update existing entries
    for entry in state.co_po_mapping:
        po_pis = [pi for pi in state.performance_indicators if pi.po_id == entry.po_id]
        total_pis = len(po_pis)

        if total_pis == 0:
            entry.strength = 0
            continue

        mapped_pis = []
        for pi in po_pis:
            m = next(
                (x for x in state.pi_mappings if x.co_id == entry.co_id and x.pi_id == pi.pi_id),
                None
            )
            if m and m.mapped == "Y":
                mapped_pis.append(pi)

        mapped_count = len(mapped_pis)
        pct = (mapped_count / total_pis) * 100
        new_strength = _compute_strength(mapped_count, total_pis)
        old_strength = entry.strength
        entry.strength = new_strength

        if new_strength != old_strength:
            if new_strength == 0:
                entry.reasoning = (
                    f"- **Reason for No Mapping**: No performance indicators are mapped between "
                    f"{entry.co_id} and PIs under {entry.po_id}.\n"
                    f"- **Suggested Activities**: None."
                )
            elif old_strength == 0:
                entry.reasoning = (
                    f"- **Semantic Alignment**: Aligned mathematically.\n"
                    f"- **Competency & PI Coverage**: Maps to PIs: {', '.join([p.pi_id for p in mapped_pis])}. "
                    f"Coverage is {round(pct, 1)}% (Level {new_strength} mapping).\n"
                    f"- **Bloom's Level Compatibility**: Levels compatible."
                )
            # Otherwise preserve existing reasoning

    return state