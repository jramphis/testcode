"""Aggregate donations by canonical donor and rank by total contribution.

Reads the raw per-cycle CSVs produced by scrape.py, normalizes donor names,
filters to natural persons, and sums contributions across the four buckets
the user defined: direct-to-candidate, party committees, CGIs, and in-kind.
"""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from .config import (
    CYCLES,
    DONATION_TYPE_BUCKETS,
    FIELD_MAP,
    RECIPIENT_KIND_BUCKETS,
)
from .normalize import canonical_key, clean, display_name, is_natural_person


@dataclass
class DonorTotals:
    canonical: str
    display: str
    total: float = 0.0
    count: int = 0
    by_recipient_kind: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    by_donation_type: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    by_cycle: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    top_recipients: Counter = field(default_factory=Counter)
    raw_name_variants: set[str] = field(default_factory=set)


def _parse_amount(value: str) -> float:
    if not value:
        return 0.0
    s = value.replace("$", "").replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def _bucket_recipient_kind(raw: str) -> str:
    cleaned = clean(raw).lower()
    for token, bucket in RECIPIENT_KIND_BUCKETS.items():
        if token in cleaned:
            return bucket
    return "other"


def _bucket_donation_type(raw: str) -> str:
    cleaned = clean(raw).lower()
    for token, bucket in DONATION_TYPE_BUCKETS.items():
        if token in cleaned:
            return bucket
    return "monetary"  # default assumption when type is missing


def _row_value(row: dict, canonical_field: str) -> str:
    raw_col = FIELD_MAP[canonical_field]
    return (row.get(raw_col) or "").strip()


def aggregate(raw_files: Iterable[tuple[str, Path]]) -> dict[str, DonorTotals]:
    """Build {canonical_key: DonorTotals} across all cycle files.

    raw_files: iterable of (cycle_name, csv_path) pairs.
    """
    totals: dict[str, DonorTotals] = {}

    for cycle_name, path in raw_files:
        if not path.exists() or path.stat().st_size == 0:
            continue
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_name = _row_value(row, "donor_name")
                if not raw_name or not is_natural_person(raw_name):
                    continue

                key = canonical_key(raw_name)
                if not key:
                    continue

                amount = _parse_amount(_row_value(row, "amount"))
                if amount <= 0:
                    continue

                td = totals.get(key)
                if td is None:
                    td = DonorTotals(canonical=key, display=display_name(raw_name))
                    totals[key] = td

                td.total += amount
                td.count += 1
                td.by_cycle[cycle_name] += amount
                td.by_donation_type[_bucket_donation_type(_row_value(row, "donation_type"))] += amount
                td.by_recipient_kind[_bucket_recipient_kind(_row_value(row, "recipient_kind"))] += amount
                td.raw_name_variants.add(raw_name)
                recipient = _row_value(row, "recipient_committee") or _row_value(row, "recipient_party")
                if recipient:
                    td.top_recipients[recipient] += amount

    return totals


def rank(totals: dict[str, DonorTotals], top_n: int = 25) -> list[DonorTotals]:
    return sorted(totals.values(), key=lambda d: d.total, reverse=True)[:top_n]


def write_ranking_csv(ranked: list[DonorTotals], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cycle_names = [c.name for c in CYCLES]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "rank", "donor", "total_usd", "donation_count",
            "direct_to_candidate", "party_committee", "cgi", "other_recipient",
            "monetary", "in_kind",
            *[f"cycle_{c}" for c in cycle_names],
            "top_recipient", "name_variants",
        ])
        for i, d in enumerate(ranked, start=1):
            top_rec = d.top_recipients.most_common(1)
            writer.writerow([
                i,
                d.display,
                f"{d.total:.2f}",
                d.count,
                f"{d.by_recipient_kind.get('direct_to_candidate', 0):.2f}",
                f"{d.by_recipient_kind.get('party_committee', 0):.2f}",
                f"{d.by_recipient_kind.get('cgi', 0):.2f}",
                f"{d.by_recipient_kind.get('other', 0):.2f}",
                f"{d.by_donation_type.get('monetary', 0):.2f}",
                f"{d.by_donation_type.get('in_kind', 0):.2f}",
                *[f"{d.by_cycle.get(c, 0):.2f}" for c in cycle_names],
                top_rec[0][0] if top_rec else "",
                " | ".join(sorted(d.raw_name_variants)),
            ])
