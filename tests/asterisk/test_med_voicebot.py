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
        # 1 = Termin auswaehlen
        antworten = [
            "200 result=1",  # get_data -> "1"
            "200 result=0",  # verbose
            "200 result=0",  # playback kein-arzt
            "200 result=1",  # set_variable TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=[]):
            dialog_willkommen({})

    def test_auswahl_2_ruft_rezept(self):
        antworten = [
            "200 result=2",  # get_data -> "2"
            "200 result=0",  # verbose
            "200 result=0",  # playback
            "200 result=12345678",  # vnr eingabe
            "200 result=0",  # verbose vnr
            "200 result=0",  # playback bestaetigt
            "200 result=1",  # set VOICEBOT_RESULT
            "200 result=1",  # set VOICEBOT_REZEPT_VNR
            "200 result=1",  # set CDR
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]):
            dialog_willkommen({})

    def test_auswahl_3_transfer(self):
        antworten = ["200 result=3", "200 result=1"]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]):
            dialog_willkommen({})

    def test_auswahl_0_transfer(self):
        antworten = ["200 result=0", "200 result=1"]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]):
            dialog_willkommen({})

    def test_keine_eingabe_nochmal(self):
        # Erste Eingabe leer, zweite auch -> TRANSFER
        antworten = [
            "200 result=-1",  # erste Abfrage leer
            "200 result=-1",  # nochmal Abfrage leer
            "200 result=1",   # set_variable TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]):
            dialog_willkommen({})


class TestDialogTermin:
    def test_keine_aerzte_transfer(self):
        antworten = [
            "200 result=0",  # verbose
            "200 result=0",  # playback kein-arzt
            "200 result=1",  # set_variable TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=[]):
            dialog_termin({})

    def test_api_fehler_transfer(self):
        antworten = [
            "200 result=0",  # verbose
            "200 result=0",  # playback kein-arzt
            "200 result=1",  # set_variable TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 5]), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=None):
            dialog_termin({})

    def test_termin_bestaetigt(self):
        aerzte = [{"id": 1, "vorname": "Dr.", "nachname": "Schmidt", "fachrichtung": "Allgemein"}]
        antworten = [
            "200 result=0",  # verbose
            "200 result=1",  # fachrichtung Allgemein
            "200 result=0",  # playback vorschlag
            "200 result=1",  # bestaetigung Ja
            "200 result=0",  # verbose bestaetigt
            "200 result=1",  # set VOICEBOT_RESULT
            "200 result=1",  # set TERMIN_DATUM
            "200 result=1",  # set FACHRICHTUNG
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=aerzte):
            dialog_termin({})

    def test_termin_abgelehnt_transfer(self):
        aerzte = [{"id": 1, "vorname": "Dr.", "nachname": "Test", "fachrichtung": "Allgemein"}]
        antworten = [
            "200 result=0",  # verbose
            "200 result=2",  # fachrichtung Innere
            "200 result=0",  # playback vorschlag
            "200 result=2",  # bestaetigung Nein
            "200 result=1",  # set VOICEBOT_RESULT TRANSFER
        ]
        with patch("sys.stdout", io.StringIO()), \
             patch("sys.stdin.readline", side_effect=[a + "\n" for a in antworten * 3]), \
             patch("asterisk.med_voicebot.api_anfrage", return_value=aerzte):
            dialog_termin({})


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
