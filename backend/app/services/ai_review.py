import json
import logging
import anthropic
import re
from app.config import get_settings

settings = get_settings()
# Upgraded to Claude 4.5 Sonnet identifier (corrected)
MODEL = "claude-sonnet-4-5" 

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

async def review_day_with_sonnet(day_str: str, entries_data: list, totals: dict, targets: dict, flags: list) -> dict:
    """
    Passes the day's data and validation flags to Claude Sonnet 4.5 to generate an analytical End-of-Day review.
    """
    sys_prompt = (
        "You are an expert, empathetic Senior Nutrition Coach reviewing a user's food diary.\n"
        "RECEIVE: Structured meal data, daily totals, targets, and anomaly flags.\n"
        "TASKS:\n"
        "1. Write an authoritative, encouraging summary (2 sentences). Highlight a data-driven win.\n"
        "2. If flags (like target_deviation) exist, provide a clinical but gentle adjustment strategy for tomorrow.\n"
        "3. Output ONLY strict, valid JSON. No markdown, no preamble.\n\n"
        "JSON STRUCTURE:\n"
        "{\n"
        "  \"day_complete\": true,\n"
        "  \"targets_met\": { \"calories\": true, \"protein\": true },\n"
        "  \"anomalies\": [\"string\"],\n"
        "  \"summary\": \"The coach analysis text\"\n"
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
        logging.error(f"Sonnet 4.5 Review Error: {e}")
        # Return graceful fallback
        return {
            "day_complete": len(entries_data) > 0,
            "targets_met": {"calories": False, "protein": False},
            "anomalies": ["AI_COACH_OFFLINE"],
            "summary": "Your logs for today are safely saved! The AI Coach is currently recalibrating its bio-metric blueprint."
        }
