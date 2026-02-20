"""SQLite-Datenbankschicht fuer MED Rezeption."""

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
    conn.execute("""
        CREATE TABLE IF NOT EXISTS verlauf (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            a REAL NOT NULL,
            b REAL NOT NULL,
            operation TEXT NOT NULL,
            ergebnis REAL NOT NULL,
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS patienten (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vorname TEXT NOT NULL,
            nachname TEXT NOT NULL,
            geburtsdatum TEXT NOT NULL,
            versicherungsnummer TEXT NOT NULL UNIQUE,
            krankenkasse TEXT NOT NULL,
            telefon TEXT DEFAULT '',
            email TEXT DEFAULT '',
            strasse TEXT DEFAULT '',
            plz TEXT DEFAULT '',
            stadt TEXT DEFAULT '',
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS aerzte (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titel TEXT DEFAULT '',
            vorname TEXT NOT NULL,
            nachname TEXT NOT NULL,
            fachrichtung TEXT NOT NULL,
            telefon TEXT DEFAULT '',
            email TEXT DEFAULT '',
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS termine (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            arzt_id INTEGER NOT NULL,
            datum TEXT NOT NULL,
            uhrzeit TEXT NOT NULL,
            dauer_minuten INTEGER NOT NULL DEFAULT 15,
            grund TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'geplant',
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patienten(id),
            FOREIGN KEY (arzt_id) REFERENCES aerzte(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS wartezimmer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            termin_id INTEGER,
            ankunft_zeit TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'wartend',
            aufgerufen_zeit TIMESTAMP,
            erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patienten(id),
            FOREIGN KEY (termin_id) REFERENCES termine(id)
        )
    """)
    conn.commit()


# --- Benutzer ---

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


def benutzer_suchen(conn: sqlite3.Connection, suchbegriff: str) -> list[dict]:
    """Sucht Benutzer nach Name, Email oder Stadt."""
    like = f"%{suchbegriff}%"
    rows = conn.execute(
        "SELECT * FROM benutzer WHERE name LIKE ? OR email LIKE ? OR stadt LIKE ? ORDER BY id",
        (like, like, like),
    ).fetchall()
    return [_zeile_zu_dict(r) for r in rows]


# --- Patienten ---

def patient_erstellen(conn: sqlite3.Connection, daten: dict) -> dict:
    """Erstellt einen neuen Patienten."""
    cursor = conn.execute(
        """INSERT INTO patienten (vorname, nachname, geburtsdatum, versicherungsnummer,
           krankenkasse, telefon, email, strasse, plz, stadt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            daten["vorname"], daten["nachname"], daten["geburtsdatum"],
            daten["versicherungsnummer"], daten["krankenkasse"],
            daten.get("telefon", ""), daten.get("email", ""),
            daten.get("strasse", ""), daten.get("plz", ""), daten.get("stadt", ""),
        ),
    )
    conn.commit()
    return patient_nach_id(conn, cursor.lastrowid)


def patient_alle(conn: sqlite3.Connection) -> list[dict]:
    """Gibt alle Patienten zurueck."""
    rows = conn.execute("SELECT * FROM patienten ORDER BY nachname, vorname").fetchall()
    return [_patient_zu_dict(r) for r in rows]


def patient_nach_id(conn: sqlite3.Connection, patient_id: int) -> dict | None:
    """Gibt einen Patienten anhand seiner ID zurueck."""
    row = conn.execute("SELECT * FROM patienten WHERE id = ?", (patient_id,)).fetchone()
    return _patient_zu_dict(row) if row else None


def patient_aktualisieren(conn: sqlite3.Connection, patient_id: int, daten: dict) -> dict | None:
    """Aktualisiert einen bestehenden Patienten."""
    felder = []
    werte = []
    for feld, spalte in [
        ("vorname", "vorname"), ("nachname", "nachname"), ("geburtsdatum", "geburtsdatum"),
        ("versicherungsnummer", "versicherungsnummer"), ("krankenkasse", "krankenkasse"),
        ("telefon", "telefon"), ("email", "email"),
        ("strasse", "strasse"), ("plz", "plz"), ("stadt", "stadt"),
    ]:
        if feld in daten:
            felder.append(f"{spalte} = ?")
            werte.append(daten[feld])

    if not felder:
        return patient_nach_id(conn, patient_id)

    werte.append(patient_id)
    conn.execute(f"UPDATE patienten SET {', '.join(felder)} WHERE id = ?", werte)
    conn.commit()
    return patient_nach_id(conn, patient_id)


def patient_loeschen(conn: sqlite3.Connection, patient_id: int) -> bool:
    """Loescht einen Patienten."""
    cursor = conn.execute("DELETE FROM patienten WHERE id = ?", (patient_id,))
    conn.commit()
    return cursor.rowcount > 0


def patient_suchen(conn: sqlite3.Connection, suchbegriff: str) -> list[dict]:
    """Sucht Patienten nach Name, Versicherungsnummer oder Stadt."""
    like = f"%{suchbegriff}%"
    rows = conn.execute(
        """SELECT * FROM patienten
           WHERE vorname LIKE ? OR nachname LIKE ? OR versicherungsnummer LIKE ? OR stadt LIKE ?
           ORDER BY nachname, vorname""",
        (like, like, like, like),
    ).fetchall()
    return [_patient_zu_dict(r) for r in rows]


# --- Aerzte ---

def arzt_erstellen(conn: sqlite3.Connection, daten: dict) -> dict:
    """Erstellt einen neuen Arzt."""
    cursor = conn.execute(
        """INSERT INTO aerzte (titel, vorname, nachname, fachrichtung, telefon, email)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            daten.get("titel", ""), daten["vorname"], daten["nachname"],
            daten["fachrichtung"], daten.get("telefon", ""), daten.get("email", ""),
        ),
    )
    conn.commit()
    return arzt_nach_id(conn, cursor.lastrowid)


