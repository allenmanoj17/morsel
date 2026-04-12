from typing import List, Dict, Any

def run_validation(entries: List[Dict[str, Any]], target: Dict[str, Any], date: str) -> List[str]:
    """
    Deterministic validation engine runs before AI review.
    Returns a list of validation string flags.
    """
    flags = []
    
    if not entries:
        return ["no_entries"]

    cal_target = float(target.get("calories_target") or 0)
    prot_target = float(target.get("protein_target_g") or 0)

    total_cal = sum(float(e.get("calories") or 0) for e in entries)
    total_prot = sum(float(e.get("protein_g") or 0) for e in entries)

    # 1. Very low calories (suspiciously incomplete)
    if total_cal > 0 and total_cal < 800:
        flags.append("very_low_calories")
        
    # 2. Duplicate or suspicious meal sizes
    # Just an example rule: if single entry > 2000 cal
    for e in entries:
        if float(e.get("calories") or 0) > 2000:
            flags.append("extreme_single_meal_detected")
            break

    # 3. High cal, low protein (e.g. >1500 cal but <40g protein)
    if total_cal > 1500 and total_prot < 40:
        flags.append("poor_macro_ratio")

    # 4. Severe target deviation (>50% margin)
    if cal_target > 0:
        diff_cal = abs(total_cal - cal_target) / cal_target
        if diff_cal > 0.5:
            flags.append("severe_target_deviation")

    # 5. Missing macro data in entries
    for e in entries:
        c = e.get("calories")
        p = e.get("protein_g")
        cb = e.get("carbs_g")
        f = e.get("fat_g")
        if any(x is None for x in (c, p, cb, f)):
            flags.append("missing_macros_in_entry")
            break

    return flags
