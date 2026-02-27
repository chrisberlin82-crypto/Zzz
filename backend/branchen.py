"""
Branchen-Konfigurationen fuer den Voicebot.
Jede Branche hat eigene Begruessung, Dienste, Regeln und System-Prompts.
"""

BRANCHEN = {
    "arztpraxis": {
        "label": "Arztpraxis",
        "assistent": "Praxis-Telefonistin",
        "kunden": "Patienten",
        "dienste": [
            "Terminvergabe", "Terminabsage und -verschiebung",
            "Rezeptbestellung", "Ueberweisungsanfrage",
            "Befundauskunft", "Rueckrufservice",
        ],
        "notfall": "Bei Notfaellen rufen Sie 112 an. Aerztlicher Bereitschaftsdienst: 116 117.",
        "schweigepflicht": "aerztliche Schweigepflicht",
        "spezial_regeln": "Du gibst NIEMALS medizinische Diagnosen oder Behandlungsratschlaege.",
        "oeffnungszeiten": "Mo-Fr 08:00-12:00, Mo+Di+Do 14:00-18:00",
        "begruessung": "Guten Tag, Sie sind verbunden mit der Arztpraxis. Wie kann ich Ihnen helfen?",
        "voicebot_menue": {
            "1": "Termin vereinbaren oder absagen",
            "2": "Rezept oder Ueberweisung bestellen",
            "3": "Befundauskunft",
            "0": "Weiterleitung an die Rezeption",
        },
    },
    "zahnarzt": {
        "label": "Zahnarztpraxis",
        "assistent": "Praxis-Telefonistin",
        "kunden": "Patienten",
        "dienste": [
            "Terminvergabe", "Schmerzsprechstunde",
            "Prophylaxe-Termin", "Kostenvoranschlag",
        ],
        "notfall": "Bei akuten Zahnschmerzen kommen Sie direkt. Notdienst: 01805-986700.",
        "schweigepflicht": "aerztliche Schweigepflicht",
        "spezial_regeln": "Du gibst NIEMALS zahnmedizinische Diagnosen oder Behandlungsratschlaege.",
        "oeffnungszeiten": "Mo-Fr 08:00-12:00, Mo+Di+Do 14:00-18:00",
        "begruessung": "Guten Tag, Zahnarztpraxis. Wie kann ich Ihnen weiterhelfen?",
        "voicebot_menue": {
            "1": "Termin vereinbaren oder absagen",
            "2": "Schmerzsprechstunde / Notfall",
            "3": "Prophylaxe-Termin",
            "0": "Weiterleitung an die Rezeption",
        },
    },
    "anwalt": {
        "label": "Rechtsanwaltskanzlei",
        "assistent": "Kanzlei-Telefonistin",
        "kunden": "Mandanten",
        "dienste": [
            "Erstberatungstermin", "Folgetermin",
            "Aktenzeichen-Auskunft", "Dokumentenanfrage",
            "Fristenpruefung", "Rueckrufservice",
        ],
        "notfall": "In dringenden Faellen werden Sie sofort verbunden.",
        "schweigepflicht": "anwaltliche Schweigepflicht",
        "spezial_regeln": "Du erteilst KEINE Rechtsberatung oder juristische Einschaetzungen.",
        "oeffnungszeiten": "Mo-Fr 09:00-12:30, Mo-Do 14:00-17:00",
        "begruessung": "Guten Tag, Rechtsanwaltskanzlei. Wie darf ich Ihnen behilflich sein?",
        "voicebot_menue": {
            "1": "Erstberatung",
            "2": "Aktenauskunft",
            "3": "Dokumente einreichen",
            "0": "Sekretariat",
        },
    },
    "steuerberater": {
        "label": "Steuerberatung",
        "assistent": "Kanzlei-Telefonistin",
        "kunden": "Mandanten",
        "dienste": [
            "Beratungstermin", "Dokumenteneinreichung",
            "Fristenpruefung", "Steuerbescheid-Auskunft",
        ],
        "notfall": "",
        "schweigepflicht": "steuerliche Schweigepflicht",
        "spezial_regeln": "Du erteilst KEINE steuerliche Beratung.",
        "oeffnungszeiten": "Mo-Do 08:30-12:30, Mo-Do 14:00-17:00, Fr 08:30-13:00",
        "begruessung": "Guten Tag, Steuerberatungskanzlei. Wie kann ich Ihnen helfen?",
        "voicebot_menue": {
            "1": "Beratungstermin",
            "2": "Dokumente einreichen",
            "3": "Steuerbescheid-Auskunft",
            "0": "Sekretariat",
        },
    },
    "friseur": {
        "label": "Friseursalon",
        "assistent": "Salon-Telefonistin",
        "kunden": "Kunden",
        "dienste": ["Terminvergabe", "Preisauskunft", "Farbberatung"],
        "notfall": "",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "oeffnungszeiten": "Di-Fr 09:00-18:00, Sa 09:00-14:00",
        "begruessung": "Guten Tag, Friseursalon. Wie kann ich Ihnen helfen?",
        "voicebot_menue": {
            "1": "Termin vereinbaren",
            "2": "Preise und Angebote",
            "0": "Empfang",
        },
    },
    "werkstatt": {
        "label": "KFZ-Werkstatt",
        "assistent": "Werkstatt-Telefonistin",
        "kunden": "Kunden",
        "dienste": [
            "Werkstatt-Termin", "Reparatur-Status",
            "HU/AU-Termin", "Kostenvoranschlag",
        ],
        "notfall": "Bei Pannen: ADAC 0800-5 10 11 12.",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "oeffnungszeiten": "Mo-Fr 07:30-17:00, Sa 08:00-12:00",
        "begruessung": "Guten Tag, KFZ-Werkstatt. Wie kann ich Ihnen helfen?",
        "voicebot_menue": {
            "1": "Werkstatt-Termin",
            "2": "Reparatur-Status",
            "3": "HU/AU-Termin",
            "0": "Empfang",
        },
    },
    "tierarzt": {
        "label": "Tierarztpraxis",
        "assistent": "Praxis-Telefonistin",
        "kunden": "Tierbesitzer",
        "dienste": [
            "Terminvergabe", "Impftermin",
            "Notfall-Sprechstunde", "Rezeptbestellung",
        ],
        "notfall": "Bei Notfaellen kommen Sie bitte direkt in die Praxis.",
        "schweigepflicht": "",
        "spezial_regeln": "Du gibst KEINE tiermedizinischen Diagnosen.",
        "oeffnungszeiten": "Mo-Fr 08:00-12:00, Mo+Di+Do 15:00-18:00",
        "begruessung": "Guten Tag, Tierarztpraxis. Wie kann ich Ihnen und Ihrem Tier helfen?",
        "voicebot_menue": {
            "1": "Termin vereinbaren",
            "2": "Impftermin",
            "3": "Rezeptbestellung",
            "0": "Rezeption",
        },
    },
    "allgemein": {
        "label": "Allgemeines Buero",
        "assistent": "Telefonistin",
        "kunden": "Kunden",
        "dienste": ["Terminvergabe", "Allgemeine Auskunft", "Rueckrufservice"],
        "notfall": "",
        "schweigepflicht": "",
        "spezial_regeln": "",
        "oeffnungszeiten": "Mo-Fr 09:00-17:00",
        "begruessung": "Guten Tag, wie kann ich Ihnen weiterhelfen?",
        "voicebot_menue": {
            "1": "Termin vereinbaren",
            "2": "Allgemeine Auskunft",
            "0": "Empfang",
        },
    },
}

