from groq import Groq
import groq
import os
import json
import re
import time
from dotenv import load_dotenv

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"]

def call_llm(
    prompt: str,
    system: str = "",
    temperature: float = 0.2,
    expect_json: bool = True
):
    messages = []

    if system:
        messages.append({
            "role": "system",
            "content": system
        })

    messages.append({
        "role": "user",
        "content": prompt
    })

    last_error = None
    for model_name in MODELS:
        # Try up to 3 times per model for transient rate limits
        for attempt in range(3):
            try:
                response = _client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                )
                raw = response.choices[0].message.content.strip()

                if expect_json:
                    raw = raw.replace("```json", "")
                    raw = raw.replace("```", "")
                    raw = raw.strip()

                return raw
            except groq.RateLimitError as e:
                last_error = e
                err_msg = str(e).lower()
                # If daily token limit (TPD) is reached, immediately try the next model
                if "tpd" in err_msg or "tokens per day" in err_msg or "daily limit" in err_msg:
                    print(f"Daily token limit reached for model '{model_name}'. Falling back to next model...")
                    break

                # Otherwise, it's transient. Sleep and retry.
                sleep_time = (attempt + 1) * 3
                print(f"Rate limit hit for model '{model_name}' (attempt {attempt+1}/3). Retrying in {sleep_time}s... Error: {e}")
                time.sleep(sleep_time)
            except Exception as e:
                last_error = e
                print(f"Error calling model '{model_name}': {e}")
                break

    raise last_error or RuntimeError("All configured LLM models failed.")


def extract_json_string(text: str) -> str:
    """Extract JSON array or object from raw LLM text."""
    first_bracket = text.find('[')
    first_brace = text.find('{')

    if first_bracket == -1 and first_brace == -1:
        return text

    if first_bracket != -1 and (first_brace == -1 or first_bracket < first_brace):
        last_bracket = text.rfind(']')
        if last_bracket != -1:
            return text[first_bracket:last_bracket+1]
    else:
        last_brace = text.rfind('}')
        if last_brace != -1:
            return text[first_brace:last_brace+1]

    return text


def salvage_truncated_json_array(text: str) -> list:
    """
    Attempt to salvage a truncated JSON array by extracting all complete
    objects from the partial response. Handles the case where the LLM output
    was cut off mid-object due to token limits.
    """
    # Find the start of the array
    start = text.find('[')
    if start == -1:
        return []

    text = text[start:]
    results = []

    # Use regex to extract complete JSON objects from the array
    # Strategy: find each opening { and try to parse from there
    i = 0
    while i < len(text):
        obj_start = text.find('{', i)
        if obj_start == -1:
            break

        # Try progressively larger slices until we get a valid object
        depth = 0
        in_string = False
        escape_next = False
        obj_end = -1

        for j in range(obj_start, len(text)):
            ch = text[j]

            if escape_next:
                escape_next = False
                continue

            if ch == '\\' and in_string:
                escape_next = True
                continue

            if ch == '"' and not escape_next:
                in_string = not in_string
                continue

            if not in_string:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        obj_end = j
                        break

        if obj_end != -1:
            obj_str = text[obj_start:obj_end+1]
            try:
                obj = json.loads(obj_str)
                results.append(obj)
            except json.JSONDecodeError:
                pass
            i = obj_end + 1
        else:
            # No complete object found after this point — truncation happened here
            break

    return results


def call_llm_json(prompt: str, system: str = "", temperature: float = 0.2):

    raw = call_llm(
        prompt=prompt,
        system=system,
        temperature=temperature,
        expect_json=True
    )

    # ── Attempt 1: Clean parse ────────────────────────────────────────────────
    try:
        cleaned = extract_json_string(raw)
        return json.loads(cleaned)
    except json.JSONDecodeError as parse_err:
        print(f"\n⚠ Invalid JSON detected\n{'━'*28}")
        print(parse_err)
        print(f"\n📦 RAW RESPONSE:\n{'━'*28}")
        print(raw[:500], "..." if len(raw) > 500 else "")

    # ── Attempt 2: Salvage truncated array ───────────────────────────────────
    salvaged = salvage_truncated_json_array(raw)
    if salvaged:
        print(f"✅ Salvaged {len(salvaged)} partial objects from truncated response.")
        return salvaged

    # ── Attempt 3: LLM-assisted repair ───────────────────────────────────────
    # Only send a short slice to avoid re-triggering token limits
    repair_prompt = f"""The following JSON is truncated or malformed. Extract and return ONLY the valid complete JSON objects you can find as a JSON array.
Do not add any explanation or markdown.

PARTIAL DATA:
{raw[:3000]}
"""
    try:
        repaired = call_llm(
            prompt=repair_prompt,
            system="Return ONLY a valid JSON array. Extract every complete object you find.",
            expect_json=False,
            temperature=0
        )

        repaired = repaired.replace("```json", "").replace("```", "").strip()

        try:
            cleaned_repaired = extract_json_string(repaired)
            result = json.loads(cleaned_repaired)
            print(f"✅ LLM repair succeeded with {len(result) if isinstance(result, list) else 1} items.")
            return result
        except Exception:
            # Last resort: salvage from repair attempt
            salvaged2 = salvage_truncated_json_array(repaired)
            if salvaged2:
                print(f"✅ Salvaged {len(salvaged2)} objects from repaired response.")
                return salvaged2
    except Exception as repair_err:
        print(f"❌ LLM repair also failed: {repair_err}")

    print("\n❌ All JSON recovery strategies exhausted. Returning empty result.")
    return []