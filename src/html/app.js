/** MED Rezeption Frontend-Logik */

var API_BASE = "/api";

// ===== Rechner =====

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

// ===== Benutzer-Validierung =====

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

// ===== Benutzer API =====

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

async function benutzerLadenApi(suche) {
    var url = API_BASE + "/benutzer";
    if (suche) url += "?suche=" + encodeURIComponent(suche);
    var response = await fetch(url);
    if (!response.ok) throw new Error("Fehler beim Laden der Benutzer");
    return response.json();
}

// ===== Verlauf =====

async function verlaufLadenApi() {
    var response = await fetch(API_BASE + "/verlauf");
    if (!response.ok) throw new Error("Fehler beim Laden des Verlaufs");
    return response.json();
}

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

// ===== Benutzer-Formular =====

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
    } catch (_) {}
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

// ===== Patienten =====

async function patientenLadenApi(suche) {
    var url = API_BASE + "/patienten";
    if (suche) url += "?suche=" + encodeURIComponent(suche);
    var response = await fetch(url);
    if (!response.ok) throw new Error("Fehler beim Laden");
    return response.json();
}

async function patientSpeichernApi(daten) {
    var response = await fetch(API_BASE + "/patienten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function patientAktualisierenApi(id, daten) {
    var response = await fetch(API_BASE + "/patienten/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function patientLoeschenApi(id) {
    var response = await fetch(API_BASE + "/patienten/" + id, { method: "DELETE" });
    var ergebnis = await response.json();
    if (!response.ok) throw new Error(ergebnis.fehler || "Serverfehler");
    return ergebnis;
}

function initPatienten() {
    var form = document.getElementById("patient-form");
    if (!form) return;

    patientenListeAktualisieren();

    var suchfeld = document.getElementById("patient-suche");
    if (suchfeld) {
        var timer;
        suchfeld.addEventListener("input", function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                patientenListeAktualisieren(suchfeld.value);
            }, 300);
        });
    }

    var btnAbbrechen = document.getElementById("btn-patient-abbrechen");
    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () { patientFormZuruecksetzen(); });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var editId = document.getElementById("patient-id").value;
        var daten = {
            vorname: document.getElementById("patient-vorname").value,
            nachname: document.getElementById("patient-nachname").value,
            geburtsdatum: document.getElementById("patient-geburtsdatum").value,
            versicherungsnummer: document.getElementById("patient-versicherungsnummer").value,
            krankenkasse: document.getElementById("patient-krankenkasse").value,
            telefon: document.getElementById("patient-telefon").value,
            email: document.getElementById("patient-email").value,
            strasse: document.getElementById("patient-strasse").value,
            plz: document.getElementById("patient-plz").value,
            stadt: document.getElementById("patient-stadt").value,
        };

        var erfolgDiv = document.getElementById("patient-erfolg");
        var fehlerDiv = document.getElementById("patient-fehler");

        try {
            if (editId) {
                await patientAktualisierenApi(editId, daten);
                erfolgDiv.textContent = "Patient aktualisiert!";
            } else {
                await patientSpeichernApi(daten);
                erfolgDiv.textContent = "Patient gespeichert!";
            }
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            patientFormZuruecksetzen();
            patientenListeAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

function patientFormZuruecksetzen() {
    var form = document.getElementById("patient-form");
    if (form) form.reset();
    document.getElementById("patient-id").value = "";
    document.getElementById("patient-formular-titel").textContent = "Patient anlegen";
    document.getElementById("btn-patient-speichern").textContent = "Speichern";
    var btn = document.getElementById("btn-patient-abbrechen");
    if (btn) btn.hidden = true;
}

function patientBearbeiten(p) {
    document.getElementById("patient-id").value = p.id;
    document.getElementById("patient-vorname").value = p.vorname;
    document.getElementById("patient-nachname").value = p.nachname;
    document.getElementById("patient-geburtsdatum").value = p.geburtsdatum;
    document.getElementById("patient-versicherungsnummer").value = p.versicherungsnummer;
    document.getElementById("patient-krankenkasse").value = p.krankenkasse;
    document.getElementById("patient-telefon").value = p.telefon || "";
    document.getElementById("patient-email").value = p.email || "";
    document.getElementById("patient-strasse").value = p.strasse || "";
    document.getElementById("patient-plz").value = p.plz || "";
    document.getElementById("patient-stadt").value = p.stadt || "";
    document.getElementById("patient-formular-titel").textContent = "Patient bearbeiten";
    document.getElementById("btn-patient-speichern").textContent = "Aktualisieren";
    var btn = document.getElementById("btn-patient-abbrechen");
    if (btn) btn.hidden = false;
    document.getElementById("patient-formular").scrollIntoView({ behavior: "smooth" });
}

async function patientenListeAktualisieren(suche) {
    try {
        var patienten = await patientenLadenApi(suche);
        var tbody = document.querySelector("#patienten-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        patienten.forEach(function (p) {
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + escapeHtml(p.nachname + ", " + p.vorname) + "</td>" +
                "<td>" + escapeHtml(p.geburtsdatum) + "</td>" +
                "<td>" + escapeHtml(p.versicherungsnummer) + "</td>" +
                "<td>" + escapeHtml(p.krankenkasse) + "</td>" +
                "<td>" + escapeHtml(p.telefon || "-") + "</td>" +
                '<td class="aktionen">' +
                    '<button class="btn-bearbeiten">Bearbeiten</button> ' +
                    '<button class="btn-loeschen">Loeschen</button>' +
                "</td>";
            tr.querySelector(".btn-bearbeiten").addEventListener("click", function () { patientBearbeiten(p); });
            tr.querySelector(".btn-loeschen").addEventListener("click", async function () {
                if (!confirm("Patient wirklich loeschen?")) return;
                try { await patientLoeschenApi(p.id); patientenListeAktualisieren(); } catch (err) { alert(err.message); }
            });
            tbody.appendChild(tr);
        });
    } catch (_) {}
}

