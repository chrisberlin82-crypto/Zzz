"""
LLM — Sprachmodell via Ollama (lokal).
Llama 3.1 8B laeuft komplett auf dem Server. DSGVO-konform.
"""
import asyncio
import logging
from typing import List
from config import settings

log = logging.getLogger("voicebot.llm")


class LLMProcessor:
    def __init__(self):
        self.client = None

    async def initialize(self):
        """Ollama-Client initialisieren."""
        try:
            import ollama
            self.client = ollama.AsyncClient(host=settings.llm_base_url)
            # Pruefen ob Modell verfuegbar
            models = await self.client.list()
            # Ollama >=0.4: models is a dict with 'models' key
            # Ollama <0.4: models is an object with .models attribute
            if isinstance(models, dict):
                modell_liste = models.get("models", [])
                modell_namen = [m.get("model", m.get("name", "")) for m in modell_liste]
            else:
                modell_namen = [m.model for m in models.models]
            if settings.llm_model not in modell_namen:
                log.warning(
                    "LLM-Modell '%s' nicht gefunden. Verfuegbar: %s. "
                    "Bitte mit 'ollama pull %s' herunterladen.",
                    settings.llm_model,
                    modell_namen,
                    settings.llm_model,
                )
            else:
                log.info("LLM bereit: %s", settings.llm_model)
        except ImportError:
            log.warning("Ollama-Client nicht installiert.")
        except Exception as e:
            log.warning("LLM nicht erreichbar: %s (wird beim ersten Anruf erneut versucht)", e)

    async def antwort_generieren(
        self,
        verlauf: List[dict],
        kontext: str = "",
        max_tokens: int = 0,
    ) -> str:
        """
        Antwort basierend auf dem Gespraechsverlauf generieren.

        Args:
            verlauf: Liste von {"rolle": "anrufer"|"bot", "text": "..."}
            kontext: Zusaetzlicher Kontext (Callflow, Patientendaten, etc.)
            max_tokens: Max. Antwortlaenge (0 = Standard aus Config)

        Returns:
            Antworttext des Bots.
        """
        if not self.client:
            return "Entschuldigung, ich habe gerade ein technisches Problem. Ich verbinde Sie mit einem Mitarbeiter."

        # System-Prompt bauen
        system = settings.llm_system_prompt
        if kontext:
            system += f"\n\nZusaetzlicher Kontext:\n{kontext}"

        # Wichtige Anweisungen fuer natuerliche Telefonate
        system += (
            "\n\nWICHTIG fuer dein Verhalten am Telefon:"
            "\n- Antworte KURZ (1-3 Saetze). Kein Anrufer will lange Monologe."
            "\n- Benutze natuerliche Fuellwoerter: 'Ach so', 'Alles klar', 'Moment'."
            "\n- Stelle eine Frage pro Antwort, nicht mehrere."
            "\n- Wenn du etwas nicht verstehst, frag hoeflich nach."
            "\n- Nenne NIE technische Details (API, Datenbank, etc.)."
            "\n- Sprich wie eine echte Person, nicht wie ein Computer."
        )

        # Nachrichten formatieren
        messages = [{"role": "system", "content": system}]
        for msg in verlauf:
            rolle = "user" if msg["rolle"] == "anrufer" else "assistant"
            messages.append({"role": rolle, "content": msg["text"]})

        try:
            response = await asyncio.wait_for(
                self.client.chat(
                    model=settings.llm_model,
                    messages=messages,
                    options={
                        "temperature": settings.llm_temperature,
                        "num_predict": max_tokens or settings.llm_max_tokens,
                        "top_p": 0.9,
                        "repeat_penalty": 1.1,
                    },
                ),
                timeout=30.0,
            )
            antwort = response.message.content.strip()

            # Antwort bereinigen (LLMs fuegen manchmal Markdown o.ae. ein)
            antwort = antwort.replace("*", "").replace("#", "").replace("`", "")

            return antwort
        except asyncio.TimeoutError:
            log.error("LLM Timeout (>30s)")
            return "Entschuldigung, das dauert gerade etwas laenger. Einen Moment bitte."
        except Exception as e:
            log.error("LLM Fehler: %s", e)
            return "Einen Moment bitte, ich verbinde Sie."

    async def zusammenfassung(self, verlauf: List[dict]) -> str:
        """
        Gespraeches-Zusammenfassung erstellen (nach Anruf-Ende).
        Wird in der Datenbank gespeichert und an Praxis gemailt.
        """
        if not self.client or len(verlauf) < 2:
            return ""

        messages = [
            {
                "role": "system",
                "content": (
                    "Erstelle eine kurze Zusammenfassung dieses Telefonats. "
                    "Format: Anrufer, Anliegen, Ergebnis, ggf. Termin/Aktion. "
                    "Maximal 3-4 Zeilen. Sachlich und praezise."
                ),
            },
            {
                "role": "user",
                "content": "\n".join(
                    f"{'Anrufer' if m['rolle']=='anrufer' else 'Praxis'}: {m['text']}"
                    for m in verlauf
                ),
            },
        ]

        try:
            response = await asyncio.wait_for(
                self.client.chat(
                    model=settings.llm_model,
                    messages=messages,
                    options={"temperature": 0.3, "num_predict": 200},
                ),
                timeout=30.0,
            )
            return response.message.content.strip()
        except asyncio.TimeoutError:
            log.error("Zusammenfassung Timeout (>30s)")
            return ""
        except Exception as e:
            log.error("Zusammenfassung Fehler: %s", e)
            return ""

    async def kb_antwort(self, frage: str, kb_artikel: List[dict]) -> str:
        """
        Antwort aus der Wissensdatenbank generieren.
        LLM bekommt passende KB-Artikel und formuliert eine natuerliche Antwort.
        """
        if not self.client or not kb_artikel:
            return ""

        kb_text = "\n\n".join(
            f"Frage: {a.get('frage', '')}\nAntwort: {a.get('antwort', '')}"
            for a in kb_artikel
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "Du bist eine Telefonistin. Der Anrufer hat eine Frage. "
                    "Beantworte sie basierend auf folgenden Informationen. "
                    "Formuliere die Antwort natuerlich fuer ein Telefonat (kurz, klar)."
                    f"\n\n--- Wissensdatenbank ---\n{kb_text}"
                ),
            },
            {"role": "user", "content": frage},
        ]

        try:
            response = await asyncio.wait_for(
                self.client.chat(
                    model=settings.llm_model,
                    messages=messages,
                    options={"temperature": 0.4, "num_predict": 150},
                ),
                timeout=30.0,
            )
            return response.message.content.strip()
        except asyncio.TimeoutError:
            log.error("KB-Antwort Timeout (>30s)")
            return ""
        except Exception as e:
            log.error("KB-Antwort Fehler: %s", e)
            return ""
