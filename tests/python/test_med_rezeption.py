"""Tests fuer MED Rezeption Module: Patienten, Aerzte, Termine, Wartezimmer."""

import pytest
from src.python.app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["DB_PFAD"] = ":memory:"
    if hasattr(app, "_db_conn") and app._db_conn is not None:
        app._db_conn.close()
    app._db_conn = None
    with app.test_client() as client:
        yield client
    if hasattr(app, "_db_conn") and app._db_conn is not None:
        app._db_conn.close()
        app._db_conn = None


BEISPIEL_PATIENT = {
    "vorname": "Max",
    "nachname": "Mustermann",
    "geburtsdatum": "1990-05-15",
    "versicherungsnummer": "A123456789",
    "krankenkasse": "AOK",
}

BEISPIEL_ARZT = {
    "titel": "Dr.",
    "vorname": "Hans",
    "nachname": "Schmidt",
    "fachrichtung": "Allgemeinmedizin",
}


def _patient_anlegen(client, **kwargs):
    daten = {**BEISPIEL_PATIENT, **kwargs}
    return client.post("/api/patienten", json=daten)


def _arzt_anlegen(client, **kwargs):
    daten = {**BEISPIEL_ARZT, **kwargs}
    return client.post("/api/aerzte", json=daten)


def _termin_anlegen(client, patient_id, arzt_id, **kwargs):
    daten = {
        "patient_id": patient_id,
        "arzt_id": arzt_id,
        "datum": "2026-03-01",
        "uhrzeit": "09:00",
        "dauer_minuten": 15,
        "grund": "Vorsorge",
        **kwargs,
    }
    return client.post("/api/termine", json=daten)


# ===== Patienten Tests =====

class TestPatientenCrud:
    def test_erstellen(self, client):
        resp = _patient_anlegen(client)
        assert resp.status_code == 201
        daten = resp.get_json()
        assert daten["nachricht"] == "Patient gespeichert"
        assert daten["patient"]["vorname"] == "Max"
        assert daten["patient"]["versicherungsnummer"] == "A123456789"

    def test_liste_leer(self, client):
        resp = client.get("/api/patienten")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_liste_nach_erstellen(self, client):
        _patient_anlegen(client)
        resp = client.get("/api/patienten")
        assert len(resp.get_json()) == 1

    def test_detail(self, client):
        erstellt = _patient_anlegen(client).get_json()
        pid = erstellt["patient"]["id"]
        resp = client.get(f"/api/patienten/{pid}")
        assert resp.status_code == 200
        assert resp.get_json()["nachname"] == "Mustermann"

    def test_detail_nicht_gefunden(self, client):
        resp = client.get("/api/patienten/999")
        assert resp.status_code == 404

    def test_aktualisieren(self, client):
        erstellt = _patient_anlegen(client).get_json()
        pid = erstellt["patient"]["id"]
        resp = client.put(f"/api/patienten/{pid}", json={"nachname": "Mueller"})
        assert resp.status_code == 200
        assert resp.get_json()["patient"]["nachname"] == "Mueller"

    def test_aktualisieren_nicht_gefunden(self, client):
        resp = client.put("/api/patienten/999", json={"nachname": "X"})
        assert resp.status_code == 404

    def test_loeschen(self, client):
        erstellt = _patient_anlegen(client).get_json()
        pid = erstellt["patient"]["id"]
        resp = client.delete(f"/api/patienten/{pid}")
        assert resp.status_code == 200
        assert client.get(f"/api/patienten/{pid}").status_code == 404

    def test_loeschen_nicht_gefunden(self, client):
        resp = client.delete("/api/patienten/999")
        assert resp.status_code == 404

    def test_doppelte_versicherungsnummer(self, client):
        _patient_anlegen(client)
        resp = _patient_anlegen(client, vorname="Anna")
        assert resp.status_code == 409

    def test_fehlende_pflichtfelder(self, client):
        resp = client.post("/api/patienten", json={"vorname": "Max"})
        assert resp.status_code == 422
        fehler = resp.get_json()["fehler"]
        assert any("Nachname" in f for f in fehler)

    def test_keine_daten(self, client):
        resp = client.post("/api/patienten", content_type="application/json")
        assert resp.status_code == 400

    def test_suche_nach_name(self, client):
        _patient_anlegen(client)
        _patient_anlegen(client, vorname="Anna", nachname="Meier",
                         versicherungsnummer="B987654321")
        resp = client.get("/api/patienten?suche=Mustermann")
        assert len(resp.get_json()) == 1

    def test_suche_nach_versicherungsnummer(self, client):
        _patient_anlegen(client)
        resp = client.get("/api/patienten?suche=A123")
        assert len(resp.get_json()) == 1

    def test_erstellen_mit_kontakt(self, client):
        resp = _patient_anlegen(client, telefon="030-1234567",
                                email="max@test.de", stadt="Berlin")
        assert resp.status_code == 201
        p = resp.get_json()["patient"]
        assert p["telefon"] == "030-1234567"
        assert p["stadt"] == "Berlin"


