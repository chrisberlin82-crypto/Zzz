<?php

declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';

use Zzz\Rechner;
use Zzz\Datenbank;

header('Content-Type: application/json; charset=utf-8');

$methode = $_SERVER['REQUEST_METHOD'];
$pfad = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$rechner = new Rechner();
$db = new Datenbank();
$db->tabellenErstellen();

try {
    // --- Rechner ---
    if ($pfad === '/api/berechnen' && $methode === 'POST') {
        $eingabe = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

        $a = $eingabe['a'] ?? null;
        $b = $eingabe['b'] ?? null;
        $operation = $eingabe['operation'] ?? null;

        if ($a === null || $b === null || !$operation) {
            http_response_code(400);
            echo json_encode(['fehler' => 'a, b und operation sind erforderlich']);
            exit;
        }

        $ergebnis = match ($operation) {
            'addieren' => $rechner->addieren((float) $a, (float) $b),
            'subtrahieren' => $rechner->subtrahieren((float) $a, (float) $b),
            'multiplizieren' => $rechner->multiplizieren((float) $a, (float) $b),
            'dividieren' => $rechner->dividieren((float) $a, (float) $b),
            default => throw new \InvalidArgumentException("Unbekannte Operation: {$operation}"),
        };

        $db->berechnungSpeichern((float) $a, (float) $b, $operation, $ergebnis);
        echo json_encode(['ergebnis' => $ergebnis]);

    // --- Verlauf ---
    } elseif ($pfad === '/api/verlauf' && $methode === 'GET') {
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        $eintraege = $db->verlaufLaden($limit);
        echo json_encode(array_map([Datenbank::class, 'verlaufFormat'], $eintraege));

    } elseif ($pfad === '/api/verlauf' && $methode === 'DELETE') {
        $anzahl = $db->verlaufLoeschen();
        echo json_encode(['nachricht' => "{$anzahl} Eintraege geloescht"]);

    // --- Benutzer: Liste ---
    } elseif ($pfad === '/api/benutzer' && $methode === 'GET') {
        $suche = isset($_GET['suche']) ? trim($_GET['suche']) : '';
        if ($suche !== '') {
            $alle = $db->benutzerSuchen($suche);
        } else {
            $alle = $db->benutzerAlle();
        }
        $ergebnis = array_map([Datenbank::class, 'zeilenFormat'], $alle);
        echo json_encode($ergebnis);

    // --- Benutzer: Erstellen ---
    } elseif ($pfad === '/api/benutzer' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

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

        if (!empty($fehler)) {
            http_response_code(422);
            echo json_encode(['fehler' => $fehler]);
            exit;
        }

        try {
            $benutzer = $db->benutzerErstellen($daten);
            http_response_code(201);
            echo json_encode([
                'nachricht' => 'Benutzer gespeichert',
                'benutzer' => Datenbank::zeilenFormat($benutzer),
            ]);
        } catch (\PDOException $e) {
            http_response_code(409);
            echo json_encode(['fehler' => ['E-Mail-Adresse existiert bereits']]);
        }

    // --- Benutzer: Detail / Aktualisieren / Loeschen ---
    } elseif (preg_match('#^/api/benutzer/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $benutzer = $db->benutzerNachId($id);
            if (!$benutzer) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Benutzer nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::zeilenFormat($benutzer));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $benutzer = $db->benutzerNachId($id);
            if (!$benutzer) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Benutzer nicht gefunden']);
                exit;
            }
            try {
                $aktualisiert = $db->benutzerAktualisieren($id, $daten);
                echo json_encode([
                    'nachricht' => 'Benutzer aktualisiert',
                    'benutzer' => Datenbank::zeilenFormat($aktualisiert),
                ]);
            } catch (\PDOException $e) {
                http_response_code(409);
                echo json_encode(['fehler' => ['E-Mail-Adresse existiert bereits']]);
            }

        } elseif ($methode === 'DELETE') {
            if ($db->benutzerLoeschen($id)) {
                echo json_encode(['nachricht' => 'Benutzer geloescht']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Benutzer nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Patienten: Liste + Suche ---
    } elseif ($pfad === '/api/patienten' && $methode === 'GET') {
        $suche = isset($_GET['suche']) ? trim($_GET['suche']) : '';
        if ($suche !== '') {
            $alle = $db->patientSuchen($suche);
        } else {
            $alle = $db->patientAlle();
        }
        echo json_encode(array_map([Datenbank::class, 'patientFormat'], $alle));

    // --- Patienten: Erstellen ---
    } elseif ($pfad === '/api/patienten' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

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

        if (!empty($fehler)) {
            http_response_code(422);
            echo json_encode(['fehler' => $fehler]);
            exit;
        }

        try {
            $patient = $db->patientErstellen($daten);
            http_response_code(201);
            echo json_encode([
                'nachricht' => 'Patient gespeichert',
                'patient' => Datenbank::patientFormat($patient),
            ]);
        } catch (\PDOException $e) {
            http_response_code(409);
            echo json_encode(['fehler' => ['Versicherungsnummer existiert bereits']]);
        }

    // --- Patienten: Detail / Aktualisieren / Loeschen ---
    } elseif (preg_match('#^/api/patienten/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $patient = $db->patientNachId($id);
            if (!$patient) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Patient nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::patientFormat($patient));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $patient = $db->patientNachId($id);
            if (!$patient) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Patient nicht gefunden']);
                exit;
            }
            try {
                $aktualisiert = $db->patientAktualisieren($id, $daten);
                echo json_encode([
                    'nachricht' => 'Patient aktualisiert',
                    'patient' => Datenbank::patientFormat($aktualisiert),
                ]);
            } catch (\PDOException $e) {
                http_response_code(409);
                echo json_encode(['fehler' => ['Versicherungsnummer existiert bereits']]);
            }

        } elseif ($methode === 'DELETE') {
            if ($db->patientLoeschen($id)) {
                echo json_encode(['nachricht' => 'Patient geloescht']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Patient nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Aerzte: Liste ---
    } elseif ($pfad === '/api/aerzte' && $methode === 'GET') {
        $alle = $db->arztAlle();
        echo json_encode(array_map([Datenbank::class, 'arztFormat'], $alle));

    // --- Aerzte: Erstellen ---
    } elseif ($pfad === '/api/aerzte' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

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

        if (!empty($fehler)) {
            http_response_code(422);
            echo json_encode(['fehler' => $fehler]);
            exit;
        }

        $arzt = $db->arztErstellen($daten);
        http_response_code(201);
        echo json_encode([
            'nachricht' => 'Arzt gespeichert',
            'arzt' => Datenbank::arztFormat($arzt),
        ]);

    // --- Aerzte: Detail / Aktualisieren / Loeschen ---
    } elseif (preg_match('#^/api/aerzte/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $arzt = $db->arztNachId($id);
            if (!$arzt) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Arzt nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::arztFormat($arzt));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $arzt = $db->arztNachId($id);
            if (!$arzt) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Arzt nicht gefunden']);
                exit;
            }
            $aktualisiert = $db->arztAktualisieren($id, $daten);
            echo json_encode([
                'nachricht' => 'Arzt aktualisiert',
                'arzt' => Datenbank::arztFormat($aktualisiert),
            ]);

        } elseif ($methode === 'DELETE') {
            if ($db->arztLoeschen($id)) {
                echo json_encode(['nachricht' => 'Arzt geloescht']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Arzt nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Termine: Liste ---
    } elseif ($pfad === '/api/termine' && $methode === 'GET') {
        $datum = isset($_GET['datum']) ? trim($_GET['datum']) : null;
        $alle = $db->terminAlle($datum ?: null);
        echo json_encode(array_map([Datenbank::class, 'terminFormat'], $alle));

    // --- Termine: Erstellen ---
    } elseif ($pfad === '/api/termine' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

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

        if (!empty($fehler)) {
            http_response_code(422);
            echo json_encode(['fehler' => $fehler]);
            exit;
        }

        $termin = $db->terminErstellen($daten);
        http_response_code(201);
        echo json_encode([
            'nachricht' => 'Termin gespeichert',
            'termin' => Datenbank::terminFormat($termin),
        ]);

    // --- Termine: Detail / Aktualisieren / Loeschen ---
    } elseif (preg_match('#^/api/termine/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $termin = $db->terminNachId($id);
            if (!$termin) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Termin nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::terminFormat($termin));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $termin = $db->terminNachId($id);
            if (!$termin) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Termin nicht gefunden']);
                exit;
            }
            $aktualisiert = $db->terminAktualisieren($id, $daten);
            echo json_encode([
                'nachricht' => 'Termin aktualisiert',
                'termin' => Datenbank::terminFormat($aktualisiert),
            ]);

        } elseif ($methode === 'DELETE') {
            if ($db->terminLoeschen($id)) {
                echo json_encode(['nachricht' => 'Termin geloescht']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Termin nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Wartezimmer: Liste ---
    } elseif ($pfad === '/api/wartezimmer' && $methode === 'GET') {
        $alle = $db->wartezimmerAktuelle();
        echo json_encode(array_map([Datenbank::class, 'wartezimmerFormat'], $alle));

    // --- Wartezimmer: Hinzufuegen ---
    } elseif ($pfad === '/api/wartezimmer' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

        if (empty($daten['patient_id'])) {
            http_response_code(422);
            echo json_encode(['fehler' => ['Patient-ID ist erforderlich']]);
            exit;
        }

        $eintrag = $db->wartezimmerHinzufuegen($daten);
        http_response_code(201);
        echo json_encode([
            'nachricht' => 'Patient ins Wartezimmer aufgenommen',
            'eintrag' => Datenbank::wartezimmerFormat($eintrag),
        ]);

    // --- Wartezimmer: Status / Entfernen ---
    } elseif (preg_match('#^/api/wartezimmer/(\d+)/status$#', $pfad, $matches) && $methode === 'PUT') {
        $id = (int) $matches[1];
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

        $eintrag = $db->wartezimmerNachId($id);
        if (!$eintrag) {
            http_response_code(404);
            echo json_encode(['fehler' => 'Wartezimmer-Eintrag nicht gefunden']);
            exit;
        }

        $neuerStatus = $daten['status'] ?? '';
        if (!in_array($neuerStatus, ['wartend', 'aufgerufen', 'fertig'], true)) {
            http_response_code(400);
            echo json_encode(['fehler' => 'Ungueltiger Status']);
            exit;
        }

        $aktualisiert = $db->wartezimmerStatusAendern($id, $neuerStatus);
        echo json_encode([
            'nachricht' => 'Status aktualisiert',
            'eintrag' => Datenbank::wartezimmerFormat($aktualisiert),
        ]);

    } elseif (preg_match('#^/api/wartezimmer/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $eintrag = $db->wartezimmerNachId($id);
            if (!$eintrag) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Wartezimmer-Eintrag nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::wartezimmerFormat($eintrag));

        } elseif ($methode === 'DELETE') {
            if ($db->wartezimmerEntfernen($id)) {
                echo json_encode(['nachricht' => 'Aus Wartezimmer entfernt']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Wartezimmer-Eintrag nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Agenten: Liste + Erstellen ---
    } elseif ($pfad === '/api/agenten' && $methode === 'GET') {
        $alle = $db->agentAlle();
        echo json_encode(array_map([Datenbank::class, 'agentFormat'], $alle));

    } elseif ($pfad === '/api/agenten' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

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

        if (!empty($fehler)) {
            http_response_code(422);
            echo json_encode(['fehler' => $fehler]);
            exit;
        }

        try {
            $agent = $db->agentErstellen($daten);
            http_response_code(201);
            echo json_encode([
                'nachricht' => 'Agent gespeichert',
                'agent' => Datenbank::agentFormat($agent),
            ]);
        } catch (\PDOException $e) {
            http_response_code(409);
            echo json_encode(['fehler' => ['Nebenstelle existiert bereits']]);
        }

    // --- Agenten: Status ---
    } elseif (preg_match('#^/api/agenten/(\d+)/status$#', $pfad, $matches) && $methode === 'PUT') {
        $id = (int) $matches[1];
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

        $agent = $db->agentNachId($id);
        if (!$agent) {
            http_response_code(404);
            echo json_encode(['fehler' => 'Agent nicht gefunden']);
            exit;
        }

        $neuerStatus = $daten['status'] ?? '';
        if (!in_array($neuerStatus, ['online', 'offline', 'pause', 'besetzt'], true)) {
            http_response_code(400);
            echo json_encode(['fehler' => 'Ungueltiger Status']);
            exit;
        }

        $aktualisiert = $db->agentStatusSetzen($id, $neuerStatus);
        echo json_encode([
            'nachricht' => 'Status aktualisiert',
            'agent' => Datenbank::agentFormat($aktualisiert),
        ]);

    // --- Agenten: Detail / Aktualisieren / Loeschen ---
    } elseif (preg_match('#^/api/agenten/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $agent = $db->agentNachId($id);
            if (!$agent) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Agent nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::agentFormat($agent));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $agent = $db->agentNachId($id);
            if (!$agent) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Agent nicht gefunden']);
                exit;
            }
            try {
                $aktualisiert = $db->agentAktualisieren($id, $daten);
                echo json_encode([
                    'nachricht' => 'Agent aktualisiert',
                    'agent' => Datenbank::agentFormat($aktualisiert),
                ]);
            } catch (\PDOException $e) {
                http_response_code(409);
                echo json_encode(['fehler' => ['Nebenstelle existiert bereits']]);
            }

        } elseif ($methode === 'DELETE') {
            if ($db->agentLoeschen($id)) {
                echo json_encode(['nachricht' => 'Agent geloescht']);
            } else {
                http_response_code(404);
                echo json_encode(['fehler' => 'Agent nicht gefunden']);
            }

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    // --- Anrufe: Liste + Erstellen ---
    } elseif ($pfad === '/api/anrufe' && $methode === 'GET') {
        $aktiv = isset($_GET['aktiv']) ? trim($_GET['aktiv']) : '';
        if ($aktiv === 'true') {
            $alle = $db->anrufAktive();
        } else {
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $alle = $db->anrufAlle($limit);
        }
        echo json_encode(array_map([Datenbank::class, 'anrufFormat'], $alle));

    } elseif ($pfad === '/api/anrufe' && $methode === 'POST') {
        $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);

        if (empty($daten['anrufer_nummer'])) {
            http_response_code(422);
            echo json_encode(['fehler' => ['Anrufer-Nummer ist erforderlich']]);
            exit;
        }

        $anruf = $db->anrufErstellen($daten);
        http_response_code(201);
        echo json_encode([
            'nachricht' => 'Anruf erstellt',
            'anruf' => Datenbank::anrufFormat($anruf),
        ]);

    // --- Anrufe: Detail / Aktualisieren ---
    } elseif (preg_match('#^/api/anrufe/(\d+)$#', $pfad, $matches)) {
        $id = (int) $matches[1];

        if ($methode === 'GET') {
            $anruf = $db->anrufNachId($id);
            if (!$anruf) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Anruf nicht gefunden']);
                exit;
            }
            echo json_encode(Datenbank::anrufFormat($anruf));

        } elseif ($methode === 'PUT') {
            $daten = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
            $anruf = $db->anrufNachId($id);
            if (!$anruf) {
                http_response_code(404);
                echo json_encode(['fehler' => 'Anruf nicht gefunden']);
                exit;
            }
            $aktualisiert = $db->anrufAktualisieren($id, $daten);
            echo json_encode([
                'nachricht' => 'Anruf aktualisiert',
                'anruf' => Datenbank::anrufFormat($aktualisiert),
            ]);

        } else {
            http_response_code(405);
            echo json_encode(['fehler' => 'Methode nicht erlaubt']);
        }

    } else {
        http_response_code(404);
        echo json_encode(['fehler' => 'Route nicht gefunden']);
    }
} catch (\InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['fehler' => $e->getMessage()]);
} catch (\JsonException $e) {
    http_response_code(400);
    echo json_encode(['fehler' => 'Ungültiges JSON: ' . $e->getMessage()]);
}
