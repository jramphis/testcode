import csv
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pr_donor_pipeline.aggregate import aggregate, rank, write_ranking_csv  # noqa: E402
from pr_donor_pipeline.config import FIELD_MAP  # noqa: E402


def _write_csv(path: Path, rows: list[dict]) -> None:
    cols = [
        FIELD_MAP["donor_name"],
        FIELD_MAP["amount"],
        FIELD_MAP["donation_date"],
        FIELD_MAP["donation_type"],
        FIELD_MAP["recipient_committee"],
        FIELD_MAP["recipient_party"],
        FIELD_MAP["recipient_kind"],
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})


def _row(name, amount, date="2020-06-01", dtype="monetario", recipient="Comité X",
         party="PNP", kind="candidato"):
    return {
        FIELD_MAP["donor_name"]: name,
        FIELD_MAP["amount"]: str(amount),
        FIELD_MAP["donation_date"]: date,
        FIELD_MAP["donation_type"]: dtype,
        FIELD_MAP["recipient_committee"]: recipient,
        FIELD_MAP["recipient_party"]: party,
        FIELD_MAP["recipient_kind"]: kind,
    }


class AggregateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_collapses_name_variants_and_sums(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Juan Pérez Rodríguez", 1000),
            _row("JUAN PEREZ RODRIGUEZ", 2500),
            _row("Juan Pérez Rodríguez, Jr.", 500),
        ])
        totals = aggregate([("2020", path)])
        self.assertEqual(len(totals), 1)
        only = next(iter(totals.values()))
        self.assertEqual(only.total, 4000.0)
        self.assertEqual(only.count, 3)

    def test_excludes_legal_entities(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Juan Pérez Rodríguez", 1000),
            _row("Acme Corp", 999_999),
            _row("Comité Amigos de Juan", 50_000),
        ])
        totals = aggregate([("2020", path)])
        self.assertEqual(len(totals), 1)
        only = next(iter(totals.values()))
        self.assertEqual(only.total, 1000.0)

    def test_buckets_by_recipient_kind_and_donation_type(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Ana Vega Soto", 1000, kind="candidato", dtype="monetario"),
            _row("Ana Vega Soto", 500, kind="partido", dtype="monetario"),
            _row("Ana Vega Soto", 750, kind="cgi", dtype="monetario"),
            _row("Ana Vega Soto", 250, kind="candidato", dtype="en especie"),
        ])
        totals = aggregate([("2020", path)])
        d = next(iter(totals.values()))
        self.assertEqual(d.by_recipient_kind["direct_to_candidate"], 1250.0)
        self.assertEqual(d.by_recipient_kind["party_committee"], 500.0)
        self.assertEqual(d.by_recipient_kind["cgi"], 750.0)
        self.assertEqual(d.by_donation_type["monetary"], 2250.0)
        self.assertEqual(d.by_donation_type["in_kind"], 250.0)

    def test_multi_cycle_aggregation(self):
        p2016 = self.dir / "donations-2016.csv"
        p2020 = self.dir / "donations-2020.csv"
        p2024 = self.dir / "donations-2024.csv"
        _write_csv(p2016, [_row("Carlos Méndez Vega", 5000, date="2015-09-01")])
        _write_csv(p2020, [_row("Carlos Méndez Vega", 7500, date="2019-09-01")])
        _write_csv(p2024, [_row("Carlos Méndez Vega", 12000, date="2023-09-01")])
        totals = aggregate([("2016", p2016), ("2020", p2020), ("2024", p2024)])
        d = next(iter(totals.values()))
        self.assertEqual(d.total, 24500.0)
        self.assertEqual(d.by_cycle["2016"], 5000.0)
        self.assertEqual(d.by_cycle["2020"], 7500.0)
        self.assertEqual(d.by_cycle["2024"], 12000.0)

    def test_rank_orders_descending(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Ana Vega Soto", 1000),
            _row("Bruno Lima Cruz", 5000),
            _row("Carla Rosa Diaz", 3000),
        ])
        totals = aggregate([("2020", path)])
        ranked = rank(totals)
        self.assertEqual([d.total for d in ranked], [5000.0, 3000.0, 1000.0])
        self.assertEqual(ranked[0].display, "Bruno Lima Cruz")

    def test_handles_dollar_signs_and_commas(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Ana Vega Soto", "$1,500.00"),
            _row("Ana Vega Soto", "2,000"),
        ])
        totals = aggregate([("2020", path)])
        d = next(iter(totals.values()))
        self.assertEqual(d.total, 3500.0)

    def test_skips_zero_and_negative_amounts(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Ana Vega Soto", 0),
            _row("Ana Vega Soto", -500),
            _row("Ana Vega Soto", 1000),
        ])
        totals = aggregate([("2020", path)])
        d = next(iter(totals.values()))
        self.assertEqual(d.total, 1000.0)
        self.assertEqual(d.count, 1)

    def test_writes_ranking_csv(self):
        path = self.dir / "donations-2020.csv"
        _write_csv(path, [
            _row("Ana Vega Soto", 1000),
            _row("Bruno Lima Cruz", 5000),
        ])
        totals = aggregate([("2020", path)])
        ranked = rank(totals)
        out = self.dir / "ranking.csv"
        write_ranking_csv(ranked, out)
        with out.open(encoding="utf-8") as f:
            lines = list(csv.reader(f))
        self.assertEqual(lines[0][:3], ["rank", "donor", "total_usd"])
        self.assertEqual(lines[1][1], "Bruno Lima Cruz")
        self.assertEqual(lines[1][2], "5000.00")


if __name__ == "__main__":
    unittest.main()