STANDARD_BRANCHE = "arztpraxis"


def branche_laden(key=None):
    """Branche laden, Fallback auf allgemein."""
    return BRANCHEN.get(key or STANDARD_BRANCHE, BRANCHEN["allgemein"])


def branchen_liste():
    """Alle verfuegbaren Branchen als {key: label} Dict."""
    return {k: v["label"] for k, v in BRANCHEN.items()}


def voicebot_system_prompt(branche_key=None, firmen_name=""):
    """Generiert den vollstaendigen LLM-System-Prompt fuer den Voicebot."""
    b = branche_laden(branche_key)
    name = firmen_name or b["label"]
    dienste = ", ".join(b["dienste"])

    prompt = (
        f'Du bist die {b["assistent"]} von "{name}".\n'
        f'Du fuehrst ein Telefongespraech mit einem Anrufer ({b["kunden"]}).\n\n'
        f"Deine Aufgaben:\n"
        f"1. Freundlich, natuerlich und professionell antworten.\n"
        f"2. Verfuegbare Dienste: {dienste}.\n"
        f'3. Oeffnungszeiten: {b.get("oeffnungszeiten", "Bitte erfragen")}.'
    )

    nr = 4
    if b.get("schweigepflicht"):
        prompt += f"\n{nr}. Du wahrst die {b['schweigepflicht']}."
        nr += 1
    if b.get("spezial_regeln"):
        prompt += f"\n{nr}. {b['spezial_regeln']}"
        nr += 1
    if b.get("notfall"):
        prompt += f"\n{nr}. Notfall-Hinweis: {b['notfall']}"
        nr += 1

    if b.get("voicebot_menue"):
        menue = "\n".join(f"  Taste {k}: {v}" for k, v in b["voicebot_menue"].items())
        prompt += f"\n\nDTMF-Menue (falls Anrufer Tasten drueckt):\n{menue}"

    return prompt
