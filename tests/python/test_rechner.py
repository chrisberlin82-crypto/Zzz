"""Tests für das Rechner-Modul."""

import json
import tempfile
from pathlib import Path

import pytest

from src.python.rechner import (
    addieren,
    dividieren,
    json_laden,
    json_speichern,
    multiplizieren,
    subtrahieren,
)


class TestAddieren:
    def test_positive_zahlen(self):
        assert addieren(2, 3) == 5

    def test_negative_zahlen(self):
        assert addieren(-1, -2) == -3

    def test_null(self):
        assert addieren(0, 0) == 0

    def test_dezimalzahlen(self):
        assert addieren(1.5, 2.5) == 4.0


class TestSubtrahieren:
    def test_positive_zahlen(self):
        assert subtrahieren(5, 3) == 2

    def test_negatives_ergebnis(self):
        assert subtrahieren(3, 5) == -2


class TestMultiplizieren:
    def test_positive_zahlen(self):
        assert multiplizieren(3, 4) == 12

    def test_mit_null(self):
        assert multiplizieren(5, 0) == 0

    def test_negative_zahlen(self):
        assert multiplizieren(-2, -3) == 6


class TestDividieren:
    def test_ganzzahl_ergebnis(self):
        assert dividieren(10, 2) == 5.0

    def test_dezimal_ergebnis(self):
        assert dividieren(7, 2) == 3.5

    def test_division_durch_null(self):
        with pytest.raises(ValueError, match="Division durch Null"):
            dividieren(10, 0)


class TestJsonLaden:
    def test_gueltige_datei(self, tmp_path):
        datei = tmp_path / "test.json"
        datei.write_text('{"name": "Test"}', encoding="utf-8")
        ergebnis = json_laden(str(datei))
        assert ergebnis == {"name": "Test"}

    def test_datei_nicht_gefunden(self):
        with pytest.raises(FileNotFoundError):
            json_laden("/nicht/vorhanden.json")


class TestJsonSpeichern:
    def test_speichern_und_laden(self, tmp_path):
        datei = tmp_path / "ausgabe.json"
        daten = {"schluessel": "wert", "zahl": 42}
        json_speichern(daten, str(datei))

        with open(datei, encoding="utf-8") as f:
            geladen = json.load(f)
        assert geladen == daten
