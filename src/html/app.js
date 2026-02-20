/** MED Rezeption Frontend-Logik - Demo-Version mit localStorage */

var API_BASE = "/api";

// ===== localStorage Helfer =====

function dbLaden(schluessel) {
    try {
        var daten = localStorage.getItem("med_" + schluessel);
        return daten ? JSON.parse(daten) : [];
    } catch (e) { return []; }
}

function dbSpeichern(schluessel, daten) {
    localStorage.setItem("med_" + schluessel, JSON.stringify(daten));
}

function dbNaechsteId(schluessel) {
    var liste = dbLaden(schluessel);
    var maxId = 0;
    liste.forEach(function (item) { if (item.id > maxId) maxId = item.id; });
    return maxId + 1;
}

function dbFinden(schluessel, id) {
    var liste = dbLaden(schluessel);
    for (var i = 0; i < liste.length; i++) {
        if (liste[i].id === id) return liste[i];
    }
    return null;
}

function dbLoeschen(schluessel, id) {
    var liste = dbLaden(schluessel);
    var neu = liste.filter(function (item) { return item.id !== id; });
    dbSpeichern(schluessel, neu);
}

function dbAktualisieren(schluessel, id, daten) {
    var liste = dbLaden(schluessel);
    for (var i = 0; i < liste.length; i++) {
        if (liste[i].id === id) {
            Object.keys(daten).forEach(function (k) { liste[i][k] = daten[k]; });
            break;
        }
    }
    dbSpeichern(schluessel, liste);
}

// ===== Demo-Daten =====

function demoDatenLaden() {
    if (localStorage.getItem("med_demo_geladen")) return;

    var patienten = [
        { id: 1, vorname: "Anna", nachname: "Mueller", geburtsdatum: "1985-03-15", versicherungsnummer: "A123456789", krankenkasse: "TK", telefon: "030-1234567", email: "anna.mueller@email.de", strasse: "Berliner Str. 12", plz: "10115", stadt: "Berlin" },
        { id: 2, vorname: "Thomas", nachname: "Schmidt", geburtsdatum: "1970-07-22", versicherungsnummer: "B987654321", krankenkasse: "AOK", telefon: "030-9876543", email: "t.schmidt@email.de", strasse: "Hauptstr. 45", plz: "10827", stadt: "Berlin" },
        { id: 3, vorname: "Maria", nachname: "Weber", geburtsdatum: "1992-11-30", versicherungsnummer: "C456789123", krankenkasse: "Barmer", telefon: "030-5551234", email: "m.weber@email.de", strasse: "Schoenhauser Allee 8", plz: "10435", stadt: "Berlin" },
        { id: 4, vorname: "Klaus", nachname: "Fischer", geburtsdatum: "1955-01-08", versicherungsnummer: "D321654987", krankenkasse: "DAK", telefon: "030-7771234", email: "k.fischer@email.de", strasse: "Kantstr. 99", plz: "10623", stadt: "Berlin" },
        { id: 5, vorname: "Sophie", nachname: "Wagner", geburtsdatum: "2000-05-20", versicherungsnummer: "E654987321", krankenkasse: "IKK", telefon: "030-3334567", email: "s.wagner@email.de", strasse: "Friedrichstr. 200", plz: "10117", stadt: "Berlin" },
    ];

    var aerzte = [
        { id: 1, titel: "Dr.", vorname: "Michael", nachname: "Schneider", fachrichtung: "Allgemeinmedizin", telefon: "030-1110001", email: "dr.schneider@praxis.de" },
        { id: 2, titel: "Dr.", vorname: "Petra", nachname: "Braun", fachrichtung: "Kardiologie", telefon: "030-1110002", email: "dr.braun@praxis.de" },
        { id: 3, titel: "Prof. Dr.", vorname: "Hans", nachname: "Klein", fachrichtung: "Orthopaedie", telefon: "030-1110003", email: "prof.klein@praxis.de" },
    ];

    var heute = new Date().toISOString().split("T")[0];
    var termine = [
        { id: 1, patient_id: 1, arzt_id: 1, datum: heute, uhrzeit: "09:00", dauer_minuten: 30, grund: "Vorsorgeuntersuchung", status: "bestaetigt", patient_name: "Mueller, Anna", arzt_name: "Dr. Michael Schneider" },
        { id: 2, patient_id: 2, arzt_id: 2, datum: heute, uhrzeit: "10:30", dauer_minuten: 20, grund: "Herz-Kontrolle", status: "geplant", patient_name: "Schmidt, Thomas", arzt_name: "Dr. Petra Braun" },
        { id: 3, patient_id: 5, arzt_id: 3, datum: heute, uhrzeit: "14:00", dauer_minuten: 45, grund: "Erstvorstellung Ruecken", status: "geplant", patient_name: "Wagner, Sophie", arzt_name: "Prof. Dr. Hans Klein" },
        { id: 4, patient_id: 3, arzt_id: 1, datum: heute, uhrzeit: "15:30", dauer_minuten: 15, grund: "Rezept abholen", status: "geplant", patient_name: "Weber, Maria", arzt_name: "Dr. Michael Schneider" },
    ];

    var jetzt = new Date();
    var vor20min = new Date(jetzt - 20 * 60000).toISOString();
    var vor5min = new Date(jetzt - 5 * 60000).toISOString();
    var wartezimmer = [
        { id: 1, patient_id: 1, patient_name: "Mueller, Anna", termin_id: 1, termin_uhrzeit: "09:00", termin_grund: "Vorsorgeuntersuchung", arzt_name: "Dr. Michael Schneider", status: "wartend", ankunft_zeit: vor20min },
        { id: 2, patient_id: 2, patient_name: "Schmidt, Thomas", termin_id: 2, termin_uhrzeit: "10:30", termin_grund: "Herz-Kontrolle", arzt_name: "Dr. Petra Braun", status: "aufgerufen", ankunft_zeit: vor5min },
    ];

    var agenten = [
        { id: 1, name: "Lisa Meier", nebenstelle: "100", sip_passwort: "demo123", rolle: "rezeption", warteschlange: "rezeption", status: "online" },
        { id: 2, name: "Peter Schulz", nebenstelle: "101", sip_passwort: "demo456", rolle: "rezeption", warteschlange: "terminvergabe", status: "pause" },
        { id: 3, name: "Dr. Schneider", nebenstelle: "200", sip_passwort: "demo789", rolle: "arzt", warteschlange: "dringend", status: "online" },
    ];

    var benutzer = [
        { id: 1, name: "Admin", email: "admin@praxis.de", alter: 35, strasse: "Praxisstr. 1", plz: "10115", stadt: "Berlin" },
        { id: 2, name: "Lisa Meier", email: "lisa@praxis.de", alter: 28, strasse: "Muellerstr. 5", plz: "10119", stadt: "Berlin" },
        { id: 3, name: "Peter Schulz", email: "peter@praxis.de", alter: 42, strasse: "Torstr. 30", plz: "10119", stadt: "Berlin" },
    ];

    var anrufe = [
        { id: 1, anrufer_nummer: "030-9998877", anrufer_name: "Frau Lehmann", agent_name: "Lisa Meier", warteschlange: "rezeption", typ: "eingehend", status: "beendet", beginn: heute + " 08:15", dauer_sekunden: 180 },
        { id: 2, anrufer_nummer: "030-5554433", anrufer_name: "", agent_name: "Peter Schulz", warteschlange: "terminvergabe", typ: "eingehend", status: "beendet", beginn: heute + " 08:45", dauer_sekunden: 120 },
    ];

    dbSpeichern("patienten", patienten);
    dbSpeichern("aerzte", aerzte);
    dbSpeichern("termine", termine);
    dbSpeichern("wartezimmer", wartezimmer);
    dbSpeichern("agenten", agenten);
    dbSpeichern("benutzer", benutzer);
    dbSpeichern("anrufe", anrufe);
    dbSpeichern("verlauf", []);

    localStorage.setItem("med_demo_geladen", "1");
}

// ===== Rechner =====

function berechnen(a, operation, b) {
    switch (operation) {
        case "addieren": return a + b;
        case "subtrahieren": return a - b;
        case "multiplizieren": return a * b;
        case "dividieren":
            if (b === 0) throw new Error("Division durch Null ist nicht erlaubt");
            return a / b;
        default: throw new Error("Unbekannte Operation: " + operation);
    }
}

async function berechnenApi(a, operation, b) {
    try {
        var response = await fetch(API_BASE + "/berechnen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ a: a, b: b, operation: operation }),
        });
        var daten = await response.json();
        if (!response.ok) throw new Error(daten.fehler || "Serverfehler");
        return daten.ergebnis;
    } catch (e) {
        var ergebnis = berechnen(a, operation, b);
        var verlauf = dbLaden("verlauf");
        verlauf.unshift({ a: a, b: b, operation: operation, ergebnis: ergebnis, erstellt_am: new Date().toLocaleString("de-DE") });
        if (verlauf.length > 20) verlauf = verlauf.slice(0, 20);
        dbSpeichern("verlauf", verlauf);
        return ergebnis;
    }
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
    if (!daten.name || daten.name.trim().length === 0) fehler.push("Name ist erforderlich");
    if (!daten.email || !daten.email.includes("@")) fehler.push("Gueltige E-Mail-Adresse ist erforderlich");
    if (daten.alter === undefined || daten.alter < 0 || daten.alter > 150) fehler.push("Alter muss zwischen 0 und 150 liegen");
    if (daten.plz && !/^[0-9]{5}$/.test(daten.plz)) fehler.push("PLZ muss 5 Ziffern haben");
    return fehler;
}

// ===== Patienten-Validierung =====

function patientValidieren(daten) {
    var fehler = [];
    if (!daten.vorname || daten.vorname.trim().length === 0) fehler.push("Vorname ist erforderlich");
    if (!daten.nachname || daten.nachname.trim().length === 0) fehler.push("Nachname ist erforderlich");
    if (!daten.geburtsdatum) fehler.push("Geburtsdatum ist erforderlich");
    if (!daten.versicherungsnummer || daten.versicherungsnummer.trim().length === 0) fehler.push("Versicherungsnummer ist erforderlich");
    if (!daten.krankenkasse || daten.krankenkasse.trim().length === 0) fehler.push("Krankenkasse ist erforderlich");
    return fehler;
}

