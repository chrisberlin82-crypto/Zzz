"""
TTS — Text-to-Speech mit Piper.
Laeuft komplett lokal auf CPU. DSGVO-konform.
Erzeugt natuerlich klingende deutsche Sprache.
Unterstuetzt sofortiges Abbrechen fuer Barge-In.
"""
import asyncio
import io
import logging
import wave
from pathlib import Path
from typing import Optional
from config import settings

log = logging.getLogger("voicebot.tts")


class TTSProcessor:
    def __init__(self):
        self.voice = None
        self._abgebrochen = False

    async def initialize(self):
        """Piper TTS laden."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._laden)

    def _laden(self):
        """Piper Voice-Modell laden."""
        try:
            from piper import PiperVoice
            models_dir = Path(settings.tts_models_dir)
            models_dir.mkdir(parents=True, exist_ok=True)

            # Modell suchen
            model_path = models_dir / f"{settings.tts_model}.onnx"
            config_path = models_dir / f"{settings.tts_model}.onnx.json"

            if model_path.exists():
                self.voice = PiperVoice.load(str(model_path), str(config_path))
                log.info("Piper TTS geladen: %s", settings.tts_model)
            else:
                log.warning(
                    "TTS-Modell nicht gefunden: %s. "
                    "Bitte mit install.sh herunterladen.",
                    model_path,
                )
        except ImportError:
            log.warning("Piper nicht installiert. TTS nicht verfuegbar.")
        except Exception as e:
            log.error("TTS Ladefehler: %s", e)

    async def synthetisieren(self, text: str) -> bytes:
        """
        Text in Audio umwandeln.
        Gibt WAV-Bytes zurueck (16kHz, 16bit, mono).
        """
        self._abgebrochen = False

        if not self.voice:
            log.warning("TTS nicht verfuegbar — stille zurueckgeben")
            return self._stille(len(text) * 50)  # ~50ms pro Zeichen

        loop = asyncio.get_event_loop()
        audio = await loop.run_in_executor(None, self._generieren, text)
        return audio

    def _generieren(self, text: str) -> bytes:
        """TTS in separatem Thread ausfuehren."""
        try:
            # Natuerliche Pausen einfuegen
            text = self._pausen_einfuegen(text)

            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(settings.tts_sample_rate)

                for audio_chunk in self.voice.synthesize_stream_raw(
                    text,
                    speaker_id=settings.tts_speaker_id,
                    length_scale=1.0 / settings.tts_speed,
                ):
                    if self._abgebrochen:
                        log.info("TTS abgebrochen (Barge-In)")
                        break
                    wf.writeframes(audio_chunk)

            return buf.getvalue()
        except Exception as e:
            log.error("TTS Fehler: %s", e)
            return self._stille(1000)

    def abbrechen(self):
        """TTS sofort stoppen (Barge-In)."""
        self._abgebrochen = True

    def _pausen_einfuegen(self, text: str) -> str:
        """
        Natuerliche Sprechpausen einfuegen.
        Piper unterstuetzt SSML-aehnliche Pausen mit '...'.
        """
        # Kurze Pause nach Punkt
        text = text.replace(". ", "... ")
        # Kuerzere Pause nach Komma
        text = text.replace(", ", ".. ")
        # Pause nach Fragezeichen
        text = text.replace("? ", "?... ")
        return text

    def _stille(self, ms: int) -> bytes:
        """Stille-Audio erzeugen (Fallback)."""
        samples = int(settings.tts_sample_rate * ms / 1000) * 2
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(settings.tts_sample_rate)
            wf.writeframes(b"\x00" * samples)
        return buf.getvalue()
