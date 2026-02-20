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
        return "Ich kann Ihnen helfen mit: Patienten-Info, Aerzte-Info, Termine heute, Wartezimmer-Status. Stellen Sie einfach eine Frage!";
    }

    if (f.includes("agent")) {
        var agenten = dbLaden("agenten");
        var online = agenten.filter(function (a) { return a.status === "online"; });
        return agenten.length + " Agenten registriert, davon " + online.length + " online.";
    }

    if (f.includes("demo") || f.includes("reset") || f.includes("zurueck")) {
        localStorage.removeItem("med_demo_geladen");
        demoDatenLaden();
        return "Demo-Daten wurden zurueckgesetzt! Laden Sie die Seite neu um die Aenderungen zu sehen.";
    }

    return "Das habe ich nicht verstanden. Fragen Sie mich nach: Patienten, Aerzte, Termine, Wartezimmer, Agenten oder tippen Sie 'hilfe'.";
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
    };
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
