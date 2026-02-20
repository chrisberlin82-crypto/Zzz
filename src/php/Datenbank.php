<?php

declare(strict_types=1);

namespace Zzz;

class Datenbank
{
    private \PDO $pdo;

    public function __construct(string $dbPfad = null)
    {
        $pfad = $dbPfad ?? dirname(__DIR__, 2) . '/daten/zzz.db';
        $verzeichnis = dirname($pfad);
        if (!is_dir($verzeichnis)) {
            mkdir($verzeichnis, 0755, true);
        }

        $this->pdo = new \PDO("sqlite:{$pfad}", null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA journal_mode=WAL');
        $this->pdo->exec('PRAGMA foreign_keys=ON');
    }

    public function tabellenErstellen(): void
    {
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS benutzer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                alter_jahre INTEGER NOT NULL CHECK(alter_jahre >= 0 AND alter_jahre <= 150),
                strasse TEXT DEFAULT "",
                plz TEXT DEFAULT "",
                stadt TEXT DEFAULT "",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS verlauf (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                a REAL NOT NULL,
                b REAL NOT NULL,
                operation TEXT NOT NULL,
                ergebnis REAL NOT NULL,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS patienten (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vorname TEXT NOT NULL,
                nachname TEXT NOT NULL,
                geburtsdatum TEXT NOT NULL,
                versicherungsnummer TEXT NOT NULL UNIQUE,
                krankenkasse TEXT NOT NULL,
                telefon TEXT DEFAULT "",
                email TEXT DEFAULT "",
                strasse TEXT DEFAULT "",
                plz TEXT DEFAULT "",
                stadt TEXT DEFAULT "",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS aerzte (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titel TEXT DEFAULT "",
                vorname TEXT NOT NULL,
                nachname TEXT NOT NULL,
                fachrichtung TEXT NOT NULL,
                telefon TEXT DEFAULT "",
                email TEXT DEFAULT "",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS termine (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                arzt_id INTEGER NOT NULL,
                datum TEXT NOT NULL,
                uhrzeit TEXT NOT NULL,
                dauer_minuten INTEGER NOT NULL DEFAULT 15,
                grund TEXT DEFAULT "",
                status TEXT NOT NULL DEFAULT "geplant",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patienten(id),
                FOREIGN KEY (arzt_id) REFERENCES aerzte(id)
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS wartezimmer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                termin_id INTEGER,
                ankunft_zeit TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT "wartend",
                aufgerufen_zeit TIMESTAMP,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patienten(id),
                FOREIGN KEY (termin_id) REFERENCES termine(id)
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS agenten (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                nebenstelle TEXT NOT NULL UNIQUE,
                sip_passwort TEXT NOT NULL,
                rolle TEXT NOT NULL DEFAULT "rezeption",
                status TEXT NOT NULL DEFAULT "offline",
                warteschlange TEXT DEFAULT "rezeption",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ');
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS anrufe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anrufer_nummer TEXT NOT NULL,
                anrufer_name TEXT DEFAULT "",
                agent_id INTEGER,
                warteschlange TEXT DEFAULT "",
                typ TEXT NOT NULL DEFAULT "eingehend",
                status TEXT NOT NULL DEFAULT "klingelt",
                beginn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                angenommen TIMESTAMP,
                beendet TIMESTAMP,
                dauer_sekunden INTEGER DEFAULT 0,
                notizen TEXT DEFAULT "",
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agenten(id)
            )
        ');
    }

    // --- Benutzer ---

    public function benutzerErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO benutzer (name, email, alter_jahre, strasse, plz, stadt)
             VALUES (:name, :email, :alter, :strasse, :plz, :stadt)'
        );
        $stmt->execute([
            ':name' => $daten['name'],
            ':email' => $daten['email'],
            ':alter' => $daten['alter'],
            ':strasse' => $daten['strasse'] ?? '',
            ':plz' => $daten['plz'] ?? '',
            ':stadt' => $daten['stadt'] ?? '',
        ]);

        return $this->benutzerNachId((int) $this->pdo->lastInsertId());
    }

    public function benutzerAlle(): array
    {
        return $this->pdo->query('SELECT * FROM benutzer ORDER BY id')->fetchAll();
    }

    public function benutzerNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM benutzer WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function benutzerAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'name' => 'name', 'email' => 'email', 'alter' => 'alter_jahre',
            'strasse' => 'strasse', 'plz' => 'plz', 'stadt' => 'stadt',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->benutzerNachId($id);
        }

        $sql = 'UPDATE benutzer SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);

        return $this->benutzerNachId($id);
    }

    public function benutzerLoeschen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM benutzer WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function benutzerSuchen(string $suchbegriff): array
    {
        $like = "%{$suchbegriff}%";
        $stmt = $this->pdo->prepare(
            'SELECT * FROM benutzer WHERE name LIKE :s1 OR email LIKE :s2 OR stadt LIKE :s3 ORDER BY id'
        );
        $stmt->execute([':s1' => $like, ':s2' => $like, ':s3' => $like]);
        return $stmt->fetchAll();
    }

    // --- Patienten ---

    public function patientErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO patienten (vorname, nachname, geburtsdatum, versicherungsnummer,
             krankenkasse, telefon, email, strasse, plz, stadt)
             VALUES (:vorname, :nachname, :geburtsdatum, :vnr, :kk, :tel, :email, :str, :plz, :stadt)'
        );
        $stmt->execute([
            ':vorname' => $daten['vorname'],
            ':nachname' => $daten['nachname'],
            ':geburtsdatum' => $daten['geburtsdatum'],
            ':vnr' => $daten['versicherungsnummer'],
            ':kk' => $daten['krankenkasse'],
            ':tel' => $daten['telefon'] ?? '',
            ':email' => $daten['email'] ?? '',
            ':str' => $daten['strasse'] ?? '',
            ':plz' => $daten['plz'] ?? '',
            ':stadt' => $daten['stadt'] ?? '',
        ]);
        return $this->patientNachId((int) $this->pdo->lastInsertId());
    }

    public function patientAlle(): array
    {
        return $this->pdo->query('SELECT * FROM patienten ORDER BY nachname, vorname')->fetchAll();
    }

    public function patientNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM patienten WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function patientAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'vorname' => 'vorname', 'nachname' => 'nachname', 'geburtsdatum' => 'geburtsdatum',
            'versicherungsnummer' => 'versicherungsnummer', 'krankenkasse' => 'krankenkasse',
            'telefon' => 'telefon', 'email' => 'email',
            'strasse' => 'strasse', 'plz' => 'plz', 'stadt' => 'stadt',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->patientNachId($id);
        }

        $sql = 'UPDATE patienten SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);
        return $this->patientNachId($id);
    }

    public function patientLoeschen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM patienten WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function patientSuchen(string $suchbegriff): array
    {
        $like = "%{$suchbegriff}%";
        $stmt = $this->pdo->prepare(
            'SELECT * FROM patienten WHERE vorname LIKE :s1 OR nachname LIKE :s2
             OR versicherungsnummer LIKE :s3 OR stadt LIKE :s4 ORDER BY nachname, vorname'
        );
        $stmt->execute([':s1' => $like, ':s2' => $like, ':s3' => $like, ':s4' => $like]);
        return $stmt->fetchAll();
    }

    // --- Aerzte ---

    public function arztErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO aerzte (titel, vorname, nachname, fachrichtung, telefon, email)
             VALUES (:titel, :vorname, :nachname, :fach, :tel, :email)'
        );
        $stmt->execute([
            ':titel' => $daten['titel'] ?? '',
            ':vorname' => $daten['vorname'],
            ':nachname' => $daten['nachname'],
            ':fach' => $daten['fachrichtung'],
            ':tel' => $daten['telefon'] ?? '',
            ':email' => $daten['email'] ?? '',
        ]);
        return $this->arztNachId((int) $this->pdo->lastInsertId());
    }

    public function arztAlle(): array
    {
        return $this->pdo->query('SELECT * FROM aerzte ORDER BY nachname, vorname')->fetchAll();
    }

    public function arztNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM aerzte WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function arztAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'titel' => 'titel', 'vorname' => 'vorname', 'nachname' => 'nachname',
            'fachrichtung' => 'fachrichtung', 'telefon' => 'telefon', 'email' => 'email',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->arztNachId($id);
        }

        $sql = 'UPDATE aerzte SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);
        return $this->arztNachId($id);
    }

    public function arztLoeschen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM aerzte WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // --- Termine ---

    public function terminErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO termine (patient_id, arzt_id, datum, uhrzeit, dauer_minuten, grund, status)
             VALUES (:pid, :aid, :datum, :zeit, :dauer, :grund, :status)'
        );
        $stmt->execute([
            ':pid' => $daten['patient_id'],
            ':aid' => $daten['arzt_id'],
            ':datum' => $daten['datum'],
            ':zeit' => $daten['uhrzeit'],
            ':dauer' => $daten['dauer_minuten'] ?? 15,
            ':grund' => $daten['grund'] ?? '',
            ':status' => $daten['status'] ?? 'geplant',
        ]);
        return $this->terminNachId((int) $this->pdo->lastInsertId());
    }

    public function terminAlle(?string $datum = null): array
    {
        $sql = 'SELECT t.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
                a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
                FROM termine t
                JOIN patienten p ON t.patient_id = p.id
                JOIN aerzte a ON t.arzt_id = a.id';
        if ($datum) {
            $sql .= ' WHERE t.datum = :datum ORDER BY t.uhrzeit';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':datum' => $datum]);
        } else {
            $sql .= ' ORDER BY t.datum DESC, t.uhrzeit';
            $stmt = $this->pdo->query($sql);
        }
        return $stmt->fetchAll();
    }

    public function terminNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT t.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
             a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
             FROM termine t
             JOIN patienten p ON t.patient_id = p.id
             JOIN aerzte a ON t.arzt_id = a.id
             WHERE t.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function terminAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'patient_id' => 'patient_id', 'arzt_id' => 'arzt_id',
            'datum' => 'datum', 'uhrzeit' => 'uhrzeit',
            'dauer_minuten' => 'dauer_minuten', 'grund' => 'grund', 'status' => 'status',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->terminNachId($id);
        }

        $sql = 'UPDATE termine SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);
        return $this->terminNachId($id);
    }

    public function terminLoeschen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM termine WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // --- Wartezimmer ---

    public function wartezimmerHinzufuegen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO wartezimmer (patient_id, termin_id, status) VALUES (:pid, :tid, "wartend")'
        );
        $stmt->execute([
            ':pid' => $daten['patient_id'],
            ':tid' => $daten['termin_id'] ?? null,
        ]);
        return $this->wartezimmerNachId((int) $this->pdo->lastInsertId());
    }

    public function wartezimmerAktuelle(): array
    {
        $stmt = $this->pdo->query(
            'SELECT w.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
             t.uhrzeit AS t_uhrzeit, t.grund AS t_grund,
             a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
             FROM wartezimmer w
             JOIN patienten p ON w.patient_id = p.id
             LEFT JOIN termine t ON w.termin_id = t.id
             LEFT JOIN aerzte a ON t.arzt_id = a.id
             WHERE w.status IN ("wartend", "aufgerufen")
             ORDER BY w.ankunft_zeit'
        );
        return $stmt->fetchAll();
    }

    public function wartezimmerNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT w.*, p.vorname AS p_vorname, p.nachname AS p_nachname,
             t.uhrzeit AS t_uhrzeit, t.grund AS t_grund,
             a.titel AS a_titel, a.vorname AS a_vorname, a.nachname AS a_nachname
             FROM wartezimmer w
             JOIN patienten p ON w.patient_id = p.id
             LEFT JOIN termine t ON w.termin_id = t.id
             LEFT JOIN aerzte a ON t.arzt_id = a.id
             WHERE w.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function wartezimmerStatusAendern(int $id, string $status): ?array
    {
        if ($status === 'aufgerufen') {
            $stmt = $this->pdo->prepare(
                'UPDATE wartezimmer SET status = :status, aufgerufen_zeit = CURRENT_TIMESTAMP WHERE id = :id'
            );
        } else {
            $stmt = $this->pdo->prepare('UPDATE wartezimmer SET status = :status WHERE id = :id');
        }
        $stmt->execute([':status' => $status, ':id' => $id]);
        return $this->wartezimmerNachId($id);
    }

    public function wartezimmerEntfernen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM wartezimmer WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // --- Agenten ---

    public function agentErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO agenten (name, nebenstelle, sip_passwort, rolle, status, warteschlange)
             VALUES (:name, :nst, :pwd, :rolle, :status, :queue)'
        );
        $stmt->execute([
            ':name' => $daten['name'],
            ':nst' => $daten['nebenstelle'],
            ':pwd' => $daten['sip_passwort'],
            ':rolle' => $daten['rolle'] ?? 'rezeption',
            ':status' => $daten['status'] ?? 'offline',
            ':queue' => $daten['warteschlange'] ?? 'rezeption',
        ]);
        return $this->agentNachId((int) $this->pdo->lastInsertId());
    }

    public function agentAlle(): array
    {
        return $this->pdo->query('SELECT * FROM agenten ORDER BY name')->fetchAll();
    }

    public function agentNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM agenten WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function agentAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'name' => 'name', 'nebenstelle' => 'nebenstelle',
            'sip_passwort' => 'sip_passwort', 'rolle' => 'rolle',
            'status' => 'status', 'warteschlange' => 'warteschlange',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->agentNachId($id);
        }

        $sql = 'UPDATE agenten SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);
        return $this->agentNachId($id);
    }

    public function agentLoeschen(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM agenten WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function agentStatusSetzen(int $id, string $status): ?array
    {
        $stmt = $this->pdo->prepare('UPDATE agenten SET status = :status WHERE id = :id');
        $stmt->execute([':status' => $status, ':id' => $id]);
        return $this->agentNachId($id);
    }

    // --- Anrufe ---

    public function anrufErstellen(array $daten): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO anrufe (anrufer_nummer, anrufer_name, agent_id, warteschlange, typ, status, notizen)
             VALUES (:nr, :name, :aid, :queue, :typ, :status, :notizen)'
        );
        $stmt->execute([
            ':nr' => $daten['anrufer_nummer'],
            ':name' => $daten['anrufer_name'] ?? '',
            ':aid' => $daten['agent_id'] ?? null,
            ':queue' => $daten['warteschlange'] ?? '',
            ':typ' => $daten['typ'] ?? 'eingehend',
            ':status' => $daten['status'] ?? 'klingelt',
            ':notizen' => $daten['notizen'] ?? '',
        ]);
        return $this->anrufNachId((int) $this->pdo->lastInsertId());
    }

    public function anrufAlle(int $limit = 50): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.*, ag.name AS agent_name
             FROM anrufe a
             LEFT JOIN agenten ag ON a.agent_id = ag.id
             ORDER BY a.beginn DESC LIMIT :limit'
        );
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function anrufNachId(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.*, ag.name AS agent_name
             FROM anrufe a
             LEFT JOIN agenten ag ON a.agent_id = ag.id
             WHERE a.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function anrufAktualisieren(int $id, array $daten): ?array
    {
        $felder = [];
        $werte = [':id' => $id];
        $zuordnung = [
            'anrufer_nummer' => 'anrufer_nummer', 'anrufer_name' => 'anrufer_name',
            'agent_id' => 'agent_id', 'warteschlange' => 'warteschlange',
            'typ' => 'typ', 'status' => 'status',
            'angenommen' => 'angenommen', 'beendet' => 'beendet',
            'dauer_sekunden' => 'dauer_sekunden', 'notizen' => 'notizen',
        ];

        foreach ($zuordnung as $eingabe => $spalte) {
            if (isset($daten[$eingabe])) {
                $felder[] = "{$spalte} = :{$eingabe}";
                $werte[":{$eingabe}"] = $daten[$eingabe];
            }
        }

        if (empty($felder)) {
            return $this->anrufNachId($id);
        }

        $sql = 'UPDATE anrufe SET ' . implode(', ', $felder) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($werte);
        return $this->anrufNachId($id);
    }

    public function anrufAktive(): array
    {
        $stmt = $this->pdo->query(
            "SELECT a.*, ag.name AS agent_name
             FROM anrufe a
             LEFT JOIN agenten ag ON a.agent_id = ag.id
             WHERE a.status IN ('klingelt', 'verbunden', 'warteschlange')
             ORDER BY a.beginn DESC"
        );
        return $stmt->fetchAll();
    }

    // --- Verlauf ---

    public function berechnungSpeichern(float $a, float $b, string $operation, float $ergebnis): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO verlauf (a, b, operation, ergebnis) VALUES (:a, :b, :op, :erg)'
        );
        $stmt->execute([':a' => $a, ':b' => $b, ':op' => $operation, ':erg' => $ergebnis]);

        $id = (int) $this->pdo->lastInsertId();
        $row = $this->pdo->prepare('SELECT * FROM verlauf WHERE id = :id');
        $row->execute([':id' => $id]);
        return $row->fetch();
    }

    public function verlaufLaden(int $limit = 20): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM verlauf ORDER BY id DESC LIMIT :limit');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function verlaufLoeschen(): int
    {
        $stmt = $this->pdo->exec('DELETE FROM verlauf');
        return (int) $stmt;
    }

    // --- Format-Helfer ---

    public static function verlaufFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'a' => (float) $row['a'],
            'b' => (float) $row['b'],
            'operation' => $row['operation'],
            'ergebnis' => (float) $row['ergebnis'],
            'erstellt_am' => $row['erstellt_am'],
        ];
    }

    public static function zeilenFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'alter' => (int) $row['alter_jahre'],
            'strasse' => $row['strasse'],
            'plz' => $row['plz'],
            'stadt' => $row['stadt'],
        ];
    }

    public static function patientFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'vorname' => $row['vorname'],
            'nachname' => $row['nachname'],
            'geburtsdatum' => $row['geburtsdatum'],
            'versicherungsnummer' => $row['versicherungsnummer'],
            'krankenkasse' => $row['krankenkasse'],
            'telefon' => $row['telefon'],
            'email' => $row['email'],
            'strasse' => $row['strasse'],
            'plz' => $row['plz'],
            'stadt' => $row['stadt'],
        ];
    }

    public static function arztFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'titel' => $row['titel'],
            'vorname' => $row['vorname'],
            'nachname' => $row['nachname'],
            'fachrichtung' => $row['fachrichtung'],
            'telefon' => $row['telefon'],
            'email' => $row['email'],
        ];
    }

    public static function terminFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'patient_id' => (int) $row['patient_id'],
            'arzt_id' => (int) $row['arzt_id'],
            'datum' => $row['datum'],
            'uhrzeit' => $row['uhrzeit'],
            'dauer_minuten' => (int) $row['dauer_minuten'],
            'grund' => $row['grund'],
            'status' => $row['status'],
            'patient_name' => $row['p_vorname'] . ' ' . $row['p_nachname'],
            'arzt_name' => trim(($row['a_titel'] ?? '') . ' ' . $row['a_vorname'] . ' ' . $row['a_nachname']),
        ];
    }

    public static function wartezimmerFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'patient_id' => (int) $row['patient_id'],
            'termin_id' => $row['termin_id'] ? (int) $row['termin_id'] : null,
            'ankunft_zeit' => $row['ankunft_zeit'],
            'status' => $row['status'],
            'aufgerufen_zeit' => $row['aufgerufen_zeit'],
            'patient_name' => $row['p_vorname'] . ' ' . $row['p_nachname'],
            'termin_uhrzeit' => $row['t_uhrzeit'] ?? null,
            'termin_grund' => $row['t_grund'] ?? null,
            'arzt_name' => isset($row['a_vorname']) && $row['a_vorname']
                ? trim(($row['a_titel'] ?? '') . ' ' . $row['a_vorname'] . ' ' . $row['a_nachname'])
                : null,
        ];
    }

    public static function agentFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'nebenstelle' => $row['nebenstelle'],
            'sip_passwort' => $row['sip_passwort'],
            'rolle' => $row['rolle'],
            'status' => $row['status'],
            'warteschlange' => $row['warteschlange'],
            'erstellt_am' => $row['erstellt_am'],
        ];
    }

    public static function anrufFormat(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'anrufer_nummer' => $row['anrufer_nummer'],
            'anrufer_name' => $row['anrufer_name'],
            'agent_id' => $row['agent_id'] ? (int) $row['agent_id'] : null,
            'agent_name' => $row['agent_name'] ?? null,
            'warteschlange' => $row['warteschlange'],
            'typ' => $row['typ'],
            'status' => $row['status'],
            'beginn' => $row['beginn'],
            'angenommen' => $row['angenommen'],
            'beendet' => $row['beendet'],
            'dauer_sekunden' => (int) $row['dauer_sekunden'],
            'notizen' => $row['notizen'],
            'erstellt_am' => $row['erstellt_am'],
        ];
    }
}
