import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pr_donor_pipeline.normalize import (  # noqa: E402
    canonical_key,
    clean,
    is_natural_person,
    strip_accents,
)


class StripAccentsTest(unittest.TestCase):
    def test_removes_spanish_accents(self):
        self.assertEqual(strip_accents("Pérez"), "Perez")
        self.assertEqual(strip_accents("Muñoz"), "Munoz")
        self.assertEqual(strip_accents("Rodríguez-Núñez"), "Rodriguez-Nunez")


class CleanTest(unittest.TestCase):
    def test_uppercases_and_strips_punctuation(self):
        self.assertEqual(clean("Juan Pérez, Jr."), "JUAN PEREZ JR")
        self.assertEqual(clean("  María  De  Los  Ángeles  "), "MARIA DE LOS ANGELES")

    def test_empty(self):
        self.assertEqual(clean(""), "")
        self.assertEqual(clean(None or ""), "")


class IsNaturalPersonTest(unittest.TestCase):
    def test_accepts_individual_names(self):
        self.assertTrue(is_natural_person("Juan Pérez Rodríguez"))
        self.assertTrue(is_natural_person("MARIA DEL CARMEN SANTIAGO"))

    def test_rejects_legal_entities(self):
        self.assertFalse(is_natural_person("Acme Corp"))
        self.assertFalse(is_natural_person("Bufete García LLC"))
        self.assertFalse(is_natural_person("Comité Amigos de Juan"))
        self.assertFalse(is_natural_person("Fundación Pérez"))
        self.assertFalse(is_natural_person("Banco Popular"))

    def test_rejects_empty(self):
        self.assertFalse(is_natural_person(""))


class CanonicalKeyTest(unittest.TestCase):
    def test_collapses_accent_and_case_variants(self):
        a = canonical_key("Juan Pérez Rodríguez")
        b = canonical_key("JUAN PEREZ RODRIGUEZ")
        c = canonical_key("juan perez rodriguez")
        self.assertEqual(a, b)
        self.assertEqual(b, c)

    def test_collapses_suffix_variants(self):
        a = canonical_key("Juan Pérez Rodríguez")
        b = canonical_key("Juan Pérez Rodríguez, Jr.")
        c = canonical_key("Juan Pérez Rodríguez Hijo")
        self.assertEqual(a, b)
        self.assertEqual(b, c)

    def test_collapses_surname_order_swap(self):
        # OCE filings sometimes record paternal/maternal in different orders.
        a = canonical_key("Juan Pérez Rodríguez")
        b = canonical_key("Juan Rodríguez Pérez")
        self.assertEqual(a, b)

    def test_distinguishes_different_people(self):
        a = canonical_key("Juan Pérez Rodríguez")
        b = canonical_key("María Pérez Rodríguez")
        self.assertNotEqual(a, b)

    def test_two_given_names_treated_as_given(self):
        # "Juan Carlos" should be the given name, not split into the surname bucket.
        a = canonical_key("Juan Carlos Pérez Rodríguez")
        b = canonical_key("Juan Carlos Rodríguez Pérez")
        self.assertEqual(a, b)
        # And different from Juan-only:
        c = canonical_key("Juan Pérez Rodríguez")
        self.assertNotEqual(a, c)

    def test_empty_input(self):
        self.assertEqual(canonical_key(""), "")
        self.assertEqual(canonical_key("   "), "")


if __name__ == "__main__":
    unittest.main()
