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

    // ============================================================
    // --- Patienten ---
    // ============================================================

    private function beispielPatient(): array
    {
        return [
            'vorname' => 'Max',
            'nachname' => 'Mustermann',
            'geburtsdatum' => '1990-05-15',
            'versicherungsnummer' => 'A123456789',
            'krankenkasse' => 'AOK',
        ];
    }

    public function testPatientErstellen(): void
    {
        $patient = $this->db->patientErstellen($this->beispielPatient());
        $this->assertArrayHasKey('id', $patient);
        $this->assertSame('Max', $patient['vorname']);
        $this->assertSame('Mustermann', $patient['nachname']);
        $this->assertSame('1990-05-15', $patient['geburtsdatum']);
        $this->assertSame('A123456789', $patient['versicherungsnummer']);
        $this->assertSame('AOK', $patient['krankenkasse']);
    }

    public function testPatientErstellenMitKontakt(): void
    {
        $daten = array_merge($this->beispielPatient(), [
            'telefon' => '+4930123456',
            'email' => 'max@test.de',
            'strasse' => 'Hauptstr. 1',
            'plz' => '10115',
            'stadt' => 'Berlin',
        ]);
        $patient = $this->db->patientErstellen($daten);
        $this->assertSame('+4930123456', $patient['telefon']);
        $this->assertSame('max@test.de', $patient['email']);
        $this->assertSame('Berlin', $patient['stadt']);
    }

    public function testDoppelteVersicherungsnummerWirftFehler(): void
    {
        $this->expectException(\PDOException::class);
        $this->db->patientErstellen($this->beispielPatient());
        $this->db->patientErstellen($this->beispielPatient());
    }

    public function testPatientAlleLeer(): void
    {
        $this->assertEmpty($this->db->patientAlle());
    }

    public function testPatientAlleMehrere(): void
    {
        $this->db->patientErstellen($this->beispielPatient());
        $p2 = $this->beispielPatient();
        $p2['versicherungsnummer'] = 'B999';
        $p2['nachname'] = 'Meier';
        $this->db->patientErstellen($p2);
        $alle = $this->db->patientAlle();
        $this->assertCount(2, $alle);
    }

    public function testPatientAlleNachNameSortiert(): void
    {
        $p1 = $this->beispielPatient();
        $p1['nachname'] = 'Zander';
        $this->db->patientErstellen($p1);

        $p2 = $this->beispielPatient();
        $p2['versicherungsnummer'] = 'B999';
        $p2['nachname'] = 'Albrecht';
        $this->db->patientErstellen($p2);

        $alle = $this->db->patientAlle();
        $this->assertSame('Albrecht', $alle[0]['nachname']);
        $this->assertSame('Zander', $alle[1]['nachname']);
    }

    public function testPatientNachIdExistiert(): void
    {
        $erstellt = $this->db->patientErstellen($this->beispielPatient());
        $gefunden = $this->db->patientNachId((int) $erstellt['id']);
        $this->assertSame('Max', $gefunden['vorname']);
    }

    public function testPatientNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->patientNachId(999));
    }

    public function testPatientAktualisieren(): void
    {
        $erstellt = $this->db->patientErstellen($this->beispielPatient());
        $aktualisiert = $this->db->patientAktualisieren((int) $erstellt['id'], [
            'vorname' => 'Moritz',
            'krankenkasse' => 'TK',
        ]);
        $this->assertSame('Moritz', $aktualisiert['vorname']);
        $this->assertSame('TK', $aktualisiert['krankenkasse']);
        $this->assertSame('Mustermann', $aktualisiert['nachname']);
    }

    public function testPatientAktualisierenLeer(): void
    {
        $erstellt = $this->db->patientErstellen($this->beispielPatient());
        $aktualisiert = $this->db->patientAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('Max', $aktualisiert['vorname']);
    }

    public function testPatientLoeschen(): void
    {
        $erstellt = $this->db->patientErstellen($this->beispielPatient());
        $this->assertTrue($this->db->patientLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->patientNachId((int) $erstellt['id']));
    }

    public function testPatientLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->patientLoeschen(999));
    }

    public function testPatientSuchenNachName(): void
    {
        $this->db->patientErstellen($this->beispielPatient());
        $p2 = $this->beispielPatient();
        $p2['versicherungsnummer'] = 'B999';
        $p2['vorname'] = 'Anna';
        $p2['nachname'] = 'Meier';
        $this->db->patientErstellen($p2);

        $ergebnis = $this->db->patientSuchen('Mustermann');
        $this->assertCount(1, $ergebnis);
        $this->assertSame('Mustermann', $ergebnis[0]['nachname']);
    }

    public function testPatientSuchenNachVersicherungsnummer(): void
    {
        $this->db->patientErstellen($this->beispielPatient());
        $ergebnis = $this->db->patientSuchen('A123456');
        $this->assertCount(1, $ergebnis);
    }

    public function testPatientSuchenOhneTreffer(): void
    {
        $this->db->patientErstellen($this->beispielPatient());
        $this->assertEmpty($this->db->patientSuchen('xyz_unbekannt'));
    }

    public function testPatientFormat(): void
    {
        $row = [
            'id' => 1, 'vorname' => 'Max', 'nachname' => 'Mustermann',
            'geburtsdatum' => '1990-05-15', 'versicherungsnummer' => 'A123',
            'krankenkasse' => 'AOK', 'telefon' => '', 'email' => '',
            'strasse' => '', 'plz' => '', 'stadt' => '',
        ];
        $formatted = Datenbank::patientFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame('Max', $formatted['vorname']);
        $this->assertSame('AOK', $formatted['krankenkasse']);
    }

    // ============================================================
    // --- Aerzte ---
    // ============================================================

    private function beispielArzt(): array
    {
        return [
            'vorname' => 'Hans',
            'nachname' => 'Schmidt',
            'fachrichtung' => 'Allgemeinmedizin',
        ];
    }

    public function testArztErstellen(): void
    {
        $arzt = $this->db->arztErstellen($this->beispielArzt());
        $this->assertArrayHasKey('id', $arzt);
        $this->assertSame('Hans', $arzt['vorname']);
        $this->assertSame('Schmidt', $arzt['nachname']);
        $this->assertSame('Allgemeinmedizin', $arzt['fachrichtung']);
        $this->assertSame('', $arzt['titel']);
    }

    public function testArztErstellenMitTitel(): void
    {
        $daten = array_merge($this->beispielArzt(), [
            'titel' => 'Dr. med.',
            'telefon' => '+4930111',
            'email' => 'dr.schmidt@praxis.de',
        ]);
        $arzt = $this->db->arztErstellen($daten);
        $this->assertSame('Dr. med.', $arzt['titel']);
        $this->assertSame('+4930111', $arzt['telefon']);
        $this->assertSame('dr.schmidt@praxis.de', $arzt['email']);
    }

    public function testArztAlleLeer(): void
    {
        $this->assertEmpty($this->db->arztAlle());
    }

    public function testArztAlleMehrere(): void
    {
        $this->db->arztErstellen($this->beispielArzt());
        $a2 = $this->beispielArzt();
        $a2['vorname'] = 'Anna';
        $a2['nachname'] = 'Meier';
        $a2['fachrichtung'] = 'Kardiologie';
        $this->db->arztErstellen($a2);
        $this->assertCount(2, $this->db->arztAlle());
    }

    public function testArztAlleNachNameSortiert(): void
    {
        $a1 = $this->beispielArzt();
        $a1['nachname'] = 'Zander';
        $this->db->arztErstellen($a1);

        $a2 = $this->beispielArzt();
        $a2['nachname'] = 'Albrecht';
        $a2['fachrichtung'] = 'Chirurgie';
        $this->db->arztErstellen($a2);

        $alle = $this->db->arztAlle();
        $this->assertSame('Albrecht', $alle[0]['nachname']);
    }

    public function testArztNachIdExistiert(): void
    {
        $erstellt = $this->db->arztErstellen($this->beispielArzt());
        $gefunden = $this->db->arztNachId((int) $erstellt['id']);
        $this->assertSame('Hans', $gefunden['vorname']);
    }

    public function testArztNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->arztNachId(999));
    }

    public function testArztAktualisieren(): void
    {
        $erstellt = $this->db->arztErstellen($this->beispielArzt());
        $aktualisiert = $this->db->arztAktualisieren((int) $erstellt['id'], [
            'titel' => 'Prof. Dr.',
            'fachrichtung' => 'Neurologie',
        ]);
        $this->assertSame('Prof. Dr.', $aktualisiert['titel']);
        $this->assertSame('Neurologie', $aktualisiert['fachrichtung']);
        $this->assertSame('Hans', $aktualisiert['vorname']);
    }

    public function testArztAktualisierenLeer(): void
    {
        $erstellt = $this->db->arztErstellen($this->beispielArzt());
        $aktualisiert = $this->db->arztAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('Hans', $aktualisiert['vorname']);
    }

    public function testArztLoeschen(): void
    {
        $erstellt = $this->db->arztErstellen($this->beispielArzt());
        $this->assertTrue($this->db->arztLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->arztNachId((int) $erstellt['id']));
    }

    public function testArztLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->arztLoeschen(999));
    }

    public function testArztSuchenNachName(): void
    {
        $this->db->arztErstellen($this->beispielArzt());
        $a2 = $this->beispielArzt();
        $a2['vorname'] = 'Anna';
        $a2['nachname'] = 'Mueller';
        $a2['fachrichtung'] = 'Kardiologie';
        $this->db->arztErstellen($a2);

        $ergebnis = $this->db->arztSuchen('Schmidt');
        $this->assertCount(1, $ergebnis);
        $this->assertSame('Schmidt', $ergebnis[0]['nachname']);
    }

    public function testArztSuchenNachFachrichtung(): void
    {
        $this->db->arztErstellen($this->beispielArzt());
        $a2 = $this->beispielArzt();
        $a2['vorname'] = 'Anna';
        $a2['nachname'] = 'Mueller';
        $a2['fachrichtung'] = 'Kardiologie';
        $this->db->arztErstellen($a2);

        $ergebnis = $this->db->arztSuchen('Kardiologie');
        $this->assertCount(1, $ergebnis);
        $this->assertSame('Kardiologie', $ergebnis[0]['fachrichtung']);
    }

    public function testArztSuchenOhneTreffer(): void
    {
        $this->db->arztErstellen($this->beispielArzt());
        $this->assertEmpty($this->db->arztSuchen('xyz_unbekannt'));
    }

    public function testArztSuchenNachVorname(): void
    {
        $this->db->arztErstellen($this->beispielArzt());
        $ergebnis = $this->db->arztSuchen('Hans');
        $this->assertCount(1, $ergebnis);
    }

    public function testArztFormat(): void
    {
        $row = [
            'id' => 1, 'titel' => 'Dr. med.', 'vorname' => 'Hans',
            'nachname' => 'Schmidt', 'fachrichtung' => 'Allgemeinmedizin',
            'telefon' => '+4930111', 'email' => 'dr@praxis.de',
        ];
        $formatted = Datenbank::arztFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame('Dr. med.', $formatted['titel']);
        $this->assertSame('Allgemeinmedizin', $formatted['fachrichtung']);
    }

    // ============================================================
    // --- Termine ---
    // ============================================================

    private function terminVorbereitung(): array
    {
        $patient = $this->db->patientErstellen($this->beispielPatient());
        $arzt = $this->db->arztErstellen($this->beispielArzt());
        return ['patient_id' => (int) $patient['id'], 'arzt_id' => (int) $arzt['id']];
    }

    private function beispielTermin(int $patientId, int $arztId): array
    {
        return [
            'patient_id' => $patientId,
            'arzt_id' => $arztId,
            'datum' => '2026-03-15',
            'uhrzeit' => '10:30',
            'dauer_minuten' => 30,
            'grund' => 'Vorsorge',
        ];
    }

    public function testTerminErstellen(): void
    {
        $ids = $this->terminVorbereitung();
        $termin = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $this->assertArrayHasKey('id', $termin);
        $this->assertSame('2026-03-15', $termin['datum']);
        $this->assertSame('10:30', $termin['uhrzeit']);
        $this->assertSame(30, (int) $termin['dauer_minuten']);
        $this->assertSame('Vorsorge', $termin['grund']);
        $this->assertSame('geplant', $termin['status']);
    }

    public function testTerminErstellenMitJoinDaten(): void
    {
        $ids = $this->terminVorbereitung();
        $termin = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $this->assertSame('Max', $termin['p_vorname']);
        $this->assertSame('Mustermann', $termin['p_nachname']);
        $this->assertSame('Hans', $termin['a_vorname']);
        $this->assertSame('Schmidt', $termin['a_nachname']);
    }

    public function testTerminAlleLeer(): void
    {
        $this->assertEmpty($this->db->terminAlle());
    }

    public function testTerminAlleMehrere(): void
    {
        $ids = $this->terminVorbereitung();
        $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $t2 = $this->beispielTermin($ids['patient_id'], $ids['arzt_id']);
        $t2['datum'] = '2026-03-16';
        $t2['uhrzeit'] = '14:00';
        $this->db->terminErstellen($t2);
        $this->assertCount(2, $this->db->terminAlle());
    }

    public function testTerminAlleNachDatum(): void
    {
        $ids = $this->terminVorbereitung();
        $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $t2 = $this->beispielTermin($ids['patient_id'], $ids['arzt_id']);
        $t2['datum'] = '2026-03-16';
        $this->db->terminErstellen($t2);

        $nur15 = $this->db->terminAlle('2026-03-15');
        $this->assertCount(1, $nur15);
        $this->assertSame('2026-03-15', $nur15[0]['datum']);
    }

    public function testTerminNachIdExistiert(): void
    {
        $ids = $this->terminVorbereitung();
        $erstellt = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $gefunden = $this->db->terminNachId((int) $erstellt['id']);
        $this->assertSame('2026-03-15', $gefunden['datum']);
    }

    public function testTerminNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->terminNachId(999));
    }

    public function testTerminAktualisieren(): void
    {
        $ids = $this->terminVorbereitung();
        $erstellt = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $aktualisiert = $this->db->terminAktualisieren((int) $erstellt['id'], [
            'status' => 'abgesagt',
            'grund' => 'Patient krank',
        ]);
        $this->assertSame('abgesagt', $aktualisiert['status']);
        $this->assertSame('Patient krank', $aktualisiert['grund']);
    }

    public function testTerminAktualisierenLeer(): void
    {
        $ids = $this->terminVorbereitung();
        $erstellt = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $aktualisiert = $this->db->terminAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('geplant', $aktualisiert['status']);
    }

    public function testTerminLoeschen(): void
    {
        $ids = $this->terminVorbereitung();
        $erstellt = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        $this->assertTrue($this->db->terminLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->terminNachId((int) $erstellt['id']));
    }

    public function testTerminLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->terminLoeschen(999));
    }

    public function testTerminFormat(): void
    {
        $row = [
            'id' => 1, 'patient_id' => 2, 'arzt_id' => 3,
            'datum' => '2026-03-15', 'uhrzeit' => '10:30',
            'dauer_minuten' => 30, 'grund' => 'Vorsorge', 'status' => 'geplant',
            'p_vorname' => 'Max', 'p_nachname' => 'Mustermann',
            'a_titel' => 'Dr.', 'a_vorname' => 'Hans', 'a_nachname' => 'Schmidt',
        ];
        $formatted = Datenbank::terminFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame(2, $formatted['patient_id']);
        $this->assertSame(3, $formatted['arzt_id']);
        $this->assertSame('Max Mustermann', $formatted['patient_name']);
        $this->assertSame('Dr. Hans Schmidt', $formatted['arzt_name']);
        $this->assertSame(30, $formatted['dauer_minuten']);
    }

    // ============================================================
    // --- Wartezimmer ---
    // ============================================================

    private function wartezimmerVorbereitung(): array
    {
        $ids = $this->terminVorbereitung();
        $termin = $this->db->terminErstellen($this->beispielTermin($ids['patient_id'], $ids['arzt_id']));
        return [
            'patient_id' => $ids['patient_id'],
            'arzt_id' => $ids['arzt_id'],
            'termin_id' => (int) $termin['id'],
        ];
    }

    public function testWartezimmerHinzufuegen(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $eintrag = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $this->assertArrayHasKey('id', $eintrag);
        $this->assertSame('wartend', $eintrag['status']);
        $this->assertSame('Max', $eintrag['p_vorname']);
        $this->assertSame('Mustermann', $eintrag['p_nachname']);
    }

    public function testWartezimmerHinzufuegenOhneTermin(): void
    {
        $patient = $this->db->patientErstellen($this->beispielPatient());
        $eintrag = $this->db->wartezimmerHinzufuegen([
            'patient_id' => (int) $patient['id'],
        ]);
        $this->assertSame('wartend', $eintrag['status']);
        $this->assertNull($eintrag['termin_id']);
    }

    public function testWartezimmerAktuelle(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $aktuelle = $this->db->wartezimmerAktuelle();
        $this->assertCount(1, $aktuelle);
        $this->assertSame('wartend', $aktuelle[0]['status']);
    }

    public function testWartezimmerAktuelleZeigtNurWartendUndAufgerufen(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $e1 = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $this->db->wartezimmerStatusAendern((int) $e1['id'], 'fertig');

        $aktuelle = $this->db->wartezimmerAktuelle();
        $this->assertEmpty($aktuelle);
    }

    public function testWartezimmerNachIdExistiert(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $erstellt = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $gefunden = $this->db->wartezimmerNachId((int) $erstellt['id']);
        $this->assertSame('wartend', $gefunden['status']);
    }

    public function testWartezimmerNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->wartezimmerNachId(999));
    }

    public function testWartezimmerStatusAendern(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $erstellt = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $aktualisiert = $this->db->wartezimmerStatusAendern((int) $erstellt['id'], 'aufgerufen');
        $this->assertSame('aufgerufen', $aktualisiert['status']);
        $this->assertNotNull($aktualisiert['aufgerufen_zeit']);
    }

    public function testWartezimmerStatusAendernFertig(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $erstellt = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $aktualisiert = $this->db->wartezimmerStatusAendern((int) $erstellt['id'], 'fertig');
        $this->assertSame('fertig', $aktualisiert['status']);
    }

    public function testWartezimmerEntfernen(): void
    {
        $ids = $this->wartezimmerVorbereitung();
        $erstellt = $this->db->wartezimmerHinzufuegen([
            'patient_id' => $ids['patient_id'],
            'termin_id' => $ids['termin_id'],
        ]);
        $this->assertTrue($this->db->wartezimmerEntfernen((int) $erstellt['id']));
        $this->assertNull($this->db->wartezimmerNachId((int) $erstellt['id']));
    }

    public function testWartezimmerEntfernenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->wartezimmerEntfernen(999));
    }

    public function testWartezimmerFormat(): void
    {
        $row = [
            'id' => 1, 'patient_id' => 2, 'termin_id' => 3,
            'ankunft_zeit' => '2026-03-15 10:00:00', 'status' => 'wartend',
            'aufgerufen_zeit' => null,
            'p_vorname' => 'Max', 'p_nachname' => 'Mustermann',
            't_uhrzeit' => '10:30', 't_grund' => 'Vorsorge',
            'a_titel' => 'Dr.', 'a_vorname' => 'Hans', 'a_nachname' => 'Schmidt',
        ];
        $formatted = Datenbank::wartezimmerFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame('Max Mustermann', $formatted['patient_name']);
        $this->assertSame('10:30', $formatted['termin_uhrzeit']);
        $this->assertSame('Dr. Hans Schmidt', $formatted['arzt_name']);
        $this->assertNull($formatted['aufgerufen_zeit']);
    }

    public function testWartezimmerFormatOhneTermin(): void
    {
        $row = [
            'id' => 1, 'patient_id' => 2, 'termin_id' => null,
            'ankunft_zeit' => '2026-03-15 10:00:00', 'status' => 'wartend',
            'aufgerufen_zeit' => null,
            'p_vorname' => 'Max', 'p_nachname' => 'Mustermann',
            't_uhrzeit' => null, 't_grund' => null,
            'a_vorname' => null, 'a_nachname' => null,
        ];
        $formatted = Datenbank::wartezimmerFormat($row);
        $this->assertNull($formatted['termin_id']);
        $this->assertNull($formatted['termin_uhrzeit']);
        $this->assertNull($formatted['arzt_name']);
    }

    // ============================================================
    // --- Agenten ---
    // ============================================================

    private function beispielAgent(): array
    {
        return [
            'name' => 'Agent Smith',
            'nebenstelle' => '100',
            'sip_passwort' => 'geheim123',
        ];
    }

    public function testAgentErstellen(): void
    {
        $agent = $this->db->agentErstellen($this->beispielAgent());
        $this->assertArrayHasKey('id', $agent);
        $this->assertSame('Agent Smith', $agent['name']);
        $this->assertSame('100', $agent['nebenstelle']);
        $this->assertSame('geheim123', $agent['sip_passwort']);
        $this->assertSame('rezeption', $agent['rolle']);
        $this->assertSame('offline', $agent['status']);
        $this->assertSame('rezeption', $agent['warteschlange']);
    }

    public function testAgentErstellenMitOptionen(): void
    {
        $daten = [
            'name' => 'Dr. Agent',
            'nebenstelle' => '200',
            'sip_passwort' => 'pw',
            'rolle' => 'arzt',
            'status' => 'online',
            'warteschlange' => 'terminvergabe',
        ];
        $agent = $this->db->agentErstellen($daten);
        $this->assertSame('arzt', $agent['rolle']);
        $this->assertSame('online', $agent['status']);
        $this->assertSame('terminvergabe', $agent['warteschlange']);
    }

    public function testDoppelteNebenstelleWirftFehler(): void
    {
        $this->expectException(\PDOException::class);
        $this->db->agentErstellen($this->beispielAgent());
        $this->db->agentErstellen($this->beispielAgent());
    }

    public function testAgentAlleLeer(): void
    {
        $this->assertEmpty($this->db->agentAlle());
    }

    public function testAgentAlleMehrere(): void
    {
        $this->db->agentErstellen(['name' => 'A', 'nebenstelle' => '100', 'sip_passwort' => 'pw']);
        $this->db->agentErstellen(['name' => 'B', 'nebenstelle' => '101', 'sip_passwort' => 'pw']);
        $alle = $this->db->agentAlle();
        $this->assertCount(2, $alle);
    }

    public function testAgentAlleNachNameSortiert(): void
    {
        $this->db->agentErstellen(['name' => 'Zoe', 'nebenstelle' => '100', 'sip_passwort' => 'pw']);
        $this->db->agentErstellen(['name' => 'Anna', 'nebenstelle' => '101', 'sip_passwort' => 'pw']);
        $alle = $this->db->agentAlle();
        $this->assertSame('Anna', $alle[0]['name']);
        $this->assertSame('Zoe', $alle[1]['name']);
    }

    public function testAgentNachIdExistiert(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $gefunden = $this->db->agentNachId((int) $erstellt['id']);
        $this->assertSame('Agent Smith', $gefunden['name']);
    }

    public function testAgentNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->agentNachId(999));
    }

    public function testAgentAktualisierenName(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $aktualisiert = $this->db->agentAktualisieren((int) $erstellt['id'], ['name' => 'Neo']);
        $this->assertSame('Neo', $aktualisiert['name']);
        $this->assertSame('100', $aktualisiert['nebenstelle']);
    }

    public function testAgentAktualisierenMehrereFelder(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $aktualisiert = $this->db->agentAktualisieren((int) $erstellt['id'], [
            'nebenstelle' => '999',
            'rolle' => 'admin',
            'warteschlange' => 'dringend',
        ]);
        $this->assertSame('999', $aktualisiert['nebenstelle']);
        $this->assertSame('admin', $aktualisiert['rolle']);
        $this->assertSame('dringend', $aktualisiert['warteschlange']);
    }

    public function testAgentAktualisierenLeer(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $aktualisiert = $this->db->agentAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('Agent Smith', $aktualisiert['name']);
    }

    public function testAgentLoeschen(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $this->assertTrue($this->db->agentLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->agentNachId((int) $erstellt['id']));
    }

    public function testAgentLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->agentLoeschen(999));
    }

    public function testAgentStatusSetzen(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $this->assertSame('offline', $erstellt['status']);

        $aktualisiert = $this->db->agentStatusSetzen((int) $erstellt['id'], 'online');
        $this->assertSame('online', $aktualisiert['status']);
    }

    public function testAgentStatusSetzenPause(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $aktualisiert = $this->db->agentStatusSetzen((int) $erstellt['id'], 'pause');
        $this->assertSame('pause', $aktualisiert['status']);
    }

    public function testAgentStatusSetzenBesetzt(): void
    {
        $erstellt = $this->db->agentErstellen($this->beispielAgent());
        $aktualisiert = $this->db->agentStatusSetzen((int) $erstellt['id'], 'besetzt');
        $this->assertSame('besetzt', $aktualisiert['status']);
    }

    // --- Agent-Format ---

    public function testAgentFormat(): void
    {
        $row = [
            'id' => 1, 'name' => 'Agent Smith', 'nebenstelle' => '100',
            'sip_passwort' => 'pw', 'rolle' => 'rezeption', 'status' => 'online',
            'warteschlange' => 'rezeption', 'erstellt_am' => '2026-01-01 00:00:00',
        ];
        $formatted = Datenbank::agentFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame('Agent Smith', $formatted['name']);
        $this->assertSame('100', $formatted['nebenstelle']);
        $this->assertSame('online', $formatted['status']);
        $this->assertArrayHasKey('erstellt_am', $formatted);
    }

    // ============================================================
    // --- Anrufe ---
    // ============================================================

    private function agentAnlegen(string $nebenstelle = '100'): array
    {
        return $this->db->agentErstellen([
            'name' => 'Agent ' . $nebenstelle,
            'nebenstelle' => $nebenstelle,
            'sip_passwort' => 'pw',
        ]);
    }

    private function beispielAnruf(int $agentId = null): array
    {
        $daten = [
            'anrufer_nummer' => '+49301234567',
            'anrufer_name' => 'Max Mustermann',
        ];
        if ($agentId !== null) {
            $daten['agent_id'] = $agentId;
        }
        return $daten;
    }

    public function testAnrufErstellen(): void
    {
        $anruf = $this->db->anrufErstellen($this->beispielAnruf());
        $this->assertArrayHasKey('id', $anruf);
        $this->assertSame('+49301234567', $anruf['anrufer_nummer']);
        $this->assertSame('Max Mustermann', $anruf['anrufer_name']);
        $this->assertNull($anruf['agent_id']);
        $this->assertSame('eingehend', $anruf['typ']);
        $this->assertSame('klingelt', $anruf['status']);
    }

    public function testAnrufErstellenMitAgent(): void
    {
        $agent = $this->agentAnlegen('300');
        $anruf = $this->db->anrufErstellen($this->beispielAnruf((int) $agent['id']));
        $this->assertSame((int) $agent['id'], (int) $anruf['agent_id']);
        $this->assertSame('Agent 300', $anruf['agent_name']);
    }

    public function testAnrufErstellenMitOptionen(): void
    {
        $daten = [
            'anrufer_nummer' => '+4917612345',
            'anrufer_name' => 'Anna',
            'warteschlange' => 'rezeption',
            'typ' => 'ausgehend',
            'status' => 'verbunden',
            'notizen' => 'Rueckruf',
        ];
        $anruf = $this->db->anrufErstellen($daten);
        $this->assertSame('rezeption', $anruf['warteschlange']);
        $this->assertSame('ausgehend', $anruf['typ']);
        $this->assertSame('verbunden', $anruf['status']);
        $this->assertSame('Rueckruf', $anruf['notizen']);
    }

    public function testAnrufAlleLeer(): void
    {
        $this->assertEmpty($this->db->anrufAlle());
    }

    public function testAnrufAlleMehrere(): void
    {
        $this->db->anrufErstellen(['anrufer_nummer' => '+49111']);
        $this->db->anrufErstellen(['anrufer_nummer' => '+49222']);
        $this->db->anrufErstellen(['anrufer_nummer' => '+49333']);
        $alle = $this->db->anrufAlle();
        $this->assertCount(3, $alle);
    }

    public function testAnrufAlleLimit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->db->anrufErstellen(['anrufer_nummer' => '+4900' . $i]);
        }
        $alle = $this->db->anrufAlle(3);
        $this->assertCount(3, $alle);
    }

    public function testAnrufNachIdExistiert(): void
    {
        $erstellt = $this->db->anrufErstellen($this->beispielAnruf());
        $gefunden = $this->db->anrufNachId((int) $erstellt['id']);
        $this->assertSame('+49301234567', $gefunden['anrufer_nummer']);
    }

    public function testAnrufNachIdNichtVorhanden(): void
    {
        $this->assertNull($this->db->anrufNachId(999));
    }

    public function testAnrufAktualisierenStatus(): void
    {
        $erstellt = $this->db->anrufErstellen($this->beispielAnruf());
        $aktualisiert = $this->db->anrufAktualisieren((int) $erstellt['id'], [
            'status' => 'verbunden',
        ]);
        $this->assertSame('verbunden', $aktualisiert['status']);
    }

    public function testAnrufAktualisierenMehrereFelder(): void
    {
        $erstellt = $this->db->anrufErstellen($this->beispielAnruf());
        $aktualisiert = $this->db->anrufAktualisieren((int) $erstellt['id'], [
            'status' => 'beendet',
            'dauer_sekunden' => 120,
            'notizen' => 'Termin vereinbart',
        ]);
        $this->assertSame('beendet', $aktualisiert['status']);
        $this->assertSame(120, (int) $aktualisiert['dauer_sekunden']);
        $this->assertSame('Termin vereinbart', $aktualisiert['notizen']);
    }

    public function testAnrufAktualisierenLeer(): void
    {
        $erstellt = $this->db->anrufErstellen($this->beispielAnruf());
        $aktualisiert = $this->db->anrufAktualisieren((int) $erstellt['id'], []);
        $this->assertSame('klingelt', $aktualisiert['status']);
    }

    public function testAnrufAktive(): void
    {
        $this->db->anrufErstellen(['anrufer_nummer' => '+491', 'status' => 'klingelt']);
        $this->db->anrufErstellen(['anrufer_nummer' => '+492', 'status' => 'verbunden']);
        $this->db->anrufErstellen(['anrufer_nummer' => '+493', 'status' => 'warteschlange']);

        $beendeter = $this->db->anrufErstellen(['anrufer_nummer' => '+494']);
        $this->db->anrufAktualisieren((int) $beendeter['id'], ['status' => 'beendet']);

        $aktive = $this->db->anrufAktive();
        $this->assertCount(3, $aktive);
    }

    public function testAnrufAktiveLeer(): void
    {
        $anruf = $this->db->anrufErstellen(['anrufer_nummer' => '+491']);
        $this->db->anrufAktualisieren((int) $anruf['id'], ['status' => 'beendet']);
        $this->assertEmpty($this->db->anrufAktive());
    }

    public function testAnrufLoeschen(): void
    {
        $erstellt = $this->db->anrufErstellen($this->beispielAnruf());
        $this->assertTrue($this->db->anrufLoeschen((int) $erstellt['id']));
        $this->assertNull($this->db->anrufNachId((int) $erstellt['id']));
    }

    public function testAnrufLoeschenNichtVorhanden(): void
    {
        $this->assertFalse($this->db->anrufLoeschen(999));
    }

    public function testAnrufMitAgentJoin(): void
    {
        $agent = $this->agentAnlegen('400');
        $anruf = $this->db->anrufErstellen([
            'anrufer_nummer' => '+49555',
            'agent_id' => (int) $agent['id'],
        ]);

        $alle = $this->db->anrufAlle();
        $this->assertSame('Agent 400', $alle[0]['agent_name']);
    }

    // --- Anruf-Format ---

    public function testAnrufFormat(): void
    {
        $row = [
            'id' => 1, 'anrufer_nummer' => '+4930123', 'anrufer_name' => 'Max',
            'agent_id' => 2, 'agent_name' => 'Smith', 'warteschlange' => 'rezeption',
            'typ' => 'eingehend', 'status' => 'verbunden', 'beginn' => '2026-01-01 10:00:00',
            'angenommen' => '2026-01-01 10:00:05', 'beendet' => null,
            'dauer_sekunden' => 45, 'notizen' => '', 'erstellt_am' => '2026-01-01 10:00:00',
        ];
        $formatted = Datenbank::anrufFormat($row);
        $this->assertSame(1, $formatted['id']);
        $this->assertSame('+4930123', $formatted['anrufer_nummer']);
        $this->assertSame(2, $formatted['agent_id']);
        $this->assertSame('Smith', $formatted['agent_name']);
        $this->assertSame(45, $formatted['dauer_sekunden']);
    }

    public function testAnrufFormatOhneAgent(): void
    {
        $row = [
            'id' => 1, 'anrufer_nummer' => '+4930123', 'anrufer_name' => '',
            'agent_id' => null, 'warteschlange' => '',
            'typ' => 'eingehend', 'status' => 'klingelt', 'beginn' => '2026-01-01 10:00:00',
            'angenommen' => null, 'beendet' => null,
            'dauer_sekunden' => 0, 'notizen' => '', 'erstellt_am' => '2026-01-01 10:00:00',
        ];
        $formatted = Datenbank::anrufFormat($row);
        $this->assertNull($formatted['agent_id']);
        $this->assertNull($formatted['agent_name']);
    }
}
