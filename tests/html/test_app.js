/** Unit-Tests fuer app.js (Node.js) */

const assert = require("assert");
const { berechnen, benutzerValidieren, escapeHtml } = require("../../src/html/app.js");

// --- Rechner Tests ---

console.log("=== Rechner Tests ===");

assert.strictEqual(berechnen(2, "addieren", 3), 5, "2 + 3 = 5");
assert.strictEqual(berechnen(10, "subtrahieren", 4), 6, "10 - 4 = 6");
assert.strictEqual(berechnen(3, "multiplizieren", 7), 21, "3 * 7 = 21");
assert.strictEqual(berechnen(15, "dividieren", 3), 5, "15 / 3 = 5");
assert.strictEqual(berechnen(1.5, "addieren", 2.5), 4, "1.5 + 2.5 = 4");
assert.strictEqual(berechnen(-5, "addieren", 5), 0, "-5 + 5 = 0");
assert.strictEqual(berechnen(0, "multiplizieren", 100), 0, "0 * 100 = 0");

// Division durch Null
assert.throws(
    function () { berechnen(10, "dividieren", 0); },
    { message: "Division durch Null ist nicht erlaubt" },
    "Division durch Null wirft Fehler"
);

// Unbekannte Operation
assert.throws(
    function () { berechnen(1, "wurzel", 2); },
    { message: "Unbekannte Operation: wurzel" },
    "Unbekannte Operation wirft Fehler"
);

console.log("  9 Tests bestanden");

// --- Benutzer-Validierung Tests ---

console.log("\n=== Benutzer-Validierung Tests ===");

// Gueltige Daten
var fehler1 = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30 });
assert.strictEqual(fehler1.length, 0, "Gueltige Daten haben keine Fehler");

// Leerer Name
var fehler2 = benutzerValidieren({ name: "", email: "max@test.de", alter: 30 });
assert.ok(fehler2.length > 0, "Leerer Name erzeugt Fehler");
assert.ok(fehler2[0].includes("Name"), "Fehlermeldung erwaehnt Name");

// Ohne @-Zeichen in Email
var fehler3 = benutzerValidieren({ name: "Max", email: "ungueltig", alter: 30 });
assert.ok(fehler3.length > 0, "Ungueltige Email erzeugt Fehler");

// Alter zu hoch
var fehler4 = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 200 });
assert.ok(fehler4.length > 0, "Alter > 150 erzeugt Fehler");

// Alter negativ
var fehler5 = benutzerValidieren({ name: "Max", email: "max@test.de", alter: -1 });
assert.ok(fehler5.length > 0, "Negatives Alter erzeugt Fehler");

// Ungueltige PLZ
var fehler6 = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "123" });
assert.ok(fehler6.length > 0, "PLZ mit 3 Ziffern erzeugt Fehler");

// Gueltige PLZ
var fehler7 = benutzerValidieren({ name: "Max", email: "max@test.de", alter: 30, plz: "10115" });
assert.strictEqual(fehler7.length, 0, "Gueltige PLZ erzeugt keinen Fehler");

// Alle Felder ungueltig
var fehler8 = benutzerValidieren({ name: "", email: "", alter: -1 });
assert.strictEqual(fehler8.length, 3, "3 ungueltige Felder erzeugen 3 Fehler");

// Alter undefined
var fehler9 = benutzerValidieren({ name: "Max", email: "max@test.de" });
assert.ok(fehler9.length > 0, "Fehlendes Alter erzeugt Fehler");

// Vollstaendige Adresse
var fehler10 = benutzerValidieren({
    name: "Anna", email: "anna@test.de", alter: 25,
    strasse: "Hauptstr. 1", plz: "10115", stadt: "Berlin"
});
assert.strictEqual(fehler10.length, 0, "Vollstaendige Daten mit Adresse sind gueltig");

console.log("  10 Tests bestanden");

// --- escapeHtml Tests ---

console.log("\n=== escapeHtml Tests ===");

// In Node.js gibt es kein document.createElement, also testen wir den Export nur
assert.strictEqual(typeof escapeHtml, "function", "escapeHtml ist exportiert");

console.log("  1 Test bestanden");

console.log("\n=== Alle 20 JS-Tests bestanden ===");