// ===== Aerzte-Validierung =====

function arztValidieren(daten) {
    var fehler = [];
    if (!daten.vorname || daten.vorname.trim().length === 0) fehler.push("Vorname ist erforderlich");
    if (!daten.nachname || daten.nachname.trim().length === 0) fehler.push("Nachname ist erforderlich");
    if (!daten.fachrichtung || daten.fachrichtung.trim().length === 0) fehler.push("Fachrichtung ist erforderlich");
    return fehler;
}

// ===== Termin-Validierung =====

function terminValidieren(daten) {
    var fehler = [];
    if (!daten.patient_id) fehler.push("Patient ist erforderlich");
    if (!daten.arzt_id) fehler.push("Arzt ist erforderlich");
    if (!daten.datum) fehler.push("Datum ist erforderlich");
    if (!daten.uhrzeit) fehler.push("Uhrzeit ist erforderlich");
    return fehler;
}

// ===== Benutzer API (localStorage) =====

async function benutzerSpeichernApi(daten) {
    var liste = dbLaden("benutzer");
    daten.id = dbNaechsteId("benutzer");
    liste.push(daten);
    dbSpeichern("benutzer", liste);
    return daten;
}

async function benutzerAktualisierenApi(id, daten) {
    dbAktualisieren("benutzer", parseInt(id), daten);
    return daten;
}

async function benutzerLoeschenApi(id) {
    dbLoeschen("benutzer", parseInt(id));
    return { erfolg: true };
}

async function benutzerLadenApi(suche) {
    var liste = dbLaden("benutzer");
    if (suche) {
        var s = suche.toLowerCase();
        liste = liste.filter(function (b) {
            return (b.name && b.name.toLowerCase().includes(s)) ||
                   (b.email && b.email.toLowerCase().includes(s)) ||
                   (b.stadt && b.stadt.toLowerCase().includes(s));
        });
    }
    return liste;
}

// ===== Verlauf =====

async function verlaufLadenApi() {
    return dbLaden("verlauf");
}

async function verlaufLoeschenApi() {
    dbSpeichern("verlauf", []);
    return { erfolg: true };
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
            try { await verlaufLoeschenApi(); verlaufAktualisieren(); } catch (_) {}
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
            suchTimer = setTimeout(function () { benutzerListeAktualisieren(suchfeld.value); }, 300);
        });
    }

    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () { formularZuruecksetzen(); });
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
    try { await benutzerLoeschenApi(id); benutzerListeAktualisieren(); } catch (err) { alert("Fehler: " + err.message); }
}

