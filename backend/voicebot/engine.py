"""
Voicebot-Engine — Zentrale Steuerung.
Koordiniert STT, LLM, TTS und Audio-Mixer fuer natuerliche Gespraeche.
Unterstuetzt Barge-In (Anrufer kann jederzeit unterbrechen).
"""
import asyncio
import logging
from typing import Optional
from config import settings
from branchen import branche_laden, voicebot_system_prompt

log = logging.getLogger("voicebot.engine")


class VoicebotEngine:
    """Hauptklasse — verwaltet eine Voicebot-Session pro Anruf."""

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

        log.info("Lade TTS (Piper, Stimme: %s)...", settings.tts_model)
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
                     callflow_id: Optional[int] = None):
        """Erstellt eine neue Gespraechs-Session."""
        return VoicebotSession(self, kanal_id, branche, callflow_id)


class VoicebotSession:
    """
    Eine aktive Voicebot-Session fuer einen einzelnen Anruf.
    Unterstuetzt Barge-In: waehrend der Bot spricht, lauscht STT weiter.
    Sobald Sprache erkannt wird, wird TTS sofort gestoppt.
    """

    def __init__(self, engine: VoicebotEngine, kanal_id: str,
                 branche: str = "arztpraxis",
                 callflow_id: Optional[int] = None):
        self.engine = engine
        self.kanal_id = kanal_id
        self.branche = branche
        self.branche_config = branche_laden(branche)
        self.callflow_id = callflow_id
        self.gespraechs_verlauf = []
        self.aktiv = True
        self.spricht_gerade = False
        self.barge_in_aktiv = True
        self._tts_task: Optional[asyncio.Task] = None
        self._stt_stream_aktiv = False
        log.info("Neue Session fuer Kanal %s (Branche: %s)", kanal_id, branche)

    async def starten(self) -> dict:
        """Session starten — Begruessung abspielen."""
        self.aktiv = True
        log.info("[%s] Session gestartet (Branche: %s)", self.kanal_id, self.branche)

        begruessung = self.branche_config.get(
            "begruessung",
            "Guten Tag, wie kann ich Ihnen helfen?"
        )

        # Begruessung als erste Bot-Nachricht
        self.gespraechs_verlauf.append({"rolle": "bot", "text": begruessung})

        # TTS: Begruessung synthetisieren
        audio = await self._sprechen(begruessung)

        return {
            "text": begruessung,
            "audio": audio,
        }

    async def audio_empfangen(self, audio_chunk: bytes) -> Optional[dict]:
        """
        Audio vom Anrufer empfangen (Echtzeit-Stream).
        Wird kontinuierlich aufgerufen, auch waehrend der Bot spricht (Barge-In).

        Returns:
            dict mit {aktion, daten} oder None wenn noch nichts erkannt.
        """
        if not self.aktiv:
            return None

        # --- BARGE-IN: Waehrend Bot spricht, pruefen ob Anrufer redet ---
        if self.spricht_gerade and self.barge_in_aktiv:
            hat_sprache = await self.engine.stt.hat_sprache(audio_chunk)
            if hat_sprache:
                log.info("[%s] BARGE-IN erkannt — stoppe TTS", self.kanal_id)
                await self._tts_stoppen()
                # Weiter mit normaler Erkennung

        # --- STT: Audio -> Text ---
        ergebnis = await self.engine.stt.verarbeiten(audio_chunk)
        if not ergebnis or not ergebnis.get("text"):
            return None

        erkannter_text = ergebnis["text"].strip()
        if not erkannter_text:
            return None

        log.info("[%s] Anrufer: '%s'", self.kanal_id, erkannter_text)

        # Gespraechsverlauf aktualisieren
        self.gespraechs_verlauf.append({"rolle": "anrufer", "text": erkannter_text})

        # --- LLM: Antwort generieren ---
        antwort = await self.engine.llm.antwort_generieren(
            self.gespraechs_verlauf,
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

        # TTS generieren
        tts_audio = await self.engine.tts.synthetisieren(text)

        # Hintergrundgeraeusche mischen
        if settings.audio_hintergrund_aktiv:
            tts_audio = await self.engine.mixer.mischen(
                tts_audio,
                hintergrund_typ=settings.audio_hintergrund_typ,
                lautstaerke=settings.audio_hintergrund_lautstaerke,
            )

        self.spricht_gerade = False
        return tts_audio

    async def _tts_stoppen(self):
        """TTS sofort stoppen (Barge-In)."""
        self.spricht_gerade = False
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

        # Zusammenfassung per LLM
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
