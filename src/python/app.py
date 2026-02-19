"""Flask Web-App fuer den Zzz Rechner und die Benutzerverwaltung."""

from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path

from src.python.rechner import addieren, subtrahieren, multiplizieren, dividieren
from src.python.validator import schema_laden, validieren

app = Flask(__name__, static_folder=str(Path(__file__).resolve().parent.parent / "html"))

SCHEMA_PFAD = Path(__file__).resolve().parent.parent / "json" / "schemas" / "benutzer.json"
benutzer_liste = []


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:dateiname>")
def statische_dateien(dateiname):
    return send_from_directory(app.static_folder, dateiname)


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


@app.route("/api/benutzer", methods=["GET"])
def api_benutzer_liste():
    return jsonify(benutzer_liste)


@app.route("/api/benutzer", methods=["POST"])
def api_benutzer_erstellen():
    daten = request.get_json()
    if not daten:
        return jsonify({"fehler": "Keine Daten erhalten"}), 400

    schema = schema_laden(str(SCHEMA_PFAD))
    fehler = validieren(daten, schema)

    if fehler:
        return jsonify({"fehler": fehler}), 422

    benutzer_liste.append(daten)
    return jsonify({"nachricht": "Benutzer gespeichert", "benutzer": daten}), 201


if __name__ == "__main__":
    app.run(debug=True, port=5000)
