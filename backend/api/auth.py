"""
Authentifizierung — JWT-basiert.
Login liefert ein Token, das bei allen API-Aufrufen mitgeschickt wird.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db, Agent

log = logging.getLogger("api.auth")

router = APIRouter()

# Passwort-Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Config
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 Stunden

# OAuth2 Schema — tokenUrl muss zum Login-Endpoint passen
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ===== Schemas =====

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rolle: str
    name: str

class TokenData(BaseModel):
    agent_id: Optional[int] = None
    rolle: str = "agent"


# ===== Hilfsfunktionen =====

def passwort_hash(passwort: str) -> str:
    return pwd_context.hash(passwort)

def passwort_pruefen(passwort: str, hash: str) -> bool:
    return pwd_context.verify(passwort, hash)

def token_erstellen(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


async def aktueller_benutzer(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[Agent]:
    """
    Dependency fuer geschuetzte Endpoints.
    Gibt den angemeldeten Agenten zurueck oder None.
    Im Demo-Modus (kein Token) wird None zurueckgegeben,
    damit die API weiterhin ohne Auth nutzbar bleibt.
    """
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        agent_id = payload.get("sub")
        if agent_id is None:
            return None
        agent = await db.get(Agent, int(agent_id))
        return agent
    except JWTError:
        return None


async def auth_erforderlich(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    """
    Strenge Auth-Dependency — gibt 401 wenn nicht angemeldet.
    Fuer sensible Endpoints (Patientendaten, Einstellungen).
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht angemeldet",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        agent_id = payload.get("sub")
        if agent_id is None:
            raise HTTPException(status_code=401, detail="Ungueltiges Token")
        agent = await db.get(Agent, int(agent_id))
        if not agent:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        return agent
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungueltiges oder abgelaufenes Token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def admin_erforderlich(agent: Agent = Depends(auth_erforderlich)) -> Agent:
    """Nur Admins duerfen diesen Endpoint aufrufen."""
    if agent.rolle not in ("admin", "standortleitung"):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    return agent


# ===== Endpoints =====

# Vordefinierte Demo-Benutzer (Passwort-Hash fuer "demo")
_DEMO_PASSWORT_HASH = pwd_context.hash("demo")
DEMO_BENUTZER = {
    "admin": {"name": "Dr. Schmidt (Admin)", "rolle": "admin", "passwort_hash": _DEMO_PASSWORT_HASH},
    "teamleiter": {"name": "Fr. Mueller (TL)", "rolle": "teamleiter", "passwort_hash": _DEMO_PASSWORT_HASH},
    "agent": {"name": "Hr. Weber (Agent)", "rolle": "agent", "passwort_hash": _DEMO_PASSWORT_HASH},
    "standort": {"name": "Fr. Fischer (SL)", "rolle": "standortleitung", "passwort_hash": _DEMO_PASSWORT_HASH},
}


@router.post("/auth/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """
    Login — gibt JWT-Token zurueck.
    Prueft zuerst Agenten in der DB, dann Demo-Benutzer.
    """
    # 1. Agent in DB suchen (Extension oder Email als Username)
    result = await db.execute(
        select(Agent).where(
            (Agent.extension == form.username) | (Agent.email == form.username)
        )
    )
    agent = result.scalar_one_or_none()

    if agent:
        # TODO: Passwort-Hash in Agent-Tabelle speichern (neues Feld)
        # Vorerst: DB-Agenten akzeptieren Demo-Passwort
        if form.password == "demo":
            token = token_erstellen({"sub": str(agent.id), "rolle": agent.rolle})
            return Token(access_token=token, rolle=agent.rolle, name=agent.name)

    # 2. Demo-Benutzer pruefen
    demo = DEMO_BENUTZER.get(form.username)
    if demo and passwort_pruefen(form.password, demo["passwort_hash"]):
        # Demo-Benutzer: Agent-ID = -1 (virtuell)
        token = token_erstellen({"sub": form.username, "rolle": demo["rolle"]})
        return Token(access_token=token, rolle=demo["rolle"], name=demo["name"])

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Falscher Benutzername oder Passwort",
    )


@router.get("/auth/me")
async def auth_me(agent: Agent = Depends(auth_erforderlich)):
    """Aktuellen Benutzer zurueckgeben."""
    return {
        "id": agent.id if hasattr(agent, "id") else None,
        "name": agent.name if hasattr(agent, "name") else "Demo-Benutzer",
        "rolle": agent.rolle if hasattr(agent, "rolle") else "agent",
    }
