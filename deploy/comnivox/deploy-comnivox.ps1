# ============================================================
# Deploy Demo auf Comnivox Webspace (PowerShell)
# ============================================================
# WICHTIG: Die bestehende Homepage auf comnivox.com bleibt
# unangetastet! Die Demo wird in ein Unterverzeichnis deployed.
#
# Verwendung:
#   .\deploy-comnivox.ps1 -SshHost "chris@comnivox.com"
#
# Die Demo ist dann erreichbar unter:
#   https://comnivox.com/app/
#
# Voraussetzungen:
#   - OpenSSH-Client installiert (ab Windows 10 dabei)
#   - SSH-Zugang zum Webspace (Passwort oder SSH-Key)
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost
)

$ErrorActionPreference = "Stop"

$AppSubdir = "app"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = (Resolve-Path "$ScriptDir\..\..").Path
$RemoteDir = "public_html/$AppSubdir"

Write-Host ""
Write-Host "=== MED Rezeption Demo-Deployment auf Comnivox ===" -ForegroundColor Cyan
Write-Host "Host:   $SshHost"
Write-Host "Pfad:   $RemoteDir"
Write-Host "URL:    https://comnivox.com/$AppSubdir/"
Write-Host ""
Write-Host "SICHERHEIT: Die bestehende Homepage wird NICHT veraendert." -ForegroundColor Yellow
Write-Host "             Nur das Unterverzeichnis /$AppSubdir/ wird aktualisiert."
Write-Host ""

# Temporaeres Build-Verzeichnis
$BuildDir = Join-Path $env:TEMP "med-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

try {
    # [1/5] HTML/JS/CSS kopieren
    Write-Host "[1/5] Kopiere HTML/JS/CSS..." -ForegroundColor Green
    Copy-Item -Path "$ProjectDir\docs\*" -Destination $BuildDir -Recurse -Force

    # [2/5] PHP-Backend kopieren
    Write-Host "[2/5] Kopiere PHP-Backend..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "$BuildDir\src\php" -Force | Out-Null
    if (Test-Path "$ProjectDir\src\php\api.php") {
        Copy-Item "$ProjectDir\src\php\api.php" "$BuildDir\api.php"
    }
    if (Test-Path "$ProjectDir\src\php") {
        Copy-Item -Path "$ProjectDir\src\php\*" -Destination "$BuildDir\src\php\" -Recurse -Force
    }

    # Composer-Abhaengigkeiten
    if (Test-Path "$ProjectDir\vendor") {
        Write-Host "[2b/5] Kopiere Composer-Vendor..." -ForegroundColor Green
        Copy-Item -Path "$ProjectDir\vendor" -Destination "$BuildDir\vendor" -Recurse -Force
    }

    # [3/5] .htaccess kopieren
    Write-Host "[3/5] Kopiere .htaccess..." -ForegroundColor Green
    Copy-Item "$ScriptDir\.htaccess" "$BuildDir\.htaccess" -Force

    # [4/5] Unterverzeichnis auf Server erstellen
    Write-Host "[4/5] Erstelle Unterverzeichnis auf Server..." -ForegroundColor Green
    ssh $SshHost "mkdir -p $RemoteDir"

    # [5/5] Dateien hochladen per SCP
    Write-Host "[5/5] Lade Dateien hoch per SCP..." -ForegroundColor Green

    # Alle Dateien im Build-Verzeichnis hochladen
    # scp -r laedt rekursiv hoch
    scp -r "$BuildDir\*" "${SshHost}:${RemoteDir}/"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: SCP fehlgeschlagen!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "=== Demo erfolgreich deployed ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "URL:  https://comnivox.com/$AppSubdir/" -ForegroundColor Green
    Write-Host ""
    Write-Host "Hinweis: Die Demo laeuft komplett im Browser (localStorage)."
    Write-Host "         Das PHP-Backend ist optional fuer Server-seitige Daten."
    Write-Host "         Die Homepage auf comnivox.com wurde NICHT veraendert."
}
finally {
    # Aufraumen
    if (Test-Path $BuildDir) {
        Remove-Item -Path $BuildDir -Recurse -Force
    }
}
