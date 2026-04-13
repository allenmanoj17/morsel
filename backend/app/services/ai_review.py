"""
AI Coach Engine (End of Day Review)
===================================
This module powers the automated behavioral coaching feature.
It takes aggregated end-of-day data (macros, logs, targets) and pushes it through 'Claude 3.5 Haiku'
to generate an empathetic, actionable, and strictly-structured JSON summary.
This allows the dashboard to render personalized coaching insights instantly.
"""

import json
import logging
import anthropic
import re
from app.config import get_settings

from functools import lru_cache
from app.config import get_settings

# Using the specific Claude Haiku version requested
MODEL = "claude-haiku-4-5-20251001" 

@lru_cache()
def get_anthropic_client():
    """
    Returns a singleton AsyncAnthropic client initialized only when needed.
    This prevents 'SpawnProcess-1' errors during uvicorn reload on macOS.
    """
    settings = get_settings()
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

async def review_day_with_haiku(day_str: str, entries_data: list, totals: dict, targets: dict, flags: list) -> dict:
    """
    Passes the day's data and validation flags to Claude 3.5 Haiku to generate a premium, high-impact End-of-Day review.
    """
    sys_prompt = (
        "You are an elite, highly empathetic Sports Nutritionist and Behavioral Coach reviewing a client's daily food journal.\n"
        "RECEIVE: Structured meal data, daily totals, targets, and anomaly flags.\n"
        "TASKS:\n"
        "1. Write an engaging, highly motivating summary (2-3 sentences) directly addressing the user. Celebrate specific wins (e.g., hitting protein goals, great hydration).\n"
        "2. Review any anomalies or missed targets. Provide ONE highly actionable, realistic micro-adjustment they can make tomorrow to improve without feeling guilty. Focus on positive behavioral momentum.\n"
        "3. Output ONLY strict, valid JSON. No markdown, no preamble.\n\n"
        "JSON STRUCTURE:\n"
        "{\n"
        "  \"day_complete\": true,\n"
        "  \"targets_met\": { \"calories\": true, \"protein\": true },\n"
        "  \"anomalies\": [\"string\"],\n"
        "  \"summary\": \"Your personalized, highly empathetic coach analysis text goes here.\"\n"
        "}"
    )
    
    user_content = json.dumps({
        "date": day_str,
        "entries": entries_data,
        "totals": totals,
        "targets": targets,
        "validation_flags": flags
    })

    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model=MODEL,
            max_tokens=800,
            system=sys_prompt,
            messages=[{"role": "user", "content": user_content}],
            temperature=0.3
        )
        
        raw = response.content[0].text.strip()
        
        # Robust JSON extraction
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
            
        return json.loads(raw)
        
    except Exception as e:
        logging.error(f"AI Coach Review Error: {e}")
        # Return graceful fallback
        return {
            "day_complete": len(entries_data) > 0,
            "targets_met": {"calories": False, "protein": False},
            "anomalies": ["AI_COACH_OFFLINE"],
            "summary": "Your logs for today are safely saved! The AI Coach is currently recalibrating its bio-metric blueprint."
        }
