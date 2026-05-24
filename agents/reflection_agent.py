from tools.llm_client import call_llm

SYSTEM = """
You are a Reflection Agent.

Responsibilities:
- Analyze validator feedback
- Analyze user feedback
- Improve future generations
- Remove repetitive issues
- Improve NBA compliance
- Improve Bloom taxonomy coverage
- Make outputs measurable and practical

Return ONLY concise improvement instructions.
"""


def generate_reflection(previous_output, validator_feedback, user_feedback):

    prompt = f"""
PREVIOUS OUTPUT:
{previous_output}

VALIDATOR FEEDBACK:
{validator_feedback}

USER FEEDBACK:
{user_feedback}

Generate concise regeneration instructions.
"""

    response = call_llm(
        prompt=prompt,
        system=SYSTEM,
        expect_json=False
    )

    return response