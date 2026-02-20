"""SQLite-Datenbankschicht fuer die Benutzerverwaltung."""

import sqlite3
from pathlib import Path

DB_PFAD = Path(__file__).resolve().parent.parent.parent / "daten" / "zzz.db"


def verbindung_herstellen(db_pfad: str = None) -> sqlite3.Connection:
    """Stellt eine Verbindung zur SQLite-Datenbank her."""
    pfad = db_pfad or str(DB_PFAD)
    Path(pfad).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(pfad)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def tabellen_erstellen(conn: sqlite3.Connection) -> None:
    """Erstellt die Datenbanktabellen falls noetig."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS benutzer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            alter_jahre INTEGER NOT NULL CHECK(alter_jahre >= 0 AND alter_jahre <= 150),
            strasse TEXT DEFAULT '',
            plz TEXT DEFAULT '',
            stadt TEXT DEFAULT '',
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


def benutzer_erstellen(conn: sqlite3.Connection, daten: dict) -> dict:
    """Erstellt einen neuen Benutzer und gibt ihn mit ID zurueck."""
    cursor = conn.execute(
        """INSERT INTO benutzer (name, email, alter_jahre, strasse, plz, stadt)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            daten["name"],
            daten["email"],
            daten["alter"],
            daten.get("strasse", ""),
            daten.get("plz", ""),
            daten.get("stadt", ""),
        ),
    )
    conn.commit()
    return benutzer_nach_id(conn, cursor.lastrowid)


def benutzer_alle(conn: sqlite3.Connection) -> list[dict]:
    """Gibt alle Benutzer zurueck."""
    rows = conn.execute("SELECT * FROM benutzer ORDER BY id").fetchall()
    return [_zeile_zu_dict(r) for r in rows]


def benutzer_nach_id(conn: sqlite3.Connection, benutzer_id: int) -> dict | None:
    """Gibt einen Benutzer anhand seiner ID zurueck."""
    row = conn.execute("SELECT * FROM benutzer WHERE id = ?", (benutzer_id,)).fetchone()
    return _zeile_zu_dict(row) if row else None


def benutzer_aktualisieren(conn: sqlite3.Connection, benutzer_id: int, daten: dict) -> dict | None:
    """Aktualisiert einen bestehenden Benutzer."""
    felder = []
    werte = []
    for feld, spalte in [("name", "name"), ("email", "email"), ("alter", "alter_jahre"),
                          ("strasse", "strasse"), ("plz", "plz"), ("stadt", "stadt")]:
        if feld in daten:
            felder.append(f"{spalte} = ?")
            werte.append(daten[feld])

    if not felder:
        return benutzer_nach_id(conn, benutzer_id)

    werte.append(benutzer_id)
    conn.execute(f"UPDATE benutzer SET {', '.join(felder)} WHERE id = ?", werte)
    conn.commit()
    return benutzer_nach_id(conn, benutzer_id)


def benutzer_loeschen(conn: sqlite3.Connection, benutzer_id: int) -> bool:
    """Loescht einen Benutzer. Gibt True zurueck wenn erfolgreich."""
    cursor = conn.execute("DELETE FROM benutzer WHERE id = ?", (benutzer_id,))
    conn.commit()
    return cursor.rowcount > 0


def _zeile_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Datenbankzeile zu einem Dict."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "alter": row["alter_jahre"],
        "strasse": row["strasse"],
        "plz": row["plz"],
        "stadt": row["stadt"],
    }
