"""
TTS — Text-to-Speech mit Piper (Standalone-Binary).
Laeuft komplett lokal auf CPU. DSGVO-konform.
Erzeugt natuerlich klingende deutsche Sprache.
Unterstuetzt sofortiges Abbrechen fuer Barge-In.

Piper wird als Binary aufgerufen (kein Python-Paket noetig).
Download: https://github.com/rhasspy/piper/releases
"""
import asyncio
import io
import logging
import shutil
import wave
from pathlib import Path
from config import settings

log = logging.getLogger("voicebot.tts")


class TTSProcessor:
    def __init__(self):
        self.piper_bin: str | None = None
        self.model_path: Path | None = None
        self._process: asyncio.subprocess.Process | None = None
        self._abgebrochen = False

    async def initialize(self):
        """Piper Binary und Modell pruefen."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._laden)

    def _laden(self):
        """Piper Binary und Voice-Modell suchen."""
        # Binary suchen
        self.piper_bin = shutil.which("piper")
        if not self.piper_bin:
            # Auch in /opt/piper und /usr/local/bin pruefen
            for pfad in ["/opt/piper/piper", "/usr/local/bin/piper"]:
                if Path(pfad).exists():
                    self.piper_bin = pfad
                    break

        if self.piper_bin:
            log.info("Piper Binary gefunden: %s", self.piper_bin)
        else:
            log.warning("Piper Binary nicht gefunden. TTS nicht verfuegbar.")
            return

        # Modell suchen
        models_dir = Path(settings.tts_models_dir)
        models_dir.mkdir(parents=True, exist_ok=True)
        model_path = models_dir / f"{settings.tts_model}.onnx"

        if model_path.exists():
            self.model_path = model_path
            log.info("TTS-Modell geladen: %s", settings.tts_model)
        else:
            log.warning(
                "TTS-Modell nicht gefunden: %s. "
                "Bitte mit install.sh herunterladen.",
                model_path,
            )

    async def synthetisieren(self, text: str) -> bytes:
        """
        Text in Audio umwandeln.
        Gibt WAV-Bytes zurueck (16kHz, 16bit, mono).
        """
        self._abgebrochen = False

        if not self.piper_bin or not self.model_path:
            log.warning("TTS nicht verfuegbar — Stille zurueckgeben")
            return self._stille(len(text) * 50)

        try:
            audio = await self._generieren(text)
            return audio
        except Exception as e:
            log.error("TTS Fehler: %s", e)
            return self._stille(1000)

    async def _generieren(self, text: str) -> bytes:
        """Piper-Binary als Subprocess ausfuehren."""
        # Natuerliche Pausen einfuegen
        text = self._pausen_einfuegen(text)

        # Piper aufrufen: echo "text" | piper --model x.onnx --output_raw
        self._process = await asyncio.create_subprocess_exec(
            self.piper_bin,
            "--model", str(self.model_path),
            "--output_raw",
            "--length_scale", str(1.0 / settings.tts_speed),
            "--speaker", str(settings.tts_speaker_id),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await self._process.communicate(
                input=text.encode("utf-8")
            )
        except asyncio.CancelledError:
            self._process.kill()
            raise

        if self._abgebrochen:
            log.info("TTS abgebrochen (Barge-In)")
            return self._stille(100)

        if self._process.returncode != 0:
            log.error("Piper Fehler: %s", stderr.decode("utf-8", errors="replace"))
            return self._stille(1000)

        # Raw PCM → WAV konvertieren
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(settings.tts_sample_rate)
            wf.writeframes(stdout)
        return buf.getvalue()

    def abbrechen(self):
        """TTS sofort stoppen (Barge-In)."""
        self._abgebrochen = True
        if self._process and self._process.returncode is None:
            try:
                self._process.kill()
            except ProcessLookupError:
                pass

    def _pausen_einfuegen(self, text: str) -> str:
        """
        Natuerliche Sprechpausen einfuegen.
        Piper unterstuetzt SSML-aehnliche Pausen mit '...'.
        """
        text = text.replace(". ", "... ")
        text = text.replace(", ", ".. ")
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
