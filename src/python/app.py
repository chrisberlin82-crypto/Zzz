"""Flask Web-App fuer MED Rezeption."""

import sqlite3
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path

from src.python.rechner import addieren, subtrahieren, multiplizieren, dividieren
from src.python.validator import schema_laden, validieren
from src.python.llm_service import (
    chat_antwort, voicebot_dialog, uebersetzen as llm_uebersetzen,
    llm_verfuegbar, branchen_liste, BRANCHEN,
)
from src.python.datenbank import (
    verbindung_herstellen, tabellen_erstellen,
    benutzer_erstellen, benutzer_alle, benutzer_nach_id,
    benutzer_aktualisieren, benutzer_loeschen, benutzer_suchen,
    berechnung_speichern, verlauf_laden, verlauf_loeschen,
    patient_erstellen, patient_alle, patient_nach_id,
    patient_aktualisieren, patient_loeschen, patient_suchen,
    arzt_erstellen, arzt_alle, arzt_nach_id,
    arzt_aktualisieren, arzt_loeschen, arzt_suchen,
    termin_erstellen, termin_alle, termin_nach_id,
    termin_aktualisieren, termin_loeschen,
    wartezimmer_hinzufuegen, wartezimmer_aktuelle, wartezimmer_nach_id,
    wartezimmer_status_aendern, wartezimmer_entfernen,
    agent_erstellen, agent_alle, agent_nach_id,
    agent_aktualisieren, agent_loeschen, agent_status_setzen,
    anruf_erstellen, anruf_alle, anruf_nach_id,
    anruf_aktualisieren, anruf_loeschen, anruf_aktive,
)

app = Flask(__name__, static_folder=str(Path(__file__).resolve().parent.parent / "html"))

SCHEMA_PFAD = Path(__file__).resolve().parent.parent / "json" / "schemas" / "benutzer.json"


def db():
    """Gibt eine DB-Verbindung zurueck (pro Request)."""
    if not hasattr(app, "_db_conn") or app._db_conn is None:
        db_pfad = app.config.get("DB_PFAD")
        app._db_conn = verbindung_herstellen(db_pfad)
        tabellen_erstellen(app._db_conn)
    return app._db_conn


# --- Statische Dateien ---

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:dateiname>")
def statische_dateien(dateiname):
    return send_from_directory(app.static_folder, dateiname)


# --- Rechner API ---

@app.route("/api/berechnen", methods=["POST"])
def api_berechnen():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    a = daten.get("a")
    b = daten.get("b")
    operation = daten.get("operation")

    if a is None or b is None or not operation:
        return jsonify({"fehler": "a, b und operation sind erforderlich"}), 400

    operationen = {
        "addieren": addieren,
        "subtrahieren": subtrahieren,
        "multiplizieren": multiplizieren,
        "dividieren": dividieren,
    }

    if operation not in operationen:
        return jsonify({"fehler": f"Unbekannte Operation: {operation}"}), 400

    try:
        ergebnis = operationen[operation](float(a), float(b))
        berechnung_speichern(db(), float(a), float(b), operation, ergebnis)
        return jsonify({"ergebnis": ergebnis})
    except ValueError as e:
        return jsonify({"fehler": str(e)}), 400


# --- Verlauf API ---

@app.route("/api/verlauf", methods=["GET"])
def api_verlauf():
    limit = request.args.get("limit", 20, type=int)
    return jsonify(verlauf_laden(db(), limit))


@app.route("/api/verlauf", methods=["DELETE"])
def api_verlauf_loeschen():
    anzahl = verlauf_loeschen(db())
    return jsonify({"nachricht": f"{anzahl} Eintraege geloescht"})


# --- Benutzer API (CRUD) ---

@app.route("/api/benutzer", methods=["GET"])
def api_benutzer_liste():
    suche = request.args.get("suche", "").strip()
    if suche:
        return jsonify(benutzer_suchen(db(), suche))
    return jsonify(benutzer_alle(db()))


@app.route("/api/benutzer", methods=["POST"])
def api_benutzer_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    schema = schema_laden(str(SCHEMA_PFAD))
    fehler = validieren(daten, schema)

    if fehler:
        return jsonify({"fehler": fehler}), 422

    try:
        benutzer = benutzer_erstellen(db(), daten)
        return jsonify({"nachricht": "Benutzer gespeichert", "benutzer": benutzer}), 201
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["E-Mail-Adresse existiert bereits"]}), 409


