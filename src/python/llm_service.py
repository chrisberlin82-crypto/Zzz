"""Eingesperrter LLM-Service - Universell fuer alle Buero-Typen.

Das LLM ist strikt auf den konfigurierten Buero-Kontext beschraenkt.
Es darf NUR Verwaltungsfragen zum jeweiligen Buero-Typ beantworten,
Kunden- und Termindaten abfragen, uebersetzen und
Voicebot-Dialoge fuehren.

Unterstuetzte Branchen: Arztpraxis, Zahnarzt, Anwalt, Steuerberater,
Friseur, KFZ-Werkstatt, Tierarzt, und beliebige weitere.
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


# --- Branchen-Konfiguration (Office-Typen) ---

BRANCHEN = {
    "arztpraxis": {
        "label": "Arztpraxis",
        "buero_name": "Praxis",
        "verwaltung": "Praxisverwaltung",
        "assistent": "Praxis-Assistent",
        "kunden": "Patienten",
        "kunden_singular": "Patient",
        "mitarbeiter": "Aerzte",
        "mitarbeiter_singular": "Arzt",
        "termin_typ": "Behandlungstermin",
        "dienste": ["Terminvergabe", "Rezeptbestellung", "Weiterleitung an Rezeption"],
        "notfall": "Bei Notfaellen rufen Sie sofort 112 an.",
        "schweigepflicht": "aerztliche Schweigepflicht",
        "spezial_regeln": "Du gibst NIEMALS medizinische Diagnosen oder Behandlungsratschlaege.",
        "fachgebiet_frage": "Fuer welche Fachrichtung moechten Sie einen Termin?",
    },
    "zahnarzt": {
        "label": "Zahnarztpraxis",
        "buero_name": "Praxis",
        "verwaltung": "Praxisverwaltung",
        "assistent": "Praxis-Assistent",
        "kunden": "Patienten",
        "kunden_singular": "Patient",
        "mitarbeiter": "Zahnaerzte",
        "mitarbeiter_singular": "Zahnarzt",
        "termin_typ": "Behandlungstermin",
        "dienste": ["Terminvergabe", "Rezeptbestellung", "Weiterleitung an Rezeption"],
        "notfall": "Bei zahnmedizinischen Notfaellen rufen Sie 112 an oder kommen Sie direkt.",
        "schweigepflicht": "aerztliche Schweigepflicht",
        "spezial_regeln": "Du gibst NIEMALS zahnmedizinische Diagnosen oder Behandlungsratschlaege.",
        "fachgebiet_frage": "Welche Art der Behandlung wuenschen Sie?",
    },
    "anwalt": {
        "label": "Rechtsanwaltskanzlei",
        "buero_name": "Kanzlei",
        "verwaltung": "Kanzleiverwaltung",
        "assistent": "Kanzlei-Assistent",
        "kunden": "Mandanten",
        "kunden_singular": "Mandant",
        "mitarbeiter": "Anwaelte",
        "mitarbeiter_singular": "Anwalt",
        "termin_typ": "Beratungstermin",
        "dienste": ["Terminvergabe", "Dokumentenanfrage", "Weiterleitung an Sekretariat"],
        "notfall": "",
        "schweigepflicht": "anwaltliche Schweigepflicht",
        "spezial_regeln": "Du erteilst KEINE Rechtsberatung oder juristische Einschaetzungen.",
        "fachgebiet_frage": "In welchem Rechtsgebiet benoetigen Sie Beratung?",
    },
    "steuerberater": {
        "label": "Steuerberatungsbuero",
        "buero_name": "Buero",
        "verwaltung": "Bueroverwaltung",
        "assistent": "Buero-Assistent",
        "kunden": "Mandanten",
        "kunden_singular": "Mandant",
        "mitarbeiter": "Steuerberater",
        "mitarbeiter_singular": "Steuerberater",
        "termin_typ": "Beratungstermin",
        "dienste": ["Terminvergabe", "Dokumentenanfrage", "Weiterleitung an Sachbearbeiter"],
        "notfall": "",
        "schweigepflicht": "steuerliche Schweigepflicht",
        "spezial_regeln": "Du erteilst KEINE Steuerberatung oder steuerliche Einschaetzungen.",
        "fachgebiet_frage": "Um welche Art der Beratung geht es?",
    },
    "friseur": {
        "label": "Friseursalon",
        "buero_name": "Salon",
        "verwaltung": "Salonverwaltung",
        "assistent": "Salon-Assistent",
        "kunden": "Kunden",
        "kunden_singular": "Kunde",
        "mitarbeiter": "Friseure",
        "mitarbeiter_singular": "Friseur",
        "termin_typ": "Termin",
        "dienste": ["Terminvergabe", "Weiterleitung"],
        "notfall": "",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "fachgebiet_frage": "Welchen Service wuenschen Sie?",
    },
    "werkstatt": {
        "label": "KFZ-Werkstatt",
        "buero_name": "Werkstatt",
        "verwaltung": "Werkstattverwaltung",
        "assistent": "Werkstatt-Assistent",
        "kunden": "Kunden",
        "kunden_singular": "Kunde",
        "mitarbeiter": "Mechaniker",
        "mitarbeiter_singular": "Mechaniker",
        "termin_typ": "Werkstatttermin",
        "dienste": ["Terminvergabe", "Statusabfrage", "Weiterleitung an Meister"],
        "notfall": "Bei Pannen: ADAC 0800-5 10 11 12",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "fachgebiet_frage": "Welche Art von Reparatur oder Service benoetigen Sie?",
    },
    "tierarzt": {
        "label": "Tierarztpraxis",
        "buero_name": "Praxis",
        "verwaltung": "Praxisverwaltung",
        "assistent": "Praxis-Assistent",
        "kunden": "Tierhalter",
        "kunden_singular": "Tierhalter",
        "mitarbeiter": "Tieraerzte",
        "mitarbeiter_singular": "Tierarzt",
        "termin_typ": "Behandlungstermin",
        "dienste": ["Terminvergabe", "Rezeptbestellung", "Weiterleitung an Rezeption"],
        "notfall": "Bei Tier-Notfaellen kommen Sie bitte sofort vorbei.",
        "schweigepflicht": "",
        "spezial_regeln": "Du gibst KEINE tiermedizinischen Diagnosen oder Behandlungsratschlaege.",
        "fachgebiet_frage": "Um welches Tier und welche Art der Behandlung geht es?",
    },
    "allgemein": {
        "label": "Allgemeines Buero",
        "buero_name": "Buero",
        "verwaltung": "Bueroverwaltung",
        "assistent": "Buero-Assistent",
        "kunden": "Kunden",
        "kunden_singular": "Kunde",
        "mitarbeiter": "Mitarbeiter",
        "mitarbeiter_singular": "Mitarbeiter",
        "termin_typ": "Termin",
        "dienste": ["Terminvergabe", "Weiterleitung an Empfang"],
        "notfall": "",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "fachgebiet_frage": "Welche Art von Termin wuenschen Sie?",
    },
}

# Standard-Branche
STANDARD_BRANCHE = os.environ.get("MED_BRANCHE", "arztpraxis")


def branche_laden(branche_key=None):
    """Laedt die Branchen-Konfiguration."""
    key = branche_key or STANDARD_BRANCHE
    return BRANCHEN.get(key, BRANCHEN["allgemein"])


def branchen_liste():
    """Gibt alle verfuegbaren Branchen zurueck."""
    return {k: v["label"] for k, v in BRANCHEN.items()}


# --- System-Prompt Templates (Eingesperrt / Sandboxed) ---

def _system_chat(branche, firmen_name=""):
    """Generiert den Chat-System-Prompt fuer die konfigurierte Branche."""
    b = branche
    name = firmen_name or b["label"]
    dienste = ", ".join(b["dienste"])

    schweige = ""
    if b.get("schweigepflicht"):
        schweige = f"\n6. Du wahrst die {b['schweigepflicht']} - gib {b['kunden']}-Daten nur auf direkte Anfrage aus, nie unaufgefordert."

    spezial = ""
    if b.get("spezial_regeln"):
        spezial = f"\n7. {b['spezial_regeln']}"

    notfall = ""
    if b.get("notfall"):
        notfall = f"\n8. {b['notfall']}"

    return f"""Du bist der digitale {b['assistent']} von "{name}".

