# CLAUDE.md

## Project Overview

**MED Rezeption** (Zzz) is a web-based medical practice management system with integrated VoIP, voicebot, and AI assistant capabilities. It supports multiple business types (medical, dental, legal, accounting, etc.) through a configurable branch/industry system.

The entire UI, documentation, database schema, and code comments are in **German**.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Backend:** Python 3.11 (Flask) + PHP 8.2 (native, no framework) — dual implementations with identical APIs
- **Database:** SQLite with WAL mode and foreign keys enabled
- **Telephony:** Asterisk (AGI scripts, SIP/WebRTC)
- **AI/LLM:** Anthropic Claude or OpenAI GPT (configurable via environment variables)
- **Testing:** pytest (Python), PHPUnit 11 (PHP), Node.js (JavaScript)
- **CI/CD:** GitHub Actions
- **Deployment:** Docker, Gunicorn, Nginx with Let's Encrypt SSL

## Repository Structure

```
├── src/
│   ├── html/              # Frontend: 12 HTML pages, app.js, style.css
│   ├── php/               # PHP backend: api.php, Datenbank.php, Rechner.php, JsonHelper.php
│   ├── python/            # Python backend: app.py, datenbank.py, rechner.py, validator.py, llm_service.py
│   └── json/schemas/      # JSON Schema Draft-7 validation files
├── tests/
│   ├── python/            # pytest test files
│   ├── php/               # PHPUnit test files
│   ├── html/              # JS and HTML validation tests
│   └── asterisk/          # Voicebot AGI tests
├── asterisk/              # Asterisk VoIP config (extensions, SIP, queues, voicebot AGI)
├── deploy/
│   ├── hetzner/           # Production: Docker Compose, Nginx, deploy script
│   └── comnivox/          # Alternative deployment config
├── docs/                  # Documentation and screenshots
├── .github/workflows/     # CI: tests.yml, pages.yml
├── composer.json           # PHP deps (php >=8.1, phpunit ^11.0, json-schema ^6.0)
├── pyproject.toml          # Python deps (flask >=3.0, jsonschema >=4.0, pytest >=8.0)
├── phpunit.xml             # PHPUnit config (bootstrap: vendor/autoload.php)
├── Dockerfile              # Local dev image (python:3.11-slim)
└── docker-compose.yml      # Local dev orchestration
```

## Build & Run Commands

### Python Backend

```bash
# Install dependencies
pip install flask jsonschema

# Install dev dependencies
pip install pytest pytest-cov

# Run the Flask dev server
FLASK_APP=src/python/app.py flask run

# Run with Docker
docker compose up
```

### PHP Backend

```bash
# Install dependencies
composer install

# Start PHP built-in server (if needed)
php -S localhost:8000 -t src/php/
```

### Environment Variables (for LLM features)

```
MED_LLM_PROVIDER=anthropic    # or "openai"
MED_LLM_API_KEY=sk-ant-...
MED_LLM_MODEL=                # optional model override
MED_BRANCHE=arztpraxis        # default industry type
```

## Testing

### Run All Tests

```bash
# Python tests (with coverage)
python -m pytest tests/python/ tests/asterisk/ -v --tb=short

# PHP tests
vendor/bin/phpunit tests/php/ --colors=always

# JavaScript tests
node tests/html/test_app.js
```

### Coverage Requirements

- Python: **80% minimum** coverage enforced (`pyproject.toml` → `fail_under = 80`)
- Coverage source: `src/python/`
- Coverage is reported with `--cov=src/python --cov-report=term-missing`

### CI Pipeline (GitHub Actions)

Runs on push/PR to `main`/`master` with three parallel jobs:
- **Python Tests:** Python 3.11, installs flask/pytest/pytest-cov
- **PHP Tests:** PHP 8.2 with pdo_sqlite, composer install, PHPUnit
- **JavaScript Tests:** Node.js 20, runs `node tests/html/test_app.js`

## Coding Conventions

### Language

All identifiers, comments, UI strings, and database columns use **German**:
- Create = `erstellen`, Read = `alle`/`nachId`, Update = `aktualisieren`, Delete = `loeschen`, Search = `suchen`
- Error key: `"fehler"` (not "error")
- Timestamp column: `erstellt_am`

### PHP

