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

        echo json_encode(['ergebnis' => $ergebnis]);

    // --- Benutzer: Liste ---
    } elseif ($pfad === '/api/benutzer' && $methode === 'GET') {
        $alle = $db->benutzerAlle();
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