STRENGE REGELN - du MUSST dich daran halten:
1. Du darfst NUR Fragen zur {b['verwaltung']} beantworten: {b['kunden']}, {b['mitarbeiter']}, Termine, Wartezimmer, Agenten, Telefonie.
2. Du darfst KEINE Fragen zu anderen Themen beantworten (Politik, Wetter, allgemeines Wissen, Programmierung, etc.).
3. Bei themenfremden Fragen antworte: "Entschuldigung, ich kann nur bei {b['buero_name']}-Angelegenheiten helfen. Fragen Sie mich nach {b['kunden']}, Terminen, {b['mitarbeiter']} oder dem Wartezimmer."
4. Du sprichst Deutsch, hoeflich und professionell.
5. Halte Antworten kurz und praezise (max. 3-4 Saetze).{schweige}{spezial}{notfall}
9. Du hast Zugriff auf folgende {b['buero_name']}-Daten, die dir als Kontext uebergeben werden.
10. Verfuegbare Dienste: {dienste}."""


def _system_voicebot(branche, firmen_name=""):
    """Generiert den Voicebot-System-Prompt fuer die konfigurierte Branche."""
    b = branche
    name = firmen_name or b["label"]
    dienste_text = ", ".join(b["dienste"])

    spezial = ""
    if b.get("spezial_regeln"):
        spezial = f"\n4. {b['spezial_regeln']}"

    notfall = ""
    if b.get("notfall"):
        notfall = f"\n5. {b['notfall']}"

    return f"""Du bist der Telefon-Voicebot von "{name}" ({b['label']}).

