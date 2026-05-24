from groq import Groq
import groq
import os
import json
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



def call_llm_json(prompt: str, system: str = "", temperature: float = 0.2):

    raw = call_llm(
        prompt=prompt,
        system=system,
        temperature=temperature,
        expect_json=True
    )

    try:
        return json.loads(raw)

    except json.JSONDecodeError as e:

        print("\n⚠ Invalid JSON detected")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(e)

        print("\n📦 RAW RESPONSE:")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(raw)

        repair_prompt = f"""
Convert the following into VALID JSON ONLY.

Do not add explanations.
Do not add markdown.

DATA:
{raw}
"""

        repaired = call_llm(
            prompt=repair_prompt,
            system="Return ONLY valid JSON.",
            expect_json=False,
            temperature=0
        )

        repaired = repaired.replace("```json", "")
        repaired = repaired.replace("```", "")
        repaired = repaired.strip()

        try:
            return json.loads(repaired)

        except Exception:
            print("\n❌ JSON repair failed")
            return {}