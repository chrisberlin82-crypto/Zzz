#!/usr/bin/env python3
"""MED Rezeption - Voicebot AGI-Script fuer Asterisk.

Dieses Script wird von Asterisk via AGI aufgerufen und steuert
den automatisierten Dialog mit Anrufern.

Funktionen:
- willkommen: Begruessung und Hauptmenue
- termin: Automatische Terminvergabe
- rezept: Rezeptbestellung entgegennehmen

Kommunikation mit Asterisk erfolgt ueber stdin/stdout (AGI-Protokoll).
"""

import sys
import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta


# AGI-Hilfsfunktionen

def agi_lese_variablen():
    """Liest die AGI-Umgebungsvariablen von stdin."""
    variablen = {}
    while True:
        zeile = sys.stdin.readline().strip()
        if zeile == "":
            break
        if ":" in zeile:
            schluessel, wert = zeile.split(":", 1)
            variablen[schluessel.strip()] = wert.strip()
    return variablen


def agi_befehl(befehl):
    """Sendet einen AGI-Befehl an Asterisk und liest die Antwort."""
    sys.stdout.write(befehl + "\n")
    sys.stdout.flush()
    antwort = sys.stdin.readline().strip()
    return antwort


def agi_set_variable(name, wert):
    """Setzt eine Asterisk-Kanalvariable."""
    agi_befehl('SET VARIABLE {} "{}"'.format(name, wert))


def agi_playback(datei):
    """Spielt eine Audiodatei ab."""
    agi_befehl("EXEC Playback {}".format(datei))


def agi_get_data(datei, timeout_ms=5000, max_ziffern=1):
    """Spielt eine Datei und wartet auf DTMF-Eingabe."""
    antwort = agi_befehl(
        "GET DATA {} {} {}".format(datei, timeout_ms, max_ziffern)
    )
    # Antwort: 200 result=<digits>
    if "result=" in antwort:
        ergebnis = antwort.split("result=")[1].split(" ")[0]
        return ergebnis if ergebnis and ergebnis != "-1" else ""
    return ""


def agi_record(datei, format_typ="wav", escape="#", timeout_ms=30000, silence_s=3):
    """Nimmt Audio auf."""
    agi_befehl(
        'RECORD FILE "{}" {} "{}" {} BEEP s={}'.format(
            datei, format_typ, escape, timeout_ms, silence_s
        )
    )


def agi_verbose(nachricht, level=1):
    """Schreibt eine Nachricht ins Asterisk-Log."""
    agi_befehl('VERBOSE "{}" {}'.format(nachricht, level))


# API-Kommunikation mit dem MED-Rezeption-Backend

API_BASE = os.environ.get("MED_API_BASE", "http://localhost:5000/api")


