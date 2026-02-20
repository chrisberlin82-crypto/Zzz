"""Flask Web-App fuer den Zzz Rechner und die Benutzerverwaltung."""

import sqlite3
from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path

from src.python.rechner import addieren, subtrahieren, multiplizieren, dividieren
from src.python.validator import schema_laden, validieren
from src.python.datenbank import (
    verbindung_herstellen, tabellen_erstellen,
    benutzer_erstellen, benutzer_alle, benutzer_nach_id,
    benutzer_aktualisieren, benutzer_loeschen,
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
        return jsonify({"ergebnis": ergebnis})
    except ValueError as e:
        return jsonify({"fehler": str(e)}), 400


# --- Benutzer API (CRUD) ---

@app.route("/api/benutzer", methods=["GET"])
def api_benutzer_liste():
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
