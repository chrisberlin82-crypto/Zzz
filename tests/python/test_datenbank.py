"""Tests fuer die SQLite-Datenbankschicht."""

import pytest
import tempfile
import os

from src.python.datenbank import (
    verbindung_herstellen, tabellen_erstellen,
    benutzer_erstellen, benutzer_alle, benutzer_nach_id,
    benutzer_aktualisieren, benutzer_loeschen,
)


@pytest.fixture
def db_conn():
    """Erstellt eine temporaere In-Memory-Datenbank fuer Tests."""
    conn = verbindung_herstellen(":memory:")
    tabellen_erstellen(conn)
    yield conn
    conn.close()


@pytest.fixture
def beispiel_benutzer():
    return {"name": "Max Mustermann", "email": "max@beispiel.de", "alter": 30}


class TestTabellenErstellen:
    def test_tabelle_existiert(self, db_conn):
        result = db_conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='benutzer'"
        ).fetchone()
        assert result is not None

    def test_doppelt_erstellen_ohne_fehler(self, db_conn):
        tabellen_erstellen(db_conn)  # nochmal ausfuehren


class TestBenutzerErstellen:
    def test_erstellen_gibt_id_zurueck(self, db_conn, beispiel_benutzer):
        benutzer = benutzer_erstellen(db_conn, beispiel_benutzer)
        assert benutzer["id"] is not None
        assert benutzer["name"] == "Max Mustermann"
        assert benutzer["email"] == "max@beispiel.de"
        assert benutzer["alter"] == 30

    def test_erstellen_mit_adresse(self, db_conn):
        daten = {
            "name": "Anna", "email": "anna@test.de", "alter": 25,
            "strasse": "Hauptstr. 1", "plz": "10115", "stadt": "Berlin",
        }
        benutzer = benutzer_erstellen(db_conn, daten)
        assert benutzer["stadt"] == "Berlin"
        assert benutzer["plz"] == "10115"

    def test_doppelte_email_wirft_fehler(self, db_conn, beispiel_benutzer):
        benutzer_erstellen(db_conn, beispiel_benutzer)
        import sqlite3
        with pytest.raises(sqlite3.IntegrityError):
            benutzer_erstellen(db_conn, beispiel_benutzer)


class TestBenutzerAlle:
    def test_leere_liste(self, db_conn):
        assert benutzer_alle(db_conn) == []

    def test_mehrere_benutzer(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "A", "email": "a@t.de", "alter": 20})
        benutzer_erstellen(db_conn, {"name": "B", "email": "b@t.de", "alter": 30})
        alle = benutzer_alle(db_conn)
        assert len(alle) == 2
        assert alle[0]["name"] == "A"
        assert alle[1]["name"] == "B"


class TestBenutzerNachId:
    def test_existiert(self, db_conn, beispiel_benutzer):
        erstellt = benutzer_erstellen(db_conn, beispiel_benutzer)
        gefunden = benutzer_nach_id(db_conn, erstellt["id"])
        assert gefunden["name"] == "Max Mustermann"

    def test_existiert_nicht(self, db_conn):
        assert benutzer_nach_id(db_conn, 999) is None


class TestBenutzerAktualisieren:
    def test_name_aendern(self, db_conn, beispiel_benutzer):
        erstellt = benutzer_erstellen(db_conn, beispiel_benutzer)
        aktualisiert = benutzer_aktualisieren(db_conn, erstellt["id"], {"name": "Moritz"})
        assert aktualisiert["name"] == "Moritz"
        assert aktualisiert["email"] == "max@beispiel.de"  # unveraendert

    def test_email_aendern(self, db_conn, beispiel_benutzer):
        erstellt = benutzer_erstellen(db_conn, beispiel_benutzer)
        aktualisiert = benutzer_aktualisieren(db_conn, erstellt["id"], {"email": "neu@test.de"})
        assert aktualisiert["email"] == "neu@test.de"

    def test_leere_aenderung(self, db_conn, beispiel_benutzer):
        erstellt = benutzer_erstellen(db_conn, beispiel_benutzer)
        aktualisiert = benutzer_aktualisieren(db_conn, erstellt["id"], {})
        assert aktualisiert["name"] == "Max Mustermann"


class TestBenutzerLoeschen:
    def test_loeschen_erfolgreich(self, db_conn, beispiel_benutzer):
        erstellt = benutzer_erstellen(db_conn, beispiel_benutzer)
        assert benutzer_loeschen(db_conn, erstellt["id"]) is True
        assert benutzer_nach_id(db_conn, erstellt["id"]) is None

    def test_loeschen_nicht_vorhanden(self, db_conn):
        assert benutzer_loeschen(db_conn, 999) is False


class TestVerbindungDatei:
    def test_erstellt_verzeichnis(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pfad = os.path.join(tmpdir, "sub", "test.db")
            conn = verbindung_herstellen(pfad)
            tabellen_erstellen(conn)
            benutzer_erstellen(conn, {"name": "Test", "email": "t@t.de", "alter": 1})
            assert len(benutzer_alle(conn)) == 1
            conn.close()
