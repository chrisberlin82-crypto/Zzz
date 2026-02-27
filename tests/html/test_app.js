/** Unit-Tests fuer app.js (Node.js) */

var assert = require("assert");

// === Mock-Fetch Framework ===
var lastFetchUrl = null;
var lastFetchOpts = null;
var mockFetchResponse = null;

function mockFetch(responseData, status, ok) {
    status = status || 200;
    ok = ok !== undefined ? ok : true;
    mockFetchResponse = { data: responseData, status: status, ok: ok };
    global.fetch = function (url, opts) {
        lastFetchUrl = url;
        lastFetchOpts = opts || {};
        return Promise.resolve({
            ok: mockFetchResponse.ok,
            status: mockFetchResponse.status,
            json: function () { return Promise.resolve(mockFetchResponse.data); },
        });
    };
}

function mockFetchError() {
    global.fetch = function () {
        return Promise.reject(new Error("Netzwerkfehler"));
    };
}

function resetFetchMock() {
    lastFetchUrl = null;
    lastFetchOpts = null;
    mockFetchResponse = null;
}

// localStorage-Mock fuer Node.js
var _storage = {};
global.localStorage = {
    getItem: function (key) { return _storage[key] || null; },
    setItem: function (key, value) { _storage[key] = String(value); },
    removeItem: function (key) { delete _storage[key]; },
    clear: function () { _storage = {}; },
};

function resetStorage() {
    _storage = {};
}

// DOM-Mock fuer escapeHtml und DOMContentLoaded
global.document = {
    createElement: function () {
        var obj = {
            textContent: "",
            get innerHTML() {
                return obj.textContent
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");
            }
        };
        return obj;
    },
    addEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
};

var app = require("../../src/html/app.js");
var berechnen = app.berechnen;
var benutzerValidieren = app.benutzerValidieren;
var patientValidieren = app.patientValidieren;
var arztValidieren = app.arztValidieren;
var terminValidieren = app.terminValidieren;
var wartezeitBerechnen = app.wartezeitBerechnen;
var STATUS_KLASSEN = app.STATUS_KLASSEN;
var escapeHtml = app.escapeHtml;
var OP_SYMBOLE = app.OP_SYMBOLE;

var bestanden = 0;

function test(name, fn) {
    fn();
    bestanden++;
}

// --- Rechner Tests ---

console.log("=== Rechner Tests ===");

test("Addition ganzer Zahlen", function () {
    assert.strictEqual(berechnen(2, "addieren", 3), 5);
});

test("Subtraktion", function () {
    assert.strictEqual(berechnen(10, "subtrahieren", 4), 6);
});

test("Multiplikation", function () {
    assert.strictEqual(berechnen(3, "multiplizieren", 7), 21);
});

test("Division", function () {
    assert.strictEqual(berechnen(15, "dividieren", 3), 5);
});

test("Fliesskomma-Addition", function () {
    assert.strictEqual(berechnen(1.5, "addieren", 2.5), 4);
});

test("Negative Zahlen addieren", function () {
    assert.strictEqual(berechnen(-5, "addieren", 5), 0);
});

test("Multiplikation mit Null", function () {
    assert.strictEqual(berechnen(0, "multiplizieren", 100), 0);
});

test("Negative Multiplikation", function () {
    assert.strictEqual(berechnen(-3, "multiplizieren", -4), 12);
});

test("Subtraktion ergibt negativ", function () {
    assert.strictEqual(berechnen(3, "subtrahieren", 10), -7);
});

test("Division Fliesskomma-Ergebnis", function () {
    assert.strictEqual(berechnen(7, "dividieren", 2), 3.5);
});

test("Division durch Null wirft Fehler", function () {
    assert.throws(
        function () { berechnen(10, "dividieren", 0); },
        { message: "Division durch Null ist nicht erlaubt" }
    );
});

test("Unbekannte Operation wirft Fehler", function () {
    assert.throws(
        function () { berechnen(1, "wurzel", 2); },
        { message: "Unbekannte Operation: wurzel" }
    );
});

test("Grosse Zahlen", function () {
    assert.strictEqual(berechnen(1000000, "multiplizieren", 1000000), 1000000000000);
});

console.log("  " + 13 + " Tests bestanden");

// --- Benutzer-Validierung Tests ---

console.log("\n=== Benutzer-Validierung Tests ===");

test("Gueltige Daten ohne Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30 });
    assert.strictEqual(f.length, 0);
});

test("Leerer Name erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "", email: "max@test.de", alter: 30 });
    assert.ok(f.length > 0);
    assert.ok(f[0].includes("Name"));
});

test("Name nur Leerzeichen erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "   ", email: "max@test.de", alter: 30 });
    assert.ok(f.length > 0);
});

test("Fehlender Name erzeugt Fehler", function () {
    var f = benutzerValidieren({ email: "max@test.de", alter: 30 });
    assert.ok(f.length > 0);
});

test("Email ohne @ erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "ungueltig", alter: 30 });
    assert.ok(f.length > 0);
});

test("Leere Email erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "", alter: 30 });
    assert.ok(f.length > 0);
});

test("Fehlende Email erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", alter: 30 });
    assert.ok(f.length > 0);
});

test("Alter ueber 150 erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 200 });
    assert.ok(f.length > 0);
});

test("Negatives Alter erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: -1 });
    assert.ok(f.length > 0);
});

test("Fehlendes Alter erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de" });
    assert.ok(f.length > 0);
});

test("Alter 0 ist gueltig", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 0 });
    assert.ok(!f.some(function (e) { return e.includes("Alter"); }));
});

