"""Romanized Hindi -> Devanagari for Hinglish scripts.

Parler/IndicF5 expect Devanagari; the scripts come in casual romanized Hinglish
("Kya tumne kabhi socha hai... Follow SoulStarr"). We transliterate Hindi words
while preserving English brand/keyword tokens so they stay readable.

Uses AI4Bharat IndicXlit when available; otherwise passes text through unchanged.
"""
from __future__ import annotations

import re

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
# English tokens to keep verbatim (brand names, CTAs that should stay English).
_KEEP = {"soulstarr", "follow", "subscribe", "like", "share", "codegraph", "subclasscard"}

_engine = None
_engine_failed = False


def has_devanagari(text: str) -> bool:
    return bool(_DEVANAGARI.search(text))


def _get_engine():
    global _engine, _engine_failed
    if _engine is not None or _engine_failed:
        return _engine
    try:
        from ai4bharat.transliteration import XlitEngine

        _engine = XlitEngine("hi", beam_width=4, src_script_type="roman")
    except Exception:
        _engine_failed = True
        _engine = None
    return _engine


def _xlit_word(word: str, engine) -> str:
    # Keep pure-ASCII brand/keyword tokens and anything non-alphabetic untouched.
    core = re.sub(r"[^A-Za-z]", "", word)
    if not core or core.lower() in _KEEP:
        return word
    try:
        out = engine.translit_word(core.lower(), topk=1)
        deva = out[0] if isinstance(out, list) else out
    except Exception:
        return word
    # Re-attach surrounding punctuation.
    prefix = word[: len(word) - len(word.lstrip("\"'(["))]
    suffix = word[len(word.rstrip("\"').,!?…:;]")):]
    return f"{prefix}{deva}{suffix}"


def to_devanagari(text: str) -> str:
    """Best-effort romanized-Hindi -> Devanagari. No-op if already Devanagari
    or if IndicXlit is unavailable."""
    if has_devanagari(text):
        return text
    engine = _get_engine()
    if engine is None:
        return text
    return " ".join(_xlit_word(w, engine) for w in text.split())
