<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class VoicebotController extends Controller
{
    /**
     * POST /api/voicebot/stt
     * Send audio to local Whisper for speech-to-text.
     */
    public function stt(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file|mimes:wav,mp3,ogg,webm,flac|max:25600',
            'language' => 'nullable|string|max:10',
        ]);

        $whisperUrl = config('services.whisper.url');
        $file       = $request->file('audio');

        try {
            $response = Http::internal()
                ->timeout(120)
                ->attach('audio', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("{$whisperUrl}/transcribe", [
                    'language' => $request->input('language', 'de'),
                ]);

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'error' => 'Whisper STT returned ' . $response->status(),
            ], 502);
        } catch (\Exception $e) {
            report($e);
            return response()->json([
                'error' => 'STT failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/voicebot/dialog
     * Full dialog turn: STT -> LLM -> TTS (all local).
     */
    public function dialog(Request $request): JsonResponse
    {
        $request->validate([
            'text'       => 'required_without:audio|string|max:2000',
            'audio'      => 'required_without:text|file',
            'session_id' => 'nullable|string',
            'context'    => 'nullable|array',
        ]);

        $ollamaUrl   = config('services.ollama.url');
        $ollamaModel = config('services.ollama.model');

        $userText = $request->input('text', '');

        // Step 1: STT if audio provided
        if ($request->hasFile('audio') && empty($userText)) {
            $whisperUrl = config('services.whisper.url');
            $file = $request->file('audio');

            try {
                $sttResponse = Http::internal()
                    ->timeout(120)
                    ->attach('audio', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                    ->post("{$whisperUrl}/transcribe", ['language' => 'de']);

                if ($sttResponse->successful()) {
                    $userText = $sttResponse->json('text', '');
                }
            } catch (\Exception $e) {
                report($e);
                return response()->json(['error' => 'STT failed'], 502);
            }
        }

        if (empty($userText)) {
            return response()->json(['error' => 'No input text'], 422);
        }

        // Step 2: LLM via Ollama
        $systemPrompt = $request->input('context.system_prompt',
            'Du bist eine freundliche Empfangsassistentin einer Arztpraxis. Antworte kurz und professionell.'
        );

        try {
            $llmResponse = Http::internal()
                ->timeout(120)
                ->post("{$ollamaUrl}/api/chat", [
                    'model'    => $ollamaModel,
                    'messages' => [
                        ['role' => 'system',    'content' => $systemPrompt],
                        ['role' => 'user',      'content' => $userText],
                    ],
                    'stream' => false,
                ]);

            if (! $llmResponse->successful()) {
                return response()->json(['error' => 'LLM returned ' . $llmResponse->status()], 502);
            }

            $botText = $llmResponse->json('message.content', '');
        } catch (\Exception $e) {
            report($e);
            return response()->json(['error' => 'LLM failed: ' . $e->getMessage()], 502);
        }

        // Step 3: TTS via Piper (optional, only if requested)
        $audioBase64 = null;
        if ($request->boolean('generate_audio', false)) {
            $piperUrl = config('services.piper.url');
            try {
                $ttsResponse = Http::internal()
                    ->timeout(60)
                    ->post("{$piperUrl}/generate", [
                        'text'  => $botText,
                        'voice' => $request->input('context.voice', 'de_DE-thorsten-high'),
                        'speed' => 1.0,
                    ]);

                if ($ttsResponse->successful()) {
                    $audioBase64 = base64_encode($ttsResponse->body());
                }
            } catch (\Exception $e) {
                report($e);
            }
        }

        return response()->json([
            'user_text'    => $userText,
            'bot_text'     => $botText,
            'audio_base64' => $audioBase64,
            'model'        => $ollamaModel,
        ]);
    }
}