test("Alter 150 ist gueltig", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 150 });
    assert.ok(!f.some(function (e) { return e.includes("Alter"); }));
});

test("PLZ mit 3 Ziffern erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "123" });
    assert.ok(f.length > 0);
});

test("PLZ mit 5 Ziffern ist gueltig", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "10115" });
    assert.strictEqual(f.length, 0);
});

test("PLZ mit Buchstaben erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "ABCDE" });
    assert.ok(f.length > 0);
});

test("Ohne PLZ ist gueltig", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30 });
    assert.ok(!f.some(function (e) { return e.includes("PLZ"); }));
});

test("Alle Felder ungueltig erzeugt 3 Fehler", function () {
    var f = benutzerValidieren({ name: "", email: "", alter: -1 });
    assert.strictEqual(f.length, 3);
});

test("Vollstaendige Daten mit Adresse sind gueltig", function () {
    var f = benutzerValidieren({
        name: "Anna", email: "anna@test.de", alter: 25,
        strasse: "Hauptstr. 1", plz: "10115", stadt: "Berlin"
    });
    assert.strictEqual(f.length, 0);
});

console.log("  " + 18 + " Tests bestanden");

// --- escapeHtml Tests ---

console.log("\n=== escapeHtml Tests ===");

test("Normaler Text bleibt unveraendert", function () {
    assert.strictEqual(escapeHtml("Hallo Welt"), "Hallo Welt");
});

test("HTML-Tags werden escaped", function () {
    var ergebnis = escapeHtml("<script>alert('xss')</script>");
    assert.ok(ergebnis.includes("&lt;"));
    assert.ok(ergebnis.includes("&gt;"));
    assert.ok(!ergebnis.includes("<script>"));
});

test("Ampersand wird escaped", function () {
    var ergebnis = escapeHtml("A & B");
    assert.ok(ergebnis.includes("&amp;"));
});

test("Anfuehrungszeichen werden escaped", function () {
    var ergebnis = escapeHtml('Wert "wichtig"');
    assert.ok(ergebnis.includes("&quot;"));
});

test("Leerer String bleibt leer", function () {
    assert.strictEqual(escapeHtml(""), "");
});

console.log("  5 Tests bestanden");

// --- OP_SYMBOLE Tests ---

console.log("\n=== OP_SYMBOLE Tests ===");

test("Addieren ist +", function () {
    assert.strictEqual(OP_SYMBOLE.addieren, "+");
});

test("Subtrahieren ist -", function () {
    assert.strictEqual(OP_SYMBOLE.subtrahieren, "-");
});

test("Multiplizieren ist *", function () {
    assert.strictEqual(OP_SYMBOLE.multiplizieren, "*");
});

test("Dividieren ist /", function () {
    assert.strictEqual(OP_SYMBOLE.dividieren, "/");
});

test("Alle 4 Operationen vorhanden", function () {
    assert.strictEqual(Object.keys(OP_SYMBOLE).length, 4);
});

console.log("  5 Tests bestanden");

// --- Patienten-Validierung Tests ---

console.log("\n=== Patienten-Validierung Tests ===");

test("Gueltige Patientendaten ohne Fehler", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "Mustermann", geburtsdatum: "1990-05-15",
        versicherungsnummer: "A123", krankenkasse: "AOK"
    });
    assert.strictEqual(f.length, 0);
});

test("Patient ohne Vorname", function () {
    var f = patientValidieren({
        vorname: "", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: "AOK"
    });
    assert.ok(f.length > 0);
    assert.ok(f[0].includes("Vorname"));
});

test("Patient ohne Nachname", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Nachname"); }));
});

test("Patient ohne Geburtsdatum", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "M", geburtsdatum: "",
        versicherungsnummer: "A1", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Geburtsdatum"); }));
});

test("Patient ohne Versicherungsnummer", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Versicherungsnummer"); }));
});

test("Patient ohne Krankenkasse", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: ""
    });
    assert.ok(f.some(function (e) { return e.includes("Krankenkasse"); }));
});

test("Patient alle Felder leer ergibt 5 Fehler", function () {
    var f = patientValidieren({
        vorname: "", nachname: "", geburtsdatum: "",
        versicherungsnummer: "", krankenkasse: ""
    });
    assert.strictEqual(f.length, 5);
});

test("Patient fehlende Felder ergibt 5 Fehler", function () {
    var f = patientValidieren({});
    assert.strictEqual(f.length, 5);
});

console.log("  8 Tests bestanden");

// --- Aerzte-Validierung Tests ---

console.log("\n=== Aerzte-Validierung Tests ===");

test("Gueltige Arztdaten ohne Fehler", function () {
    var f = arztValidieren({ vorname: "Hans", nachname: "Schmidt", fachrichtung: "Allgemeinmedizin" });
    assert.strictEqual(f.length, 0);
});

test("Arzt ohne Vorname", function () {
    var f = arztValidieren({ vorname: "", nachname: "S", fachrichtung: "Kardiologie" });
    assert.ok(f.some(function (e) { return e.includes("Vorname"); }));
});

test("Arzt ohne Nachname", function () {
    var f = arztValidieren({ vorname: "Hans", nachname: "", fachrichtung: "Kardiologie" });
    assert.ok(f.some(function (e) { return e.includes("Nachname"); }));
});

test("Arzt ohne Fachrichtung", function () {
    var f = arztValidieren({ vorname: "Hans", nachname: "S", fachrichtung: "" });
    assert.ok(f.some(function (e) { return e.includes("Fachrichtung"); }));
});

