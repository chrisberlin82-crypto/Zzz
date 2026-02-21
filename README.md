# MED Rezeption - Praxisverwaltung

Medizinische Praxisverwaltung mit Voicebot, Callflow-Editor, Softphone und Echtzeit-Uebersetzer.

## Frontend-Seiten

### Dashboard
![Dashboard](docs/screenshots/dashboard.svg)

### Patienten
![Patienten](docs/screenshots/patienten.svg)

### Aerzte
![Aerzte](docs/screenshots/aerzte.svg)

### Termine
![Termine](docs/screenshots/termine.svg)

### Wartezimmer
![Wartezimmer](docs/screenshots/wartezimmer.svg)

### Callflow Editor
![Callflow Editor](docs/screenshots/callflow.svg)

### Voicebot
![Voicebot](docs/screenshots/voicebot.svg)

### Agenten & Telefonie
![Agenten](docs/screenshots/agenten.svg)

### Softphone
![Softphone](docs/screenshots/softphone.svg)

### Uebersetzer
![Uebersetzer](docs/screenshots/uebersetzer.svg)

### Benutzer & Rechner
![Benutzer](docs/screenshots/benutzer.svg)

## Backend-Architektur

### Python Backend (Flask)
![Python Backend](docs/screenshots/backend-python.svg)

### PHP Backend
![PHP Backend](docs/screenshots/backend-php.svg)

### Asterisk Voicebot (AGI)
![Asterisk Voicebot](docs/screenshots/asterisk-voicebot.svg)

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Python (Flask), PHP 8.2 |
| Datenbank | SQLite (WAL-Modus) |
| Telefonie | Asterisk (AGI), SIP/WebRTC |
| Tests | pytest, PHPUnit, Node.js |
| CI/CD | GitHub Actions |

## Projektstruktur

```
src/
  html/          Frontend (11 Seiten + CSS + JS)
  python/        Python-Backend (Flask API + SQLite)
  php/           PHP-Backend (API + PDO)
  json/schemas/  JSON-Schemas fuer Validierung
asterisk/        Voicebot AGI-Script
tests/           Python-, PHP- und HTML-Tests
docs/screenshots/ Vorschaubilder
```

## Starten

```bash
# Python-Backend
pip install flask
python -m src.python.app

# PHP-Backend
php -S localhost:8080 src/php/api.php

# Tests
python -m pytest tests/ -v
vendor/bin/phpunit tests/php/
```
