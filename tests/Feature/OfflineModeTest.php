<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * OFFLINE_MODE Lockdown Test
 * Stellt sicher, dass Http::internal() externe Hosts blockt
 * und interne Hosts durchlässt.
 */
class OfflineModeTest extends TestCase
{
    // ── Externe Calls werden geblockt ───────────────────────────────────

    public function test_external_host_is_blocked_in_offline_mode(): void
    {
        config(['offline.enabled' => true]);
        config(['offline.allowed_hosts' => ['ollama', 'piper', 'whisper', 'asterisk', 'localhost', '127.0.0.1']]);

        // Http::internal() muss RuntimeException werfen bei externem Host
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/OFFLINE_MODE.*blocked/');

        Http::internal()->get('https://api.openai.com/v1/models');
    }

    public function test_google_blocked_in_offline_mode(): void
    {
        config(['offline.enabled' => true]);
        config(['offline.allowed_hosts' => ['ollama', 'piper', 'whisper', 'asterisk', 'localhost', '127.0.0.1']]);

        $this->expectException(\RuntimeException::class);
        Http::internal()->get('https://www.google.com');
    }

    // ── Interne Calls gehen durch ───────────────────────────────────────

    public function test_internal_host_is_allowed(): void
    {
        config(['offline.enabled' => true]);
        config(['offline.allowed_hosts' => ['ollama', 'piper', 'whisper', 'asterisk', 'localhost', '127.0.0.1']]);

        Http::fake(['ollama:11434/*' => Http::response(['models' => []], 200)]);

        // Sollte KEINE Exception werfen
        $response = Http::internal()->get('http://ollama:11434/api/tags');
        $this->assertEquals(200, $response->status());
    }

    public function test_localhost_is_allowed(): void
    {
        config(['offline.enabled' => true]);
        config(['offline.allowed_hosts' => ['ollama', 'piper', 'whisper', 'asterisk', 'localhost', '127.0.0.1']]);

        Http::fake(['localhost:*/*' => Http::response('ok', 200)]);

        $response = Http::internal()->get('http://localhost:8080/test');
        $this->assertEquals(200, $response->status());
    }

    // ── OFFLINE_MODE=false erlaubt alles ────────────────────────────────

    public function test_offline_mode_disabled_allows_external(): void
    {
        config(['offline.enabled' => false]);

        Http::fake(['*' => Http::response('ok', 200)]);

        // Kein Exception — Offline-Mode ist aus
        $response = Http::internal()->get('https://api.openai.com/v1/models');
        $this->assertEquals(200, $response->status());
    }

    // ── Health Endpoint ─────────────────────────────────────────────────

    public function test_health_endpoint_returns_json(): void
    {
        Http::fake([
            'ollama:11434/*'  => Http::response(['models' => []], 200),
            'piper:5500/*'    => Http::response(['voices' => []], 200),
            'whisper:9000/*'  => Http::response('ok', 200),
            'asterisk:8088/*' => Http::response(['system' => ['version' => '20.5']], 200),
        ]);

        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'services' => ['ollama', 'piper', 'whisper', 'asterisk'],
                'offline_mode',
                'timestamp',
            ]);
    }
}