test("Arzt alle leer ergibt 3 Fehler", function () {
    var f = arztValidieren({ vorname: "", nachname: "", fachrichtung: "" });
    assert.strictEqual(f.length, 3);
});

test("Arzt fehlende Felder ergibt 3 Fehler", function () {
    var f = arztValidieren({});
    assert.strictEqual(f.length, 3);
});

console.log("  6 Tests bestanden");

// --- Termin-Validierung Tests ---

console.log("\n=== Termin-Validierung Tests ===");

test("Gueltiger Termin ohne Fehler", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 2, datum: "2026-03-15", uhrzeit: "10:30" });
    assert.strictEqual(f.length, 0);
});

test("Termin ohne Patient", function () {
    var f = terminValidieren({ patient_id: null, arzt_id: 2, datum: "2026-03-15", uhrzeit: "10:30" });
    assert.ok(f.some(function (e) { return e.includes("Patient"); }));
});

test("Termin ohne Arzt", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: null, datum: "2026-03-15", uhrzeit: "10:30" });
    assert.ok(f.some(function (e) { return e.includes("Arzt"); }));
});

test("Termin ohne Datum", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 2, datum: "", uhrzeit: "10:30" });
    assert.ok(f.some(function (e) { return e.includes("Datum"); }));
});

test("Termin ohne Uhrzeit", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 2, datum: "2026-03-15", uhrzeit: "" });
    assert.ok(f.some(function (e) { return e.includes("Uhrzeit"); }));
});

test("Termin alle leer ergibt 4 Fehler", function () {
    var f = terminValidieren({});
    assert.strictEqual(f.length, 4);
});

console.log("  6 Tests bestanden");

// --- wartezeitBerechnen Tests ---

console.log("\n=== wartezeitBerechnen Tests ===");

test("Leere Ankunftszeit ergibt leeren String", function () {
    assert.strictEqual(wartezeitBerechnen(""), "");
    assert.strictEqual(wartezeitBerechnen(null), "");
});

test("Gerade eben fuer aktuelle Zeit", function () {
    var jetzt = new Date().toISOString();
    assert.strictEqual(wartezeitBerechnen(jetzt), "gerade eben");
});

test("Minuten unter 60 zeigt Min.", function () {
    var vor10Min = new Date(Date.now() - 10 * 60000).toISOString();
    var ergebnis = wartezeitBerechnen(vor10Min);
    assert.ok(ergebnis.includes("Min."));
    assert.ok(!ergebnis.includes("Std."));
});

test("Ueber 60 Minuten zeigt Stunden", function () {
    var vor90Min = new Date(Date.now() - 90 * 60000).toISOString();
    var ergebnis = wartezeitBerechnen(vor90Min);
    assert.ok(ergebnis.includes("Std."));
    assert.ok(ergebnis.includes("Min."));
});

console.log("  4 Tests bestanden");

// --- STATUS_KLASSEN Tests ---

console.log("\n=== STATUS_KLASSEN Tests ===");

test("Geplant hat Klasse", function () {
    assert.strictEqual(STATUS_KLASSEN.geplant, "status-geplant");
});

test("Bestaetigt hat Klasse", function () {
    assert.strictEqual(STATUS_KLASSEN.bestaetigt, "status-bestaetigt");
});

test("Abgesagt hat Klasse", function () {
    assert.strictEqual(STATUS_KLASSEN.abgesagt, "status-abgesagt");
});

test("Abgeschlossen hat Klasse", function () {
    assert.strictEqual(STATUS_KLASSEN.abgeschlossen, "status-abgeschlossen");
});

test("Alle 4 Status vorhanden", function () {
    assert.strictEqual(Object.keys(STATUS_KLASSEN).length, 4);
});

console.log("  5 Tests bestanden");

// --- Erweiterte Rechner-Tests: Grenzfaelle ---

console.log("\n=== Erweiterte Rechner-Tests ===");

test("Division ergibt periodische Dezimalzahl", function () {
    var ergebnis = berechnen(1, "dividieren", 3);
    assert.ok(Math.abs(ergebnis - 0.3333333333333333) < 1e-10);
});

test("Subtraktion gleicher Zahlen ergibt 0", function () {
    assert.strictEqual(berechnen(42, "subtrahieren", 42), 0);
});

test("Addition sehr kleiner Zahlen", function () {
    assert.strictEqual(berechnen(0.1, "addieren", 0.2), 0.30000000000000004);
});

test("Multiplikation mit -1", function () {
    assert.strictEqual(berechnen(7, "multiplizieren", -1), -7);
});

test("Division -10 durch -2", function () {
    assert.strictEqual(berechnen(-10, "dividieren", -2), 5);
});

console.log("  5 Tests bestanden");

// --- Erweiterte Benutzer-Validierung ---

console.log("\n=== Erweiterte Benutzer-Validierung ===");

test("PLZ mit 6 Ziffern erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "101150" });
    assert.ok(f.length > 0);
});

test("Email mit mehreren @ erzeugt keinen Fehler (enthaelt @)", function () {
    // Aktuelle Validierung prueft nur ob @ enthalten
    var f = benutzerValidieren({ name: "Max", email: "a@b@c", alter: 30 });
    assert.ok(!f.some(function (e) { return e.includes("E-Mail"); }));
});

test("Alter genau 151 erzeugt Fehler", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 151 });
    assert.ok(f.some(function (e) { return e.includes("Alter"); }));
});

test("Leere PLZ ist gueltig (optionales Feld)", function () {
    var f = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "" });
    assert.ok(!f.some(function (e) { return e.includes("PLZ"); }));
});

