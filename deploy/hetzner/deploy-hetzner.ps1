# ============================================================
# Deploy Live auf Hetzner CPX Server (PowerShell)
# ============================================================
# Verwendung:
#   .\deploy-hetzner.ps1 -SshHost "root@46.225.86.170"
#
# Voraussetzungen:
#   - OpenSSH-Client (ab Windows 10 dabei)
#   - Docker + Docker Compose auf dem Server
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SshHost
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = (Resolve-Path "$ScriptDir\..\..").Path
$RemoteDir = "/opt/medrezeption"

Write-Host ""
Write-Host "=== MED Rezeption LIVE-Deployment auf Hetzner CPX ===" -ForegroundColor Cyan
Write-Host "Host:   $SshHost"
Write-Host "Remote: $RemoteDir"
Write-Host ""

# [1/5] Port 80 freimachen
Write-Host "[1/5] Mache Port 80 frei..." -ForegroundColor Green
ssh $SshHost "systemctl stop nginx 2>/dev/null; systemctl disable nginx 2>/dev/null; systemctl stop apache2 2>/dev/null; systemctl disable apache2 2>/dev/null; cd $RemoteDir/deploy/hetzner 2>/dev/null && docker compose down 2>/dev/null; fuser -k 80/tcp 2>/dev/null; sleep 1; echo 'Port 80 ist frei.'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNUNG: SSH-Befehl hatte Probleme, fahre trotzdem fort..." -ForegroundColor Yellow
}

# [2/5] Server vorbereiten
Write-Host "[2/5] Erstelle Verzeichnisse auf Server..." -ForegroundColor Green
ssh $SshHost "mkdir -p $RemoteDir/deploy/hetzner"
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: SSH-Verbindung fehlgeschlagen!" -ForegroundColor Red
    exit 1
}

# [3/5] Dateien hochladen per SCP (NUR Code, KEINE Daten)
Write-Host "[3/5] Lade Projekt hoch..." -ForegroundColor Green

# .env sichern bevor wir deploy/hetzner ueberschreiben
Write-Host "       Sichere .env..." -ForegroundColor Gray
ssh $SshHost "if [ -f $RemoteDir/deploy/hetzner/.env ]; then cp $RemoteDir/deploy/hetzner/.env /tmp/.env.backup; echo 'gesichert'; fi"

# NUR Code-Dateien hochladen - KEINE .env, KEINE Datenbanken
$uploadItems = @(
    @{ Local = "$ProjectDir\src";                  Remote = "$RemoteDir/src" },
    @{ Local = "$ProjectDir\pyproject.toml";       Remote = "$RemoteDir/pyproject.toml" },
    @{ Local = "$ProjectDir\deploy\hetzner";       Remote = "$RemoteDir/deploy/hetzner" }
)

foreach ($item in $uploadItems) {
    if (Test-Path $item.Local) {
        Write-Host "       $($item.Local | Split-Path -Leaf)..." -ForegroundColor Gray
        scp -r $item.Local "${SshHost}:$($item.Remote)" 2>$null
    }
}

# .env wiederherstellen
ssh $SshHost "if [ ! -f $RemoteDir/deploy/hetzner/.env ] && [ -f /tmp/.env.backup ]; then cp /tmp/.env.backup $RemoteDir/deploy/hetzner/.env; echo '.env wiederhergestellt'; fi"

# [4/5] .env pruefen
Write-Host "[4/5] Pruefe .env..." -ForegroundColor Green
ssh $SshHost "if [ ! -f $RemoteDir/deploy/hetzner/.env ]; then cp $RemoteDir/deploy/hetzner/.env.beispiel $RemoteDir/deploy/hetzner/.env 2>/dev/null && echo 'ACHTUNG: .env erstellt - API-Key muss noch eingetragen werden!'; else echo '.env existiert bereits.'; fi"

# [5/5] Docker starten
Write-Host "[5/5] Starte Container..." -ForegroundColor Green
ssh $SshHost "cd $RemoteDir/deploy/hetzner && docker compose down 2>/dev/null; fuser -k 80/tcp 2>/dev/null; docker compose build --no-cache && docker compose up -d && echo '' && echo 'Container-Status:' && docker compose ps"
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Docker-Start fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Logs pruefen: ssh $SshHost 'cd $RemoteDir/deploy/hetzner && docker compose logs'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Live-System erfolgreich deployed ===" -ForegroundColor Cyan
Write-Host ""
$ServerIp = $SshHost -replace '.*@', ''
Write-Host "  URL:    http://$ServerIp" -ForegroundColor Green
Write-Host "  Status: ssh $SshHost 'cd $RemoteDir/deploy/hetzner && docker compose ps'"
Write-Host "  Logs:   ssh $SshHost 'cd $RemoteDir/deploy/hetzner && docker compose logs -f'"
Write-Host ""
Write-Host "WICHTIG: Falls noch nicht geschehen, API-Key eintragen:" -ForegroundColor Yellow
Write-Host "  ssh $SshHost 'nano $RemoteDir/deploy/hetzner/.env'"
Write-Host "  ssh $SshHost 'cd $RemoteDir/deploy/hetzner && docker compose restart web'"
Write-Host ""
