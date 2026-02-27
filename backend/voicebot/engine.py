"""
Voicebot-Engine — Zentrale Steuerung.
Koordiniert STT, LLM, TTS und Audio-Mixer fuer natuerliche Gespraeche.
Unterstuetzt Barge-In (Anrufer kann jederzeit unterbrechen).

Jede VoicebotSession hat eigene Zustaende (STT-Buffer, TTS-Abbruch-Event),
damit mehrere gleichzeitige Anrufe sich nicht gegenseitig stoeren.
"""
import asyncio
import logging
from typing import Optional
from config import settings
from branchen import branche_laden, voicebot_system_prompt

log = logging.getLogger("voicebot.engine")

# Maximale Anzahl Nachrichten die ans LLM gesendet werden (Sliding Window)
MAX_LLM_VERLAUF = 20


class VoicebotEngine:
    """Hauptklasse — laedt globale Ressourcen, erzeugt Sessions."""

    def __init__(self):
        self.stt = None
        self.tts = None
        self.llm = None
        self.mixer = None
        self._ready = False

    async def initialize(self):
        """Alle Komponenten laden."""
        from voicebot.stt import STTProcessor
        from voicebot.tts import TTSProcessor
        from voicebot.llm import LLMProcessor
        from voicebot.audio_mixer import AudioMixer

        log.info("Lade STT (Faster-Whisper, Modell: %s)...", settings.stt_model)
        self.stt = STTProcessor()
        await self.stt.initialize()

        log.info("Lade TTS (Edge TTS, Stimme: %s)...", settings.tts_stimme)
        self.tts = TTSProcessor()
        await self.tts.initialize()

        log.info("Verbinde LLM (Ollama, Modell: %s)...", settings.llm_model)
        self.llm = LLMProcessor()
        await self.llm.initialize()

        log.info("Lade Audio-Mixer...")
        self.mixer = AudioMixer()
        await self.mixer.initialize()

        self._ready = True
        log.info("Voicebot-Engine bereit")

    async def shutdown(self):
        self._ready = False
        log.info("Voicebot-Engine heruntergefahren")

    def neue_session(self, kanal_id: str, branche: str = "arztpraxis",
                     callflow_id: Optional[int] = None,
                     stimme: Optional[str] = None,
                     hintergrund: Optional[str] = None):
        """Erstellt eine neue Gespraechs-Session."""
        return VoicebotSession(
            self, kanal_id, branche, callflow_id,
            stimme=stimme, hintergrund=hintergrund,
        )


