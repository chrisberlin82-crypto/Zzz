<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AudioStudioController;
use App\Http\Controllers\VoicebotController;
use App\Http\Controllers\HealthController;

/*
|--------------------------------------------------------------------------
| API Routes — MedReception OFFLINE-LOCKDOWN
|--------------------------------------------------------------------------
| Alle AI-Routen nutzen Http::internal() → kein externer Traffic möglich.
*/

// ── Health ───────────────────────────────────────────────────────────────
Route::get('/health', HealthController::class);

// ── Audio Studio ─────────────────────────────────────────────────────────
Route::prefix('audio')->group(function () {
    Route::get('/voices',        [AudioStudioController::class, 'voices']);
    Route::get('/prompts',       [AudioStudioController::class, 'index']);
    Route::post('/prompts',      [AudioStudioController::class, 'store']);
    Route::post('/generate',     [AudioStudioController::class, 'generate']);
});

// ── Voicebot ─────────────────────────────────────────────────────────────
Route::prefix('voicebot')->group(function () {
    Route::post('/stt',    [VoicebotController::class, 'stt']);
    Route::post('/dialog', [VoicebotController::class, 'dialog']);
});

// ── KB Assistant (direkte Ollama-Abfrage) ────────────────────────────────
Route::prefix('assistant')->group(function () {
    Route::post('/ask', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'question' => 'required|string|max:2000',
            'context'  => 'nullable|string|max:10000',
        ]);

        $service = app(\App\Services\KbAssistantService::class);
        $answer  = $service->ask(
            $request->input('question'),
            $request->input('context')
        );

        return response()->json(['answer' => $answer]);
    });

    Route::get('/models', function () {
        $service = app(\App\Services\KbAssistantService::class);
        return response()->json(['models' => $service->listModels()]);
    });
});
