import json
import re
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


HAIKU_SYSTEM_PROMPT = """You are a Senior Precision Nutrition Specialist with 20+ years of clinical experience.
Your job is to parse meal descriptions into exact nutritional macros with absolute accuracy.

CRITICAL RULES:
1. NEVER return 0 calories, protein, carbs, or fat for items that contain energy (e.g., milk, sugar, oil, nuts, meat, etc.). Only water can be 0.
2. For "Large Cappuccino with 2 sugars", assume: 300ml full cream milk + 2 tsp white sugar.
3. Be authoritative. If a quantity is missing, use a standard "restaurant serving" size.
4. Return ONLY valid JSON — no preamble, no conversational text, no markdown.

REQUIRED JSON FORMAT:
{
  "meal_name": "short descriptive name",
  "items": [
    {
      "name": "item with exact qty (e.g. 300ml whole milk)",
      "calories": 0.0,
      "protein_g": 0.0,
      "carbs_g": 0.0,
      "fat_g": 0.0,
      "assumptions": "why you chose these numbers",
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

    print(f"DEBUG: Processing AI parse request for: '{meal_text}'")
    try:
        message = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1024,
            system=HAIKU_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Parse this meal: {meal_text}"}
            ],
        )

        raw_text = message.content[0].text.strip()
        print(f"DEBUG: AI Response received (length {len(raw_text)})")

        # Extract JSON using regex (handles chatty models/markdown)
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not json_match:
            print(f"ERROR: No JSON found in AI response. Raw text: {raw_text[:500]}")
            raise ValueError("No JSON found in AI response")

        # Validate JSON
        try:
            parsed = json.loads(json_match.group())
        except json.JSONDecodeError as e:
            print(f"ERROR: AI returned invalid JSON after extraction. Raw text: {raw_text[:500]}")
            raise ValueError(f"Haiku returned invalid JSON: {str(e)}")

        return {
            "parsed": parsed,
            "raw_response": raw_text,
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
            "model": "claude-3-5-haiku-20241022",
        }
    except Exception as e:
        print(f"CRITICAL ERROR in AI Parse: {str(e)}")
        # Provide a safe fallback response so the frontend doesn't crash
        return {
            "parsed": {
                "meal_name": meal_text,
                "items": [],
                "total_calories": 0,
                "total_protein_g": 0,
                "total_carbs_g": 0,
                "total_fat_g": 0,
                "overall_confidence": 0
            },
            "raw_response": "error_fallback",
            "input_tokens": 0,
            "output_tokens": 0,
            "model": "error",
            "error": str(e)
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
