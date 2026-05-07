"""Paginated downloader for the OCE Donaciones Socrata dataset.

Socrata caps a single response at 50,000 rows; we paginate with
`$limit` + `$offset` and a stable `$order` to avoid drift.

Designed for re-runnability: each cycle is written to its own CSV under
data/raw/. Re-running skips cycles whose file already exists unless
`force=True`.
"""

from __future__ import annotations

import csv
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable, Iterator

from .config import CYCLES, DONATIONS_DATASET_ID, SOCRATA_DOMAIN, Cycle


PAGE_SIZE = 50_000
MAX_RETRIES = 5
USER_AGENT = "pr-donor-pipeline/0.1 (research; +https://oce.pr.gov)"


def _resource_url(fmt: str = "json") -> str:
    return f"https://{SOCRATA_DOMAIN}/resource/{DONATIONS_DATASET_ID}.{fmt}"


def _build_query(cycle: Cycle, offset: int, limit: int = PAGE_SIZE) -> str:
    # Field name for date is canonical-mapped; we use the raw OCE name in $where.
    # Using the configured raw column keeps the SoQL valid even if we later
    # rename canonical keys.
    from .config import FIELD_MAP

    date_col = FIELD_MAP["donation_date"]
    where = f"{date_col} between '{cycle.start}T00:00:00' and '{cycle.end}T23:59:59'"
    params = {
        "$where": where,
        "$order": f"{date_col} ASC, :id ASC",
        "$limit": str(limit),
        "$offset": str(offset),
    }
    return urllib.parse.urlencode(params)


def _fetch_page(query: str) -> list[dict]:
    url = f"{_resource_url('json')}?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})

    delay = 2.0
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(delay)
                delay *= 2
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(delay)
            delay *= 2
    raise RuntimeError(f"Failed to fetch page after {MAX_RETRIES} retries: {last_err}")


def _iter_cycle(cycle: Cycle) -> Iterator[dict]:
    offset = 0
    while True:
        page = _fetch_page(_build_query(cycle, offset))
        if not page:
            return
        for row in page:
            yield row
        if len(page) < PAGE_SIZE:
            return
        offset += PAGE_SIZE


def fetch_cycle(cycle: Cycle, out_dir: Path, force: bool = False) -> Path:
    """Download one cycle to data/raw/donations-{cycle.name}.csv. Returns the path."""
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"donations-{cycle.name}.csv"
    if out_path.exists() and not force:
        return out_path

    rows = _iter_cycle(cycle)
    first = next(rows, None)
    if first is None:
        # Write empty file with no header so downstream can detect "no data".
        out_path.write_text("")
        return out_path

    fieldnames = list(first.keys())
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerow(first)
        for row in rows:
            # Schema can drift mid-paginate (Socrata adds nulls); restrict to known fields.
            writer.writerow({k: row.get(k, "") for k in fieldnames})
    return out_path


def fetch_all(out_dir: Path, cycles: Iterable[Cycle] = CYCLES, force: bool = False) -> list[Path]:
    return [fetch_cycle(c, out_dir, force=force) for c in cycles]
