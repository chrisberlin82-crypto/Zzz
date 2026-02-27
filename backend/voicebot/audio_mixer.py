"""
Audio-Mixer — mischt Hintergrundgeraeusche mit TTS-Audio.
Macht den Bot menschlicher: Buero-Atmosphaere, Tippen, Papier rascheln, etc.
"""
import asyncio
import io
import logging
import random
import wave
from pathlib import Path
from typing import Optional
from config import settings

log = logging.getLogger("voicebot.mixer")

# Vordefinierte Hintergrund-Typen
HINTERGRUND_TYPEN = {
    "buero": {
        "name": "Buero / Empfang",
        "beschreibung": "Leise Buerogeraeusche, Tastatur, Telefon im Hintergrund",
        "dateien": ["buero.wav"],
    },
    "praxis": {
        "name": "Arztpraxis",
        "beschreibung": "Leise Praxis-Atmosphaere, Wartezimmer",
        "dateien": ["praxis.wav"],
    },
    "ruhig": {
        "name": "Ruhig",
        "beschreibung": "Sehr leise Hintergrundgeraeusche",
        "dateien": ["ruhig.wav"],
    },
    "keine": {
        "name": "Keine Hintergrundgeraeusche",
        "beschreibung": "Nur die Stimme",
        "dateien": [],
    },
}


class AudioMixer:
    def __init__(self):
        self._hintergrund_cache = {}

    async def initialize(self):
        """Hintergrund-Audiodateien laden."""
        bg_dir = Path(settings.audio_hintergrund_dir)
        bg_dir.mkdir(parents=True, exist_ok=True)

        # Pruefen welche Dateien existieren
        vorhandene = list(bg_dir.glob("*.wav"))
        if vorhandene:
            for f in vorhandene:
                try:
                    with wave.open(str(f), "rb") as wf:
                        self._hintergrund_cache[f.stem] = wf.readframes(wf.getnframes())
                    log.info("Hintergrund geladen: %s", f.name)
                except Exception as e:
                    log.warning("Hintergrund-Datei fehlerhaft: %s (%s)", f.name, e)
        else:
            log.info(
                "Keine Hintergrund-Dateien in %s. "
                "Generiere Standard-Rauschen...",
                bg_dir,
            )
            # Standard-Hintergrund generieren (leises Rosa-Rauschen)
            self._hintergrund_cache["standard"] = self._rosa_rauschen_generieren(10)

    async def mischen(
        self,
        tts_audio: bytes,
        hintergrund_typ: str = "buero",
        lautstaerke: float = 0.08,
    ) -> bytes:
        """
        TTS-Audio mit Hintergrundgeraeuschen mischen.

        Args:
            tts_audio: WAV-Bytes vom TTS
            hintergrund_typ: Art des Hintergrunds (buero, praxis, ruhig, keine)
            lautstaerke: Lautstaerke des Hintergrunds (0.0 - 1.0)

        Returns:
            Gemischtes WAV-Audio
        """
        if hintergrund_typ == "keine" or not self._hintergrund_cache:
            return tts_audio

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._mischen_sync, tts_audio, hintergrund_typ, lautstaerke
        )

    def _mischen_sync(
        self, tts_audio: bytes, hintergrund_typ: str, lautstaerke: float
    ) -> bytes:
        """Audio mischen (CPU-intensiv, in Thread)."""
        import numpy as np

        try:
            # TTS Audio lesen
            tts_buf = io.BytesIO(tts_audio)
            with wave.open(tts_buf, "rb") as wf:
                tts_params = wf.getparams()
                tts_frames = wf.readframes(wf.getnframes())

            tts_samples = np.frombuffer(tts_frames, dtype=np.int16).astype(np.float32)

            # Hintergrund waehlen
            bg_key = list(self._hintergrund_cache.keys())[0]
            typ_info = HINTERGRUND_TYPEN.get(hintergrund_typ)
            if typ_info:
                for datei in typ_info["dateien"]:
                    stem = Path(datei).stem
                    if stem in self._hintergrund_cache:
                        bg_key = stem
                        break

            bg_frames = self._hintergrund_cache[bg_key]
            bg_samples = np.frombuffer(bg_frames, dtype=np.int16).astype(np.float32)

            # Hintergrund auf TTS-Laenge bringen (loopen)
            if len(bg_samples) < len(tts_samples):
                wiederholungen = (len(tts_samples) // len(bg_samples)) + 1
                bg_samples = np.tile(bg_samples, wiederholungen)
            bg_samples = bg_samples[: len(tts_samples)]

            # Mischen
            gemischt = tts_samples + bg_samples * lautstaerke

            # Clipping verhindern
            gemischt = np.clip(gemischt, -32768, 32767).astype(np.int16)

            # WAV schreiben
            out_buf = io.BytesIO()
            with wave.open(out_buf, "wb") as wf:
                wf.setparams(tts_params)
                wf.writeframes(gemischt.tobytes())

            return out_buf.getvalue()

        except Exception as e:
            log.error("Mixer Fehler: %s", e)
            return tts_audio

    def _rosa_rauschen_generieren(self, sekunden: int) -> bytes:
        """
        Rosa-Rauschen generieren (natuerlich klingendes Hintergrundrauschen).
        Klingt wie leises Raumrauschen / Klimaanlage.
        """
        import numpy as np

        n_samples = settings.tts_sample_rate * sekunden
        # Weisses Rauschen
        weiss = np.random.randn(n_samples)

        # In Rosa-Rauschen umwandeln (1/f Filter)
        # Einfache Approximation mit gleitendem Durchschnitt
        fenster = 64
        rosa = np.convolve(weiss, np.ones(fenster) / fenster, mode="same")

        # Normalisieren auf niedrige Lautstaerke
        rosa = (rosa / np.max(np.abs(rosa)) * 800).astype(np.int16)

        return rosa.tobytes()

    def verfuegbare_typen(self) -> list:
        """Liste aller verfuegbaren Hintergrund-Typen."""
        return [
            {
                "id": k,
                "name": v["name"],
                "beschreibung": v["beschreibung"],
                "verfuegbar": any(
                    Path(d).stem in self._hintergrund_cache
                    for d in v["dateien"]
                ) or k == "keine" or bool(self._hintergrund_cache),
            }
            for k, v in HINTERGRUND_TYPEN.items()
        ]