def arzt_alle(conn: sqlite3.Connection) -> list[dict]:
    """Gibt alle Aerzte zurueck."""
    rows = conn.execute("SELECT * FROM aerzte ORDER BY nachname, vorname").fetchall()
    return [_arzt_zu_dict(r) for r in rows]


def arzt_nach_id(conn: sqlite3.Connection, arzt_id: int) -> dict | None:
    """Gibt einen Arzt anhand seiner ID zurueck."""
    row = conn.execute("SELECT * FROM aerzte WHERE id = ?", (arzt_id,)).fetchone()
    return _arzt_zu_dict(row) if row else None


def arzt_aktualisieren(conn: sqlite3.Connection, arzt_id: int, daten: dict) -> dict | None:
    """Aktualisiert einen bestehenden Arzt."""
    felder = []
    werte = []
    for feld, spalte in [
        ("titel", "titel"), ("vorname", "vorname"), ("nachname", "nachname"),
        ("fachrichtung", "fachrichtung"), ("telefon", "telefon"), ("email", "email"),
    ]:
        if feld in daten:
            felder.append(f"{spalte} = ?")
            werte.append(daten[feld])

    if not felder:
        return arzt_nach_id(conn, arzt_id)

    werte.append(arzt_id)
    conn.execute(f"UPDATE aerzte SET {', '.join(felder)} WHERE id = ?", werte)
    conn.commit()
    return arzt_nach_id(conn, arzt_id)


def arzt_loeschen(conn: sqlite3.Connection, arzt_id: int) -> bool:
    """Loescht einen Arzt."""
    cursor = conn.execute("DELETE FROM aerzte WHERE id = ?", (arzt_id,))
    conn.commit()
    return cursor.rowcount > 0


# --- Termine ---

def termin_erstellen(conn: sqlite3.Connection, daten: dict) -> dict:
    """Erstellt einen neuen Termin."""
    cursor = conn.execute(
        """INSERT INTO termine (patient_id, arzt_id, datum, uhrzeit, dauer_minuten, grund, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            daten["patient_id"], daten["arzt_id"], daten["datum"], daten["uhrzeit"],
            daten.get("dauer_minuten", 15), daten.get("grund", ""),
            daten.get("status", "geplant"),
        ),
    )
    conn.commit()
    return termin_nach_id(conn, cursor.lastrowid)


def termin_alle(conn: sqlite3.Connection, datum: str = None) -> list[dict]:
    """Gibt alle Termine zurueck, optional gefiltert nach Datum."""
    if datum:
        rows = conn.execute(
            """SELECT t.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                      a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
               FROM termine t
               JOIN patienten p ON t.patient_id = p.id
               JOIN aerzte a ON t.arzt_id = a.id
               WHERE t.datum = ? ORDER BY t.uhrzeit""",
            (datum,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT t.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                      a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
               FROM termine t
               JOIN patienten p ON t.patient_id = p.id
               JOIN aerzte a ON t.arzt_id = a.id
               ORDER BY t.datum DESC, t.uhrzeit""",
        ).fetchall()
    return [_termin_zu_dict(r) for r in rows]


