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

// --- Benutzer-API ---

console.log("\n=== Benutzer-API ===");

await asyncTest("benutzerSpeichernApi POST", async function () {
    mockFetch({ nachricht: "ok", benutzer: { id: 1 } }, 201);
    var erg = await app.benutzerSpeichernApi({ name: "Test" });
    assert.strictEqual(erg.benutzer.id, 1);
    assert.strictEqual(lastFetchOpts.method, "POST");
    assert.ok(lastFetchUrl.includes("/benutzer"));
    resetFetchMock();
});

await asyncTest("benutzerSpeichernApi Fehler-Array", async function () {
    mockFetch({ fehler: ["Name fehlt", "Email fehlt"] }, 422, false);
    try {
        await app.benutzerSpeichernApi({});
        assert.fail("Sollte Fehler werfen");
    } catch (e) {
        assert.ok(e.message.includes("Name fehlt"));
        assert.ok(e.message.includes("Email fehlt"));
    }
    resetFetchMock();
});

await asyncTest("benutzerAktualisierenApi PUT", async function () {
    mockFetch({ nachricht: "aktualisiert" });
    await app.benutzerAktualisierenApi(5, { name: "Neu" });
    assert.ok(lastFetchUrl.includes("/benutzer/5"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    resetFetchMock();
});

await asyncTest("benutzerLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "geloescht" });
    await app.benutzerLoeschenApi(3);
    assert.ok(lastFetchUrl.includes("/benutzer/3"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

await asyncTest("benutzerLoeschenApi Fehler", async function () {
    mockFetch({ fehler: "Nicht gefunden" }, 404, false);
    try {
        await app.benutzerLoeschenApi(999);
        assert.fail("Sollte Fehler werfen");
    } catch (e) {
        assert.ok(e.message.includes("Nicht gefunden"));
    }
    resetFetchMock();
});

await asyncTest("benutzerLadenApi GET ohne Suche", async function () {
    mockFetch([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
    var erg = await app.benutzerLadenApi();
    assert.strictEqual(erg.length, 2);
    assert.ok(lastFetchUrl.includes("/benutzer"));
    assert.ok(!lastFetchUrl.includes("suche"));
    resetFetchMock();
});

await asyncTest("benutzerLadenApi GET mit Suche", async function () {
    mockFetch([{ id: 1, name: "Max" }]);
    await app.benutzerLadenApi("Max");
    assert.ok(lastFetchUrl.includes("suche=Max"));
    resetFetchMock();
});

await asyncTest("benutzerLadenApi Fehler", async function () {
    mockFetch({}, 500, false);
    try {
        await app.benutzerLadenApi();
        assert.fail("Sollte Fehler werfen");
    } catch (e) {
        assert.ok(e.message.includes("Laden"));
    }
    resetFetchMock();
});

console.log("  8 Tests bestanden");

// --- Verlauf-API ---

console.log("\n=== Verlauf-API ===");

await asyncTest("verlaufLadenApi GET", async function () {
    mockFetch([{ id: 1, a: 2, b: 3, operation: "addieren", ergebnis: 5 }]);
    var erg = await app.verlaufLadenApi();
    assert.strictEqual(erg[0].ergebnis, 5);
    assert.ok(lastFetchUrl.includes("/verlauf"));
    resetFetchMock();
});

await asyncTest("verlaufLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "ok" });
    await app.verlaufLoeschenApi();
    assert.ok(lastFetchUrl.includes("/verlauf"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

console.log("  2 Tests bestanden");

// --- Patienten-API ---

console.log("\n=== Patienten-API ===");

await asyncTest("patientenLadenApi GET", async function () {
    mockFetch([{ id: 1, vorname: "Max" }]);
    var erg = await app.patientenLadenApi();
    assert.strictEqual(erg[0].vorname, "Max");
    resetFetchMock();
});

await asyncTest("patientenLadenApi mit Suche", async function () {
    mockFetch([]);
    await app.patientenLadenApi("Mueller");
    assert.ok(lastFetchUrl.includes("suche=Mueller"));
    resetFetchMock();
});

await asyncTest("patientSpeichernApi POST Erfolg", async function () {
    mockFetch({ patient: { id: 10 } }, 201);
    var erg = await app.patientSpeichernApi({ vorname: "Max", nachname: "M" });
    assert.strictEqual(erg.patient.id, 10);
    assert.strictEqual(lastFetchOpts.method, "POST");
    resetFetchMock();
});

await asyncTest("patientSpeichernApi Fehler-Array", async function () {
    mockFetch({ fehler: ["Vorname fehlt"] }, 422, false);
    try {
        await app.patientSpeichernApi({});
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Vorname"));
    }
    resetFetchMock();
});

await asyncTest("patientAktualisierenApi PUT", async function () {
    mockFetch({ patient: { id: 10, vorname: "Neu" } });
    await app.patientAktualisierenApi(10, { vorname: "Neu" });
    assert.ok(lastFetchUrl.includes("/patienten/10"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    resetFetchMock();
});

await asyncTest("patientLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "geloescht" });
    await app.patientLoeschenApi(7);
    assert.ok(lastFetchUrl.includes("/patienten/7"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

console.log("  6 Tests bestanden");

// --- Aerzte-API ---

console.log("\n=== Aerzte-API ===");

await asyncTest("aerzteLadenApi GET", async function () {
    mockFetch([{ id: 1, nachname: "Schmidt", fachrichtung: "Allgemein" }]);
    var erg = await app.aerzteLadenApi();
    assert.strictEqual(erg[0].nachname, "Schmidt");
    resetFetchMock();
});

await asyncTest("arztSpeichernApi POST", async function () {
    mockFetch({ arzt: { id: 5 } }, 201);
    var erg = await app.arztSpeichernApi({ vorname: "Hans", nachname: "S", fachrichtung: "K" });
    assert.strictEqual(erg.arzt.id, 5);
    assert.strictEqual(lastFetchOpts.method, "POST");
    resetFetchMock();
});

await asyncTest("arztSpeichernApi Fehler", async function () {
    mockFetch({ fehler: "Fachrichtung fehlt" }, 422, false);
    try {
        await app.arztSpeichernApi({});
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Fachrichtung"));
    }
    resetFetchMock();
});

await asyncTest("arztAktualisierenApi PUT", async function () {
    mockFetch({ arzt: { id: 5 } });
    await app.arztAktualisierenApi(5, { fachrichtung: "Innere" });
    assert.ok(lastFetchUrl.includes("/aerzte/5"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    resetFetchMock();
});

await asyncTest("arztLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "ok" });
    await app.arztLoeschenApi(5);
    assert.ok(lastFetchUrl.includes("/aerzte/5"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

console.log("  5 Tests bestanden");

// --- Termine-API ---

console.log("\n=== Termine-API ===");

await asyncTest("termineLadenApi GET ohne Datum", async function () {
    mockFetch([{ id: 1, datum: "2026-03-01" }]);
    await app.termineLadenApi();
    assert.ok(lastFetchUrl.includes("/termine"));
    assert.ok(!lastFetchUrl.includes("datum="));
    resetFetchMock();
});

await asyncTest("termineLadenApi GET mit Datum", async function () {
    mockFetch([]);
    await app.termineLadenApi("2026-03-15");
    assert.ok(lastFetchUrl.includes("datum=2026-03-15"));
    resetFetchMock();
});

await asyncTest("terminSpeichernApi POST", async function () {
    mockFetch({ termin: { id: 22 } }, 201);
    var erg = await app.terminSpeichernApi({ patient_id: 1, arzt_id: 2, datum: "2026-03-15", uhrzeit: "10:00" });
    assert.strictEqual(erg.termin.id, 22);
    assert.strictEqual(lastFetchOpts.method, "POST");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.patient_id, 1);
    assert.strictEqual(body.arzt_id, 2);
    resetFetchMock();
});

await asyncTest("terminSpeichernApi Fehler", async function () {
    mockFetch({ fehler: ["Patient fehlt"] }, 422, false);
    try {
        await app.terminSpeichernApi({});
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Patient"));
    }
    resetFetchMock();
});

await asyncTest("terminAktualisierenApi PUT", async function () {
    mockFetch({ termin: { id: 22, status: "bestaetigt" } });
    await app.terminAktualisierenApi(22, { status: "bestaetigt" });
    assert.ok(lastFetchUrl.includes("/termine/22"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    resetFetchMock();
});

await asyncTest("terminLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "ok" });
    await app.terminLoeschenApi(22);
    assert.ok(lastFetchUrl.includes("/termine/22"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

console.log("  6 Tests bestanden");

// --- Wartezimmer-API ---

console.log("\n=== Wartezimmer-API ===");

await asyncTest("wartezimmerLadenApi GET", async function () {
    mockFetch([{ id: 1, patient_name: "Max M", status: "wartend" }]);
    var erg = await app.wartezimmerLadenApi();
    assert.strictEqual(erg[0].status, "wartend");
    assert.ok(lastFetchUrl.includes("/wartezimmer"));
    resetFetchMock();
});

await asyncTest("wartezimmerCheckinApi POST", async function () {
    mockFetch({ eintrag: { id: 5 } }, 201);
    var erg = await app.wartezimmerCheckinApi({ patient_id: 1 });
    assert.strictEqual(erg.eintrag.id, 5);
    assert.strictEqual(lastFetchOpts.method, "POST");
    resetFetchMock();
});

await asyncTest("wartezimmerCheckinApi Fehler", async function () {
    mockFetch({ fehler: ["Patient fehlt"] }, 422, false);
    try {
        await app.wartezimmerCheckinApi({});
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Patient"));
    }
    resetFetchMock();
});

await asyncTest("wartezimmerStatusApi PUT aufgerufen", async function () {
    mockFetch({ eintrag: { id: 5, status: "aufgerufen" } });
    await app.wartezimmerStatusApi(5, "aufgerufen");
    assert.ok(lastFetchUrl.includes("/wartezimmer/5"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.status, "aufgerufen");
    resetFetchMock();
});

await asyncTest("wartezimmerEntfernenApi DELETE", async function () {
    mockFetch({ nachricht: "ok" });
    await app.wartezimmerEntfernenApi(5);
    assert.ok(lastFetchUrl.includes("/wartezimmer/5"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

console.log("  5 Tests bestanden");

// --- Agenten-API ---

console.log("\n=== Agenten-API ===");

await asyncTest("agentenLadenApi GET", async function () {
    mockFetch([{ id: 1, name: "Agent 1", status: "online" }]);
    var erg = await app.agentenLadenApi();
    assert.strictEqual(erg[0].name, "Agent 1");
    assert.ok(lastFetchUrl.includes("/agenten"));
    resetFetchMock();
});

await asyncTest("agentSpeichernApi POST", async function () {
    mockFetch({ agent: { id: 3 } }, 201);
    var erg = await app.agentSpeichernApi({ name: "Agent", nebenstelle: "100", sip_passwort: "geheim" });
    assert.strictEqual(erg.agent.id, 3);
    assert.strictEqual(lastFetchOpts.method, "POST");
    resetFetchMock();
});

await asyncTest("agentSpeichernApi Fehler", async function () {
    mockFetch({ fehler: "Name fehlt" }, 422, false);
    try {
        await app.agentSpeichernApi({});
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Name"));
    }
    resetFetchMock();
});

await asyncTest("agentAktualisierenApi PUT", async function () {
    mockFetch({ agent: { id: 3 } });
    await app.agentAktualisierenApi(3, { name: "Neu" });
    assert.ok(lastFetchUrl.includes("/agenten/3"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    resetFetchMock();
});

await asyncTest("agentLoeschenApi DELETE", async function () {
    mockFetch({ nachricht: "ok" });
    await app.agentLoeschenApi(3);
    assert.ok(lastFetchUrl.includes("/agenten/3"));
    assert.strictEqual(lastFetchOpts.method, "DELETE");
    resetFetchMock();
});

await asyncTest("agentStatusSetzenApi PUT online", async function () {
    mockFetch({ agent: { id: 3, status: "online" } });
    await app.agentStatusSetzenApi(3, "online");
    assert.ok(lastFetchUrl.includes("/agenten/3/status"));
    assert.strictEqual(lastFetchOpts.method, "PUT");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.status, "online");
    resetFetchMock();
});

await asyncTest("agentStatusSetzenApi PUT pause", async function () {
    mockFetch({ agent: { id: 3, status: "pause" } });
    await app.agentStatusSetzenApi(3, "pause");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.status, "pause");
    resetFetchMock();
});

await asyncTest("agentStatusSetzenApi PUT offline", async function () {
    mockFetch({ agent: { id: 3, status: "offline" } });
    await app.agentStatusSetzenApi(3, "offline");
    var body = JSON.parse(lastFetchOpts.body);
    assert.strictEqual(body.status, "offline");
    resetFetchMock();
});

console.log("  8 Tests bestanden");

// --- Anrufe-API ---

console.log("\n=== Anrufe-API ===");

await asyncTest("anrufeLadenApi GET alle", async function () {
    mockFetch([{ id: 1, anrufer_nummer: "+49111" }]);
    var erg = await app.anrufeLadenApi(false);
    assert.strictEqual(erg[0].anrufer_nummer, "+49111");
    assert.ok(!lastFetchUrl.includes("aktiv"));
    resetFetchMock();
});

await asyncTest("anrufeLadenApi GET aktive", async function () {
    mockFetch([]);
    await app.anrufeLadenApi(true);
    assert.ok(lastFetchUrl.includes("aktiv=true"));
    resetFetchMock();
});

await asyncTest("anrufeLadenApi Fehler", async function () {
    mockFetch({}, 500, false);
    try {
        await app.anrufeLadenApi();
        assert.fail();
    } catch (e) {
        assert.ok(e.message.includes("Laden"));
    }
    resetFetchMock();
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

console.log("\n=== Alle " + bestanden + " JS-Tests bestanden ===");
})();
