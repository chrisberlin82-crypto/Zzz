<?php

declare(strict_types=1);

namespace Zzz\Tests;

use PHPUnit\Framework\TestCase;
use Zzz\Datenbank;

class DatenbankTest extends TestCase
{
    private Datenbank $db;
    private string $dbPfad;

    protected function setUp(): void
    {
        $this->dbPfad = tempnam(sys_get_temp_dir(), 'zzz_test_') . '.db';
        $this->db = new Datenbank($this->dbPfad);
        $this->db->tabellenErstellen();
    }

    protected function tearDown(): void
    {
        if (file_exists($this->dbPfad)) {
            unlink($this->dbPfad);
        }
    }

    private function beispielBenutzer(): array
    {
        return ['name' => 'Max Mustermann', 'email' => 'max@beispiel.de', 'alter' => 30];
    }

    // --- Erstellen ---

    public function testBenutzerErstellen(): void
    {
        $benutzer = $this->db->benutzerErstellen($this->beispielBenutzer());
        $this->assertArrayHasKey('id', $benutzer);
        $this->assertSame('Max Mustermann', $benutzer['name']);
        $this->assertSame('max@beispiel.de', $benutzer['email']);
    }

    public function testBenutzerErstellenMitAdresse(): void
    {
        $daten = [
            'name' => 'Anna', 'email' => 'anna@test.de', 'alter' => 25,
            'strasse' => 'Hauptstr. 1', 'plz' => '10115', 'stadt' => 'Berlin',
        ];
        $benutzer = $this->db->benutzerErstellen($daten);
        $this->assertSame('Berlin', $benutzer['stadt']);
        $this->assertSame('10115', $benutzer['plz']);
    }

    public function testDoppelteEmailWirftFehler(): void
    {
        $this->expectException(\PDOException::class);
        $this->db->benutzerErstellen($this->beispielBenutzer());
        $this->db->benutzerErstellen($this->beispielBenutzer());
    }

    // --- Alle ---

    public function testBenutzerAlleLeer(): void
    {
        $this->assertEmpty($this->db->benutzerAlle());
    }

    public function testBenutzerAlleMehrere(): void
    {
        $this->db->benutzerErstellen(['name' => 'A', 'email' => 'a@t.de', 'alter' => 20]);
        $this->db->benutzerErstellen(['name' => 'B', 'email' => 'b@t.de', 'alter' => 30]);
        $alle = $this->db->benutzerAlle();
        $this->assertCount(2, $alle);
    }

    // --- Nach ID ---

    public function testBenutzerNachIdExistiert(): void
    {
        $erstellt = $this->db->benutzerErstellen($this->beispielBenutzer());
        $gefunden = $this->db->benutzerNachId((int) $erstellt['id']);
        $this->assertSame('Max Mustermann', $gefunden['name']);
    }

    public function testBenutzerNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->benutzerNachId(999));
    }

    // --- Aktualisieren ---

    public function testBenutzerAktualisierenName(): void
    {
        $erstellt = $this->db->benutzerErstellen($this->beispielBenutzer());
        $aktualisiert = $this->db->benutzerAktualisieren((int) $erstellt['id'], ['name' => 'Moritz']);
        $this->assertSame('Moritz', $aktualisiert['name']);
        $this->assertSame('max@beispiel.de', $aktualisiert['email']);
    }

    public function testBenutzerAktualisierenEmail(): void
    {
        $erstellt = $this->db->benutzerErstellen($this->beispielBenutzer());
        $aktualisiert = $this->db->benutzerAktualisieren((int) $erstellt['id'], ['email' => 'neu@test.de']);
        $this->assertSame('neu@test.de', $aktualisiert['email']);
    }

    public function testBenutzerAktualisierenLeer(): void
    {
        $erstellt = $this->db->benutzerErstellen($this->beispielBenutzer());
        $aktualisiert = $this->db->benutzerAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('Max Mustermann', $aktualisiert['name']);
    }

    // --- Loeschen ---

    public function testBenutzerLoeschen(): void
    {
        $erstellt = $this->db->benutzerErstellen($this->beispielBenutzer());
        $this->assertTrue($this->db->benutzerLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->benutzerNachId((int) $erstellt['id']));
    }

    public function testBenutzerLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->benutzerLoeschen(999));
    }

    // --- Zeilen-Format ---

    public function testZeilenFormat(): void
    {
        $row = [
            'id' => 1, 'name' => 'Max', 'email' => 'max@t.de',
            'alter_jahre' => 30, 'strasse' => '', 'plz' => '', 'stadt' => '',
        ];
        $formatted = Datenbank::zeilenFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame(30, $formatted['alter']);
        $this->assertArrayNotHasKey('alter_jahre', $formatted);
    }
}
