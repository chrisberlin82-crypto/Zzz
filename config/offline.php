<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Offline Mode (LLM Lockdown)
    |--------------------------------------------------------------------------
    | When enabled, ALL outbound HTTP calls are blocked unless the target host
    | is in the allowed_hosts whitelist.  This guarantees that Ollama, Piper,
    | Whisper and Asterisk traffic stays inside the Docker network.
    */

    'enabled' => (bool) env('OFFLINE_MODE', true),

    'allowed_hosts' => array_filter(
        array_map('trim', explode(',', env('OFFLINE_ALLOWED_HOSTS',
            'ollama,piper,whisper,asterisk,localhost,127.0.0.1'
        )))
    ),

    'allowed_ports' => array_filter(
        array_map('intval', array_filter(
            array_map('trim', explode(',', env('OFFLINE_ALLOWED_PORTS', '')))
        ))
    ),
];
