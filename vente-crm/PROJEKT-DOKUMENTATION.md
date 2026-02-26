# Vente CRM - Vollstaendige Projektdokumentation

> Energievertrieb CRM-System fuer Strom- und Gas-Vertriebsteams
> Stand: 24.02.2026

---

## Inhaltsverzeichnis

1. [Projektuebersicht](#1-projektuebersicht)
2. [Systemarchitektur](#2-systemarchitektur)
3. [Schnellstart-Anleitung](#3-schnellstart-anleitung)
4. [Projektstruktur](#4-projektstruktur)
5. [Backend-Dokumentation](#5-backend-dokumentation)
6. [Frontend-Dokumentation](#6-frontend-dokumentation)
7. [Datenbank-Schema](#7-datenbank-schema)
8. [API-Endpunkte](#8-api-endpunkte)
9. [Rollen & Berechtigungen](#9-rollen--berechtigungen)
10. [Deployment](#10-deployment)
11. [Backup & Restore](#11-backup--restore)
12. [Konfiguration](#12-konfiguration)
13. [Standard-Zugaenge](#13-standard-zugaenge)

---

## 1. Projektuebersicht

### Was ist Vente CRM?

Ein vollstaendiges CRM-System fuer Energievertriebler (Strom/Gas) mit:

- **Kundenverwaltung** - DSGVO-konform, Privat- und Geschaeftskunden
- **Vertragspipeline** - Lead bis Abschluss mit Status-Tracking
- **Produktkatalog** - Strom/Gas-Tarife mit Provisionsmodellen
- **Digitale Unterschrift** - SHA-256 Hash, GPS, GoBD-konform
- **Ausgabenverwaltung** - EUeR-konforme Spesenerfassung mit SKR03-Konten
- **Adresslisten & Karten** - Excel-Import, Geocoding, Leaflet-Karten
- **Team-Karte** - Echtzeit-Standorte der Vertriebler
- **Verkaufs-Wizard** - Gefuehrter Prozess: Kunde -> Vertrag -> Unterschrift
- **Dashboard** - KPIs, Pipeline-Uebersicht, Forecasts
- **Audit-Log** - GoBD-konforme Protokollierung aller Aenderungen
- **Rollensystem** - ADMIN, STANDORTLEITUNG, TEAMLEAD, VERTRIEB

### Tech-Stack

| Komponente | Technologie | Version |
|---|---|---|
| **Frontend** | React + Material UI | React 18, MUI 5 |
| **Backend** | Node.js + Express | Node 18, Express 4 |
| **Datenbank** | PostgreSQL | 15 |
| **Cache** | Redis | 7 |
| **ORM** | Sequelize | 6 |
| **Reverse Proxy** | Nginx | Alpine |
| **Container** | Docker + Docker Compose | - |
| **Karten** | Leaflet + OpenStreetMap | - |
| **Charts** | Recharts | 2 |

---

## 2. Systemarchitektur

```
                    Internet
                       |
                   [Port 80/443]
                       |
                  +-----------+
                  |   Nginx   |  (Reverse Proxy, SSL, Rate Limiting)
                  +-----------+
                   /         \
                  /           \
         +----------+    +-----------+
         | Frontend |    |  Backend  |
         | (React)  |    | (Express) |
         | Port 80  |    | Port 3001 |
         +----------+    +-----------+
                              |    \
                              |     \
                      +-------+   +-------+
                      |Postgres|  | Redis |
                      |Port5432|  |Port6379|
                      +--------+  +-------+
```

### Docker-Container

| Container | Image | Funktion |
|---|---|---|
| `vente-nginx` | nginx:alpine | SSL-Terminierung, Routing, Caching |
| `vente-frontend` | Node 18 -> Nginx | React SPA (gebaut) |
| `vente-backend` | Node 18 | Express API Server |
| `vente-postgres` | postgres:15-alpine | PostgreSQL Datenbank |
| `vente-redis` | redis:7-alpine | Session-Cache |

---

## 3. Schnellstart-Anleitung

### Voraussetzungen

- Docker & Docker Compose
- Git
- OpenSSL (fuer SSL-Zertifikate)
- Mind. 2 GB RAM, 10 GB Festplatte

### Option A: Automatisches Setup (empfohlen)

```bash
# 1. Repository klonen
git clone <repository-url>
cd vente-crm

# 2. Setup-Script ausfuehren (erstellt .env, SSL, startet Container, migriert DB)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Das Setup-Script macht automatisch:
- Generiert sichere Passwoerter (DB, Redis, JWT)
- Erstellt `.env` aus `.env.example`
- Erstellt selbst-signierte SSL-Zertifikate
- Startet alle Docker-Container
- Fuehrt Datenbank-Migrationen aus
- Fuellt Testdaten (Seeders)

### Option B: Manuelles Setup

```bash
# 1. Repository klonen
git clone <repository-url>
cd vente-crm

# 2. Environment-Datei erstellen
cp .env.example .env
# .env bearbeiten und alle CHANGE_ME Werte ersetzen

# 3. Verzeichnisse erstellen
mkdir -p uploads/{receipts,signatures,documents,address-lists,temp}
mkdir -p backups logs nginx/ssl

# 4. SSL-Zertifikat erstellen (Development)
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout nginx/ssl/private.key \
    -out nginx/ssl/cert.pem \
    -subj "/CN=localhost"

# 5. Container starten
docker compose up -d --build

# 6. Datenbank migrieren
docker exec vente-backend npx sequelize-cli db:migrate \
    --config src/config/database.js \
    --migrations-path src/database/migrations

# 7. Testdaten einfuegen
docker exec vente-backend npx sequelize-cli db:seed:all \
    --config src/config/database.js \
    --seeders-path src/database/seeders
```

### Option C: Hetzner Server Deployment

```bash
# Vom lokalen Rechner:
./scripts/deploy-hetzner.sh <SERVER-IP> [root] [domain.de]

# Oder direkt auf dem Server:
sudo bash scripts/bootstrap-server.sh
```

### Zugriff

- **HTTPS**: https://localhost (oder https://SERVER-IP)
- **HTTP**: http://localhost (leitet auf HTTPS um)
- **API Health**: https://localhost/api/health

---

## 4. Projektstruktur

```
vente-crm/                              103 Dateien
|
+-- .env.example                        Umgebungsvariablen-Vorlage
+-- .gitignore                          Git-Ausnahmen
+-- docker-compose.yml                  Container-Orchestrierung
+-- PROJEKT-DOKUMENTATION.md            Diese Datei
|
+-- backend/                            Node.js/Express API (56 Dateien)
|   +-- .dockerignore
|   +-- .sequelizerc                    Sequelize CLI-Konfiguration
|   +-- Dockerfile                      Multi-Stage Build
|   +-- package.json                    Dependencies & Scripts
|   +-- src/
|       +-- server.js                   Haupteinstiegspunkt
|       +-- config/
|       |   +-- database.js             DB-Konfiguration (dev/test/prod)
|       |   +-- redis.js                Redis-Client
|       +-- controllers/
|       |   +-- authController.js       Login, Register, JWT, Profil
|       |   +-- customerController.js   CRUD Kunden
|       |   +-- contractController.js   CRUD Vertraege, Pipeline
|       |   +-- productController.js    CRUD Produkte
|       |   +-- expenseController.js    Ausgaben, Steuerberechnung, Export
|       |   +-- addressController.js    Excel-Import, Geocoding, Karten
|       |   +-- signatureController.js  Digitale Unterschrift, Verifikation
|       |   +-- dashboardController.js  KPIs, Pipeline-Uebersicht
|       |   +-- userController.js       Benutzerverwaltung, Standorte
|       +-- middleware/
|       |   +-- auth.js                 JWT-Authentifizierung
|       |   +-- rbac.js                 Rollen & Berechtigungen
|       |   +-- validate.js             Request-Validierung
|       |   +-- audit.js                GoBD Audit-Logging
|       +-- models/
|       |   +-- index.js                Sequelize-Setup & Assoziationen
|       |   +-- User.js                 Benutzer (inkl. GPS-Tracking)
|       |   +-- Customer.js             Kunden (Privat/Business)
|       |   +-- Contract.js             Vertraege (Pipeline)
|       |   +-- Product.js              Strom/Gas-Tarife
|       |   +-- Expense.js              Ausgaben (EUeR)
|       |   +-- ExpenseCategory.js      SKR03-Konten
|       |   +-- AddressList.js          Adresslisten
|       |   +-- Address.js              Einzeladressen (mit GPS)
|       |   +-- Signature.js            Digitale Unterschriften
|       |   +-- AuditLog.js             Audit-Protokoll
|       +-- routes/
|       |   +-- auth.js                 /api/auth/*
|       |   +-- customers.js            /api/customers/*
|       |   +-- contracts.js            /api/contracts/*
|       |   +-- products.js             /api/products/*
|       |   +-- expenses.js             /api/expenses/*
|       |   +-- addresses.js            /api/address-lists/*
|       |   +-- signatures.js           /api/signatures/*
|       |   +-- dashboard.js            /api/dashboard/*
|       |   +-- users.js                /api/users/*
|       +-- database/
|       |   +-- migrations/             11 Migrationsdateien
|       |   +-- seeders/                5 Seeder-Dateien
|       +-- utils/
|           +-- logger.js               Winston Logger + Audit Logger
|
+-- frontend/                           React-Anwendung (24 Dateien)
|   +-- .dockerignore
|   +-- Dockerfile                      Multi-Stage Build (Build -> Nginx)
|   +-- nginx.conf                      SPA-Routing
|   +-- package.json                    Dependencies
|   +-- public/
|   |   +-- index.html
|   |   +-- manifest.json
|   |   +-- robots.txt
|   +-- src/
|       +-- App.js                      Router & Auth-Guard
|       +-- index.js                    React-Einstiegspunkt
|       +-- theme.js                    MUI-Theme (Bordeaux #7A1B2D)
|       +-- context/
|       |   +-- AuthContext.js          Auth-State, Token-Refresh
|       +-- components/common/
|       |   +-- Layout.js               Sidebar, Topbar, Navigation
|       +-- services/
|       |   +-- api.js                  Axios-Client, API-Wrapper
|       +-- pages/
|           +-- LoginPage.js            Anmeldung
|           +-- RegisterPage.js         Registrierung
|           +-- DashboardPage.js        KPIs, Charts, Pipeline
|           +-- CustomersPage.js        Kundenliste, Filter, CRUD
|           +-- CustomerDetailPage.js   Kundendetails, Vertraege
|           +-- ContractsPage.js        Vertragsliste, Filter, CRUD
|           +-- ContractDetailPage.js   Vertragsdetails, Timeline
|           +-- ProductsPage.js         Produktkatalog
|           +-- ExpensesPage.js         Ausgabenverwaltung, EUeR
|           +-- AddressListsPage.js     Adresslisten, Import
|           +-- SignaturePage.js        Digitale Unterschrift
|           +-- MapPage.js             Adressen-Karte (Leaflet)
|           +-- TeamMapPage.js         Team-Standorte (Echtzeit)
|           +-- SaleWizardPage.js      Verkaufs-Wizard (3 Schritte)
|           +-- UsersPage.js           Benutzerverwaltung
|           +-- ProfilePage.js         Eigenes Profil
|
+-- nginx/
|   +-- nginx.conf                      Reverse Proxy Konfiguration
|
+-- scripts/
|   +-- setup.sh                        Automatisches Setup
|   +-- bootstrap-server.sh             Server-Ersteinrichtung
|   +-- backup.sh                       Datenbank-Backup
|   +-- restore.sh                      Datenbank-Restore
|   +-- deploy-hetzner.sh              Hetzner-Deployment
|
+-- backups/                            Backup-Archiv
+-- logs/                               Anwendungs-Logs
+-- uploads/                            Datei-Uploads
    +-- address-lists/
    +-- documents/
    +-- receipts/
    +-- signatures/
    +-- temp/
```

---

## 5. Backend-Dokumentation

### 5.1 Server (server.js)

- Express.js mit Helmet (Security Headers)
- CORS konfiguriert (ueber Nginx im Production)
- Body-Parser: JSON + URL-encoded (10MB Limit)
- Rate Limiting: 100 Requests/15min (API), 5/15min (Auth)
- Response-Time Tracking (warnt bei > 1s)
- Health-Check Endpoint: `/api/health`
- GoBD Audit-Middleware auf allen schreibenden Operationen

### 5.2 Authentifizierung (authController.js)

- **JWT-basiert** mit Access Token (24h) und Refresh Token (7d)
- **Bcrypt** Passwort-Hashing (12 Rounds)
- Token enthaelt: `id`, `email`, `role`, `permissions`
- Refresh-Token in DB gespeichert (Revocation moeglich)
- Profil-Update mit Passwort-Aenderung (altes Passwort erforderlich)

### 5.3 Controller-Uebersicht

| Controller | Funktionen | Beschreibung |
|---|---|---|
| `authController` | register, login, refreshToken, logout, getProfile, updateProfile | Authentifizierung & Profil |
| `customerController` | getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer | Kundenverwaltung (Soft-Delete) |
| `contractController` | getContracts, getContract, createContract, updateContract, deleteContract, getPipeline | Vertraege (Stornierung statt Loeschung) |
| `productController` | getProducts, getProduct, createProduct, updateProduct, deleteProduct | Produktkatalog (Deaktivierung) |
| `expenseController` | getExpenses, createExpense, updateExpense, deleteExpense, getCategories, exportExpenses | Ausgaben mit Steuerberechnung |
| `addressController` | getAddressLists, importAddressList, getMapData, geocodeAddressList, updateAddress, deleteAddressList | Adresslisten-Import & Geocoding |
| `signatureController` | createSignature, getSignature, getSignatureImage, verifySignature | Digitale Unterschrift mit Hash |
| `dashboardController` | getDashboard | KPIs, Pipeline, Forecast |
| `userController` | getUsers, getUser, createUser, updateUser, deleteUser, updateLocation, getTeamLocations | Benutzerverwaltung & GPS |

### 5.4 Middleware

| Middleware | Datei | Funktion |
|---|---|---|
| JWT Auth | `auth.js` | Token-Validierung, `req.user` setzen |
| RBAC | `rbac.js` | Berechtigungspruefung pro Route |
| Validation | `validate.js` | Input-Validierung mit express-validator |
| Audit | `audit.js` | GoBD-konforme Protokollierung |

### 5.5 Wichtige Backend-Logik

**Steuerberechnung (Expenses):**
```
Brutto -> Netto = Brutto / (1 + MwSt-Satz)
USt-Betrag = Brutto - Netto
Absetzbar = Netto * Absetzungsgrenze (z.B. 70% bei Bewirtung)
```

**Vertragsstornierung (statt Loeschung):**
- GoBD-konform: Vertraege werden nie geloescht
- Status wird auf CANCELLED gesetzt
- Status-History wird erweitert

**Signatur-Hash:**
```
SHA-256(pngBase64 + signedAt + contractId + userId)
-> Integritaetspruefung bei Verifikation
```

---

## 6. Frontend-Dokumentation

### 6.1 Routing (App.js)

| Pfad | Seite | Auth | Beschreibung |
|---|---|---|---|
| `/login` | LoginPage | Nein | Anmeldung |
| `/register` | RegisterPage | Nein | Registrierung |
| `/` | DashboardPage | Ja | Dashboard mit KPIs |
| `/customers` | CustomersPage | Ja | Kundenliste |
| `/customers/:id` | CustomerDetailPage | Ja | Kundendetails |
| `/contracts` | ContractsPage | Ja | Vertragsliste |
| `/contracts/:id` | ContractDetailPage | Ja | Vertragsdetails |
| `/contracts/:id/signature` | SignaturePage | Ja | Digitale Unterschrift |
| `/products` | ProductsPage | Ja | Produktkatalog |
| `/expenses` | ExpensesPage | Ja | Ausgabenverwaltung |
| `/address-lists` | AddressListsPage | Ja | Adresslisten |
| `/map/:id` | MapPage | Ja | Adressen-Karte |
| `/team-map` | TeamMapPage | Ja | Team-Standorte |
| `/sale-wizard` | SaleWizardPage | Ja | Verkaufs-Wizard |
| `/users` | UsersPage | Ja | Benutzerverwaltung |
| `/profile` | ProfilePage | Ja | Eigenes Profil |

### 6.2 Theme

- **Primaerfarbe**: Bordeaux `#7A1B2D`
- **Schrift**: Segoe UI / Roboto
- **Design**: Material Design (MUI 5)

### 6.3 API-Service (api.js)

- Axios-Client mit Base-URL `/api`
- Automatischer Authorization-Header (Bearer Token)
- Response-Interceptor fuer Token-Refresh bei 401
- API-Wrapper fuer alle Endpunkte:
  - `customerAPI` - Kunden
  - `contractAPI` - Vertraege
  - `productAPI` - Produkte
  - `expenseAPI` - Ausgaben
  - `addressAPI` - Adresslisten
  - `signatureAPI` - Signaturen
  - `dashboardAPI` - Dashboard
  - `userAPI` - Benutzer

### 6.4 Auth-Context (AuthContext.js)

- React Context fuer globalen Auth-State
- `user`, `token`, `login()`, `logout()`, `updateUser()`
- LocalStorage-Persistenz
- Automatischer Token-Refresh
- Permissions-Array im User-Objekt

---

## 7. Datenbank-Schema

### Entity-Relationship-Diagramm

```
Users (1) ----< (n) Customers
Users (1) ----< (n) Contracts
Users (1) ----< (n) Expenses
Users (1) ----< (n) AddressLists
Users (1) ----< (n) Signatures
Users (1) ----< (n) AuditLogs

Customers (1) ----< (n) Contracts
Products  (1) ----< (n) Contracts
Contracts (1) ----< (n) Signatures

AddressLists (1) ----< (n) Addresses

ExpenseCategories (1) ----< (n) Expenses
```

### Tabellen-Uebersicht

| Tabelle | Felder | Beschreibung |
|---|---|---|
| `users` | id, email, password_hash, role, first_name, last_name, company_name, legal_form, owner_manager, tax_number, street, postal_code, city, phone, iban, is_active, last_login, refresh_token, last_latitude, last_longitude, last_location_at | Benutzer mit Firmendaten |
| `customers` | id, user_id, type, first_name, last_name, company_name, email, phone, street, postal_code, city, source, needs (JSONB), notes, gdpr_consent, gdpr_consent_date, is_active | Kunden (Privat/Business) |
| `contracts` | id, customer_id, product_id, user_id, status, status_history (JSONB), consumption, estimated_value, start_date, end_date, duration, commission_amount, commission_paid, documents (JSONB), notes | Vertraege mit Pipeline |
| `products` | id, provider, category, tariff_name, base_price, working_price, duration, cancellation_period, commission_model (JSONB), conditions, is_eco, is_active | Energietarife |
| `expenses` | id, user_id, category_id, amount, net_amount, tax_amount, deductible_amount, description, expense_date, receipt_url, notes | Betriebsausgaben |
| `expense_categories` | id, code, name, description, tax_deductible, vat_rate, deduction_limit, skr_account | SKR03-Ausgabenkategorien |
| `address_lists` | id, user_id, name, description, file_url, total_addresses, geocoded_count, geocoding_status, processed_at | Importierte Adresslisten |
| `addresses` | id, address_list_id, street, house_number, postal_code, city, latitude, longitude, contact_name, phone, email, notes, status, visited_at | Einzeladressen mit GPS |
| `signatures` | id, contract_id, user_id, signature_data, signed_at, gps_latitude, gps_longitude, gps_accuracy, device_info (JSONB), consent_given, hash_value, ip_address | Digitale Unterschriften |
| `audit_logs` | id, entity_type, entity_id, user_id, action, before_data (JSONB), after_data (JSONB), ip_address, user_agent, reason | Audit-Protokoll |

### Migrationen (Reihenfolge)

1. `create-users` - Benutzertabelle mit Rollen-ENUM
2. `create-customers` - Kunden mit FK zu Users
3. `create-products` - Energietarife
4. `create-contracts` - Vertraege mit FKs zu Customers, Products, Users
5. `create-expense-categories` - SKR03-Konten
6. `create-expenses` - Ausgaben mit FKs
7. `create-address-lists` - Adresslisten
8. `create-addresses` - Adressen mit FK zu AddressLists
9. `create-signatures` - Signaturen mit FK zu Contracts
10. `create-audit-logs` - Audit-Protokoll
11. `add-user-location-fields` - GPS-Tracking fuer Users

### Seeders (Testdaten)

1. **Default Users** - 4 Benutzer (Admin, Standortleitung, Teamlead, Vertrieb)
2. **Expense Categories** - 8 SKR03-Konten (Buero, Fahrt, Bewirtung, etc.)
3. **Sample Products** - 7 Strom/Gas-Tarife (E.ON, Vattenfall, EnBW)
4. **Sample Addresses** - 35 Adressen (Friedrichstr./Unter den Linden, Berlin)
5. **Sample Customers** - 12 Kunden (Privat + Business)

---

## 8. API-Endpunkte

### Authentifizierung

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/register` | Registrierung |
| POST | `/api/auth/login` | Login (-> Token + RefreshToken) |
| POST | `/api/auth/refresh` | Token erneuern |
| POST | `/api/auth/logout` | Abmelden |
| GET | `/api/auth/profile` | Eigenes Profil laden |
| PUT | `/api/auth/profile` | Profil aktualisieren |

### Kunden

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/customers` | customers:read | Liste (paginiert, filterbar) |
| GET | `/api/customers/:id` | customers:read | Einzelner Kunde + Vertraege |
| POST | `/api/customers` | customers:create | Neuen Kunden anlegen |
| PUT | `/api/customers/:id` | customers:update | Kunden bearbeiten |
| DELETE | `/api/customers/:id` | customers:delete | Kunden deaktivieren (Soft) |

### Vertraege

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/contracts` | contracts:read | Liste (paginiert, filterbar) |
| GET | `/api/contracts/pipeline` | contracts:read | Pipeline-Uebersicht |
| GET | `/api/contracts/:id` | contracts:read | Einzelner Vertrag |
| POST | `/api/contracts` | contracts:create | Neuen Vertrag erstellen |
| PUT | `/api/contracts/:id` | contracts:update | Vertrag aktualisieren |
| DELETE | `/api/contracts/:id` | contracts:cancel | Vertrag stornieren (GoBD) |

### Produkte

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/products` | products:read | Alle Produkte |
| GET | `/api/products/:id` | products:read | Einzelnes Produkt |
| POST | `/api/products` | products:create | Produkt erstellen |
| PUT | `/api/products/:id` | products:update | Produkt bearbeiten |
| DELETE | `/api/products/:id` | products:delete | Produkt deaktivieren |

### Ausgaben

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/expenses` | expenses:read | Ausgabenliste |
| GET | `/api/expenses/categories` | expenses:read | Ausgabenkategorien |
| GET | `/api/expenses/export` | expenses:export | XLSX/JSON-Export |
| POST | `/api/expenses` | expenses:create | Ausgabe erfassen |
| PUT | `/api/expenses/:id` | expenses:update | Ausgabe bearbeiten |
| DELETE | `/api/expenses/:id` | expenses:delete | Ausgabe loeschen |

### Adresslisten

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/address-lists` | addresses:read | Alle Listen |
| POST | `/api/address-lists/import` | addresses:import | Excel-Import |
| GET | `/api/address-lists/:id/map-data` | addresses:read | Kartendaten |
| POST | `/api/address-lists/:id/geocode` | addresses:update | Geocoding starten |
| PUT | `/api/address-lists/:id/addresses/:addressId` | addresses:update | Adresse bearbeiten |
| DELETE | `/api/address-lists/:id` | addresses:delete | Liste loeschen |

### Signaturen

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| POST | `/api/signatures/contract/:contractId` | signatures:create | Signatur erstellen |
| GET | `/api/signatures/:id` | signatures:read | Signatur-Info |
| GET | `/api/signatures/:id/image` | signatures:read | Signatur-Bild + Hash |
| GET | `/api/signatures/:id/verify` | signatures:read | Integritaetspruefung |

### Dashboard

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/dashboard` | dashboard:read | KPIs + Pipeline |

### Benutzer

| Methode | Pfad | Permission | Beschreibung |
|---|---|---|---|
| GET | `/api/users` | users:read | Alle Benutzer |
| GET | `/api/users/:id` | users:read | Einzelner Benutzer |
| POST | `/api/users` | users:create | Benutzer erstellen |
| PUT | `/api/users/:id` | users:update | Benutzer bearbeiten |
| DELETE | `/api/users/:id` | users:delete | Benutzer deaktivieren |
| PUT | `/api/users/location` | (eingeloggt) | Eigene GPS-Position |
| GET | `/api/users/locations` | users:read | Team-Standorte |

### System

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/health` | Nein | Health-Check (DB + Redis) |

---

## 9. Rollen & Berechtigungen

### Rollenhierarchie

```
ADMIN (5) > STANDORTLEITUNG (4) > TEAMLEAD (3) > VERTRIEB (1)
```

### Berechtigungsmatrix

| Berechtigung | ADMIN | STANDORTL. | TEAMLEAD | VERTRIEB |
|---|---|---|---|---|
| **Benutzer** | CRUD + Delete | CRU | Read | - |
| **Kunden** | CRUD | CRUD | CRUD | CRU (eigene) |
| **Vertraege** | CRUD + Cancel | CRU + Cancel | CRU + Cancel | CRU (eigene) |
| **Produkte** | CRUD | Read | Read | Read |
| **Ausgaben** | CRUD + Export (alle) | CRUD + Export (alle) | CRUD + Export (alle) | CRUD + Export (eigene) |
| **Adressen** | CRUD + Import (alle) | CRUD + Import (alle) | CRUD + Import (alle) | CRU + Import (eigene) |
| **Signaturen** | Read + Create | Read + Create | Read + Create | Read + Create |
| **Dashboard** | Read (alle) | Read (alle) | Read (alle) | Read (eigene) |
| **Audit** | Read | Read | - | - |
| **Reports** | Read + Export | Read + Export | Read | - |
| **Settings** | Read + Update | - | - | - |

### Daten-Scope

- **VERTRIEB**: Sieht nur eigene Kunden, Vertraege und Ausgaben
- **TEAMLEAD+**: Sieht alle Daten

---

## 10. Deployment

### Lokale Entwicklung

```bash
docker compose up -d --build
```

### Hetzner Cloud Server

```bash
# Option 1: Von lokal deployen (rsync-basiert)
./scripts/deploy-hetzner.sh <SERVER-IP>

# Option 2: Direkt auf dem Server (git-basiert)
sudo bash scripts/bootstrap-server.sh
```

Das Bootstrap-Script macht:
1. System-Update + Pakete installieren
2. Docker + Docker Compose installieren
3. Firewall (UFW: 22, 80, 443) + fail2ban
4. 4GB Swap erstellen
5. Repository klonen
6. .env mit sicheren Passwoertern erstellen
7. SSL-Zertifikat generieren
8. Docker Container bauen + starten
9. Migrationen + Seeds ausfuehren
10. Taegliches Backup als Cron (03:00 Uhr)

### Update auf dem Server

```bash
cd /opt/vente-crm/vente-crm
git pull
docker compose up -d --build
```

### SSL mit Let's Encrypt (Production)

```bash
apt install certbot
certbot certonly --standalone -d mein-crm.de
ln -sf /etc/letsencrypt/live/mein-crm.de/fullchain.pem nginx/ssl/cert.pem
ln -sf /etc/letsencrypt/live/mein-crm.de/privkey.pem nginx/ssl/private.key
docker compose restart nginx
```

---

## 11. Backup & Restore

### Backup erstellen

```bash
./scripts/backup.sh
```

Erstellt ein Archiv in `backups/` mit:
- PostgreSQL-Dump (pg_dump, komprimiert)
- Uploads-Verzeichnis (Belege, Signaturen, etc.)
- Metadata (Zeitstempel, DB-Version, Hostname)

Automatische Bereinigung alter Backups (Standard: 30 Tage).

### Backup wiederherstellen

```bash
./scripts/restore.sh backups/vente_backup_20260224_030000.tar.gz
```

### Automatische Backups

Werden vom Bootstrap-Script als Cron eingerichtet:
```
0 3 * * * /opt/vente-crm/vente-crm/scripts/backup.sh
```

---

## 12. Konfiguration

### Umgebungsvariablen (.env)

| Variable | Beschreibung | Standard |
|---|---|---|
| `NODE_ENV` | Umgebung | production |
| `PORT` | Backend-Port | 3001 |
| `POSTGRES_DB` | Datenbankname | vente_crm |
| `POSTGRES_USER` | DB-Benutzer | vente_user |
| `POSTGRES_PASSWORD` | DB-Passwort | (generiert) |
| `DB_HOST` | DB-Host | postgres |
| `REDIS_HOST` | Redis-Host | redis |
| `REDIS_PASSWORD` | Redis-Passwort | (generiert) |
| `JWT_SECRET` | JWT-Signatur (mind. 32 Zeichen) | (generiert) |
| `JWT_REFRESH_SECRET` | Refresh-Token-Signatur | (generiert) |
| `JWT_EXPIRES_IN` | Token-Gueltigkeitsdauer | 24h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-Token-Dauer | 7d |
| `BCRYPT_ROUNDS` | Passwort-Hash Runden | 12 |
| `CORS_ORIGIN` | Erlaubte Origins | * |
| `RATE_LIMIT_MAX` | Max. Requests/15min | 100 |
| `AUTH_RATE_LIMIT` | Max. Login-Versuche/15min | 5 |
| `MAX_FILE_SIZE` | Max. Upload-Groesse (Bytes) | 10485760 |
| `NOMINATIM_URL` | Geocoding-Service | nominatim.openstreetmap.org |
| `MAP_DEFAULT_CENTER_LAT` | Karten-Mittelpunkt Lat | 51.2277 |
| `MAP_DEFAULT_CENTER_LON` | Karten-Mittelpunkt Lon | 6.7735 |
| `LOG_LEVEL` | Log-Level | info |
| `AUDIT_LOG_ENABLED` | Audit-Logging aktiv | true |
| `BACKUP_RETENTION_DAYS` | Backup-Aufbewahrung | 30 |

### Nginx-Konfiguration

- **Rate Limiting**: 10 req/s (API), 5 req/min (Auth)
- **Security Headers**: HSTS, X-Frame-Options, CSP, etc.
- **Gzip**: Aktiviert fuer Text/JSON/JS/CSS
- **SSL**: TLS 1.2+, starke Cipher-Suites
- **Static Caching**: 1 Jahr fuer JS/CSS/Bilder

---

## 13. Standard-Zugaenge

| Rolle | E-Mail | Passwort |
|---|---|---|
| **Admin** | admin@vente-projekt.de | Admin123! |
| **Standortleitung** | standort@vente-projekt.de | Standort123! |
| **Teamlead** | team@vente-projekt.de | Team123! |
| **Vertrieb** | vertrieb@vente-projekt.de | Vertrieb123! |

**WICHTIG: Alle Standard-Passwoerter nach dem ersten Login aendern!**

---

## Nuetzliche Befehle

```bash
# Container-Status
docker compose ps

# Logs anzeigen
docker compose logs -f
docker compose logs -f backend

# Container neustarten
docker compose restart
docker compose restart backend

# Container komplett neu bauen
docker compose up -d --build

# Datenbank zuruecksetzen (ACHTUNG: Alle Daten weg!)
docker exec vente-backend npm run db:reset

# Einzelne Migration rueckgaengig
docker exec vente-backend npx sequelize-cli db:migrate:undo

# Migrations-Status pruefen
docker exec vente-backend npm run db:status

# In DB-Container einloggen
docker exec -it vente-postgres psql -U vente_user -d vente_crm

# Backend-Shell
docker exec -it vente-backend sh

# Health-Check
curl -k https://localhost/api/health
```
