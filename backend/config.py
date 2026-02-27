"""
MedReception Backend — Zentrale Konfiguration
Alle Einstellungen koennen ueber Umgebungsvariablen oder .env ueberschrieben werden.
"""
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    # --- App ---
    app_name: str = "MedReception"
    debug: bool = False
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    api_port: int = 8000
    frontend_url: str = "http://localhost"

    # --- Datenbank ---
    db_url: str = f"sqlite+aiosqlite:///{BASE_DIR}/data/medreception.db"

    # --- Asterisk ---
    asterisk_host: str = "127.0.0.1"
    asterisk_ari_port: int = 8088
    asterisk_ari_user: str = "medreception"
    asterisk_ari_password: str = "CHANGE-ME"
    asterisk_ami_port: int = 5038
    asterisk_ami_user: str = "medreception"
    asterisk_ami_password: str = "CHANGE-ME"

    # --- Voicebot: LLM ---
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b-instruct-q4_K_M"
    llm_base_url: str = "http://127.0.0.1:11434"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 256
    llm_system_prompt: str = (
        "Du bist eine freundliche Telefonistin in einer Arztpraxis. "
        "Antworte kurz, natuerlich und hilfsbereit. "
        "Sprich den Anrufer mit Sie an. Sei professionell aber warm."
    )

    # --- Voicebot: STT (Faster-Whisper) ---
    stt_model: str = "medium"
    stt_language: str = "de"
    stt_device: str = "cpu"
    stt_compute_type: str = "int8"

    # --- Voicebot: TTS (Edge TTS — Microsoft Neural Voices) ---
    tts_stimme: str = "de-DE-SeraphinaMultilingualNeural"
    tts_rate: str = "+0%"
    tts_sample_rate: int = 16000

    # --- Audio-Mixer ---
    audio_hintergrund_dir: str = str(BASE_DIR / "audio" / "hintergrund")
    audio_hintergrund_lautstaerke: float = 0.08
    audio_hintergrund_aktiv: bool = True
    audio_hintergrund_typ: str = "buero"

    # --- Verfuegbare Stimmen (Edge TTS Neural Voices) ---
    # Format: {id: {name, voice_id, geschlecht, beschreibung}}
    # Die besten deutschen Stimmen von Microsoft
    @staticmethod
    def verfuegbare_stimmen():
        return {
            "seraphina": {
                "name": "Seraphina",
                "voice_id": "de-DE-SeraphinaMultilingualNeural",
                "geschlecht": "weiblich",
                "beschreibung": "Warm, natuerlich, multilingual (Premium)",
            },
            "florian": {
                "name": "Florian",
                "voice_id": "de-DE-FlorianMultilingualNeural",
                "geschlecht": "maennlich",
                "beschreibung": "Professionell, klar, multilingual (Premium)",
            },
            "katja": {
                "name": "Katja",
                "voice_id": "de-DE-KatjaNeural",
                "geschlecht": "weiblich",
                "beschreibung": "Freundlich, klassisch",
            },
            "conrad": {
                "name": "Conrad",
                "voice_id": "de-DE-ConradNeural",
                "geschlecht": "maennlich",
                "beschreibung": "Sachlich, kompetent",
            },
            "amala": {
                "name": "Amala",
                "voice_id": "de-DE-AmalaNeural",
                "geschlecht": "weiblich",
                "beschreibung": "Sanft, einfuehlsam",
            },
            "killian": {
                "name": "Killian",
                "voice_id": "de-DE-KillianNeural",
                "geschlecht": "maennlich",
                "beschreibung": "Dynamisch, jung",
            },
            "louisa": {
                "name": "Louisa",
                "voice_id": "de-DE-LouisaNeural",
                "geschlecht": "weiblich",
                "beschreibung": "Herzlich, vertrauensvoll",
            },
            "ralf": {
                "name": "Ralf",
                "voice_id": "de-DE-RalfNeural",
                "geschlecht": "maennlich",
                "beschreibung": "Ruhig, gelassen",
            },
        }

    # --- Verfuegbare Hintergrundgeraeusche ---
    @staticmethod
    def verfuegbare_hintergruende():
        return {
            "buero": {
                "name": "Buero",
                "beschreibung": "Leises Buero-Ambiente (Tastatur, gedaempfte Geraeusche)",
            },
            "praxis": {
                "name": "Arztpraxis",
                "beschreibung": "Ruhige Praxis-Atmosphaere",
            },
            "ruhig": {
                "name": "Sehr ruhig",
                "beschreibung": "Minimales Hintergrundrauschen",
            },
            "keine": {
                "name": "Kein Hintergrund",
                "beschreibung": "Komplett stille Umgebung",
            },
        }

    # --- ACD ---
    acd_standard_queue: str = "rezeption"
    acd_max_wartezeit: int = 120
    acd_ring_strategie: str = "rrmemory"
    acd_wartemusik: str = "default"

    # --- Pfade ---
    audio_dir: str = str(BASE_DIR / "audio")
    data_dir: str = str(BASE_DIR / "data")
    log_dir: str = str(BASE_DIR / "logs")

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_prefix = "MR_"


settings = Settings()
