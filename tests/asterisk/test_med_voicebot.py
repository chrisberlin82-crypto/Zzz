"""Tests fuer den MED Rezeption Voicebot (AGI-Script)."""

import io
import json
import sys
import pytest
from unittest.mock import patch, MagicMock

# Modul importieren
sys.path.insert(0, ".")
from asterisk.med_voicebot import (
    agi_lese_variablen,
    agi_befehl,
    agi_set_variable,
    agi_playback,
    agi_get_data,
    agi_record,
    agi_verbose,
    api_anfrage,
    dialog_willkommen,
    dialog_termin,
    dialog_rezept,
    main,
)


# === AGI-Hilfsfunktionen ===


class TestAgiLeseVariablen:
    def test_liest_variablen(self):
        eingabe = "agi_channel: SIP/100\nagi_callerid: 030123\n\n"
        with patch("sys.stdin", io.StringIO(eingabe)):
            v = agi_lese_variablen()
        assert v["agi_channel"] == "SIP/100"
        assert v["agi_callerid"] == "030123"

    def test_leere_eingabe(self):
        with patch("sys.stdin", io.StringIO("\n")):
            v = agi_lese_variablen()
        assert v == {}


class TestAgiBefehl:
    def test_sendet_befehl_und_liest_antwort(self):
        mock_stdout = io.StringIO()
        with patch("sys.stdout", mock_stdout), \
             patch("sys.stdin", io.StringIO("200 result=1\n")):
            antwort = agi_befehl("ANSWER")
        assert "200 result=1" in antwort
        assert "ANSWER\n" in mock_stdout.getvalue()


class TestAgiSetVariable:
    def test_setzt_variable(self):
        mock_stdout = io.StringIO()
        with patch("sys.stdout", mock_stdout), \
             patch("sys.stdin", io.StringIO("200 result=1\n")):
            agi_set_variable("TEST", "wert")
        assert 'SET VARIABLE TEST "wert"' in mock_stdout.getvalue()


class TestAgiPlayback:
    def test_playback(self):
        mock_stdout = io.StringIO()
        with patch("sys.stdout", mock_stdout), \
             patch("sys.stdin", io.StringIO("200 result=0\n")):
            agi_playback("willkommen")
        assert "EXEC Playback willkommen" in mock_stdout.getvalue()


class TestAgiGetData:
    def test_empfaengt_eingabe(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("200 result=1\n")):
            ergebnis = agi_get_data("audio", 5000, 1)
        assert ergebnis == "1"

    def test_keine_eingabe(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("200 result=-1\n")):
            ergebnis = agi_get_data("audio", 5000, 1)
        assert ergebnis == ""

    def test_leere_antwort(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("200 result=\n")):
            ergebnis = agi_get_data("audio", 5000, 1)
        assert ergebnis == ""

    def test_mehrziffrige_eingabe(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("200 result=12345\n")):
            ergebnis = agi_get_data("audio", 15000, 12)
        assert ergebnis == "12345"


class TestAgiRecord:
    def test_sendet_record_befehl(self):
        mock_stdout = io.StringIO()
        with patch("sys.stdout", mock_stdout), \
             patch("sys.stdin", io.StringIO("200 result=0\n")):
            agi_record("aufnahme", "wav")
        assert "RECORD FILE" in mock_stdout.getvalue()


class TestAgiVerbose:
    def test_sendet_verbose(self):
        mock_stdout = io.StringIO()
        with patch("sys.stdout", mock_stdout), \
             patch("sys.stdin", io.StringIO("200 result=1\n")):
            agi_verbose("Testnachricht", 1)
        assert 'VERBOSE "Testnachricht" 1' in mock_stdout.getvalue()


# === API-Kommunikation ===


