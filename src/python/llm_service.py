"""Eingesperrter LLM-Service fuer MED Rezeption.

Das LLM ist strikt auf den Praxis-Kontext beschraenkt.
Es darf NUR medizinische Verwaltungsfragen beantworten,
Patienten- und Termindaten abfragen, uebersetzen und
Voicebot-Dialoge fuehren.
"""

import json
import os
import logging

logger = logging.getLogger(__name__)

# --- LLM-Provider Konfiguration ---

LLM_PROVIDER = os.environ.get("MED_LLM_PROVIDER", "anthropic")  # anthropic | openai
LLM_API_KEY = os.environ.get("MED_LLM_API_KEY", "")
LLM_MODEL = os.environ.get("MED_LLM_MODEL", "")

# Fallback-Modelle
MODELLE = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o-mini",
}


def _modell():
    return LLM_MODEL or MODELLE.get(LLM_PROVIDER, MODELLE["anthropic"])


# --- System-Prompts (Eingesperrt / Sandboxed) ---

SYSTEM_PRAXIS = """Du bist der digitale Assistent der Arztpraxis "MED Rezeption".

STRENGE REGELN - du MUSST dich daran halten:
1. Du darfst NUR Fragen zur Praxisverwaltung beantworten: Patienten, Aerzte, Termine, Wartezimmer, Rezepte, Agenten, Telefonie.
2. Du darfst KEINE Fragen zu anderen Themen beantworten (Politik, Wetter, allgemeines Wissen, Programmierung, etc.).
3. Bei themenfremden Fragen antworte: "Entschuldigung, ich kann nur bei Praxis-Angelegenheiten helfen. Fragen Sie mich nach Patienten, Terminen, Aerzten oder dem Wartezimmer."
4. Du sprichst Deutsch, hoeflich und professionell.
5. Du gibst NIEMALS medizinische Diagnosen oder Behandlungsratschlaege.
6. Du wahrst die aerztliche Schweigepflicht - gib Patientendaten nur auf direkte Anfrage aus, nie unaufgefordert.
7. Halte Antworten kurz und praezise (max. 3-4 Saetze).
8. Du hast Zugriff auf folgende Praxisdaten, die dir als Kontext uebergeben werden."""

SYSTEM_VOICEBOT = """Du bist der Telefon-Voicebot der Arztpraxis "MED Rezeption".

STRENGE REGELN:
1. Du fuehrst NUR Telefondialoge fuer: Terminvergabe, Rezeptbestellung, Weiterleitung an Rezeption.
2. Du sprichst hoeflich, kurz und klar auf Deutsch.
3. Du fragst strukturiert nach: Fachrichtung, gewuenschtes Datum, Name, Versicherungsnummer.
4. Du gibst KEINE medizinischen Ratschlaege.
5. Bei Notfaellen: Sofort auf 112 verweisen.
6. Du kannst DTMF-Eingaben interpretieren und darauf reagieren.
7. Antworten im JSON-Format: {"text": "...", "aktion": "weiter|termin_buchen|rezept|transfer|warteschlange|ende", "daten": {}}"""

SYSTEM_UEBERSETZER = """Du bist der medizinische Uebersetzer der Arztpraxis "MED Rezeption".

STRENGE REGELN:
1. Du uebersetzt NUR medizinische und praxisbezogene Texte.
2. Unterstuetzte Sprachen: Deutsch, Englisch, Tuerkisch, Arabisch, Russisch, Polnisch.
3. Verwende medizinisch korrekte Fachbegriffe.
4. Bei nicht-medizinischen Texten: Uebersetze trotzdem, aber nur im Praxis-Kontext.
5. Gib NUR die Uebersetzung zurueck, keine Erklaerungen.
6. Behalte die Formalitaet bei (Sie-Form)."""

# Sprachcodes
SPRACH_NAMEN = {
    "de": "Deutsch",
    "en": "Englisch",
    "tr": "Tuerkisch",
    "ar": "Arabisch",
    "ru": "Russisch",
    "pl": "Polnisch",
}