@app.route("/api/benutzer/<int:benutzer_id>", methods=["GET"])
def api_benutzer_detail(benutzer_id):
    benutzer = benutzer_nach_id(db(), benutzer_id)
    if not benutzer:
        return jsonify({"fehler": "Benutzer nicht gefunden"}), 404
    return jsonify(benutzer)


@app.route("/api/benutzer/<int:benutzer_id>", methods=["PUT"])
def api_benutzer_aktualisieren_route(benutzer_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    benutzer = benutzer_nach_id(db(), benutzer_id)
    if not benutzer:
        return jsonify({"fehler": "Benutzer nicht gefunden"}), 404

    try:
        aktualisiert = benutzer_aktualisieren(db(), benutzer_id, daten)
        return jsonify({"nachricht": "Benutzer aktualisiert", "benutzer": aktualisiert})
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["E-Mail-Adresse existiert bereits"]}), 409


@app.route("/api/benutzer/<int:benutzer_id>", methods=["DELETE"])
def api_benutzer_loeschen_route(benutzer_id):
    if benutzer_loeschen(db(), benutzer_id):
        return jsonify({"nachricht": "Benutzer geloescht"})
    return jsonify({"fehler": "Benutzer nicht gefunden"}), 404


# --- Patienten API ---

@app.route("/api/patienten", methods=["GET"])
def api_patienten_liste():
    suche = request.args.get("suche", "").strip()
    if suche:
        return jsonify(patient_suchen(db(), suche))
    return jsonify(patient_alle(db()))


@app.route("/api/patienten", methods=["POST"])
def api_patient_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    fehler = []
    if not daten.get("vorname"):
        fehler.append("Vorname ist erforderlich")
    if not daten.get("nachname"):
        fehler.append("Nachname ist erforderlich")
    if not daten.get("geburtsdatum"):
        fehler.append("Geburtsdatum ist erforderlich")
    if not daten.get("versicherungsnummer"):
        fehler.append("Versicherungsnummer ist erforderlich")
    if not daten.get("krankenkasse"):
        fehler.append("Krankenkasse ist erforderlich")

    if fehler:
        return jsonify({"fehler": fehler}), 422

    try:
        patient = patient_erstellen(db(), daten)
        return jsonify({"nachricht": "Patient gespeichert", "patient": patient}), 201
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["Versicherungsnummer existiert bereits"]}), 409


@app.route("/api/patienten/<int:patient_id>", methods=["GET"])
def api_patient_detail(patient_id):
    patient = patient_nach_id(db(), patient_id)
    if not patient:
        return jsonify({"fehler": "Patient nicht gefunden"}), 404
    return jsonify(patient)


@app.route("/api/patienten/<int:patient_id>", methods=["PUT"])
def api_patient_aktualisieren_route(patient_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    patient = patient_nach_id(db(), patient_id)
    if not patient:
        return jsonify({"fehler": "Patient nicht gefunden"}), 404

    try:
        aktualisiert = patient_aktualisieren(db(), patient_id, daten)
        return jsonify({"nachricht": "Patient aktualisiert", "patient": aktualisiert})
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["Versicherungsnummer existiert bereits"]}), 409


@app.route("/api/patienten/<int:patient_id>", methods=["DELETE"])
def api_patient_loeschen_route(patient_id):
    if patient_loeschen(db(), patient_id):
        return jsonify({"nachricht": "Patient geloescht"})
    return jsonify({"fehler": "Patient nicht gefunden"}), 404


# --- Aerzte API ---

@app.route("/api/aerzte", methods=["GET"])
def api_aerzte_liste():
    suche = request.args.get("suche", "").strip()
    if suche:
        return jsonify(arzt_suchen(db(), suche))
    return jsonify(arzt_alle(db()))


@app.route("/api/aerzte", methods=["POST"])
def api_arzt_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    fehler = []
    if not daten.get("vorname"):
        fehler.append("Vorname ist erforderlich")
    if not daten.get("nachname"):
        fehler.append("Nachname ist erforderlich")
    if not daten.get("fachrichtung"):
        fehler.append("Fachrichtung ist erforderlich")

    if fehler:
        return jsonify({"fehler": fehler}), 422

    arzt = arzt_erstellen(db(), daten)
    return jsonify({"nachricht": "Arzt gespeichert", "arzt": arzt}), 201


