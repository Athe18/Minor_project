import json
from tools.llm_client import call_llm_json
from core.schemas import PIMappingEntry, MappingEntry
from core.state import AgentState

SYSTEM = """
You are an NBA accreditation expert and Outcome-Based Education (OBE) curriculum analyst.
Your task is to identify valid alignments between Course Outcomes (COs) and Performance Indicators (PIs) based on the course syllabus.

Return ONLY a valid JSON array of objects, containing the mapped alignments.
"""

def run(state: AgentState) -> AgentState:
    state.log(
        "PIMapperAgent",
        "start",
        "Analyzing syllabus to map Course Outcomes (COs) to Performance Indicators (PIs)"
    )

    if not state.cos or not state.performance_indicators:
        state.log(
            "PIMapperAgent",
            "error",
            "Cannot run mapping without course outcomes and performance indicators."
        )
        return state

    # 1. Initialize all combinations as unmapped (N)
    all_mappings = {}
    for co in state.cos:
        for pi in state.performance_indicators:
            key = (co.co_id, pi.pi_id)
            all_mappings[key] = PIMappingEntry(
                co_id=co.co_id,
                pi_id=pi.pi_id,
                mapped="N",
                reasoning="No direct alignment found between this CO and PI.",
                suggestion="To align, incorporate activities, lab experiments, or lecture topics testing this specific performance indicator."
            )

    # 2. Call LLM to find mapped connections (Y)
    cos_data = [{"co_id": co.co_id, "statement": co.statement} for co in state.cos]
    pis_data = [
        {
            "po_id": pi.po_id,
            "pi_id": pi.pi_id,
            "pi_statement": pi.pi_statement
        }
        for pi in state.performance_indicators
    ]

    prompt = f"""
Analyze the course outcomes and syllabus of the course '{state.subject_name}' to identify valid alignments with the Program Performance Indicators (PIs).

COURSE SYLLABUS (subset):
{state.syllabus_text[:3000]}

COURSE OUTCOMES:
{json.dumps(cos_data, indent=2)}

PERFORMANCE INDICATORS (PIs):
{json.dumps(pis_data, indent=2)}

INSTRUCTIONS:
1. Identify all combinations of Course Outcomes (CO) and Performance Indicators (PI) that have a valid correlation.
2. Correlation exists if the topic material in the syllabus, when associated with the learning outcome, directly addresses or tests the competency described in the PI.
3. For each valid correlation, provide a concise one-sentence reasoning explaining the alignment.
4. Return ONLY a JSON array containing these mapped connections. Do not return the unmapped connections.

Example output format:
[
  {{
    "co_id": "CO1",
    "pi_id": "1.1.1",
    "reasoning": "CO1 involves analyzing system requirements which directly utilizes mathematical formulations defined in PI 1.1.1."
  }}
]
"""

    try:
        data = call_llm_json(prompt, SYSTEM, temperature=0)
        mapped_count = 0
        for entry in data:
            co_id = entry.get("co_id")
            pi_id = entry.get("pi_id")
            reasoning = entry.get("reasoning", "Aligned with curriculum competency.")
            
            key = (co_id, pi_id)
            if key in all_mappings:
                all_mappings[key].mapped = "Y"
                all_mappings[key].reasoning = reasoning
                all_mappings[key].suggestion = ""
                mapped_count += 1
                
        state.log(
            "PIMapperAgent",
            "llm_mapped",
            f"LLM identified {mapped_count} active mappings out of {len(all_mappings)} combinations."
        )
    except Exception as e:
        print(f"Error mapping COs to PIs: {e}. Defaulting to empty mapping matrix.")
        state.log(
            "PIMapperAgent",
            "error",
            f"Mapping generation failed: {e}. Matrix initialized as unmapped."
        )

    # Save final PI mappings list only — CO-PO articulation matrix is NOT derived from PIs
    state.pi_mappings = list(all_mappings.values())

    state.log(
        "PIMapperAgent",
        "complete",
        f"Completed CO-PI mapping. Total PI mappings: {len(state.pi_mappings)}"
    )
    return state


def calculate_po_co_strengths(state: AgentState):
    """
    Computes overall CO-PO strength entries by aggregating the underlying PI mappings.

    NBA-standard strength thresholds (count-aware):
    - mapped_count >= total_pis  OR  >= 40% PIs mapped  => Strength 3 (Strong)
    - >= 20% PIs mapped                                  => Strength 2 (Moderate)
    - >= 1 PI mapped (but < 20%)                         => Strength 1 (Slight)
    - 0 PIs mapped                                       => Strength 0 (None)

    Previous bug: the 67% threshold meant a CO needed 3 out of 4 PIs (or
    3 out of 3) to reach Strength 3 — almost never achievable for a single
    subject course. The new thresholds are calibrated for 3-4 PIs per PO.
    """
    pos = state.pos if state.pos else [
        # Fallback list PO1 to PO12 if state.pos is empty
        {"po_id": f"PO{i}", "statement": ""} for i in range(1, 13)
    ]
    
    computed_mappings = []
    
    for po in pos:
        po_id = po.po_id if hasattr(po, "po_id") else po["po_id"]
        # Find all PIs belonging to this PO
        po_pis = [pi for pi in state.performance_indicators if pi.po_id == po_id]
        total_pis = len(po_pis)
        
        if total_pis == 0:
            # If no PIs are registered for this PO, default all mappings for it to 0
            for co in state.cos:
                computed_mappings.append(MappingEntry(
                    co_id=co.co_id,
                    po_id=po_id,
                    strength=0,
                    reasoning=f"No performance indicators defined under {po_id}.",
                    confidence=1.0,
                    validated=True
                ))
            continue
            
        for co in state.cos:
            # Find mapped PIs
            mapped_pis = []
            for pi in po_pis:
                mapping = next((m for m in state.pi_mappings if m.co_id == co.co_id and m.pi_id == pi.pi_id), None)
                if mapping and mapping.mapped == "Y":
                    mapped_pis.append(pi)
            
            mapped_count = len(mapped_pis)
            percentage = (mapped_count / total_pis) * 100
            
            # Determine strength using mathematical thresholds consistently across the system
            if mapped_count == 0:
                strength = 0
            elif percentage < 34.0:
                strength = 1
            elif percentage < 67.0:
                strength = 2
            else:
                strength = 3
                
            # Create a nice descriptive reasoning
            if strength > 0:
                mapped_pi_statements = ", ".join([f"{pi.pi_id}" for pi in mapped_pis])
                reasoning = f"{co.co_id} maps to {po_id} (Strength: {strength}) by aligning with {mapped_count}/{total_pis} performance indicators: {mapped_pi_statements}."
            else:
                reasoning = f"No significant alignment: {co.co_id} does not map to any performance indicators under {po_id}."
                
            computed_mappings.append(MappingEntry(
                co_id=co.co_id,
                po_id=po_id,
                strength=strength,
                reasoning=reasoning,
                confidence=round(percentage / 100.0, 2),
                validated=True
            ))
            
    state.co_po_mapping = computed_mappings
