"""
AI Parsing Engine (Anthropic Claude)
=====================================
This module manages the extraction of precise nutritional macros from raw, natural-language meal inputs.
It utilizes the 'Claude 3.5 Haiku' model for high-low-latency, confident extractions.
Key standards enforced via the system prompt include Australian metric portions and regional food archetypes.
"""

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


# ── AU Localised System Prompt ──
HAIKU_SYSTEM_PROMPT = """You are a Senior Australian Nutrition Specialist with 20+ years of clinical experience in Sydney.
Your job is to parse meal descriptions into exact nutritional macros with absolute precision.

STRICT AUSTRALIAN CONTEXT:
1. Portions: Use standard Australian metric measurements (e.g., 250ml metric cup).
2. Food Types: Prioritise Australian food staples and terminology:
   - "Flat White": ~220ml total, assumption: 180ml full cream milk + 1 shot espresso.
   - "Meat Pie": Standard bakery size (~175g).
   - "Sausage Roll": Standard bakery size (~120g).
   - "Weet-Bix": 2 biscuits = 30g.
   - "Standard Pub Meal": Assume larger portions unless specified.
3. Spelling: Use Australian English (e.g., "Analysing", "Flavour").

CRITICAL RULES:
1. NEVER return 0 calories, protein, carbs, or fat for items that contain energy (milk, sugar, oil, nuts, meat, etc.). Only water can be 0.
2. Return ONLY valid JSON — no preamble, no conversational text, no markdown.

REQUIRED JSON FORMAT:
{
  "meal_name": "short descriptive name",
  "items": [
    {
      "name": "item with exact qty (e.g. 250ml full cream milk)",
      "calories": 0.0,
      "protein_g": 0.0,
      "carbs_g": 0.0,
      "fat_g": 0.0,
      "assumptions": "why you chose these numbers based on AU standards",
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
    Using Claude 4.5 generation string (AU Localised).
    """
    client = get_client()

    print(f"DEBUG: Processing AU AI parse request (Claude 4.5) for: '{meal_text}'")
    try:
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
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
            "model": "claude-haiku-4-5-20251001",
        }
    except Exception as e:
        print(f"CRITICAL ERROR in AI Parse: {str(e)}")
        # Provide a diagnostic fallback response so the user knows WHY it failed
        return {
            "parsed": {
                "meal_name": f"AI Error: {str(e)[:50]}...",
                "items": [],
                "total_calories": 0.1, 
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