@app.route("/api/aerzte/<int:arzt_id>", methods=["GET"])
def api_arzt_detail(arzt_id):
    arzt = arzt_nach_id(db(), arzt_id)
    if not arzt:
        return jsonify({"fehler": "Arzt nicht gefunden"}), 404
    return jsonify(arzt)


@app.route("/api/aerzte/<int:arzt_id>", methods=["PUT"])
def api_arzt_aktualisieren_route(arzt_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    arzt = arzt_nach_id(db(), arzt_id)
    if not arzt:
        return jsonify({"fehler": "Arzt nicht gefunden"}), 404

    aktualisiert = arzt_aktualisieren(db(), arzt_id, daten)
    return jsonify({"nachricht": "Arzt aktualisiert", "arzt": aktualisiert})


@app.route("/api/aerzte/<int:arzt_id>", methods=["DELETE"])
def api_arzt_loeschen_route(arzt_id):
    if arzt_loeschen(db(), arzt_id):
        return jsonify({"nachricht": "Arzt geloescht"})
    return jsonify({"fehler": "Arzt nicht gefunden"}), 404


# --- Termine API ---

@app.route("/api/termine", methods=["GET"])
def api_termine_liste():
    datum = request.args.get("datum", "").strip()
    return jsonify(termin_alle(db(), datum or None))


@app.route("/api/termine", methods=["POST"])
def api_termin_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    fehler = []
    if not daten.get("patient_id"):
        fehler.append("Patient ist erforderlich")
    if not daten.get("arzt_id"):
        fehler.append("Arzt ist erforderlich")
    if not daten.get("datum"):
        fehler.append("Datum ist erforderlich")
    if not daten.get("uhrzeit"):
        fehler.append("Uhrzeit ist erforderlich")

    if fehler:
        return jsonify({"fehler": fehler}), 422

    if daten.get("patient_id") and not patient_nach_id(db(), daten["patient_id"]):
        return jsonify({"fehler": ["Patient nicht gefunden"]}), 404
    if daten.get("arzt_id") and not arzt_nach_id(db(), daten["arzt_id"]):
        return jsonify({"fehler": ["Arzt nicht gefunden"]}), 404

    termin = termin_erstellen(db(), daten)
    return jsonify({"nachricht": "Termin gespeichert", "termin": termin}), 201


@app.route("/api/termine/<int:termin_id>", methods=["GET"])
def api_termin_detail(termin_id):
    termin = termin_nach_id(db(), termin_id)
    if not termin:
        return jsonify({"fehler": "Termin nicht gefunden"}), 404
    return jsonify(termin)


@app.route("/api/termine/<int:termin_id>", methods=["PUT"])
def api_termin_aktualisieren_route(termin_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    termin = termin_nach_id(db(), termin_id)
    if not termin:
        return jsonify({"fehler": "Termin nicht gefunden"}), 404

    aktualisiert = termin_aktualisieren(db(), termin_id, daten)
    return jsonify({"nachricht": "Termin aktualisiert", "termin": aktualisiert})


@app.route("/api/termine/<int:termin_id>", methods=["DELETE"])
def api_termin_loeschen_route(termin_id):
    if termin_loeschen(db(), termin_id):
        return jsonify({"nachricht": "Termin geloescht"})
    return jsonify({"fehler": "Termin nicht gefunden"}), 404


# --- Wartezimmer API ---

@app.route("/api/wartezimmer", methods=["GET"])
def api_wartezimmer_liste():
    return jsonify(wartezimmer_aktuelle(db()))


@app.route("/api/wartezimmer", methods=["POST"])
def api_wartezimmer_hinzufuegen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    if not daten.get("patient_id"):
        return jsonify({"fehler": ["Patient ist erforderlich"]}), 422

    if not patient_nach_id(db(), daten["patient_id"]):
        return jsonify({"fehler": ["Patient nicht gefunden"]}), 404

    eintrag = wartezimmer_hinzufuegen(db(), daten)
    return jsonify({"nachricht": "Patient eingecheckt", "eintrag": eintrag}), 201


@app.route("/api/wartezimmer/<int:eintrag_id>", methods=["PUT"])
def api_wartezimmer_status_route(eintrag_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    eintrag = wartezimmer_nach_id(db(), eintrag_id)
    if not eintrag:
        return jsonify({"fehler": "Eintrag nicht gefunden"}), 404

    neuer_status = daten.get("status")
    if neuer_status not in ("wartend", "aufgerufen", "in_behandlung", "fertig"):
        return jsonify({"fehler": "Ungueltiger Status"}), 400

    aktualisiert = wartezimmer_status_aendern(db(), eintrag_id, neuer_status)
    return jsonify({"nachricht": "Status aktualisiert", "eintrag": aktualisiert})


@app.route("/api/wartezimmer/<int:eintrag_id>/status", methods=["PUT"])
def api_wartezimmer_status_sub_route(eintrag_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    eintrag = wartezimmer_nach_id(db(), eintrag_id)
    if not eintrag:
        return jsonify({"fehler": "Eintrag nicht gefunden"}), 404

    neuer_status = daten.get("status")
    if neuer_status not in ("wartend", "aufgerufen", "in_behandlung", "fertig"):
        return jsonify({"fehler": "Ungueltiger Status"}), 400

    aktualisiert = wartezimmer_status_aendern(db(), eintrag_id, neuer_status)
    return jsonify({"nachricht": "Status aktualisiert", "eintrag": aktualisiert})


@app.route("/api/wartezimmer/<int:eintrag_id>", methods=["DELETE"])
def api_wartezimmer_entfernen_route(eintrag_id):
    if wartezimmer_entfernen(db(), eintrag_id):
        return jsonify({"nachricht": "Eintrag entfernt"})
    return jsonify({"fehler": "Eintrag nicht gefunden"}), 404


# --- Agenten API ---

@app.route("/api/agenten", methods=["GET"])
def api_agenten_liste():
    return jsonify(agent_alle(db()))


@app.route("/api/agenten", methods=["POST"])
def api_agent_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    fehler = []
    if not daten.get("name"):
        fehler.append("Name ist erforderlich")
    if not daten.get("nebenstelle"):
        fehler.append("Nebenstelle ist erforderlich")
    if not daten.get("sip_passwort"):
        fehler.append("SIP-Passwort ist erforderlich")

    if fehler:
        return jsonify({"fehler": fehler}), 422

    try:
        agent = agent_erstellen(db(), daten)
        return jsonify({"nachricht": "Agent gespeichert", "agent": agent}), 201
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["Nebenstelle existiert bereits"]}), 409


@app.route("/api/agenten/<int:agent_id>", methods=["GET"])
def api_agent_detail(agent_id):
    agent = agent_nach_id(db(), agent_id)
    if not agent:
        return jsonify({"fehler": "Agent nicht gefunden"}), 404
    return jsonify(agent)


@app.route("/api/agenten/<int:agent_id>", methods=["PUT"])
def api_agent_aktualisieren_route(agent_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    agent = agent_nach_id(db(), agent_id)
    if not agent:
        return jsonify({"fehler": "Agent nicht gefunden"}), 404

    try:
        aktualisiert = agent_aktualisieren(db(), agent_id, daten)
        return jsonify({"nachricht": "Agent aktualisiert", "agent": aktualisiert})
    except sqlite3.IntegrityError:
        return jsonify({"fehler": ["Nebenstelle existiert bereits"]}), 409


@app.route("/api/agenten/<int:agent_id>", methods=["DELETE"])
def api_agent_loeschen_route(agent_id):
    if agent_loeschen(db(), agent_id):
        return jsonify({"nachricht": "Agent geloescht"})
    return jsonify({"fehler": "Agent nicht gefunden"}), 404


@app.route("/api/agenten/<int:agent_id>/status", methods=["PUT"])
def api_agent_status_route(agent_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    agent = agent_nach_id(db(), agent_id)
    if not agent:
        return jsonify({"fehler": "Agent nicht gefunden"}), 404

    neuer_status = daten.get("status")
    if neuer_status not in ("online", "offline", "pause", "besetzt"):
        return jsonify({"fehler": "Ungueltiger Status"}), 400

    aktualisiert = agent_status_setzen(db(), agent_id, neuer_status)
    return jsonify({"nachricht": "Status aktualisiert", "agent": aktualisiert})


# --- Anrufe API ---

@app.route("/api/anrufe", methods=["GET"])
def api_anrufe_liste():
    limit = request.args.get("limit", 50, type=int)
    aktiv = request.args.get("aktiv", "").strip()
    if aktiv == "true":
        return jsonify(anruf_aktive(db()))
    return jsonify(anruf_alle(db(), limit))


@app.route("/api/anrufe", methods=["POST"])
def api_anruf_erstellen_route():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    if not daten.get("anrufer_nummer"):
        return jsonify({"fehler": ["Anrufer-Nummer ist erforderlich"]}), 422

    anruf = anruf_erstellen(db(), daten)
    return jsonify({"nachricht": "Anruf erstellt", "anruf": anruf}), 201


@app.route("/api/anrufe/<int:anruf_id>", methods=["GET"])
def api_anruf_detail(anruf_id):
    anruf = anruf_nach_id(db(), anruf_id)
    if not anruf:
        return jsonify({"fehler": "Anruf nicht gefunden"}), 404
    return jsonify(anruf)


@app.route("/api/anrufe/<int:anruf_id>", methods=["PUT"])
def api_anruf_aktualisieren_route(anruf_id):
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    anruf = anruf_nach_id(db(), anruf_id)
    if not anruf:
        return jsonify({"fehler": "Anruf nicht gefunden"}), 404

    aktualisiert = anruf_aktualisieren(db(), anruf_id, daten)
    return jsonify({"nachricht": "Anruf aktualisiert", "anruf": aktualisiert})


@app.route("/api/anrufe/<int:anruf_id>", methods=["DELETE"])
def api_anruf_loeschen_route(anruf_id):
    if anruf_loeschen(db(), anruf_id):
        return jsonify({"nachricht": "Anruf geloescht"})
    return jsonify({"fehler": "Anruf nicht gefunden"}), 404


# --- LLM API (Eingesperrtes KI-System) ---

@app.route("/api/llm/status", methods=["GET"])
def api_llm_status():
    """Prueft ob das LLM verfuegbar ist und gibt Branchen-Info zurueck."""
    return jsonify({
        "verfuegbar": llm_verfuegbar(),
        "modus": "live" if llm_verfuegbar() else "demo",
        "branchen": branchen_liste(),
    })


@app.route("/api/branchen", methods=["GET"])
def api_branchen():
    """Gibt alle verfuegbaren Branchen mit Konfiguration zurueck."""
    return jsonify(BRANCHEN)


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Chat mit dem eingesperrten Buero-Assistenten."""
    daten = request.get_json()
    if not daten or not daten.get("text"):
        return jsonify({"fehler": "Kein Text erhalten"}), 400

    if not llm_verfuegbar():
        return jsonify({"fehler": "LLM nicht konfiguriert", "modus": "demo"}), 503

    verlauf = daten.get("verlauf", [])
    branche = daten.get("branche", None)
    firmen_name = daten.get("firmen_name", "")
    ergebnis = chat_antwort(daten["text"], db, verlauf, branche, firmen_name)

    if "fehler" in ergebnis:
        return jsonify(ergebnis), 500

    return jsonify({"antwort": ergebnis["antwort"], "modus": "live"})


@app.route("/api/voicebot/dialog", methods=["POST"])
def api_voicebot_dialog():
    """Voicebot-Dialog-Schritt mit LLM."""
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    if not llm_verfuegbar():
        return jsonify({"fehler": "LLM nicht konfiguriert", "modus": "demo"}), 503

    eingabe = daten.get("eingabe", "")
    schritt = daten.get("schritt", 0)
    dialog_typ = daten.get("dialog_typ", "allgemein")
    branche = daten.get("branche", None)
    firmen_name = daten.get("firmen_name", "")

    ergebnis = voicebot_dialog(eingabe, schritt, dialog_typ, db, branche, firmen_name)

    if "fehler" in ergebnis:
        return jsonify(ergebnis), 500

    return jsonify(ergebnis)


@app.route("/api/uebersetzen", methods=["POST"])
def api_uebersetzen():
    """Uebersetzung mit LLM im Buero-Kontext."""
    daten = request.get_json()
    if not daten or not daten.get("text"):
        return jsonify({"fehler": "Kein Text erhalten"}), 400

    von = daten.get("von", "de")
    nach = daten.get("nach", "en")
    text = daten["text"]
    branche = daten.get("branche", None)
    firmen_name = daten.get("firmen_name", "")

    if not llm_verfuegbar():
        return jsonify({"fehler": "LLM nicht konfiguriert", "modus": "demo"}), 503

    ergebnis = llm_uebersetzen(text, von, nach, branche, firmen_name)

    if "fehler" in ergebnis:
        return jsonify(ergebnis), 500

    return jsonify({"uebersetzung": ergebnis["uebersetzung"], "modus": "live"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
