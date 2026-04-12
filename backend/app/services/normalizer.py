import re
import unicodedata

# Unit normalization map
UNIT_MAP = {
    "tbsp": "tablespoon", "tbs": "tablespoon", "tablespoons": "tablespoon",
    "tsp": "teaspoon", "teaspoons": "teaspoon",
    "g": "grams", "gram": "grams",
    "kg": "kilograms", "kilogram": "kilograms",
    "ml": "milliliters", "milliliter": "milliliters",
    "l": "liters", "liter": "liters",
    "oz": "ounces", "ounce": "ounces",
    "lb": "pounds", "lbs": "pounds", "pound": "pounds",
    "cup": "cups",
    "scoop": "scoops",
    "piece": "pieces", "pc": "pieces",
    "slice": "slices",
    "handful": "handfuls",
}

WORD_NUM_MAP = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "half": "0.5", "a": "1", "an": "1",
}


def normalize_text(text: str) -> str:
    """
    Normalize meal text for consistent matching.
    Steps: unicode → lowercase → trim → number words → units → punctuation
    """
    # Unicode normalize
    text = unicodedata.normalize("NFKC", text)
    # Lowercase + strip
    text = text.lower().strip()
    # Replace word numbers
    words = text.split()
    normalized_words = [WORD_NUM_MAP.get(w, w) for w in words]
    text = " ".join(normalized_words)
    # Normalize units
    words = text.split()
    normalized_words = [UNIT_MAP.get(w, w) for w in words]
    text = " ".join(normalized_words)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text)
    # Simplify punctuation (keep alphanumeric, spaces, dots, commas)
    text = re.sub(r"[^\w\s\.,]", "", text)
    return text.strip()
