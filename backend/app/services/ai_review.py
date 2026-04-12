import json
import logging
import anthropic
from app.config import get_settings

settings = get_settings()
# We use Claude-3-Sonnet for reviews as it requires reasoning over the day's events
MODEL = "claude-3-5-sonnet-20241022" 

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

async def review_day_with_sonnet(day_str: str, entries_data: list, totals: dict, targets: dict, flags: list) -> dict:
    """
    Passes the day's data and validation flags to Claude Sonnet to generate an insightful End-of-Day review.
    """
    sys_prompt = (
        "You are an expert, empathetic nutrition coach reviewing a user's logged meals for the day. "
        "You receive structured JSON of their logs, their daily macro totals, their targets, and any anomaly flags.\n"
        "1. Write a short, encouraging summary of how they did (~2 sentences). Highlight a win based on the data.\n"
        "2. If there are anomalies or flags (like severe_target_deviation), gently point it out and suggest how to adjust tomorrow.\n"
        "3. Output ONLY strict, valid JSON matching this exact structure: \n"
        "   { \"day_complete\": true/false, \"targets_met\": { \"calories\": true/false, \"protein\": true/false }, \"anomalies\": [\"anomaly string\"], \"summary\": \"your coach response\" }\n"
        "Do not include any explanation outside the JSON block."
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
            max_tokens=600,
            system=sys_prompt,
            messages=[{"role": "user", "content": user_content}],
            temperature=0.2
        )
        
        raw = response.content[0].text.strip()
        
        # Robust JSON extraction
        import re
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
            
        return json.loads(raw)
        
    except Exception as e:
        logging.error(f"Sonnet review failed: {e}")
        logging.error(f"Raw response: {raw if 'raw' in locals() else 'N/A'}")
        # Return graceful fallback
        return {
            "day_complete": len(entries_data) > 0,
            "targets_met": {"calories": False, "protein": False},
            "anomalies": ["Failed to parse deep review."],
            "summary": "We couldn't reach your AI coach right now, but your logs for today are safely saved!"
        }
