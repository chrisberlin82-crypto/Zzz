<?php

declare(strict_types=1);

namespace Zzz\Tests;

use PHPUnit\Framework\TestCase;
use Zzz\JsonHelper;

class JsonHelperTest extends TestCase
{
    private JsonHelper $helper;
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->helper = new JsonHelper();
        $this->tmpDir = sys_get_temp_dir() . '/zzz_test_' . uniqid();
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->tmpDir . '/*'));
        rmdir($this->tmpDir);
    }

    public function testLaden(): void
    {
        $datei = $this->tmpDir . '/test.json';
        file_put_contents($datei, '{"name": "Test"}');

        $ergebnis = $this->helper->laden($datei);
        $this->assertSame(['name' => 'Test'], $ergebnis);
    }

    public function testLadenDateiNichtGefunden(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->helper->laden('/nicht/vorhanden.json');
    }

    public function testSpeichernUndLaden(): void
    {
        $datei = $this->tmpDir . '/ausgabe.json';
        $daten = ['schluessel' => 'wert', 'zahl' => 42];

        $this->helper->speichern($daten, $datei);
        $geladen = $this->helper->laden($datei);

        $this->assertSame($daten, $geladen);
    }

    public function testIstGueltigesJson(): void
    {
        $this->assertTrue($this->helper->istGueltigesJson('{"key": "value"}'));
    }

    public function testIstUngueltigesJson(): void
    {
        $this->assertFalse($this->helper->istGueltigesJson('{ungueltig}'));
    }
}