console.log("  4 Tests bestanden");

// --- Erweiterte Patienten-Validierung ---

console.log("\n=== Erweiterte Patienten-Validierung ===");

test("Patient Vorname nur Leerzeichen", function () {
    var f = patientValidieren({
        vorname: "   ", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Vorname"); }));
});

test("Patient Nachname nur Leerzeichen", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "   ", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Nachname"); }));
});

test("Patient Versicherungsnummer nur Leerzeichen", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "   ", krankenkasse: "AOK"
    });
    assert.ok(f.some(function (e) { return e.includes("Versicherungsnummer"); }));
});

test("Patient Krankenkasse nur Leerzeichen", function () {
    var f = patientValidieren({
        vorname: "Max", nachname: "M", geburtsdatum: "1990-01-01",
        versicherungsnummer: "A1", krankenkasse: "   "
    });
    assert.ok(f.some(function (e) { return e.includes("Krankenkasse"); }));
});

test("Patient mit null-Werten ergibt Fehler", function () {
    var f = patientValidieren({
        vorname: null, nachname: null, geburtsdatum: null,
        versicherungsnummer: null, krankenkasse: null
    });
    assert.strictEqual(f.length, 5);
});

console.log("  5 Tests bestanden");

// --- Erweiterte Arzt-Validierung ---

console.log("\n=== Erweiterte Arzt-Validierung ===");

test("Arzt Vorname nur Leerzeichen", function () {
    var f = arztValidieren({ vorname: "   ", nachname: "S", fachrichtung: "K" });
    assert.ok(f.some(function (e) { return e.includes("Vorname"); }));
});

test("Arzt Fachrichtung nur Leerzeichen", function () {
    var f = arztValidieren({ vorname: "Hans", nachname: "S", fachrichtung: "   " });
    assert.ok(f.some(function (e) { return e.includes("Fachrichtung"); }));
});

test("Arzt mit null-Werten ergibt 3 Fehler", function () {
    var f = arztValidieren({ vorname: null, nachname: null, fachrichtung: null });
    assert.strictEqual(f.length, 3);
});

console.log("  3 Tests bestanden");

// --- Erweiterte Termin-Validierung ---

console.log("\n=== Erweiterte Termin-Validierung ===");

test("Termin patient_id 0 ist ungueltig", function () {
    var f = terminValidieren({ patient_id: 0, arzt_id: 1, datum: "2026-03-15", uhrzeit: "10:00" });
    assert.ok(f.some(function (e) { return e.includes("Patient"); }));
});

test("Termin arzt_id 0 ist ungueltig", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 0, datum: "2026-03-15", uhrzeit: "10:00" });
    assert.ok(f.some(function (e) { return e.includes("Arzt"); }));
});

test("Termin mit null datum", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 1, datum: null, uhrzeit: "10:00" });
    assert.ok(f.some(function (e) { return e.includes("Datum"); }));
});

test("Termin mit null uhrzeit", function () {
    var f = terminValidieren({ patient_id: 1, arzt_id: 1, datum: "2026-03-15", uhrzeit: null });
    assert.ok(f.some(function (e) { return e.includes("Uhrzeit"); }));
});

console.log("  4 Tests bestanden");

// --- Erweiterte wartezeitBerechnen Tests ---

console.log("\n=== Erweiterte wartezeitBerechnen Tests ===");

test("Undefined Ankunftszeit ergibt leeren String", function () {
    assert.strictEqual(wartezeitBerechnen(undefined), "");
});

test("Genau 1 Minute wartezeit", function () {
    var vor1Min = new Date(Date.now() - 61000).toISOString();
    var ergebnis = wartezeitBerechnen(vor1Min);
    assert.ok(ergebnis.includes("Min."));
});

test("Genau 60 Minuten zeigt Stunden", function () {
    var vor60Min = new Date(Date.now() - 61 * 60000).toISOString();
    var ergebnis = wartezeitBerechnen(vor60Min);
    assert.ok(ergebnis.includes("Std."));
});

test("Mehrere Stunden korrekt", function () {
    var vor150Min = new Date(Date.now() - 150 * 60000).toISOString();
    var ergebnis = wartezeitBerechnen(vor150Min);
    assert.ok(ergebnis.includes("2 Std."));
    assert.ok(ergebnis.includes("30 Min."));
});

console.log("  4 Tests bestanden");

// --- escapeHtml Erweitert ---

console.log("\n=== escapeHtml Erweitert ===");

test("Nur Sonderzeichen", function () {
    var ergebnis = escapeHtml("< > & \"");
    assert.ok(ergebnis.includes("&lt;"));
    assert.ok(ergebnis.includes("&gt;"));
    assert.ok(ergebnis.includes("&amp;"));
    assert.ok(ergebnis.includes("&quot;"));
});

test("Umlaute bleiben erhalten", function () {
    assert.strictEqual(escapeHtml("Aerzteueoe"), "Aerzteueoe");
});

test("Zahlen bleiben erhalten", function () {
    assert.strictEqual(escapeHtml("12345"), "12345");
});

console.log("  3 Tests bestanden");

// === API-Funktionen Tests (mit Mock-Fetch) ===

function asyncTest(name, fn) {
    return fn().then(function () { bestanden++; }).catch(function (err) {
        console.error("FEHLER in: " + name);
        console.error(err);
        process.exit(1);
    });
}

