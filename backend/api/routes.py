"""
REST-API Endpoints — wird vom Web-Frontend aufgerufen.
"""
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from database import (get_db, Anruf, Agent, Queue, Callflow, Patient,
                      Termin, KBArtikel, Einstellung, Arzt, Wartezimmer, Benutzer,
                      AiAgent, AiIntegration)
from config import settings
from branchen import branche_laden, voicebot_system_prompt

log = logging.getLogger("api.routes")

router = APIRouter()


# ===== Hilfsfunktion =====

def _to_dict(obj):
    """SQLAlchemy-Objekt -> dict (ohne _sa_instance_state)."""
    d = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        d[c.name] = val
    return d


# ===== Schemas (passend zum Frontend) =====

class AgentSchema(BaseModel):
    name: str
    nebenstelle: str = ""
    sip_passwort: str = ""
    rolle: str = "rezeption"
    warteschlange: str = "rezeption"
    status: str = "offline"

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
    patient_id: Optional[int] = None
    arzt_id: Optional[int] = None
    patient_name: str = ""
    arzt_name: str = ""
    datum: str
    uhrzeit: str
    dauer_minuten: int = 15
    grund: str = ""
    status: str = "geplant"
    quelle: str = "agent"

class KBSchema(BaseModel):
    titel: str
    kategorie: str
    frage: str = ""
    antwort: str = ""
    voicebot_aktiv: bool = True
    clickbot_aktiv: bool = True

class PatientSchema(BaseModel):
    vorname: str = ""
    nachname: str = ""
    geburtsdatum: str = ""
    versicherungsnummer: str = ""
    krankenkasse: str = ""
    telefon: str = ""
    email: str = ""
    strasse: str = ""
    plz: str = ""
    stadt: str = ""

class ArztSchema(BaseModel):
    titel: str = ""
    vorname: str
    nachname: str
    fachrichtung: str
    telefon: str = ""
    email: str = ""

class AnrufSchema(BaseModel):
    anrufer_nummer: str = ""
    anrufer_name: str = ""
    agent_name: str = ""
    warteschlange: str = ""
    typ: str = "eingehend"
    status: str = "aktiv"
    beginn: str = ""
    dauer_sekunden: int = 0

class WartezimmerCheckinSchema(BaseModel):
    patient_id: Optional[int] = None
    patient_name: str = ""
    termin_id: Optional[int] = None
    termin_uhrzeit: str = ""
    termin_grund: str = ""
    arzt_name: str = ""

class BenutzerSchema(BaseModel):
    name: str
    email: str = ""
    alter: int = 0
    strasse: str = ""
    plz: str = ""
    stadt: str = ""

class ChatRequest(BaseModel):
    text: str
    verlauf: list = []
    branche: str = "arztpraxis"
    firmen_name: str = ""

class BerechnenRequest(BaseModel):
    a: float
    b: float
    operation: str

class VoicebotDialogRequest(BaseModel):
    eingabe: str
    schritt: int = 0
    dialog_typ: str = "frage"
    branche: str = "arztpraxis"
    firmen_name: str = ""

class UebersetzenRequest(BaseModel):
    text: str
    von: str = "de"
    nach: str = "en"
    branche: str = "arztpraxis"
    firmen_name: str = ""


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
    return [_to_dict(a) for a in result.scalars().all()]

