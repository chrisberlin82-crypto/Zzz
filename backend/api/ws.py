"""
WebSocket-Endpoints — Echtzeit-Kommunikation.
Wird fuer Live-Audio-Streaming (Voicebot) und Agent-Board benutzt.
"""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import settings

router = APIRouter()
log = logging.getLogger("api.ws")

# Aktive Verbindungen
agent_verbindungen: dict[str, WebSocket] = {}
dashboard_verbindungen: list[WebSocket] = []


@router.websocket("/voicebot/{kanal_id}")
async def voicebot_stream(ws: WebSocket, kanal_id: str):
    """
    Audio-Stream fuer Voicebot via WebRTC/WebSocket.
    Protokoll:
      1. Client verbindet sich
      2. Client sendet JSON: {"typ": "start", "branche": "arztpraxis"}
      3. Server antwortet mit Begruessung (JSON + WAV-Audio)
      4. Client streamt Audio-Chunks (binary, 16kHz 16bit mono PCM)
      5. Server antwortet mit Erkennung + TTS-Audio
      6. Client sendet {"typ": "beenden"} zum Auflegen
    Barge-In: Server hoert auch waehrend er spricht.
    """
    await ws.accept()
    log.info("[WS] Voicebot-Verbindung: %s", kanal_id)

    from main import app
    engine = app.state.voicebot

    session = None

    try:
        while True:
            data = await ws.receive()

            if "text" in data:
                msg = json.loads(data["text"])

                if msg.get("typ") == "start":
                    # --- Session starten mit Branchen-Auswahl ---
                    branche = msg.get("branche", "arztpraxis")
                    session = engine.neue_session(kanal_id, branche=branche)
                    ergebnis = await session.starten()

                    # Begruessung senden
                    await ws.send_json({
                        "typ": "begruessung",
                        "text": ergebnis["text"],
                        "branche": branche,
                    })
                    if ergebnis.get("audio"):
                        await ws.send_bytes(ergebnis["audio"])
                    continue

                if not session:
                    # Kein Start empfangen — Session mit Default starten
                    session = engine.neue_session(kanal_id)
                    await session.starten()

                if msg.get("typ") == "beenden":
                    ergebnis = await session.beenden()
                    await ws.send_json({
                        "typ": "beendet",
                        "zusammenfassung": ergebnis["zusammenfassung"],
                        "nachrichten": ergebnis["nachrichten"],
                    })
                    break

                elif msg.get("typ") == "ansage":
                    audio = await session.text_senden(msg["text"])
                    await ws.send_json({"typ": "ansage", "text": msg["text"]})
                    await ws.send_bytes(audio)

                elif msg.get("typ") == "config":
                    if "barge_in" in msg:
                        session.barge_in_aktiv = msg["barge_in"]
                    await ws.send_json({"typ": "config_ok"})

            elif "bytes" in data:
                if not session:
                    # Auto-Start mit Default-Branche
                    session = engine.neue_session(kanal_id)
                    await session.starten()

                # Audio verarbeiten
                ergebnis = await session.audio_empfangen(data["bytes"])
                if ergebnis:
                    await ws.send_json({
                        "typ": "antwort",
                        "text": ergebnis["text"],
                        "erkannt": ergebnis["erkannt"],
                    })
                    if ergebnis.get("audio"):
                        await ws.send_bytes(ergebnis["audio"])

    except WebSocketDisconnect:
        log.info("[WS] Voicebot getrennt: %s", kanal_id)
        if session:
            await session.beenden()
    except Exception as e:
        log.error("[WS] Voicebot Fehler: %s — %s", kanal_id, e)
        if session:
            await session.beenden()


@router.websocket("/agent/{agent_id}")
async def agent_board(ws: WebSocket, agent_id: str):
    """
    Agent-Board WebSocket — Echtzeit-Updates fuer den Agenten.
    Clickbot-Daten, Anruf-Info, Queue-Status.
    """
    await ws.accept()
    agent_verbindungen[agent_id] = ws
    log.info("[WS] Agent verbunden: %s", agent_id)

    try:
        while True:
            data = await ws.receive_json()

            if data.get("typ") == "status":
                # Agent-Status aendern
                await broadcast_dashboard({
                    "typ": "agent_status",
                    "agent_id": agent_id,
                    "status": data["status"],
                })

            elif data.get("typ") == "clickbot_antwort":
                # Clickbot-Antwort vom Agenten
                pass

    except WebSocketDisconnect:
        agent_verbindungen.pop(agent_id, None)
        log.info("[WS] Agent getrennt: %s", agent_id)


@router.websocket("/dashboard")
async def dashboard_stream(ws: WebSocket):
    """
    Dashboard WebSocket — Live-KPIs, Anruf-Events, Queue-Status.
    """
    await ws.accept()
    dashboard_verbindungen.append(ws)
    log.info("[WS] Dashboard verbunden")

    try:
        while True:
            await ws.receive_text()  # Keep-alive
    except WebSocketDisconnect:
        dashboard_verbindungen.remove(ws)
        log.info("[WS] Dashboard getrennt")


async def broadcast_dashboard(nachricht: dict):
    """Nachricht an alle Dashboard-Verbindungen senden."""
    for ws in dashboard_verbindungen[:]:
        try:
            await ws.send_json(nachricht)
        except Exception:
            dashboard_verbindungen.remove(ws)


async def an_agent_senden(agent_id: str, nachricht: dict):
    """Nachricht an einen bestimmten Agenten senden."""
    ws = agent_verbindungen.get(agent_id)
    if ws:
        try:
            await ws.send_json(nachricht)
        except Exception:
            agent_verbindungen.pop(agent_id, None)
