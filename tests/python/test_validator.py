"""Tests für das Validator-Modul."""

from pathlib import Path

import pytest

from src.python.validator import ist_gueltig, schema_laden, validieren

SCHEMA_PFAD = Path(__file__).resolve().parent.parent.parent / "src" / "json" / "schemas" / "benutzer.json"


@pytest.fixture
def benutzer_schema():
    return schema_laden(str(SCHEMA_PFAD))


class TestSchemaLaden:
    def test_schema_laden(self):
        schema = schema_laden(str(SCHEMA_PFAD))
        assert schema["title"] == "Benutzer"
        assert "properties" in schema


class TestValidieren:
    def test_gueltiger_benutzer(self, benutzer_schema):
        daten = {"name": "Max Mustermann", "email": "max@beispiel.de", "alter": 30}
        fehler = validieren(daten, benutzer_schema)
        assert fehler == []

    def test_fehlender_name(self, benutzer_schema):
        daten = {"email": "max@beispiel.de", "alter": 30}
        fehler = validieren(daten, benutzer_schema)
        assert any("name" in f for f in fehler)

    def test_ungueltiges_alter(self, benutzer_schema):
        daten = {"name": "Max", "email": "max@beispiel.de", "alter": -5}
        fehler = validieren(daten, benutzer_schema)
        assert len(fehler) > 0

    def test_zusaetzliche_felder(self, benutzer_schema):
        daten = {"name": "Max", "email": "max@beispiel.de", "alter": 30, "extra": "feld"}
        fehler = validieren(daten, benutzer_schema)
        assert len(fehler) > 0

    def test_mit_adresse(self, benutzer_schema):
        daten = {
            "name": "Max",
            "email": "max@beispiel.de",
            "alter": 30,
            "adresse": {"strasse": "Hauptstr. 1", "plz": "12345", "stadt": "Berlin"},
        }
        fehler = validieren(daten, benutzer_schema)
        assert fehler == []

    def test_ungueltige_plz(self, benutzer_schema):
        daten = {
            "name": "Max",
            "email": "max@beispiel.de",
            "alter": 30,
            "adresse": {"strasse": "Hauptstr. 1", "plz": "ABC", "stadt": "Berlin"},
        }
        fehler = validieren(daten, benutzer_schema)
        assert len(fehler) > 0


class TestIstGueltig:
    def test_gueltig(self, benutzer_schema):
        daten = {"name": "Max", "email": "max@beispiel.de", "alter": 25}
        assert ist_gueltig(daten, benutzer_schema) is True

    def test_ungueltig(self, benutzer_schema):
        daten = {"name": "", "alter": "kein_int"}
        assert ist_gueltig(daten, benutzer_schema) is False
