<?php

return [

    'ollama' => [
        'url'   => env('OLLAMA_URL', 'http://ollama:11434'),
        'model' => env('OLLAMA_MODEL', 'llama3.2:3b'),
    ],

    'piper' => [
        'url' => env('PIPER_URL', 'http://piper:5500'),
    ],

    'whisper' => [
        'url' => env('WHISPER_URL', 'http://whisper:9000'),
    ],

    'asterisk' => [
        'ari_url'  => env('ASTERISK_ARI_URL', 'http://asterisk:8088'),
        'ari_user' => env('ASTERISK_ARI_USER', 'medreception'),
        'ari_pass' => env('ASTERISK_ARI_PASS', 'secret'),
    ],
];