(async function () {

// --- berechnenApi ---

console.log("\n=== berechnenApi ===");

await asyncTest("berechnenApi sendet POST mit korrekten Daten", async function () {
    mockFetch({ ergebnis: 15 });
    var erg = await app.berechnenApi(10, "addieren", 5);
    assert.strictEqual(erg, 15);
    assert.ok(lastFetchUrl.includes("/berechnen"));
    assert.strictEqual(lastFetchOpts.method, "POST");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.a, 10);
    assert.strictEqual(body.b, 5);
    assert.strictEqual(body.operation, "addieren");
    resetFetchMock();
});

await asyncTest("berechnenApi wirft Fehler bei Serverfehler", async function () {
    mockFetch({ fehler: "Division durch Null" }, 400, false);
    try {
        await app.berechnenApi(10, "dividieren", 0);
        assert.fail("Sollte Fehler werfen");
    } catch (e) {
        assert.ok(e.message.includes("Division"));
    }
    resetFetchMock();
});

console.log("  2 Tests bestanden");

// --- Benutzer-API (localStorage) ---

console.log("\n=== Benutzer-API ===");

await asyncTest("benutzerSpeichernApi speichert Daten", async function () {
    resetStorage();
    var erg = await app.benutzerSpeichernApi({ name: "Test", email: "test@test.de", alter: 30 });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.name, "Test");
    var liste = JSON.parse(localStorage.getItem("med_benutzer"));
    assert.strictEqual(liste.length, 1);
    assert.strictEqual(liste[0].name, "Test");
});

await asyncTest("benutzerSpeichernApi vergibt aufsteigende IDs", async function () {
    var erg2 = await app.benutzerSpeichernApi({ name: "Zweiter", email: "z@test.de", alter: 25 });
    assert.strictEqual(erg2.id, 2);
});

await asyncTest("benutzerAktualisierenApi aendert Daten", async function () {
    await app.benutzerAktualisierenApi(1, { name: "Neu" });
    var liste = JSON.parse(localStorage.getItem("med_benutzer"));
    assert.strictEqual(liste[0].name, "Neu");
});

await asyncTest("benutzerLoeschenApi entfernt Eintrag", async function () {
    await app.benutzerLoeschenApi(2);
    var liste = JSON.parse(localStorage.getItem("med_benutzer"));
    assert.strictEqual(liste.length, 1);
});

await asyncTest("benutzerLadenApi gibt alle zurueck", async function () {
    var erg = await app.benutzerLadenApi();
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].name, "Neu");
});

await asyncTest("benutzerLadenApi filtert nach Suche", async function () {
    await app.benutzerSpeichernApi({ name: "Anna", email: "anna@test.de", alter: 20, stadt: "Berlin" });
    var erg = await app.benutzerLadenApi("Anna");
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].name, "Anna");
    var erg2 = await app.benutzerLadenApi("xyz");
    assert.strictEqual(erg2.length, 0);
});

await asyncTest("benutzerLadenApi leere Suche gibt alle", async function () {
    var erg = await app.benutzerLadenApi("");
    assert.strictEqual(erg.length, 2);
});

await asyncTest("benutzerLoeschenApi nicht existierend", async function () {
    var vorher = (await app.benutzerLadenApi()).length;
    await app.benutzerLoeschenApi(999);
    var nachher = (await app.benutzerLadenApi()).length;
    assert.strictEqual(vorher, nachher);
});

console.log("  8 Tests bestanden");

// --- Verlauf-API (localStorage) ---

console.log("\n=== Verlauf-API ===");

await asyncTest("verlaufLadenApi gibt leere Liste", async function () {
    resetStorage();
    var erg = await app.verlaufLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("verlaufLoeschenApi leert Verlauf", async function () {
    localStorage.setItem("med_verlauf", JSON.stringify([{ a: 1, b: 2 }]));
    await app.verlaufLoeschenApi();
    var erg = await app.verlaufLadenApi();
    assert.strictEqual(erg.length, 0);
});

console.log("  2 Tests bestanden");

// --- Patienten-API (localStorage) ---

console.log("\n=== Patienten-API ===");

await asyncTest("patientenLadenApi leer", async function () {
    resetStorage();
    var erg = await app.patientenLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("patientSpeichernApi speichert Patient", async function () {
    var erg = await app.patientSpeichernApi({ vorname: "Max", nachname: "Muster", geburtsdatum: "1990-01-01", versicherungsnummer: "A1", krankenkasse: "AOK" });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.vorname, "Max");
});

await asyncTest("patientenLadenApi gibt gespeicherten Patient", async function () {
    var erg = await app.patientenLadenApi();
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].vorname, "Max");
});

await asyncTest("patientenLadenApi filtert nach Suche", async function () {
    await app.patientSpeichernApi({ vorname: "Anna", nachname: "Mueller", geburtsdatum: "1985-05-15", versicherungsnummer: "B2", krankenkasse: "TK" });
    var erg = await app.patientenLadenApi("Mueller");
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].nachname, "Mueller");
});

await asyncTest("patientAktualisierenApi aendert Patient", async function () {
    await app.patientAktualisierenApi(1, { vorname: "Maximilian" });
    var liste = JSON.parse(localStorage.getItem("med_patienten"));
    assert.strictEqual(liste[0].vorname, "Maximilian");
});

await asyncTest("patientLoeschenApi entfernt Patient", async function () {
    await app.patientLoeschenApi(2);
    var erg = await app.patientenLadenApi();
    assert.strictEqual(erg.length, 1);
});

console.log("  6 Tests bestanden");

// --- Aerzte-API (localStorage) ---

console.log("\n=== Aerzte-API ===");