class VoicebotSession:
    """
    Eine aktive Voicebot-Session fuer einen einzelnen Anruf.
    Jede Session hat:
    - Eigenen STT-Stream (eigener Audio-Buffer)
    - Eigenes TTS-Abbruch-Event (fuer Barge-In)
    - Eigenen Gespraechsverlauf
    """

    def __init__(self, engine: VoicebotEngine, kanal_id: str,
                 branche: str = "arztpraxis",
                 callflow_id: Optional[int] = None,
                 stimme: Optional[str] = None,
                 hintergrund: Optional[str] = None):
        self.engine = engine
        self.kanal_id = kanal_id
        self.branche = branche
        self.branche_config = branche_laden(branche)
        self.callflow_id = callflow_id
        self.gespraechs_verlauf = []
        self.aktiv = True
        self.spricht_gerade = False
        self.barge_in_aktiv = True

        # Session-spezifischer STT-Stream (eigener Buffer)
        self._stt_stream = engine.stt.neuer_stream()

        # Session-spezifisches TTS-Abbruch-Event
        self._tts_abbruch = asyncio.Event()

        # Aktiver TTS-Task fuer Barge-In-Abbruch
        self._tts_task: Optional[asyncio.Task] = None

        # Stimme: ID aus Config nachschlagen oder Default
        self._stimme_voice_id = settings.tts_stimme
        if stimme:
            stimmen = settings.verfuegbare_stimmen()
            if stimme in stimmen:
                self._stimme_voice_id = stimmen[stimme]["voice_id"]

        # Hintergrundgeraeusch-Typ
        self._hintergrund_typ = hintergrund or settings.audio_hintergrund_typ
        hintergruende = settings.verfuegbare_hintergruende()
        if self._hintergrund_typ not in hintergruende:
            self._hintergrund_typ = settings.audio_hintergrund_typ

        log.info("Neue Session fuer Kanal %s (Branche: %s, Stimme: %s, Hintergrund: %s)",
                 kanal_id, branche, self._stimme_voice_id, self._hintergrund_typ)

    async def starten(self) -> dict:
        """Session starten — Begruessung abspielen."""
        self.aktiv = True
        log.info("[%s] Session gestartet (Branche: %s)", self.kanal_id, self.branche)

        begruessung = self.branche_config.get(
            "begruessung",
            "Guten Tag, wie kann ich Ihnen helfen?"
        )

        self.gespraechs_verlauf.append({"rolle": "bot", "text": begruessung})

        audio = await self._sprechen(begruessung)

        return {
            "text": begruessung,
            "audio": audio,
        }

    async def audio_empfangen(self, audio_chunk: bytes) -> Optional[dict]:
        """
        Audio vom Anrufer empfangen (Echtzeit-Stream).
        Wird kontinuierlich aufgerufen, auch waehrend der Bot spricht (Barge-In).
        """
        if not self.aktiv:
            return None

        # --- BARGE-IN: Waehrend Bot spricht, pruefen ob Anrufer redet ---
        if self.spricht_gerade and self.barge_in_aktiv:
            hat_sprache = await self.engine.stt.hat_sprache(audio_chunk)
            if hat_sprache:
                log.info("[%s] BARGE-IN erkannt — stoppe TTS", self.kanal_id)
                await self._tts_stoppen()
                self._stt_stream.buffer_leeren()

        # --- STT: Audio -> Text (session-eigener Stream) ---
        ergebnis = await self._stt_stream.verarbeiten(audio_chunk)
        if not ergebnis or not ergebnis.get("text"):
            return None

        erkannter_text = ergebnis["text"].strip()
        if not erkannter_text:
            return None

        log.info("[%s] Anrufer: '%s'", self.kanal_id, erkannter_text)

        self.gespraechs_verlauf.append({"rolle": "anrufer", "text": erkannter_text})

        # --- LLM: Antwort generieren (mit Sliding Window) ---
        verlauf_fuer_llm = self.gespraechs_verlauf
        if len(verlauf_fuer_llm) > MAX_LLM_VERLAUF:
            verlauf_fuer_llm = verlauf_fuer_llm[-MAX_LLM_VERLAUF:]

        antwort = await self.engine.llm.antwort_generieren(
            verlauf_fuer_llm,
            kontext=self._callflow_kontext()
        )
        log.info("[%s] Bot: '%s'", self.kanal_id, antwort)

        self.gespraechs_verlauf.append({"rolle": "bot", "text": antwort})

        # --- TTS: Text -> Audio (mit Hintergrund) ---
        audio = await self._sprechen(antwort)

        return {
            "aktion": "sprechen",
            "text": antwort,
            "audio": audio,
            "erkannt": erkannter_text,
        }

    async def _sprechen(self, text: str) -> bytes:
        """TTS ausfuehren mit Hintergrundgeraeuschen."""
        self.spricht_gerade = True
        self._tts_abbruch.clear()

        async def _tts_pipeline():
            # TTS generieren (mit Session-Stimme und Abbruch-Event)
            tts_audio = await self.engine.tts.synthetisieren(
                text, voice=self._stimme_voice_id,
                abbruch=self._tts_abbruch,
            )

            # Hintergrundgeraeusche mischen
            if settings.audio_hintergrund_aktiv and self._hintergrund_typ != "keine":
                tts_audio = await self.engine.mixer.mischen(
                    tts_audio,
                    hintergrund_typ=self._hintergrund_typ,
                    lautstaerke=settings.audio_hintergrund_lautstaerke,
                )
            return tts_audio

        # TTS als Task starten (damit Barge-In ihn abbrechen kann)
        self._tts_task = asyncio.create_task(_tts_pipeline())
        try:
            audio = await self._tts_task
        except asyncio.CancelledError:
            audio = self.engine.tts._stille(100)
        finally:
            self.spricht_gerade = False
            self._tts_task = None

        return audio

    async def _tts_stoppen(self):
        """TTS sofort stoppen (Barge-In)."""
        self.spricht_gerade = False
        self._tts_abbruch.set()
        if self._tts_task and not self._tts_task.done():
            self._tts_task.cancel()
            try:
                await self._tts_task
            except asyncio.CancelledError:
                pass
        self._tts_task = None
        log.info("[%s] TTS gestoppt", self.kanal_id)

    async def text_senden(self, text: str) -> bytes:
        """Direkt Text sprechen (fuer Ansagen aus dem Callflow)."""
        return await self._sprechen(text)

    async def beenden(self) -> dict:
        """Session beenden, Zusammenfassung erstellen."""
        self.aktiv = False
        await self._tts_stoppen()

        zusammenfassung = ""
        if len(self.gespraechs_verlauf) > 1:
            zusammenfassung = await self.engine.llm.zusammenfassung(self.gespraechs_verlauf)

        log.info("[%s] Session beendet. Nachrichten: %d", self.kanal_id, len(self.gespraechs_verlauf))
        return {
            "verlauf": self.gespraechs_verlauf,
            "zusammenfassung": zusammenfassung,
            "nachrichten": len(self.gespraechs_verlauf),
        }

    def _callflow_kontext(self) -> str:
        """Callflow-Kontext fuer LLM bereitstellen."""
        return voicebot_system_prompt(self.branche)
