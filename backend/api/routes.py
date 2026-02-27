"""
REST-API Endpoints — wird vom Web-Frontend aufgerufen.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from database import get_db, Anruf, Agent, Queue, Callflow, Patient, Termin, KBArtikel, Einstellung
from config import settings

router = APIRouter()


# ===== Schemas =====

class AgentSchema(BaseModel):
    name: str
    extension: str
    email: str = ""
    rolle: str = "agent"
    queues: list = []
    skills: list = []

class QueueSchema(BaseModel):
    name: str
    anzeigename: str
    strategie: str = "rrmemory"
    timeout: int = 30
    max_wartezeit: int = 120
    wartemusik: str = "default"

class CallflowSchema(BaseModel):
    name: str
    modus: str = "voicebot"
    bloecke: list = []

class TerminSchema(BaseModel):
    patient_name: str
    arzt: str = ""
    datum: str
    uhrzeit: str
    dauer_min: int = 15
    grund: str = ""

class KBSchema(BaseModel):
    titel: str
    kategorie: str
    frage: str = ""
    antwort: str = ""
    voicebot_aktiv: bool = True
    clickbot_aktiv: bool = True

class EinstellungSchema(BaseModel):
    schluessel: str
    wert: str
    kategorie: str = "allgemein"


# ===== Dashboard =====

@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Live-KPIs fuer das Dashboard."""
    heute = datetime.utcnow().date()

    anrufe_heute = await db.scalar(
        select(func.count()).where(
            Anruf.erstellt >= datetime(heute.year, heute.month, heute.day)
        )
    ) or 0

    agenten_online = await db.scalar(
        select(func.count()).where(Agent.status.in_(["online", "gespraech"]))
    ) or 0

    termine_heute = await db.scalar(
        select(func.count()).where(Termin.datum == str(heute))
    ) or 0

    return {
        "anrufe_heute": anrufe_heute,
        "agenten_online": agenten_online,
        "termine_heute": termine_heute,
        "voicebot_aktiv": True,
        "queues_aktiv": await db.scalar(select(func.count()).where(Queue.aktiv == True)) or 0,
    }


# ===== Agenten =====

@router.get("/agenten")
async def agenten_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).order_by(Agent.name))
    return [a.__dict__ for a in result.scalars().all()]

@router.post("/agenten")
async def agent_erstellen(data: AgentSchema, db: AsyncSession = Depends(get_db)):
    agent = Agent(**data.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent.__dict__

@router.put("/agenten/{agent_id}/status")
async def agent_status(agent_id: int, status: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent nicht gefunden")
    agent.status = status
    if status == "online":
        agent.online_seit = datetime.utcnow()
    await db.commit()
    return {"ok": True, "status": status}


# ===== Queues / ACD =====

@router.get("/queues")
async def queues_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Queue).order_by(Queue.name))
    return [q.__dict__ for q in result.scalars().all()]

@router.post("/queues")
async def queue_erstellen(data: QueueSchema, db: AsyncSession = Depends(get_db)):
    queue = Queue(**data.model_dump())
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    return queue.__dict__

@router.get("/queues/{queue_name}/status")
async def queue_status(queue_name: str, db: AsyncSession = Depends(get_db)):
    """Live-Status einer Queue (Wartende, Agenten, etc.)."""
    queue = await db.execute(select(Queue).where(Queue.name == queue_name))
    q = queue.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Queue nicht gefunden")

    # Agenten in dieser Queue
    agenten = await db.execute(select(Agent))
    alle_agenten = agenten.scalars().all()
    queue_agenten = [a for a in alle_agenten if queue_name in (a.queues or [])]

    wartende = await db.scalar(
        select(func.count()).where(Anruf.queue == queue_name, Anruf.status == "wartend")
    ) or 0

    return {
        "queue": queue_name,
        "anzeigename": q.anzeigename,
        "strategie": q.strategie,
        "agenten_total": len(queue_agenten),
        "agenten_frei": sum(1 for a in queue_agenten if a.status == "online"),
        "agenten_gespraech": sum(1 for a in queue_agenten if a.status == "gespraech"),
        "wartende": wartende,
    }


# ===== Callflows =====

@router.get("/callflows")
async def callflows_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Callflow).order_by(Callflow.name))
    return [c.__dict__ for c in result.scalars().all()]