await asyncTest("aerzteLadenApi leer", async function () {
    resetStorage();
    var erg = await app.aerzteLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("arztSpeichernApi speichert Arzt", async function () {
    var erg = await app.arztSpeichernApi({ vorname: "Hans", nachname: "Schmidt", fachrichtung: "Allgemein", titel: "Dr." });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.nachname, "Schmidt");
});

await asyncTest("aerzteLadenApi gibt gespeicherten Arzt", async function () {
    var erg = await app.aerzteLadenApi();
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].fachrichtung, "Allgemein");
});

await asyncTest("arztAktualisierenApi aendert Arzt", async function () {
    await app.arztAktualisierenApi(1, { fachrichtung: "Innere" });
    var erg = await app.aerzteLadenApi();
    assert.strictEqual(erg[0].fachrichtung, "Innere");
});

await asyncTest("arztLoeschenApi entfernt Arzt", async function () {
    await app.arztLoeschenApi(1);
    var erg = await app.aerzteLadenApi();
    assert.strictEqual(erg.length, 0);
});

console.log("  5 Tests bestanden");

// --- Termine-API (localStorage) ---

console.log("\n=== Termine-API ===");

await asyncTest("termineLadenApi leer", async function () {
    resetStorage();
    var erg = await app.termineLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("terminSpeichernApi speichert Termin", async function () {
    var erg = await app.terminSpeichernApi({ patient_id: 1, arzt_id: 1, datum: "2026-03-15", uhrzeit: "10:00", dauer_minuten: 30, grund: "Kontrolle" });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.datum, "2026-03-15");
    assert.strictEqual(erg.status, "geplant");
});

await asyncTest("termineLadenApi filtert nach Datum", async function () {
    await app.terminSpeichernApi({ patient_id: 1, arzt_id: 1, datum: "2026-04-01", uhrzeit: "14:00" });
    var erg = await app.termineLadenApi("2026-03-15");
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].datum, "2026-03-15");
});

await asyncTest("termineLadenApi ohne Datum gibt alle", async function () {
    var erg = await app.termineLadenApi();
    assert.strictEqual(erg.length, 2);
});

await asyncTest("terminAktualisierenApi aendert Termin", async function () {
    await app.terminAktualisierenApi(1, { patient_id: 1, arzt_id: 1, status: "bestaetigt" });
    var erg = await app.termineLadenApi();
    var termin = erg.find(function (t) { return t.id === 1; });
    assert.strictEqual(termin.status, "bestaetigt");
});

await asyncTest("terminLoeschenApi entfernt Termin", async function () {
    await app.terminLoeschenApi(2);
    var erg = await app.termineLadenApi();
    assert.strictEqual(erg.length, 1);
});

console.log("  6 Tests bestanden");

// --- Wartezimmer-API (localStorage) ---

console.log("\n=== Wartezimmer-API ===");

await asyncTest("wartezimmerLadenApi leer", async function () {
    resetStorage();
    var erg = await app.wartezimmerLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("wartezimmerCheckinApi checkt Patient ein", async function () {
    var erg = await app.wartezimmerCheckinApi({ patient_id: 1 });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.status, "wartend");
    assert.ok(erg.ankunft_zeit);
});

await asyncTest("wartezimmerLadenApi gibt wartende Patienten", async function () {
    var erg = await app.wartezimmerLadenApi();
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].status, "wartend");
});

await asyncTest("wartezimmerStatusApi aendert Status", async function () {
    await app.wartezimmerStatusApi(1, "aufgerufen");
    var erg = await app.wartezimmerLadenApi();
    assert.strictEqual(erg[0].status, "aufgerufen");
});

await asyncTest("wartezimmerEntfernenApi entfernt Eintrag", async function () {
    await app.wartezimmerEntfernenApi(1);
    var erg = await app.wartezimmerLadenApi();
    assert.strictEqual(erg.length, 0);
});

console.log("  5 Tests bestanden");

// --- Agenten-API (localStorage) ---

console.log("\n=== Agenten-API ===");

await asyncTest("agentenLadenApi leer", async function () {
    resetStorage();
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("agentSpeichernApi speichert Agent", async function () {
    var erg = await app.agentSpeichernApi({ name: "Agent 1", nebenstelle: "100", sip_passwort: "geheim", rolle: "rezeption", warteschlange: "rezeption" });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.name, "Agent 1");
    assert.strictEqual(erg.status, "offline");
});

await asyncTest("agentAktualisierenApi aendert Agent", async function () {
    await app.agentAktualisierenApi(1, { name: "Agent Eins" });
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg[0].name, "Agent Eins");
});

await asyncTest("agentStatusSetzenApi setzt online", async function () {
    await app.agentStatusSetzenApi(1, "online");
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg[0].status, "online");
});

await asyncTest("agentStatusSetzenApi setzt pause", async function () {
    await app.agentStatusSetzenApi(1, "pause");
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg[0].status, "pause");
});

await asyncTest("agentStatusSetzenApi setzt offline", async function () {
    await app.agentStatusSetzenApi(1, "offline");
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg[0].status, "offline");
});

await asyncTest("agentLoeschenApi entfernt Agent", async function () {
    await app.agentLoeschenApi(1);
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg.length, 0);
});

await asyncTest("agentSpeichernApi mehrere Agenten", async function () {
    await app.agentSpeichernApi({ name: "A1", nebenstelle: "100", sip_passwort: "p1", rolle: "rezeption" });
    await app.agentSpeichernApi({ name: "A2", nebenstelle: "101", sip_passwort: "p2", rolle: "arzt" });
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg.length, 2);
});

console.log("  8 Tests bestanden");

// --- Anrufe-API (localStorage) ---

