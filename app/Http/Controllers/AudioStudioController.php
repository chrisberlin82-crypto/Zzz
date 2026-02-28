<?php

namespace App\Http\Controllers;

use App\Models\Practice;
use App\Models\AudioPrompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class AudioStudioController extends Controller
{
    /**
     * GET /api/practices/{practice}/audio/voices
     * Fetch available TTS voices from local Piper instance.
     */
    public function voices(Practice $practice): JsonResponse
    {
        $piperUrl = config('services.piper.url');

        try {
            $response = Http::internal()->get("{$piperUrl}/voices");

            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            report($e);
        }

        // Fallback: hardcoded Piper de_DE voices
        return response()->json([
            ['id' => 'de_DE-thorsten-high',  'lang' => 'de_DE', 'gender' => 'male',   'name' => 'Thomas'],
            ['id' => 'de_DE-eva_k-x_low',    'lang' => 'de_DE', 'gender' => 'female', 'name' => 'Anna'],
            ['id' => 'de_DE-pavoque-low',     'lang' => 'de_DE', 'gender' => 'male',   'name' => 'Markus'],
            ['id' => 'de_DE-kerstin-low',     'lang' => 'de_DE', 'gender' => 'female', 'name' => 'Sophie'],
            ['id' => 'de_DE-ramona-low',      'lang' => 'de_DE', 'gender' => 'female', 'name' => 'Lena'],
            ['id' => 'de_DE-mls-medium',      'lang' => 'de_DE', 'gender' => 'male',   'name' => 'Oliver'],
        ]);
    }

    /**
     * POST /api/practices/{practice}/audio/prompts
     * Store a new audio prompt record.
     */
    public function store(Request $request, Practice $practice): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'type'     => 'required|string|in:begruessung,warteschleife,abwesenheit,oeffnungszeiten,notfall,feiertag,weiterleitung,ivr_menue',
            'text'     => 'required|string|max:5000',
            'language' => 'required|string|max:10',
            'voice'    => 'required|string|max:100',
            'speed'    => 'nullable|string|in:langsam,normal,schnell',
            'bg_sound' => 'nullable|string|max:50',
            'bg_volume'=> 'nullable|integer|min:0|max:100',
        ]);

        $prompt = $practice->audioPrompts()->create([
            'name'      => $validated['name'],
            'type'      => $validated['type'],
            'text'      => $validated['text'],
            'language'  => $validated['language'],
            'voice'     => $validated['voice'],
            'speed'     => $validated['speed'] ?? 'normal',
            'bg_sound'  => $validated['bg_sound'] ?? null,
            'bg_volume' => $validated['bg_volume'] ?? 30,
        ]);

        return response()->json($prompt, 201);
    }

    /**
     * POST /api/practices/{practice}/audio/prompts/{prompt}/generate
     * Generate TTS audio via local Piper instance.
     */
    public function generate(Request $request, Practice $practice, AudioPrompt $prompt): JsonResponse
    {
        $piperUrl = config('services.piper.url');

        $payload = [
            'text'    => $prompt->text,
            'voice'   => $prompt->voice,
            'speed'   => $prompt->speed === 'langsam' ? 0.8 : ($prompt->speed === 'schnell' ? 1.2 : 1.0),
            'format'  => 'wav',
        ];

        try {
            $response = Http::internal()
                ->timeout(120)
                ->post("{$piperUrl}/generate", $payload);

            if ($response->successful()) {
                $filename = "audio/{$practice->id}/{$prompt->id}_" . time() . '.wav';
                Storage::disk('local')->put($filename, $response->body());

                $prompt->update([
                    'file_path'  => $filename,
                    'generated'  => true,
                    'generated_at' => now(),
                ]);

                return response()->json([
                    'status'    => 'ok',
                    'file_path' => $filename,
                    'prompt'    => $prompt->fresh(),
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Piper TTS returned ' . $response->status(),
            ], 502);
        } catch (\Exception $e) {
            report($e);
            return response()->json([
                'status'  => 'error',
                'message' => 'TTS generation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/practices/{practice}/audio/prompts
     */
    public function index(Practice $practice): JsonResponse
    {
        return response()->json(
            $practice->audioPrompts()->orderByDesc('updated_at')->get()
        );
    }
}