def _praxis_kontext(db_func):
    """Sammelt aktuelle Praxisdaten als Kontext fuer das LLM."""
    kontext = {}
    try:
        from src.python.datenbank import (
            patient_alle, arzt_alle, termin_alle,
            wartezimmer_aktuelle, agent_alle,
        )
        conn = db_func()
        kontext["patienten"] = patient_alle(conn)
        kontext["aerzte"] = arzt_alle(conn)
        kontext["termine_heute"] = termin_alle(conn)
        kontext["wartezimmer"] = wartezimmer_aktuelle(conn)
        kontext["agenten"] = agent_alle(conn)
    except Exception as e:
        logger.warning("Praxis-Kontext konnte nicht geladen werden: %s", e)
    return kontext


def _kontext_text(kontext):
    """Formatiert den Praxis-Kontext als lesbaren Text."""
    teile = []
    if kontext.get("patienten"):
        namen = [f"{p.get('vorname', '')} {p.get('nachname', '')}".strip() for p in kontext["patienten"]]
        teile.append(f"Patienten ({len(namen)}): {', '.join(namen)}")
    if kontext.get("aerzte"):
        infos = [f"{a.get('titel', '')} {a.get('vorname', '')} {a.get('nachname', '')} ({a.get('fachrichtung', '')})".strip() for a in kontext["aerzte"]]
        teile.append(f"Aerzte ({len(infos)}): {', '.join(infos)}")
    if kontext.get("termine_heute"):
        t_infos = [f"{t.get('uhrzeit', '?')} {t.get('patient_name', '?')} bei {t.get('arzt_name', '?')}" for t in kontext["termine_heute"]]
        teile.append(f"Termine heute ({len(t_infos)}): {', '.join(t_infos)}")
    if kontext.get("wartezimmer"):
        w_infos = [f"{w.get('patient_name', '?')} ({w.get('status', '?')})" for w in kontext["wartezimmer"]]
        teile.append(f"Wartezimmer ({len(w_infos)}): {', '.join(w_infos)}")
    if kontext.get("agenten"):
        ag_infos = [f"{a.get('name', '?')} ({a.get('status', 'offline')})" for a in kontext["agenten"]]
        teile.append(f"Agenten ({len(ag_infos)}): {', '.join(ag_infos)}")
    return "\n".join(teile) if teile else "Keine Praxisdaten verfuegbar."


# --- LLM API-Aufrufe ---

def _llm_anfrage(system_prompt, nachrichten, max_tokens=500):
    """Sendet eine Anfrage an das konfigurierte LLM."""
    if not LLM_API_KEY:
        return {"fehler": "Kein LLM-API-Key konfiguriert (MED_LLM_API_KEY)"}

    try:
        if LLM_PROVIDER == "anthropic":
            return _anthropic_anfrage(system_prompt, nachrichten, max_tokens)
        elif LLM_PROVIDER == "openai":
            return _openai_anfrage(system_prompt, nachrichten, max_tokens)
        else:
            return {"fehler": f"Unbekannter LLM-Provider: {LLM_PROVIDER}"}
    except Exception as e:
        logger.error("LLM-Anfrage fehlgeschlagen: %s", e)
        return {"fehler": f"LLM nicht erreichbar: {str(e)}"}


def _anthropic_anfrage(system_prompt, nachrichten, max_tokens):
    """Anfrage an Anthropic Claude API."""
    import httpx

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": LLM_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": _modell(),
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": nachrichten,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    daten = response.json()
    text = ""
    for block in daten.get("content", []):
        if block.get("type") == "text":
            text += block["text"]
    return {"antwort": text}


def _openai_anfrage(system_prompt, nachrichten, max_tokens):
    """Anfrage an OpenAI API."""
    import httpx

    messages = [{"role": "system", "content": system_prompt}]
    for n in nachrichten:
        messages.append({"role": n.get("role", "user"), "content": n.get("content", "")})

    response = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": _modell(),
            "max_tokens": max_tokens,
            "messages": messages,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    daten = response.json()
    text = daten.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"antwort": text}


