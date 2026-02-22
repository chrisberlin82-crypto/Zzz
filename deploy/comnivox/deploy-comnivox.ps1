# ============================================================
# Deploy MED Rezeption auf Comnivox Webspace (PowerShell)
# ============================================================
# Deployed direkt in public_html/ -> comnivox.com
# Die alte Wartungsseite wird ersetzt.
#
# Verwendung:
#   .\deploy-comnivox.ps1 -SshHost "chris@comnivox.com"
#
# Ergebnis:
#   https://comnivox.com
#
# Voraussetzungen:
#   - OpenSSH-Client (ab Windows 10 dabei)
#   - SSH-Zugang zum Webspace
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = (Resolve-Path "$ScriptDir\..\..").Path
$RemoteDir = "public_html"

Write-Host ""
Write-Host "=== MED Rezeption Deployment auf Comnivox ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Host:     $SshHost"
Write-Host "  Remote:   $RemoteDir"
Write-Host "  URL:      https://comnivox.com"
Write-Host ""
Write-Host "  ACHTUNG: Die aktuelle Wartungsseite wird ersetzt!" -ForegroundColor Yellow
Write-Host "           comnivox.com zeigt danach MED Rezeption."
Write-Host ""

$antwort = Read-Host "Deployment starten? (j/n)"
if ($antwort -ne "j") {
    Write-Host "Abgebrochen." -ForegroundColor Red
    exit 0
}

# Temporaeres Build-Verzeichnis
$BuildDir = Join-Path $env:TEMP "med-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

try {
    # [1/6] HTML/JS/CSS kopieren
    Write-Host ""
    Write-Host "[1/6] Kopiere HTML/JS/CSS..." -ForegroundColor Green
    Copy-Item -Path "$ProjectDir\docs\*" -Destination $BuildDir -Recurse -Force

    # [2/6] PHP-Backend kopieren
    Write-Host "[2/6] Kopiere PHP-Backend..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "$BuildDir\src\php" -Force | Out-Null
    if (Test-Path "$ProjectDir\src\php\api.php") {
        Copy-Item "$ProjectDir\src\php\api.php" "$BuildDir\api.php"
    }
    if (Test-Path "$ProjectDir\src\php") {
        Copy-Item -Path "$ProjectDir\src\php\*" -Destination "$BuildDir\src\php\" -Recurse -Force
    }

    # Composer-Abhaengigkeiten
    if (Test-Path "$ProjectDir\vendor") {
        Write-Host "       Kopiere Composer-Vendor..." -ForegroundColor Green
        Copy-Item -Path "$ProjectDir\vendor" -Destination "$BuildDir\vendor" -Recurse -Force
    }

    # [3/6] .htaccess kopieren
    Write-Host "[3/6] Kopiere .htaccess..." -ForegroundColor Green
    Copy-Item "$ScriptDir\.htaccess" "$BuildDir\.htaccess" -Force

    # [4/6] Alte Dateien auf Server aufraemen (NUR Inhalte, nicht den Ordner selbst)
    Write-Host "[4/6] Raeume altes $RemoteDir/ auf..." -ForegroundColor Green
    ssh $SshHost "rm -rf $RemoteDir/* && mkdir -p $RemoteDir"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: SSH-Verbindung fehlgeschlagen!" -ForegroundColor Red
        exit 1
    }

    # [5/6] Dateien hochladen per SCP
    Write-Host "[5/6] Lade Dateien hoch per SCP..." -ForegroundColor Green
    scp -r "$BuildDir\*" "${SshHost}:${RemoteDir}/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: SCP fehlgeschlagen!" -ForegroundColor Red
        exit 1
    }

    # .htaccess separat hochladen (wird von scp * manchmal uebersprungen)
    scp "$BuildDir\.htaccess" "${SshHost}:${RemoteDir}/.htaccess"

    # [6/6] Pruefen ob Upload erfolgreich war
    Write-Host "[6/6] Pruefe Upload..." -ForegroundColor Green
    $dateiAnzahl = ssh $SshHost "find $RemoteDir -type f | wc -l"
    Write-Host "       $dateiAnzahl Dateien auf Server." -ForegroundColor Gray

    Write-Host ""
    Write-Host "=== MED Rezeption erfolgreich deployed ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  URL:  https://comnivox.com" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Die Demo laeuft im Browser (localStorage)."
    Write-Host "  PHP-Backend ist optional fuer Server-seitige Daten."
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "FEHLER: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Moegliche Ursachen:" -ForegroundColor Yellow
    Write-Host "  - SSH-Key nicht eingerichtet (ssh-keygen, dann Key auf Server kopieren)"
    Write-Host "  - Falscher Benutzername oder Server"
    Write-Host "  - Firewall blockiert Port 22"
    Write-Host ""
    exit 1
}
finally {
    # Aufraemen
    if (Test-Path $BuildDir) {
        Remove-Item -Path $BuildDir -Recurse -Force
    }
}
