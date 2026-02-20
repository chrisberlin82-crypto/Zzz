<?php

declare(strict_types=1);

namespace Zzz\Tests;

use PHPUnit\Framework\TestCase;
use Zzz\Rechner;

/**
 * Tests fuer die API-Logik (Routing, Validierung, Antwortformate).
 * Testet die Geschaeftslogik die in api.php verwendet wird.
 */
class ApiTest extends TestCase
{
    private Rechner $rechner;

    protected function setUp(): void
    {
        $this->rechner = new Rechner();
    }

    // --- Rechner-API Logik ---

    public function testBerechnenAddieren(): void
    {
        $eingabe = ['a' => 2, 'b' => 3, 'operation' => 'addieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(5.0, $ergebnis);
    }

    public function testBerechnenSubtrahieren(): void
    {
        $eingabe = ['a' => 10, 'b' => 4, 'operation' => 'subtrahieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(6.0, $ergebnis);
    }

    public function testBerechnenMultiplizieren(): void
    {
        $eingabe = ['a' => 3, 'b' => 7, 'operation' => 'multiplizieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(21.0, $ergebnis);
    }

    public function testBerechnenDividieren(): void
    {
        $eingabe = ['a' => 15, 'b' => 3, 'operation' => 'dividieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(5.0, $ergebnis);
    }

    public function testBerechnenDivisionDurchNull(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Null');

        $eingabe = ['a' => 10, 'b' => 0, 'operation' => 'dividieren'];
        $this->operationAusfuehren($eingabe);
    }

    public function testBerechnenUnbekannteOperation(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $eingabe = ['a' => 1, 'b' => 2, 'operation' => 'wurzel'];
        $this->operationAusfuehren($eingabe);
    }

    public function testBerechnenMitFliesskomma(): void
    {
        $eingabe = ['a' => 1.5, 'b' => 2.5, 'operation' => 'addieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(4.0, $ergebnis);
    }

    public function testBerechnenMitNegativenZahlen(): void
    {
        $eingabe = ['a' => -5, 'b' => 3, 'operation' => 'multiplizieren'];
        $ergebnis = $this->operationAusfuehren($eingabe);
        $this->assertSame(-15.0, $ergebnis);
    }

    // --- Benutzer-Validierung (wie in api.php) ---

    public function testBenutzerValidierungGueltig(): void
    {
        $daten = ['name' => 'Max', 'email' => 'max@beispiel.de', 'alter' => 30];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testBenutzerValidierungOhneName(): void
    {
        $daten = ['name' => '', 'email' => 'max@beispiel.de', 'alter' => 30];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertContains('Name ist erforderlich', $fehler);
    }

    public function testBenutzerValidierungOhneEmail(): void
    {
        $daten = ['name' => 'Max', 'email' => 'ungueltig', 'alter' => 30];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertContains('Gültige E-Mail ist erforderlich', $fehler);
    }

    public function testBenutzerValidierungAlterZuHoch(): void
    {
        $daten = ['name' => 'Max', 'email' => 'max@beispiel.de', 'alter' => 200];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertContains('Alter muss zwischen 0 und 150 liegen', $fehler);
    }

    public function testBenutzerValidierungAlterNegativ(): void
    {
        $daten = ['name' => 'Max', 'email' => 'max@beispiel.de', 'alter' => -1];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertContains('Alter muss zwischen 0 und 150 liegen', $fehler);
    }

    public function testBenutzerValidierungAllerFehler(): void
    {
        $daten = ['name' => '', 'email' => '', 'alter' => -1];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertCount(3, $fehler);
    }

    public function testBenutzerValidierungMitAdresse(): void
    {
        $daten = [
            'name' => 'Anna',
            'email' => 'anna@test.de',
            'alter' => 25,
            'strasse' => 'Hauptstr. 1',
            'plz' => '10115',
            'stadt' => 'Berlin',
        ];
        $fehler = $this->benutzerValidieren($daten);
        $this->assertEmpty($fehler);
    }

    // --- JSON-Antwortformat ---

    public function testErfolgsAntwortFormat(): void
    {
        $antwort = ['ergebnis' => 42.0];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertArrayHasKey('ergebnis', $decoded);
        $this->assertEquals(42.0, $decoded['ergebnis']);
    }

    public function testFehlerAntwortFormat(): void
    {
        $antwort = ['fehler' => 'Division durch Null ist nicht erlaubt'];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertArrayHasKey('fehler', $decoded);
    }

    public function testBenutzerErstelltAntwortFormat(): void
    {
        $benutzer = ['name' => 'Max', 'email' => 'max@test.de', 'alter' => 30];
        $antwort = ['nachricht' => 'Benutzer gespeichert', 'benutzer' => $benutzer];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertArrayHasKey('nachricht', $decoded);
        $this->assertArrayHasKey('benutzer', $decoded);
        $this->assertSame('Max', $decoded['benutzer']['name']);
    }

    // ============================================================
    // --- Patienten-Validierung (wie in api.php) ---
    // ============================================================

    public function testPatientValidierungGueltig(): void
    {
        $daten = [
            'vorname' => 'Max', 'nachname' => 'Mustermann',
            'geburtsdatum' => '1990-05-15', 'versicherungsnummer' => 'A123',
            'krankenkasse' => 'AOK',
        ];
        $fehler = $this->patientValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testPatientValidierungOhneVorname(): void
    {
        $daten = [
            'vorname' => '', 'nachname' => 'Mustermann',
            'geburtsdatum' => '1990-05-15', 'versicherungsnummer' => 'A123',
            'krankenkasse' => 'AOK',
        ];
        $fehler = $this->patientValidieren($daten);
        $this->assertContains('Vorname ist erforderlich', $fehler);
    }

    public function testPatientValidierungAlleFehler(): void
    {
        $daten = [
            'vorname' => '', 'nachname' => '', 'geburtsdatum' => '',
            'versicherungsnummer' => '', 'krankenkasse' => '',
        ];
        $fehler = $this->patientValidieren($daten);
        $this->assertCount(5, $fehler);
    }

    // --- Aerzte-Validierung ---

    public function testArztValidierungGueltig(): void
    {
        $daten = ['vorname' => 'Hans', 'nachname' => 'Schmidt', 'fachrichtung' => 'Allgemeinmedizin'];
        $fehler = $this->arztValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testArztValidierungAlleFehler(): void
    {
        $daten = ['vorname' => '', 'nachname' => '', 'fachrichtung' => ''];
        $fehler = $this->arztValidieren($daten);
        $this->assertCount(3, $fehler);
    }

    // --- Termine-Validierung ---

    public function testTerminValidierungGueltig(): void
    {
        $daten = ['patient_id' => 1, 'arzt_id' => 1, 'datum' => '2026-03-15', 'uhrzeit' => '10:30'];
        $fehler = $this->terminValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testTerminValidierungAlleFehler(): void
    {
        $daten = ['patient_id' => '', 'arzt_id' => '', 'datum' => '', 'uhrzeit' => ''];
        $fehler = $this->terminValidieren($daten);
        $this->assertCount(4, $fehler);
    }

    // --- Wartezimmer-Validierung ---

    public function testWartezimmerValidierungGueltig(): void
    {
        $daten = ['patient_id' => 1];
        $fehler = $this->wartezimmerValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testWartezimmerValidierungOhnePatientId(): void
    {
        $daten = [];
        $fehler = $this->wartezimmerValidieren($daten);
        $this->assertContains('Patient-ID ist erforderlich', $fehler);
    }

    // --- Wartezimmer-Status-Validierung ---

    public function testWartezimmerStatusGueltig(): void
    {
        foreach (['wartend', 'aufgerufen', 'fertig'] as $status) {
            $this->assertTrue($this->istGueltigerWartezimmerStatus($status));
        }
    }

    public function testWartezimmerStatusUngueltig(): void
    {
        $this->assertFalse($this->istGueltigerWartezimmerStatus('abwesend'));
        $this->assertFalse($this->istGueltigerWartezimmerStatus(''));
    }

    // --- Medizin JSON-Antwortformate ---

    public function testPatientErstelltAntwortFormat(): void
    {
        $patient = ['vorname' => 'Max', 'nachname' => 'Mustermann', 'krankenkasse' => 'AOK'];
        $antwort = ['nachricht' => 'Patient gespeichert', 'patient' => $patient];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertSame('Patient gespeichert', $decoded['nachricht']);
        $this->assertSame('Max', $decoded['patient']['vorname']);
    }

    public function testTerminErstelltAntwortFormat(): void
    {
        $termin = ['datum' => '2026-03-15', 'uhrzeit' => '10:30', 'status' => 'geplant'];
        $antwort = ['nachricht' => 'Termin gespeichert', 'termin' => $termin];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertSame('Termin gespeichert', $decoded['nachricht']);
        $this->assertSame('geplant', $decoded['termin']['status']);
    }

    // ============================================================
    // --- Agenten-Validierung (wie in api.php) ---
    // ============================================================

    public function testAgentValidierungGueltig(): void
    {
        $daten = ['name' => 'Agent Smith', 'nebenstelle' => '100', 'sip_passwort' => 'geheim'];
        $fehler = $this->agentValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testAgentValidierungOhneName(): void
    {
        $daten = ['name' => '', 'nebenstelle' => '100', 'sip_passwort' => 'pw'];
        $fehler = $this->agentValidieren($daten);
        $this->assertContains('Name ist erforderlich', $fehler);
    }

    public function testAgentValidierungOhneNebenstelle(): void
    {
        $daten = ['name' => 'Agent', 'nebenstelle' => '', 'sip_passwort' => 'pw'];
        $fehler = $this->agentValidieren($daten);
        $this->assertContains('Nebenstelle ist erforderlich', $fehler);
    }

    public function testAgentValidierungOhnePasswort(): void
    {
        $daten = ['name' => 'Agent', 'nebenstelle' => '100', 'sip_passwort' => ''];
        $fehler = $this->agentValidieren($daten);
        $this->assertContains('SIP-Passwort ist erforderlich', $fehler);
    }

    public function testAgentValidierungAlleFehler(): void
    {
        $daten = ['name' => '', 'nebenstelle' => '', 'sip_passwort' => ''];
        $fehler = $this->agentValidieren($daten);
        $this->assertCount(3, $fehler);
    }

    // --- Agenten-Status-Validierung ---

    public function testAgentStatusGueltig(): void
    {
        foreach (['online', 'offline', 'pause', 'besetzt'] as $status) {
            $this->assertTrue($this->istGueltigerAgentStatus($status));
        }
    }

    public function testAgentStatusUngueltig(): void
    {
        $this->assertFalse($this->istGueltigerAgentStatus('aktiv'));
        $this->assertFalse($this->istGueltigerAgentStatus(''));
        $this->assertFalse($this->istGueltigerAgentStatus('bereit'));
    }

    // --- Anrufe-Validierung ---

    public function testAnrufValidierungGueltig(): void
    {
        $daten = ['anrufer_nummer' => '+4930123456'];
        $fehler = $this->anrufValidieren($daten);
        $this->assertEmpty($fehler);
    }

    public function testAnrufValidierungOhneNummer(): void
    {
        $daten = ['anrufer_nummer' => ''];
        $fehler = $this->anrufValidieren($daten);
        $this->assertContains('Anrufer-Nummer ist erforderlich', $fehler);
    }

    public function testAnrufValidierungOhneKey(): void
    {
        $daten = [];
        $fehler = $this->anrufValidieren($daten);
        $this->assertContains('Anrufer-Nummer ist erforderlich', $fehler);
    }

    // --- Agenten JSON-Antwortformat ---

    public function testAgentErstelltAntwortFormat(): void
    {
        $agent = ['name' => 'Smith', 'nebenstelle' => '100', 'status' => 'online'];
        $antwort = ['nachricht' => 'Agent gespeichert', 'agent' => $agent];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertSame('Agent gespeichert', $decoded['nachricht']);
        $this->assertSame('Smith', $decoded['agent']['name']);
    }

    public function testAgentStatusAntwortFormat(): void
    {
        $agent = ['name' => 'Smith', 'status' => 'pause'];
        $antwort = ['nachricht' => 'Status aktualisiert', 'agent' => $agent];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertSame('Status aktualisiert', $decoded['nachricht']);
        $this->assertSame('pause', $decoded['agent']['status']);
    }

    // --- Anrufe JSON-Antwortformat ---

    public function testAnrufErstelltAntwortFormat(): void
    {
        $anruf = ['anrufer_nummer' => '+4930123', 'status' => 'klingelt'];
        $antwort = ['nachricht' => 'Anruf erstellt', 'anruf' => $anruf];
        $json = json_encode($antwort);
        $decoded = json_decode($json, true);
        $this->assertSame('Anruf erstellt', $decoded['nachricht']);
        $this->assertSame('+4930123', $decoded['anruf']['anrufer_nummer']);
    }

    // --- Hilfsmethoden (spiegeln die api.php Logik) ---

    private function operationAusfuehren(array $eingabe): float
    {
        $a = (float) $eingabe['a'];
        $b = (float) $eingabe['b'];
        $operation = $eingabe['operation'];

        return match ($operation) {
            'addieren' => $this->rechner->addieren($a, $b),
            'subtrahieren' => $this->rechner->subtrahieren($a, $b),
            'multiplizieren' => $this->rechner->multiplizieren($a, $b),
            'dividieren' => $this->rechner->dividieren($a, $b),
            default => throw new \InvalidArgumentException("Unbekannte Operation: {$operation}"),
        };
    }

    private function benutzerValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['name'])) {
            $fehler[] = 'Name ist erforderlich';
        }
        if (empty($daten['email']) || !filter_var($daten['email'], FILTER_VALIDATE_EMAIL)) {
            $fehler[] = 'Gültige E-Mail ist erforderlich';
        }
        if (!isset($daten['alter']) || $daten['alter'] < 0 || $daten['alter'] > 150) {
            $fehler[] = 'Alter muss zwischen 0 und 150 liegen';
        }
        return $fehler;
    }

    private function agentValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['name'])) {
            $fehler[] = 'Name ist erforderlich';
        }
        if (empty($daten['nebenstelle'])) {
            $fehler[] = 'Nebenstelle ist erforderlich';
        }
        if (empty($daten['sip_passwort'])) {
            $fehler[] = 'SIP-Passwort ist erforderlich';
        }
        return $fehler;
    }

    private function istGueltigerAgentStatus(string $status): bool
    {
        return in_array($status, ['online', 'offline', 'pause', 'besetzt'], true);
    }

    private function anrufValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['anrufer_nummer'])) {
            $fehler[] = 'Anrufer-Nummer ist erforderlich';
        }
        return $fehler;
    }

    private function patientValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['vorname'])) {
            $fehler[] = 'Vorname ist erforderlich';
        }
        if (empty($daten['nachname'])) {
            $fehler[] = 'Nachname ist erforderlich';
        }
        if (empty($daten['geburtsdatum'])) {
            $fehler[] = 'Geburtsdatum ist erforderlich';
        }
        if (empty($daten['versicherungsnummer'])) {
            $fehler[] = 'Versicherungsnummer ist erforderlich';
        }
        if (empty($daten['krankenkasse'])) {
            $fehler[] = 'Krankenkasse ist erforderlich';
        }
        return $fehler;
    }

    private function arztValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['vorname'])) {
            $fehler[] = 'Vorname ist erforderlich';
        }
        if (empty($daten['nachname'])) {
            $fehler[] = 'Nachname ist erforderlich';
        }
        if (empty($daten['fachrichtung'])) {
            $fehler[] = 'Fachrichtung ist erforderlich';
        }
        return $fehler;
    }

    private function terminValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['patient_id'])) {
            $fehler[] = 'Patient-ID ist erforderlich';
        }
        if (empty($daten['arzt_id'])) {
            $fehler[] = 'Arzt-ID ist erforderlich';
        }
        if (empty($daten['datum'])) {
            $fehler[] = 'Datum ist erforderlich';
        }
        if (empty($daten['uhrzeit'])) {
            $fehler[] = 'Uhrzeit ist erforderlich';
        }
        return $fehler;
    }

    private function wartezimmerValidieren(array $daten): array
    {
        $fehler = [];
        if (empty($daten['patient_id'])) {
            $fehler[] = 'Patient-ID ist erforderlich';
        }
        return $fehler;
    }

    private function istGueltigerWartezimmerStatus(string $status): bool
    {
        return in_array($status, ['wartend', 'aufgerufen', 'fertig'], true);
    }
}
