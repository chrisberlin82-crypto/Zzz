"""
MedReception Backend — Hauptanwendung
FastAPI Server mit WebSocket fuer Echtzeit-Kommunikation.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from api.routes import router as api_router
from api.ws import router as ws_router
from api.auth import router as auth_router
from database import init_db

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("medreception")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / Shutdown."""
    log.info("=== MedReception Backend startet ===")

    # Verzeichnisse anlegen
    for d in [settings.data_dir, settings.log_dir, settings.audio_dir,
              settings.audio_hintergrund_dir]:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Datenbank initialisieren
    await init_db()
    log.info("Datenbank initialisiert")

    # Voicebot-Komponenten laden (graceful — Server startet auch ohne)
    app.state.voicebot = None
    try:
        from voicebot.engine import VoicebotEngine
        app.state.voicebot = VoicebotEngine()
        await app.state.voicebot.initialize()
        log.info("Voicebot-Engine geladen")
    except Exception as e:
        log.warning("Voicebot-Engine nicht verfuegbar: %s (Backend laeuft trotzdem)", e)

    yield

    # Shutdown
    log.info("=== MedReception Backend stoppt ===")
    if app.state.voicebot:
        await app.state.voicebot.shutdown()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth_router, prefix="/api")
app.include_router(api_router, prefix="/api")
app.include_router(ws_router, prefix="/ws")

# Frontend static files
frontend_dir = Path(__file__).parent.parent / "docs"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.api_port, reload=settings.debug)