def termin_nach_id(conn: sqlite3.Connection, termin_id: int) -> dict | None:
    """Gibt einen Termin anhand seiner ID zurueck."""
    row = conn.execute(
        """SELECT t.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                  a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
           FROM termine t
           JOIN patienten p ON t.patient_id = p.id
           JOIN aerzte a ON t.arzt_id = a.id
           WHERE t.id = ?""",
        (termin_id,),
    ).fetchone()
    return _termin_zu_dict(row) if row else None


def termin_aktualisieren(conn: sqlite3.Connection, termin_id: int, daten: dict) -> dict | None:
    """Aktualisiert einen bestehenden Termin."""
    felder = []
    werte = []
    for feld, spalte in [
        ("patient_id", "patient_id"), ("arzt_id", "arzt_id"),
        ("datum", "datum"), ("uhrzeit", "uhrzeit"),
        ("dauer_minuten", "dauer_minuten"), ("grund", "grund"), ("status", "status"),
    ]:
        if feld in daten:
            felder.append(f"{spalte} = ?")
            werte.append(daten[feld])

    if not felder:
        return termin_nach_id(conn, termin_id)

    werte.append(termin_id)
    conn.execute(f"UPDATE termine SET {', '.join(felder)} WHERE id = ?", werte)
    conn.commit()
    return termin_nach_id(conn, termin_id)


def termin_loeschen(conn: sqlite3.Connection, termin_id: int) -> bool:
    """Loescht einen Termin."""
    cursor = conn.execute("DELETE FROM termine WHERE id = ?", (termin_id,))
    conn.commit()
    return cursor.rowcount > 0


# --- Wartezimmer ---

def wartezimmer_hinzufuegen(conn: sqlite3.Connection, daten: dict) -> dict:
    """Fuegt einen Patienten zum Wartezimmer hinzu (Check-in)."""
    cursor = conn.execute(
        """INSERT INTO wartezimmer (patient_id, termin_id, status)
           VALUES (?, ?, 'wartend')""",
        (daten["patient_id"], daten.get("termin_id")),
    )
    conn.commit()
    return wartezimmer_nach_id(conn, cursor.lastrowid)


def wartezimmer_aktuelle(conn: sqlite3.Connection) -> list[dict]:
    """Gibt alle aktuell wartenden Patienten zurueck."""
    rows = conn.execute(
        """SELECT w.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                  t.uhrzeit AS t_uhrzeit, t.grund AS t_grund,
                  a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
           FROM wartezimmer w
           JOIN patienten p ON w.patient_id = p.id
           LEFT JOIN termine t ON w.termin_id = t.id
           LEFT JOIN aerzte a ON t.arzt_id = a.id
           WHERE w.status IN ('wartend', 'aufgerufen')
           ORDER BY w.ankunft_zeit""",
    ).fetchall()
    return [_wartezimmer_zu_dict(r) for r in rows]


def wartezimmer_nach_id(conn: sqlite3.Connection, eintrag_id: int) -> dict | None:
    """Gibt einen Wartezimmer-Eintrag zurueck."""
    row = conn.execute(
        """SELECT w.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                  t.uhrzeit AS t_uhrzeit, t.grund AS t_grund,
                  a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
           FROM wartezimmer w
           JOIN patienten p ON w.patient_id = p.id
           LEFT JOIN termine t ON w.termin_id = t.id
           LEFT JOIN aerzte a ON t.arzt_id = a.id
           WHERE w.id = ?""",
        (eintrag_id,),
    ).fetchone()
    return _wartezimmer_zu_dict(row) if row else None


