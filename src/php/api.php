<?php

declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';

use Zzz\Rechner;
use Zzz\JsonHelper;

header('Content-Type: application/json; charset=utf-8');

$methode = $_SERVER['REQUEST_METHOD'];
$pfad = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$rechner = new Rechner();
$jsonHelper = new JsonHelper();

try {
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

        http_response_code(201);
        echo json_encode(['nachricht' => 'Benutzer gespeichert', 'benutzer' => $daten]);

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
