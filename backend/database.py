"""
Datenbank — SQLAlchemy Async mit SQLite.
Modelle sind an das Frontend angepasst.
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
    anrufer_nummer = Column(String(64), default="")
    anrufer_name = Column(String(128), default="")
    agent_name = Column(String(128), default="")
    warteschlange = Column(String(64), default="")
    typ = Column(String(16), default="eingehend")  # eingehend, ausgehend
    status = Column(String(32), default="aktiv")  # aktiv, beendet, verpasst, voicebot
    beginn = Column(String(32), default="")
    dauer_sekunden = Column(Integer, default=0)
    voicebot_aktiv = Column(Boolean, default=False)
    transkript = Column(Text, default="")
    zusammenfassung = Column(Text, default="")
    erstellt = Column(DateTime, default=_utcnow)


class Agent(Base):
    __tablename__ = "agenten"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    nebenstelle = Column(String(16), default="")
    sip_passwort = Column(String(64), default="")
    rolle = Column(String(32), default="rezeption")
    warteschlange = Column(String(64), default="rezeption")
    status = Column(String(32), default="offline")  # online, offline, pause, gespraech
    erstellt = Column(DateTime, default=_utcnow)


class Queue(Base):
    __tablename__ = "queues"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), unique=True)
    anzeigename = Column(String(128))
    strategie = Column(String(32), default="rrmemory")
    timeout = Column(Integer, default=30)
    max_wartezeit = Column(Integer, default=120)
    wartemusik = Column(String(64), default="default")
    ansage = Column(String(256), default="")
    aktiv = Column(Boolean, default=True)


class Callflow(Base):
    __tablename__ = "callflows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    modus = Column(String(16), default="voicebot")
    bloecke = Column(JSON, default=list)
    aktiv = Column(Boolean, default=True)
    erstellt = Column(DateTime, default=_utcnow)
    geaendert = Column(DateTime, default=_utcnow)


class Patient(Base):
    __tablename__ = "patienten"
    id = Column(Integer, primary_key=True, autoincrement=True)
    vorname = Column(String(128), default="")
    nachname = Column(String(128), default="")
    geburtsdatum = Column(String(16), default="")
    versicherungsnummer = Column(String(32), default="")
    krankenkasse = Column(String(64), default="")
    telefon = Column(String(32), default="")
    email = Column(String(128), default="")
    strasse = Column(String(256), default="")
    plz = Column(String(8), default="")
    stadt = Column(String(128), default="")
    notizen = Column(Text, default="")
    erstellt = Column(DateTime, default=_utcnow)


class Termin(Base):
    __tablename__ = "termine"
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patienten.id"), nullable=True)
    arzt_id = Column(Integer, ForeignKey("aerzte.id"), nullable=True)
    patient_name = Column(String(128), default="")
    arzt_name = Column(String(128), default="")
    datum = Column(String(16))
    uhrzeit = Column(String(8))
    dauer_minuten = Column(Integer, default=15)
    grund = Column(String(256), default="")
    status = Column(String(32), default="geplant")
    quelle = Column(String(32), default="agent")
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


class Arzt(Base):
    __tablename__ = "aerzte"
    id = Column(Integer, primary_key=True, autoincrement=True)
    titel = Column(String(32), default="")
    vorname = Column(String(128))
    nachname = Column(String(128))
    fachrichtung = Column(String(128))
    telefon = Column(String(32), default="")
    email = Column(String(128), default="")
    erstellt = Column(DateTime, default=_utcnow)


class Wartezimmer(Base):
    __tablename__ = "wartezimmer"
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patienten.id"), nullable=True)
    patient_name = Column(String(128), default="")
    termin_id = Column(Integer, ForeignKey("termine.id"), nullable=True)
    termin_uhrzeit = Column(String(8), default="")
    termin_grund = Column(String(256), default="")
    arzt_name = Column(String(128), default="")
    status = Column(String(32), default="wartend")  # wartend, aufgerufen, behandlung, fertig
    ankunft_zeit = Column(String(32), default="")
    erstellt = Column(DateTime, default=_utcnow)


class Benutzer(Base):
    __tablename__ = "benutzer"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128))
    email = Column(String(128), default="")
    alter_jahre = Column(Integer, default=0)
    strasse = Column(String(256), default="")
    plz = Column(String(8), default="")
    stadt = Column(String(128), default="")
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