async function benutzerListeAktualisieren(suche) {
    try {
        var benutzer = await benutzerLadenApi(suche);
        var tbody = document.querySelector("#benutzer-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        benutzer.forEach(function (b) { benutzerZurTabelle(b); });
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
    tr.querySelector(".btn-bearbeiten").addEventListener("click", function () { benutzerBearbeiten(daten); });
    tr.querySelector(".btn-loeschen").addEventListener("click", function () { benutzerEntfernen(daten.id); });
    tbody.appendChild(tr);
}

// ===== Patienten API (localStorage) =====

async function patientenLadenApi(suche) {
    var liste = dbLaden("patienten");
    if (suche) {
        var s = suche.toLowerCase();
        liste = liste.filter(function (p) {
            return (p.vorname + " " + p.nachname).toLowerCase().includes(s) ||
                   (p.versicherungsnummer && p.versicherungsnummer.toLowerCase().includes(s)) ||
                   (p.stadt && p.stadt.toLowerCase().includes(s));
        });
    }
    return liste;
}

async function patientSpeichernApi(daten) {
    var liste = dbLaden("patienten");
    daten.id = dbNaechsteId("patienten");
    liste.push(daten);
    dbSpeichern("patienten", liste);
    return daten;
}

async function patientAktualisierenApi(id, daten) {
    dbAktualisieren("patienten", parseInt(id), daten);
    return daten;
}

async function patientLoeschenApi(id) {
    dbLoeschen("patienten", parseInt(id));
    return { erfolg: true };
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
            timer = setTimeout(function () { patientenListeAktualisieren(suchfeld.value); }, 300);
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
        var fehler = patientValidieren(daten);
        if (fehler.length > 0) {
            fehlerDiv.textContent = fehler.join(", ");
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
            return;
        }

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

// ===== Aerzte API (localStorage) =====

async function aerzteLadenApi() {
    return dbLaden("aerzte");
}

async function arztSpeichernApi(daten) {
    var liste = dbLaden("aerzte");
    daten.id = dbNaechsteId("aerzte");
    liste.push(daten);
    dbSpeichern("aerzte", liste);
    return daten;
}

async function arztAktualisierenApi(id, daten) {
    dbAktualisieren("aerzte", parseInt(id), daten);
    return daten;
}

async function arztLoeschenApi(id) {
    dbLoeschen("aerzte", parseInt(id));
    return { erfolg: true };
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
        var fehler = arztValidieren(daten);
        if (fehler.length > 0) {
            fehlerDiv.textContent = fehler.join(", ");
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
            return;
        }

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

// ===== Termine API (localStorage) =====

async function termineLadenApi(datum) {
    var liste = dbLaden("termine");
    if (datum) {
        liste = liste.filter(function (t) { return t.datum === datum; });
    }
    return liste;
}

async function terminSpeichernApi(daten) {
    var liste = dbLaden("termine");
    daten.id = dbNaechsteId("termine");
    var patient = dbFinden("patienten", daten.patient_id);
    var arzt = dbFinden("aerzte", daten.arzt_id);
    daten.patient_name = patient ? patient.nachname + ", " + patient.vorname : "Unbekannt";
    daten.arzt_name = arzt ? ((arzt.titel || "") + " " + arzt.vorname + " " + arzt.nachname).trim() : "Unbekannt";
    daten.status = daten.status || "geplant";
    liste.push(daten);
    dbSpeichern("termine", liste);
    return daten;
}

async function terminAktualisierenApi(id, daten) {
    var patient = dbFinden("patienten", daten.patient_id);
    var arzt = dbFinden("aerzte", daten.arzt_id);
    daten.patient_name = patient ? patient.nachname + ", " + patient.vorname : "Unbekannt";
    daten.arzt_name = arzt ? ((arzt.titel || "") + " " + arzt.vorname + " " + arzt.nachname).trim() : "Unbekannt";
    dbAktualisieren("termine", parseInt(id), daten);
    return daten;
}

async function terminLoeschenApi(id) {
    dbLoeschen("termine", parseInt(id));
    return { erfolg: true };
}

function initTermine() {
    var form = document.getElementById("termin-form");
    if (!form) return;

    terminDropdownsLaden();
    termineListeAktualisieren();

    var datumFilter = document.getElementById("termin-filter-datum");
    if (datumFilter) {
        datumFilter.addEventListener("change", function () { termineListeAktualisieren(datumFilter.value); });
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
        var fehler = terminValidieren(daten);
        if (fehler.length > 0) {
            fehlerDiv.textContent = fehler.join(", ");
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
            return;
        }

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

// ===== Wartezimmer API (localStorage) =====

async function wartezimmerLadenApi() {
    return dbLaden("wartezimmer").filter(function (e) { return e.status !== "fertig"; });
}

async function wartezimmerCheckinApi(daten) {
    var liste = dbLaden("wartezimmer");
    daten.id = dbNaechsteId("wartezimmer");
    daten.status = "wartend";
    daten.ankunft_zeit = new Date().toISOString();
    var patient = dbFinden("patienten", daten.patient_id);
    daten.patient_name = patient ? patient.nachname + ", " + patient.vorname : "Unbekannt";
    if (daten.termin_id) {
        var termin = dbFinden("termine", daten.termin_id);
        if (termin) {
            daten.termin_uhrzeit = termin.uhrzeit;
            daten.termin_grund = termin.grund;
            daten.arzt_name = termin.arzt_name;
        }
    }
    liste.push(daten);
    dbSpeichern("wartezimmer", liste);
    return daten;
}

async function wartezimmerStatusApi(id, status) {
    dbAktualisieren("wartezimmer", parseInt(id), { status: status });
    return { erfolg: true };
}

async function wartezimmerEntfernenApi(id) {
    dbLoeschen("wartezimmer", parseInt(id));
    return { erfolg: true };
}

function initWartezimmer() {
    var form = document.getElementById("checkin-form");
    if (!form) return;

    wartezimmerDropdownsLaden();
    wartezimmerAktualisieren();
    setInterval(wartezimmerAktualisieren, 15000);

    var patientSelect = document.getElementById("checkin-patient");
    if (patientSelect) {
        patientSelect.addEventListener("change", function () { wartezimmerTermineLaden(patientSelect.value); });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var daten = { patient_id: parseInt(document.getElementById("checkin-patient").value, 10) };
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
            var info = '<div class="warte-info"><h3>' + escapeHtml(e.patient_name) + '</h3><p>';
            if (e.termin_uhrzeit) info += "Termin: " + escapeHtml(e.termin_uhrzeit);
            if (e.termin_grund) info += " - " + escapeHtml(e.termin_grund);
            if (e.arzt_name) info += " bei " + escapeHtml(e.arzt_name);
            info += '</p><p class="wartezeit">Wartezeit: ' + wartezeitBerechnen(e.ankunft_zeit) + "</p></div>";

            var aktionen = '<div class="warte-aktionen">';
            if (e.status === "wartend") aktionen += '<button class="btn-aufrufen">Aufrufen</button>';
            if (e.status === "aufgerufen") aktionen += '<button class="btn-fertig">Fertig</button>';
            aktionen += '<button class="btn-loeschen">Entfernen</button></div>';

            karte.innerHTML = info + aktionen;

            var btnAufrufen = karte.querySelector(".btn-aufrufen");
            if (btnAufrufen) btnAufrufen.addEventListener("click", async function () {
                try { await wartezimmerStatusApi(e.id, "aufgerufen"); wartezimmerAktualisieren(); } catch (_) {}
            });
            var btnFertig = karte.querySelector(".btn-fertig");
            if (btnFertig) btnFertig.addEventListener("click", async function () {
                try { await wartezimmerStatusApi(e.id, "fertig"); wartezimmerAktualisieren(); } catch (_) {}
            });
            karte.querySelector(".btn-loeschen").addEventListener("click", async function () {
                try { await wartezimmerEntfernenApi(e.id); wartezimmerAktualisieren(); } catch (_) {}
            });

            container.appendChild(karte);
        });
    } catch (_) {}
}

// ===== Agenten API (localStorage) =====

async function agentenLadenApi() {
    return dbLaden("agenten");
}

async function agentSpeichernApi(daten) {
    var liste = dbLaden("agenten");
    daten.id = dbNaechsteId("agenten");
    daten.status = daten.status || "offline";
    liste.push(daten);
    dbSpeichern("agenten", liste);
    return daten;
}

async function agentAktualisierenApi(id, daten) {
    dbAktualisieren("agenten", parseInt(id), daten);
    return daten;
}

async function agentLoeschenApi(id) {
    dbLoeschen("agenten", parseInt(id));
    return { erfolg: true };
}

async function agentStatusSetzenApi(id, status) {
    dbAktualisieren("agenten", parseInt(id), { status: status });
    return { erfolg: true };
}

async function anrufeLadenApi(aktiv) {
    var liste = dbLaden("anrufe");
    if (aktiv) {
        liste = liste.filter(function (a) { return a.status === "klingelt" || a.status === "verbunden"; });
    }
    return liste;
}

function initAgentenBoard() {
    var form = document.getElementById("agent-form");
    if (!form) return;

    agentenBoardAktualisieren();
    aktiveAnrufeAktualisieren();
    anrufprotokollAktualisieren();

    setInterval(function () {
        agentenBoardAktualisieren();
        aktiveAnrufeAktualisieren();
        anrufprotokollAktualisieren();
    }, 10000);

    var btnAbbrechen = document.getElementById("btn-agent-abbrechen");
    if (btnAbbrechen) {
        btnAbbrechen.addEventListener("click", function () { agentFormZuruecksetzen(); });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var editId = document.getElementById("agent-id").value;
        var daten = {
            name: document.getElementById("agent-name").value,
            nebenstelle: document.getElementById("agent-nebenstelle").value,
            sip_passwort: document.getElementById("agent-sip-passwort").value,
            rolle: document.getElementById("agent-rolle").value,
            warteschlange: document.getElementById("agent-warteschlange").value,
        };

        var erfolgDiv = document.getElementById("agent-erfolg");
        var fehlerDiv = document.getElementById("agent-fehler");

        try {
            if (editId) {
                await agentAktualisierenApi(editId, daten);
                erfolgDiv.textContent = "Agent aktualisiert!";
            } else {
                await agentSpeichernApi(daten);
                erfolgDiv.textContent = "Agent gespeichert!";
            }
            erfolgDiv.hidden = false;
            fehlerDiv.hidden = true;
            agentFormZuruecksetzen();
            agentenBoardAktualisieren();
        } catch (err) {
            fehlerDiv.textContent = err.message;
            fehlerDiv.hidden = false;
            erfolgDiv.hidden = true;
        }
    });
}

function agentFormZuruecksetzen() {
    var form = document.getElementById("agent-form");
    if (form) form.reset();
    document.getElementById("agent-id").value = "";
    document.getElementById("agent-formular-titel").textContent = "Agent anlegen";
    document.getElementById("btn-agent-speichern").textContent = "Speichern";
    var btn = document.getElementById("btn-agent-abbrechen");
    if (btn) btn.hidden = true;
}

function agentBearbeiten(a) {
    document.getElementById("agent-id").value = a.id;
    document.getElementById("agent-name").value = a.name;
    document.getElementById("agent-nebenstelle").value = a.nebenstelle;
    document.getElementById("agent-sip-passwort").value = a.sip_passwort;
    document.getElementById("agent-rolle").value = a.rolle;
    document.getElementById("agent-warteschlange").value = a.warteschlange || "rezeption";
    document.getElementById("agent-formular-titel").textContent = "Agent bearbeiten";
    document.getElementById("btn-agent-speichern").textContent = "Aktualisieren";
    var btn = document.getElementById("btn-agent-abbrechen");
    if (btn) btn.hidden = false;
    document.getElementById("agent-formular").scrollIntoView({ behavior: "smooth" });
}

async function agentenBoardAktualisieren() {
    try {
        var agenten = await agentenLadenApi();
        var container = document.getElementById("agenten-karten");
        var badge = document.getElementById("agenten-online-badge");
        if (!container) return;

        var onlineCount = agenten.filter(function (a) { return a.status === "online"; }).length;
        if (badge) badge.textContent = onlineCount + " online";

        container.innerHTML = "";
        if (agenten.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">Keine Agenten angelegt.</p>';
            return;
        }

        agenten.forEach(function (a) {
            var karte = document.createElement("div");
            karte.className = "agent-karte";
            karte.innerHTML =
                '<h3><span class="agent-status-punkt ' + escapeHtml(a.status) + '"></span>' + escapeHtml(a.name) + '</h3>' +
                '<p>Nebenstelle: ' + escapeHtml(a.nebenstelle) + '</p>' +
                '<p>Rolle: ' + escapeHtml(a.rolle) + ' | Queue: ' + escapeHtml(a.warteschlange || '-') + '</p>' +
                '<p>Status: <strong>' + escapeHtml(a.status) + '</strong></p>' +
                '<div class="agent-aktionen">' +
                    '<button class="btn-online">Online</button>' +
                    '<button class="btn-pause">Pause</button>' +
                    '<button class="btn-offline">Offline</button>' +
                    '<button class="btn-bearbeiten">Bearbeiten</button>' +
                    '<button class="btn-loeschen">Loeschen</button>' +
                '</div>';

            karte.querySelector(".btn-online").addEventListener("click", async function () {
                try { await agentStatusSetzenApi(a.id, "online"); agentenBoardAktualisieren(); } catch (_) {}
            });
            karte.querySelector(".btn-pause").addEventListener("click", async function () {
                try { await agentStatusSetzenApi(a.id, "pause"); agentenBoardAktualisieren(); } catch (_) {}
            });
            karte.querySelector(".btn-offline").addEventListener("click", async function () {
                try { await agentStatusSetzenApi(a.id, "offline"); agentenBoardAktualisieren(); } catch (_) {}
            });
            karte.querySelector(".btn-bearbeiten").addEventListener("click", function () { agentBearbeiten(a); });
            karte.querySelector(".btn-loeschen").addEventListener("click", async function () {
                if (!confirm("Agent wirklich loeschen?")) return;
                try { await agentLoeschenApi(a.id); agentenBoardAktualisieren(); } catch (err) { alert(err.message); }
            });

            container.appendChild(karte);
        });
    } catch (_) {}
}

async function aktiveAnrufeAktualisieren() {
    try {
        var anrufe = await anrufeLadenApi(true);
        var container = document.getElementById("aktive-anrufe-liste");
        var badge = document.getElementById("anrufe-aktiv-badge");
        if (!container) return;

        if (badge) badge.textContent = anrufe.length + " aktiv";
        container.innerHTML = "";
        if (anrufe.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:1rem">Keine aktiven Anrufe.</p>';
            return;
        }

        anrufe.forEach(function (a) {
            var karte = document.createElement("div");
            karte.className = "anruf-karte " + a.status;
            karte.innerHTML =
                '<div><strong>' + escapeHtml(a.anrufer_nummer) + '</strong>' +
                (a.anrufer_name ? ' - ' + escapeHtml(a.anrufer_name) : '') +
                '<br><small>Agent: ' + escapeHtml(a.agent_name || '-') +
                ' | Queue: ' + escapeHtml(a.warteschlange || '-') + '</small></div>' +
                '<span class="status-badge status-' + a.status + '">' + escapeHtml(a.status) + '</span>';
            container.appendChild(karte);
        });
    } catch (_) {}
}

async function anrufprotokollAktualisieren() {
    try {
        var anrufe = await anrufeLadenApi(false);
        var tbody = document.querySelector("#anrufe-tabelle tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        anrufe.forEach(function (a) {
            var tr = document.createElement("tr");
            var dauerText = a.dauer_sekunden > 0
                ? Math.floor(a.dauer_sekunden / 60) + ":" + ("0" + (a.dauer_sekunden % 60)).slice(-2)
                : "-";
            tr.innerHTML =
                "<td>" + escapeHtml(a.beginn || "") + "</td>" +
                "<td>" + escapeHtml(a.anrufer_nummer) + (a.anrufer_name ? " (" + escapeHtml(a.anrufer_name) + ")" : "") + "</td>" +
                "<td>" + escapeHtml(a.agent_name || "-") + "</td>" +
                "<td>" + escapeHtml(a.warteschlange || "-") + "</td>" +
                "<td>" + escapeHtml(a.typ) + "</td>" +
                '<td><span class="status-badge">' + escapeHtml(a.status) + "</span></td>" +
                "<td>" + dauerText + "</td>";
            tbody.appendChild(tr);
        });
    } catch (_) {}
}

// ===== Softphone =====

function initSoftphone() {
    var sipForm = document.getElementById("sip-form");
    if (!sipForm) return;

    var tasten = document.querySelectorAll(".dialpad-taste");
    tasten.forEach(function (taste) {
        taste.addEventListener("click", function () {
            var wahlnummer = document.getElementById("wahlnummer");
            if (wahlnummer) wahlnummer.value += taste.getAttribute("data-dtmf");
        });
    });

    sipForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var statusDiv = document.getElementById("sip-status");
        var benutzer = document.getElementById("sip-benutzer").value;

        statusDiv.className = "sip-status verbindend";
        statusDiv.textContent = "Verbinde...";

        setTimeout(function () {
            statusDiv.className = "sip-status online";
            statusDiv.textContent = "Verbunden als " + benutzer;
            document.getElementById("btn-sip-verbinden").hidden = true;
            document.getElementById("btn-sip-trennen").hidden = false;
        }, 1500);
    });

    document.getElementById("btn-sip-trennen").addEventListener("click", function () {
        var statusDiv = document.getElementById("sip-status");
        statusDiv.className = "sip-status offline";
        statusDiv.textContent = "Nicht verbunden";
        document.getElementById("btn-sip-verbinden").hidden = false;
        document.getElementById("btn-sip-trennen").hidden = true;
        document.getElementById("anruf-info").hidden = true;
    });

    document.getElementById("btn-anrufen").addEventListener("click", function () {
        var nummer = document.getElementById("wahlnummer").value;
        if (!nummer) return;
        document.getElementById("anruf-info").hidden = false;
        document.getElementById("anruf-gegenstelle").textContent = nummer;
        document.getElementById("anruf-status-anzeige").textContent = "Klingelt...";
        document.getElementById("btn-anrufen").hidden = true;
        document.getElementById("btn-auflegen").hidden = false;

        setTimeout(function () {
            document.getElementById("anruf-status-anzeige").textContent = "Verbunden";
            startAnrufTimer();
        }, 2000);
    });

    document.getElementById("btn-auflegen").addEventListener("click", function () {
        stopAnrufTimer();
        document.getElementById("anruf-info").hidden = true;
        document.getElementById("btn-anrufen").hidden = false;
        document.getElementById("btn-auflegen").hidden = true;
        document.getElementById("btn-annehmen").hidden = true;
    });

    document.getElementById("btn-annehmen").addEventListener("click", function () {
        document.getElementById("anruf-status-anzeige").textContent = "Verbunden";
        document.getElementById("btn-annehmen").hidden = true;
        startAnrufTimer();
    });
}

