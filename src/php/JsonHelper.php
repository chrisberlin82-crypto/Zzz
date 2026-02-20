<?php

declare(strict_types=1);

namespace Zzz;

class JsonHelper
{
    /**
     * Lädt und parst eine JSON-Datei.
     */
    public function laden(string $dateipfad): array
    {
        if (!file_exists($dateipfad)) {
            throw new \RuntimeException("Datei nicht gefunden: {$dateipfad}");
        }

        $inhalt = file_get_contents($dateipfad);
        $daten = json_decode($inhalt, true, 512, JSON_THROW_ON_ERROR);

        return $daten;
    }

    /**
     * Speichert Daten als JSON-Datei.
     */
    public function speichern(array $daten, string $dateipfad): void
    {
        $json = json_encode($daten, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        file_put_contents($dateipfad, $json);
    }

    /**
     * Validiert einen JSON-String.
     */
    public function istGueltigesJson(string $json): bool
    {
        try {
            json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            return true;
        } catch (\JsonException) {
            return false;
        }
    }
}
