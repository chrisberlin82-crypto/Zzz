<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Knowledge-Base Assistant — alle LLM-Calls laufen über Http::internal()
 * und damit AUSSCHLIESSLICH gegen den lokalen Ollama-Container.
 */
class KbAssistantService
{
    private string $ollamaUrl;
    private string $model;

    public function __construct()
    {
        $this->ollamaUrl = config('services.ollama.url');
        $this->model     = config('services.ollama.model');
    }

    // ── Chat (Streaming disabled — JSON response) ───────────────────────

    /**
     * Sende eine Frage + optionalen Kontext an Ollama und gib die Antwort zurück.
     *
     * @param  string       $question   Benutzerfrage
     * @param  string|null  $context    Zusätzlicher KB-Kontext (z.B. aus Vektordatenbank)
     * @param  string|null  $systemPrompt  System-Prompt Override
     * @return string  Ollama-Antwort als Text
     */
    public function ask(string $question, ?string $context = null, ?string $systemPrompt = null): string
    {
        $system = $systemPrompt ?? $this->defaultSystemPrompt();

        $messages = [
            ['role' => 'system', 'content' => $system],
        ];

        if ($context) {
            $messages[] = [
                'role'    => 'user',
                'content' => "Kontext:\n{$context}\n\nFrage: {$question}",
            ];
        } else {
            $messages[] = ['role' => 'user', 'content' => $question];
        }

        $response = Http::internal()
            ->timeout(120)
            ->post("{$this->ollamaUrl}/api/chat", [
                'model'    => $this->model,
                'messages' => $messages,
                'stream'   => false,
            ]);

        if ($response->failed()) {
            Log::error('KbAssistant: Ollama request failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new RuntimeException("Ollama returned HTTP {$response->status()}");
        }

        return $response->json('message.content', '');
    }

    // ── Generate (einfacher Prompt, kein Chat-Format) ───────────────────

    public function generate(string $prompt, array $options = []): string
    {
        $response = Http::internal()
            ->timeout(120)
            ->post("{$this->ollamaUrl}/api/generate", [
                'model'   => $this->model,
                'prompt'  => $prompt,
                'stream'  => false,
                'options' => array_merge([
                    'temperature' => 0.7,
                    'num_predict' => 512,
                ], $options),
            ]);

        if ($response->failed()) {
            Log::error('KbAssistant: Ollama generate failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new RuntimeException("Ollama returned HTTP {$response->status()}");
        }

        return $response->json('response', '');
    }

    // ── Embedding (für zukünftige Vektor-Suche) ─────────────────────────

    public function embed(string $text): array
    {
        $response = Http::internal()
            ->timeout(60)
            ->post("{$this->ollamaUrl}/api/embeddings", [
                'model'  => $this->model,
                'prompt' => $text,
            ]);

        if ($response->failed()) {
            throw new RuntimeException("Ollama embeddings failed: HTTP {$response->status()}");
        }

        return $response->json('embedding', []);
    }

    // ── Modell-Info ─────────────────────────────────────────────────────

    public function listModels(): array
    {
        $response = Http::internal()
            ->get("{$this->ollamaUrl}/api/tags");

        if ($response->failed()) {
            return [];
        }

        return $response->json('models', []);
    }

    public function modelInfo(): array
    {
        $response = Http::internal()
            ->post("{$this->ollamaUrl}/api/show", [
                'name' => $this->model,
            ]);

        return $response->successful() ? $response->json() : [];
    }

    // ── Private ─────────────────────────────────────────────────────────

    private function defaultSystemPrompt(): string
    {
        return <<<'PROMPT'
Du bist ein hilfreicher Assistent für eine medizinische Praxis.
Du antwortest auf Deutsch, freundlich und professionell.
Du gibst keine medizinischen Diagnosen — verweise bei gesundheitlichen Fragen
immer an den zuständigen Arzt. Du hilfst bei Terminvereinbarungen,
allgemeinen Praxisinformationen und organisatorischen Fragen.
PROMPT;
    }
}
