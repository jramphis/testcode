# pr-donor-pipeline

A reproducible pipeline that identifies the **single largest individual donor
to political campaigns in Puerto Rico** across the 2016, 2020, and 2024
election cycles, using public filings from the Oficina del Contralor
Electoral (OCE).

## Scope

- **Donor type**: natural persons only. Legal entities (corporations, PACs,
  party committees, foundations, unions, banks, etc.) are excluded.
- **Recipient scope**: contributions to candidate committees, party
  committees, and *comités de gastos independientes* (CGIs, the local
  Super-PAC analog) are all counted toward a donor's total.
- **Contribution kind**: monetary contributions and in-kind contributions
  (reported at fair market value) are both counted.
- **Time window**: three cycles — 2013-2016, 2017-2020, 2021-2024.

## Data source

OCE publishes campaign-finance disclosures on a Socrata open-data portal at
`data.oce.pr.gov`. The canonical donations dataset is **`kdwd-nb6g`**
(["Donaciones"](https://data.oce.pr.gov/Donaciones/Donaciones/kdwd-nb6g)).

The pipeline pulls via the SODA REST API:

```
https://data.oce.pr.gov/resource/kdwd-nb6g.json
  ?$where=fecha_donacion between '2013-01-01T00:00:00' and '2016-12-31T23:59:59'
  &$order=fecha_donacion ASC, :id ASC
  &$limit=50000
  &$offset=0
```

Pages of 50,000 are fetched until exhaustion, with exponential-backoff retry
on 429/5xx.

## Verifying the schema before first run

OCE has historically renamed columns. Before the first `fetch`, run:

```bash
curl -s 'https://data.oce.pr.gov/api/views/kdwd-nb6g.json' | jq '.columns[].fieldName'
```

and compare the output to `FIELD_MAP` in
[`src/pr_donor_pipeline/config.py`](src/pr_donor_pipeline/config.py). If any
canonical key maps to a column that no longer exists, edit the mapping —
nothing else should need to change.

## Install

No third-party dependencies. Standard library only, Python 3.10+.

```bash
pip install -e .
```

(or run the modules directly with `PYTHONPATH=src python3 -m pr_donor_pipeline.cli ...`)

## Run

Full pipeline:

```bash
pr-donors all
```

Step by step:

```bash
pr-donors fetch              # download raw filings to data/raw/
pr-donors analyze --top 25   # aggregate, rank, print, write data/processed/ranking.csv
```

Re-fetch a cycle you've already pulled:

```bash
pr-donors fetch --force
```

## Output

- `data/raw/donations-{cycle}.csv` — one CSV per cycle, raw OCE columns.
- `data/processed/ranking.csv` — top-N donors with totals broken down by
  recipient kind, donation type, and cycle, plus the raw name variants the
  pipeline collapsed into each donor.
- Stdout: the leader's totals plus the top-N table.

## Methodology

1. **Filter to natural persons.** Rows whose donor name contains tokens like
   `INC`, `LLC`, `CORP`, `COMITE`, `PAC`, `FUNDACION`, `BANCO`, etc., are
   dropped before aggregation. See `ENTITY_MARKERS` in
   [`normalize.py`](src/pr_donor_pipeline/normalize.py).
2. **Build a canonical donor key.** Names are uppercased, accent-stripped,
   suffix-stripped (`JR`, `SR`, `HIJO`, etc.), then split into given names and
   surnames. Surnames are sorted lexicographically so that paternal/maternal
   order swaps collapse to one donor. See `canonical_key()`.
3. **Sum across all four buckets.** For each donor, contributions are summed
   regardless of whether they went to a candidate, party, or CGI, and
   regardless of whether they were monetary or in-kind. Per-bucket totals are
   preserved in the output CSV for transparency.
4. **Rank by aggregate dollar amount, descending.** The donor at rank 1 is
   the answer to the research question.

## Known limitations

- **Name normalization is heuristic.** Two distinct people who share given
  name + both surnames will collide. Two filings for the same person where
  one uses a middle initial and the other doesn't may not collide. Inspect
  the `name_variants` column of `ranking.csv` to spot-check the top entries
  before publishing any finding.
- **In-kind valuations are reported by the donor.** OCE does not independently
  appraise them. A donor with high in-kind totals may be overstated relative
  to one whose support is purely monetary.
- **CGIs only became significant after 2014.** The 2016 cycle has thinner CGI
  data than 2020 or 2024.
- **The schema-mapping in `config.py` reflects field names as documented at
  build time.** OCE column renames will require updating `FIELD_MAP`. The
  pipeline does not auto-discover schema.

## Tests

```bash
python3 -m unittest discover tests -v
```

20 tests cover name normalization (accent/case/suffix/order folding,
entity-vs-person detection) and aggregation (multi-cycle sums, bucket
splits, currency parsing, CSV output).

## Layout

```
src/pr_donor_pipeline/
  config.py      # cycles, dataset id, field mapping
  scrape.py      # paginated Socrata downloader
  normalize.py   # name canonicalization + entity filter
  aggregate.py   # group, sum, rank, write CSV
  cli.py         # `pr-donors {fetch,analyze,all}`
tests/           # unittest suite
data/raw/        # downloaded per-cycle CSVs (gitignored)
data/processed/  # ranking.csv (gitignored)
```