# ===== Aerzte Tests =====

class TestAerzteCrud:
    def test_erstellen(self, client):
        resp = _arzt_anlegen(client)
        assert resp.status_code == 201
        daten = resp.get_json()
        assert daten["nachricht"] == "Arzt gespeichert"
        assert daten["arzt"]["fachrichtung"] == "Allgemeinmedizin"

    def test_liste_leer(self, client):
        resp = client.get("/api/aerzte")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_liste_nach_erstellen(self, client):
        _arzt_anlegen(client)
        resp = client.get("/api/aerzte")
        assert len(resp.get_json()) == 1

    def test_detail(self, client):
        erstellt = _arzt_anlegen(client).get_json()
        aid = erstellt["arzt"]["id"]
        resp = client.get(f"/api/aerzte/{aid}")
        assert resp.status_code == 200
        assert resp.get_json()["titel"] == "Dr."

    def test_detail_nicht_gefunden(self, client):
        resp = client.get("/api/aerzte/999")
        assert resp.status_code == 404

    def test_aktualisieren(self, client):
        erstellt = _arzt_anlegen(client).get_json()
        aid = erstellt["arzt"]["id"]
        resp = client.put(f"/api/aerzte/{aid}", json={"fachrichtung": "Kardiologie"})
        assert resp.status_code == 200
        assert resp.get_json()["arzt"]["fachrichtung"] == "Kardiologie"

    def test_aktualisieren_nicht_gefunden(self, client):
        resp = client.put("/api/aerzte/999", json={"vorname": "X"})
        assert resp.status_code == 404

    def test_loeschen(self, client):
        erstellt = _arzt_anlegen(client).get_json()
        aid = erstellt["arzt"]["id"]
        resp = client.delete(f"/api/aerzte/{aid}")
        assert resp.status_code == 200
        assert client.get(f"/api/aerzte/{aid}").status_code == 404

    def test_loeschen_nicht_gefunden(self, client):
        resp = client.delete("/api/aerzte/999")
        assert resp.status_code == 404

    def test_fehlende_pflichtfelder(self, client):
        resp = client.post("/api/aerzte", json={"vorname": "Hans"})
        assert resp.status_code == 422

    def test_keine_daten(self, client):
        resp = client.post("/api/aerzte", content_type="application/json")
        assert resp.status_code == 400

    def test_erstellen_ohne_titel(self, client):
        resp = _arzt_anlegen(client, titel="")
        assert resp.status_code == 201
        assert resp.get_json()["arzt"]["titel"] == ""


# ===== Termine Tests =====