// ===== Aerzte =====

async function aerzteLadenApi() {
    var response = await fetch(API_BASE + "/aerzte");
    if (!response.ok) throw new Error("Fehler beim Laden");
    return response.json();
}

async function arztSpeichernApi(daten) {
    var response = await fetch(API_BASE + "/aerzte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function arztAktualisierenApi(id, daten) {
    var response = await fetch(API_BASE + "/aerzte/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function arztLoeschenApi(id) {
    var response = await fetch(API_BASE + "/aerzte/" + id, { method: "DELETE" });
    var ergebnis = await response.json();
    if (!response.ok) throw new Error(ergebnis.fehler || "Serverfehler");
    return ergebnis;
}

function initAerzte() {
    var form = document.getElementById("arzt-form");
    if (!form) return;

    aerzteListeAktualisieren();

    var btnAbbrechen = document.getElementById("btn-arzt-abbrechen");
    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () { arztFormZuruecksetzen(); });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var editId = document.getElementById("arzt-id").value;
        var daten = {
            titel: document.getElementById("arzt-titel").value,
            vorname: document.getElementById("arzt-vorname").value,
            nachname: document.getElementById("arzt-nachname").value,
            fachrichtung: document.getElementById("arzt-fachrichtung").value,
            telefon: document.getElementById("arzt-telefon").value,
            email: document.getElementById("arzt-email").value,
        };

        var erfolgDiv = document.getElementById("arzt-erfolg");
        var fehlerDiv = document.getElementById("arzt-fehler");

        try {
            if (editId) {
                await arztAktualisierenApi(editId, daten);
                erfolgDiv.textContent = "Arzt aktualisiert!";
            } else {
                await arztSpeichernApi(daten);
                erfolgDiv.textContent = "Arzt gespeichert!";
            }
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            arztFormZuruecksetzen();
            aerzteListeAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

function arztFormZuruecksetzen() {
    var form = document.getElementById("arzt-form");
    if (form) form.reset();
    document.getElementById("arzt-id").value = "";
    document.getElementById("arzt-formular-titel").textContent = "Arzt anlegen";
    document.getElementById("btn-arzt-speichern").textContent = "Speichern";
    var btn = document.getElementById("btn-arzt-abbrechen");
    if (btn) btn.hidden = true;
}

function arztBearbeiten(a) {
    document.getElementById("arzt-id").value = a.id;
    document.getElementById("arzt-titel").value = a.titel || "";
    document.getElementById("arzt-vorname").value = a.vorname;
    document.getElementById("arzt-nachname").value = a.nachname;
    document.getElementById("arzt-fachrichtung").value = a.fachrichtung;
    document.getElementById("arzt-telefon").value = a.telefon || "";
    document.getElementById("arzt-email").value = a.email || "";
    document.getElementById("arzt-formular-titel").textContent = "Arzt bearbeiten";
    document.getElementById("btn-arzt-speichern").textContent = "Aktualisieren";
    var btn = document.getElementById("btn-arzt-abbrechen");
    if (btn) btn.hidden = false;
    document.getElementById("arzt-formular").scrollIntoView({ behavior: "smooth" });
}

async function aerzteListeAktualisieren() {
    try {
        var aerzte = await aerzteLadenApi();
        var tbody = document.querySelector("#aerzte-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        aerzte.forEach(function (a) {
            var vollname = ((a.titel || "") + " " + a.vorname + " " + a.nachname).trim();
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + escapeHtml(vollname) + "</td>" +
                "<td>" + escapeHtml(a.fachrichtung) + "</td>" +
                "<td>" + escapeHtml(a.telefon || "-") + "</td>" +
                "<td>" + escapeHtml(a.email || "-") + "</td>" +
                '<td class="aktionen">' +
                    '<button class="btn-bearbeiten">Bearbeiten</button> ' +
                    '<button class="btn-loeschen">Loeschen</button>' +
                "</td>";
            tr.querySelector(".btn-bearbeiten").addEventListener("click", function () { arztBearbeiten(a); });
            tr.querySelector(".btn-loeschen").addEventListener("click", async function () {
                if (!confirm("Arzt wirklich loeschen?")) return;
                try { await arztLoeschenApi(a.id); aerzteListeAktualisieren(); } catch (err) { alert(err.message); }
            });
            tbody.appendChild(tr);
        });
    } catch (_) {}
}

// ===== Termine =====

async function termineLadenApi(datum) {
    var url = API_BASE + "/termine";
    if (datum) url += "?datum=" + encodeURIComponent(datum);
    var response = await fetch(url);
    if (!response.ok) throw new Error("Fehler beim Laden");
    return response.json();
}

async function terminSpeichernApi(daten) {
    var response = await fetch(API_BASE + "/termine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function terminAktualisierenApi(id, daten) {
    var response = await fetch(API_BASE + "/termine/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function terminLoeschenApi(id) {
    var response = await fetch(API_BASE + "/termine/" + id, { method: "DELETE" });
    var ergebnis = await response.json();
    if (!response.ok) throw new Error(ergebnis.fehler || "Serverfehler");
    return ergebnis;
}

function initTermine() {
    var form = document.getElementById("termin-form");
    if (!form) return;

    terminDropdownsLaden();
    termineListeAktualisieren();

    var datumFilter = document.getElementById("termin-filter-datum");
    if (datumFilter) {
        datumFilter.addEventListener("change", function () {
            termineListeAktualisieren(datumFilter.value);
        });
    }

    var btnAbbrechen = document.getElementById("btn-termin-abbrechen");
    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () { terminFormZuruecksetzen(); });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var editId = document.getElementById("termin-id").value;
        var daten = {
            patient_id: parseInt(document.getElementById("termin-patient").value, 10),
            arzt_id: parseInt(document.getElementById("termin-arzt").value, 10),
            datum: document.getElementById("termin-datum").value,
            uhrzeit: document.getElementById("termin-uhrzeit").value,
            dauer_minuten: parseInt(document.getElementById("termin-dauer").value, 10) || 15,
            grund: document.getElementById("termin-grund").value,
        };

        var erfolgDiv = document.getElementById("termin-erfolg");
        var fehlerDiv = document.getElementById("termin-fehler");

        try {
            if (editId) {
                await terminAktualisierenApi(editId, daten);
                erfolgDiv.textContent = "Termin aktualisiert!";
            } else {
                await terminSpeichernApi(daten);
                erfolgDiv.textContent = "Termin gespeichert!";
            }
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            terminFormZuruecksetzen();
            termineListeAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

async function terminDropdownsLaden() {
    try {
        var patienten = await patientenLadenApi();
        var sel = document.getElementById("termin-patient");
        if (sel) {
            patienten.forEach(function (p) {
                var opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.nachname + ", " + p.vorname + " (" + p.versicherungsnummer + ")";
                sel.appendChild(opt);
            });
        }
    } catch (_) {}
    try {
        var aerzte = await aerzteLadenApi();
        var sel2 = document.getElementById("termin-arzt");
        if (sel2) {
            aerzte.forEach(function (a) {
                var opt = document.createElement("option");
                opt.value = a.id;
                opt.textContent = ((a.titel || "") + " " + a.vorname + " " + a.nachname).trim() + " - " + a.fachrichtung;
                sel2.appendChild(opt);
            });
        }
    } catch (_) {}
}

function terminFormZuruecksetzen() {
    var form = document.getElementById("termin-form");
    if (form) form.reset();
    document.getElementById("termin-id").value = "";
    document.getElementById("termin-formular-titel").textContent = "Termin anlegen";
    document.getElementById("btn-termin-speichern").textContent = "Speichern";
    var btn = document.getElementById("btn-termin-abbrechen");
    if (btn) btn.hidden = true;
}

function terminBearbeiten(t) {
    document.getElementById("termin-id").value = t.id;
    document.getElementById("termin-patient").value = t.patient_id;
    document.getElementById("termin-arzt").value = t.arzt_id;
    document.getElementById("termin-datum").value = t.datum;
    document.getElementById("termin-uhrzeit").value = t.uhrzeit;
    document.getElementById("termin-dauer").value = t.dauer_minuten;
    document.getElementById("termin-grund").value = t.grund || "";
    document.getElementById("termin-formular-titel").textContent = "Termin bearbeiten";
    document.getElementById("btn-termin-speichern").textContent = "Aktualisieren";
    var btn = document.getElementById("btn-termin-abbrechen");
    if (btn) btn.hidden = false;
    document.getElementById("termin-formular").scrollIntoView({ behavior: "smooth" });
}

var STATUS_KLASSEN = {
    geplant: "status-geplant",
    bestaetigt: "status-bestaetigt",
    abgesagt: "status-abgesagt",
    abgeschlossen: "status-abgeschlossen",
};

async function termineListeAktualisieren(datum) {
    try {
        var termine = await termineLadenApi(datum);
        var tbody = document.querySelector("#termine-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        termine.forEach(function (t) {
            var statusKlasse = STATUS_KLASSEN[t.status] || "status-geplant";
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + escapeHtml(t.datum) + "</td>" +
                "<td>" + escapeHtml(t.uhrzeit) + "</td>" +
                "<td>" + escapeHtml(t.patient_name) + "</td>" +
                "<td>" + escapeHtml(t.arzt_name) + "</td>" +
                "<td>" + escapeHtml(t.grund || "-") + "</td>" +
                '<td><span class="status-badge ' + statusKlasse + '">' + escapeHtml(t.status) + "</span></td>" +
                '<td class="aktionen">' +
                    '<button class="btn-bearbeiten">Bearbeiten</button> ' +
                    '<button class="btn-loeschen">Loeschen</button>' +
                "</td>";
            tr.querySelector(".btn-bearbeiten").addEventListener("click", function () { terminBearbeiten(t); });
            tr.querySelector(".btn-loeschen").addEventListener("click", async function () {
                if (!confirm("Termin wirklich loeschen?")) return;
                try { await terminLoeschenApi(t.id); termineListeAktualisieren(datum); } catch (err) { alert(err.message); }
            });
            tbody.appendChild(tr);
        });
    } catch (_) {}
}

// ===== Wartezimmer =====

async function wartezimmerLadenApi() {
    var response = await fetch(API_BASE + "/wartezimmer");
    if (!response.ok) throw new Error("Fehler beim Laden");
    return response.json();
}

async function wartezimmerCheckinApi(daten) {
    var response = await fetch(API_BASE + "/wartezimmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
    });
    var ergebnis = await response.json();
    if (!response.ok) {
        var msg = Array.isArray(ergebnis.fehler) ? ergebnis.fehler.join(", ") : ergebnis.fehler;
        throw new Error(msg || "Serverfehler");
    }
    return ergebnis;
}

async function wartezimmerStatusApi(id, status) {
    var response = await fetch(API_BASE + "/wartezimmer/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
    });
    var ergebnis = await response.json();
    if (!response.ok) throw new Error(ergebnis.fehler || "Serverfehler");
    return ergebnis;
}

async function wartezimmerEntfernenApi(id) {
    var response = await fetch(API_BASE + "/wartezimmer/" + id, { method: "DELETE" });
    var ergebnis = await response.json();
    if (!response.ok) throw new Error(ergebnis.fehler || "Serverfehler");
    return ergebnis;
}

function initWartezimmer() {
    var form = document.getElementById("checkin-form");
    if (!form) return;

    wartezimmerDropdownsLaden();
    wartezimmerAktualisieren();

    // Auto-Refresh alle 15 Sekunden
    setInterval(wartezimmerAktualisieren, 15000);

    var patientSelect = document.getElementById("checkin-patient");
    if (patientSelect) {
        patientSelect.addEventListener("change", function () {
            wartezimmerTermineLaden(patientSelect.value);
        });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var daten = {
            patient_id: parseInt(document.getElementById("checkin-patient").value, 10),
        };
        var terminId = document.getElementById("checkin-termin").value;
        if (terminId) daten.termin_id = parseInt(terminId, 10);

        var erfolgDiv = document.getElementById("checkin-erfolg");
        var fehlerDiv = document.getElementById("checkin-fehler");

        try {
            await wartezimmerCheckinApi(daten);
            erfolgDiv.textContent = "Patient eingecheckt!";
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            form.reset();
            wartezimmerAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

async function wartezimmerDropdownsLaden() {
    try {
        var patienten = await patientenLadenApi();
        var sel = document.getElementById("checkin-patient");
        if (sel) {
            patienten.forEach(function (p) {
                var opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.nachname + ", " + p.vorname;
                sel.appendChild(opt);
            });
        }
    } catch (_) {}
}

async function wartezimmerTermineLaden(patientId) {
    var sel = document.getElementById("checkin-termin");
    if (!sel) return;
    // Optionen zuruecksetzen
    sel.innerHTML = '<option value="">-- Ohne Termin --</option>';
    if (!patientId) return;
    try {
        var heute = new Date().toISOString().split("T")[0];
        var termine = await termineLadenApi(heute);
        termine.forEach(function (t) {
            if (t.patient_id === parseInt(patientId, 10) && t.status !== "abgesagt") {
                var opt = document.createElement("option");
                opt.value = t.id;
                opt.textContent = t.uhrzeit + " - " + (t.grund || "Termin") + " bei " + t.arzt_name;
                sel.appendChild(opt);
            }
        });
    } catch (_) {}
}

function wartezeitBerechnen(ankunftZeit) {
    if (!ankunftZeit) return "";
    var ankunft = new Date(ankunftZeit);
    var jetzt = new Date();
    var diff = Math.floor((jetzt - ankunft) / 60000);
    if (diff < 1) return "gerade eben";
    if (diff < 60) return diff + " Min.";
    return Math.floor(diff / 60) + " Std. " + (diff % 60) + " Min.";
}

async function wartezimmerAktualisieren() {
    try {
        var eintraege = await wartezimmerLadenApi();
        var container = document.getElementById("wartezimmer-liste");
        var badge = document.getElementById("wartezimmer-anzahl");
        if (!container) return;

        var wartend = eintraege.filter(function (e) { return e.status === "wartend"; }).length;
        if (badge) badge.textContent = wartend + " wartend";

        container.innerHTML = "";
        if (eintraege.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">Keine Patienten im Wartezimmer.</p>';
            return;
        }

        eintraege.forEach(function (e) {
            var karte = document.createElement("div");
            karte.className = "warte-karte " + e.status;

            var info = '<div class="warte-info">' +
                "<h3>" + escapeHtml(e.patient_name) + "</h3>" +
                "<p>";
            if (e.termin_uhrzeit) info += "Termin: " + escapeHtml(e.termin_uhrzeit);
            if (e.termin_grund) info += " - " + escapeHtml(e.termin_grund);
            if (e.arzt_name) info += " bei " + escapeHtml(e.arzt_name);
            info += '</p><p class="wartezeit">Wartezeit: ' + wartezeitBerechnen(e.ankunft_zeit) + "</p></div>";

            var aktionen = '<div class="warte-aktionen">';
            if (e.status === "wartend") {
                aktionen += '<button class="btn-aufrufen">Aufrufen</button>';
            }
            if (e.status === "aufgerufen") {
                aktionen += '<button class="btn-fertig">Fertig</button>';
            }
            aktionen += '<button class="btn-loeschen">Entfernen</button></div>';

            karte.innerHTML = info + aktionen;

            var btnAufrufen = karte.querySelector(".btn-aufrufen");
            if (btnAufrufen) {
                btnAufrufen.addEventListener("click", async function () {
                    try { await wartezimmerStatusApi(e.id, "aufgerufen"); wartezimmerAktualisieren(); } catch (_) {}
                });
            }
            var btnFertig = karte.querySelector(".btn-fertig");
            if (btnFertig) {
                btnFertig.addEventListener("click", async function () {
                    try { await wartezimmerStatusApi(e.id, "fertig"); wartezimmerAktualisieren(); } catch (_) {}
                });
            }
            karte.querySelector(".btn-loeschen").addEventListener("click", async function () {
                try { await wartezimmerEntfernenApi(e.id); wartezimmerAktualisieren(); } catch (_) {}
            });

            container.appendChild(karte);
        });
    } catch (_) {}
}

// ===== Hilfsfunktionen =====

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
        initPatienten();
        initAerzte();
        initTermine();
        initWartezimmer();
    });
}
