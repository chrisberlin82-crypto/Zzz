"""Einfacher Rechner als Beispielmodul."""

import json
from pathlib import Path


def addieren(a: float, b: float) -> float:
    return a + b


def subtrahieren(a: float, b: float) -> float:
    return a - b


def multiplizieren(a: float, b: float) -> float:
    return a * b


def dividieren(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Division durch Null ist nicht erlaubt")
    return a / b


def json_laden(dateipfad: str) -> dict:
    """Lädt und parst eine JSON-Datei."""
    pfad = Path(dateipfad)
    if not pfad.exists():
        raise FileNotFoundError(f"Datei nicht gefunden: {dateipfad}")
    with open(pfad, encoding="utf-8") as f:
        return json.load(f)


def json_speichern(daten: dict, dateipfad: str) -> None:
    """Speichert Daten als JSON-Datei."""
    with open(dateipfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, indent=2, ensure_ascii=False)
