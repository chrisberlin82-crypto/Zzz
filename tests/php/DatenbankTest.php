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

    // --- Suchen ---

    public function testBenutzerSuchenNachName(): void
    {
        $this->db->benutzerErstellen(['name' => 'Max Mueller', 'email' => 'max@t.de', 'alter' => 30]);
        $this->db->benutzerErstellen(['name' => 'Anna Meier', 'email' => 'anna@t.de', 'alter' => 25]);
        $ergebnis = $this->db->benutzerSuchen('Max');
        $this->assertCount(1, $ergebnis);
        $this->assertSame('Max Mueller', $ergebnis[0]['name']);
    }

    public function testBenutzerSuchenNachEmail(): void
    {
        $this->db->benutzerErstellen(['name' => 'Max', 'email' => 'max@beispiel.de', 'alter' => 30]);
        $ergebnis = $this->db->benutzerSuchen('beispiel');
        $this->assertCount(1, $ergebnis);
    }

    public function testBenutzerSuchenNachStadt(): void
    {
        $this->db->benutzerErstellen(['name' => 'Max', 'email' => 'max@t.de', 'alter' => 30, 'stadt' => 'Berlin']);
        $this->db->benutzerErstellen(['name' => 'Anna', 'email' => 'anna@t.de', 'alter' => 25, 'stadt' => 'Hamburg']);
        $ergebnis = $this->db->benutzerSuchen('Berlin');
        $this->assertCount(1, $ergebnis);
        $this->assertSame('Berlin', $ergebnis[0]['stadt']);
    }

    public function testBenutzerSuchenOhneTreffer(): void
    {
        $this->db->benutzerErstellen($this->beispielBenutzer());
        $ergebnis = $this->db->benutzerSuchen('xyz_nicht_vorhanden');
        $this->assertEmpty($ergebnis);
    }

    // --- Berechnung speichern ---

    public function testBerechnungSpeichern(): void
    {
        $eintrag = $this->db->berechnungSpeichern(2.0, 3.0, 'addieren', 5.0);
        $this->assertArrayHasKey('id', $eintrag);
        $this->assertEquals(2.0, $eintrag['a']);
        $this->assertEquals(3.0, $eintrag['b']);
        $this->assertSame('addieren', $eintrag['operation']);
        $this->assertEquals(5.0, $eintrag['ergebnis']);
    }

    // --- Verlauf laden ---

    public function testVerlaufLadenLeer(): void
    {
        $this->assertEmpty($this->db->verlaufLaden());
    }

    public function testVerlaufLadenReihenfolge(): void
    {
        $this->db->berechnungSpeichern(1.0, 1.0, 'addieren', 2.0);
        $this->db->berechnungSpeichern(2.0, 2.0, 'addieren', 4.0);
        $eintraege = $this->db->verlaufLaden();
        $this->assertCount(2, $eintraege);
        $this->assertEquals(4.0, $eintraege[0]['ergebnis']); // neuester zuerst
    }

    public function testVerlaufLadenLimit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->db->berechnungSpeichern((float) $i, 1.0, 'addieren', (float) ($i + 1));
        }
        $eintraege = $this->db->verlaufLaden(3);
        $this->assertCount(3, $eintraege);
    }

    // --- Verlauf loeschen ---

    public function testVerlaufLoeschen(): void
    {
        $this->db->berechnungSpeichern(1.0, 2.0, 'addieren', 3.0);
        $this->db->berechnungSpeichern(3.0, 4.0, 'addieren', 7.0);
        $anzahl = $this->db->verlaufLoeschen();
        $this->assertSame(2, $anzahl);
        $this->assertEmpty($this->db->verlaufLaden());
    }

    public function testVerlaufLoeschenLeer(): void
    {
        $anzahl = $this->db->verlaufLoeschen();
        $this->assertSame(0, $anzahl);
    }

    // --- Verlauf-Format ---

    public function testVerlaufFormat(): void
    {
        $row = [
            'id' => 1, 'a' => 2.0, 'b' => 3.0,
            'operation' => 'addieren', 'ergebnis' => 5.0,
            'erstellt_am' => '2026-01-01 00:00:00',
        ];
        $formatted = Datenbank::verlaufFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertEquals(2.0, $formatted['a']);
        $this->assertSame('addieren', $formatted['operation']);
        $this->assertArrayHasKey('erstellt_am', $formatted);
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