@router.post("/callflows")
async def callflow_erstellen(data: CallflowSchema, db: AsyncSession = Depends(get_db)):
    cf = Callflow(**data.model_dump(), geaendert=datetime.utcnow())
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return cf.__dict__

@router.put("/callflows/{cf_id}")
async def callflow_aktualisieren(cf_id: int, data: CallflowSchema, db: AsyncSession = Depends(get_db)):
    cf = await db.get(Callflow, cf_id)
    if not cf:
        raise HTTPException(404, "Callflow nicht gefunden")
    cf.name = data.name
    cf.modus = data.modus
    cf.bloecke = data.bloecke
    cf.geaendert = datetime.utcnow()
    await db.commit()
    return cf.__dict__


# ===== Anrufe =====

@router.get("/anrufe")
async def anrufe_liste(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Anruf).order_by(Anruf.erstellt.desc()).limit(limit)
    )
    return [a.__dict__ for a in result.scalars().all()]

@router.get("/anrufe/{anruf_id}")
async def anruf_detail(anruf_id: int, db: AsyncSession = Depends(get_db)):
    anruf = await db.get(Anruf, anruf_id)
    if not anruf:
        raise HTTPException(404, "Anruf nicht gefunden")
    return anruf.__dict__


# ===== Termine =====

@router.get("/termine")
async def termine_liste(datum: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Termin).order_by(Termin.datum, Termin.uhrzeit)
    if datum:
        query = query.where(Termin.datum == datum)
    result = await db.execute(query)
    return [t.__dict__ for t in result.scalars().all()]

@router.post("/termine")
async def termin_erstellen(data: TerminSchema, db: AsyncSession = Depends(get_db)):
    termin = Termin(**data.model_dump())
    db.add(termin)
    await db.commit()
    await db.refresh(termin)
    return termin.__dict__


# ===== Wissensdatenbank =====

@router.get("/kb")
async def kb_liste(kategorie: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(KBArtikel).order_by(KBArtikel.titel)
    if kategorie:
        query = query.where(KBArtikel.kategorie == kategorie)
    result = await db.execute(query)
    return [a.__dict__ for a in result.scalars().all()]

@router.post("/kb")
async def kb_erstellen(data: KBSchema, db: AsyncSession = Depends(get_db)):
    artikel = KBArtikel(**data.model_dump())
    db.add(artikel)
    await db.commit()
    await db.refresh(artikel)
    return artikel.__dict__


# ===== Voicebot Einstellungen =====

@router.get("/voicebot/config")
async def voicebot_config():
    """Aktuelle Voicebot-Konfiguration."""
    return {
        "llm_model": settings.llm_model,
        "stt_model": settings.stt_model,
        "tts_model": settings.tts_model,
        "tts_speed": settings.tts_speed,
        "hintergrund_typ": settings.audio_hintergrund_typ,
        "hintergrund_aktiv": settings.audio_hintergrund_aktiv,
        "hintergrund_lautstaerke": settings.audio_hintergrund_lautstaerke,
        "barge_in": True,
    }

@router.get("/voicebot/hintergruende")
async def voicebot_hintergruende():
    """Verfuegbare Hintergrundgeraeusch-Typen."""
    from voicebot.audio_mixer import HINTERGRUND_TYPEN
    return [
        {"id": k, "name": v["name"], "beschreibung": v["beschreibung"]}
        for k, v in HINTERGRUND_TYPEN.items()
    ]


# ===== Einstellungen =====

@router.get("/einstellungen")
async def einstellungen_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Einstellung).order_by(Einstellung.kategorie, Einstellung.schluessel))
    return [e.__dict__ for e in result.scalars().all()]

@router.put("/einstellungen/{schluessel}")
async def einstellung_setzen(schluessel: str, wert: str, kategorie: str = "allgemein", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Einstellung).where(Einstellung.schluessel == schluessel))
    e = result.scalar_one_or_none()
    if e:
        e.wert = wert
    else:
        e = Einstellung(schluessel=schluessel, wert=wert, kategorie=kategorie)
        db.add(e)
    await db.commit()
    return {"ok": True}


# ===== System =====

@router.get("/system/status")
async def system_status():
    """System-Health-Check."""
    return {
        "status": "online",
        "version": "1.0.0",
        "asterisk": "pruefen...",
        "llm": settings.llm_model,
        "stt": settings.stt_model,
        "tts": settings.tts_model,
    }
