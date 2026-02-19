"""Tests für die Flask Web-App."""

import pytest
from src.python.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


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


class TestApiBenutzer:
    def test_benutzer_erstellen(self, client):
        benutzer = {"name": "Max", "email": "max@beispiel.de", "alter": 30}
        resp = client.post("/api/benutzer", json=benutzer)
        assert resp.status_code == 201
        assert resp.get_json()["nachricht"] == "Benutzer gespeichert"

    def test_ungueltige_daten(self, client):
        benutzer = {"name": "", "alter": "kein_int"}
        resp = client.post("/api/benutzer", json=benutzer)
        assert resp.status_code == 422

    def test_benutzer_liste(self, client):
        resp = client.get("/api/benutzer")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)


class TestStatischeDateien:
    def test_index_seite(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"Zzz Rechner" in resp.data

    def test_benutzer_seite(self, client):
        resp = client.get("/benutzer.html")
        assert resp.status_code == 200
        assert b"Benutzer anlegen" in resp.data