class TestApiAnfrage:
    def test_get_anfrage(self):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps([{"id": 1}]).encode("utf-8")
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch("urllib.request.urlopen", return_value=mock_response), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("")):
            ergebnis = api_anfrage("/aerzte")
        assert ergebnis == [{"id": 1}]

    def test_post_anfrage(self):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"ok": True}).encode("utf-8")
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch("urllib.request.urlopen", return_value=mock_response), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("")):
            ergebnis = api_anfrage("/termine", "POST", {"datum": "2026-03-01"})
        assert ergebnis == {"ok": True}

    def test_netzwerkfehler_gibt_none(self):
        import urllib.error
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Timeout")), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO("200 result=1\n")):
            ergebnis = api_anfrage("/aerzte")
        assert ergebnis is None


# === Dialog-Tests ===


def _mock_agi_call(befehl_antworten):
    """Hilfsfunktion: Simuliert mehrere AGI-Antworten."""
    antworten = iter(befehl_antworten)

    def fake_readline():
        try:
            return next(antworten) + "\n"
        except StopIteration:
            return "\n"

    return fake_readline


class TestDialogWillkommen:
    def test_auswahl_1_ruft_termin(self):
        # 1 = Termin auswaehlen -> dialog_termin laeuft (keine Aerzte -> TRANSFER)
        antworten = ["200 result=1\n"] + ["200 result=0\n"] * 20
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=[]):
            dialog_willkommen({})

    def test_auswahl_2_ruft_rezept(self):
        antworten = [
            "200 result=2\n",         # get_data -> "2"
            "200 result=0\n",         # verbose
            "200 result=0\n",         # playback
            "200 result=12345678\n",  # vnr eingabe
            "200 result=0\n",         # verbose vnr
            "200 result=0\n",         # playback bestaetigt
            "200 result=1\n",         # set VOICEBOT_RESULT
            "200 result=1\n",         # set VOICEBOT_REZEPT_VNR
            "200 result=1\n",         # set CDR
        ] + ["200 result=0\n"] * 10
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten):
            dialog_willkommen({})

    def test_auswahl_3_transfer(self):
        antworten = ["200 result=3\n", "200 result=1\n"] + ["200 result=0\n"] * 10
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten):
            dialog_willkommen({})

    def test_auswahl_0_transfer(self):
        antworten = ["200 result=0\n", "200 result=1\n"] + ["200 result=0\n"] * 10
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten):
            dialog_willkommen({})

    def test_keine_eingabe_nochmal(self):
        antworten = [
            "200 result=-1\n",  # erste Abfrage leer
            "200 result=-1\n",  # nochmal Abfrage leer
            "200 result=1\n",   # set_variable TRANSFER
        ] + ["200 result=0\n"] * 10
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten):
            dialog_willkommen({})