# --- Oeffentliche Funktionen ---

def chat_antwort(frage, db_func, verlauf=None):
    """Generiert eine Chat-Antwort mit Praxis-Kontext.

    Args:
        frage: Die Benutzerfrage
        db_func: Funktion die eine DB-Verbindung liefert
        verlauf: Optionale Chat-Historie [{role, content}, ...]

    Returns:
        dict mit 'antwort' oder 'fehler'
    """
    kontext = _praxis_kontext(db_func)
    kontext_text = _kontext_text(kontext)

    system = SYSTEM_PRAXIS + f"\n\nAktuelle Praxisdaten:\n{kontext_text}"

    nachrichten = []
    if verlauf:
        for v in verlauf[-10:]:  # Maximal 10 letzte Nachrichten
            nachrichten.append({
                "role": v.get("role", "user"),
                "content": v.get("content", ""),
            })
    nachrichten.append({"role": "user", "content": frage})

    return _llm_anfrage(system, nachrichten, max_tokens=300)


def voicebot_dialog(eingabe, schritt, dialog_typ, db_func):
    """Fuehrt einen Voicebot-Dialog-Schritt aus.

    Args:
        eingabe: DTMF-Taste oder Spracheingabe
        schritt: Aktueller Dialog-Schritt (0=Start)
        dialog_typ: 'termin', 'rezept', 'allgemein'
        db_func: Funktion die eine DB-Verbindung liefert

    Returns:
        dict mit 'antwort' (Text), 'aktion', 'schritt', 'daten'
    """
    kontext = _praxis_kontext(db_func)
    kontext_text = _kontext_text(kontext)

    system = SYSTEM_VOICEBOT + f"\n\nAktuelle Praxisdaten:\n{kontext_text}"
    system += f"\n\nAktueller Dialog: Typ={dialog_typ}, Schritt={schritt}"

    prompt = f"Der Anrufer hat eingegeben: {eingabe}\nDialog-Typ: {dialog_typ}\nSchritt: {schritt}\n\nAntworte im JSON-Format."

    ergebnis = _llm_anfrage(system, [{"role": "user", "content": prompt}], max_tokens=400)

    if "fehler" in ergebnis:
        return ergebnis

    # Versuche JSON zu parsen
    antwort_text = ergebnis.get("antwort", "")
    try:
        # Suche JSON-Block in der Antwort
        start = antwort_text.find("{")
        ende = antwort_text.rfind("}") + 1
        if start >= 0 and ende > start:
            parsed = json.loads(antwort_text[start:ende])
            return {
                "antwort": parsed.get("text", antwort_text),
                "aktion": parsed.get("aktion", "weiter"),
                "schritt": schritt + 1,
                "daten": parsed.get("daten", {}),
            }
    except (json.JSONDecodeError, ValueError):
        pass

    return {
        "antwort": antwort_text,
        "aktion": "weiter",
        "schritt": schritt + 1,
        "daten": {},
    }


def uebersetzen(text, von, nach):
    """Uebersetzt medizinischen Text zwischen Sprachen.

    Args:
        text: Zu uebersetzender Text
        von: Quellsprache (de, en, tr, ar, ru, pl)
        nach: Zielsprache (de, en, tr, ar, ru, pl)

    Returns:
        dict mit 'uebersetzung' oder 'fehler'
    """
    von_name = SPRACH_NAMEN.get(von, von)
    nach_name = SPRACH_NAMEN.get(nach, nach)

    system = SYSTEM_UEBERSETZER
    prompt = f"Uebersetze folgenden medizinischen Text von {von_name} nach {nach_name}. Gib NUR die Uebersetzung zurueck, nichts anderes.\n\nText: {text}"

    ergebnis = _llm_anfrage(system, [{"role": "user", "content": prompt}], max_tokens=300)

    if "fehler" in ergebnis:
        return ergebnis

    return {"uebersetzung": ergebnis.get("antwort", text)}


def llm_verfuegbar():
    """Prueft ob ein LLM konfiguriert und erreichbar ist."""
    return bool(LLM_API_KEY)