class TestTermineCrud:
    def _setup(self, client):
        p = _patient_anlegen(client).get_json()["patient"]
        a = _arzt_anlegen(client).get_json()["arzt"]
        return p["id"], a["id"]

    def test_erstellen(self, client):
        pid, aid = self._setup(client)
        resp = _termin_anlegen(client, pid, aid)
        assert resp.status_code == 201
        t = resp.get_json()["termin"]
        assert t["datum"] == "2026-03-01"
        assert t["patient_name"] == "Max Mustermann"
        assert "Schmidt" in t["arzt_name"]

    def test_liste_leer(self, client):
        resp = client.get("/api/termine")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_liste_nach_erstellen(self, client):
        pid, aid = self._setup(client)
        _termin_anlegen(client, pid, aid)
        resp = client.get("/api/termine")
        assert len(resp.get_json()) == 1

    def test_filter_nach_datum(self, client):
        pid, aid = self._setup(client)
        _termin_anlegen(client, pid, aid, datum="2026-03-01")
        _termin_anlegen(client, pid, aid, datum="2026-03-02")
        resp = client.get("/api/termine?datum=2026-03-01")
        assert len(resp.get_json()) == 1

    def test_detail(self, client):
        pid, aid = self._setup(client)
        erstellt = _termin_anlegen(client, pid, aid).get_json()
        tid = erstellt["termin"]["id"]
        resp = client.get(f"/api/termine/{tid}")
        assert resp.status_code == 200

    def test_detail_nicht_gefunden(self, client):
        resp = client.get("/api/termine/999")
        assert resp.status_code == 404

    def test_aktualisieren(self, client):
        pid, aid = self._setup(client)
        erstellt = _termin_anlegen(client, pid, aid).get_json()
        tid = erstellt["termin"]["id"]
        resp = client.put(f"/api/termine/{tid}", json={"status": "bestaetigt"})
        assert resp.status_code == 200
        assert resp.get_json()["termin"]["status"] == "bestaetigt"

    def test_aktualisieren_nicht_gefunden(self, client):
        resp = client.put("/api/termine/999", json={"status": "bestaetigt"})
        assert resp.status_code == 404

    def test_loeschen(self, client):
        pid, aid = self._setup(client)
        erstellt = _termin_anlegen(client, pid, aid).get_json()
        tid = erstellt["termin"]["id"]
        resp = client.delete(f"/api/termine/{tid}")
        assert resp.status_code == 200

    def test_loeschen_nicht_gefunden(self, client):
        resp = client.delete("/api/termine/999")
        assert resp.status_code == 404

    def test_fehlende_pflichtfelder(self, client):
        resp = client.post("/api/termine", json={"patient_id": 1})
        assert resp.status_code == 422

    def test_keine_daten(self, client):
        resp = client.post("/api/termine", content_type="application/json")
        assert resp.status_code == 400

    def test_patient_nicht_gefunden(self, client):
        _, aid = self._setup(client)
        resp = _termin_anlegen(client, 999, aid)
        assert resp.status_code == 404

    def test_arzt_nicht_gefunden(self, client):
        pid, _ = self._setup(client)
        resp = _termin_anlegen(client, pid, 999)
        assert resp.status_code == 404

    def test_default_status(self, client):
        pid, aid = self._setup(client)
        t = _termin_anlegen(client, pid, aid).get_json()["termin"]
        assert t["status"] == "geplant"

    def test_default_dauer(self, client):
        pid, aid = self._setup(client)
        resp = client.post("/api/termine", json={
            "patient_id": pid, "arzt_id": aid,
            "datum": "2026-03-01", "uhrzeit": "10:00",
        })
        assert resp.status_code == 201
        assert resp.get_json()["termin"]["dauer_minuten"] == 15


# ===== Wartezimmer Tests =====

