import json
from typing import Optional
import anthropic
from app.config import get_settings

settings = get_settings()
_client: Optional[anthropic.AsyncAnthropic] = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


HAIKU_SYSTEM_PROMPT = """You are a precise nutrition parser. 
Parse the meal text into structured macros.
Return ONLY valid JSON — no explanation, no markdown, no extra text.
Use realistic average serving nutritional values.
If a quantity is not specified, assume a standard serving size.

Return this exact JSON structure:
{
  "meal_name": "short descriptive name",
  "items": [
    {
      "name": "item name with quantity",
      "calories": 0.0,
      "protein_g": 0.0,
      "carbs_g": 0.0,
      "fat_g": 0.0,
      "assumptions": "any assumptions made",
      "confidence": 0.0
    }
  ],
  "total_calories": 0.0,
  "total_protein_g": 0.0,
  "total_carbs_g": 0.0,
  "total_fat_g": 0.0,
  "overall_confidence": 0.0
}"""


async def parse_meal_with_haiku(meal_text: str) -> dict:
    """
    Call Claude Haiku to parse meal text into structured macros.
    Returns parsed dict or raises ValueError on invalid response.
    """
    client = get_client()

    message = await client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=1024,
        system=HAIKU_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": f"Parse this meal: {meal_text}"}
        ],
    )

    raw_text = message.content[0].text.strip()

    # Validate JSON
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Haiku returned invalid JSON: {str(e)}\nRaw: {raw_text[:200]}")

    # Validate required fields
    required = ["meal_name", "items", "total_calories", "total_protein_g", "total_carbs_g", "total_fat_g"]
    for field in required:
        if field not in parsed:
            raise ValueError(f"Haiku response missing required field: {field}")

    return {
        "parsed": parsed,
        "raw_response": raw_text,
        "input_tokens": message.usage.input_tokens,
        "output_tokens": message.usage.output_tokens,
        "model": "claude-3-5-haiku-20241022",
    }


SONNET_SYSTEM_PROMPT = """You are a helpful nutrition advisor reviewing a user's food diary.
Analyze the day's meals and provide constructive, honest feedback.
Return ONLY valid JSON — no extra text.

Return this exact JSON structure:
{
  "day_complete": true,
  "targets_met": {
    "calories": true,
    "protein": true,
    "carbs": null,
    "fat": null
  },
  "anomalies": ["list of flagged issues if any"],
  "summary": "2-3 sentence human-readable summary"
}"""


async def review_day_with_sonnet(
    date: str,
    entries: list,
    totals: dict,
    targets: dict,
    validation_flags: list,
) -> dict:
    """
    Call Claude Sonnet for end-of-day review. Only called explicitly by user.
    """
    # Note: This is an older implementation, the primary one is in services/ai_review.py
    # But we keep this updated for consistency if called via this module.
    client = get_client()

    context = json.dumps({
        "date": date,
        "meal_entries": entries,
        "daily_totals": totals,
        "user_targets": targets,
        "validation_flags": validation_flags,
    }, indent=2)

    message = await client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system="You are a helpful nutrition advisor. Return ONLY valid JSON.",
        messages=[
            {"role": "user", "content": f"Review this day:\n{context}"}
        ],
    )

    raw_text = message.content[0].text.strip()
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Sonnet returned invalid JSON: {str(e)}")

    return parsed
