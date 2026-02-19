/** Zzz Frontend-Logik */

const API_BASE = "/api";

/** Rechner */
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

function initRechner() {
    const form = document.getElementById("rechner-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const a = parseFloat(document.getElementById("zahl-a").value);
        const b = parseFloat(document.getElementById("zahl-b").value);
        const op = document.getElementById("operation").value;
        const ergebnisDiv = document.getElementById("ergebnis");
        const fehlerDiv = document.getElementById("fehler");

        try {
            const ergebnis = berechnen(a, op, b);
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
    const fehler = [];

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

function initBenutzerFormular() {
    const form = document.getElementById("benutzer-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const daten = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            alter: parseInt(document.getElementById("alter").value, 10),
            strasse: document.getElementById("strasse").value,
            plz: document.getElementById("plz").value,
            stadt: document.getElementById("stadt").value,
        };

        const fehler = benutzerValidieren(daten);
        const erfolgDiv = document.getElementById("benutzer-erfolg");
        const fehlerDiv = document.getElementById("benutzer-fehler");

        if (fehler.length > 0) {
            fehlerDiv.textContent = fehler.join(", ");
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        } else {
            benutzerZurTabelle(daten);
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            form.reset();
        }
    });
}

function benutzerZurTabelle(daten) {
    const tbody = document.querySelector("#benutzer-tabelle tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.innerHTML =
        "<td>" + escapeHtml(daten.name) + "</td>" +
        "<td>" + escapeHtml(daten.email) + "</td>" +
        "<td>" + daten.alter + "</td>" +
        "<td>" + escapeHtml(daten.stadt || "-") + "</td>";
    tbody.appendChild(tr);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** Exportieren fuer Tests (Node.js) */
if (typeof module !== "undefined" && module.exports) {
    module.exports = { berechnen, benutzerValidieren, escapeHtml };
}

/** Init */
document.addEventListener("DOMContentLoaded", function () {
    initRechner();
    initBenutzerFormular();
});
