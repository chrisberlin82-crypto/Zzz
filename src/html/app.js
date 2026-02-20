/** Zzz Frontend-Logik */

var API_BASE = "/api";

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
    var response = await fetch(API_BASE + "/berechnen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: a, b: b, operation: operation }),
    });
    var daten = await response.json();
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
            verlaufAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            ergebnisDiv.hidden = true;
        }
    });

    initVerlauf();
}

/** Benutzer-Validierung */
function benutzerValidieren(daten) {
    var fehler = [];

    if (!daten.name || daten.name.trim().length === 0) {
        fehler.push("Name ist erforderlich");
    }
    if (!daten.email || !daten.email.includes("@")) {
        fehler.push("Gueltige E-Mail-Adresse ist erforderlich");
    }
    if (daten.alter === undefined || daten.alter < 0 || daten.alter > 150) {
        fehler.push("Alter muss zwischen 0 und 150 liegen");
    }
    if (daten.plz && !/^[0-9]{5}$/.test(daten.plz)) {
        fehler.push("PLZ muss 5 Ziffern haben");
    }

    return fehler;
}

/** API: Benutzer speichern (POST) */
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

/** API: Benutzer aktualisieren (PUT) */
async function benutzerAktualisierenApi(id, daten) {
    var response = await fetch(API_BASE + "/benutzer/" + id, {
        method: "PUT",
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

/** API: Benutzer loeschen (DELETE) */
async function benutzerLoeschenApi(id) {
    var response = await fetch(API_BASE + "/benutzer/" + id, {
        method: "DELETE",
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        throw new Error(ergebnis.fehler || "Serverfehler");
    }
    return ergebnis;
}

/** API: Benutzerliste laden (GET) */
async function benutzerLadenApi(suche) {
    var url = API_BASE + "/benutzer";
    if (suche) url += "?suche=" + encodeURIComponent(suche);
    var response = await fetch(url);
    if (!response.ok) throw new Error("Fehler beim Laden der Benutzer");
    return response.json();
}

/** API: Verlauf laden */
async function verlaufLadenApi() {
    var response = await fetch(API_BASE + "/verlauf");
    if (!response.ok) throw new Error("Fehler beim Laden des Verlaufs");
    return response.json();
}

/** API: Verlauf loeschen */
async function verlaufLoeschenApi() {
    var response = await fetch(API_BASE + "/verlauf", { method: "DELETE" });
    if (!response.ok) throw new Error("Fehler beim Loeschen");
    return response.json();
}

var OP_SYMBOLE = {
    addieren: "+", subtrahieren: "-",
    multiplizieren: "*", dividieren: "/"
};

function initVerlauf() {
    verlaufAktualisieren();

    var btn = document.getElementById("btn-verlauf-loeschen");
    if (btn) {
        btn.addEventListener("click", async function () {
            try {
                await verlaufLoeschenApi();
                verlaufAktualisieren();
            } catch (_) {}
        });
    }
}

async function verlaufAktualisieren() {
    try {
        var eintraege = await verlaufLadenApi();
        var tbody = document.querySelector("#verlauf-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        eintraege.forEach(function (e) {
            var tr = document.createElement("tr");
            var symbol = OP_SYMBOLE[e.operation] || e.operation;
            tr.innerHTML =
                "<td>" + e.a + " " + symbol + " " + e.b + "</td>" +
                "<td>" + e.ergebnis + "</td>" +
                "<td>" + escapeHtml(e.erstellt_am || "") + "</td>";
            tbody.appendChild(tr);
        });
    } catch (_) {}
}

function initBenutzerFormular() {
    var form = document.getElementById("benutzer-form");
    if (!form) return;

    var btnAbbrechen = document.getElementById("btn-abbrechen");

    benutzerListeAktualisieren();

    var suchfeld = document.getElementById("benutzer-suche");
    if (suchfeld) {
        var suchTimer;
        suchfeld.addEventListener("input", function () {
            clearTimeout(suchTimer);
            suchTimer = setTimeout(function () {
                benutzerListeAktualisieren(suchfeld.value);
            }, 300);
        });
    }

    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () {
            formularZuruecksetzen();
        });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var bearbeitenId = document.getElementById("benutzer-id").value;
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
            if (bearbeitenId) {
                await benutzerAktualisierenApi(bearbeitenId, daten);
                erfolgDiv.textContent = "Benutzer aktualisiert!";
            } else {
                await benutzerSpeichernApi(daten);
                erfolgDiv.textContent = "Benutzer erfolgreich gespeichert!";
            }
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            formularZuruecksetzen();
            benutzerListeAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

function formularZuruecksetzen() {
    var form = document.getElementById("benutzer-form");
    if (form) form.reset();
    document.getElementById("benutzer-id").value = "";
    document.getElementById("formular-titel").textContent = "Benutzer anlegen";
    document.getElementById("btn-speichern").textContent = "Speichern";
    var btnAbbrechen = document.getElementById("btn-abbrechen");
    if (btnAbbrechen) btnAbbrechen.hidden = true;
}

function benutzerBearbeiten(benutzer) {
    document.getElementById("benutzer-id").value = benutzer.id;
    document.getElementById("name").value = benutzer.name;
    document.getElementById("email").value = benutzer.email;
    document.getElementById("alter").value = benutzer.alter;
    document.getElementById("strasse").value = benutzer.strasse || "";
    document.getElementById("plz").value = benutzer.plz || "";
    document.getElementById("stadt").value = benutzer.stadt || "";
    document.getElementById("formular-titel").textContent = "Benutzer bearbeiten";
    document.getElementById("btn-speichern").textContent = "Aktualisieren";
    var btnAbbrechen = document.getElementById("btn-abbrechen");
    if (btnAbbrechen) btnAbbrechen.hidden = false;
    document.getElementById("benutzer-formular").scrollIntoView({ behavior: "smooth" });
}

async function benutzerEntfernen(id) {
    if (!confirm("Benutzer wirklich loeschen?")) return;
    try {
        await benutzerLoeschenApi(id);
        benutzerListeAktualisieren();
    } catch (err) {
        alert("Fehler: " + err.message);
    }
}

async function benutzerListeAktualisieren(suche) {
    try {
        var benutzer = await benutzerLadenApi(suche);
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
    tr.setAttribute("data-id", daten.id);
    tr.innerHTML =
        "<td>" + (daten.id || "") + "</td>" +
        "<td>" + escapeHtml(daten.name) + "</td>" +
        "<td>" + escapeHtml(daten.email) + "</td>" +
        "<td>" + daten.alter + "</td>" +
        "<td>" + escapeHtml(daten.stadt || "-") + "</td>" +
        '<td class="aktionen">' +
            '<button class="btn-bearbeiten" title="Bearbeiten">Bearbeiten</button> ' +
            '<button class="btn-loeschen" title="Loeschen">Loeschen</button>' +
        "</td>";

    var btnBearbeiten = tr.querySelector(".btn-bearbeiten");
    var btnLoeschen = tr.querySelector(".btn-loeschen");

    btnBearbeiten.addEventListener("click", function () {
        benutzerBearbeiten(daten);
    });
    btnLoeschen.addEventListener("click", function () {
        benutzerEntfernen(daten.id);
    });

    tbody.appendChild(tr);
}

function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/** Exportieren fuer Tests (Node.js) */
if (typeof module !== "undefined" && module.exports) {
    module.exports = { berechnen, benutzerValidieren, escapeHtml, OP_SYMBOLE };
}

/** Init (nur im Browser) */
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
        initRechner();
        initBenutzerFormular();
    });
}
