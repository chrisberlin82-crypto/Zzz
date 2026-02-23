"""Tests fuer die Flask Web-App (inkl. CRUD)."""

import pytest
from unittest.mock import patch
from src.python.app import app
from src.python import llm_service


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

    def test_erstellen_mit_adresse(self, client):
        resp = client.post("/api/benutzer", json={
            "name": "Anna", "email": "anna@test.de", "alter": 25,
            "strasse": "Hauptstr. 1", "plz": "10115", "stadt": "Berlin",
        })
        assert resp.status_code == 201
        benutzer = resp.get_json()["benutzer"]
        assert benutzer["name"] == "Anna"

    def test_erstellen_ungueltige_plz(self, client):
        resp = client.post("/api/benutzer", json={
            "name": "Max", "email": "max@test.de", "alter": 30,
            "plz": "ABC",
        })
        assert resp.status_code == 422


class TestApiVerlauf:
    def test_verlauf_leer(self, client):
        resp = client.get("/api/verlauf")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_verlauf_nach_berechnung(self, client):
        client.post("/api/berechnen", json={"a": 2, "b": 3, "operation": "addieren"})
        resp = client.get("/api/verlauf")
        assert resp.status_code == 200
        eintraege = resp.get_json()
        assert len(eintraege) == 1
        assert eintraege[0]["ergebnis"] == 5.0

    def test_verlauf_mehrere(self, client):
        client.post("/api/berechnen", json={"a": 2, "b": 3, "operation": "addieren"})
        client.post("/api/berechnen", json={"a": 10, "b": 5, "operation": "subtrahieren"})
        resp = client.get("/api/verlauf")
        assert len(resp.get_json()) == 2

    def test_verlauf_loeschen(self, client):
        client.post("/api/berechnen", json={"a": 1, "b": 1, "operation": "addieren"})
        resp = client.delete("/api/verlauf")
        assert resp.status_code == 200
        assert "geloescht" in resp.get_json()["nachricht"]
        # Verlauf ist jetzt leer
        resp2 = client.get("/api/verlauf")
        assert resp2.get_json() == []

    def test_verlauf_limit(self, client):
        for i in range(5):
            client.post("/api/berechnen", json={"a": i, "b": 1, "operation": "addieren"})
        resp = client.get("/api/verlauf?limit=3")
        assert len(resp.get_json()) == 3


class TestApiBenutzerSuche:
    def _benutzer_anlegen(self, client, name="Max", email="max@beispiel.de"):
        return client.post("/api/benutzer", json={
            "name": name, "email": email, "alter": 30
        })

    def test_suche_nach_name(self, client):
        self._benutzer_anlegen(client, name="Max Mueller", email="max@t.de")
        self._benutzer_anlegen(client, name="Anna Meier", email="anna@t.de")
        resp = client.get("/api/benutzer?suche=Max")
        assert resp.status_code == 200
        ergebnis = resp.get_json()
        assert len(ergebnis) == 1
        assert ergebnis[0]["name"] == "Max Mueller"

    def test_suche_nach_email(self, client):
        self._benutzer_anlegen(client, email="max@beispiel.de")
        resp = client.get("/api/benutzer?suche=beispiel")
        assert len(resp.get_json()) == 1

    def test_suche_nach_stadt(self, client):
        # Benutzer erstellen und per PUT mit Stadt aktualisieren
        resp1 = self._benutzer_anlegen(client, email="a@t.de")
        resp2 = self._benutzer_anlegen(client, name="Bob", email="b@t.de")
        id1 = resp1.get_json()["benutzer"]["id"]
        id2 = resp2.get_json()["benutzer"]["id"]
        client.put(f"/api/benutzer/{id1}", json={"stadt": "Berlin"})
        client.put(f"/api/benutzer/{id2}", json={"stadt": "Hamburg"})
        resp = client.get("/api/benutzer?suche=Hamburg")
        ergebnis = resp.get_json()
        assert len(ergebnis) == 1
        assert ergebnis[0]["name"] == "Bob"

    def test_suche_ohne_treffer(self, client):
        self._benutzer_anlegen(client)
        resp = client.get("/api/benutzer?suche=xyz_nicht_vorhanden")
        assert resp.get_json() == []

    def test_suche_leer_gibt_alle(self, client):
        self._benutzer_anlegen(client, email="a@t.de")
        self._benutzer_anlegen(client, name="Bob", email="b@t.de")
        resp = client.get("/api/benutzer?suche=")
        assert len(resp.get_json()) == 2