@router.post("/agenten")
async def agent_erstellen(data: AgentSchema, db: AsyncSession = Depends(get_db)):
    agent = Agent(**data.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return _to_dict(agent)

@router.get("/agenten/{agent_id}")
async def agent_detail(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent nicht gefunden")
    return _to_dict(agent)

@router.put("/agenten/{agent_id}")
async def agent_aktualisieren(agent_id: int, data: AgentSchema, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(agent, key, value)
    await db.commit()
    return _to_dict(agent)

@router.put("/agenten/{agent_id}/status")
async def agent_status(agent_id: int, status: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent nicht gefunden")
    agent.status = status
    await db.commit()
    return {"ok": True, "status": status}

@router.delete("/agenten/{agent_id}")
async def agent_loeschen(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent nicht gefunden")
    await db.delete(agent)
    await db.commit()
    return {"ok": True}


# ===== Queues / ACD =====

@router.get("/queues")
async def queues_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Queue).order_by(Queue.name))
    return [_to_dict(q) for q in result.scalars().all()]

@router.post("/queues")
async def queue_erstellen(data: QueueSchema, db: AsyncSession = Depends(get_db)):
    queue = Queue(**data.model_dump())
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    return _to_dict(queue)

@router.get("/queues/{queue_name}/status")
async def queue_status(queue_name: str, db: AsyncSession = Depends(get_db)):
    """Live-Status einer Queue (Wartende, Agenten, etc.)."""
    queue = await db.execute(select(Queue).where(Queue.name == queue_name))
    q = queue.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Queue nicht gefunden")

    # Agenten in dieser Queue
    agenten = await db.execute(select(Agent).where(Agent.warteschlange == queue_name))
    queue_agenten = agenten.scalars().all()

    wartende = await db.scalar(
        select(func.count()).where(Anruf.warteschlange == queue_name, Anruf.status == "wartend")
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
    return [_to_dict(c) for c in result.scalars().all()]

@router.post("/callflows")
async def callflow_erstellen(data: CallflowSchema, db: AsyncSession = Depends(get_db)):
    cf = Callflow(**data.model_dump(), geaendert=datetime.utcnow())
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return _to_dict(cf)

@router.get("/callflows/{cf_id}")
async def callflow_detail(cf_id: int, db: AsyncSession = Depends(get_db)):
    cf = await db.get(Callflow, cf_id)
    if not cf:
        raise HTTPException(404, "Callflow nicht gefunden")
    return _to_dict(cf)

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
    return _to_dict(cf)

@router.delete("/callflows/{cf_id}")
async def callflow_loeschen(cf_id: int, db: AsyncSession = Depends(get_db)):
    cf = await db.get(Callflow, cf_id)
    if not cf:
        raise HTTPException(404, "Callflow nicht gefunden")
    await db.delete(cf)
    await db.commit()
    return {"ok": True}

@router.post("/callflows/{cf_id}/aktivieren")
async def callflow_aktivieren(cf_id: int, db: AsyncSession = Depends(get_db)):
    cf = await db.get(Callflow, cf_id)
    if not cf:
        raise HTTPException(404, "Callflow nicht gefunden")
    cf.aktiv = True
    cf.geaendert = datetime.utcnow()
    await db.commit()
    return {"ok": True}


# ===== Anrufe =====

@router.get("/anrufe")
async def anrufe_liste(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Anruf).order_by(Anruf.erstellt.desc()).limit(limit)
    )
    return [_to_dict(a) for a in result.scalars().all()]

@router.get("/anrufe/{anruf_id}")
async def anruf_detail(anruf_id: int, db: AsyncSession = Depends(get_db)):
    anruf = await db.get(Anruf, anruf_id)
    if not anruf:
        raise HTTPException(404, "Anruf nicht gefunden")
    return _to_dict(anruf)

@router.post("/anrufe")
async def anruf_erstellen(data: AnrufSchema, db: AsyncSession = Depends(get_db)):
    anruf = Anruf(**data.model_dump())
    db.add(anruf)
    await db.commit()
    await db.refresh(anruf)
    return _to_dict(anruf)

@router.put("/anrufe/{anruf_id}")
async def anruf_aktualisieren(anruf_id: int, status: str = "beendet", db: AsyncSession = Depends(get_db)):
    anruf = await db.get(Anruf, anruf_id)
    if not anruf:
        raise HTTPException(404, "Anruf nicht gefunden")
    anruf.status = status
    await db.commit()
    return _to_dict(anruf)


# ===== Termine =====

@router.get("/termine")
async def termine_liste(datum: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Termin).order_by(Termin.datum, Termin.uhrzeit)
    if datum:
        query = query.where(Termin.datum == datum)
    result = await db.execute(query)
    return [_to_dict(t) for t in result.scalars().all()]

@router.post("/termine")
async def termin_erstellen(data: TerminSchema, db: AsyncSession = Depends(get_db)):
    termin = Termin(**data.model_dump())
    db.add(termin)
    await db.commit()
    await db.refresh(termin)
    return _to_dict(termin)

@router.put("/termine/{termin_id}")
async def termin_aktualisieren(termin_id: int, data: TerminSchema, db: AsyncSession = Depends(get_db)):
    termin = await db.get(Termin, termin_id)
    if not termin:
        raise HTTPException(404, "Termin nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(termin, key, value)
    await db.commit()
    return _to_dict(termin)

@router.delete("/termine/{termin_id}")
async def termin_loeschen(termin_id: int, db: AsyncSession = Depends(get_db)):
    termin = await db.get(Termin, termin_id)
    if not termin:
        raise HTTPException(404, "Termin nicht gefunden")
    await db.delete(termin)
    await db.commit()
    return {"ok": True}


# ===== Patienten =====

@router.get("/patienten")
async def patienten_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).order_by(Patient.nachname))
    return [_to_dict(p) for p in result.scalars().all()]

@router.get("/patienten/{patient_id}")
async def patient_detail(patient_id: int, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient nicht gefunden")
    return _to_dict(patient)

@router.post("/patienten")
async def patient_erstellen(data: PatientSchema, db: AsyncSession = Depends(get_db)):
    patient = Patient(**data.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return _to_dict(patient)

@router.put("/patienten/{patient_id}")
async def patient_aktualisieren(patient_id: int, data: PatientSchema, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(patient, key, value)
    await db.commit()
    return _to_dict(patient)

@router.delete("/patienten/{patient_id}")
async def patient_loeschen(patient_id: int, db: AsyncSession = Depends(get_db)):
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient nicht gefunden")
    await db.delete(patient)
    await db.commit()
    return {"ok": True}


# ===== Aerzte =====

@router.get("/aerzte")
async def aerzte_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Arzt).order_by(Arzt.nachname))
    return [_to_dict(a) for a in result.scalars().all()]

@router.get("/aerzte/{arzt_id}")
async def arzt_detail(arzt_id: int, db: AsyncSession = Depends(get_db)):
    arzt = await db.get(Arzt, arzt_id)
    if not arzt:
        raise HTTPException(404, "Arzt nicht gefunden")
    return _to_dict(arzt)

@router.post("/aerzte")
async def arzt_erstellen(data: ArztSchema, db: AsyncSession = Depends(get_db)):
    arzt = Arzt(**data.model_dump())
    db.add(arzt)
    await db.commit()
    await db.refresh(arzt)
    return _to_dict(arzt)

@router.put("/aerzte/{arzt_id}")
async def arzt_aktualisieren(arzt_id: int, data: ArztSchema, db: AsyncSession = Depends(get_db)):
    arzt = await db.get(Arzt, arzt_id)
    if not arzt:
        raise HTTPException(404, "Arzt nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(arzt, key, value)
    await db.commit()
    return _to_dict(arzt)

@router.delete("/aerzte/{arzt_id}")
async def arzt_loeschen(arzt_id: int, db: AsyncSession = Depends(get_db)):
    arzt = await db.get(Arzt, arzt_id)
    if not arzt:
        raise HTTPException(404, "Arzt nicht gefunden")
    await db.delete(arzt)
    await db.commit()
    return {"ok": True}


# ===== Wartezimmer =====

@router.get("/wartezimmer")
async def wartezimmer_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wartezimmer).where(Wartezimmer.status != "fertig").order_by(Wartezimmer.erstellt)
    )
    return [_to_dict(w) for w in result.scalars().all()]

@router.post("/wartezimmer")
async def wartezimmer_checkin(data: WartezimmerCheckinSchema, db: AsyncSession = Depends(get_db)):
    eintrag = Wartezimmer(**data.model_dump(), status="wartend",
                          ankunft_zeit=datetime.utcnow().isoformat())
    db.add(eintrag)
    await db.commit()
    await db.refresh(eintrag)
    return _to_dict(eintrag)

@router.put("/wartezimmer/{wz_id}/status")
async def wartezimmer_status(wz_id: int, status: str, db: AsyncSession = Depends(get_db)):
    eintrag = await db.get(Wartezimmer, wz_id)
    if not eintrag:
        raise HTTPException(404, "Wartezimmer-Eintrag nicht gefunden")
    eintrag.status = status
    await db.commit()
    return {"ok": True}

@router.delete("/wartezimmer/{wz_id}")
async def wartezimmer_entfernen(wz_id: int, db: AsyncSession = Depends(get_db)):
    eintrag = await db.get(Wartezimmer, wz_id)
    if not eintrag:
        raise HTTPException(404, "Wartezimmer-Eintrag nicht gefunden")
    await db.delete(eintrag)
    await db.commit()
    return {"ok": True}


# ===== Benutzer =====

@router.get("/benutzer")
async def benutzer_liste(suche: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Benutzer).order_by(Benutzer.name)
    if suche:
        s = f"%{suche}%"
        query = query.where(or_(Benutzer.name.ilike(s), Benutzer.email.ilike(s), Benutzer.stadt.ilike(s)))
    result = await db.execute(query)
    return [{**_to_dict(b), "alter": b.alter_jahre} for b in result.scalars().all()]

@router.post("/benutzer")
async def benutzer_erstellen(data: BenutzerSchema, db: AsyncSession = Depends(get_db)):
    b = Benutzer(name=data.name, email=data.email, alter_jahre=data.alter,
                 strasse=data.strasse, plz=data.plz, stadt=data.stadt)
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return {**_to_dict(b), "alter": b.alter_jahre}

@router.put("/benutzer/{benutzer_id}")
async def benutzer_aktualisieren(benutzer_id: int, data: BenutzerSchema, db: AsyncSession = Depends(get_db)):
    b = await db.get(Benutzer, benutzer_id)
    if not b:
        raise HTTPException(404, "Benutzer nicht gefunden")
    b.name = data.name
    b.email = data.email
    b.alter_jahre = data.alter
    b.strasse = data.strasse
    b.plz = data.plz
    b.stadt = data.stadt
    await db.commit()
    return {**_to_dict(b), "alter": b.alter_jahre}

@router.delete("/benutzer/{benutzer_id}")
async def benutzer_loeschen(benutzer_id: int, db: AsyncSession = Depends(get_db)):
    b = await db.get(Benutzer, benutzer_id)
    if not b:
        raise HTTPException(404, "Benutzer nicht gefunden")
    await db.delete(b)
    await db.commit()
    return {"ok": True}


# ===== Wissensdatenbank =====

@router.get("/kb")
async def kb_liste(kategorie: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(KBArtikel).order_by(KBArtikel.titel)
    if kategorie:
        query = query.where(KBArtikel.kategorie == kategorie)
    result = await db.execute(query)
    return [_to_dict(a) for a in result.scalars().all()]

@router.post("/kb")
async def kb_erstellen(data: KBSchema, db: AsyncSession = Depends(get_db)):
    artikel = KBArtikel(**data.model_dump())
    db.add(artikel)
    await db.commit()
    await db.refresh(artikel)
    return _to_dict(artikel)


# ===== Branchen =====

@router.get("/branchen")
async def branchen_api():
    """Alle verfuegbaren Branchen fuer den Voicebot."""
    from branchen import branchen_liste, branche_laden
    liste = branchen_liste()
    return [
        {"key": k, "label": v, "begruessung": branche_laden(k).get("begruessung", "")}
        for k, v in liste.items()
    ]


# ===== Voicebot Einstellungen =====

@router.get("/voicebot/config")
async def voicebot_config():
    """Aktuelle Voicebot-Konfiguration."""
    return {
        "llm_model": settings.llm_model,
        "stt_model": settings.stt_model,
        "tts_stimme": settings.tts_stimme,
        "tts_rate": settings.tts_rate,
        "hintergrund_typ": settings.audio_hintergrund_typ,
        "hintergrund_aktiv": settings.audio_hintergrund_aktiv,
        "hintergrund_lautstaerke": settings.audio_hintergrund_lautstaerke,
        "barge_in": True,
    }

@router.get("/voicebot/stimmen")
async def voicebot_stimmen():
    """Alle verfuegbaren TTS-Stimmen."""
    stimmen = settings.verfuegbare_stimmen()
    return [
        {
            "id": k,
            "name": v["name"],
            "voice_id": v["voice_id"],
            "geschlecht": v["geschlecht"],
            "beschreibung": v["beschreibung"],
        }
        for k, v in stimmen.items()
    ]

@router.get("/voicebot/hintergruende")
async def voicebot_hintergruende():
    """Verfuegbare Hintergrundgeraeusch-Typen."""
    hintergruende = settings.verfuegbare_hintergruende()
    return [
        {"id": k, "name": v["name"], "beschreibung": v["beschreibung"]}
        for k, v in hintergruende.items()
    ]


# ===== Einstellungen =====

@router.get("/einstellungen")
async def einstellungen_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Einstellung).order_by(Einstellung.kategorie, Einstellung.schluessel))
    return [_to_dict(e) for e in result.scalars().all()]

@router.put("/einstellungen/{schluessel}")
async def einstellung_setzen(schluessel: str, wert: str, kategorie: str = "allgemein",
                             db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Einstellung).where(Einstellung.schluessel == schluessel))
    e = result.scalar_one_or_none()
    if e:
        e.wert = wert
    else:
        e = Einstellung(schluessel=schluessel, wert=wert, kategorie=kategorie)
        db.add(e)
    await db.commit()
    return {"ok": True}


