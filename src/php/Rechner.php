<?php

declare(strict_types=1);

namespace Zzz;

class Rechner
{
    public function addieren(float $a, float $b): float
    {
        return $a + $b;
    }

    public function subtrahieren(float $a, float $b): float
    {
        return $a - $b;
    }

    public function multiplizieren(float $a, float $b): float
    {
        return $a * $b;
    }

    public function dividieren(float $a, float $b): float
    {
        if ($b == 0) {
            throw new \InvalidArgumentException('Division durch Null ist nicht erlaubt');
        }
        return $a / $b;
    }
}