def api_anfrage(pfad, methode="GET", daten=None):
    """Sendet eine API-Anfrage an das MED-Rezeption-Backend."""
    url = API_BASE + pfad
    try:
        if daten:
            payload = json.dumps(daten).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload, method=methode,
                headers={"Content-Type": "application/json"}
            )
        else:
            req = urllib.request.Request(url, method=methode)
        with urllib.request.urlopen(req, timeout=5) as antwort:
            return json.loads(antwort.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
        agi_verbose("API-Fehler: {}".format(str(e)), 1)
        return None


# Voicebot-Dialoge

def dialog_willkommen(agi_vars):
    """Hauptmenue: Begruessung und Auswahl."""
    agi_verbose("Voicebot: Willkommensdialog gestartet", 1)

    # Willkommenansage mit DTMF-Abfrage
    # 1 = Termin, 2 = Rezept, 3 = Rezeption, 0 = Warteschlange
    eingabe = agi_get_data("voicebot-willkommen", 8000, 1)

    if eingabe == "1":
        dialog_termin(agi_vars)
    elif eingabe == "2":
        dialog_rezept(agi_vars)
    elif eingabe == "3" or eingabe == "0":
        agi_set_variable("VOICEBOT_RESULT", "TRANSFER")
    else:
        # Kein Input oder ungueltig - nochmal versuchen
        eingabe2 = agi_get_data("voicebot-nochmal", 5000, 1)
        if eingabe2 == "1":
            dialog_termin(agi_vars)
        elif eingabe2 == "2":
            dialog_rezept(agi_vars)
        else:
            # An Rezeption weiterleiten
            agi_set_variable("VOICEBOT_RESULT", "TRANSFER")


def dialog_termin(agi_vars):
    """Terminvergabe-Dialog."""
    agi_verbose("Voicebot: Termindialog gestartet", 1)

    # Naechsten freien Termin suchen
    aerzte = api_anfrage("/aerzte")
    if not aerzte or len(aerzte) == 0:
        agi_playback("voicebot-kein-arzt")
        agi_set_variable("VOICEBOT_RESULT", "TRANSFER")
        return

    # Morgen als naechsten Terminvorschlag
    morgen = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    # Einfacher Dialog: Arzt-Fachrichtung abfragen
    # 1 = Allgemeinmedizin, 2 = Innere, 3 = Andere
    eingabe = agi_get_data("voicebot-fachrichtung", 8000, 1)

    fachrichtung_map = {
        "1": "Allgemeinmedizin",
        "2": "Innere Medizin",
        "3": "Sonstiges",
    }
    fachrichtung = fachrichtung_map.get(eingabe, "Allgemeinmedizin")

    # Termin-Vorschlag
    agi_playback("voicebot-termin-vorschlag")

    # Bestaetigung: 1 = Ja, 2 = Nein
    bestaetigung = agi_get_data("voicebot-bestaetigen", 5000, 1)

    if bestaetigung == "1":
        # Termin anlegen (vereinfacht)
        agi_verbose("Voicebot: Termin bestaetigt fuer {} / {}".format(
            morgen, fachrichtung), 1)
        agi_set_variable("VOICEBOT_RESULT", "TERMIN")
        agi_set_variable("VOICEBOT_TERMIN_DATUM", morgen)
        agi_set_variable("VOICEBOT_FACHRICHTUNG", fachrichtung)
    else:
        # Zur Rezeption weiterleiten fuer manuelle Terminvergabe
        agi_set_variable("VOICEBOT_RESULT", "TRANSFER")


def dialog_rezept(agi_vars):
    """Rezeptbestellungs-Dialog."""
    agi_verbose("Voicebot: Rezeptdialog gestartet", 1)

    # Patienten-ID oder Versicherungsnummer abfragen
    agi_playback("voicebot-rezept-info")

    # Versicherungsnummer eingeben (bis zu 12 Ziffern)
    vnr = agi_get_data("voicebot-versicherungsnummer", 15000, 12)

    if not vnr or len(vnr) < 5:
        agi_playback("voicebot-ungueltige-eingabe")
        agi_set_variable("VOICEBOT_RESULT", "TRANSFER")
        return

    agi_verbose("Voicebot: Versicherungsnummer eingegeben: {}".format(vnr), 1)

    # Bestaetigung
    agi_playback("voicebot-rezept-bestaetigt")

    agi_set_variable("VOICEBOT_RESULT", "TRANSFER")
    agi_set_variable("VOICEBOT_REZEPT_VNR", vnr)
    agi_set_variable("CDR(calltype)", "voicebot_transfer")


# Hauptprogramm

def main():
    """AGI-Hauptprogramm."""
    # AGI-Variablen lesen
    agi_vars = agi_lese_variablen()

    # Modus aus dem ersten Argument lesen
    modus = "willkommen"
    if len(sys.argv) > 1:
        modus = sys.argv[1]

    agi_verbose("Voicebot gestartet, Modus: {}".format(modus), 1)

    try:
        if modus == "willkommen":
            dialog_willkommen(agi_vars)
        elif modus == "termin":
            dialog_termin(agi_vars)
        elif modus == "rezept":
            dialog_rezept(agi_vars)
        else:
            agi_verbose("Unbekannter Modus: {}".format(modus), 1)
            agi_set_variable("VOICEBOT_RESULT", "TRANSFER")
    except Exception as e:
        agi_verbose("Voicebot Fehler: {}".format(str(e)), 1)
        agi_set_variable("VOICEBOT_RESULT", "TRANSFER")


if __name__ == "__main__":
    main()