# ===== LLM Status (fuer Frontend Modus-Erkennung) =====

@router.get("/llm/status")
async def llm_status():
    """LLM-Status — wird vom Frontend genutzt um Demo/Live-Modus zu erkennen."""
    return {
        "verfuegbar": True,
        "modell": settings.llm_model,
        "provider": settings.llm_provider,
    }


# ===== Chat (Allgemeiner Chat-Assistent) =====

@router.post("/chat")
async def chat(data: ChatRequest):
    """Chat-Assistent — sendet Nachrichten ans LLM mit Branchenkontext."""
    try:
        from main import app
        engine = app.state.voicebot
    except Exception:
        engine = None

    if not engine or not engine.llm or not engine.llm.client:
        return {"antwort": _chat_demo_antwort(data.text)}

    kontext = voicebot_system_prompt(data.branche, data.firmen_name)
    messages = [{"role": "system", "content": kontext}]
    for msg in data.verlauf[-10:]:
        rolle = msg.get("rolle", "user")
        r = "assistant" if rolle in ("bot", "assistant") else "user"
        messages.append({"role": r, "content": msg.get("text", msg.get("content", ""))})
    messages.append({"role": "user", "content": data.text})

    try:
        response = await asyncio.wait_for(
            engine.llm.client.chat(
                model=settings.llm_model,
                messages=messages,
                options={"temperature": 0.7, "num_predict": 256},
            ),
            timeout=30.0,
        )
        antwort = response.message.content.strip().replace("*", "").replace("#", "").replace("`", "")
        return {"antwort": antwort}
    except asyncio.TimeoutError:
        return {"antwort": "Entschuldigung, das dauert gerade etwas laenger. Bitte versuchen Sie es erneut."}
    except Exception as e:
        log.error("Chat-Fehler: %s", e)
        return {"antwort": _chat_demo_antwort(data.text)}


