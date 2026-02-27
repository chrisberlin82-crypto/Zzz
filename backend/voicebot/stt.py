"""
STT — Speech-to-Text mit Faster-Whisper.
Laeuft komplett lokal auf CPU. DSGVO-konform.
Unterstuetzt Barge-In-Erkennung (VAD = Voice Activity Detection).
"""
import asyncio
import logging
import io
import numpy as np
from typing import Optional
from config import settings

log = logging.getLogger("voicebot.stt")


class STTProcessor:
    def __init__(self):
        self.model = None
        self.vad = None
        self._buffer = bytearray()
        self._min_buffer_size = 16000 * 2  # 1 Sekunde bei 16kHz 16bit
        self._vad_threshold = 0.3

    async def initialize(self):
        """Whisper-Modell laden."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._laden)

    def _laden(self):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(
            settings.stt_model,
            device=settings.stt_device,
            compute_type=settings.stt_compute_type,
        )
        log.info("Faster-Whisper geladen (Modell: %s, Device: %s)", settings.stt_model, settings.stt_device)

    async def hat_sprache(self, audio_chunk: bytes) -> bool:
        """
        Voice Activity Detection — pruefen ob im Audio Sprache ist.
        Wird fuer Barge-In benutzt: laeuft waehrend der Bot spricht.
        Einfache Energie-basierte Erkennung (schnell, kein Modell noetig).
        """
        try:
            samples = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32)
            if len(samples) == 0:
                return False
            # RMS-Energie berechnen
            rms = np.sqrt(np.mean(samples ** 2)) / 32768.0
            return rms > self._vad_threshold
        except Exception:
            return False

    async def verarbeiten(self, audio_chunk: bytes) -> Optional[dict]:
        """
        Audio-Chunk verarbeiten. Sammelt Daten bis genug fuer Erkennung.

        Returns:
            {"text": "erkannter text", "sprache": "de", "dauer": 1.5} oder None
        """
        self._buffer.extend(audio_chunk)

        # Erst erkennen wenn genug Daten (mind. 1 Sekunde)
        if len(self._buffer) < self._min_buffer_size:
            return None

        # Stille am Ende erkennen (Anrufer hat aufgehoert zu sprechen)
        letzte_samples = np.frombuffer(
            bytes(self._buffer[-3200:]), dtype=np.int16
        ).astype(np.float32)
        rms = np.sqrt(np.mean(letzte_samples ** 2)) / 32768.0
        if rms > self._vad_threshold:
            # Anrufer spricht noch — weiter sammeln
            if len(self._buffer) < 16000 * 2 * 10:  # Max 10 Sekunden
                return None

        # Buffer in numpy Array konvertieren
        audio_data = np.frombuffer(bytes(self._buffer), dtype=np.int16).astype(np.float32) / 32768.0

        # Buffer leeren
        self._buffer.clear()

        # Erkennung ausfuehren (in Thread wegen CPU-Blockierung)
        loop = asyncio.get_event_loop()
        ergebnis = await loop.run_in_executor(None, self._erkennen, audio_data)
        return ergebnis

    def _erkennen(self, audio: np.ndarray) -> Optional[dict]:
        """Whisper-Erkennung ausfuehren."""
        if self.model is None:
            return None

        try:
            segments, info = self.model.transcribe(
                audio,
                language=settings.stt_language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=200,
                ),
            )
            texte = []
            for segment in segments:
                texte.append(segment.text.strip())

            volltext = " ".join(texte).strip()
            if not volltext:
                return None

            return {
                "text": volltext,
                "sprache": info.language,
                "dauer": info.duration,
            }
        except Exception as e:
            log.error("STT Fehler: %s", e)
            return None

    def buffer_leeren(self):
        """Buffer zuruecksetzen (z.B. nach Barge-In)."""
        self._buffer.clear()