console.log("\n=== Anrufe-API ===");

await asyncTest("anrufeLadenApi alle Anrufe", async function () {
    resetStorage();
    localStorage.setItem("med_anrufe", JSON.stringify([
        { id: 1, anrufer_nummer: "+49111", status: "beendet" },
        { id: 2, anrufer_nummer: "+49222", status: "klingelt" },
    ]));
    var erg = await app.anrufeLadenApi(false);
    assert.strictEqual(erg.length, 2);
});

await asyncTest("anrufeLadenApi nur aktive", async function () {
    var erg = await app.anrufeLadenApi(true);
    assert.strictEqual(erg.length, 1);
    assert.strictEqual(erg[0].status, "klingelt");
});

await asyncTest("anrufeLadenApi leere Liste", async function () {
    resetStorage();
    var erg = await app.anrufeLadenApi(false);
    assert.strictEqual(erg.length, 0);
});

console.log("  3 Tests bestanden");

// --- Timer-Funktionen ---

console.log("\n=== Timer-Funktionen ===");

await asyncTest("startAnrufTimer und stopAnrufTimer", async function () {
    // Mock fuer document.getElementById
    var timerText = "00:00";
    var origGetById = global.document.getElementById;
    global.document.getElementById = function (id) {
        if (id === "anruf-timer") return { set textContent(v) { timerText = v; }, get textContent() { return timerText; } };
        return null;
    };
    app.startAnrufTimer();
    app.stopAnrufTimer();
    assert.strictEqual(timerText, "00:00");
    global.document.getElementById = origGetById;
});

await asyncTest("stopAnrufTimer ohne laufenden Timer", async function () {
    var origGetById = global.document.getElementById;
    global.document.getElementById = function () { return { set textContent(v) {} }; };
    app.stopAnrufTimer(); // Sollte nicht abstuerzen
    global.document.getElementById = origGetById;
});

console.log("  2 Tests bestanden");

// --- Standort/ACD: Konstanten ---

console.log("\n=== WOCHENTAGE & ACD_MODUS_LABEL ===");

test("WOCHENTAGE hat 7 Eintraege", function () {
    assert.strictEqual(app.WOCHENTAGE.length, 7);
});

test("WOCHENTAGE Montag bis Sonntag", function () {
    assert.strictEqual(app.WOCHENTAGE[0], "Montag");
    assert.strictEqual(app.WOCHENTAGE[6], "Sonntag");
});

test("ACD_MODUS_LABEL hat 3 Modi", function () {
    assert.strictEqual(Object.keys(app.ACD_MODUS_LABEL).length, 3);
    assert.ok(app.ACD_MODUS_LABEL.alle_annehmen);
    assert.ok(app.ACD_MODUS_LABEL.klingeln_dann_bot);
    assert.ok(app.ACD_MODUS_LABEL.bot_direkt);
});

console.log("  3 Tests bestanden");

// --- standardZeitplan ---

console.log("\n=== standardZeitplan ===");

test("standardZeitplan hat 7 Tage", function () {
    var plan = app.standardZeitplan();
    assert.strictEqual(plan.length, 7);
});

test("Mo-Fr aktiv, Sa-So inaktiv", function () {
    var plan = app.standardZeitplan();
    for (var i = 0; i < 5; i++) assert.strictEqual(plan[i].aktiv, true);
    assert.strictEqual(plan[5].aktiv, false);
    assert.strictEqual(plan[6].aktiv, false);
});

test("Oeffnungszeiten 08:00-18:00", function () {
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { assert.strictEqual(t.von, "08:00"); assert.strictEqual(t.bis, "18:00"); });
});

test("Mittagspause 12:00-13:00 bot_direkt", function () {
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { assert.strictEqual(t.pause_von, "12:00"); assert.strictEqual(t.pause_bis, "13:00"); assert.strictEqual(t.pause_modus, "bot_direkt"); });
});

test("Standard-Modus klingeln_dann_bot", function () {
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { assert.strictEqual(t.modus, "klingeln_dann_bot"); });
});

console.log("  5 Tests bestanden");

// --- ACD-Config ---

console.log("\n=== ACD-Config ===");

await asyncTest("acdConfigSpeichern und Laden", async function () {
    resetStorage();
    app.acdConfigSpeichern({ modus: "bot_direkt", klingelanzahl: 5, klingel_timeout: 20, verteilung: "rundlauf" });
    var c = app.acdConfigLaden();
    assert.strictEqual(c.modus, "bot_direkt");
    assert.strictEqual(c.klingelanzahl, 5);
    assert.strictEqual(c.klingel_timeout, 20);
    assert.strictEqual(c.verteilung, "rundlauf");
});

await asyncTest("acdConfigLaden ohne Daten gibt null", async function () {
    resetStorage();
    assert.strictEqual(app.acdConfigLaden(), null);
});

await asyncTest("acdConfigLaden ungueltig gibt null", async function () {
    resetStorage();
    localStorage.setItem("med_acd_config", "kaputt{");
    assert.strictEqual(app.acdConfigLaden(), null);
});

console.log("  3 Tests bestanden");

// --- Zeitplan ---

console.log("\n=== Zeitplan ===");

await asyncTest("zeitplanSpeichern und Laden", async function () {
    resetStorage();
    var plan = app.standardZeitplan();
    plan[0].modus = "bot_direkt";
    app.zeitplanSpeichern(plan);
    var g = app.zeitplanLaden();
    assert.strictEqual(g[0].modus, "bot_direkt");
    assert.strictEqual(g.length, 7);
});