def _chat_demo_antwort(text: str) -> str:
    """Fallback-Antwort wenn LLM nicht verfuegbar."""
    text_lower = text.lower()
    if any(w in text_lower for w in ["termin", "termine"]):
        return "Gerne helfe ich Ihnen bei der Terminvereinbarung. Wann wuerden Sie gerne kommen?"
    if any(w in text_lower for w in ["rezept", "medikament"]):
        return "Fuer eine Rezeptbestellung brauche ich Ihren Namen und das gewuenschte Medikament."
    if any(w in text_lower for w in ["oeffnungszeit", "geoeffnet", "offen"]):
        return "Unsere Oeffnungszeiten sind Mo-Fr 08:00-12:00 Uhr und Mo, Di, Do 14:00-18:00 Uhr."
    if any(w in text_lower for w in ["hallo", "guten tag", "hi"]):
        return "Guten Tag! Wie kann ich Ihnen helfen?"
    return "Vielen Dank fuer Ihre Nachricht. Wie kann ich Ihnen weiterhelfen?"


# ===== Rechner =====

@router.post("/berechnen")
async def berechnen(data: BerechnenRequest):
    """Einfacher Rechner fuer das Frontend."""
    try:
        if data.operation == "addieren":
            ergebnis = data.a + data.b
        elif data.operation == "subtrahieren":
            ergebnis = data.a - data.b
        elif data.operation == "multiplizieren":
            ergebnis = data.a * data.b
        elif data.operation == "dividieren":
            if data.b == 0:
                raise HTTPException(400, "Division durch Null")
            ergebnis = data.a / data.b
        else:
            raise HTTPException(400, f"Unbekannte Operation: {data.operation}")
        return {"ergebnis": ergebnis}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


