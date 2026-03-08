"""
qualifier_flattener.py
----------------------
Converts the raw ``qualifiers`` list on an Event into named, type-specific
fields before the event is serialised for the frontend.

Design:
  - The internal Event model still carries all qualifiers so that other
    services (pass-network, etc.) can consume them unchanged.
  - Only the serialisation payload sent to clients is flattened.
"""

from typing import Any, Dict, Optional, Set

from app.schemas.events import Event

# ---------------------------------------------------------------------------
# Pass qualifier mappings  (type_id "1" and "2")
# ---------------------------------------------------------------------------

_PASS_VALUE_QUALIFIERS: Dict[str, str] = {
    "140": "end_x",    # Pass End X  (0-100)
    "141": "end_y",    # Pass End Y  (0-100)
    "212": "length",   # Estimated length in metres
    "213": "angle",    # Angle in radians (0-6.28)
}

_PASS_BOOL_QUALIFIERS: Dict[str, str] = {
    "1":   "long_ball",
    "2":   "cross",
    "3":   "head_pass",
    "4":   "through_ball",
    "5":   "free_kick_taken",
    "6":   "corner_taken",
    "107": "throw_in",
    "152": "direct",
    "155": "chipped",
    "157": "launch",
    "168": "flick_on",
    "210": "is_key_pass",
    "236": "blocked",
    "279": "is_kick_off",
}

# ---------------------------------------------------------------------------
# Shot qualifier mappings  (type_id "13" Miss, "14" Post, "15" Attempt Saved,
#                           "16" Goal)
# ---------------------------------------------------------------------------

_SHOT_VALUE_QUALIFIERS: Dict[str, str] = {
    "102": "goal_mouth_y",  # Y coordinate where ball crossed goal line
    "103": "goal_mouth_z",  # Z (height) coordinate where ball crossed goal line
    "146": "blocked_x",     # X coordinate where shot was blocked
    "147": "blocked_y",     # Y coordinate where shot was blocked
    "230": "gk_x",          # GK X position when goal / post
    "231": "gk_y",          # GK Y position when goal / post
}

_SHOT_BOOL_QUALIFIERS: Dict[str, str] = {
    "9":   "penalty",
    "15":  "head",
    "20":  "right_footed",
    "21":  "other_body_part",
    "22":  "regular_play",
    "23":  "fast_break",
    "24":  "set_piece",
    "25":  "from_corner",
    "26":  "free_kick",
    "28":  "own_goal",
    "29":  "assisted",
    "72":  "left_footed",
    "113": "strong",
    "114": "weak",
    "214": "big_chance",
    "328": "first_touch",
}

# Qualifier whose *value* (event_id of the assist) is a string, not a bool
_SHOT_STRING_QUALIFIERS: Dict[str, str] = {
    "55": "assist_event_id",
}

# Shot outcome derived from type_id
_SHOT_OUTCOME_MAP: Dict[str, str] = {
    "13": "Miss",
    "14": "Post",
    "15": "Attempt Saved",
    "16": "Goal",
}

# Shot-zone qualifiers are mutually exclusive → collapsed to a single string field
_SHOT_ZONE_QUALIFIER_NAMES: Dict[str, str] = {
    "16": "Small Box Centre",
    "17": "Box Centre",
    "18": "Out of Box Centre",
    "19": "35+ Centre",
    "60": "Small Box Right",
    "61": "Small Box Left",
    "62": "Box Deep Right",
    "63": "Box Right",
    "64": "Box Left",
    "65": "Box Deep Left",
    "66": "Out of Box Deep Right",
    "67": "Out of Box Right",
    "68": "Out of Box Left",
    "69": "Out of Box Deep Left",
    "70": "35+ Right",
    "71": "35+ Left",
}

# ---------------------------------------------------------------------------
# Event type groups
# ---------------------------------------------------------------------------

_PASS_TYPES: Set[str] = {"1", "2"}
_SHOT_TYPES: Set[str] = {"13", "14", "15", "16"}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _coerce_float(raw: str) -> Optional[float]:
    try:
        return float(raw)
    except (ValueError, TypeError):
        return None


def _extract_value_qualifiers(
    qual_lookup: Dict[str, str],
    value_map: Dict[str, str],
) -> Dict[str, Optional[float]]:
    return {
        field: (_coerce_float(qual_lookup[q_id]) if q_id in qual_lookup and qual_lookup[q_id] != "" else None)
        for q_id, field in value_map.items()
    }


def _extract_bool_qualifiers(
    qual_lookup: Dict[str, str],
    bool_map: Dict[str, str],
) -> Dict[str, bool]:
    return {field: (q_id in qual_lookup) for q_id, field in bool_map.items()}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def flatten_event(event: Event) -> Dict[str, Any]:
    """Return a serialisable dict for *event* with qualifiers flattened.

    The ``qualifiers`` list is dropped entirely and replaced by named fields
    whose presence and values depend on ``event.type_id``.
    """
    base: Dict[str, Any] = event.model_dump(exclude={"qualifiers"})
    qual_lookup: Dict[str, str] = {q.qualifier_id: q.value for q in event.qualifiers}

    if event.type_id in _PASS_TYPES:
        base.update(_extract_value_qualifiers(qual_lookup, _PASS_VALUE_QUALIFIERS))
        base.update(_extract_bool_qualifiers(qual_lookup, _PASS_BOOL_QUALIFIERS))

    elif event.type_id in _SHOT_TYPES:
        base["type_name"] = "shot"
        base["outcome"] = _SHOT_OUTCOME_MAP[event.type_id]
        base.update(_extract_value_qualifiers(qual_lookup, _SHOT_VALUE_QUALIFIERS))
        base.update(_extract_bool_qualifiers(qual_lookup, _SHOT_BOOL_QUALIFIERS))

        for q_id, field in _SHOT_STRING_QUALIFIERS.items():
            base[field] = qual_lookup.get(q_id)

        shot_zone: Optional[str] = next(
            (name for q_id, name in _SHOT_ZONE_QUALIFIER_NAMES.items() if q_id in qual_lookup),
            None,
        )
        base["shot_zone"] = shot_zone

    return base
