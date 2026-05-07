"""Donor-name normalization for Spanish-language records.

Two jobs:
  1. Build a canonical key so that "JUAN PÉREZ RODRÍGUEZ" and "Juan Perez
     Rodriguez, Jr." collapse to the same donor.
  2. Decide whether a row is a natural person vs. a legal entity. Only natural
     persons count toward the "largest individual donor" ranking.
"""

from __future__ import annotations

import re
import unicodedata


# Tokens that disqualify a row as a natural person. Matched as whole words
# against the uppercased, accent-stripped name.
ENTITY_MARKERS: frozenset[str] = frozenset({
    "INC",
    "LLC",
    "CORP",
    "CORPORATION",
    "CORPORACION",
    "SE",          # "Sociedad Especial"
    "SRL",
    "PSC",         # Professional Services Corporation
    "CSP",
    "LP",
    "LLP",
    "PAC",
    "COMITE",
    "COMMITTEE",
    "CGI",
    "PARTIDO",
    "FUNDACION",
    "ASOCIACION",
    "ASSOCIATION",
    "FOUNDATION",
    "UNION",
    "SINDICATO",
    "COOPERATIVA",
    "COOP",
    "BANK",
    "BANCO",
    "TRUST",
    "GROUP",
    "GRUPO",
    "HOLDINGS",
    "ENTERPRISES",
    "EMPRESA",
    "COMPANY",
    "COMPANIA",
    "CO",
    "LTD",
    "LIMITED",
})


# Suffixes stripped from the end of a name when building the canonical key.
NAME_SUFFIXES: frozenset[str] = frozenset({
    "JR", "SR", "II", "III", "IV", "HIJO", "PADRE", "MD", "PHD", "ESQ",
})


_PUNCT_RE = re.compile(r"[^\w\s]", flags=re.UNICODE)
_WS_RE = re.compile(r"\s+")


def strip_accents(text: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(ch)
    )


def clean(text: str) -> str:
    """Uppercase, strip accents and punctuation, collapse whitespace."""
    if not text:
        return ""
    out = strip_accents(text).upper()
    out = _PUNCT_RE.sub(" ", out)
    out = _WS_RE.sub(" ", out).strip()
    return out


def is_natural_person(raw_name: str) -> bool:
    """Heuristic: reject names containing entity markers as standalone tokens."""
    cleaned = clean(raw_name)
    if not cleaned:
        return False
    tokens = set(cleaned.split())
    return tokens.isdisjoint(ENTITY_MARKERS)


def canonical_key(raw_name: str) -> str:
    """Return a stable key for matching name variants to the same donor.

    Strategy: uppercase, accent-strip, drop suffixes, sort the surname tokens
    lexicographically. Sorting handles the common Spanish-name swap where
    paternal/maternal order is inconsistent across filings.
    """
    cleaned = clean(raw_name)
    if not cleaned:
        return ""
    tokens = [t for t in cleaned.split() if t not in NAME_SUFFIXES]
    if not tokens:
        return ""

    # Heuristic split: first 1-2 tokens are given names, the rest are surnames.
    # Spanish convention typically gives 1 first name + 1-2 surnames, but two
    # given names ("Juan Carlos") is common, so we treat anything past index 1
    # as surname when there are 4+ tokens.
    if len(tokens) >= 4:
        given = tokens[:2]
        surnames = tokens[2:]
    elif len(tokens) == 3:
        given = tokens[:1]
        surnames = tokens[1:]
    else:
        given = tokens[:1]
        surnames = tokens[1:]

    given_part = " ".join(given)
    surname_part = " ".join(sorted(surnames))
    return f"{surname_part}|{given_part}".strip("|")


def display_name(raw_name: str) -> str:
    """Title-case version of the cleaned name, for ranking output."""
    return " ".join(part.capitalize() for part in clean(raw_name).split())
