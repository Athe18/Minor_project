from core.schemas import POAttainment
from core.state import AgentState

def run(state: AgentState) -> AgentState:
    state.log("POAttainmentAgent", "start", "Calculating PO attainment")

    po_results = []

    for po in state.pos:
        # Get all mappings for this PO with strength > 0
        mappings = [m for m in state.co_po_mapping
                    if m.po_id == po.po_id and m.strength > 0]

        if not mappings:
            po_results.append(POAttainment(
                po_id=po.po_id,
                weighted_attainment=0.0,
                contributing_cos=[],
                is_weak=True,
                weakness_reason="No CO maps to this PO"
            ))
            continue

        # Formula: PO_j = Σ(CO_i_attainment × strength_ij) / Σ(strength_ij)
        numerator = 0.0
        denominator = 0.0
        contributing = []

        for mapping in mappings:
            co_att = next(
                (a for a in state.co_attainment if a.co_id == mapping.co_id),
                None
            )
            if co_att:
                numerator += co_att.achieved_level * mapping.strength
                denominator += mapping.strength
                contributing.append(mapping.co_id)

        weighted = round(numerator / denominator, 3) if denominator > 0 else 0.0
        is_weak = weighted < 1.5

        po_results.append(POAttainment(
            po_id=po.po_id,
            weighted_attainment=weighted,
            contributing_cos=contributing,
            is_weak=is_weak,
            weakness_reason="Weighted attainment below 1.5" if is_weak else None
        ))

    state.po_attainment = po_results
    state.log("POAttainmentAgent", "complete",
              f"Calculated attainment for {len(po_results)} POs")
    return state