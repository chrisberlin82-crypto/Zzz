#!/usr/bin/env python3
"""
MedReception — FastAGI-Server
Brücke zwischen Asterisk und dem Python-Voicebot-Backend.
Lauscht auf Port 4573 und verarbeitet AGI-Anfragen.
"""
import asyncio
import logging
import json
import os
import sys
import signal
import urllib.request
import urllib.error

log = logging.getLogger("fastagi")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

API_BASE = os.environ.get("MR_API_URL", "http://127.0.0.1:8000/api")
AGI_PORT = int(os.environ.get("MR_AGI_PORT", "4573"))


class AGISession:
    """Eine einzelne AGI-Verbindung von Asterisk."""

    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.env: dict[str, str] = {}

    async def lesen(self) -> str:
        """Eine Zeile von Asterisk lesen."""
        zeile = await self.reader.readline()
        return zeile.decode("utf-8", errors="replace").strip()

    async def schreiben(self, befehl: str):
        """Einen AGI-Befehl an Asterisk senden."""
        self.writer.write((befehl + "\n").encode("utf-8"))
        await self.writer.drain()

    async def befehl(self, cmd: str) -> str:
        """AGI-Befehl senden und Antwort lesen."""
        await self.schreiben(cmd)
        antwort = await self.lesen()
        return antwort

    async def set_variable(self, name: str, wert: str):
        """Asterisk-Kanalvariable setzen."""
        await self.befehl(f'SET VARIABLE {name} "{wert}"')

    async def verbose(self, nachricht: str, level: int = 1):
        """Nachricht ins Asterisk-Log schreiben."""
        await self.befehl(f'VERBOSE "{nachricht}" {level}')

    async def env_lesen(self):
        """AGI-Umgebungsvariablen lesen (bei Verbindungsaufbau)."""
        while True:
            zeile = await self.lesen()
            if not zeile:
                break
            if ":" in zeile:
                key, val = zeile.split(":", 1)
                self.env[key.strip()] = val.strip()

    async def playback(self, datei: str):
        """Audiodatei abspielen."""
        await self.befehl(f"EXEC Playback {datei}")

    async def answer(self):
        """Kanal beantworten."""
        await self.befehl("ANSWER")


def api_anfrage(pfad: str, methode: str = "GET", daten: dict = None) -> dict | None:
    """Synchrone API-Anfrage an das MedReception-Backend."""
    url = API_BASE + pfad
    try:
        if daten:
            payload = json.dumps(daten).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload, method=methode,
                headers={"Content-Type": "application/json"},
            )
        else:
            req = urllib.request.Request(url, method=methode)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log.error("API-Fehler: %s — %s", url, e)
        return None


