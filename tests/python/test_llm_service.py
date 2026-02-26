"""Tests fuer den LLM-Service (ohne echte API-Aufrufe)."""

import json
from unittest.mock import patch, MagicMock

import pytest

from src.python import llm_service
from src.python.llm_service import (
    branche_laden,
    branchen_liste,
    BRANCHEN,
    _modell,
    _system_chat,
    _system_voicebot,
    _system_uebersetzer,
    _buero_kontext,
    _kontext_text,
    _llm_anfrage,
    chat_antwort,
    voicebot_dialog,
    uebersetzen,
    llm_verfuegbar,
    SPRACH_NAMEN,
)


# --- Branchen-Konfiguration ---

class TestBrancheLaden:
    def test_standard_branche(self):
        b = branche_laden("arztpraxis")
        assert b["label"] == "Arztpraxis"
        assert b["kunden"] == "Patienten"

    def test_anwalt(self):
        b = branche_laden("anwalt")
        assert b["label"] == "Rechtsanwaltskanzlei"
        assert b["kunden"] == "Mandanten"

    def test_unbekannte_branche_fallback(self):
        b = branche_laden("unbekannt_xyz")
        assert b["label"] == "Allgemeines Buero"

    def test_none_branche_nutzt_standard(self):
        b = branche_laden(None)
        assert b is not None
        assert "label" in b

    def test_alle_branchen_haben_pflichtfelder(self):
        pflichtfelder = ["label", "buero_name", "verwaltung", "assistent",
                         "kunden", "mitarbeiter", "dienste"]
        for key, branche in BRANCHEN.items():
            for feld in pflichtfelder:
                assert feld in branche, f"Branche '{key}' fehlt Feld '{feld}'"


class TestBranchenListe:
    def test_gibt_dict_zurueck(self):
        liste = branchen_liste()
        assert isinstance(liste, dict)
        assert "arztpraxis" in liste
        assert liste["arztpraxis"] == "Arztpraxis"

    def test_alle_branchen_enthalten(self):
        liste = branchen_liste()
        for key in BRANCHEN:
            assert key in liste


# --- Modell-Auswahl ---