var anrufTimerInterval = null;
var anrufTimerSekunden = 0;

function startAnrufTimer() {
    anrufTimerSekunden = 0;
    var timerDiv = document.getElementById("anruf-timer");
    if (anrufTimerInterval) clearInterval(anrufTimerInterval);
    anrufTimerInterval = setInterval(function () {
        anrufTimerSekunden++;
        var min = Math.floor(anrufTimerSekunden / 60);
        var sec = anrufTimerSekunden % 60;
        if (timerDiv) timerDiv.textContent = ("0" + min).slice(-2) + ":" + ("0" + sec).slice(-2);
    }, 1000);
}

function stopAnrufTimer() {
    if (anrufTimerInterval) { clearInterval(anrufTimerInterval); anrufTimerInterval = null; }
    anrufTimerSekunden = 0;
    var timerDiv = document.getElementById("anruf-timer");
    if (timerDiv) timerDiv.textContent = "00:00";
}

// ===== Dashboard =====

function initDashboard() {
    var container = document.getElementById("dashboard");
    if (!container) return;

    var patienten = dbLaden("patienten");
    var aerzte = dbLaden("aerzte");
    var heute = new Date().toISOString().split("T")[0];
    var termine = dbLaden("termine").filter(function (t) { return t.datum === heute; });
    var wartezimmer = dbLaden("wartezimmer").filter(function (w) { return w.status !== "fertig"; });
    var agenten = dbLaden("agenten");
    var onlineAgenten = agenten.filter(function (a) { return a.status === "online"; });

    // Stat Cards
    var el = function (id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
    el("stat-patienten", patienten.length);
    el("stat-aerzte", aerzte.length);
    el("stat-termine-heute", termine.length);
    el("stat-wartezimmer", wartezimmer.length);
    el("stat-agenten-online", onlineAgenten.length);

    // Heutige Termine
    var termineListe = document.getElementById("dashboard-termine");
    if (termineListe) {
        termineListe.innerHTML = "";
        if (termine.length === 0) {
            termineListe.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888">Keine Termine heute</td></tr>';
        } else {
            termine.forEach(function (t) {
                var tr = document.createElement("tr");
                var statusKlasse = STATUS_KLASSEN[t.status] || "status-geplant";
                tr.innerHTML =
                    "<td>" + escapeHtml(t.uhrzeit) + "</td>" +
                    "<td>" + escapeHtml(t.patient_name) + "</td>" +
                    "<td>" + escapeHtml(t.arzt_name) + "</td>" +
                    '<td><span class="status-badge ' + statusKlasse + '">' + escapeHtml(t.status) + "</span></td>";
                termineListe.appendChild(tr);
            });
        }
    }

    // Wartezimmer Quick View
    var warteListe = document.getElementById("dashboard-wartezimmer");
    if (warteListe) {
        warteListe.innerHTML = "";
        if (wartezimmer.length === 0) {
            warteListe.innerHTML = '<p style="color:#888;text-align:center;padding:1rem">Wartezimmer leer</p>';
        } else {
            wartezimmer.forEach(function (w) {
                var div = document.createElement("div");
                div.className = "warte-mini " + w.status;
                div.innerHTML = '<strong>' + escapeHtml(w.patient_name) + '</strong> <span class="status-badge status-' +
                    (w.status === "aufgerufen" ? "bestaetigt" : "geplant") + '">' + escapeHtml(w.status) + '</span>' +
                    '<br><small>' + wartezeitBerechnen(w.ankunft_zeit) + '</small>';
                warteListe.appendChild(div);
            });
        }
    }
}

// ===== Chat-Widget =====

function initChatWidget() {
    var toggle = document.getElementById("chat-toggle");
    var fenster = document.getElementById("chat-fenster");
    var schliessen = document.getElementById("chat-schliessen");
    var input = document.getElementById("chat-input");
    var senden = document.getElementById("chat-senden");

    if (!toggle || !fenster) return;

    toggle.addEventListener("click", function () {
        var sichtbar = fenster.style.display === "flex";
        fenster.style.display = sichtbar ? "none" : "flex";
        if (!sichtbar) {
            var msgs = document.getElementById("chat-nachrichten");
            if (msgs && msgs.children.length === 0) {
                chatNachrichtHinzufuegen("bot", "Hallo! Ich bin der Praxis-Assistent. Wie kann ich helfen? Fragen Sie mich nach Patienten, Terminen, Aerzten oder dem Wartezimmer.");
            }
            if (input) input.focus();
        }
    });

    if (schliessen) schliessen.addEventListener("click", function () { fenster.style.display = "none"; });

    if (senden) senden.addEventListener("click", chatSenden);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") chatSenden(); });
}

function chatSenden() {
    var input = document.getElementById("chat-input");
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = "";
    chatNachrichtHinzufuegen("user", text);

    setTimeout(function () {
        var antwort = chatAntwortGenerieren(text);
        chatNachrichtHinzufuegen("bot", antwort);
        sprachAusgabe(antwort);
    }, 500);
}

function chatNachrichtHinzufuegen(typ, text) {
    var container = document.getElementById("chat-nachrichten");
    if (!container) return;
    var div = document.createElement("div");
    div.className = "chat-msg chat-msg-" + typ;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function chatAntwortGenerieren(frage) {
    var f = frage.toLowerCase();

    if (f.includes("hallo") || f.includes("hi") || f.includes("guten")) {
        return "Hallo! Willkommen in der MED Rezeption. Wie kann ich Ihnen helfen?";
    }

    if (f.includes("patient")) {
        var patienten = dbLaden("patienten");
        if (patienten.length === 0) return "Aktuell sind keine Patienten angelegt.";
        var namen = patienten.map(function (p) { return p.vorname + " " + p.nachname; }).join(", ");
        return "Wir haben " + patienten.length + " Patienten: " + namen + ". Gehen Sie zur Patienten-Seite fuer Details.";
    }

    if (f.includes("arzt") || f.includes("aerzt") || f.includes("doktor")) {
        var aerzte = dbLaden("aerzte");
        if (aerzte.length === 0) return "Keine Aerzte angelegt.";
        var infos = aerzte.map(function (a) {
            return ((a.titel || "") + " " + a.vorname + " " + a.nachname).trim() + " (" + a.fachrichtung + ")";
        }).join(", ");
        return "Unsere Aerzte: " + infos;
    }

    if (f.includes("termin")) {
        var heute = new Date().toISOString().split("T")[0];
        var termine = dbLaden("termine").filter(function (t) { return t.datum === heute; });
        if (termine.length === 0) return "Heute sind keine Termine geplant.";
        var tInfos = termine.map(function (t) { return t.uhrzeit + " - " + t.patient_name + " bei " + t.arzt_name; }).join(" | ");
        return "Heute " + termine.length + " Termine: " + tInfos;
    }

    if (f.includes("warte")) {
        var wartezimmer = dbLaden("wartezimmer").filter(function (w) { return w.status !== "fertig"; });
        if (wartezimmer.length === 0) return "Das Wartezimmer ist leer.";
        return wartezimmer.length + " Patient(en) im Wartezimmer: " +
            wartezimmer.map(function (w) { return w.patient_name + " (" + w.status + ")"; }).join(", ");
    }

    if (f.includes("hilfe") || f.includes("help")) {
        return "Ich kann Ihnen helfen mit: Patienten-Info, Aerzte-Info, Termine heute, Wartezimmer-Status, Voicebot, Callflow, Uebersetzer. Stellen Sie einfach eine Frage oder sprechen Sie mich per Mikrofon an!";
    }

    if (f.includes("agent")) {
        var agenten = dbLaden("agenten");
        var online = agenten.filter(function (a) { return a.status === "online"; });
        return agenten.length + " Agenten registriert, davon " + online.length + " online.";
    }

    if (f.includes("voicebot") || f.includes("sprachbot")) {
        return "Der Voicebot bearbeitet automatisch eingehende Anrufe. Er kann Termine vergeben, Rezepte entgegennehmen und an die Rezeption weiterleiten. Konfigurieren Sie ihn unter 'Voicebot'.";
    }

    if (f.includes("callflow") || f.includes("anrufablauf")) {
        return "Im Callflow Editor koennen Sie den Anrufablauf visuell gestalten. Fuegen Sie Bausteine wie Ansagen, DTMF-Menues, Voicebot-Dialoge und Warteschlangen hinzu.";
    }

    if (f.includes("uebersetz") || f.includes("sprache") || f.includes("translation")) {
        return "Der Uebersetzer hilft bei der Kommunikation mit fremdsprachigen Patienten. Er unterstuetzt Deutsch, Englisch, Tuerkisch, Arabisch, Russisch und Polnisch.";
    }

    if (f.includes("demo") || f.includes("reset") || f.includes("zurueck")) {
        localStorage.removeItem("med_demo_geladen");
        demoDatenLaden();
        return "Demo-Daten wurden zurueckgesetzt! Laden Sie die Seite neu um die Aenderungen zu sehen.";
    }

    return "Das habe ich nicht verstanden. Fragen Sie mich nach: Patienten, Aerzte, Termine, Wartezimmer, Voicebot, Callflow, Uebersetzer oder 'hilfe'.";
}

// ===== Hilfsfunktionen =====

function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ===== Demo-Reset Button =====

function initDemoReset() {
    var btn = document.getElementById("btn-demo-reset");
    if (!btn) return;
    btn.addEventListener("click", function () {
        if (!confirm("Demo-Daten zuruecksetzen? Alle Aenderungen gehen verloren.")) return;
        localStorage.removeItem("med_demo_geladen");
        demoDatenLaden();
        location.reload();
    });
}

// ===== Sprach-Chat (Web Speech API) =====

function initSprachChat() {
    var mikBtn = document.getElementById("chat-mikrofon");
    if (!mikBtn) return;
    var SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRec) {
        mikBtn.title = "Spracherkennung nicht verfuegbar";
        mikBtn.style.opacity = "0.5";
        return;
    }
    var recognition = new SpeechRec();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    var recording = false;

    mikBtn.addEventListener("click", function () {
        if (recording) {
            recognition.stop();
            return;
        }
        recording = true;
        mikBtn.classList.add("recording");
        recognition.start();
    });

    recognition.onresult = function (e) {
        var text = e.results[0][0].transcript;
        var input = document.getElementById("chat-input");
        if (input) input.value = text;
        chatSenden();
    };

    recognition.onend = function () {
        recording = false;
        mikBtn.classList.remove("recording");
    };

    recognition.onerror = function () {
        recording = false;
        mikBtn.classList.remove("recording");
    };
}

function sprachAusgabe(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang = "de-DE";
    utt.rate = 1.0;
    window.speechSynthesis.speak(utt);
}

// ===== Callflow Editor =====

var callflowDaten = [];
var callflowAusgewaehlt = null;

function demoCallflowLaden() {
    if (callflowDaten.length > 0) return;
    callflowDaten = [
        { id: 1, typ: "start", label: "Eingehender Anruf", config: { quelle: "SIP-Trunk" } },
        { id: 2, typ: "ansage", label: "Willkommen", config: { text: "Willkommen bei der Arztpraxis MED Rezeption.", datei: "willkommen.wav" } },
        { id: 3, typ: "dtmf", label: "Hauptmenue", config: { text: "1=Termin, 2=Rezept, 3=Rezeption, 0=Warteschlange", timeout: 8, optionen: [
            { taste: "1", label: "Terminvergabe", ziel_id: 4 },
            { taste: "2", label: "Rezeptbestellung", ziel_id: 5 },
            { taste: "3", label: "Rezeption", ziel_id: 6 },
            { taste: "0", label: "Warteschlange", ziel_id: 7 }
        ] } },
        { id: 4, typ: "voicebot", label: "Termin-Dialog", config: { dialog: "termin", beschreibung: "Automatische Terminvergabe per Sprache" } },
        { id: 5, typ: "voicebot", label: "Rezept-Dialog", config: { dialog: "rezept", beschreibung: "Rezeptbestellung per Versicherungsnummer" } },
        { id: 6, typ: "transfer", label: "Transfer Rezeption", config: { nebenstelle: "100", timeout: 30 } },
        { id: 7, typ: "warteschlange", label: "Queue Rezeption", config: { queue: "rezeption", ansage: "bitte-warten.wav", maxWait: 120 } },
        { id: 8, typ: "ende", label: "Auflegen", config: {} }
    ];
}

function initCallflowEditor() {
    var canvas = document.getElementById("callflow-flow");
    if (!canvas) return;
    demoCallflowLaden();
    callflowRendern();

    // Baustein-Buttons
    var bausteine = document.querySelectorAll(".callflow-baustein");
    for (var i = 0; i < bausteine.length; i++) {
        bausteine[i].addEventListener("click", function () {
            var typ = this.getAttribute("data-typ");
            var maxId = 0;
            for (var j = 0; j < callflowDaten.length; j++) {
                if (callflowDaten[j].id > maxId) maxId = callflowDaten[j].id;
            }
            callflowDaten.push({
                id: maxId + 1, typ: typ, label: typ.charAt(0).toUpperCase() + typ.slice(1) + " (neu)",
                config: typ === "dtmf" ? { text: "", timeout: 5, optionen: [] } :
                    typ === "ansage" ? { text: "", datei: "" } :
                    typ === "voicebot" ? { dialog: "willkommen", beschreibung: "" } :
                    typ === "warteschlange" ? { queue: "rezeption", ansage: "", maxWait: 120 } :
                    typ === "transfer" ? { nebenstelle: "", timeout: 30 } : {}
            });
            callflowRendern();
        });
    }

    // Speichern
    var saveBtn = document.getElementById("btn-flow-speichern");
    if (saveBtn) saveBtn.addEventListener("click", function () {
        localStorage.setItem("med_callflow", JSON.stringify(callflowDaten));
        alert("Callflow gespeichert!");
    });

    // Simulieren
    var simBtn = document.getElementById("btn-flow-simulieren");
    if (simBtn) simBtn.addEventListener("click", callflowSimulieren);
}

function callflowRendern() {
    var container = document.getElementById("callflow-flow");
    if (!container) return;
    container.innerHTML = "";

    for (var i = 0; i < callflowDaten.length; i++) {
        var node = callflowDaten[i];
        var el = document.createElement("div");
        el.className = "callflow-node" + (callflowAusgewaehlt === node.id ? " selected" : "");
        el.setAttribute("data-id", node.id);

        var bodyHtml = "";
        if (node.typ === "ansage") bodyHtml = '<div class="node-detail">' + escapeHtml(node.config.text || "Keine Ansage") + '</div><div class="node-detail"><small>Datei: ' + escapeHtml(node.config.datei || "-") + '</small></div>';
        else if (node.typ === "dtmf") {
            bodyHtml = '<div class="node-detail">' + escapeHtml(node.config.text || "") + '</div>';
            var opts = node.config.optionen || [];
            for (var o = 0; o < opts.length; o++) bodyHtml += '<div class="node-detail"><small>Taste ' + opts[o].taste + ' → ' + escapeHtml(opts[o].label) + '</small></div>';
        }
        else if (node.typ === "voicebot") bodyHtml = '<div class="node-detail">' + escapeHtml(node.config.beschreibung || node.config.dialog) + '</div>';
        else if (node.typ === "transfer") bodyHtml = '<div class="node-detail">Nebenstelle: ' + escapeHtml(node.config.nebenstelle || "-") + '</div>';
        else if (node.typ === "warteschlange") bodyHtml = '<div class="node-detail">Queue: ' + escapeHtml(node.config.queue || "-") + '</div><div class="node-detail"><small>Max. Wartezeit: ' + (node.config.maxWait || 120) + 's</small></div>';
        else if (node.typ === "start") bodyHtml = '<div class="node-detail">' + escapeHtml(node.config.quelle || "Eingehend") + '</div>';

        el.innerHTML = '<div class="callflow-node-header typ-' + node.typ + '"><i class="fa-solid ' + callflowIcon(node.typ) + '"></i> ' + escapeHtml(node.label) + '</div><div class="callflow-node-body">' + bodyHtml + '</div>';
        el.addEventListener("click", (function (nid) {
            return function () { callflowNodeAuswaehlen(nid); };
        })(node.id));
        container.appendChild(el);

        if (i < callflowDaten.length - 1) {
            var pfeil = document.createElement("div");
            pfeil.className = "callflow-pfeil";
            pfeil.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
            container.appendChild(pfeil);
        }
    }
}

function callflowIcon(typ) {
    var icons = { start: "fa-play", ansage: "fa-volume-high", dtmf: "fa-hashtag", voicebot: "fa-robot", warteschlange: "fa-users-line", transfer: "fa-right-left", bedingung: "fa-code-branch", aufnahme: "fa-microphone", ende: "fa-phone-slash" };
    return icons[typ] || "fa-circle";
}

function callflowNodeAuswaehlen(id) {
    callflowAusgewaehlt = id;
    callflowRendern();
    var node = null;
    for (var i = 0; i < callflowDaten.length; i++) {
        if (callflowDaten[i].id === id) { node = callflowDaten[i]; break; }
    }
    if (!node) return;
    var propsEl = document.getElementById("callflow-props-inhalt");
    if (!propsEl) return;
    var html = '<div class="form-group"><label>Label</label><input type="text" id="cf-prop-label" value="' + escapeHtml(node.label) + '"></div>';
    html += '<div class="form-group"><label>Typ</label><input type="text" value="' + node.typ + '" disabled></div>';
    if (node.config.text !== undefined) html += '<div class="form-group"><label>Text</label><textarea id="cf-prop-text" rows="3">' + escapeHtml(node.config.text || "") + '</textarea></div>';
    if (node.config.nebenstelle !== undefined) html += '<div class="form-group"><label>Nebenstelle</label><input type="text" id="cf-prop-nst" value="' + escapeHtml(node.config.nebenstelle || "") + '"></div>';
    if (node.config.queue !== undefined) html += '<div class="form-group"><label>Queue</label><input type="text" id="cf-prop-queue" value="' + escapeHtml(node.config.queue || "") + '"></div>';
    if (node.config.timeout !== undefined) html += '<div class="form-group"><label>Timeout (Sek.)</label><input type="number" id="cf-prop-timeout" value="' + (node.config.timeout || 5) + '"></div>';
    html += '<div class="button-gruppe"><button type="button" onclick="callflowPropsSpeichern()">Uebernehmen</button>';
    if (node.typ !== "start") html += '<button type="button" class="btn-loeschen" onclick="callflowNodeLoeschen(' + node.id + ')">Loeschen</button>';
    html += '</div>';
    propsEl.innerHTML = html;
}

function callflowPropsSpeichern() {
    if (!callflowAusgewaehlt) return;
    for (var i = 0; i < callflowDaten.length; i++) {
        if (callflowDaten[i].id === callflowAusgewaehlt) {
            var labelEl = document.getElementById("cf-prop-label");
            if (labelEl) callflowDaten[i].label = labelEl.value;
            var textEl = document.getElementById("cf-prop-text");
            if (textEl) callflowDaten[i].config.text = textEl.value;
            var nstEl = document.getElementById("cf-prop-nst");
            if (nstEl) callflowDaten[i].config.nebenstelle = nstEl.value;
            var queueEl = document.getElementById("cf-prop-queue");
            if (queueEl) callflowDaten[i].config.queue = queueEl.value;
            var timeoutEl = document.getElementById("cf-prop-timeout");
            if (timeoutEl) callflowDaten[i].config.timeout = parseInt(timeoutEl.value) || 5;
            break;
        }
    }
    callflowRendern();
    callflowNodeAuswaehlen(callflowAusgewaehlt);
}

function callflowNodeLoeschen(id) {
    callflowDaten = callflowDaten.filter(function (n) { return n.id !== id; });
    callflowAusgewaehlt = null;
    callflowRendern();
    var propsEl = document.getElementById("callflow-props-inhalt");
    if (propsEl) propsEl.innerHTML = '<p class="text-muted">Baustein geloescht.</p>';
}

function callflowSimulieren() {
    var simEl = document.getElementById("callflow-simulation");
    var ablaufEl = document.getElementById("simulation-ablauf");
    if (!simEl || !ablaufEl) return;
    simEl.hidden = false;
    ablaufEl.innerHTML = "";
    var zeilen = [
        { cls: "sim-zeile-system", text: "[SYSTEM] Eingehender Anruf von +49 170 1234567" },
        { cls: "sim-zeile-system", text: "[SYSTEM] Kanal geoeffnet, Sprache: de" },
        { cls: "sim-zeile-audio", text: "[AUDIO] Abspielen: willkommen.wav" },
        { cls: "sim-zeile-audio", text: '[AUDIO] "Willkommen bei der Arztpraxis MED Rezeption."' },
        { cls: "sim-zeile-audio", text: '[AUDIO] "Druecken Sie 1 fuer Terminvergabe, 2 fuer Rezept, 3 fuer Rezeption."' },
        { cls: "sim-zeile-system", text: "[SYSTEM] Warte auf DTMF-Eingabe... (Timeout: 8s)" },
        { cls: "sim-zeile-eingabe", text: "[DTMF] Eingabe: 1" },
        { cls: "sim-zeile-aktion", text: "[AKTION] Weiterleitung an Voicebot-Dialog: termin" },
        { cls: "sim-zeile-system", text: "[VOICEBOT] AGI-Script gestartet: med_voicebot.py termin" },
        { cls: "sim-zeile-audio", text: '[AUDIO] "Fuer welche Fachrichtung? 1=Allgemein, 2=Innere, 3=Andere"' },
        { cls: "sim-zeile-eingabe", text: "[DTMF] Eingabe: 1" },
        { cls: "sim-zeile-aktion", text: "[VOICEBOT] Fachrichtung: Allgemeinmedizin" },
        { cls: "sim-zeile-aktion", text: "[API] GET /api/aerzte → 3 Aerzte geladen" },
        { cls: "sim-zeile-aktion", text: "[VOICEBOT] Arzt gefunden: Dr. Mueller (Allgemeinmedizin)" },
        { cls: "sim-zeile-audio", text: '[AUDIO] "Terminvorschlag: Morgen 09:00 Uhr bei Dr. Mueller. Druecken Sie 1 zur Bestaetigung."' },
        { cls: "sim-zeile-eingabe", text: "[DTMF] Eingabe: 1" },
        { cls: "sim-zeile-aktion", text: "[API] POST /api/termine → Termin erstellt (ID: 5)" },
        { cls: "sim-zeile-aktion", text: "[VOICEBOT] VOICEBOT_RESULT=TERMIN" },
        { cls: "sim-zeile-audio", text: '[AUDIO] "Ihr Termin ist bestaetigt. Auf Wiedersehen!"' },
        { cls: "sim-zeile-system", text: "[SYSTEM] Anruf beendet. Dauer: 45 Sekunden" }
    ];
    var idx = 0;
    function naechsteZeile() {
        if (idx >= zeilen.length) return;
        var div = document.createElement("div");
        div.className = "sim-zeile " + zeilen[idx].cls;
        div.textContent = zeilen[idx].text;
        ablaufEl.appendChild(div);
        ablaufEl.scrollTop = ablaufEl.scrollHeight;
        idx++;
        setTimeout(naechsteZeile, 600);
    }
    naechsteZeile();

    var stopBtn = document.getElementById("btn-sim-stop");
    if (stopBtn) stopBtn.addEventListener("click", function () { idx = zeilen.length; simEl.hidden = true; });
}

// ===== Voicebot Konfiguration & Test =====

function initVoicebotSeite() {
    var configForm = document.getElementById("voicebot-config-form");
    if (!configForm) return;

    // Config speichern
    configForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var config = {
            begruessung: document.getElementById("vb-begruessung").value,
            sprache: document.getElementById("vb-sprache").value,
            stimme: document.getElementById("vb-stimme").value,
            maxVersuche: parseInt(document.getElementById("vb-max-versuche").value),
            timeout: parseInt(document.getElementById("vb-timeout").value),
            tasten: {
                "1": document.getElementById("vb-taste1").value,
                "2": document.getElementById("vb-taste2").value,
                "3": document.getElementById("vb-taste3").value,
                "0": document.getElementById("vb-taste0").value
            }
        };
        localStorage.setItem("med_voicebot_config", JSON.stringify(config));
        var erfolg = document.getElementById("vb-config-erfolg");
        if (erfolg) { erfolg.textContent = "Konfiguration gespeichert!"; erfolg.hidden = false; setTimeout(function () { erfolg.hidden = true; }, 3000); }
    });

    // Test starten
    var testBtn = document.getElementById("btn-vb-test");
    if (testBtn) testBtn.addEventListener("click", voicebotTestStarten);

    // DTMF-Tasten im Test
    var dtmfBtns = document.querySelectorAll(".vb-dtmf");
    for (var i = 0; i < dtmfBtns.length; i++) {
        dtmfBtns[i].addEventListener("click", function () {
            voicebotTestDtmf(this.getAttribute("data-dtmf"));
        });
    }

    var resetBtn = document.getElementById("btn-vb-test-reset");
    if (resetBtn) resetBtn.addEventListener("click", voicebotTestStarten);

    // Demo-Anrufe laden
    voicebotAnrufeLaden();
}

