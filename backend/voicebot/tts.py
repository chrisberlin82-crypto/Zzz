"""
TTS — Text-to-Speech mit Edge TTS (Microsoft Neural Voices).
Kostenlos, kein API-Key noetig. Sehr natuerliche Stimmen.
Unterstuetzt sofortiges Abbrechen fuer Barge-In.
"""
import asyncio
import io
import logging
import wave
from config import settings

log = logging.getLogger("voicebot.tts")


class TTSProcessor:
    def __init__(self):
        self._abgebrochen = False
        self._edge_tts_verfuegbar = False

    async def initialize(self):
        """Edge-TTS pruefen."""
        try:
            import edge_tts
            self._edge_tts_verfuegbar = True
            log.info("Edge-TTS bereit (Stimme: %s)", settings.tts_stimme)
        except ImportError:
            log.warning("edge-tts nicht installiert. TTS nicht verfuegbar.")

    async def synthetisieren(self, text: str, voice: str = None) -> bytes:
        """
        Text in Audio umwandeln.
        Gibt WAV-Bytes zurueck (16kHz, 16bit, mono) fuer Kompatibilitaet mit dem Rest.

        Args:
            text: Der zu sprechende Text.
            voice: Edge TTS Voice ID (z.B. "de-DE-SeraphinaMultilingualNeural").
                   Wenn None, wird die Standard-Stimme aus der Config verwendet.
        """
        self._abgebrochen = False

        if not self._edge_tts_verfuegbar:
            log.warning("TTS nicht verfuegbar — Stille zurueckgeben")
            return self._stille(len(text) * 50)

        try:
            audio = await self._generieren(text, voice=voice)
            return audio
        except Exception as e:
            log.error("TTS Fehler: %s", e)
            return self._stille(1000)

    async def _generieren(self, text: str, voice: str = None) -> bytes:
        """Edge-TTS Audio generieren und in 16kHz WAV konvertieren."""
        import edge_tts

        if self._abgebrochen:
            return self._stille(100)

        voice = voice or settings.tts_stimme

        # Edge-TTS generiert MP3 — wir sammeln die Bytes
        communicate = edge_tts.Communicate(
            text,
            voice=voice,
            rate=settings.tts_rate,
        )

        mp3_chunks = []
        async for chunk in communicate.stream():
            if self._abgebrochen:
                log.info("TTS abgebrochen (Barge-In)")
                return self._stille(100)
            if chunk["type"] == "audio":
                mp3_chunks.append(chunk["data"])

        if not mp3_chunks:
            return self._stille(500)

        mp3_data = b"".join(mp3_chunks)

        # MP3 -> WAV 16kHz 16bit mono konvertieren
        wav_data = await asyncio.get_event_loop().run_in_executor(
            None, self._mp3_zu_wav, mp3_data
        )
        return wav_data

    def _mp3_zu_wav(self, mp3_data: bytes) -> bytes:
        """MP3-Bytes in 16kHz 16bit mono WAV konvertieren."""
        try:
            # Versuch 1: pydub (wenn verfuegbar)
            from pydub import AudioSegment
            audio = AudioSegment.from_mp3(io.BytesIO(mp3_data))
            audio = audio.set_frame_rate(settings.tts_sample_rate)
            audio = audio.set_channels(1)
            audio = audio.set_sample_width(2)

            buf = io.BytesIO()
            audio.export(buf, format="wav")
            return buf.getvalue()
        except ImportError:
            pass

        try:
            # Versuch 2: ffmpeg subprocess
            import subprocess
            result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-f", "mp3", "-i", "pipe:0",
                    "-ar", str(settings.tts_sample_rate),
                    "-ac", "1",
                    "-f", "wav", "pipe:1",
                ],
                input=mp3_data,
                capture_output=True,
                timeout=10,
            )
            if result.returncode == 0:
                return result.stdout
            log.error("ffmpeg Fehler: %s", result.stderr.decode("utf-8", errors="replace"))
        except FileNotFoundError:
            log.error("Weder pydub noch ffmpeg verfuegbar fuer MP3->WAV Konvertierung")
        except Exception as e:
            log.error("MP3->WAV Fehler: %s", e)

        return self._stille(1000)

    def abbrechen(self):
        """TTS sofort stoppen (Barge-In)."""
        self._abgebrochen = True

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
