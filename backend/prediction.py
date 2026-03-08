"""
Word prediction engine for the Communication page.
Uses the `wordfreq` library for access to millions of real English word frequencies.
Falls back to a built-in mini dictionary if wordfreq is not installed.
"""

try:
    from wordfreq import top_n_list, word_frequency
    HAS_WORDFREQ = True
except ImportError:
    HAS_WORDFREQ = False

# Fallback mini dictionary (used only if wordfreq is not installed)
_FALLBACK_WORDS = [
    "THE", "I", "TO", "AND", "A", "IS", "IN", "YOU", "IT", "OF",
    "FOR", "ARE", "NOT", "THAT", "ON", "WAS", "WITH", "HAVE", "THIS", "BE",
    "DO", "AT", "OR", "FROM", "MY", "BUT", "HIS", "BY", "ALL", "WILL",
    "CAN", "NO", "HE", "SHE", "WE", "THEY", "SO", "IF", "WHAT", "ABOUT",
    "GO", "JUST", "UP", "KNOW", "TIME", "GET", "COME", "MAKE", "LIKE", "GOOD",
    "WANT", "NEED", "HELP", "PLEASE", "THANK", "YES", "OK", "HELLO", "HI",
    "SORRY", "WATER", "FOOD", "HOME", "PAIN", "FEEL", "HAPPY", "SAD", "TIRED",
    "HUNGRY", "COLD", "HOT", "SICK", "DOCTOR", "MEDICINE", "BATHROOM",
    "FAMILY", "MOTHER", "FATHER", "EMERGENCY", "CALL", "STOP", "MORE",
]

# Build the full word list on startup
if HAS_WORDFREQ:
    # Get top 10,000 most common English words from wordfreq
    WORD_LIST = [w.upper() for w in top_n_list('en', 10000) if w.isalpha() and len(w) > 1]
    print(f"[Prediction] Loaded {len(WORD_LIST)} words from wordfreq library")
else:
    WORD_LIST = _FALLBACK_WORDS
    print("[Prediction] wordfreq not installed — using fallback dictionary (pip install wordfreq)")


def get_predictions(text: str, max_results: int = 5) -> list[str]:
    """
    Get word predictions based on current typed text.
    
    - If text ends mid-word: suggests completions for the partial word
    - If text ends with a space: suggests the most common next words
    """
    if not text or not text.strip():
        return WORD_LIST[:max_results]

    text_upper = text.upper()

    if text_upper.endswith(" "):
        # Starting new word — return most common words
        return WORD_LIST[:max_results]

    # Mid-word — find completions for the partial word
    words = text_upper.split()
    prefix = words[-1] if words else ""

    if not prefix:
        return WORD_LIST[:max_results]

    # Find words starting with this prefix
    matches = [w for w in WORD_LIST if w.startswith(prefix) and w != prefix]

    result = matches[:max_results]

    # Pad with common words if too few matches
    if len(result) < max_results:
        filler = [w for w in WORD_LIST[:max_results * 2] if w not in result]
        result.extend(filler[:max_results - len(result)])

    return result[:max_results]
