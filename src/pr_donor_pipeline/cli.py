"""Command-line entry point: fetch, analyze, or run the full pipeline."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .aggregate import aggregate, rank, write_ranking_csv
from .config import CYCLES
from .scrape import fetch_all


def _default_data_dir() -> Path:
    # Walks up to find the repo's data/ directory, falling back to CWD/data.
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "data").is_dir():
            return parent / "data"
    return Path.cwd() / "data"


def cmd_fetch(args: argparse.Namespace) -> int:
    out_dir = Path(args.data_dir) / "raw"
    paths = fetch_all(out_dir, force=args.force)
    for p in paths:
        print(f"wrote {p}")
    return 0


def cmd_analyze(args: argparse.Namespace) -> int:
    raw_dir = Path(args.data_dir) / "raw"
    files = [(c.name, raw_dir / f"donations-{c.name}.csv") for c in CYCLES]
    missing = [str(p) for _, p in files if not p.exists()]
    if missing:
        print(f"missing raw cycle files: {missing}. Run `pr-donors fetch` first.", file=sys.stderr)
        return 2

    totals = aggregate(files)
    ranked = rank(totals, top_n=args.top)

    out_csv = Path(args.data_dir) / "processed" / "ranking.csv"
    write_ranking_csv(ranked, out_csv)
    print(f"wrote {out_csv}")

    if not ranked:
        print("no donors found in input.")
        return 0

    leader = ranked[0]
    print()
    print(f"Largest individual donor across {CYCLES[0].name}-{CYCLES[-1].name}: {leader.display}")
    print(f"  Total contributions: ${leader.total:,.2f} across {leader.count} donations")
    print(f"  By cycle: " + ", ".join(f"{c}=${leader.by_cycle.get(c, 0):,.0f}" for c in (x.name for x in CYCLES)))
    print(f"  Direct: ${leader.by_recipient_kind.get('direct_to_candidate', 0):,.0f}  "
          f"Party: ${leader.by_recipient_kind.get('party_committee', 0):,.0f}  "
          f"CGI: ${leader.by_recipient_kind.get('cgi', 0):,.0f}  "
          f"In-kind: ${leader.by_donation_type.get('in_kind', 0):,.0f}")
    print()
    print(f"Top {args.top} (full table at {out_csv}):")
    for i, d in enumerate(ranked, start=1):
        print(f"  {i:>3}. {d.display:<40} ${d.total:>14,.2f}  ({d.count} donations)")
    return 0


def cmd_all(args: argparse.Namespace) -> int:
    rc = cmd_fetch(args)
    if rc != 0:
        return rc
    return cmd_analyze(args)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pr-donors", description=__doc__)
    p.add_argument("--data-dir", default=str(_default_data_dir()),
                   help="Root directory for raw/processed data (default: repo data/).")
    sub = p.add_subparsers(dest="command", required=True)

    f = sub.add_parser("fetch", help="Download OCE Donaciones for all configured cycles.")
    f.add_argument("--force", action="store_true", help="Re-download even if a cycle file already exists.")
    f.set_defaults(func=cmd_fetch)

    a = sub.add_parser("analyze", help="Aggregate raw cycle files and rank donors.")
    a.add_argument("--top", type=int, default=25, help="How many ranked donors to print and write.")
    a.set_defaults(func=cmd_analyze)

    al = sub.add_parser("all", help="Fetch then analyze.")
    al.add_argument("--force", action="store_true")
    al.add_argument("--top", type=int, default=25)
    al.set_defaults(func=cmd_all)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
