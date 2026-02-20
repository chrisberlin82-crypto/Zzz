"""Tests fuer die SQLite-Datenbankschicht."""

import pytest
import tempfile
import os

from src.python.datenbank import (
    verbindung_herstellen, tabellen_erstellen,
    benutzer_erstellen, benutzer_alle, benutzer_nach_id,
    benutzer_aktualisieren, benutzer_loeschen, benutzer_suchen,
    berechnung_speichern, verlauf_laden, verlauf_loeschen,
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


class TestBenutzerSuchen:
    def test_suche_nach_name(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "Max Mustermann", "email": "max@t.de", "alter": 30})
        benutzer_erstellen(db_conn, {"name": "Anna Meier", "email": "anna@t.de", "alter": 25})
        ergebnis = benutzer_suchen(db_conn, "Max")
        assert len(ergebnis) == 1
        assert ergebnis[0]["name"] == "Max Mustermann"

    def test_suche_nach_email(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "Max", "email": "max@beispiel.de", "alter": 30})
        ergebnis = benutzer_suchen(db_conn, "beispiel")
        assert len(ergebnis) == 1
        assert ergebnis[0]["email"] == "max@beispiel.de"

    def test_suche_nach_stadt(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "Max", "email": "max@t.de", "alter": 30, "stadt": "Berlin"})
        benutzer_erstellen(db_conn, {"name": "Anna", "email": "anna@t.de", "alter": 25, "stadt": "Hamburg"})
        ergebnis = benutzer_suchen(db_conn, "Berlin")
        assert len(ergebnis) == 1
        assert ergebnis[0]["stadt"] == "Berlin"

    def test_suche_ohne_treffer(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "Max", "email": "max@t.de", "alter": 30})
        ergebnis = benutzer_suchen(db_conn, "xyz_nicht_vorhanden")
        assert len(ergebnis) == 0

    def test_suche_mehrere_treffer(self, db_conn):
        benutzer_erstellen(db_conn, {"name": "Max Mueller", "email": "max@t.de", "alter": 30})
        benutzer_erstellen(db_conn, {"name": "Maximilian", "email": "maxi@t.de", "alter": 20})
        ergebnis = benutzer_suchen(db_conn, "Max")
        assert len(ergebnis) == 2


class TestBerechnungSpeichern:
    def test_speichern_gibt_dict_zurueck(self, db_conn):
        eintrag = berechnung_speichern(db_conn, 2.0, 3.0, "addieren", 5.0)
        assert eintrag["a"] == 2.0
        assert eintrag["b"] == 3.0
        assert eintrag["operation"] == "addieren"
        assert eintrag["ergebnis"] == 5.0
        assert eintrag["id"] is not None

    def test_speichern_mehrere(self, db_conn):
        berechnung_speichern(db_conn, 1.0, 2.0, "addieren", 3.0)
        berechnung_speichern(db_conn, 10.0, 5.0, "subtrahieren", 5.0)
        eintraege = verlauf_laden(db_conn)
        assert len(eintraege) == 2


class TestVerlaufLaden:
    def test_leer(self, db_conn):
        assert verlauf_laden(db_conn) == []

    def test_reihenfolge_absteigend(self, db_conn):
        berechnung_speichern(db_conn, 1.0, 1.0, "addieren", 2.0)
        berechnung_speichern(db_conn, 2.0, 2.0, "addieren", 4.0)
        eintraege = verlauf_laden(db_conn)
        assert eintraege[0]["ergebnis"] == 4.0  # neuester zuerst
        assert eintraege[1]["ergebnis"] == 2.0

    def test_limit(self, db_conn):
        for i in range(5):
            berechnung_speichern(db_conn, float(i), 1.0, "addieren", float(i + 1))
        eintraege = verlauf_laden(db_conn, limit=3)
        assert len(eintraege) == 3


class TestVerlaufLoeschen:
    def test_loeschen_gibt_anzahl(self, db_conn):
        berechnung_speichern(db_conn, 1.0, 2.0, "addieren", 3.0)
        berechnung_speichern(db_conn, 3.0, 4.0, "addieren", 7.0)
        anzahl = verlauf_loeschen(db_conn)
        assert anzahl == 2
        assert verlauf_laden(db_conn) == []

    def test_loeschen_leer(self, db_conn):
        anzahl = verlauf_loeschen(db_conn)
        assert anzahl == 0


class TestVerbindungDatei:
    def test_erstellt_verzeichnis(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pfad = os.path.join(tmpdir, "sub", "test.db")
            conn = verbindung_herstellen(pfad)
            tabellen_erstellen(conn)
            benutzer_erstellen(conn, {"name": "Test", "email": "t@t.de", "alter": 1})
            assert len(benutzer_alle(conn)) == 1
            conn.close()