class TestWartezimmer:
    def _setup(self, client):
        p = _patient_anlegen(client).get_json()["patient"]
        a = _arzt_anlegen(client).get_json()["arzt"]
        return p["id"], a["id"]

    def test_checkin(self, client):
        pid, _ = self._setup(client)
        resp = client.post("/api/wartezimmer", json={"patient_id": pid})
        assert resp.status_code == 201
        assert resp.get_json()["eintrag"]["status"] == "wartend"

    def test_liste_leer(self, client):
        resp = client.get("/api/wartezimmer")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_liste_nach_checkin(self, client):
        pid, _ = self._setup(client)
        client.post("/api/wartezimmer", json={"patient_id": pid})
        resp = client.get("/api/wartezimmer")
        assert len(resp.get_json()) == 1

    def test_checkin_mit_termin(self, client):
        pid, aid = self._setup(client)
        t = _termin_anlegen(client, pid, aid).get_json()["termin"]
        resp = client.post("/api/wartezimmer", json={"patient_id": pid, "termin_id": t["id"]})
        assert resp.status_code == 201
        eintrag = resp.get_json()["eintrag"]
        assert eintrag["termin_id"] == t["id"]

    def test_aufrufen(self, client):
        pid, _ = self._setup(client)
        eintrag = client.post("/api/wartezimmer", json={"patient_id": pid}).get_json()["eintrag"]
        resp = client.put(f"/api/wartezimmer/{eintrag['id']}", json={"status": "aufgerufen"})
        assert resp.status_code == 200
        assert resp.get_json()["eintrag"]["status"] == "aufgerufen"

    def test_fertig(self, client):
        pid, _ = self._setup(client)
        eintrag = client.post("/api/wartezimmer", json={"patient_id": pid}).get_json()["eintrag"]
        client.put(f"/api/wartezimmer/{eintrag['id']}", json={"status": "aufgerufen"})
        resp = client.put(f"/api/wartezimmer/{eintrag['id']}", json={"status": "fertig"})
        assert resp.status_code == 200
        # Fertige Patienten nicht mehr in der aktiven Liste
        liste = client.get("/api/wartezimmer").get_json()
        assert len(liste) == 0

    def test_ungueltiger_status(self, client):
        pid, _ = self._setup(client)
        eintrag = client.post("/api/wartezimmer", json={"patient_id": pid}).get_json()["eintrag"]
        resp = client.put(f"/api/wartezimmer/{eintrag['id']}", json={"status": "ungueltig"})
        assert resp.status_code == 400

    def test_eintrag_nicht_gefunden(self, client):
        resp = client.put("/api/wartezimmer/999", json={"status": "aufgerufen"})
        assert resp.status_code == 404

    def test_entfernen(self, client):
        pid, _ = self._setup(client)
        eintrag = client.post("/api/wartezimmer", json={"patient_id": pid}).get_json()["eintrag"]
        resp = client.delete(f"/api/wartezimmer/{eintrag['id']}")
        assert resp.status_code == 200

    def test_entfernen_nicht_gefunden(self, client):
        resp = client.delete("/api/wartezimmer/999")
        assert resp.status_code == 404

    def test_patient_nicht_gefunden(self, client):
        resp = client.post("/api/wartezimmer", json={"patient_id": 999})
        assert resp.status_code == 404

    def test_keine_daten(self, client):
        resp = client.post("/api/wartezimmer", content_type="application/json")
        assert resp.status_code == 400

    def test_fehlende_patient_id(self, client):
        resp = client.post("/api/wartezimmer", json={"termin_id": 1})
        assert resp.status_code == 422


# ===== Statische Seiten Tests =====

class TestNeueSeiten:
    def test_patienten_seite(self, client):
        resp = client.get("/patienten.html")
        assert resp.status_code == 200
        assert b"Patient anlegen" in resp.data

    def test_aerzte_seite(self, client):
        resp = client.get("/aerzte.html")
        assert resp.status_code == 200
        assert b"Arzt anlegen" in resp.data

    def test_termine_seite(self, client):
        resp = client.get("/termine.html")
        assert resp.status_code == 200
        assert b"Termin anlegen" in resp.data

    def test_wartezimmer_seite(self, client):
        resp = client.get("/wartezimmer.html")
        assert resp.status_code == 200
        assert b"Wartezimmer" in resp.data