class TestStatischeDateien:
    def test_index_seite(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"MED Rezeption" in resp.data

    def test_benutzer_seite(self, client):
        resp = client.get("/benutzer.html")
        assert resp.status_code == 200
        assert b"Benutzer anlegen" in resp.data


class TestApiLlmStatus:
    def test_status_ohne_key(self, client):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            resp = client.get("/api/llm/status")
            assert resp.status_code == 200
            daten = resp.get_json()
            assert daten["verfuegbar"] is False
            assert daten["modus"] == "demo"
            assert "branchen" in daten

    def test_status_mit_key(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"):
            resp = client.get("/api/llm/status")
            daten = resp.get_json()
            assert daten["verfuegbar"] is True
            assert daten["modus"] == "live"


class TestApiBranchen:
    def test_branchen_liste(self, client):
        resp = client.get("/api/branchen")
        assert resp.status_code == 200
        daten = resp.get_json()
        assert "arztpraxis" in daten
        assert "anwalt" in daten


class TestApiChat:
    def test_chat_ohne_text(self, client):
        resp = client.post("/api/chat", json={})
        assert resp.status_code == 400

    def test_chat_ohne_llm(self, client):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            resp = client.post("/api/chat", json={"text": "Hallo"})
            assert resp.status_code == 503

    def test_chat_erfolgreich(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Guten Tag!"}):
            resp = client.post("/api/chat", json={"text": "Hallo"})
            assert resp.status_code == 200
            assert resp.get_json()["antwort"] == "Guten Tag!"

    def test_chat_mit_verlauf(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "OK"}):
            resp = client.post("/api/chat", json={
                "text": "Weiter",
                "verlauf": [{"role": "user", "content": "Hallo"}],
                "branche": "zahnarzt",
                "firmen_name": "TestPraxis",
            })
            assert resp.status_code == 200

    def test_chat_llm_fehler(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Timeout"}):
            resp = client.post("/api/chat", json={"text": "Hallo"})
            assert resp.status_code == 500


class TestApiVoicebotDialog:
    def test_dialog_ohne_daten(self, client):
        resp = client.post("/api/voicebot/dialog", content_type="application/json")
        assert resp.status_code == 400

    def test_dialog_ohne_llm(self, client):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            resp = client.post("/api/voicebot/dialog", json={"eingabe": "1"})
            assert resp.status_code == 503

    def test_dialog_erfolgreich(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"antwort": '{"text":"OK","aktion":"weiter","daten":{}}'}):
            resp = client.post("/api/voicebot/dialog", json={
                "eingabe": "1",
                "schritt": 0,
                "dialog_typ": "termin",
            })
            assert resp.status_code == 200

    def test_dialog_fehler(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Fehler"}):
            resp = client.post("/api/voicebot/dialog", json={"eingabe": "1"})
            assert resp.status_code == 500


class TestApiUebersetzen:
    def test_ohne_text(self, client):
        resp = client.post("/api/uebersetzen", json={})
        assert resp.status_code == 400

    def test_ohne_llm(self, client):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            resp = client.post("/api/uebersetzen", json={"text": "Hallo"})
            assert resp.status_code == 503

    def test_uebersetzen_erfolgreich(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Hello"}):
            resp = client.post("/api/uebersetzen", json={
                "text": "Hallo",
                "von": "de",
                "nach": "en",
            })
            assert resp.status_code == 200
            assert resp.get_json()["uebersetzung"] == "Hello"

    def test_uebersetzen_fehler(self, client):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Timeout"}):
            resp = client.post("/api/uebersetzen", json={"text": "Hallo"})
            assert resp.status_code == 500
