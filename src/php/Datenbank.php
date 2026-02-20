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
    }

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

    /**
     * Formatiert eine DB-Zeile fuer die API-Ausgabe.
     */
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
}
