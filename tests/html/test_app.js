/** Unit-Tests fuer app.js (Node.js) */

var assert = require("assert");

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

console.log("\n=== Alle " + bestanden + " JS-Tests bestanden ===");
