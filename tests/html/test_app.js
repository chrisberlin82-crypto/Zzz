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

console.log("\n=== Alle " + bestanden + " JS-Tests bestanden ===");
