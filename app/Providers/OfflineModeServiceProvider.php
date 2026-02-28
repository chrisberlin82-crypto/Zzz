<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\PendingRequest;
use RuntimeException;

class OfflineModeServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $enabled      = config('offline.enabled', true);
        $allowedHosts = config('offline.allowed_hosts', []);
        $allowedPorts = config('offline.allowed_ports', []);

        if ($enabled) {
            Http::macro('internal', function () use ($allowedHosts, $allowedPorts): PendingRequest {
                return Http::acceptJson()
                    ->timeout(60)
                    ->retry(1, 200)
                    ->beforeSending(function ($request) use ($allowedHosts, $allowedPorts) {
                        $uri  = $request->toPsrRequest()->getUri();
                        $host = strtolower($uri->getHost());
                        $port = $uri->getPort();

                        if (! in_array($host, $allowedHosts, true)) {
                            throw new RuntimeException(
                                "OFFLINE_MODE: Outbound HTTP blocked to [{$host}]. "
                                . "Allowed hosts: " . implode(', ', $allowedHosts)
                            );
                        }

                        if (! empty($allowedPorts) && $port && ! in_array((int) $port, $allowedPorts, true)) {
                            throw new RuntimeException(
                                "OFFLINE_MODE: Outbound HTTP blocked to [{$host}:{$port}]. "
                                . "Allowed ports: " . implode(', ', $allowedPorts)
                            );
                        }
                    });
            });
        } else {
            Http::macro('internal', function (): PendingRequest {
                return Http::acceptJson();
            });
        }
    }
}
