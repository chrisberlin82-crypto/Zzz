"""JSON-Schema-Validierung."""

import json
from pathlib import Path

import jsonschema


def schema_laden(schema_pfad: str) -> dict:
    """Lädt ein JSON-Schema aus einer Datei."""
    with open(schema_pfad, encoding="utf-8") as f:
        return json.load(f)


def validieren(daten: dict, schema: dict) -> list[str]:
    """Validiert Daten gegen ein JSON-Schema. Gibt eine Liste von Fehlern zurück."""
    validator = jsonschema.Draft7Validator(schema)
    fehler = []
    for error in sorted(validator.iter_errors(daten), key=lambda e: list(e.path)):
        pfad = ".".join(str(p) for p in error.path) or "(root)"
        fehler.append(f"{pfad}: {error.message}")
    return fehler


def ist_gueltig(daten: dict, schema: dict) -> bool:
    """Prüft ob Daten einem JSON-Schema entsprechen."""
    return len(validieren(daten, schema)) == 0