class TestDialogTermin:
    """Umfassende Tests fuer den Terminvergabe-Dialog."""

    AERZTE = [
        {"id": 1, "vorname": "Hans", "nachname": "Schmidt",
         "fachrichtung": "Allgemeinmedizin"},
        {"id": 2, "vorname": "Anna", "nachname": "Mueller",
         "fachrichtung": "Innere Medizin"},
    ]
    OK = "200 result=0"

    def _agi(self, n=30):
        """Erzeugt genug AGI-Antworten fuer jeden Pfad."""
        return [self.OK + "\n"] * n

    # --- Aerzte-Abfrage schlaegt fehl ---

    def test_keine_aerzte_transfer(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=self._agi()), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=[]):
            dialog_termin({})

    def test_aerzte_none_transfer(self):
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=self._agi()), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=None):
            dialog_termin({})

    # --- Fachrichtung-Auswahl: Alle 3 Optionen + Default ---

    def test_fachrichtung_1_allgemeinmedizin(self):
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=1\n",  # fachrichtung=1 -> Allgemeinmedizin
            "200 result=0\n",  # playback vorschlag
            "200 result=2\n",  # ablehnen -> TRANSFER
        ] + self._agi(20)

        calls = []

        def mock_api(pfad, methode="GET", daten=None):
            calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({})

        assert calls[0] == ("/aerzte", "GET", None)

    def test_fachrichtung_2_innere_medizin(self):
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=2\n",  # fachrichtung=2 -> Innere Medizin
            "200 result=0\n",  # playback vorschlag
            "200 result=2\n",  # ablehnen
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    def test_fachrichtung_3_sonstiges(self):
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=3\n",  # fachrichtung=3 -> Sonstiges
            "200 result=0\n",  # playback vorschlag
            "200 result=2\n",  # ablehnen
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    def test_fachrichtung_ungueltig_default_allgemein(self):
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=9\n",  # ungueltiger Wert -> Default Allgemeinmedizin
            "200 result=0\n",  # playback
            "200 result=2\n",  # ablehnen
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    def test_fachrichtung_leer_default(self):
        antworten = [
            "200 result=0\n",
            "200 result=-1\n",  # keine Eingabe
            "200 result=0\n",
            "200 result=2\n",
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    # --- Termin bestaetigt: Patient gefunden, API erstellt Termin ---

    def test_termin_bestaetigt_mit_patient_und_api_erstellung(self):
        patient = [{"id": 42, "vorname": "Max", "nachname": "M"}]
        termin_antwort = {"termin": {"id": 99, "datum": "2026-02-21"}}
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=1\n",  # fachrichtung=1
            "200 result=0\n",  # playback vorschlag
            "200 result=1\n",  # bestaetigung=1 Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return patient
            if pfad == "/termine" and methode == "POST":
                return termin_antwort
            return None

        with patch("sys.stdout", io.StringIO()) as out, \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "030123456"})

        # Pruefe: /aerzte wurde geladen
        assert api_calls[0][0] == "/aerzte"
        # Pruefe: Patient wurde anhand CallerID gesucht
        assert "/patienten?suche=030123456" in api_calls[1][0]
        # Pruefe: Termin wurde via POST erstellt
        assert api_calls[2][0] == "/termine"
        assert api_calls[2][1] == "POST"
        # Pruefe Termin-Daten
        termin_daten = api_calls[2][2]
        assert termin_daten["arzt_id"] == 1  # Allgemeinmedizin-Arzt
        assert termin_daten["patient_id"] == 42
        assert termin_daten["uhrzeit"] == "09:00"
        assert "Allgemeinmedizin" in termin_daten["grund"]

    def test_termin_bestaetigt_innere_medizin_waehlt_richtigen_arzt(self):
        termin_antwort = {"termin": {"id": 77}}
        antworten = [
            "200 result=0\n",  # verbose
            "200 result=2\n",  # fachrichtung=2 -> Innere Medizin
            "200 result=0\n",  # playback
            "200 result=1\n",  # bestaetigung Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return [{"id": 10}]
            if pfad == "/termine" and methode == "POST":
                return termin_antwort
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "0171555"})

        termin_post = [c for c in api_calls if c[0] == "/termine"]
        assert len(termin_post) == 1
        assert termin_post[0][2]["arzt_id"] == 2  # Anna Mueller (Innere Medizin)

    def test_termin_bestaetigt_fachrichtung_nicht_vorhanden_nimmt_ersten(self):
        termin_antwort = {"termin": {"id": 55}}
        antworten = [
            "200 result=0\n",
            "200 result=3\n",  # fachrichtung=3 -> Sonstiges (kein Arzt hat das)
            "200 result=0\n",
            "200 result=1\n",  # Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return [{"id": 5}]
            if pfad == "/termine" and methode == "POST":
                return termin_antwort
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "040999"})

        termin_post = [c for c in api_calls if c[0] == "/termine"]
        assert termin_post[0][2]["arzt_id"] == 1  # Erster Arzt als Fallback

    # --- Termin bestaetigt: Kein Patient gefunden ---

    def test_termin_bestaetigt_kein_patient_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=1\n",
            "200 result=0\n",
            "200 result=1\n",  # Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return []  # Kein Patient gefunden
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "0000"})

        # Kein POST /termine weil kein Patient
        termin_posts = [c for c in api_calls if c[1] == "POST"]
        assert len(termin_posts) == 0

    def test_termin_bestaetigt_keine_callerid_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=1\n",
            "200 result=0\n",
            "200 result=1\n",  # Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({})  # Keine CallerID

        # Keine Patientensuche, kein POST
        patienten_calls = [c for c in api_calls if "patienten" in c[0]]
        assert len(patienten_calls) == 0

    # --- Termin bestaetigt: API-Fehler bei Erstellung ---

    def test_termin_api_fehler_bei_erstellung_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=1\n",
            "200 result=0\n",
            "200 result=1\n",  # Ja
        ] + self._agi(30)

        def mock_api(pfad, methode="GET", daten=None):
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return [{"id": 42}]
            if pfad == "/termine" and methode == "POST":
                return None  # API-Fehler
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "030123"})

    def test_termin_api_gibt_unerwartetes_format_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=1\n",
            "200 result=0\n",
            "200 result=1\n",
        ] + self._agi(30)

        def mock_api(pfad, methode="GET", daten=None):
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return [{"id": 42}]
            if pfad == "/termine" and methode == "POST":
                return {"fehler": "Ungueltige Daten"}  # Kein "termin"-Key
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "030123"})

    # --- Termin abgelehnt ---

    def test_termin_abgelehnt_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=2\n",  # Innere
            "200 result=0\n",
            "200 result=2\n",  # Nein
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    def test_termin_keine_bestaetigung_transfer(self):
        antworten = [
            "200 result=0\n",
            "200 result=1\n",
            "200 result=0\n",
            "200 result=-1\n",  # keine Eingabe
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_termin({})

    # --- Nur ein Arzt verfuegbar ---

    def test_termin_nur_ein_arzt(self):
        ein_arzt = [{"id": 5, "vorname": "Eva", "nachname": "Braun",
                     "fachrichtung": "Chirurgie"}]
        termin_antwort = {"termin": {"id": 33}}
        antworten = [
            "200 result=0\n",
            "200 result=1\n",  # Allgemeinmedizin (aber Arzt ist Chirurgie)
            "200 result=0\n",
            "200 result=1\n",
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return ein_arzt
            if "patienten" in pfad:
                return [{"id": 7}]
            if pfad == "/termine" and methode == "POST":
                return termin_antwort
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_termin({"agi_callerid": "05511111"})

        termin_post = [c for c in api_calls if c[0] == "/termine"]
        # Nimmt den einzigen Arzt obwohl Fachrichtung nicht passt
        assert termin_post[0][2]["arzt_id"] == 5

    # --- End-to-End via willkommen -> termin ---

    def test_willkommen_auswahl_1_terminierung_komplett(self):
        """Kompletter Durchlauf: Willkommen -> 1 -> Termin erstellen."""
        termin_antwort = {"termin": {"id": 123, "datum": "2026-02-21"}}
        antworten = [
            "200 result=0\n",  # verbose willkommen gestartet
            "200 result=1\n",  # willkommen get_data: 1 = Termin
            "200 result=0\n",  # verbose termin gestartet
            "200 result=1\n",  # fachrichtung=1
            "200 result=0\n",  # playback vorschlag
            "200 result=1\n",  # bestaetigung Ja
        ] + self._agi(30)

        api_calls = []

        def mock_api(pfad, methode="GET", daten=None):
            api_calls.append((pfad, methode, daten))
            if pfad == "/aerzte":
                return self.AERZTE
            if "patienten" in pfad:
                return [{"id": 1}]
            if pfad == "/termine" and methode == "POST":
                return termin_antwort
            return None

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", side_effect=mock_api):
            dialog_willkommen({"agi_callerid": "030999"})

        # Termin wurde erstellt
        termin_posts = [c for c in api_calls if c[0] == "/termine" and c[1] == "POST"]
        assert len(termin_posts) == 1
        assert termin_posts[0][2]["patient_id"] == 1

    def test_willkommen_nochmal_auswahl_1_terminierung(self):
        """Erste Eingabe leer, Nochmal -> 1 -> Termin."""
        antworten = [
            "200 result=-1\n",  # willkommen: keine Eingabe
            "200 result=1\n",   # nochmal: 1 = Termin
            "200 result=0\n",   # verbose
            "200 result=1\n",   # fachrichtung
            "200 result=0\n",   # playback
            "200 result=2\n",   # ablehnen -> Transfer
        ] + self._agi(20)

        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=antworten), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=self.AERZTE):
            dialog_willkommen({})


