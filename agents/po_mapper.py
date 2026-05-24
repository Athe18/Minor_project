from tools.llm_client import call_llm_json
from core.schemas import MappingEntry
from core.state import AgentState

SYSTEM = """
You are an NBA accreditation expert specializing in
CO-PO mapping.

Responsibilities:
- Generate accurate CO-PO mappings
- Use mapping strengths from 0 to 3
- Ensure NBA compliance
- Avoid random mappings
- Ensure strong mappings for key POs
- Provide meaningful reasoning

Return ONLY valid JSON.
"""


def run(state: AgentState) -> AgentState:

    state.log(
        "POMapperAgent",
        "start",
        "Generating CO-PO mappings"
    )

    # Reflection feedback from human-in-loop
    reflection_feedback = getattr(
        state,
        "mapping_reflection",
        ""
    )

    # Convert COs into readable text
    co_text = "\n".join([
        f"{co.co_id}: {co.statement}"
        for co in state.cos
    ])

    # Convert POs into readable text
    po_text = "\n".join([
        f"{po.po_id}: {po.statement}"
        for po in state.pos
    ])

    prompt = f"""
Generate CO-PO mappings.

COURSE OUTCOMES:
{co_text}

PROGRAM OUTCOMES:
{po_text}

ADDITIONAL MAPPING INSTRUCTIONS:
{reflection_feedback}

STRICT RULES:
- Mapping strength must be between 0 and 3
- Use 0 if there is no meaningful relationship
- Use 1 for weak relationship
- Use 2 for moderate relationship
- Use 3 for strong relationship

NBA REQUIREMENTS:
- Ensure PO1, PO2, and PO3 receive strong mappings
- Avoid assigning all mappings randomly
- Ensure logical alignment
- Maintain academic relevance
- Ensure at least 2 strong mappings for major POs

CONFIDENCE SCORE:
- Must be between 0 and 1

RETURN FORMAT:
Return ONLY valid JSON array.

Example:
[
  {{
    "co_id": "CO1",
    "po_id": "PO1",
    "strength": 3,
    "reasoning": "CO1 strongly supports engineering knowledge",
    "confidence": 0.91
  }}
]
"""

    data = call_llm_json(prompt, SYSTEM, temperature=0)

    # SAVE MAPPINGS
    state.co_po_mapping = [
        MappingEntry(**mapping)
        for mapping in data
    ]

    # SAVE VERSION HISTORY
    if not hasattr(state, "mapping_versions"):
        state.mapping_versions = []

    state.mapping_versions.append(data)

    state.log(
        "POMapperAgent",
        "complete",
        f"Generated {len(state.co_po_mapping)} mappings"
    )

    return state