"""Tests fuer den LLM-Service (eingesperrter Buero-Assistent)."""

import json
import pytest
from unittest.mock import patch, MagicMock

from src.python import llm_service
from src.python.llm_service import (
    _modell,
    branche_laden,
    branchen_liste,
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
    BRANCHEN,
    SPRACH_NAMEN,
)


class TestModell:
    def test_fallback_anthropic(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"):
            assert "claude" in _modell()

    def test_fallback_openai(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "openai"):
            assert "gpt" in _modell()

    def test_custom_model(self):
        with patch.object(llm_service, "LLM_MODEL", "mein-modell"):
            assert _modell() == "mein-modell"

    def test_unbekannter_provider_fallback(self):
        with patch.object(llm_service, "LLM_MODEL", ""), \
             patch.object(llm_service, "LLM_PROVIDER", "unbekannt"):
            assert "claude" in _modell()


class TestBrancheLaden:
    def test_standard_arztpraxis(self):
        b = branche_laden("arztpraxis")
        assert b["label"] == "Arztpraxis"
        assert b["kunden"] == "Patienten"

    def test_anwalt(self):
        b = branche_laden("anwalt")
        assert b["label"] == "Rechtsanwaltskanzlei"
        assert b["kunden"] == "Mandanten"

    def test_unbekannte_branche_fallback(self):
        b = branche_laden("gibts_nicht")
        assert b["label"] == "Allgemeines Buero"

    def test_none_verwendet_standard(self):
        b = branche_laden(None)
        assert b is not None
        assert "label" in b


class TestBranchenListe:
    def test_gibt_dict_zurueck(self):
        liste = branchen_liste()
        assert isinstance(liste, dict)
        assert "arztpraxis" in liste
        assert liste["arztpraxis"] == "Arztpraxis"

    def test_alle_branchen_enthalten(self):
        liste = branchen_liste()
        assert len(liste) == len(BRANCHEN)


class TestSystemPrompts:
    def test_chat_arztpraxis(self):
        b = branche_laden("arztpraxis")
        prompt = _system_chat(b)
        assert "Praxis-Assistent" in prompt
        assert "Patienten" in prompt
        assert "schweigepflicht" in prompt.lower()

    def test_chat_mit_firmenname(self):
        b = branche_laden("arztpraxis")
        prompt = _system_chat(b, "Dr. Mueller Praxis")
        assert "Dr. Mueller Praxis" in prompt

    def test_chat_ohne_schweigepflicht(self):
        b = branche_laden("friseur")
        prompt = _system_chat(b)
        assert "Salon-Assistent" in prompt

    def test_chat_mit_spezialregeln(self):
        b = branche_laden("arztpraxis")
        prompt = _system_chat(b)
        assert "NIEMALS" in prompt

    def test_chat_mit_notfall(self):
        b = branche_laden("arztpraxis")
        prompt = _system_chat(b)
        assert "112" in prompt

    def test_chat_ohne_notfall(self):
        b = branche_laden("steuerberater")
        prompt = _system_chat(b)
        assert "Buero-Assistent" in prompt

    def test_voicebot_arztpraxis(self):
        b = branche_laden("arztpraxis")
        prompt = _system_voicebot(b)
        assert "Telefon-Voicebot" in prompt
        assert "JSON" in prompt

    def test_voicebot_mit_firmenname(self):
        b = branche_laden("zahnarzt")
        prompt = _system_voicebot(b, "Zahnarzt Schmidt")
        assert "Zahnarzt Schmidt" in prompt

    def test_voicebot_ohne_spezialregeln(self):
        b = branche_laden("friseur")
        prompt = _system_voicebot(b)
        assert "Friseursalon" in prompt

    def test_uebersetzer_arztpraxis(self):
        b = branche_laden("arztpraxis")
        prompt = _system_uebersetzer(b)
        assert "Uebersetzer" in prompt
        assert "Deutsch" in prompt

    def test_uebersetzer_mit_firmenname(self):
        b = branche_laden("anwalt")
        prompt = _system_uebersetzer(b, "Kanzlei Weber")
        assert "Kanzlei Weber" in prompt


class TestBueroKontext:
    def test_kontext_mit_daten(self):
        mock_conn = MagicMock()
        with patch("src.python.datenbank.patient_alle", return_value=[{"vorname": "Max", "nachname": "Muster"}]), \
             patch("src.python.datenbank.arzt_alle", return_value=[{"titel": "Dr.", "vorname": "Anna", "nachname": "Schmidt", "fachrichtung": "Allgemein"}]), \
             patch("src.python.datenbank.termin_alle", return_value=[]), \
             patch("src.python.datenbank.wartezimmer_aktuelle", return_value=[]), \
             patch("src.python.datenbank.agent_alle", return_value=[]):
            kontext = _buero_kontext(lambda: mock_conn, BRANCHEN["arztpraxis"])
            assert "kunden" in kontext
            assert len(kontext["kunden"]) == 1

    def test_kontext_bei_fehler(self):
        def fehler_func():
            raise Exception("DB-Fehler")
        kontext = _buero_kontext(fehler_func, BRANCHEN["arztpraxis"])
        assert "_branche" in kontext


class TestKontextText:
    def test_leer(self):
        text = _kontext_text({"_branche": BRANCHEN["arztpraxis"]})
        assert "Keine" in text

    def test_mit_kunden(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "kunden": [{"vorname": "Max", "nachname": "Muster"}],
        }
        text = _kontext_text(kontext)
        assert "Max Muster" in text
        assert "Patienten" in text

    def test_mit_mitarbeitern(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "mitarbeiter": [{"titel": "Dr.", "vorname": "Anna", "nachname": "Schmidt", "fachrichtung": "Allgemein"}],
        }
        text = _kontext_text(kontext)
        assert "Anna" in text
        assert "Aerzte" in text

    def test_mit_terminen(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "termine_heute": [{"uhrzeit": "10:00", "patient_name": "Max", "arzt_name": "Dr. Schmidt"}],
        }
        text = _kontext_text(kontext)
        assert "10:00" in text

    def test_mit_wartezimmer(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "wartezimmer": [{"patient_name": "Max", "status": "wartend"}],
        }
        text = _kontext_text(kontext)
        assert "wartend" in text

    def test_mit_agenten(self):
        kontext = {
            "_branche": BRANCHEN["arztpraxis"],
            "agenten": [{"name": "Agent1", "status": "online"}],
        }
        text = _kontext_text(kontext)
        assert "Agent1" in text

    def test_ohne_branche_fallback(self):
        text = _kontext_text({})
        assert "Keine" in text


class TestLlmAnfrage:
    def test_kein_api_key(self):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            result = _llm_anfrage("system", [{"role": "user", "content": "hallo"}])
            assert "fehler" in result
            assert "API-Key" in result["fehler"]

    def test_unbekannter_provider(self):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "unbekannt"):
            result = _llm_anfrage("system", [{"role": "user", "content": "hallo"}])
            assert "fehler" in result
            assert "Unbekannter" in result["fehler"]

    def test_anthropic_anfrage_erfolgreich(self):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "content": [{"type": "text", "text": "Hallo!"}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"), \
             patch("httpx.post", return_value=mock_response):
            from src.python.llm_service import _anthropic_anfrage
            result = _anthropic_anfrage("system", [{"role": "user", "content": "test"}], 500)
            assert result["antwort"] == "Hallo!"

    def test_openai_anfrage_erfolgreich(self):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Antwort!"}}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "openai"), \
             patch("httpx.post", return_value=mock_response):
            from src.python.llm_service import _openai_anfrage
            result = _openai_anfrage("system", [{"role": "user", "content": "test"}], 500)
            assert result["antwort"] == "Antwort!"

    def test_anfrage_exception(self):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"), \
             patch.object(llm_service, "LLM_PROVIDER", "anthropic"):
            # Patch httpx at module level inside llm_service
            with patch.dict("sys.modules", {"httpx": MagicMock(post=MagicMock(side_effect=Exception("Netzwerkfehler")))}):
                result = _llm_anfrage("system", [{"role": "user", "content": "test"}])
                assert "fehler" in result


class TestChatAntwort:
    def test_chat_mit_mock(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Guten Tag!"}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = chat_antwort("Hallo", lambda: None, branche_key="arztpraxis")
            assert result["antwort"] == "Guten Tag!"

    def test_chat_mit_verlauf(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "OK"}) as mock_anfrage, \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            verlauf = [{"role": "user", "content": "Eins"}, {"role": "assistant", "content": "Zwei"}]
            result = chat_antwort("Drei", lambda: None, verlauf=verlauf, branche_key="arztpraxis")
            assert result["antwort"] == "OK"
            # Nachrichten sollten Verlauf + neue Frage enthalten
            args = mock_anfrage.call_args
            nachrichten = args[0][1]
            assert len(nachrichten) == 3  # 2 Verlauf + 1 neue

    def test_chat_fehler(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Kein Key"}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = chat_antwort("Hallo", lambda: None)
            assert "fehler" in result


class TestVoicebotDialog:
    def test_dialog_json_antwort(self):
        json_antwort = json.dumps({"text": "Willkommen!", "aktion": "weiter", "daten": {}})
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": json_antwort}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = voicebot_dialog("1", 0, "termin", lambda: None, "arztpraxis")
            assert result["antwort"] == "Willkommen!"
            assert result["aktion"] == "weiter"
            assert result["schritt"] == 1

    def test_dialog_text_antwort(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Einfacher Text"}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = voicebot_dialog("1", 0, "allgemein", lambda: None)
            assert result["antwort"] == "Einfacher Text"
            assert result["aktion"] == "weiter"

    def test_dialog_fehler(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Nicht verfuegbar"}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = voicebot_dialog("1", 0, "termin", lambda: None)
            assert "fehler" in result

    def test_dialog_ungueltig_json(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Hier ist {kaputter JSON"}), \
             patch("src.python.llm_service._buero_kontext", return_value={"_branche": BRANCHEN["arztpraxis"]}):
            result = voicebot_dialog("1", 0, "termin", lambda: None)
            assert result["aktion"] == "weiter"


class TestUebersetzen:
    def test_uebersetzen_erfolgreich(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Hello"}):
            result = uebersetzen("Hallo", "de", "en", "arztpraxis")
            assert result["uebersetzung"] == "Hello"

    def test_uebersetzen_fehler(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"fehler": "Kein Key"}):
            result = uebersetzen("Hallo", "de", "en")
            assert "fehler" in result

    def test_uebersetzen_unbekannte_sprache(self):
        with patch("src.python.llm_service._llm_anfrage", return_value={"antwort": "Bonjour"}):
            result = uebersetzen("Hallo", "de", "fr")
            assert result["uebersetzung"] == "Bonjour"


class TestLlmVerfuegbar:
    def test_mit_key(self):
        with patch.object(llm_service, "LLM_API_KEY", "test-key"):
            assert llm_verfuegbar() is True

    def test_ohne_key(self):
        with patch.object(llm_service, "LLM_API_KEY", ""):
            assert llm_verfuegbar() is False
