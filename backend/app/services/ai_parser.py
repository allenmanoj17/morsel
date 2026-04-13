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
    Using Claude 4.5 generation string.
    """
    client = get_client()

    print(f"DEBUG: Processing AI parse request (Claude 4.5) for: '{meal_text}'")
    try:
        message = await client.messages.create(
            model="claude-haiku-4-5",
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
            print(f"CRITICAL ERROR: No JSON found in AI response. Raw text snippet: {raw_text[:300]}...")
            raise ValueError("No JSON found in AI response")

        # Validate JSON
        try:
            parsed = json.loads(json_match.group())
            print(f"DEBUG: Successfully parsed JSON. Food: {parsed.get('meal_name')}")
        except json.JSONDecodeError as e:
            print(f"CRITICAL ERROR: JSON decoding failed: {str(e)}")
            raise ValueError(f"Invalid JSON in AI response: {str(e)}")

        return {
            "parsed": parsed,
            "raw_response": raw_text,
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
            "model": "claude-haiku-4-5",
        }
    except Exception as e:
        print(f"CRITICAL ERROR in AI Parse: {str(e)}")
        # Provide a diagnostic fallback response so the user knows WHY it failed
        return {
            "parsed": {
                "meal_name": f"AI Error: {str(e)[:50]}...",
                "items": [],
                "total_calories": 0.1, # Use 0.1 to avoid pure zero filters
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


async def review_day_with_sonnet(
    date: str,
    entries: list,
    totals: dict,
    targets: dict,
    validation_flags: list,
) -> dict:
    """
    Call Claude Sonnet for end-of-day review.
    Upgraded to Claude 4.5 identifier.
    """
    client = get_client()

    context = json.dumps({
        "date": date,
        "meal_entries": entries,
        "daily_totals": totals,
        "user_targets": targets,
        "validation_flags": validation_flags,
    }, indent=2)

    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system="You are a Senior Nutrition Advisor. Return ONLY valid JSON.",
        messages=[
            {"role": "user", "content": f"Review this day's payload:\n{context}"}
        ],
    )

    raw_text = message.content[0].text.strip()
    try:
        # Robust extract
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Sonnet 4.5 returned invalid JSON: {str(e)}")

    return parsed
