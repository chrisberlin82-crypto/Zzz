/** Zzz Frontend-Logik */

const API_BASE = "/api";

/** Rechner (Client-Fallback) */
function berechnen(a, operation, b) {
    switch (operation) {
        case "addieren":
            return a + b;
        case "subtrahieren":
            return a - b;
        case "multiplizieren":
            return a * b;
        case "dividieren":
            if (b === 0) throw new Error("Division durch Null ist nicht erlaubt");
            return a / b;
        default:
            throw new Error("Unbekannte Operation: " + operation);
    }
}

/** API-Aufruf fuer Berechnung */
async function berechnenApi(a, operation, b) {
    const response = await fetch(API_BASE + "/berechnen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: a, b: b, operation: operation }),
    });
    const daten = await response.json();
    if (!response.ok) {
        throw new Error(daten.fehler || "Serverfehler");
    }
    return daten.ergebnis;
}

function initRechner() {
    var form = document.getElementById("rechner-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var a = parseFloat(document.getElementById("zahl-a").value);
        var b = parseFloat(document.getElementById("zahl-b").value);
        var op = document.getElementById("operation").value;
        var ergebnisDiv = document.getElementById("ergebnis");
        var fehlerDiv = document.getElementById("fehler");

        try {
            var ergebnis;
            try {
                ergebnis = await berechnenApi(a, op, b);
            } catch (_) {
                ergebnis = berechnen(a, op, b);
            }
            document.getElementById("ergebnis-wert").textContent = ergebnis;
            ergebnisDiv.hidden = false;
            fehlerDiv.hidden = true;
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            ergebnisDiv.hidden = true;
        }
    });
}

/** Benutzer-Validierung */
function benutzerValidieren(daten) {
    var fehler = [];

    if (!daten.name || daten.name.trim().length === 0) {
        fehler.push("Name ist erforderlich");
    }
    if (!daten.email || !daten.email.includes("@")) {
        fehler.push("Gültige E-Mail-Adresse ist erforderlich");
    }
    if (daten.alter === undefined || daten.alter < 0 || daten.alter > 150) {
        fehler.push("Alter muss zwischen 0 und 150 liegen");
    }
    if (daten.plz && !/^[0-9]{5}$/.test(daten.plz)) {
        fehler.push("PLZ muss 5 Ziffern haben");
    }

    return fehler;
}

/** API-Aufruf fuer Benutzer speichern */
async function benutzerSpeichernApi(daten) {
    var response = await fetch(API_BASE + "/benutzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler)
            ? ergebnis.fehler.join(", ")
            : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

/** API-Aufruf fuer Benutzerliste laden */
async function benutzerLadenApi() {
    var response = await fetch(API_BASE + "/benutzer");
    if (!response.ok) throw new Error("Fehler beim Laden der Benutzer");
    return response.json();
}

function initBenutzerFormular() {
    var form = document.getElementById("benutzer-form");
    if (!form) return;

    benutzerListeAktualisieren();

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var daten = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            alter: parseInt(document.getElementById("alter").value, 10),
            strasse: document.getElementById("strasse").value,
            plz: document.getElementById("plz").value,
            stadt: document.getElementById("stadt").value,
        };

        var fehler = benutzerValidieren(daten);
        var erfolgDiv = document.getElementById("benutzer-erfolg");
        var fehlerDiv = document.getElementById("benutzer-fehler");

        if (fehler.length > 0) {
            fehlerDiv.textContent = fehler.join(", ");
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
            return;
        }

        try {
            await benutzerSpeichernApi(daten);
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            form.reset();
            benutzerListeAktualisieren();
        } catch (err) {
            benutzerZurTabelle(daten);
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            form.reset();
        }
    });
}

async function benutzerListeAktualisieren() {
    try {
        var benutzer = await benutzerLadenApi();
        var tbody = document.querySelector("#benutzer-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        benutzer.forEach(function (b) {
            benutzerZurTabelle(b);
        });
    } catch (_) {
        // Offline: Tabelle bleibt wie sie ist
    }
}

function benutzerZurTabelle(daten) {
    var tbody = document.querySelector("#benutzer-tabelle tbody");
    if (!tbody) return;

    var tr = document.createElement("tr");
    tr.innerHTML =
        "<td>" + escapeHtml(daten.name) + "</td>" +
        "<td>" + escapeHtml(daten.email) + "</td>" +
        "<td>" + daten.alter + "</td>" +
        "<td>" + escapeHtml(daten.stadt || "-") + "</td>";
    tbody.appendChild(tr);
}

function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** Exportieren fuer Tests (Node.js) */
if (typeof module !== "undefined" && module.exports) {
    module.exports = { berechnen, benutzerValidieren, escapeHtml };
}

/** Init (nur im Browser) */
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
        initRechner();
        initBenutzerFormular();
    });
}