# ===== Voicebot Dialog (Test) =====

@router.post("/voicebot/dialog")
async def voicebot_dialog(data: VoicebotDialogRequest):
    """Voicebot-Dialog Test — simuliert ein Telefongespraech Schritt fuer Schritt."""
    try:
        from main import app
        engine = app.state.voicebot
    except Exception:
        engine = None

    if not engine or not engine.llm or not engine.llm.client:
        return _voicebot_demo_dialog(data)

    kontext = voicebot_system_prompt(data.branche, data.firmen_name)
    messages = [
        {"role": "system", "content": kontext},
        {"role": "user", "content": data.eingabe},
    ]

    try:
        response = await asyncio.wait_for(
            engine.llm.client.chat(
                model=settings.llm_model,
                messages=messages,
                options={"temperature": 0.7, "num_predict": 256},
            ),
            timeout=30.0,
        )
        antwort = response.message.content.strip().replace("*", "").replace("#", "").replace("`", "")

        aktion = "weiter"
        antwort_lower = antwort.lower()
        if any(w in antwort_lower for w in ["termin", "gebucht", "eingetragen"]):
            aktion = "termin_buchen"
        elif any(w in antwort_lower for w in ["rezept", "bestellt"]):
            aktion = "rezept"
        elif any(w in antwort_lower for w in ["auf wiedersehen", "tschuess", "schoenen tag"]):
            aktion = "beenden"

        return {"schritt": data.schritt + 1, "aktion": aktion, "antwort": antwort}
    except Exception as e:
        log.error("Voicebot-Dialog Fehler: %s", e)
        return _voicebot_demo_dialog(data)


def _voicebot_demo_dialog(data: VoicebotDialogRequest) -> dict:
    """Demo-Dialog wenn LLM nicht verfuegbar."""
    eingabe_lower = data.eingabe.lower()
    if any(w in eingabe_lower for w in ["termin", "termine"]):
        return {"schritt": data.schritt + 1, "aktion": "termin_buchen",
                "antwort": "Gerne vereinbare ich einen Termin fuer Sie. Wann wuerden Sie gerne kommen?"}
    if any(w in eingabe_lower for w in ["rezept"]):
        return {"schritt": data.schritt + 1, "aktion": "rezept",
                "antwort": "Fuer das Rezept brauche ich Ihren Namen und das Medikament."}
    return {"schritt": data.schritt + 1, "aktion": "weiter",
            "antwort": "Vielen Dank. Wie kann ich Ihnen weiterhelfen?"}


# ===== Uebersetzen =====

@router.post("/uebersetzen")
async def uebersetzen(data: UebersetzenRequest):
    """Uebersetzungsdienst via LLM."""
    try:
        from main import app
        engine = app.state.voicebot
    except Exception:
        engine = None

    if not engine or not engine.llm or not engine.llm.client:
        return {"uebersetzung": f"[Demo] {data.text}"}

    sprachen = {
        "de": "Deutsch", "en": "Englisch", "fr": "Franzoesisch",
        "es": "Spanisch", "it": "Italienisch", "tr": "Tuerkisch",
        "ar": "Arabisch", "ru": "Russisch", "pl": "Polnisch",
        "pt": "Portugiesisch", "zh": "Chinesisch", "ja": "Japanisch",
    }
    von_name = sprachen.get(data.von, data.von)
    nach_name = sprachen.get(data.nach, data.nach)

    messages = [
        {"role": "system", "content": (
            f"Du bist ein professioneller Uebersetzer. "
            f"Uebersetze den folgenden Text von {von_name} nach {nach_name}. "
            f"Gib NUR die Uebersetzung zurueck, ohne Erklaerungen."
        )},
        {"role": "user", "content": data.text},
    ]

    try:
        response = await asyncio.wait_for(
            engine.llm.client.chat(
                model=settings.llm_model,
                messages=messages,
                options={"temperature": 0.3, "num_predict": 512},
            ),
            timeout=30.0,
        )
        uebersetzung = response.message.content.strip()
        return {"uebersetzung": uebersetzung}
    except Exception as e:
        log.error("Uebersetzung Fehler: %s", e)
        return {"uebersetzung": f"[Fehler] Uebersetzung nicht moeglich: {e}"}


# ===== AI Agent Engineering =====