var vbTestSchritt = 0;

function voicebotTestStarten() {
    var bereich = document.getElementById("voicebot-test-bereich");
    var chat = document.getElementById("vb-test-chat");
    if (!bereich || !chat) return;
    bereich.hidden = false;
    chat.innerHTML = "";
    vbTestSchritt = 0;
    vbTestNachricht("bot", "Willkommen bei der Arztpraxis MED Rezeption.");
    vbTestNachricht("bot", "Druecken Sie 1 fuer Terminvergabe, 2 fuer Rezeptbestellung, 3 fuer die Rezeption, oder 0 fuer die Warteschlange.");
    vbTestNachricht("system", "Warte auf DTMF-Eingabe...");
    sprachAusgabe("Willkommen bei der Arztpraxis. Druecken Sie 1 fuer Terminvergabe, 2 fuer Rezeptbestellung, 3 fuer die Rezeption.");
}

function voicebotTestDtmf(taste) {
    var chat = document.getElementById("vb-test-chat");
    if (!chat) return;
    vbTestNachricht("anrufer", "DTMF: " + taste);

    if (vbTestSchritt === 0) {
        if (taste === "1") {
            vbTestSchritt = 1;
            vbTestNachricht("bot", "Fuer welche Fachrichtung moechten Sie einen Termin?");
            vbTestNachricht("bot", "1 = Allgemeinmedizin, 2 = Innere Medizin, 3 = Andere");
            vbTestNachricht("system", "Warte auf DTMF-Eingabe...");
            sprachAusgabe("Fuer welche Fachrichtung moechten Sie einen Termin?");
        } else if (taste === "2") {
            vbTestSchritt = 10;
            vbTestNachricht("bot", "Bitte geben Sie Ihre Versicherungsnummer ein.");
            vbTestNachricht("system", "Warte auf Eingabe... (max. 12 Ziffern)");
            sprachAusgabe("Bitte geben Sie Ihre Versicherungsnummer ein.");
        } else if (taste === "3") {
            vbTestNachricht("bot", "Sie werden mit der Rezeption verbunden...");
            vbTestNachricht("system", "TRANSFER → Nebenstelle 100");
            sprachAusgabe("Sie werden mit der Rezeption verbunden.");
        } else if (taste === "0") {
            vbTestNachricht("bot", "Bitte warten Sie, Sie werden mit dem naechsten freien Mitarbeiter verbunden.");
            vbTestNachricht("system", "WARTESCHLANGE → rezeption (Prioritaet: 1)");
            sprachAusgabe("Bitte warten Sie.");
        }
    } else if (vbTestSchritt === 1) {
        var fach = taste === "1" ? "Allgemeinmedizin" : taste === "2" ? "Innere Medizin" : "Sonstiges";
        vbTestSchritt = 2;
        var morgen = new Date(Date.now() + 86400000).toLocaleDateString("de-DE");
        vbTestNachricht("system", "API-Anfrage: GET /api/aerzte");
        vbTestNachricht("system", "Arzt gefunden: Dr. Mueller (" + fach + ")");
        vbTestNachricht("bot", "Terminvorschlag: " + morgen + " um 09:00 Uhr bei Dr. Mueller, " + fach + ".");
        vbTestNachricht("bot", "Druecken Sie 1 zur Bestaetigung oder 2 fuer Abbruch.");
        sprachAusgabe("Terminvorschlag: morgen um 9 Uhr bei Doktor Mueller. Druecken Sie 1 zur Bestaetigung.");
    } else if (vbTestSchritt === 2) {
        if (taste === "1") {
            vbTestNachricht("system", "API-Anfrage: POST /api/termine → Termin erstellt");
            vbTestNachricht("bot", "Ihr Termin wurde erfolgreich gebucht! Auf Wiedersehen.");
            vbTestNachricht("system", "VOICEBOT_RESULT = TERMIN ✓");
            sprachAusgabe("Ihr Termin wurde erfolgreich gebucht. Auf Wiedersehen.");
        } else {
            vbTestNachricht("bot", "Kein Problem. Sie werden mit der Rezeption verbunden.");
            vbTestNachricht("system", "TRANSFER → Rezeption");
        }
        vbTestSchritt = 99;
    } else if (vbTestSchritt === 10) {
        vbTestNachricht("system", "Versicherungsnummer erkannt: " + taste + "...");
        vbTestNachricht("bot", "Ihre Rezeptanfrage wird an die Rezeption weitergeleitet.");
        vbTestNachricht("system", "VOICEBOT_RESULT = TRANSFER, VOICEBOT_REZEPT_VNR = " + taste);
        sprachAusgabe("Ihre Rezeptanfrage wird an die Rezeption weitergeleitet.");
        vbTestSchritt = 99;
    }
}