await asyncTest("zeitplanLaden ohne Daten gibt Standard", async function () {
    resetStorage();
    var plan = app.zeitplanLaden();
    assert.strictEqual(plan.length, 7);
    assert.strictEqual(plan[0].aktiv, true);
    assert.strictEqual(plan[5].aktiv, false);
});

console.log("  2 Tests bestanden");

// --- Standortleitung CRUD ---

console.log("\n=== Standortleitung CRUD ===");

await asyncTest("standortleitungLaden leer", async function () {
    resetStorage();
    assert.strictEqual(app.standortleitungLaden().length, 0);
});

await asyncTest("standortleitungSpeichernApi erstellt Eintrag", async function () {
    resetStorage();
    var erg = app.standortleitungSpeichernApi({ name: "Dr. Gross", rolle: "standortleitung", nebenstelle: "300", sip_passwort: "sl300", warteschlange: "alle" });
    assert.strictEqual(erg.id, 1);
    assert.strictEqual(erg.name, "Dr. Gross");
    assert.strictEqual(erg.status, "offline");
    assert.strictEqual(app.standortleitungLaden().length, 1);
});

await asyncTest("standortleitungSpeichernApi aufsteigende IDs", async function () {
    var erg = app.standortleitungSpeichernApi({ name: "Weber", rolle: "teamleiter", nebenstelle: "301", sip_passwort: "tl301", warteschlange: "rezeption" });
    assert.strictEqual(erg.id, 2);
    assert.strictEqual(app.standortleitungLaden().length, 2);
});

await asyncTest("standortleitungAktualisierenApi aendert Daten", async function () {
    app.standortleitungAktualisierenApi(1, { name: "Dr. Sabine Gross" });
    assert.strictEqual(app.standortleitungLaden()[0].name, "Dr. Sabine Gross");
});

await asyncTest("standortleitungStatusSetzen online", async function () {
    app.standortleitungStatusSetzen(1, "online");
    assert.strictEqual(app.standortleitungLaden()[0].status, "online");
});

await asyncTest("standortleitungStatusSetzen pause", async function () {
    app.standortleitungStatusSetzen(1, "pause");
    assert.strictEqual(app.standortleitungLaden()[0].status, "pause");
});

await asyncTest("standortleitungStatusSetzen offline", async function () {
    app.standortleitungStatusSetzen(1, "offline");
    assert.strictEqual(app.standortleitungLaden()[0].status, "offline");
});

await asyncTest("standortleitungLoeschenApi entfernt Eintrag", async function () {
    app.standortleitungLoeschenApi(2);
    var liste = app.standortleitungLaden();
    assert.strictEqual(liste.length, 1);
    assert.strictEqual(liste[0].name, "Dr. Sabine Gross");
});

await asyncTest("standortleitungLoeschenApi alle entfernen", async function () {
    app.standortleitungLoeschenApi(1);
    assert.strictEqual(app.standortleitungLaden().length, 0);
});

console.log("  9 Tests bestanden");

// --- ACD Live-Modus Ermittlung ---

console.log("\n=== ACD Live-Modus ===");

await asyncTest("aktuellenAcdModusErmitteln ohne Config", async function () {
    resetStorage();
    var a = app.aktuellenAcdModusErmitteln();
    assert.ok(a.modus);
    assert.ok(a.quelle);
});

await asyncTest("aktuellenAcdModusErmitteln inaktiver Tag nutzt Standard", async function () {
    resetStorage();
    app.acdConfigSpeichern({ modus: "alle_annehmen" });
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { t.aktiv = false; });
    app.zeitplanSpeichern(plan);
    var a = app.aktuellenAcdModusErmitteln();
    assert.strictEqual(a.modus, "alle_annehmen");
    assert.ok(a.quelle.includes("inaktiv"));
});

await asyncTest("aktuellenAcdModusErmitteln aktiver Tag nutzt Zeitplan", async function () {
    resetStorage();
    app.acdConfigSpeichern({ modus: "alle_annehmen" });
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { t.aktiv = true; t.von = "00:00"; t.bis = "23:59"; t.modus = "bot_direkt"; t.pause_von = ""; t.pause_bis = ""; });
    app.zeitplanSpeichern(plan);
    var a = app.aktuellenAcdModusErmitteln();
    assert.strictEqual(a.modus, "bot_direkt");
});

await asyncTest("aktuellenAcdModusErmitteln Pause-Modus", async function () {
    resetStorage();
    app.acdConfigSpeichern({ modus: "alle_annehmen" });
    var jetzt = new Date();
    var hh = ("0" + jetzt.getHours()).slice(-2);
    var mm = ("0" + jetzt.getMinutes()).slice(-2);
    var nMm = (parseInt(mm) + 2) % 60;
    var nHh = nMm < parseInt(mm) ? ("0" + (parseInt(hh) + 1) % 24).slice(-2) : hh;
    var plan = app.standardZeitplan();
    plan.forEach(function (t) { t.aktiv = true; t.von = "00:00"; t.bis = "23:59"; t.modus = "klingeln_dann_bot"; t.pause_von = hh + ":" + mm; t.pause_bis = nHh + ":" + ("0" + nMm).slice(-2); t.pause_modus = "bot_direkt"; });
    app.zeitplanSpeichern(plan);
    var a = app.aktuellenAcdModusErmitteln();
    assert.strictEqual(a.modus, "bot_direkt");
    assert.ok(a.quelle.includes("Pause"));
});

console.log("  4 Tests bestanden");

console.log("\n=== Alle " + bestanden + " JS-Tests bestanden ===");
})();