- **Strict types:** `declare(strict_types=1);`
- **Namespace:** `Zzz`
- **PSR-4 autoloading:** `Zzz\` maps to `src/php/`
- **Naming:** PascalCase classes (`Datenbank`, `JsonHelper`), camelCase methods (`benutzerErstellen`, `patientNachId`)
- **Type hints:** Required on all method parameters and return types
- **Database:** PDO with named `:placeholder` parameters, parameterized queries only
- **API responses:** `json_encode()` with explicit `http_response_code()`
- **Error format:** `{"fehler": "description"}`

### Python

- **Module docstrings** on every file (German)
- **snake_case** for all functions and variables (`benutzer_erstellen`, `patient_nach_id`)
- **Type hints** on function signatures
- **Flask patterns:** `@app.route()` decorators, `jsonify()` responses, per-request DB connections
- **Database:** `sqlite3` with `Row` factory, parameterized `?` queries
- **Validation:** `jsonschema` Draft-7 via `src/json/schemas/`

### JavaScript

- **Global config:** `API_BASE = "/api"`, `MED_MODUS`, `MED_BRANCHE`
- **camelCase** functions with verb-first naming (`apiAbruf`, `benutzerErstellen`, `patientLoeschen`)
- **Dual mode:** "demo" (localStorage) vs "live" (backend API)
- **DOM manipulation:** `getElementById`, `addEventListener`, `innerHTML`
- **No build step** — vanilla JS, no bundler or transpiler

### Database

- SQLite with `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON`
- German table/column names: `benutzer`, `patienten`, `aerzte`, `termine`, `wartezimmer`, `agenten`, `anrufe`
- All tables include `erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Unique constraints: email (benutzer), versicherungsnummer (patienten), nebenstelle (agenten)
- Status fields stored as TEXT enums (e.g., `wartend`/`aufgerufen`/`in_behandlung`/`fertig`)
- Date format: `YYYY-MM-DD` as TEXT

### API Design

- RESTful: resource-oriented URLs (`/api/patienten`, `/api/patienten/{id}`)
- Standard HTTP methods: GET (list/read), POST (create), PUT (update), DELETE (remove)
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 409 (Conflict), 422 (Validation Error)
- JSON request and response bodies
- PHP and Python backends expose **identical endpoints and response formats**

### JSON Schemas (`src/json/schemas/`)

- Draft-7 format with `additionalProperties: false` (strict)
- German field names matching database columns
- PLZ validation: `^[0-9]{5}$` (German postal codes)
- Date validation: `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`
- Shared between PHP and Python validation layers

## Architecture Notes

### Dual Backend Pattern

Both PHP (`src/php/`) and Python (`src/python/`) implement the same REST API. Changes to business logic, endpoints, or database schema should be mirrored in both implementations to maintain parity.

### Dual Mode Operation

The frontend operates in two modes:
- **Demo mode:** All data stored in `localStorage`, no backend required (for GitHub Pages deployment)
- **Live mode:** Connects to backend API, optional LLM features enabled

Mode is auto-detected by checking `/api/llm/status` on page load.

### Industry Configuration

The system supports 8 business types configured via `MED_BRANCHE`: `arztpraxis`, `zahnarzt`, `anwalt`, `steuerberater`, `friseur`, `werkstatt`, `tierarzt`, `allgemein`. UI labels adapt dynamically based on the selected branch.

### LLM Integration

- Provider-agnostic: supports Anthropic (Claude) and OpenAI (GPT)
- Restricted context: AI is limited to office assistant tasks, no medical diagnosis
- Three capabilities: office chat, voicebot dialog, real-time translation
- Configured via `MED_LLM_PROVIDER`, `MED_LLM_API_KEY`, `MED_LLM_MODEL`

## Deployment

- **Local dev:** `docker compose up` (Flask dev server on port 5000)
- **Production (Hetzner):** `deploy/hetzner/` — Gunicorn (4 workers), Nginx reverse proxy, Let's Encrypt SSL, health checks
- **Static frontend:** GitHub Pages via `.github/workflows/pages.yml`

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add a new API endpoint | `src/php/api.php`, `src/python/app.py` |
| Add a new database table | `src/php/Datenbank.php`, `src/python/datenbank.py` |
| Add a new frontend page | `src/html/` (new .html), `src/html/app.js` (add logic) |
| Add a JSON validation schema | `src/json/schemas/` (new .json file) |
| Modify call routing | `asterisk/extensions.conf` |
| Add a PHP test | `tests/php/` (extend existing or new *Test.php) |
| Add a Python test | `tests/python/` (extend existing or new test_*.py) |
| Update CI pipeline | `.github/workflows/tests.yml` |
