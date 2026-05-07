"""Configuration for OCE data source, election cycles, and field mapping.

The OCE publishes campaign-finance disclosure data on a Socrata portal at
data.oce.pr.gov. The "Donaciones" dataset (id: kdwd-nb6g) is the canonical
source for individual contributions.

If OCE renames columns or splits the dataset, edit FIELD_MAP below — every
other module reads donations through the canonical names defined here.
"""

from dataclasses import dataclass


SOCRATA_DOMAIN = "data.oce.pr.gov"
DONATIONS_DATASET_ID = "kdwd-nb6g"


@dataclass(frozen=True)
class Cycle:
    name: str
    start: str  # ISO date, inclusive
    end: str    # ISO date, inclusive


# Puerto Rico general elections are quadrennial (Nov 2016, Nov 2020, Nov 2024).
# A "cycle" here covers the four years leading up to and including each election,
# which captures primaries, the general, and any post-election reconciliation.
CYCLES: tuple[Cycle, ...] = (
    Cycle(name="2016", start="2013-01-01", end="2016-12-31"),
    Cycle(name="2020", start="2017-01-01", end="2020-12-31"),
    Cycle(name="2024", start="2021-01-01", end="2024-12-31"),
)


# Canonical field names used everywhere downstream. Keys are canonical;
# values are the raw column names returned by the Socrata API. Verify by
# fetching `https://data.oce.pr.gov/api/views/kdwd-nb6g.json` once and
# updating any names that differ.
FIELD_MAP: dict[str, str] = {
    "donor_name": "nombre_donante",
    "donor_occupation": "ocupacion",
    "amount": "cantidad",
    "donation_date": "fecha_donacion",
    "donation_type": "tipo_donativo",       # monetario / en_especie
    "recipient_committee": "comite",
    "recipient_party": "partido",
    "recipient_kind": "tipo_comite",        # candidato / partido / cgi
    "municipality": "municipio",
}


# Donation-type tokens mapped to the four buckets the user asked us to count.
# Raw values are matched case-insensitively after accent stripping.
DONATION_TYPE_BUCKETS: dict[str, str] = {
    "monetario": "monetary",
    "efectivo": "monetary",
    "cheque": "monetary",
    "en especie": "in_kind",
    "especie": "in_kind",
    "in-kind": "in_kind",
    "in kind": "in_kind",
}


# Recipient-kind tokens → contribution-scope bucket.
RECIPIENT_KIND_BUCKETS: dict[str, str] = {
    "candidato": "direct_to_candidate",
    "aspirante": "direct_to_candidate",
    "partido": "party_committee",
    "comite de partido": "party_committee",
    "comite central": "party_committee",
    "cgi": "cgi",
    "comite de gastos independientes": "cgi",
    "independent expenditure": "cgi",
}