STRENGE REGELN:
1. Du fuehrst NUR Telefondialoge fuer: {dienste_text}.
2. Du sprichst hoeflich, kurz und klar auf Deutsch.
3. Du fragst strukturiert nach den relevanten Informationen fuer den gewaehlten Dienst.{spezial}{notfall}
6. Du kannst DTMF-Eingaben interpretieren und darauf reagieren.
7. Antworten im JSON-Format: {{"text": "...", "aktion": "weiter|termin_buchen|transfer|warteschlange|ende", "daten": {{}}}}"""


def _system_uebersetzer(branche, firmen_name=""):
    """Generiert den Uebersetzer-System-Prompt fuer die konfigurierte Branche."""
    b = branche
    name = firmen_name or b["label"]

    return f"""Du bist der Uebersetzer von "{name}" ({b['label']}).

STRENGE REGELN:
1. Du uebersetzt Texte im Kontext: {b['verwaltung']}, {b['kunden']}, {b['mitarbeiter']}, Termine.
2. Unterstuetzte Sprachen: Deutsch, Englisch, Tuerkisch, Arabisch, Russisch, Polnisch.
3. Verwende fachlich korrekte Begriffe fuer die Branche {b['label']}.
4. Gib NUR die Uebersetzung zurueck, keine Erklaerungen.
5. Behalte die Formalitaet bei (Sie-Form)."""


# Sprachcodes
SPRACH_NAMEN = {
    "de": "Deutsch",
    "en": "Englisch",
    "tr": "Tuerkisch",
    "ar": "Arabisch",
    "ru": "Russisch",
    "pl": "Polnisch",
}


def _buero_kontext(db_func, branche):
    """Sammelt aktuelle Buerodaten als Kontext fuer das LLM."""
    kontext = {}
    try:
        from src.python.datenbank import (
            patient_alle, arzt_alle, termin_alle,
            wartezimmer_aktuelle, agent_alle,
        )
        conn = db_func()
        kontext["kunden"] = patient_alle(conn)
        kontext["mitarbeiter"] = arzt_alle(conn)
        kontext["termine_heute"] = termin_alle(conn)
        kontext["wartezimmer"] = wartezimmer_aktuelle(conn)
        kontext["agenten"] = agent_alle(conn)
    except Exception as e:
        logger.warning("Buero-Kontext konnte nicht geladen werden: %s", e)
    kontext["_branche"] = branche
    return kontext


def _kontext_text(kontext):
    """Formatiert den Buero-Kontext als lesbaren Text."""
    b = kontext.get("_branche", BRANCHEN["allgemein"])
    teile = []
    if kontext.get("kunden"):
        namen = [f"{p.get('vorname', '')} {p.get('nachname', '')}".strip() for p in kontext["kunden"]]
        teile.append(f"{b['kunden']} ({len(namen)}): {', '.join(namen)}")
    if kontext.get("mitarbeiter"):
        infos = [f"{a.get('titel', '')} {a.get('vorname', '')} {a.get('nachname', '')} ({a.get('fachrichtung', '')})".strip() for a in kontext["mitarbeiter"]]
        teile.append(f"{b['mitarbeiter']} ({len(infos)}): {', '.join(infos)}")
    if kontext.get("termine_heute"):
        t_infos = [f"{t.get('uhrzeit', '?')} {t.get('patient_name', '?')} bei {t.get('arzt_name', '?')}" for t in kontext["termine_heute"]]
        teile.append(f"Termine heute ({len(t_infos)}): {', '.join(t_infos)}")
    if kontext.get("wartezimmer"):
        w_infos = [f"{w.get('patient_name', '?')} ({w.get('status', '?')})" for w in kontext["wartezimmer"]]
        teile.append(f"Wartezimmer ({len(w_infos)}): {', '.join(w_infos)}")
    if kontext.get("agenten"):
        ag_infos = [f"{a.get('name', '?')} ({a.get('status', 'offline')})" for a in kontext["agenten"]]
        teile.append(f"Agenten ({len(ag_infos)}): {', '.join(ag_infos)}")
    return "\n".join(teile) if teile else f"Keine {b['buero_name']}-Daten verfuegbar."


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

def chat_antwort(frage, db_func, verlauf=None, branche_key=None, firmen_name=""):
    """Generiert eine Chat-Antwort mit Buero-Kontext.

    Args:
        frage: Die Benutzerfrage
        db_func: Funktion die eine DB-Verbindung liefert
        verlauf: Optionale Chat-Historie [{role, content}, ...]
        branche_key: Branchen-Schluessel (z.B. 'arztpraxis', 'anwalt')
        firmen_name: Optionaler Firmenname

    Returns:
        dict mit 'antwort' oder 'fehler'
    """
    branche = branche_laden(branche_key)
    kontext = _buero_kontext(db_func, branche)
    kontext_text = _kontext_text(kontext)

    system = _system_chat(branche, firmen_name)
    system += f"\n\nAktuelle {branche['buero_name']}-Daten:\n{kontext_text}"

    nachrichten = []
    if verlauf:
        for v in verlauf[-10:]:  # Maximal 10 letzte Nachrichten
            nachrichten.append({
                "role": v.get("role", "user"),
                "content": v.get("content", ""),
            })
    nachrichten.append({"role": "user", "content": frage})

    return _llm_anfrage(system, nachrichten, max_tokens=300)


def voicebot_dialog(eingabe, schritt, dialog_typ, db_func, branche_key=None, firmen_name=""):
    """Fuehrt einen Voicebot-Dialog-Schritt aus.

    Args:
        eingabe: DTMF-Taste oder Spracheingabe
        schritt: Aktueller Dialog-Schritt (0=Start)
        dialog_typ: 'termin', 'rezept', 'allgemein'
        db_func: Funktion die eine DB-Verbindung liefert
        branche_key: Branchen-Schluessel
        firmen_name: Optionaler Firmenname

    Returns:
        dict mit 'antwort' (Text), 'aktion', 'schritt', 'daten'
    """
    branche = branche_laden(branche_key)
    kontext = _buero_kontext(db_func, branche)
    kontext_text = _kontext_text(kontext)

    system = _system_voicebot(branche, firmen_name)
    system += f"\n\nAktuelle {branche['buero_name']}-Daten:\n{kontext_text}"
    system += f"\n\nAktueller Dialog: Typ={dialog_typ}, Schritt={schritt}"

    prompt = f"Der Anrufer hat eingegeben: {eingabe}\nDialog-Typ: {dialog_typ}\nSchritt: {schritt}\n\nAntworte im JSON-Format."

    ergebnis = _llm_anfrage(system, [{"role": "user", "content": prompt}], max_tokens=400)

    if "fehler" in ergebnis:
        return ergebnis

    # Versuche JSON zu parsen
    antwort_text = ergebnis.get("antwort", "")
    try:
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


def uebersetzen(text, von, nach, branche_key=None, firmen_name=""):
    """Uebersetzt Text zwischen Sprachen im Buero-Kontext.

    Args:
        text: Zu uebersetzender Text
        von: Quellsprache (de, en, tr, ar, ru, pl)
        nach: Zielsprache (de, en, tr, ar, ru, pl)
        branche_key: Branchen-Schluessel
        firmen_name: Optionaler Firmenname

    Returns:
        dict mit 'uebersetzung' oder 'fehler'
    """
    branche = branche_laden(branche_key)
    von_name = SPRACH_NAMEN.get(von, von)
    nach_name = SPRACH_NAMEN.get(nach, nach)

    system = _system_uebersetzer(branche, firmen_name)
    prompt = f"Uebersetze folgenden Text von {von_name} nach {nach_name}. Gib NUR die Uebersetzung zurueck, nichts anderes.\n\nText: {text}"

    ergebnis = _llm_anfrage(system, [{"role": "user", "content": prompt}], max_tokens=300)

    if "fehler" in ergebnis:
        return ergebnis

    return {"uebersetzung": ergebnis.get("antwort", text)}


def llm_verfuegbar():
    """Prueft ob ein LLM konfiguriert und erreichbar ist."""
    return bool(LLM_API_KEY)