class AiAgentSchema(BaseModel):
    name: str
    branche: str = "arztpraxis"
    stimme: str = ""
    hintergrund: str = "buero"
    persoenlichkeit: str = ""
    begruessung: str = ""
    regeln: str = ""
    llm_model: str = "llama3.1:8b-instruct-q4_K_M"
    temperatur: float = 0.7
    skills: dict = {}
    kanaele: list = []
    system_prompt: str = ""
    kontext: str = ""
    prompt_regeln: str = ""
    status: str = "aktiv"

class AiIntegrationSchema(BaseModel):
    name: str
    kategorie: str = ""
    api_url: str = ""
    auth_typ: str = "apikey"
    auth_user: str = ""
    auth_pass: str = ""
    mapping: str = ""
    aktiv: bool = False

class AIChatRequest(BaseModel):
    messages: list


@router.get("/ai-agents")
async def ai_agents_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AiAgent).order_by(AiAgent.erstellt.desc()))
    return [_to_dict(a) for a in result.scalars().all()]

@router.post("/ai-agents")
async def ai_agent_erstellen(data: AiAgentSchema, db: AsyncSession = Depends(get_db)):
    agent = AiAgent(**data.model_dump(), geaendert=datetime.utcnow())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return _to_dict(agent)

@router.get("/ai-agents/{agent_id}")
async def ai_agent_detail(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    return _to_dict(agent)

@router.put("/ai-agents/{agent_id}")
async def ai_agent_aktualisieren(agent_id: int, data: AiAgentSchema, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(agent, key, value)
    agent.geaendert = datetime.utcnow()
    await db.commit()
    return _to_dict(agent)

@router.put("/ai-agents/{agent_id}/status")
async def ai_agent_status(agent_id: int, status: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    agent.status = status
    agent.geaendert = datetime.utcnow()
    await db.commit()
    return {"ok": True, "status": status}

@router.put("/ai-agents/{agent_id}/prompt")
async def ai_agent_prompt_speichern(agent_id: int, db: AsyncSession = Depends(get_db),
                                     system_prompt: str = "", kontext: str = "", prompt_regeln: str = ""):
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    agent.system_prompt = system_prompt
    agent.kontext = kontext
    agent.prompt_regeln = prompt_regeln
    agent.geaendert = datetime.utcnow()
    await db.commit()
    return {"ok": True}

@router.delete("/ai-agents/{agent_id}")
async def ai_agent_loeschen(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    await db.delete(agent)
    await db.commit()
    return {"ok": True}

@router.post("/ai-agents/{agent_id}/deploy")
async def ai_agent_deploy(agent_id: int, umgebung: str = "dev", db: AsyncSession = Depends(get_db)):
    """Agent in eine Umgebung deployen."""
    agent = await db.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(404, "AI Agent nicht gefunden")
    agent.status = "aktiv" if umgebung == "prod" else "testing"
    agent.geaendert = datetime.utcnow()
    await db.commit()
    return {"ok": True, "umgebung": umgebung, "agent": agent.name, "status": agent.status}


# ===== AI Integrationen =====

@router.get("/ai-integrationen")
async def ai_integrationen_liste(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AiIntegration).order_by(AiIntegration.name))
    return [_to_dict(i) for i in result.scalars().all()]

@router.post("/ai-integrationen")
async def ai_integration_erstellen(data: AiIntegrationSchema, db: AsyncSession = Depends(get_db)):
    integ = AiIntegration(**data.model_dump())
    db.add(integ)
    await db.commit()
    await db.refresh(integ)
    return _to_dict(integ)

@router.put("/ai-integrationen/{int_id}")
async def ai_integration_aktualisieren(int_id: int, data: AiIntegrationSchema, db: AsyncSession = Depends(get_db)):
    integ = await db.get(AiIntegration, int_id)
    if not integ:
        raise HTTPException(404, "Integration nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(integ, key, value)
    await db.commit()
    return _to_dict(integ)

@router.delete("/ai-integrationen/{int_id}")
async def ai_integration_loeschen(int_id: int, db: AsyncSession = Depends(get_db)):
    integ = await db.get(AiIntegration, int_id)
    if not integ:
        raise HTTPException(404, "Integration nicht gefunden")
    await db.delete(integ)
    await db.commit()
    return {"ok": True}

@router.post("/ai-integrationen/{int_id}/testen")
async def ai_integration_testen(int_id: int, db: AsyncSession = Depends(get_db)):
    """Integration testen — prueft ob URL erreichbar ist."""
    integ = await db.get(AiIntegration, int_id)
    if not integ:
        raise HTTPException(404, "Integration nicht gefunden")
    # Einfacher Check: URL gesetzt?
    if not integ.api_url:
        return {"ok": False, "fehler": "Keine API URL konfiguriert"}
    return {"ok": True, "name": integ.name, "url": integ.api_url}


# ===== AI Agent Test-Chat =====

@router.post("/ai-agent/chat")
async def ai_agent_chat(data: AIChatRequest):
    """Test-Chat fuer AI Agent Engineering — sendet Nachrichten ans LLM."""
    try:
        from main import app
        engine = app.state.voicebot
    except Exception:
        engine = None

    if not engine or not engine.llm or not engine.llm.client:
        # Demo-Antwort wenn kein LLM
        last_msg = ""
        for m in reversed(data.messages):
            if m.get("role") == "user":
                last_msg = m.get("content", "")
                break
        return {"antwort": _ai_agent_demo_antwort(last_msg)}

    try:
        response = await asyncio.wait_for(
            engine.llm.client.chat(
                model=settings.llm_model,
                messages=data.messages,
                options={
                    "temperature": 0.7,
                    "num_predict": 256,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
            ),
            timeout=30.0,
        )
        antwort = response.message.content.strip()
        antwort = antwort.replace("*", "").replace("#", "").replace("`", "")
        return {"antwort": antwort}
    except asyncio.TimeoutError:
        return {"antwort": "Timeout — LLM hat nicht rechtzeitig geantwortet."}
    except Exception as e:
        return {"antwort": f"Fehler: {e}"}


def _ai_agent_demo_antwort(text: str) -> str:
    """Demo-Antwort fuer AI Agent Test-Chat wenn kein LLM verfuegbar."""
    t = text.lower()
    if any(w in t for w in ["hallo", "guten tag", "hi"]):
        return "Guten Tag! Praxis Dr. Mueller, wie kann ich Ihnen helfen?"
    if any(w in t for w in ["termin", "termine"]):
        return "Gerne vereinbare ich einen Termin fuer Sie. Wann wuerden Sie denn gerne kommen — vormittags oder nachmittags?"
    if any(w in t for w in ["rezept", "medikament"]):
        return "Fuer eine Rezeptbestellung brauche ich Ihren Namen und das gewuenschte Medikament. Wie ist Ihr Name bitte?"
    if any(w in t for w in ["schmerz", "weh", "notfall", "dringend"]):
        return "Bei akuten Beschwerden koennen Sie heute noch in unsere offene Sprechstunde kommen. Diese ist von 11:00 bis 12:00 Uhr. Schaffen Sie das?"
    if any(w in t for w in ["danke", "tschuess", "wiedersehen"]):
        return "Gerne! Ich wuensche Ihnen einen schoenen Tag. Auf Wiedersehen!"
    if any(w in t for w in ["oeffnungszeit", "geoeffnet", "wann"]):
        return "Unsere Oeffnungszeiten sind Montag bis Freitag 08:00 bis 12:00 Uhr und Montag, Dienstag und Donnerstag 14:00 bis 18:00 Uhr."
    if any(w in t for w in ["ueberweisung", "facharzt"]):
        return "Fuer eine Ueberweisung kommen Sie bitte in die Sprechstunde. Ihr Arzt kann dann entscheiden, an welchen Facharzt ueberwiesen wird."
    return "Alles klar, ich habe das notiert. Kann ich sonst noch etwas fuer Sie tun?"


# ===== Seed / Demo-Daten =====

@router.post("/seed")
async def seed_demo_daten(db: AsyncSession = Depends(get_db)):
    """Demo-Daten in die Datenbank laden (idempotent)."""
    count = await db.scalar(select(func.count()).select_from(Patient))
    if count and count > 0:
        return {"ok": True, "nachricht": "Demo-Daten bereits vorhanden"}

    # Patienten (exakt wie im Frontend)
    for p in [
        Patient(vorname="Anna", nachname="Mueller", geburtsdatum="1985-03-15",
                versicherungsnummer="A123456789", krankenkasse="TK", telefon="030-1234567",
                email="anna.mueller@email.de", strasse="Berliner Str. 12", plz="10115", stadt="Berlin"),
        Patient(vorname="Thomas", nachname="Schmidt", geburtsdatum="1970-07-22",
                versicherungsnummer="B987654321", krankenkasse="AOK", telefon="030-9876543",
                email="t.schmidt@email.de", strasse="Hauptstr. 45", plz="10827", stadt="Berlin"),
        Patient(vorname="Maria", nachname="Weber", geburtsdatum="1992-11-30",
                versicherungsnummer="C456789123", krankenkasse="Barmer", telefon="030-5551234",
                email="m.weber@email.de", strasse="Schoenhauser Allee 8", plz="10435", stadt="Berlin"),
        Patient(vorname="Klaus", nachname="Fischer", geburtsdatum="1955-01-08",
                versicherungsnummer="D321654987", krankenkasse="DAK", telefon="030-7771234",
                email="k.fischer@email.de", strasse="Kantstr. 99", plz="10623", stadt="Berlin"),
        Patient(vorname="Sophie", nachname="Wagner", geburtsdatum="2000-05-20",
                versicherungsnummer="E654987321", krankenkasse="IKK", telefon="030-3334567",
                email="s.wagner@email.de", strasse="Friedrichstr. 200", plz="10117", stadt="Berlin"),
    ]:
        db.add(p)

    # Aerzte
    for a in [
        Arzt(titel="Dr.", vorname="Michael", nachname="Schneider",
             fachrichtung="Allgemeinmedizin", telefon="030-1110001", email="dr.schneider@praxis.de"),
        Arzt(titel="Dr.", vorname="Petra", nachname="Braun",
             fachrichtung="Kardiologie", telefon="030-1110002", email="dr.braun@praxis.de"),
        Arzt(titel="Prof. Dr.", vorname="Hans", nachname="Klein",
             fachrichtung="Orthopaedie", telefon="030-1110003", email="prof.klein@praxis.de"),
    ]:
        db.add(a)

    # Agenten (Frontend-Struktur)
    for ag in [
        Agent(name="Lisa Meier", nebenstelle="100", sip_passwort="demo123",
              rolle="rezeption", warteschlange="rezeption", status="online"),
        Agent(name="Peter Schulz", nebenstelle="101", sip_passwort="demo456",
              rolle="rezeption", warteschlange="terminvergabe", status="pause"),
        Agent(name="Dr. Schneider", nebenstelle="200", sip_passwort="demo789",
              rolle="arzt", warteschlange="dringend", status="online"),
    ]:
        db.add(ag)

    # Benutzer
    for b in [
        Benutzer(name="Admin", email="admin@praxis.de", alter_jahre=35,
                 strasse="Praxisstr. 1", plz="10115", stadt="Berlin"),
        Benutzer(name="Lisa Meier", email="lisa@praxis.de", alter_jahre=28,
                 strasse="Muellerstr. 5", plz="10119", stadt="Berlin"),
        Benutzer(name="Peter Schulz", email="peter@praxis.de", alter_jahre=42,
                 strasse="Torstr. 30", plz="10119", stadt="Berlin"),
    ]:
        db.add(b)

    # Termine (mit patient_id + arzt_id)
    heute = datetime.utcnow().strftime("%Y-%m-%d")
    for t in [
        Termin(patient_id=1, arzt_id=1, datum=heute, uhrzeit="09:00", dauer_minuten=30,
               grund="Vorsorgeuntersuchung", status="bestaetigt",
               patient_name="Mueller, Anna", arzt_name="Dr. Michael Schneider"),
        Termin(patient_id=2, arzt_id=2, datum=heute, uhrzeit="10:30", dauer_minuten=20,
               grund="Herz-Kontrolle", status="geplant",
               patient_name="Schmidt, Thomas", arzt_name="Dr. Petra Braun"),
        Termin(patient_id=5, arzt_id=3, datum=heute, uhrzeit="14:00", dauer_minuten=45,
               grund="Erstvorstellung Ruecken", status="geplant",
               patient_name="Wagner, Sophie", arzt_name="Prof. Dr. Hans Klein"),
        Termin(patient_id=3, arzt_id=1, datum=heute, uhrzeit="15:30", dauer_minuten=15,
               grund="Rezept abholen", status="geplant",
               patient_name="Weber, Maria", arzt_name="Dr. Michael Schneider"),
    ]:
        db.add(t)

    # Anrufe
    for an in [
        Anruf(anrufer_nummer="030-9998877", anrufer_name="Frau Lehmann",
              agent_name="Lisa Meier", warteschlange="rezeption",
              typ="eingehend", status="beendet", beginn=heute + " 08:15", dauer_sekunden=180),
        Anruf(anrufer_nummer="030-5554433", anrufer_name="",
              agent_name="Peter Schulz", warteschlange="terminvergabe",
              typ="eingehend", status="beendet", beginn=heute + " 08:45", dauer_sekunden=120),
    ]:
        db.add(an)

    # Queues
    for q in [
        Queue(name="rezeption", anzeigename="Rezeption", strategie="rrmemory"),
        Queue(name="terminvergabe", anzeigename="Terminvergabe", strategie="rrmemory"),
        Queue(name="dringend", anzeigename="Dringend", strategie="ringall", timeout=15),
    ]:
        db.add(q)

    # KB
    for kb in [
        KBArtikel(titel="Oeffnungszeiten", kategorie="allgemein",
                  frage="Wann haben Sie geoeffnet?",
                  antwort="Mo-Fr 08:00-12:00, Mo+Di+Do 14:00-18:00"),
        KBArtikel(titel="Notfall", kategorie="notfall",
                  frage="Was mache ich im Notfall?",
                  antwort="Bei Notfaellen rufen Sie 112 an. Aerztlicher Bereitschaftsdienst: 116 117."),
    ]:
        db.add(kb)

    # Callflow
    db.add(Callflow(name="Standard-Empfang", modus="voicebot", aktiv=True, bloecke=[
        {"typ": "begruessung", "label": "Begruessung", "config": {"text": "Guten Tag"}},
        {"typ": "menue", "label": "Hauptmenue", "config": {"optionen": ["Termin", "Rezept", "Sonstiges"]}},
    ]))

    await db.commit()
    return {"ok": True, "nachricht": "Demo-Daten geladen"}


# ===== System =====

@router.get("/system/status")
async def system_status():
    """System-Health-Check."""
    llm_ok = stt_ok = tts_ok = False
    try:
        from main import app
        engine = app.state.voicebot
        if engine:
            llm_ok = engine.llm is not None and engine.llm.client is not None
            stt_ok = engine.stt is not None and engine.stt.model is not None
            tts_ok = engine.tts is not None
    except Exception:
        pass

    return {
        "status": "online",
        "version": "1.0.0",
        "llm_status": "online" if llm_ok else "offline",
        "stt_status": "online" if stt_ok else "offline",
        "tts_status": "online" if tts_ok else "offline",
        "llm": settings.llm_model,
        "stt": settings.stt_model,
        "tts": settings.tts_stimme,
    }