class TestModell:
    def test_default_anthropic(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"):
            assert "claude" in _modell()

    def test_custom_model(self):
        with patch.object(llm_service, "LLM_MODEL", "custom-model-v1"):
            assert _modell() == "custom-model-v1"

    def test_openai_fallback(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "openai"):
            assert "gpt" in _modell()

    def test_unknown_provider_fallback(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "unbekannt"):
            # Falls back to anthropic default
            assert "claude" in _modell()


# --- System-Prompt Generierung ---

class TestSystemPrompts:
    def test_chat_prompt_enthalt_branche(self):
        b = BRANCHEN["arztpraxis"]
        prompt = _system_chat(b)
        assert "Praxis-Assistent" in prompt
        assert "Patienten" in prompt
        assert "Aerzte" in prompt

    def test_chat_prompt_mit_firmenname(self):
        b = BRANCHEN["arztpraxis"]
        prompt = _system_chat(b, firmen_name="Dr. Mueller Praxis")
        assert "Dr. Mueller Praxis" in prompt

    def test_chat_prompt_schweigepflicht(self):
        b = BRANCHEN["arztpraxis"]
        prompt = _system_chat(b)
        assert "schweigepflicht" in prompt.lower()

    def test_chat_prompt_ohne_schweigepflicht(self):
        b = BRANCHEN["friseur"]
        prompt = _system_chat(b)
        assert "schweigepflicht" not in prompt.lower()

    def test_voicebot_prompt_enthalt_branche(self):
        b = BRANCHEN["werkstatt"]
        prompt = _system_voicebot(b)
        assert "Werkstatt" in prompt
        assert "JSON" in prompt

    def test_voicebot_prompt_mit_firmenname(self):
        b = BRANCHEN["anwalt"]
        prompt = _system_voicebot(b, firmen_name="Kanzlei Meier")
        assert "Kanzlei Meier" in prompt

    def test_uebersetzer_prompt(self):
        b = BRANCHEN["zahnarzt"]
        prompt = _system_uebersetzer(b)
        assert "Uebersetzer" in prompt
        assert "Zahnarztpraxis" in prompt

    def test_uebersetzer_prompt_mit_firmenname(self):
        b = BRANCHEN["tierarzt"]
        prompt = _system_uebersetzer(b, firmen_name="Tierarzt Schulz")
        assert "Tierarzt Schulz" in prompt


# --- Buero-Kontext ---

class TestBueroKontext:
    def test_kontext_mit_leerer_db(self):
        def mock_db():
            raise Exception("DB nicht verfuegbar")

        b = BRANCHEN["arztpraxis"]
        kontext = _buero_kontext(mock_db, b)
        # Sollte nicht crashen, nur leer sein
        assert "_branche" in kontext

    def test_kontext_text_leer(self):
        kontext = {"_branche": BRANCHEN["arztpraxis"]}
        text = _kontext_text(kontext)
        assert "Keine" in text or "Praxis" in text

    def test_kontext_text_mit_kunden(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "kunden": [{"vorname": "Max", "nachname": "Mueller"}],
        }
        text = _kontext_text(kontext)
        assert "Max Mueller" in text
        assert "Patienten" in text

    def test_kontext_text_mit_mitarbeitern(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "mitarbeiter": [{"titel": "Dr.", "vorname": "Hans", "nachname": "Schmidt", "fachrichtung": "Allgemein"}],
        }
        text = _kontext_text(kontext)
        assert "Hans" in text
        assert "Schmidt" in text

    def test_kontext_text_mit_terminen(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "termine_heute": [{"uhrzeit": "09:00", "patient_name": "Max M.", "arzt_name": "Dr. Schmidt"}],
        }
        text = _kontext_text(kontext)
        assert "09:00" in text
        assert "Termine" in text

    def test_kontext_text_mit_wartezimmer(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "wartezimmer": [{"patient_name": "Anna K.", "status": "wartend"}],
        }
        text = _kontext_text(kontext)
        assert "Wartezimmer" in text
        assert "Anna K." in text

    def test_kontext_text_mit_agenten(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "agenten": [{"name": "Rezeption 1", "status": "online"}],
        }
        text = _kontext_text(kontext)
        assert "Agenten" in text
        assert "Rezeption 1" in text


# --- LLM-Anfrage (ohne echte API) ---

class TestLlmAnfrage:
    def test_kein_api_key(self):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            ergebnis = _llm_anfrage("system", [{"role": "user", "content": "test"}])
            assert "fehler" in ergebnis
            assert "API-Key" in ergebnis["fehler"]

    def test_unbekannter_provider(self):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "unbekannt"):
            ergebnis = _llm_anfrage("system", [{"role": "user", "content": "test"}])
            assert "fehler" in ergebnis
            assert "Unbekannter" in ergebnis["fehler"]

    @patch("src.python.llm_service._anthropic_anfrage")
    def test_anthropic_provider(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Test-Antwort"}
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"):
            ergebnis = _llm_anfrage("system", [{"role": "user", "content": "test"}])
            assert ergebnis["antwort"] == "Test-Antwort"
            mock_anfrage.assert_called_once()

    @patch("src.python.llm_service._openai_anfrage")
    def test_openai_provider(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "OpenAI-Antwort"}
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "openai"):
            ergebnis = _llm_anfrage("system", [{"role": "user", "content": "test"}])
            assert ergebnis["antwort"] == "OpenAI-Antwort"

    @patch("src.python.llm_service._anthropic_anfrage")
    def test_exception_handling(self, mock_anfrage):
        mock_anfrage.side_effect = Exception("Netzwerkfehler")
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"):
            ergebnis = _llm_anfrage("system", [{"role": "user", "content": "test"}])
            assert "fehler" in ergebnis
            assert "Netzwerkfehler" in ergebnis["fehler"]


# --- Chat-Antwort ---