function vbTestNachricht(typ, text) {
    var chat = document.getElementById("vb-test-chat");
    if (!chat) return;
    var div = document.createElement("div");
    div.className = "vb-chat-msg " + (typ === "bot" ? "vb-msg-bot" : typ === "anrufer" ? "vb-msg-anrufer" : "vb-msg-system");
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function voicebotAnrufeLaden() {
    var liste = document.getElementById("voicebot-anrufe-liste");
    if (!liste) return;
    var demoAnrufe = [
        { zeit: "09:15", nummer: "+49 170 1234567", ergebnis: "termin", detail: "Termin: Dr. Mueller, Allgemeinmedizin" },
        { zeit: "09:32", nummer: "+49 171 9876543", ergebnis: "rezept", detail: "Rezept-Anfrage VNR: A98765" },
        { zeit: "09:45", nummer: "+49 160 5551234", ergebnis: "transfer", detail: "Weiterleitung an Rezeption" },
        { zeit: "10:03", nummer: "+49 172 3456789", ergebnis: "termin", detail: "Termin: Dr. Schmidt, Innere Medizin" },
        { zeit: "10:18", nummer: "+49 176 8884321", ergebnis: "transfer", detail: "Weiterleitung nach Timeout" },
        { zeit: "10:40", nummer: "+49 151 7779999", ergebnis: "rezept", detail: "Rezept-Anfrage VNR: B12345" }
    ];
    liste.innerHTML = "";
    for (var i = 0; i < demoAnrufe.length; i++) {
        var a = demoAnrufe[i];
        var div = document.createElement("div");
        div.className = "voicebot-anruf-eintrag";
        div.innerHTML = '<div class="anruf-info"><strong>' + a.zeit + ' - ' + escapeHtml(a.nummer) + '</strong>' + escapeHtml(a.detail) + '</div><span class="anruf-ergebnis ergebnis-' + a.ergebnis + '">' + a.ergebnis.charAt(0).toUpperCase() + a.ergebnis.slice(1) + '</span>';
        liste.appendChild(div);
    }
}

// ===== Uebersetzer =====

var medPhrases = {
    begruessung: [
        { de: "Guten Tag, wie kann ich Ihnen helfen?", en: "Good day, how can I help you?", tr: "Merhaba, size nasil yardimci olabilirim?", ar: "مرحبا، كيف يمكنني مساعدتك؟", ru: "Здравствуйте, чем могу помочь?", pl: "Dzien dobry, jak moge pomoc?" },
        { de: "Haben Sie einen Termin?", en: "Do you have an appointment?", tr: "Randevunuz var mi?", ar: "هل لديك موعد؟", ru: "У вас есть запись?", pl: "Czy ma Pan/Pani wizyte?" },
        { de: "Bitte nehmen Sie im Wartezimmer Platz.", en: "Please take a seat in the waiting room.", tr: "Lutfen bekleme odasinda oturunuz.", ar: "يرجى الجلوس في غرفة الانتظار.", ru: "Пожалуйста, присядьте в зале ожидания.", pl: "Prosze usiasc w poczekalni." },
        { de: "Ihre Versichertenkarte bitte.", en: "Your insurance card, please.", tr: "Sigorta kartinizi lutfen.", ar: "بطاقة التأمين من فضلك.", ru: "Вашу страховую карту, пожалуйста.", pl: "Prosze o karte ubezpieczenia." }
    ],
    anamnese: [
        { de: "Was fuehrt Sie zu uns?", en: "What brings you to us?", tr: "Bizi neden ziyaret ediyorsunuz?", ar: "ما الذي أتى بك إلينا؟", ru: "Что привело вас к нам?", pl: "Co Pana/Pania do nas sprowadza?" },
        { de: "Nehmen Sie regelmaessig Medikamente?", en: "Do you take regular medication?", tr: "Duzenli ilac kullaniyor musunuz?", ar: "هل تتناول أدوية بانتظام؟", ru: "Вы принимаете лекарства регулярно?", pl: "Czy przyjmuje Pan/Pani regularnie leki?" },
        { de: "Haben Sie Allergien?", en: "Do you have any allergies?", tr: "Alerjiniz var mi?", ar: "هل لديك حساسية؟", ru: "У вас есть аллергия?", pl: "Czy ma Pan/Pani alergie?" },
        { de: "Seit wann haben Sie die Beschwerden?", en: "Since when have you had these symptoms?", tr: "Sikayetleriniz ne zamandan beri var?", ar: "منذ متى تعاني من هذه الأعراض؟", ru: "С каких пор у вас эти жалобы?", pl: "Od kiedy ma Pan/Pani te dolegliwosci?" }
    ],
    schmerzen: [
        { de: "Wo haben Sie Schmerzen?", en: "Where do you have pain?", tr: "Nereniz agriyor?", ar: "أين تشعر بالألم؟", ru: "Где у вас болит?", pl: "Gdzie odczuwa Pan/Pani bol?" },
        { de: "Wie stark sind die Schmerzen auf einer Skala von 1-10?", en: "How severe is the pain on a scale of 1-10?", tr: "1-10 olceginde agriniz ne kadar siddetli?", ar: "ما مدى شدة الألم على مقياس من 1 إلى 10؟", ru: "Насколько сильная боль по шкале от 1 до 10?", pl: "Jak silny jest bol w skali od 1 do 10?" },
        { de: "Ist der Schmerz staendig oder kommt und geht er?", en: "Is the pain constant or does it come and go?", tr: "Agri surekli mi yoksa gelip gidiyor mu?", ar: "هل الألم مستمر أم يأتي ويذهب؟", ru: "Боль постоянная или приходит и уходит?", pl: "Czy bol jest staly czy przychodzi i odchodzi?" }
    ],
    behandlung: [
        { de: "Ich verschreibe Ihnen ein Medikament.", en: "I will prescribe you a medication.", tr: "Size bir ilac yazacagim.", ar: "سأصف لك دواء.", ru: "Я выпишу вам лекарство.", pl: "Przepisze Panu/Pani lek." },
        { de: "Bitte kommen Sie naechste Woche wieder.", en: "Please come back next week.", tr: "Lutfen gelecek hafta tekrar gelin.", ar: "يرجى العودة الأسبوع المقبل.", ru: "Пожалуйста, приходите на следующей неделе.", pl: "Prosze przyjsc w przyszlym tygodniu." },
        { de: "Sie muessen nuechtern zur Blutabnahme kommen.", en: "You need to come fasting for the blood test.", tr: "Kan testi icin ac karnina gelmelisiniz.", ar: "يجب أن تأتي صائماً لسحب الدم.", ru: "Вам нужно прийти натощак на анализ крови.", pl: "Musi Pan/Pani przyjsc na czczo na badanie krwi." }
    ],
    termin: [
        { de: "Ihr naechster Termin ist am...", en: "Your next appointment is on...", tr: "Bir sonraki randevunuz...", ar: "موعدك القادم في...", ru: "Ваша следующая запись...", pl: "Pana/Pani nastepna wizyta jest..." },
        { de: "Moechten Sie den Termin verschieben?", en: "Would you like to reschedule?", tr: "Randevunuzu ertelemek ister misiniz?", ar: "هل تريد تأجيل الموعد؟", ru: "Хотите перенести запись?", pl: "Czy chcialby Pan/chcialaby Pani przesunac wizyte?" }
    ],
    rezept: [
        { de: "Ihr Rezept liegt an der Rezeption bereit.", en: "Your prescription is ready at the reception.", tr: "Recetiniz resepsiyonda hazir.", ar: "وصفتك جاهزة في الاستقبال.", ru: "Ваш рецепт готов на ресепшен.", pl: "Recepta czeka na Pana/Pania w recepcji." },
        { de: "Das Rezept ist 3 Monate gueltig.", en: "The prescription is valid for 3 months.", tr: "Recete 3 ay gecerlidir.", ar: "الوصفة صالحة لمدة 3 أشهر.", ru: "Рецепт действителен 3 месяца.", pl: "Recepta jest wazna przez 3 miesiace." }
    ]
};

function initUebersetzer() {
    var uebersetzenBtn = document.getElementById("btn-ue-uebersetzen");
    if (!uebersetzenBtn) return;

    uebersetzenBtn.addEventListener("click", uebersetzen);

    var tauschBtn = document.getElementById("btn-ue-tauschen");
    if (tauschBtn) tauschBtn.addEventListener("click", function () {
        var von = document.getElementById("ue-sprache-von");
        var nach = document.getElementById("ue-sprache-nach");
        var tmp = von.value; von.value = nach.value; nach.value = tmp;
    });

    var vorlesenBtn = document.getElementById("btn-ue-vorlesen");
    if (vorlesenBtn) vorlesenBtn.addEventListener("click", function () {
        var ausgabe = document.getElementById("ue-ausgabe");
        if (ausgabe && ausgabe.textContent) {
            var nach = document.getElementById("ue-sprache-nach");
            var langMap = { de: "de-DE", en: "en-US", tr: "tr-TR", ar: "ar-SA", ru: "ru-RU", pl: "pl-PL" };
            var utt = new SpeechSynthesisUtterance(ausgabe.textContent);
            utt.lang = langMap[nach.value] || "de-DE";
            window.speechSynthesis.speak(utt);
        }
    });

    var kopierenBtn = document.getElementById("btn-ue-kopieren");
    if (kopierenBtn) kopierenBtn.addEventListener("click", function () {
        var ausgabe = document.getElementById("ue-ausgabe");
        if (ausgabe && navigator.clipboard) {
            navigator.clipboard.writeText(ausgabe.textContent);
            kopierenBtn.textContent = "Kopiert!";
            setTimeout(function () { kopierenBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Kopieren'; }, 2000);
        }
    });

    // Mikrofon fuer Uebersetzer
    var mikBtn = document.getElementById("btn-ue-mikrofon");
    if (mikBtn) {
        var SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (SpeechRec) {
            var rec = new SpeechRec();
            rec.continuous = false;
            rec.interimResults = false;
            var isRec = false;
            mikBtn.addEventListener("click", function () {
                if (isRec) { rec.stop(); return; }
                var von = document.getElementById("ue-sprache-von");
                var langMap = { de: "de-DE", en: "en-US", tr: "tr-TR", ar: "ar-SA", ru: "ru-RU", pl: "pl-PL" };
                rec.lang = langMap[von.value] || "de-DE";
                isRec = true;
                mikBtn.classList.add("recording");
                rec.start();
            });
            rec.onresult = function (e) {
                var text = e.results[0][0].transcript;
                document.getElementById("ue-eingabe").value = text;
                uebersetzen();
            };
            rec.onend = function () { isRec = false; mikBtn.classList.remove("recording"); };
            rec.onerror = function () { isRec = false; mikBtn.classList.remove("recording"); };
        }
    }

    // Phrasen laden
    initPhrasen();
}

function uebersetzen() {
    var eingabe = document.getElementById("ue-eingabe").value.trim();
    var von = document.getElementById("ue-sprache-von").value;
    var nach = document.getElementById("ue-sprache-nach").value;
    var ausgabe = document.getElementById("ue-ausgabe");
    if (!eingabe || !ausgabe) return;

    // Suche in den medizinischen Phrasen
    var gefunden = null;
    var kategorien = Object.keys(medPhrases);
    for (var k = 0; k < kategorien.length; k++) {
        var phrasen = medPhrases[kategorien[k]];
        for (var p = 0; p < phrasen.length; p++) {
            if (phrasen[p][von] && phrasen[p][von].toLowerCase() === eingabe.toLowerCase()) {
                gefunden = phrasen[p][nach] || phrasen[p].en || eingabe;
                break;
            }
        }
        if (gefunden) break;
    }

    if (gefunden) {
        ausgabe.textContent = gefunden;
    } else {
        // Demo-Fallback: einfache Wort-fuer-Wort Marker
        var demoUe = {
            "de-en": { "hallo": "hello", "ja": "yes", "nein": "no", "danke": "thank you", "bitte": "please", "schmerzen": "pain", "kopf": "head", "bauch": "stomach", "termin": "appointment", "arzt": "doctor", "medikament": "medication", "rezept": "prescription" },
            "de-tr": { "hallo": "merhaba", "ja": "evet", "nein": "hayir", "danke": "tesekkurler", "bitte": "lutfen", "schmerzen": "agri", "termin": "randevu", "arzt": "doktor" }
        };
        var key = von + "-" + nach;
        var woerter = eingabe.toLowerCase().split(" ");
        var uebersetzt = [];
        var dict = demoUe[key] || {};
        for (var w = 0; w < woerter.length; w++) {
            uebersetzt.push(dict[woerter[w]] || woerter[w]);
        }
        ausgabe.textContent = uebersetzt.join(" ");
        if (Object.keys(dict).length === 0) {
            ausgabe.textContent = "[Demo] " + eingabe + " (" + von + " → " + nach + ")";
        }
    }

    // Verlauf speichern
    var verlauf = dbLaden("ue_verlauf");
    verlauf.unshift({ original: eingabe, uebersetzung: ausgabe.textContent, von: von, nach: nach, zeit: new Date().toLocaleTimeString("de-DE") });
    if (verlauf.length > 20) verlauf = verlauf.slice(0, 20);
    dbSpeichern("ue_verlauf", verlauf);
    ueVerlaufAktualisieren();
}

function ueVerlaufAktualisieren() {
    var tabelle = document.getElementById("ue-verlauf-tabelle");
    if (!tabelle) return;
    var tbody = tabelle.querySelector("tbody");
    if (!tbody) return;
    var verlauf = dbLaden("ue_verlauf");
    tbody.innerHTML = "";
    for (var i = 0; i < verlauf.length; i++) {
        var v = verlauf[i];
        var tr = document.createElement("tr");
        tr.innerHTML = '<td>' + escapeHtml(v.original) + '</td><td>' + escapeHtml(v.uebersetzung) + '</td><td>' + v.von.toUpperCase() + ' → ' + v.nach.toUpperCase() + '</td><td>' + escapeHtml(v.zeit) + '</td>';
        tbody.appendChild(tr);
    }
}

function initPhrasen() {
    var katBtns = document.querySelectorAll(".phrasen-kat");
    for (var i = 0; i < katBtns.length; i++) {
        katBtns[i].addEventListener("click", function () {
            for (var j = 0; j < katBtns.length; j++) katBtns[j].classList.remove("active");
            this.classList.add("active");
            phrasenAnzeigen(this.getAttribute("data-kat"));
        });
    }

    var sprachSel = document.getElementById("ue-phrasen-sprache");
    if (sprachSel) sprachSel.addEventListener("change", function () {
        var aktiveKat = document.querySelector(".phrasen-kat.active");
        phrasenAnzeigen(aktiveKat ? aktiveKat.getAttribute("data-kat") : "begruessung");
    });

    phrasenAnzeigen("begruessung");
    ueVerlaufAktualisieren();
}

function phrasenAnzeigen(kategorie) {
    var liste = document.getElementById("phrasen-liste");
    var sprachSel = document.getElementById("ue-phrasen-sprache");
    if (!liste || !sprachSel) return;
    var sprache = sprachSel.value;
    var phrasen = medPhrases[kategorie] || [];
    liste.innerHTML = "";
    for (var i = 0; i < phrasen.length; i++) {
        var p = phrasen[i];
        var div = document.createElement("div");
        div.className = "phrase-card";
        div.innerHTML = '<div class="phrase-de">' + escapeHtml(p.de) + '</div><div class="phrase-uebersetzt">' + escapeHtml(p[sprache] || p.en) + '</div><div class="phrase-actions"><button type="button" class="btn-sm" onclick="phraseVorlesen(\'' + escapeHtml(p[sprache] || p.en).replace(/'/g, "\\'") + '\',\'' + sprache + '\')"><i class="fa-solid fa-volume-high"></i></button><button type="button" class="btn-sm" onclick="phraseUebernehmen(\'' + escapeHtml(p.de).replace(/'/g, "\\'") + '\')"><i class="fa-solid fa-arrow-right"></i></button></div>';
        liste.appendChild(div);
    }
}

function phraseVorlesen(text, sprache) {
    if (!window.speechSynthesis) return;
    var langMap = { en: "en-US", tr: "tr-TR", ar: "ar-SA", ru: "ru-RU", pl: "pl-PL" };
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang = langMap[sprache] || "en-US";
    window.speechSynthesis.speak(utt);
}

function phraseUebernehmen(text) {
    var eingabe = document.getElementById("ue-eingabe");
    if (eingabe) { eingabe.value = text; uebersetzen(); }
}

/** Exportieren fuer Tests (Node.js) */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        berechnen, benutzerValidieren, escapeHtml, OP_SYMBOLE,
        patientValidieren, arztValidieren, terminValidieren,
        wartezeitBerechnen, STATUS_KLASSEN,
        berechnenApi,
        benutzerSpeichernApi, benutzerAktualisierenApi,
        benutzerLoeschenApi, benutzerLadenApi,
        verlaufLadenApi, verlaufLoeschenApi,
        patientenLadenApi, patientSpeichernApi,
        patientAktualisierenApi, patientLoeschenApi,
        aerzteLadenApi, arztSpeichernApi,
        arztAktualisierenApi, arztLoeschenApi,
        termineLadenApi, terminSpeichernApi,
        terminAktualisierenApi, terminLoeschenApi,
        wartezimmerLadenApi, wartezimmerCheckinApi,
        wartezimmerStatusApi, wartezimmerEntfernenApi,
        agentenLadenApi, agentSpeichernApi,
        agentAktualisierenApi, agentLoeschenApi,
        agentStatusSetzenApi, anrufeLadenApi,
        startAnrufTimer, stopAnrufTimer,
        formularZuruecksetzen, benutzerBearbeiten, benutzerZurTabelle,
        benutzerListeAktualisieren, benutzerEntfernen,
        verlaufAktualisieren,
        patientFormZuruecksetzen, patientBearbeiten, patientenListeAktualisieren,
        arztFormZuruecksetzen, arztBearbeiten, aerzteListeAktualisieren,
        terminFormZuruecksetzen, terminBearbeiten, termineListeAktualisieren,
        terminDropdownsLaden,
        wartezimmerAktualisieren, wartezimmerDropdownsLaden, wartezimmerTermineLaden,
        agentFormZuruecksetzen, agentBearbeiten, agentenBoardAktualisieren,
        aktiveAnrufeAktualisieren, anrufprotokollAktualisieren,
        sprachAusgabe, callflowDaten: callflowDaten,
        medPhrases: medPhrases, uebersetzen: typeof uebersetzen !== "undefined" ? uebersetzen : function () {},
    };
}

// Globale Funktionen fuer onclick-Handler im HTML
if (typeof window !== "undefined") {
    window.callflowPropsSpeichern = callflowPropsSpeichern;
    window.callflowNodeLoeschen = callflowNodeLoeschen;
    window.phraseVorlesen = phraseVorlesen;
    window.phraseUebernehmen = phraseUebernehmen;
}

/** Init (nur im Browser) */
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
        demoDatenLaden();
        initDashboard();
        initRechner();
        initBenutzerFormular();
        initPatienten();
        initAerzte();
        initTermine();
        initWartezimmer();
        initAgentenBoard();
        initSoftphone();
        initChatWidget();
        initSprachChat();
        initCallflowEditor();
        initVoicebotSeite();
        initUebersetzer();
        initDemoReset();

        // Mobile Sidebar Toggle
        var menuBtn = document.getElementById("menu-toggle");
        var sidebar = document.getElementById("sidebar");
        if (menuBtn && sidebar) {
            menuBtn.addEventListener("click", function () {
                sidebar.classList.toggle("open");
            });
        }
    });
}
