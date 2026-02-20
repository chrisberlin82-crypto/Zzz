"""Tests fuer die Flask Web-App (inkl. CRUD)."""

import pytest
from src.python.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["DB_PFAD"] = ":memory:"
    # Frische DB-Verbindung fuer jeden Test
    if hasattr(app, "_db_conn") and app._db_conn is not None:
        app._db_conn.close()
    app._db_conn = None
    with app.test_client() as client:
        yield client
    if hasattr(app, "_db_conn") and app._db_conn is not None:
        app._db_conn.close()
        app._db_conn = None


class TestApiBerechnen:
    def test_addieren(self, client):
        resp = client.post("/api/berechnen", json={"a": 2, "b": 3, "operation": "addieren"})
        assert resp.status_code == 200
        assert resp.get_json()["ergebnis"] == 5

    def test_subtrahieren(self, client):
        resp = client.post("/api/berechnen", json={"a": 10, "b": 4, "operation": "subtrahieren"})
        assert resp.status_code == 200
        assert resp.get_json()["ergebnis"] == 6

    def test_multiplizieren(self, client):
        resp = client.post("/api/berechnen", json={"a": 3, "b": 7, "operation": "multiplizieren"})
        assert resp.status_code == 200
        assert resp.get_json()["ergebnis"] == 21

    def test_dividieren(self, client):
        resp = client.post("/api/berechnen", json={"a": 15, "b": 3, "operation": "dividieren"})
        assert resp.status_code == 200
        assert resp.get_json()["ergebnis"] == 5.0

    def test_division_durch_null(self, client):
        resp = client.post("/api/berechnen", json={"a": 10, "b": 0, "operation": "dividieren"})
        assert resp.status_code == 400
        assert "Null" in resp.get_json()["fehler"]

    def test_unbekannte_operation(self, client):
        resp = client.post("/api/berechnen", json={"a": 1, "b": 2, "operation": "wurzel"})
        assert resp.status_code == 400

    def test_fehlende_felder(self, client):
        resp = client.post("/api/berechnen", json={"a": 1})
        assert resp.status_code == 400

    def test_keine_daten(self, client):
        resp = client.post("/api/berechnen", content_type="application/json")
        assert resp.status_code == 400


class TestApiBenutzerCrud:
    def _benutzer_anlegen(self, client, name="Max", email="max@beispiel.de"):
        return client.post("/api/benutzer", json={"name": name, "email": email, "alter": 30})

    def test_erstellen(self, client):
        resp = self._benutzer_anlegen(client)
        assert resp.status_code == 201
        daten = resp.get_json()
        assert daten["nachricht"] == "Benutzer gespeichert"
        assert daten["benutzer"]["id"] is not None

    def test_liste_leer(self, client):
        resp = client.get("/api/benutzer")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_liste_nach_erstellen(self, client):
        self._benutzer_anlegen(client)
        resp = client.get("/api/benutzer")
        assert len(resp.get_json()) == 1

    def test_ungueltige_daten(self, client):
        resp = client.post("/api/benutzer", json={"name": "", "alter": "kein_int"})
        assert resp.status_code == 422

    def test_detail(self, client):
        erstellt = self._benutzer_anlegen(client).get_json()
        benutzer_id = erstellt["benutzer"]["id"]
        resp = client.get(f"/api/benutzer/{benutzer_id}")
        assert resp.status_code == 200
        assert resp.get_json()["name"] == "Max"

    def test_detail_nicht_gefunden(self, client):
        resp = client.get("/api/benutzer/999")
        assert resp.status_code == 404

    def test_aktualisieren(self, client):
        erstellt = self._benutzer_anlegen(client).get_json()
        benutzer_id = erstellt["benutzer"]["id"]
        resp = client.put(f"/api/benutzer/{benutzer_id}", json={"name": "Moritz"})
        assert resp.status_code == 200
        assert resp.get_json()["benutzer"]["name"] == "Moritz"

    def test_aktualisieren_nicht_gefunden(self, client):
        resp = client.put("/api/benutzer/999", json={"name": "X"})
        assert resp.status_code == 404

    def test_aktualisieren_keine_daten(self, client):
        erstellt = self._benutzer_anlegen(client).get_json()
        benutzer_id = erstellt["benutzer"]["id"]
        resp = client.put(f"/api/benutzer/{benutzer_id}", content_type="application/json")
        assert resp.status_code == 400

    def test_loeschen(self, client):
        erstellt = self._benutzer_anlegen(client).get_json()
        benutzer_id = erstellt["benutzer"]["id"]
        resp = client.delete(f"/api/benutzer/{benutzer_id}")
        assert resp.status_code == 200
        assert "geloescht" in resp.get_json()["nachricht"]
        # Pruefen dass weg
        resp2 = client.get(f"/api/benutzer/{benutzer_id}")
        assert resp2.status_code == 404

    def test_loeschen_nicht_gefunden(self, client):
        resp = client.delete("/api/benutzer/999")
        assert resp.status_code == 404

    def test_doppelte_email(self, client):
        self._benutzer_anlegen(client, email="doppelt@test.de")
        resp = self._benutzer_anlegen(client, name="Anderer", email="doppelt@test.de")
        assert resp.status_code == 409


class TestStatischeDateien:
    def test_index_seite(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"Zzz Rechner" in resp.data

    def test_benutzer_seite(self, client):
        resp = client.get("/benutzer.html")
        assert resp.status_code == 200
        assert b"Benutzer anlegen" in resp.data