class TestChatAntwort:
    @patch("src.python.llm_service._llm_anfrage")
    def test_chat_antwort_erfolg(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Guten Tag, wie kann ich helfen?"}
        mock_db = MagicMock()
        ergebnis = chat_antwort("Hallo", mock_db, branche_key="arztpraxis")
        assert ergebnis["antwort"] == "Guten Tag, wie kann ich helfen?"

    @patch("src.python.llm_service._llm_anfrage")
    def test_chat_antwort_mit_verlauf(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Termin fuer morgen."}
        mock_db = MagicMock()
        verlauf = [
            {"role": "user", "content": "Hallo"},
            {"role": "assistant", "content": "Guten Tag!"},
        ]
        ergebnis = chat_antwort("Termin buchen", mock_db, verlauf=verlauf,
                                 branche_key="arztpraxis")
        assert "antwort" in ergebnis
        # Pruefe dass Verlauf an LLM weitergegeben wird
        call_args = mock_anfrage.call_args
        nachrichten = call_args[0][1]
        assert len(nachrichten) == 3  # 2 Verlauf + 1 Frage

    @patch("src.python.llm_service._llm_anfrage")
    def test_chat_antwort_fehler(self, mock_anfrage):
        mock_anfrage.return_value = {"fehler": "LLM nicht erreichbar"}
        mock_db = MagicMock()
        ergebnis = chat_antwort("Test", mock_db)
        assert "fehler" in ergebnis


# --- Voicebot-Dialog ---

class TestVoicebotDialog:
    @patch("src.python.llm_service._llm_anfrage")
    def test_dialog_mit_json_antwort(self, mock_anfrage):
        mock_anfrage.return_value = {
            "antwort": '{"text": "Willkommen!", "aktion": "weiter", "daten": {}}'
        }
        mock_db = MagicMock()
        ergebnis = voicebot_dialog("1", 0, "allgemein", mock_db,
                                    branche_key="arztpraxis")
        assert ergebnis["antwort"] == "Willkommen!"
        assert ergebnis["aktion"] == "weiter"
        assert ergebnis["schritt"] == 1

    @patch("src.python.llm_service._llm_anfrage")
    def test_dialog_ohne_json(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Einfacher Text ohne JSON"}
        mock_db = MagicMock()
        ergebnis = voicebot_dialog("hallo", 0, "allgemein", mock_db)
        assert ergebnis["antwort"] == "Einfacher Text ohne JSON"
        assert ergebnis["aktion"] == "weiter"
        assert ergebnis["schritt"] == 1

    @patch("src.python.llm_service._llm_anfrage")
    def test_dialog_fehler(self, mock_anfrage):
        mock_anfrage.return_value = {"fehler": "LLM offline"}
        mock_db = MagicMock()
        ergebnis = voicebot_dialog("1", 0, "termin", mock_db)
        assert "fehler" in ergebnis

    @patch("src.python.llm_service._llm_anfrage")
    def test_dialog_mit_termin_aktion(self, mock_anfrage):
        mock_anfrage.return_value = {
            "antwort": '{"text": "Termin gebucht!", "aktion": "termin_buchen", "daten": {"datum": "2026-03-01"}}'
        }
        mock_db = MagicMock()
        ergebnis = voicebot_dialog("ja", 2, "termin", mock_db,
                                    branche_key="zahnarzt", firmen_name="Praxis Dr. Zahn")
        assert ergebnis["aktion"] == "termin_buchen"
        assert ergebnis["daten"]["datum"] == "2026-03-01"


# --- Uebersetzen ---

class TestUebersetzen:
    @patch("src.python.llm_service._llm_anfrage")
    def test_uebersetzen_erfolg(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Good morning, how can I help you?"}
        ergebnis = uebersetzen("Guten Morgen, wie kann ich helfen?", "de", "en")
        assert ergebnis["uebersetzung"] == "Good morning, how can I help you?"

    @patch("src.python.llm_service._llm_anfrage")
    def test_uebersetzen_fehler(self, mock_anfrage):
        mock_anfrage.return_value = {"fehler": "LLM offline"}
        ergebnis = uebersetzen("Test", "de", "en")
        assert "fehler" in ergebnis

    @patch("src.python.llm_service._llm_anfrage")
    def test_uebersetzen_mit_branche(self, mock_anfrage):
        mock_anfrage.return_value = {"antwort": "Appointment"}
        ergebnis = uebersetzen("Termin", "de", "en",
                                branche_key="anwalt", firmen_name="Kanzlei X")
        assert "uebersetzung" in ergebnis


# --- LLM-Verfuegbarkeit ---

class TestLlmVerfuegbar:
    def test_nicht_verfuegbar_ohne_key(self):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            assert llm_verfuegbar() is False

    def test_verfuegbar_mit_key(self):
        with patch.object(llm_service, "LLM_API_KEY", "test-key-123"):
            assert llm_verfuegbar() is True


# --- Sprach-Namen ---

class TestSprachNamen:
    def test_bekannte_sprachen(self):
        assert SPRACH_NAMEN["de"] == "Deutsch"
        assert SPRACH_NAMEN["en"] == "Englisch"
        assert SPRACH_NAMEN["tr"] == "Tuerkisch"

    def test_alle_sprachen_vorhanden(self):
        erwartete = {"de", "en", "tr", "ar", "ru", "pl"}
        assert erwartete == set(SPRACH_NAMEN.keys())