def wartezimmer_status_aendern(conn: sqlite3.Connection, eintrag_id: int, neuer_status: str) -> dict | None:
    """Aendert den Status eines Wartezimmer-Eintrags."""
    if neuer_status == "aufgerufen":
        conn.execute(
            "UPDATE wartezimmer SET status = ?, aufgerufen_zeit = CURRENT_TIMESTAMP WHERE id = ?",
            (neuer_status, eintrag_id),
        )
    else:
        conn.execute("UPDATE wartezimmer SET status = ? WHERE id = ?", (neuer_status, eintrag_id))
    conn.commit()
    return wartezimmer_nach_id(conn, eintrag_id)


def wartezimmer_entfernen(conn: sqlite3.Connection, eintrag_id: int) -> bool:
    """Entfernt einen Eintrag aus dem Wartezimmer."""
    cursor = conn.execute("DELETE FROM wartezimmer WHERE id = ?", (eintrag_id,))
    conn.commit()
    return cursor.rowcount > 0


# --- Verlauf ---

def berechnung_speichern(conn: sqlite3.Connection, a: float, b: float, operation: str, ergebnis: float) -> dict:
    """Speichert eine Berechnung in der Datenbank."""
    cursor = conn.execute(
        "INSERT INTO verlauf (a, b, operation, ergebnis) VALUES (?, ?, ?, ?)",
        (a, b, operation, ergebnis),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM verlauf WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _verlauf_zu_dict(row)


def verlauf_laden(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    """Gibt die letzten Berechnungen zurueck."""
    rows = conn.execute(
        "SELECT * FROM verlauf ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    return [_verlauf_zu_dict(r) for r in rows]


def verlauf_loeschen(conn: sqlite3.Connection) -> int:
    """Loescht den gesamten Verlauf. Gibt Anzahl geloeschter Eintraege zurueck."""
    cursor = conn.execute("DELETE FROM verlauf")
    conn.commit()
    return cursor.rowcount


# --- Konverter ---

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


def _patient_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Patientenzeile zu einem Dict."""
    return {
        "id": row["id"],
        "vorname": row["vorname"],
        "nachname": row["nachname"],
        "geburtsdatum": row["geburtsdatum"],
        "versicherungsnummer": row["versicherungsnummer"],
        "krankenkasse": row["krankenkasse"],
        "telefon": row["telefon"],
        "email": row["email"],
        "strasse": row["strasse"],
        "plz": row["plz"],
        "stadt": row["stadt"],
    }


def _arzt_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Arztzeile zu einem Dict."""
    return {
        "id": row["id"],
        "titel": row["titel"],
        "vorname": row["vorname"],
        "nachname": row["nachname"],
        "fachrichtung": row["fachrichtung"],
        "telefon": row["telefon"],
        "email": row["email"],
    }


def _termin_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Terminzeile zu einem Dict."""
    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "arzt_id": row["arzt_id"],
        "datum": row["datum"],
        "uhrzeit": row["uhrzeit"],
        "dauer_minuten": row["dauer_minuten"],
        "grund": row["grund"],
        "status": row["status"],
        "patient_name": f"{row['p_vorname']} {row['p_nachname']}",
        "arzt_name": f"{row['a_titel']} {row['a_vorname']} {row['a_nachname']}".strip(),
    }


def _wartezimmer_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Wartezimmerzeile zu einem Dict."""
    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "termin_id": row["termin_id"],
        "ankunft_zeit": row["ankunft_zeit"],
        "status": row["status"],
        "aufgerufen_zeit": row["aufgerufen_zeit"],
        "patient_name": f"{row['p_vorname']} {row['p_nachname']}",
        "termin_uhrzeit": row["t_uhrzeit"],
        "termin_grund": row["t_grund"],
        "arzt_name": f"{row['a_titel']} {row['a_vorname']} {row['a_nachname']}".strip() if row["a_vorname"] else None,
    }


def _verlauf_zu_dict(row: sqlite3.Row) -> dict:
    """Konvertiert eine Verlaufszeile zu einem Dict."""
    return {
        "id": row["id"],
        "a": row["a"],
        "b": row["b"],
        "operation": row["operation"],
        "ergebnis": row["ergebnis"],
        "erstellt_am": row["erstellt_am"],
    }
