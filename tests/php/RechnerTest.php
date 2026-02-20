<?php

declare(strict_types=1);

namespace Zzz\Tests;

use PHPUnit\Framework\TestCase;
use Zzz\Rechner;

class RechnerTest extends TestCase
{
    private Rechner $rechner;

    protected function setUp(): void
    {
        $this->rechner = new Rechner();
    }

    public function testAddieren(): void
    {
        $this->assertSame(5.0, $this->rechner->addieren(2, 3));
    }

    public function testAddiereNegativeZahlen(): void
    {
        $this->assertSame(-3.0, $this->rechner->addieren(-1, -2));
    }

    public function testSubtrahieren(): void
    {
        $this->assertSame(2.0, $this->rechner->subtrahieren(5, 3));
    }

    public function testMultiplizieren(): void
    {
        $this->assertSame(12.0, $this->rechner->multiplizieren(3, 4));
    }

    public function testMultiplizierenMitNull(): void
    {
        $this->assertSame(0.0, $this->rechner->multiplizieren(5, 0));
    }

    public function testDividieren(): void
    {
        $this->assertSame(5.0, $this->rechner->dividieren(10, 2));
    }

    public function testDivisionDurchNull(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Division durch Null');
        $this->rechner->dividieren(10, 0);
    }
}
