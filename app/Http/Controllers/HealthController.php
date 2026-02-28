<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

/**
 * Health-Check Controller — prüft alle internen Services via Http::internal().
 * Kein einziger Call geht nach extern.
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'ollama'   => $this->checkOllama(),
            'piper'    => $this->checkPiper(),
            'whisper'  => $this->checkWhisper(),
            'asterisk' => $this->checkAsterisk(),
        ];

        $allUp  = !in_array(false, array_column($checks, 'up'), true);
        $status = $allUp ? 200 : 503;

        return response()->json([
            'status'   => $allUp ? 'healthy' : 'degraded',
            'services' => $checks,
            'offline_mode' => config('offline.enabled'),
            'timestamp' => now()->toIso8601String(),
        ], $status);
    }

    // ── Individual service checks ───────────────────────────────────────

    private function checkOllama(): array
    {
        return $this->probe(
            config('services.ollama.url') . '/api/tags',
            'ollama'
        );
    }

    private function checkPiper(): array
    {
        return $this->probe(
            config('services.piper.url') . '/voices',
            'piper'
        );
    }

    private function checkWhisper(): array
    {
        return $this->probe(
            config('services.whisper.url') . '/health',
            'whisper'
        );
    }

    private function checkAsterisk(): array
    {
        $url  = config('services.asterisk.ari_url') . '/ari/asterisk/info';
        $user = config('services.asterisk.ari_user');
        $pass = config('services.asterisk.ari_pass');

        try {
            $r = Http::internal()
                ->withBasicAuth($user, $pass)
                ->timeout(5)
                ->get($url);

            return [
                'up'      => $r->successful(),
                'latency' => $this->latency($r),
                'version' => $r->json('system.version', 'unknown'),
            ];
        } catch (\Throwable $e) {
            return ['up' => false, 'error' => $e->getMessage()];
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function probe(string $url, string $name): array
    {
        try {
            $start = microtime(true);
            $r     = Http::internal()->timeout(5)->get($url);
            $ms    = round((microtime(true) - $start) * 1000);

            return [
                'up'      => $r->successful(),
                'latency' => "{$ms}ms",
            ];
        } catch (\Throwable $e) {
            return ['up' => false, 'error' => $e->getMessage()];
        }
    }

    private function latency($response): string
    {
        $stats = $response->handlerStats();
        $ms    = isset($stats['total_time'])
            ? round($stats['total_time'] * 1000)
            : '?';

        return "{$ms}ms";
    }
}
