"""
Datenbank — SQLAlchemy Async mit SQLite.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from datetime import datetime, timezone

from config import settings

engine = create_async_engine(settings.db_url, echo=settings.debug)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ===== Modelle =====

class Anruf(Base):
    __tablename__ = "anrufe"
    id = Column(Integer, primary_key=True, autoincrement=True)
    caller_id = Column(String(64))
    caller_name = Column(String(128), default="")
    kanal = Column(String(64))
    status = Column(String(32), default="aktiv")  # aktiv, beendet, verpasst, voicebot
    richtung = Column(String(16), default="eingehend")
    queue = Column(String(64), default="")
    agent_id = Column(Integer, ForeignKey("agenten.id"), nullable=True)
    voicebot_aktiv = Column(Boolean, default=False)
    dauer_sekunden = Column(Integer, default=0)
    aufnahme_pfad = Column(String(256), default="")
    transkript = Column(Text, default="")
    zusammenfassung = Column(Text, default="")
    erstellt = Column(DateTime, default=_utcnow)
    beendet = Column(DateTime, nullable=True)


class Agent(Base):
    __tablename__ = "agenten"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    extension = Column(String(16))
    email = Column(String(128), default="")
    rolle = Column(String(32), default="agent")  # agent, teamleiter, standortleitung, admin
    status = Column(String(32), default="offline")  # online, offline, pause, gespraech, azu, meeting
    queues = Column(JSON, default=list)
    skills = Column(JSON, default=list)
    anrufe_heute = Column(Integer, default=0)
    online_seit = Column(DateTime, nullable=True)
    erstellt = Column(DateTime, default=_utcnow)


class Queue(Base):
    __tablename__ = "queues"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), unique=True)
    anzeigename = Column(String(128))
    strategie = Column(String(32), default="rrmemory")  # ringall, rrmemory, leastrecent, random
    timeout = Column(Integer, default=30)
    max_wartezeit = Column(Integer, default=120)
    wartemusik = Column(String(64), default="default")
    ansage = Column(String(256), default="")
    aktiv = Column(Boolean, default=True)


class Callflow(Base):
    __tablename__ = "callflows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    modus = Column(String(16), default="voicebot")  # voicebot, clickbot
    bloecke = Column(JSON, default=list)
    aktiv = Column(Boolean, default=True)
    erstellt = Column(DateTime, default=_utcnow)
    geaendert = Column(DateTime, default=_utcnow)


class Patient(Base):
    __tablename__ = "patienten"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    telefon = Column(String(32))
    email = Column(String(128), default="")
    geburtsdatum = Column(String(16), default="")
    versichertennr = Column(String(32), default="")
    notizen = Column(Text, default="")
    erstellt = Column(DateTime, default=_utcnow)


class Termin(Base):
    __tablename__ = "termine"
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patienten.id"), nullable=True)
    patient_name = Column(String(128))
    arzt = Column(String(128), default="")
    datum = Column(String(16))
    uhrzeit = Column(String(8))
    dauer_min = Column(Integer, default=15)
    grund = Column(String(256), default="")
    status = Column(String(32), default="geplant")  # geplant, bestaetigt, abgesagt
    quelle = Column(String(32), default="voicebot")  # voicebot, agent, online
    erstellt = Column(DateTime, default=_utcnow)


class KBArtikel(Base):
    __tablename__ = "kb_artikel"
    id = Column(Integer, primary_key=True, autoincrement=True)
    titel = Column(String(256))
    kategorie = Column(String(64))
    frage = Column(Text, default="")
    antwort = Column(Text, default="")
    voicebot_aktiv = Column(Boolean, default=True)
    clickbot_aktiv = Column(Boolean, default=True)
    erstellt = Column(DateTime, default=_utcnow)


class Einstellung(Base):
    __tablename__ = "einstellungen"
    id = Column(Integer, primary_key=True, autoincrement=True)
    schluessel = Column(String(128), unique=True)
    wert = Column(Text)
    kategorie = Column(String(64), default="allgemein")


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with SessionLocal() as session:
        yield session