class TestDialogRezept:
    def test_gueltige_vnr(self):
        antworten = [
            "200 result=0",         # verbose
            "200 result=0",         # playback rezept-info
            "200 result=123456789", # vnr eingabe
            "200 result=0",         # verbose vnr
            "200 result=0",         # playback bestaetigt
            "200 result=1",         # set VOICEBOT_RESULT
            "200 result=1",         # set REZEPT_VNR
            "200 result=1",         # set CDR
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]):
            dialog_rezept({})

    def test_ungueltige_vnr_transfer(self):
        antworten = [
            "200 result=0",   # verbose
            "200 result=0",   # playback rezept-info
            "200 result=12",  # vnr zu kurz
            "200 result=0",   # playback ungueltig
            "200 result=1",   # set VOICEBOT_RESULT TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]):
            dialog_rezept({})

    def test_leere_vnr_transfer(self):
        antworten = [
            "200 result=0",  # verbose
            "200 result=0",  # playback rezept-info
            "200 result=-1", # keine eingabe
            "200 result=0",  # playback ungueltig
            "200 result=1",  # set TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]):
            dialog_rezept({})


# === Main-Funktion ===


class TestMain:
    def test_standard_modus_willkommen(self):
        agi_eingabe = "agi_channel: SIP/100\n\n"
        antworten = [
            "200 result=0",  # verbose gestartet
            "200 result=3",  # willkommen -> 3 = transfer
            "200 result=1",  # set_variable
        ]
        with patch("sys.argv", ["med_voicebot.py"]), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO(agi_eingabe + "\n".join(antworten) + "\n" + "\n".join(antworten) + "\n")):
            main()

    def test_modus_termin(self):
        agi_eingabe = "agi_channel: SIP/100\n\n"
        antworten = [
            "200 result=0",  # verbose gestartet
            "200 result=0",  # verbose termin
            "200 result=0",  # playback kein-arzt
            "200 result=1",  # set TRANSFER
        ]
        with patch("sys.argv", ["med_voicebot.py", "termin"]), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO(agi_eingabe + "\n".join(antworten) + "\n" + "\n".join(antworten) + "\n")), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=[]):
            main()

    def test_modus_rezept(self):
        agi_eingabe = "agi_channel: SIP/100\n\n"
        antworten = [
            "200 result=0",         # verbose
            "200 result=0",         # verbose rezept
            "200 result=0",         # playback
            "200 result=123456789", # vnr
            "200 result=0",         # verbose vnr
            "200 result=0",         # playback bestaetigt
            "200 result=1",         # set RESULT
            "200 result=1",         # set VNR
            "200 result=1",         # set CDR
        ]
        with patch("sys.argv", ["med_voicebot.py", "rezept"]), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO(agi_eingabe + "\n".join(antworten) + "\n" + "\n".join(antworten) + "\n")):
            main()

    def test_unbekannter_modus(self):
        agi_eingabe = "agi_channel: SIP/100\n\n"
        antworten = [
            "200 result=0",  # verbose gestartet
            "200 result=0",  # verbose unbekannt
            "200 result=1",  # set TRANSFER
        ]
        with patch("sys.argv", ["med_voicebot.py", "unbekannt"]), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO(agi_eingabe + "\n".join(antworten) + "\n" + "\n".join(antworten) + "\n")):
            main()

    def test_exception_wird_gefangen(self):
        agi_eingabe = "agi_channel: SIP/100\n\n"
        antworten = [
            "200 result=0",  # verbose gestartet
            "200 result=0",  # verbose fehler
            "200 result=1",  # set TRANSFER
        ]
        with patch("sys.argv", ["med_voicebot.py", "willkommen"]), \
             patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin", io.StringIO(agi_eingabe + "\n".join(antworten) + "\n" + "\n".join(antworten) + "\n")), \
             patch("asterisk.med_voicebot.dialog_willkommen", side_effect=RuntimeError("Test-Fehler")):
            main()  # Sollte nicht abstuerzen