async def handle_voicebot(session: AGISession, caller: str, exten: str):
    """Voicebot-Dialog: Anrufer wird vom LLM-Bot betreut."""
    await session.verbose(f"Voicebot gestartet: caller={caller} exten={exten}")

    # Voicebot-Session beim Backend starten
    result = api_anfrage("/voicebot/session", "POST", {
        "caller_id": caller,
        "extension": exten,
    })

    if not result or not result.get("session_id"):
        await session.verbose("Voicebot-Session konnte nicht gestartet werden")
        await session.set_variable("VOICEBOT_RESULT", "TRANSFER")
        await session.set_variable("VOICEBOT_QUEUE", "rezeption")
        return

    session_id = result["session_id"]
    await session.verbose(f"Voicebot-Session: {session_id}")

    # Begruessung abspielen
    if result.get("begruessung"):
        await session.playback(f"voicebot-willkommen")

    # Dialog-Schleife: Asterisk nimmt Audio auf, Backend verarbeitet
    max_runden = 10
    for runde in range(max_runden):
        # Audio aufnehmen (5s Timeout, 2s Stille)
        aufnahme = f"/tmp/vb_{session_id}_{runde}"
        await session.befehl(
            f'RECORD FILE "{aufnahme}" wav "#" 30000 BEEP s=2'
        )

        # Audio an Backend senden (via API, nicht WS — AGI ist synchron)
        ergebnis = api_anfrage(f"/voicebot/session/{session_id}/audio", "POST", {
            "audio_pfad": f"{aufnahme}.wav",
            "runde": runde,
        })

        if not ergebnis:
            await session.verbose("Voicebot: Keine Antwort vom Backend")
            break

        aktion = ergebnis.get("aktion", "weiter")
        await session.verbose(f"Voicebot Runde {runde}: aktion={aktion}")

        # TTS-Antwort abspielen (Backend generiert Datei)
        if ergebnis.get("audio_pfad"):
            audio = ergebnis["audio_pfad"].replace(".wav", "")
            await session.befehl(f"EXEC Playback {audio}")

        # Aktion auswerten
        if aktion == "transfer":
            queue = ergebnis.get("queue", "rezeption")
            await session.set_variable("VOICEBOT_RESULT", "TRANSFER")
            await session.set_variable("VOICEBOT_QUEUE", queue)
            break
        elif aktion == "termin":
            await session.set_variable("VOICEBOT_RESULT", "TERMIN")
            if ergebnis.get("termin_id"):
                await session.set_variable("VOICEBOT_TERMIN_ID", str(ergebnis["termin_id"]))
            break
        elif aktion == "hangup":
            await session.set_variable("VOICEBOT_RESULT", "HANGUP")
            break
        # "weiter" → naechste Runde

    # Session beenden
    api_anfrage(f"/voicebot/session/{session_id}/beenden", "POST")


async def handle_overflow(session: AGISession, caller: str, queue: str):
    """Overflow: Kein Agent verfuegbar, Rueckruf anbieten."""
    await session.verbose(f"Overflow: caller={caller} queue={queue}")

    # Rueckruf-Wunsch im Backend speichern
    api_anfrage("/anrufe/rueckruf", "POST", {
        "caller_id": caller,
        "queue": queue,
        "grund": "Kein Agent verfuegbar",
    })

    await session.set_variable("VOICEBOT_RESULT", "HANGUP")


async def handle_connection(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Neue AGI-Verbindung verarbeiten."""
    session = AGISession(reader, writer)
    addr = writer.get_extra_info("peername")
    log.info("Neue AGI-Verbindung von %s", addr)

    try:
        # AGI-Umgebungsvariablen lesen
        await session.env_lesen()

        # Pfad aus der AGI-URL extrahieren
        # agi://127.0.0.1:4573/voicebot,caller,exten
        request = session.env.get("agi_request", "")
        args = session.env.get("agi_arg_1", ""), session.env.get("agi_arg_2", "")

        # Pfad parsen: agi://host:port/handler
        handler = "voicebot"
        if "/" in request:
            handler = request.rsplit("/", 1)[-1]

        caller = args[0] if args[0] else session.env.get("agi_callerid", "unbekannt")
        exten = args[1] if len(args) > 1 and args[1] else session.env.get("agi_extension", "s")

        log.info("Handler: %s | Caller: %s | Exten: %s", handler, caller, exten)

        if handler == "voicebot":
            await handle_voicebot(session, caller, exten)
        elif handler == "overflow":
            await handle_overflow(session, caller, exten)
        else:
            await session.verbose(f"Unbekannter Handler: {handler}")
            await session.set_variable("VOICEBOT_RESULT", "TRANSFER")

    except Exception as e:
        log.error("AGI-Fehler: %s", e, exc_info=True)
        try:
            await session.set_variable("VOICEBOT_RESULT", "TRANSFER")
        except Exception:
            pass
    finally:
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass


async def main():
    """FastAGI-Server starten."""
    server = await asyncio.start_server(handle_connection, "0.0.0.0", AGI_PORT)
    log.info("FastAGI-Server gestartet auf Port %d", AGI_PORT)

    # Signal-Handler fuer sauberes Beenden
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(server)))

    async with server:
        await server.serve_forever()


async def shutdown(server):
    """Server sauber beenden."""
    log.info("FastAGI-Server wird beendet...")
    server.close()
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
