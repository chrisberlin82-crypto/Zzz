/** MED Rezeption Frontend-Logik - Demo & Live-Version */

var API_BASE = "/api";

// ===== Branchen-Konfiguration (Office-Typen) =====

var BRANCHEN = {
    arztpraxis: { label: "Arztpraxis", buero_name: "Praxis", verwaltung: "Praxisverwaltung", assistent: "Praxis-Assistent", kunden: "Patienten", mitarbeiter: "Aerzte", dienste: ["Terminvergabe", "Rezeptbestellung", "Weiterleitung an Rezeption"], notfall: "Bei Notfaellen rufen Sie 112 an.", spezial: "Keine medizinischen Diagnosen oder Behandlungsratschlaege." },
    zahnarzt: { label: "Zahnarztpraxis", buero_name: "Praxis", verwaltung: "Praxisverwaltung", assistent: "Praxis-Assistent", kunden: "Patienten", mitarbeiter: "Zahnaerzte", dienste: ["Terminvergabe", "Rezeptbestellung", "Weiterleitung"], notfall: "Bei Notfaellen rufen Sie 112 an.", spezial: "" },
    anwalt: { label: "Rechtsanwaltskanzlei", buero_name: "Kanzlei", verwaltung: "Kanzleiverwaltung", assistent: "Kanzlei-Assistent", kunden: "Mandanten", mitarbeiter: "Anwaelte", dienste: ["Terminvergabe", "Dokumentenanfrage", "Weiterleitung"], notfall: "", spezial: "Keine Rechtsberatung erteilen." },
    steuerberater: { label: "Steuerberatungsbuero", buero_name: "Buero", verwaltung: "Bueroverwaltung", assistent: "Buero-Assistent", kunden: "Mandanten", mitarbeiter: "Steuerberater", dienste: ["Terminvergabe", "Dokumentenanfrage", "Weiterleitung"], notfall: "", spezial: "" },
    friseur: { label: "Friseursalon", buero_name: "Salon", verwaltung: "Salonverwaltung", assistent: "Salon-Assistent", kunden: "Kunden", mitarbeiter: "Friseure", dienste: ["Terminvergabe", "Weiterleitung"], notfall: "", spezial: "" },
    werkstatt: { label: "KFZ-Werkstatt", buero_name: "Werkstatt", verwaltung: "Werkstattverwaltung", assistent: "Werkstatt-Assistent", kunden: "Kunden", mitarbeiter: "Mechaniker", dienste: ["Terminvergabe", "Statusabfrage", "Weiterleitung"], notfall: "Pannen: ADAC 0800-5 10 11 12", spezial: "" },
    tierarzt: { label: "Tierarztpraxis", buero_name: "Praxis", verwaltung: "Praxisverwaltung", assistent: "Praxis-Assistent", kunden: "Tierhalter", mitarbeiter: "Tieraerzte", dienste: ["Terminvergabe", "Weiterleitung"], notfall: "Tier-Notfall: Sofort vorbeikommen.", spezial: "" },
    allgemein: { label: "Allgemeines Buero", buero_name: "Buero", verwaltung: "Bueroverwaltung", assistent: "Buero-Assistent", kunden: "Kunden", mitarbeiter: "Mitarbeiter", dienste: ["Terminvergabe", "Weiterleitung"], notfall: "", spezial: "" }
};

var MED_BRANCHE_KEY = "arztpraxis";
var MED_BRANCHE = BRANCHEN.arztpraxis;
var MED_FIRMEN_NAME = "";

function brancheLaden() {
    try {
        var gespeichert = localStorage.getItem("med_branche");
        if (gespeichert) {
            var daten = JSON.parse(gespeichert);
            MED_BRANCHE_KEY = daten.key || "arztpraxis";
            MED_FIRMEN_NAME = daten.firmen_name || "";
            MED_BRANCHE = BRANCHEN[MED_BRANCHE_KEY] || BRANCHEN.arztpraxis;
        }
    } catch (e) { console.warn("brancheLaden:", e); }
}

function brancheSpeichern(key, firmenName) {
    MED_BRANCHE_KEY = key;
    MED_BRANCHE = BRANCHEN[key] || BRANCHEN.arztpraxis;
    MED_FIRMEN_NAME = firmenName || "";
    localStorage.setItem("med_branche", JSON.stringify({ key: key, firmen_name: firmenName }));
    brancheAnwenden();
}

function brancheAnwenden() {
    var b = MED_BRANCHE;
    var name = MED_FIRMEN_NAME || b.label;

    // Sidebar-Titel
    var sidebarTitel = document.querySelectorAll(".sidebar h2");
    for (var i = 0; i < sidebarTitel.length; i++) {
        sidebarTitel[i].textContent = name;
    }
    var sidebarSub = document.querySelectorAll(".sidebar small");
    for (var j = 0; j < sidebarSub.length; j++) {
        sidebarSub[j].textContent = b.verwaltung;
    }

    // Chat-Assistent Label
    var chatHeaders = document.querySelectorAll(".chat-header span");
    for (var k = 0; k < chatHeaders.length; k++) {
        chatHeaders[k].innerHTML = '<i class="fa-solid fa-robot"></i> ' + escapeHtmlSafe(b.assistent);
    }

    // Seiten-Titel
    if (document.title.indexOf("MED Rezeption") !== -1 || document.title.indexOf(b.label) !== -1) {
        document.title = document.title.replace(/MED Rezeption|[\w\-]+praxis|[\w\-]+kanzlei|[\w\-]+buero|[\w\-]+salon|[\w\-]+werkstatt/gi, name);
    }
}

// ===== Modus-Erkennung (Demo / Live) =====

var MED_MODUS = "demo"; // "demo" = localStorage, "live" = Backend + LLM
var MED_LLM_VERFUEGBAR = false;

function modusPruefen() {
    // Pruefe ob Backend + LLM erreichbar ist
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", API_BASE + "/llm/status", true);
        xhr.timeout = 3000;
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var daten = JSON.parse(xhr.responseText);
                    if (daten.verfuegbar) {
                        MED_MODUS = "live";
                        MED_LLM_VERFUEGBAR = true;
                        modusAnzeigeAktualisieren();
                    }
                } catch (e) { console.warn("modusPruefen JSON:", e); }
            }
        };
        xhr.send();
    } catch (e) { console.warn("modusPruefen:", e); }
}

function modusAnzeigeAktualisieren() {
    var badges = document.querySelectorAll(".topbar-right");
    for (var i = 0; i < badges.length; i++) {
        var badge = badges[i];
        if (badge.textContent.trim() === "Demo-Modus") {
            badge.innerHTML = '<span class="badge badge-gruen"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i> Live-Modus (KI aktiv)</span>';
        }
    }
}

// ===== Guard / Auth Check =====

function guardPruefen() {
    // Portal-Check: Zutrittscode muss eingegeben sein
    if (!sessionStorage.getItem("med_portal_ok")) {
        window.location.href = "portal.html";
        return null;
    }
    var auth = sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth");
    if (!auth) {
        window.location.href = "guard.html";
        return null;
    }
    try {
        return JSON.parse(auth);
    } catch (e) {
        window.location.href = "guard.html";
        return null;
    }
}

function guardAbmelden() {
    sessionStorage.removeItem("med_guard_auth");
    localStorage.removeItem("med_guard_auth");
    sessionStorage.removeItem("med_portal_ok");
    window.location.href = "portal.html";
}

// Rollen-Konfiguration: Wer darf was sehen
var ALLE_SEITEN = ["index.html","dashboard.html","patienten.html","aerzte.html","termine.html","wartezimmer.html","wissensdatenbank.html","ansagen.html","auswertung.html","agenten.html","softphone.html","voicebot.html","callflow.html","uebersetzung.html","standort.html","benutzer.html","ai-agent.html"];
var ROLLEN = {
    admin:           { label: "Admin",           icon: "fa-user-gear",   farbe: "#dc2626", seiten: ALLE_SEITEN },
    standortleitung: { label: "Standortleitung", icon: "fa-building",    farbe: "#7c3aed", seiten: ALLE_SEITEN },
    teamleitung:     { label: "Teamleitung",     icon: "fa-users-gear",  farbe: "#0891b2", seiten: ALLE_SEITEN },
    agent:           { label: "Agent",            icon: "fa-headset",     farbe: "#059669", seiten: ALLE_SEITEN }
};

function guardInfoAnzeigen() {
    var auth = sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth");
    if (!auth) return;
    try {
        var daten = JSON.parse(auth);
        var rolle = ROLLEN[daten.rolle] || ROLLEN.agent;

        // Topbar: Name + Rolle + Abmelden
        var topbar = document.querySelector(".topbar-right");
        if (topbar) {
            topbar.innerHTML = '<span style="margin-right:0.5rem"><i class="fa-solid ' + rolle.icon + '" style="color:' + rolle.farbe + '"></i> ' +
                escapeHtmlSafe(daten.name) + ' <small style="background:' + rolle.farbe + ';color:#fff;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.7rem">' + escapeHtmlSafe(rolle.label) + '</small></span>' +
                '<button type="button" id="btn-abmelden" style="padding:0.3rem 0.7rem;font-size:0.8rem;background:#64748b;border-radius:6px">' +
                '<i class="fa-solid fa-right-from-bracket"></i> Abmelden</button>';
            var btn = document.getElementById("btn-abmelden");
            if (btn) btn.addEventListener("click", guardAbmelden);
        }

        // Sidebar: Nur erlaubte Seiten anzeigen
        rollenSidebarAnpassen(daten.rolle);

        // Seitenzugriff pruefen
        rollenSeitePruefen(daten.rolle);
    } catch (e) { console.warn("guardInfoAnzeigen:", e); }
}

function rollenSidebarAnpassen(rolleKey) {
    var rolle = ROLLEN[rolleKey];
    if (!rolle) return;
    var erlaubteSeiten = rolle.seiten;

    var links = document.querySelectorAll(".sidebar a");
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href");
        if (!href) continue;
        // Seite aus href extrahieren (z.B. "patienten.html")
        var seite = href.split("/").pop().split("?")[0];
        if (erlaubteSeiten.indexOf(seite) === -1) {
            links[i].style.display = "none";
        }
    }
}

function rollenSeitePruefen(rolleKey) {
    var rolle = ROLLEN[rolleKey];
    if (!rolle) return;
    var erlaubteSeiten = rolle.seiten;

    // Aktuelle Seite ermitteln
    var aktuelleSeite = window.location.pathname.split("/").pop() || "index.html";
    if (aktuelleSeite === "") aktuelleSeite = "index.html";

    // Ist diese Seite fuer die Rolle erlaubt?
    if (erlaubteSeiten.indexOf(aktuelleSeite) === -1) {
        // Zurueck zum Dashboard
        window.location.href = "index.html";
    }
}

function escapeHtmlSafe(text) {
    if (!text) return "";
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

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
            try { await verlaufLoeschenApi(); verlaufAktualisieren(); } catch (_) { console.warn("verlaufLoeschen:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
            alter: parseInt(document.getElementById("alter").value, 10) || 0,
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
                try { await wartezimmerStatusApi(e.id, "aufgerufen"); wartezimmerAktualisieren(); } catch (_) { console.warn("Fehler:", _); }
            });
            var btnFertig = karte.querySelector(".btn-fertig");
            if (btnFertig) btnFertig.addEventListener("click", async function () {
                try { await wartezimmerStatusApi(e.id, "fertig"); wartezimmerAktualisieren(); } catch (_) { console.warn("Fehler:", _); }
            });
            karte.querySelector(".btn-loeschen").addEventListener("click", async function () {
                try { await wartezimmerEntfernenApi(e.id); wartezimmerAktualisieren(); } catch (_) { console.warn("Fehler:", _); }
            });

            container.appendChild(karte);
        });
    } catch (_) { console.warn("Fehler:", _); }
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

        var onlineCount = agenten.filter(function (a) { return a.status === "online" || a.status === "im_gespraech"; }).length;
        if (badge) badge.textContent = onlineCount + " online";

        container.innerHTML = "";
        if (agenten.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">Keine Agenten angelegt.</p>';
            return;
        }

        var STATUS_LABELS = { online: "Verfuegbar", im_gespraech: "Im Gespraech", pause: "Pause", azu: "AZU", meeting: "Meeting", at_chris: "@Chris", offline: "Offline" };
        var STATUS_ICONS = { online: "fa-circle", im_gespraech: "fa-phone", pause: "fa-pause", azu: "fa-graduation-cap", meeting: "fa-users", at_chris: "fa-at", offline: "fa-circle-xmark" };

        agenten.forEach(function (a) {
            var statusLabel = STATUS_LABELS[a.status] || a.status;
            var karte = document.createElement("div");
            karte.className = "agent-karte";
            karte.innerHTML =
                '<h3><span class="agent-status-punkt ' + escapeHtml(a.status) + '"></span>' + escapeHtml(a.name) + '</h3>' +
                '<p>Nebenstelle: ' + escapeHtml(a.nebenstelle) + '</p>' +
                '<p>Rolle: ' + escapeHtml(a.rolle) + ' | Queue: ' + escapeHtml(a.warteschlange || '-') + '</p>' +
                '<p>Status: <strong><i class="fa-solid ' + (STATUS_ICONS[a.status] || 'fa-circle') + '"></i> ' + escapeHtml(statusLabel) + '</strong></p>' +
                '<div class="agent-aktionen">' +
                    '<button class="btn-online" title="Verfuegbar"><i class="fa-solid fa-circle"></i> Frei</button>' +
                    '<button class="btn-im_gespraech" title="Im Gespraech"><i class="fa-solid fa-phone"></i> Gespraech</button>' +
                    '<button class="btn-pause" title="Pause"><i class="fa-solid fa-pause"></i> Pause</button>' +
                    '<button class="btn-azu" title="AZU"><i class="fa-solid fa-graduation-cap"></i> AZU</button>' +
                    '<button class="btn-meeting" title="Meeting"><i class="fa-solid fa-users"></i> Meeting</button>' +
                    '<button class="btn-at_chris" title="@Chris"><i class="fa-solid fa-at"></i> @Chris</button>' +
                    '<button class="btn-offline" title="Offline"><i class="fa-solid fa-circle-xmark"></i> Offline</button>' +
                '</div>' +
                '<div style="display:flex;gap:0.25rem;margin-top:0.25rem">' +
                    '<button class="btn-bearbeiten" style="font-size:0.75rem;padding:0.2rem 0.5rem"><i class="fa-solid fa-pen"></i> Bearbeiten</button>' +
                    '<button class="btn-loeschen" style="font-size:0.75rem;padding:0.2rem 0.5rem;background:var(--danger)"><i class="fa-solid fa-trash"></i> Loeschen</button>' +
                '</div>';

            ["online", "im_gespraech", "pause", "azu", "meeting", "at_chris", "offline"].forEach(function (s) {
                var btn = karte.querySelector(".btn-" + s);
                if (btn) btn.addEventListener("click", async function () {
                    try { await agentStatusSetzenApi(a.id, s); agentenBoardAktualisieren(); } catch (_) { console.warn("Fehler:", _); }
                });
            });
            karte.querySelector(".btn-bearbeiten").addEventListener("click", function () { agentBearbeiten(a); });
            karte.querySelector(".btn-loeschen").addEventListener("click", async function () {
                if (!confirm("Agent wirklich loeschen?")) return;
                try { await agentLoeschenApi(a.id); agentenBoardAktualisieren(); } catch (err) { alert(err.message); }
            });

            container.appendChild(karte);
        });
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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
    } catch (_) { console.warn("Fehler:", _); }
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

// ===== Dashboard (rollenbasiert) =====

function initDashboard() {
    var container = document.getElementById("dashboard");
    if (!container) return;

    var auth = JSON.parse(sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth") || "{}");
    var rolle = (auth.rolle || "admin").toLowerCase();

    var patienten = dbLaden("patienten");
    var aerzte = dbLaden("aerzte");
    var heute = new Date().toISOString().split("T")[0];
    var termine = dbLaden("termine").filter(function (t) { return t.datum === heute; });
    var wartezimmer = dbLaden("wartezimmer").filter(function (w) { return w.status !== "fertig"; });
    var agenten = dbLaden("agenten");
    var onlineAgenten = agenten.filter(function (a) { return a.status === "online"; });

    // Rollenbasiertes HTML generieren
    var html = "";

    // Rollen-Tabs (nur wenn Admin)
    if (rolle === "admin" || rolle === "administrator") {
        html += '<div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">' +
            '<button type="button" class="dashboard-rolle-btn aktiv" onclick="dashboardRolleWechseln(\'admin\',this)"><i class="fa-solid fa-user-gear"></i> Admin</button>' +
            '<button type="button" class="dashboard-rolle-btn" onclick="dashboardRolleWechseln(\'teamleitung\',this)"><i class="fa-solid fa-users-gear"></i> Teamleiter</button>' +
            '<button type="button" class="dashboard-rolle-btn" onclick="dashboardRolleWechseln(\'standortleitung\',this)"><i class="fa-solid fa-building"></i> Standortleitung</button>' +
            '<button type="button" class="dashboard-rolle-btn" onclick="dashboardRolleWechseln(\'agent\',this)"><i class="fa-solid fa-headset"></i> Agent</button>' +
            '</div>';
    }

    // ===== ADMIN Dashboard =====
    html += '<div id="dash-admin" class="dash-view">';
    html += '<h2 style="margin-bottom:1rem"><i class="fa-solid fa-chart-pie"></i> Admin Dashboard</h2>';

    // KPI-Zeile
    html += '<div class="stat-grid" style="margin-bottom:1.5rem">' +
        statCard("fa-users", "bg-primary", patienten.length, "Patienten") +
        statCard("fa-user-doctor", "bg-success", aerzte.length, "Aerzte") +
        statCard("fa-calendar-check", "bg-warning", termine.length, "Termine heute") +
        statCard("fa-couch", "bg-info", wartezimmer.length, "Wartezimmer") +
        statCard("fa-headset", "bg-primary", onlineAgenten.length + "/" + agenten.length, "Agenten online") +
        '</div>';

    // Callcenter Live
    html += '<div class="card" style="margin-bottom:1.5rem"><div style="padding:1rem"><h3 style="margin-bottom:1rem"><i class="fa-solid fa-signal"></i> Callcenter Live</h3>';
    html += '<div class="stat-grid">' +
        statCard("fa-phone-volume", "bg-success", "2", "Aktive Gespraeche") +
        statCard("fa-clock", "bg-warning", "1", "In Warteschleife") +
        statCard("fa-headset", "bg-primary", onlineAgenten.length, "Agenten frei") +
        statCard("fa-robot", "bg-info", "3", "Via Voicebot") +
        '</div>';

    // Agenten-Status
    html += '<h3 style="margin:1rem 0 0.75rem"><i class="fa-solid fa-users"></i> Agenten-Status</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem">';
    agenten.forEach(function (a) {
        var statusFarben = { online: "#22c55e", im_gespraech: "#06b6d4", pause: "#f59e0b", azu: "#dc2626", meeting: "#7c3aed", at_chris: "#0369a1", offline: "#94a3b8" };
        var statusLabels = { online: "Verfuegbar", im_gespraech: "Im Gespraech", pause: "Pause", azu: "AZU", meeting: "Meeting", at_chris: "@Chris", offline: "Offline" };
        var farbe = statusFarben[a.status] || "#94a3b8";
        var statusText = statusLabels[a.status] || a.status;
        html += '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;background:var(--card);display:flex;align-items:center;gap:0.75rem">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:' + farbe + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.8rem">' + escapeHtml((a.name || "?").substring(0, 2).toUpperCase()) + '</div>' +
            '<div><div style="font-weight:600;font-size:0.85rem">' + escapeHtml(a.name) + '</div>' +
            '<div style="font-size:0.75rem;color:' + farbe + '">' + statusText + '</div></div>' +
            '</div>';
    });
    html += '</div></div></div>';

    // Termine + Wartezimmer nebeneinander
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">';
    html += '<div class="card"><div style="padding:1rem"><h3><i class="fa-solid fa-calendar-days"></i> Heutige Termine</h3>' +
        '<table style="width:100%;margin-top:0.75rem;font-size:0.85rem"><thead><tr><th>Uhrzeit</th><th>Patient</th><th>Arzt</th><th>Status</th></tr></thead><tbody id="dashboard-termine"></tbody></table></div></div>';
    html += '<div class="card"><div style="padding:1rem"><h3><i class="fa-solid fa-couch"></i> Wartezimmer</h3><div id="dashboard-wartezimmer" style="margin-top:0.75rem"></div></div></div>';
    html += '</div>';
    html += '</div>'; // end dash-admin

    // ===== TEAMLEITER Dashboard =====
    html += '<div id="dash-teamleitung" class="dash-view" style="display:none">';
    html += '<h2 style="margin-bottom:1rem"><i class="fa-solid fa-users-gear"></i> Teamleiter Dashboard</h2>';
    html += '<div class="stat-grid" style="margin-bottom:1.5rem">' +
        statCard("fa-phone", "bg-primary", "47", "Anrufe heute") +
        statCard("fa-check", "bg-success", "42", "Angenommen") +
        statCard("fa-phone-slash", "bg-danger", "5", "Verpasst") +
        statCard("fa-clock", "bg-warning", "12s", "Avg. Wartezeit") +
        statCard("fa-headset", "bg-info", onlineAgenten.length + "/" + agenten.length, "Agenten") +
        '</div>';

    // Agenten-Tabelle
    html += '<div class="card" style="margin-bottom:1.5rem"><div style="padding:1rem"><h3><i class="fa-solid fa-headset"></i> Agenten Uebersicht</h3>' +
        '<table style="width:100%;margin-top:0.75rem;font-size:0.85rem"><thead><tr><th>Agent</th><th>Status</th><th>Queue</th><th>Anrufe</th><th>Avg. Dauer</th></tr></thead><tbody>';
    agenten.forEach(function (a) {
        var statusKlasse = a.status === "online" ? "status-bestaetigt" : a.status === "pause" ? "status-geplant" : "status-abgesagt";
        html += '<tr><td>' + escapeHtml(a.name) + '</td>' +
            '<td><span class="status-badge ' + statusKlasse + '">' + escapeHtml(a.status) + '</span></td>' +
            '<td>' + escapeHtml(a.warteschlange || "Alle") + '</td>' +
            '<td>' + Math.floor(Math.random() * 15 + 3) + '</td>' +
            '<td>' + Math.floor(Math.random() * 200 + 60) + 's</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // Hotlines
    html += '<div class="card"><div style="padding:1rem"><h3><i class="fa-solid fa-tower-broadcast"></i> Hotline Live</h3>' +
        '<div style="margin-top:0.75rem">';
    [{ name: "Allgemein", auslastung: 65 }, { name: "Notfall", auslastung: 20 }, { name: "Rezept", auslastung: 45 }].forEach(function (h) {
        var farbe = h.auslastung > 80 ? "var(--danger)" : h.auslastung > 50 ? "var(--warning)" : "var(--success)";
        html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">' +
            '<span style="min-width:80px;font-size:0.85rem;font-weight:600">' + h.name + '</span>' +
            '<div style="flex:1;background:var(--bg);border-radius:4px;height:8px;overflow:hidden"><div style="width:' + h.auslastung + '%;height:100%;background:' + farbe + ';border-radius:4px"></div></div>' +
            '<span style="font-size:0.8rem;font-weight:700;min-width:35px;text-align:right">' + h.auslastung + '%</span></div>';
    });
    html += '</div></div></div>';
    html += '</div>'; // end dash-teamleitung

    // ===== STANDORTLEITUNG Dashboard =====
    html += '<div id="dash-standortleitung" class="dash-view" style="display:none">';
    html += '<h2 style="margin-bottom:1rem"><i class="fa-solid fa-building"></i> Standortleitung Dashboard</h2>';
    html += '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:var(--radius);padding:0.75rem;margin-bottom:1rem;font-size:0.85rem;color:#92400e"><i class="fa-solid fa-location-dot"></i> Ansicht: <strong>Praxis Dr. Schmidt</strong> &mdash; Nur Daten dieses Standorts</div>';
    html += '<div class="stat-grid" style="margin-bottom:1.5rem">' +
        statCard("fa-phone", "bg-primary", "28", "Anrufe heute") +
        statCard("fa-calendar-check", "bg-success", termine.length, "Termine heute") +
        statCard("fa-envelope", "bg-warning", "7", "Nachrichten offen") +
        statCard("fa-headset", "bg-info", onlineAgenten.length, "Agenten online") +
        '</div>';

    // Postfach
    html += '<div class="card" style="margin-bottom:1.5rem"><div style="padding:1rem"><h3><i class="fa-solid fa-inbox"></i> Postfach</h3>' +
        '<div style="margin-top:0.75rem">';
    [{ von: "Lisa M.", anliegen: "Terminanfrage Hr. Weber", status: "offen", zeit: "14:23" },
     { von: "Tom R.", anliegen: "Rezeptbestellung Ibuprofen", status: "erledigt", zeit: "13:45" },
     { von: "Voicebot", anliegen: "Rueckrufwunsch Fr. Klein", status: "offen", zeit: "12:10" }
    ].forEach(function (n) {
        var badge = n.status === "erledigt" ? 'background:#dcfce7;color:#15803d' : 'background:#fef3c7;color:#92400e';
        html += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border)">' +
            '<div style="flex:1"><strong style="font-size:0.85rem">' + escapeHtml(n.anliegen) + '</strong>' +
            '<div style="font-size:0.75rem;color:var(--text-muted)">Von: ' + escapeHtml(n.von) + ' · ' + n.zeit + '</div></div>' +
            '<span style="padding:0.2rem 0.5rem;border-radius:4px;font-size:0.7rem;font-weight:600;' + badge + '">' + escapeHtml(n.status) + '</span></div>';
    });
    html += '</div></div></div>';
    html += '</div>'; // end dash-standortleitung

    // ===== AGENT Dashboard =====
    html += '<div id="dash-agent" class="dash-view" style="display:none">';
    html += '<h2 style="margin-bottom:1rem"><i class="fa-solid fa-headset"></i> Agent Dashboard</h2>';
    html += '<div class="stat-grid" style="margin-bottom:1.5rem">' +
        statCard("fa-phone", "bg-primary", "12", "Meine Anrufe heute") +
        statCard("fa-check", "bg-success", "11", "Angenommen") +
        statCard("fa-clock", "bg-warning", "8s", "Avg. Wartezeit") +
        statCard("fa-stopwatch", "bg-info", "3:42", "Avg. Gespraechsdauer") +
        '</div>';

    // Meine Tickets
    html += '<div class="card" style="margin-bottom:1.5rem"><div style="padding:1rem"><h3><i class="fa-solid fa-ticket"></i> Meine offenen Tickets</h3>' +
        '<div style="margin-top:0.75rem">';
    [{ patient: "Hr. Weber", anliegen: "Terminverschiebung", prio: "mittel" },
     { patient: "Fr. Klein", anliegen: "Rueckruf gewuenscht", prio: "hoch" },
     { patient: "Hr. Braun", anliegen: "Rezeptanfrage", prio: "niedrig" }
    ].forEach(function (t) {
        var prioFarbe = t.prio === "hoch" ? "var(--danger)" : t.prio === "mittel" ? "var(--warning)" : "var(--success)";
        html += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border)">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:' + prioFarbe + '"></div>' +
            '<div style="flex:1"><strong style="font-size:0.85rem">' + escapeHtml(t.patient) + '</strong>' +
            '<div style="font-size:0.75rem;color:var(--text-muted)">' + escapeHtml(t.anliegen) + '</div></div>' +
            '<span style="font-size:0.75rem;color:var(--text-muted)">' + escapeHtml(t.prio) + '</span></div>';
    });
    html += '</div></div></div>';

    // Status-Buttons
    html += '<div class="card"><div style="padding:1rem"><h3><i class="fa-solid fa-circle-dot"></i> Mein Status</h3>' +
        '<div style="display:flex;gap:0.75rem;margin-top:0.75rem">' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #22c55e;background:#f0fdf4;color:#15803d;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-circle"></i> Frei</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #06b6d4;background:#ecfeff;color:#0891b2;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-phone"></i> Gespraech</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #f59e0b;background:#fffbeb;color:#92400e;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-pause"></i> Pause</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #dc2626;background:#fef2f2;color:#dc2626;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-graduation-cap"></i> AZU</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #7c3aed;background:#f5f3ff;color:#6d28d9;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-users"></i> Meeting</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #0369a1;background:#e0f2fe;color:#0369a1;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-at"></i> @Chris</button>' +
        '<button type="button" style="flex:1;padding:0.6rem 0.4rem;border-radius:var(--radius);border:2px solid #94a3b8;background:#f8fafc;color:#64748b;font-weight:700;cursor:pointer;font-size:0.8rem"><i class="fa-solid fa-circle-xmark"></i> Offline</button>' +
        '</div></div></div>';
    html += '</div>'; // end dash-agent

    container.innerHTML = html;

    // Titel setzen
    var titel = document.getElementById("dashboard-titel");
    if (titel) {
        var rollenTitel = { admin: "Admin Dashboard", administrator: "Admin Dashboard", teamleitung: "Teamleiter Dashboard", standortleitung: "Standortleitung", agent: "Agent Dashboard" };
        titel.textContent = rollenTitel[rolle] || "Dashboard";
    }

    // Tabellen fuellen (Admin)
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

    // Richtige View basierend auf Rolle zeigen
    if (rolle !== "admin" && rolle !== "administrator") {
        var map = { teamleitung: "dash-teamleitung", standortleitung: "dash-standortleitung", agent: "dash-agent" };
        var target = map[rolle];
        if (target) {
            document.querySelectorAll(".dash-view").forEach(function (v) { v.style.display = "none"; });
            var el = document.getElementById(target);
            if (el) el.style.display = "block";
        }
    }
}

function statCard(icon, bg, wert, label) {
    return '<div class="stat-card"><div class="stat-icon ' + bg + '"><i class="fa-solid ' + icon + '"></i></div>' +
        '<div class="stat-content"><div class="stat-value">' + wert + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div></div>';
}

// Dashboard-Rolle wechseln (nur Admin kann das)
if (typeof window !== "undefined") {
    window.dashboardRolleWechseln = function (rolle, btn) {
        document.querySelectorAll(".dashboard-rolle-btn").forEach(function (b) { b.classList.remove("aktiv"); });
        if (btn) btn.classList.add("aktiv");
        document.querySelectorAll(".dash-view").forEach(function (v) { v.style.display = "none"; });
        var map = { admin: "dash-admin", teamleitung: "dash-teamleitung", standortleitung: "dash-standortleitung", agent: "dash-agent" };
        var target = map[rolle] || "dash-admin";
        var el = document.getElementById(target);
        if (el) el.style.display = "block";
        var titel = document.getElementById("dashboard-titel");
        var rollenTitel = { admin: "Admin Dashboard", teamleitung: "Teamleiter Dashboard", standortleitung: "Standortleitung", agent: "Agent Dashboard" };
        if (titel) titel.textContent = rollenTitel[rolle] || "Dashboard";
    };
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
                chatNachrichtHinzufuegen("bot", "Hallo! Ich bin der " + MED_BRANCHE.assistent + ". Wie kann ich helfen? Fragen Sie mich nach " + MED_BRANCHE.kunden + ", Terminen, " + MED_BRANCHE.mitarbeiter + " oder dem Wartezimmer.");
            }
            if (input) input.focus();
        }
    });

    if (schliessen) schliessen.addEventListener("click", function () { fenster.style.display = "none"; });

    if (senden) senden.addEventListener("click", chatSenden);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") chatSenden(); });
}

var chatVerlauf = [];

function chatSenden() {
    var input = document.getElementById("chat-input");
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = "";
    chatNachrichtHinzufuegen("user", text);
    chatVerlauf.push({ role: "user", content: text });

    if (MED_LLM_VERFUEGBAR) {
        // Live-Modus: LLM-API aufrufen
        chatNachrichtHinzufuegen("bot-loading", "...");
        chatLlmAnfrage(text);
    } else {
        // Demo-Modus: lokale Antwort
        setTimeout(function () {
            var antwort = chatAntwortGenerieren(text);
            chatNachrichtHinzufuegen("bot", antwort);
            chatVerlauf.push({ role: "assistant", content: antwort });
            sprachAusgabe(antwort);
        }, 500);
    }
}

function chatLlmAnfrage(text) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/chat", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;
    xhr.onload = function () {
        // Lade-Nachricht entfernen
        var loading = document.querySelector(".chat-msg-bot-loading");
        if (loading) loading.remove();
        if (xhr.status === 200) {
            try {
                var daten = JSON.parse(xhr.responseText);
                var antwort = daten.antwort || "Keine Antwort erhalten.";
                chatNachrichtHinzufuegen("bot", antwort);
                chatVerlauf.push({ role: "assistant", content: antwort });
                sprachAusgabe(antwort);
            } catch (e) {
                chatNachrichtHinzufuegen("bot", "Fehler bei der Verarbeitung.");
            }
        } else {
            // Fallback auf Demo-Modus
            var antwort = chatAntwortGenerieren(text);
            chatNachrichtHinzufuegen("bot", antwort);
            chatVerlauf.push({ role: "assistant", content: antwort });
            sprachAusgabe(antwort);
        }
    };
    xhr.onerror = function () {
        var loading = document.querySelector(".chat-msg-bot-loading");
        if (loading) loading.remove();
        var antwort = chatAntwortGenerieren(text);
        chatNachrichtHinzufuegen("bot", antwort);
        chatVerlauf.push({ role: "assistant", content: antwort });
        sprachAusgabe(antwort);
    };
    xhr.send(JSON.stringify({ text: text, verlauf: chatVerlauf.slice(-10), branche: MED_BRANCHE_KEY, firmen_name: MED_FIRMEN_NAME }));
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
    var b = MED_BRANCHE;
    var name = MED_FIRMEN_NAME || b.label;

    if (f.includes("hallo") || f.includes("hi") || f.includes("guten")) {
        return "Hallo! Willkommen bei " + name + ". Wie kann ich Ihnen helfen?";
    }

    if (f.includes("patient") || f.includes("kunde") || f.includes("mandant") || f.includes("klient")) {
        var patienten = dbLaden("patienten");
        if (patienten.length === 0) return "Aktuell sind keine " + b.kunden + " angelegt.";
        var namen = patienten.map(function (p) { return p.vorname + " " + p.nachname; }).join(", ");
        return "Wir haben " + patienten.length + " " + b.kunden + ": " + namen + ".";
    }

    if (f.includes("arzt") || f.includes("aerzt") || f.includes("doktor") || f.includes("mitarbeiter") || f.includes("anwalt") || f.includes("berater") || f.includes("friseur") || f.includes("mechaniker")) {
        var aerzte = dbLaden("aerzte");
        if (aerzte.length === 0) return "Keine " + b.mitarbeiter + " angelegt.";
        var infos = aerzte.map(function (a) {
            return ((a.titel || "") + " " + a.vorname + " " + a.nachname).trim() + " (" + a.fachrichtung + ")";
        }).join(", ");
        return "Unsere " + b.mitarbeiter + ": " + infos;
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
        return wartezimmer.length + " " + b.kunden + " im Wartezimmer: " +
            wartezimmer.map(function (w) { return w.patient_name + " (" + w.status + ")"; }).join(", ");
    }

    if (f.includes("hilfe") || f.includes("help")) {
        return "Ich kann Ihnen helfen mit: " + b.kunden + "-Info, " + b.mitarbeiter + "-Info, Termine heute, Wartezimmer-Status, Voicebot, Callflow, Uebersetzer.";
    }

    if (f.includes("agent")) {
        var agenten = dbLaden("agenten");
        var online = agenten.filter(function (a) { return a.status === "online"; });
        return agenten.length + " Agenten registriert, davon " + online.length + " online.";
    }

    if (f.includes("voicebot") || f.includes("sprachbot")) {
        return "Der Voicebot bearbeitet automatisch eingehende Anrufe. Dienste: " + b.dienste.join(", ") + ". Konfigurieren Sie ihn unter 'Voicebot'.";
    }

    if (f.includes("callflow") || f.includes("anrufablauf")) {
        return "Im Callflow Editor koennen Sie den Anrufablauf visuell gestalten.";
    }

    if (f.includes("uebersetz") || f.includes("sprache") || f.includes("translation")) {
        return "Der Uebersetzer hilft bei der Kommunikation mit fremdsprachigen " + b.kunden + ". Er unterstuetzt 6 Sprachen.";
    }

    if (f.includes("branche") || f.includes("buero")) {
        return "Aktuelle Branche: " + b.label + " (" + b.buero_name + "). Aendern Sie die Branche in den Standort-Einstellungen.";
    }

    if (f.includes("demo") || f.includes("reset") || f.includes("zurueck")) {
        localStorage.removeItem("med_demo_geladen");
        demoDatenLaden();
        return "Demo-Daten wurden zurueckgesetzt! Laden Sie die Seite neu.";
    }

    return "Das habe ich nicht verstanden. Fragen Sie mich nach: " + b.kunden + ", " + b.mitarbeiter + ", Termine, Wartezimmer, Voicebot, Callflow, Uebersetzer oder 'hilfe'.";
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
        localStorage.removeItem("med_standort_geladen");
        localStorage.removeItem("med_acd_config");
        localStorage.removeItem("med_zeitplan");
        localStorage.removeItem("med_standort_info");
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
        if (!e.results || !e.results[0] || !e.results[0][0]) return;
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
var callflowAktuelleId = null;
var callflowListe = [];

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

function callflowListeLaden() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API_BASE + "/callflows", true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                callflowListe = JSON.parse(xhr.responseText);
                callflowListeRendern();
            } catch (e) { /* ignore */ }
        }
    };
    xhr.send();
}

function callflowListeRendern() {
    var listeEl = document.getElementById("callflow-liste");
    if (!listeEl) return;
    listeEl.innerHTML = "";
    if (callflowListe.length === 0) {
        listeEl.innerHTML = '<p class="text-muted">Keine gespeicherten Callflows. Erstellen Sie einen neuen.</p>';
        return;
    }
    for (var i = 0; i < callflowListe.length; i++) {
        var cf = callflowListe[i];
        var div = document.createElement("div");
        div.className = "callflow-liste-eintrag" + (cf.aktiv ? " aktiv" : "") + (callflowAktuelleId === cf.id ? " selected" : "");
        div.innerHTML = '<div class="cf-liste-info"><strong>' + escapeHtml(cf.name) + '</strong>' +
            '<small>' + escapeHtml(cf.branche) + ' | ' + (cf.schritte ? cf.schritte.length : 0) + ' Schritte' +
            (cf.aktiv ? ' | <span class="badge-aktiv">AKTIV</span>' : '') + '</small></div>' +
            '<div class="cf-liste-btns">' +
            '<button type="button" class="btn-sm" data-id="' + cf.id + '" data-aktion="laden">Laden</button>' +
            '<button type="button" class="btn-sm btn-success" data-id="' + cf.id + '" data-aktion="aktivieren"' + (cf.aktiv ? ' disabled' : '') + '>Aktivieren</button>' +
            '<button type="button" class="btn-sm btn-loeschen" data-id="' + cf.id + '" data-aktion="loeschen">X</button>' +
            '</div>';
        listeEl.appendChild(div);
    }
    listeEl.querySelectorAll("button[data-aktion]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var id = parseInt(this.getAttribute("data-id"));
            var aktion = this.getAttribute("data-aktion");
            if (aktion === "laden") callflowVomServerLaden(id);
            else if (aktion === "aktivieren") callflowAktivieren(id);
            else if (aktion === "loeschen") callflowVomServerLoeschen(id);
        });
    });
}

function callflowVomServerLaden(id) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API_BASE + "/callflows/" + id, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                var cf = JSON.parse(xhr.responseText);
                callflowAktuelleId = cf.id;
                callflowDaten = [];
                for (var i = 0; i < cf.schritte.length; i++) {
                    var s = cf.schritte[i];
                    callflowDaten.push({ id: s.id || (i + 1), typ: s.typ, label: s.label, config: s.config || {} });
                }
                if (callflowDaten.length === 0) demoCallflowLaden();
                callflowRendern();
                callflowListeRendern();
                var nameEl = document.getElementById("cf-name");
                if (nameEl) nameEl.value = cf.name;
                var descEl = document.getElementById("cf-beschreibung");
                if (descEl) descEl.value = cf.beschreibung || "";
            } catch (e) { /* ignore */ }
        }
    };
    xhr.send();
}

function callflowSpeichern() {
    var name = "Neuer Callflow";
    var beschreibung = "";
    var nameEl = document.getElementById("cf-name");
    if (nameEl) name = nameEl.value || name;
    var descEl = document.getElementById("cf-beschreibung");
    if (descEl) beschreibung = descEl.value || "";

    var schritte = [];
    for (var i = 0; i < callflowDaten.length; i++) {
        schritte.push({ typ: callflowDaten[i].typ, label: callflowDaten[i].label, config: callflowDaten[i].config });
    }

    var payload = { name: name, branche: MED_BRANCHE_KEY || "allgemein", beschreibung: beschreibung, schritte: schritte };
    var xhr = new XMLHttpRequest();

    if (callflowAktuelleId) {
        xhr.open("PUT", API_BASE + "/callflows/" + callflowAktuelleId, true);
    } else {
        xhr.open("POST", API_BASE + "/callflows", true);
    }
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 201) {
            try {
                var res = JSON.parse(xhr.responseText);
                callflowAktuelleId = res.callflow.id;
                alert("Callflow gespeichert!");
                callflowListeLaden();
            } catch (e) { alert("Gespeichert."); }
        } else {
            alert("Fehler beim Speichern.");
        }
    };
    xhr.send(JSON.stringify(payload));
}

function callflowAktivieren(id) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/callflows/" + id + "/aktivieren", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        if (xhr.status === 200) {
            callflowListeLaden();
        } else {
            alert("Fehler beim Aktivieren.");
        }
    };
    xhr.send();
}

function callflowVomServerLoeschen(id) {
    if (!confirm("Callflow wirklich loeschen?")) return;
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", API_BASE + "/callflows/" + id, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            if (callflowAktuelleId === id) {
                callflowAktuelleId = null;
                callflowDaten = [];
                demoCallflowLaden();
                callflowRendern();
            }
            callflowListeLaden();
        }
    };
    xhr.send();
}

function callflowNeu() {
    callflowAktuelleId = null;
    callflowDaten = [];
    demoCallflowLaden();
    callflowRendern();
    var nameEl = document.getElementById("cf-name");
    if (nameEl) nameEl.value = "";
    var descEl = document.getElementById("cf-beschreibung");
    if (descEl) descEl.value = "";
    callflowListeRendern();
}

function initCallflowEditor() {
    var canvas = document.getElementById("callflow-flow");
    if (!canvas) return;
    demoCallflowLaden();
    callflowRendern();
    callflowListeLaden();

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

    // Speichern (Backend statt localStorage)
    var saveBtn = document.getElementById("btn-flow-speichern");
    if (saveBtn) saveBtn.addEventListener("click", callflowSpeichern);

    // Neu
    var neuBtn = document.getElementById("btn-flow-neu");
    if (neuBtn) neuBtn.addEventListener("click", callflowNeu);

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
            maxVersuche: parseInt(document.getElementById("vb-max-versuche").value, 10) || 3,
            timeout: parseInt(document.getElementById("vb-timeout").value, 10) || 5,
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
var vbDialogTyp = "allgemein";

function voicebotTestStarten() {
    var bereich = document.getElementById("voicebot-test-bereich");
    var chat = document.getElementById("vb-test-chat");
    if (!bereich || !chat) return;
    bereich.hidden = false;
    chat.innerHTML = "";
    vbTestSchritt = 0;
    vbDialogTyp = "allgemein";

    if (MED_LLM_VERFUEGBAR) {
        vbTestNachricht("system", "[Live-Modus: KI-Voicebot aktiv]");
        voicebotLlmAnfrage("start", 0, "allgemein");
    } else {
        var vbName = MED_FIRMEN_NAME || MED_BRANCHE.label;
        var vbDienste = MED_BRANCHE.dienste;
        var vbMenue = [];
        for (var d = 0; d < vbDienste.length && d < 3; d++) vbMenue.push((d + 1) + " fuer " + vbDienste[d]);
        vbMenue.push("0 fuer die Warteschlange");
        vbTestNachricht("bot", "Willkommen bei " + vbName + ".");
        vbTestNachricht("bot", "Druecken Sie " + vbMenue.join(", ") + ".");
        vbTestNachricht("system", "Warte auf DTMF-Eingabe...");
        sprachAusgabe("Willkommen bei " + vbName + ". Druecken Sie " + vbMenue.join(", ") + ".");
    }
}

function voicebotTestDtmf(taste) {
    var chat = document.getElementById("vb-test-chat");
    if (!chat) return;
    vbTestNachricht("anrufer", "DTMF: " + taste);

    if (MED_LLM_VERFUEGBAR) {
        voicebotLlmAnfrage(taste, vbTestSchritt, vbDialogTyp);
        return;
    }

    // Demo-Modus (unveraendert)
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

function voicebotLlmAnfrage(eingabe, schritt, dialogTyp) {
    vbTestNachricht("system", "KI verarbeitet...");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/voicebot/dialog", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;
    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                var daten = JSON.parse(xhr.responseText);
                vbTestSchritt = daten.schritt || vbTestSchritt + 1;
                if (daten.aktion) vbDialogTyp = daten.aktion === "termin_buchen" ? "termin" : daten.aktion === "rezept" ? "rezept" : vbDialogTyp;
                vbTestNachricht("bot", daten.antwort || "...");
                if (daten.aktion && daten.aktion !== "weiter") {
                    vbTestNachricht("system", "AKTION: " + daten.aktion.toUpperCase());
                }
                sprachAusgabe(daten.antwort || "");
            } catch (e) {
                vbTestNachricht("system", "Fehler bei KI-Antwort.");
            }
        } else {
            vbTestNachricht("system", "KI nicht erreichbar - Demo-Modus.");
        }
    };
    xhr.onerror = function () {
        vbTestNachricht("system", "KI nicht erreichbar.");
    };
    xhr.send(JSON.stringify({ eingabe: eingabe, schritt: schritt, dialog_typ: dialogTyp, branche: MED_BRANCHE_KEY, firmen_name: MED_FIRMEN_NAME }));
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

    // Im Live-Modus: LLM-Uebersetzung nutzen
    if (MED_LLM_VERFUEGBAR) {
        ausgabe.textContent = "Uebersetze...";
        uebersetzenLlm(eingabe, von, nach, ausgabe);
        return;
    }

    // Demo-Modus: Phrasen-Suche + Fallback
    uebersetzenDemo(eingabe, von, nach, ausgabe);
}

function uebersetzenLlm(eingabe, von, nach, ausgabe) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/uebersetzen", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;
    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                var daten = JSON.parse(xhr.responseText);
                ausgabe.textContent = daten.uebersetzung || eingabe;
            } catch (e) {
                // Fallback auf Demo
                uebersetzenDemo(eingabe, von, nach, ausgabe);
            }
        } else {
            uebersetzenDemo(eingabe, von, nach, ausgabe);
        }
        ueVerlaufSpeichern(eingabe, ausgabe.textContent, von, nach);
    };
    xhr.onerror = function () {
        uebersetzenDemo(eingabe, von, nach, ausgabe);
        ueVerlaufSpeichern(eingabe, ausgabe.textContent, von, nach);
    };
    xhr.send(JSON.stringify({ text: eingabe, von: von, nach: nach, branche: MED_BRANCHE_KEY, firmen_name: MED_FIRMEN_NAME }));
}

function uebersetzenDemo(eingabe, von, nach, ausgabe) {
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

    ueVerlaufSpeichern(eingabe, ausgabe.textContent, von, nach);
}

function ueVerlaufSpeichern(eingabe, uebersetzung, von, nach) {
    var verlauf = dbLaden("ue_verlauf");
    verlauf.unshift({ original: eingabe, uebersetzung: uebersetzung, von: von, nach: nach, zeit: new Date().toLocaleTimeString("de-DE") });
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

// ===== Standort & ACD =====

var WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
var ACD_MODUS_LABEL = { alle_annehmen: "Alle Anrufe annehmen", klingeln_dann_bot: "Klingeln, dann Bot", bot_direkt: "Bot direkt" };

function standardZeitplan() {
    return WOCHENTAGE.map(function (tag, i) {
        return { tag: tag, aktiv: i < 5, von: "08:00", bis: "18:00", modus: "klingeln_dann_bot", pause_von: "12:00", pause_bis: "13:00", pause_modus: "bot_direkt" };
    });
}

function acdConfigLaden() { try { var d = localStorage.getItem("med_acd_config"); return d ? JSON.parse(d) : null; } catch (e) { return null; } }
function acdConfigSpeichern(c) { localStorage.setItem("med_acd_config", JSON.stringify(c)); }
function zeitplanLaden() { try { var d = localStorage.getItem("med_zeitplan"); return d ? JSON.parse(d) : standardZeitplan(); } catch (e) { return standardZeitplan(); } }
function zeitplanSpeichern(p) { localStorage.setItem("med_zeitplan", JSON.stringify(p)); }

function standortleitungLaden() { return dbLaden("standortleitung"); }
function standortleitungSpeichernApi(daten) { var l = dbLaden("standortleitung"); daten.id = dbNaechsteId("standortleitung"); daten.status = daten.status || "offline"; l.push(daten); dbSpeichern("standortleitung", l); return daten; }
function standortleitungAktualisierenApi(id, daten) { dbAktualisieren("standortleitung", parseInt(id), daten); return daten; }
function standortleitungLoeschenApi(id) { dbLoeschen("standortleitung", parseInt(id)); return { erfolg: true }; }
function standortleitungStatusSetzen(id, status) { dbAktualisieren("standortleitung", parseInt(id), { status: status }); return { erfolg: true }; }

function demoStandortdatenLaden() {
    if (localStorage.getItem("med_standort_geladen")) return;
    dbSpeichern("standortleitung", [
        { id: 1, name: "Dr. Sabine Gross", rolle: "standortleitung", nebenstelle: "300", sip_passwort: "sl300", warteschlange: "alle", telefon: "0170-9876543", email: "s.gross@praxis.de", status: "online" },
        { id: 2, name: "Frank Weber", rolle: "teamleiter", nebenstelle: "301", sip_passwort: "tl301", warteschlange: "rezeption", telefon: "0171-1234567", email: "f.weber@praxis.de", status: "online" }
    ]);
    if (!acdConfigLaden()) acdConfigSpeichern({ modus: "klingeln_dann_bot", klingelanzahl: 3, klingel_timeout: 15, verteilung: "alle_gleichzeitig" });
    localStorage.setItem("med_standort_geladen", "1");
}

function aktuellenAcdModusErmitteln() {
    var config = acdConfigLaden() || { modus: "klingeln_dann_bot" };
    var plan = zeitplanLaden();
    var jetzt = new Date();
    var jsTag = jetzt.getDay();
    var tagIdx = jsTag === 0 ? 6 : jsTag - 1;
    var tag = plan[tagIdx];
    if (!tag || !tag.aktiv) return { modus: config.modus, quelle: "Standard (Tag inaktiv)" };
    var zeit = ("0" + jetzt.getHours()).slice(-2) + ":" + ("0" + jetzt.getMinutes()).slice(-2);
    if (tag.pause_von && tag.pause_bis && zeit >= tag.pause_von && zeit < tag.pause_bis) return { modus: tag.pause_modus, quelle: tag.tag + " Pause (" + tag.pause_von + "-" + tag.pause_bis + ")" };
    if (zeit >= tag.von && zeit < tag.bis) return { modus: tag.modus, quelle: tag.tag + " (" + tag.von + "-" + tag.bis + ")" };
    return { modus: config.modus, quelle: "Standard (ausserhalb Oeffnungszeiten)" };
}

function initBranchenAuswahl() {
    var container = document.getElementById("branche-auswahl");
    if (!container) return;

    // Select bauen
    var select = document.getElementById("branche-select");
    var nameInput = document.getElementById("branche-firmenname");
    if (!select) return;

    // Optionen einfuegen
    var keys = Object.keys(BRANCHEN);
    select.innerHTML = "";
    for (var i = 0; i < keys.length; i++) {
        var opt = document.createElement("option");
        opt.value = keys[i];
        opt.textContent = BRANCHEN[keys[i]].label;
        if (keys[i] === MED_BRANCHE_KEY) opt.selected = true;
        select.appendChild(opt);
    }
    if (nameInput) nameInput.value = MED_FIRMEN_NAME;

    // Vorschau
    brancheVorschauRendern(MED_BRANCHE_KEY);
    select.addEventListener("change", function () { brancheVorschauRendern(select.value); });

    // Speichern
    var btnSpeichern = document.getElementById("btn-branche-speichern");
    if (btnSpeichern) btnSpeichern.addEventListener("click", function () {
        var key = select.value;
        var firmenName = nameInput ? nameInput.value.trim() : "";
        brancheSpeichern(key, firmenName);
        var erfolg = document.getElementById("branche-erfolg");
        if (erfolg) {
            erfolg.textContent = "Branche gespeichert: " + BRANCHEN[key].label + (firmenName ? " (" + firmenName + ")" : "") + ". Seite wird neu geladen...";
            erfolg.hidden = false;
            setTimeout(function () { location.reload(); }, 1500);
        }
    });
}

function brancheVorschauRendern(key) {
    var vorschau = document.getElementById("branche-vorschau");
    if (!vorschau) return;
    var b = BRANCHEN[key] || BRANCHEN.allgemein;
    vorschau.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.85rem">' +
        '<div><strong>Buero-Typ:</strong> ' + escapeHtmlSafe(b.buero_name) + '</div>' +
        '<div><strong>Verwaltung:</strong> ' + escapeHtmlSafe(b.verwaltung) + '</div>' +
        '<div><strong>Assistent:</strong> ' + escapeHtmlSafe(b.assistent) + '</div>' +
        '<div><strong>Kunden:</strong> ' + escapeHtmlSafe(b.kunden) + '</div>' +
        '<div><strong>Mitarbeiter:</strong> ' + escapeHtmlSafe(b.mitarbeiter) + '</div>' +
        '<div><strong>Dienste:</strong> ' + escapeHtmlSafe(b.dienste.join(", ")) + '</div>' +
        (b.notfall ? '<div style="grid-column:1/-1;color:#dc2626"><strong>Notfall:</strong> ' + escapeHtmlSafe(b.notfall) + '</div>' : '') +
        '</div>';
}

function initStandortSeite() {
    var acdAuswahl = document.getElementById("acd-modus-auswahl");
    if (!acdAuswahl) return;
    demoStandortdatenLaden();
    initBranchenAuswahl();

    // Standort-Info
    var infoForm = document.getElementById("standort-info-form");
    if (infoForm) {
        try { var info = JSON.parse(localStorage.getItem("med_standort_info") || "{}");
            if (info.name) document.getElementById("standort-name").value = info.name;
            if (info.telefon) document.getElementById("standort-telefon").value = info.telefon;
            if (info.strasse) document.getElementById("standort-strasse").value = info.strasse;
            if (info.notfall) document.getElementById("standort-notfall").value = info.notfall;
        } catch (e) { console.warn("standort laden:", e); }
        infoForm.addEventListener("submit", function (e) {
            e.preventDefault();
            localStorage.setItem("med_standort_info", JSON.stringify({ name: document.getElementById("standort-name").value, telefon: document.getElementById("standort-telefon").value, strasse: document.getElementById("standort-strasse").value, notfall: document.getElementById("standort-notfall").value }));
            var erfolg = document.getElementById("standort-info-erfolg");
            if (erfolg) { erfolg.textContent = "Standort gespeichert!"; erfolg.hidden = false; setTimeout(function () { erfolg.hidden = true; }, 3000); }
        });
    }

    // ACD-Modus
    var config = acdConfigLaden() || { modus: "klingeln_dann_bot", klingelanzahl: 3, klingel_timeout: 15, verteilung: "alle_gleichzeitig" };
    var karten = acdAuswahl.querySelectorAll(".acd-modus-karte");
    karten.forEach(function (k) {
        if (k.getAttribute("data-modus") === config.modus) k.classList.add("selected"); else k.classList.remove("selected");
        k.addEventListener("click", function () { karten.forEach(function (x) { x.classList.remove("selected"); }); k.classList.add("selected"); });
    });
    var kaEl = document.getElementById("acd-klingelanzahl"), ktEl = document.getElementById("acd-klingel-timeout"), vEl = document.getElementById("acd-verteilung");
    if (kaEl) kaEl.value = config.klingelanzahl || 3;
    if (ktEl) ktEl.value = config.klingel_timeout || 15;
    if (vEl) vEl.value = config.verteilung || "alle_gleichzeitig";

    var btnAcd = document.getElementById("btn-acd-speichern");
    if (btnAcd) btnAcd.addEventListener("click", function () {
        var sel = acdAuswahl.querySelector(".acd-modus-karte.selected");
        var modus = sel ? sel.getAttribute("data-modus") : "klingeln_dann_bot";
        acdConfigSpeichern({ modus: modus, klingelanzahl: parseInt(kaEl.value) || 3, klingel_timeout: parseInt(ktEl.value) || 15, verteilung: vEl.value });
        var erfolg = document.getElementById("acd-modus-erfolg");
        if (erfolg) { erfolg.textContent = "ACD-Modus gespeichert: " + ACD_MODUS_LABEL[modus]; erfolg.hidden = false; setTimeout(function () { erfolg.hidden = true; }, 3000); }
        acdLiveStatusRendern();
    });

    initZeitplan();
    initStandortleitungBoard();
    acdLiveStatusRendern();
    acdStatistikenDemo();
}

function initZeitplan() {
    var tbody = document.getElementById("zeitplan-body");
    if (!tbody) return;
    var plan = zeitplanLaden();
    tbody.innerHTML = "";
    plan.forEach(function (tag, idx) {
        var tr = document.createElement("tr");
        if (!tag.aktiv) tr.className = "zeitplan-tag-inaktiv";
        tr.innerHTML =
            '<td><strong>' + escapeHtml(tag.tag) + '</strong></td>' +
            '<td><input type="checkbox" class="zp-aktiv" ' + (tag.aktiv ? "checked" : "") + '></td>' +
            '<td><input type="time" class="zp-von" value="' + (tag.von || "08:00") + '"' + (tag.aktiv ? "" : " disabled") + '></td>' +
            '<td><input type="time" class="zp-bis" value="' + (tag.bis || "18:00") + '"' + (tag.aktiv ? "" : " disabled") + '></td>' +
            '<td><select class="zp-modus"' + (tag.aktiv ? "" : " disabled") + '><option value="alle_annehmen"' + (tag.modus === "alle_annehmen" ? " selected" : "") + '>Alle annehmen</option><option value="klingeln_dann_bot"' + (tag.modus === "klingeln_dann_bot" ? " selected" : "") + '>Klingeln+Bot</option><option value="bot_direkt"' + (tag.modus === "bot_direkt" ? " selected" : "") + '>Bot direkt</option></select></td>' +
            '<td><input type="time" class="zp-pause-von" value="' + (tag.pause_von || "12:00") + '"' + (tag.aktiv ? "" : " disabled") + '></td>' +
            '<td><input type="time" class="zp-pause-bis" value="' + (tag.pause_bis || "13:00") + '"' + (tag.aktiv ? "" : " disabled") + '></td>' +
            '<td><select class="zp-pause-modus"' + (tag.aktiv ? "" : " disabled") + '><option value="alle_annehmen"' + (tag.pause_modus === "alle_annehmen" ? " selected" : "") + '>Alle annehmen</option><option value="klingeln_dann_bot"' + (tag.pause_modus === "klingeln_dann_bot" ? " selected" : "") + '>Klingeln+Bot</option><option value="bot_direkt"' + (tag.pause_modus === "bot_direkt" ? " selected" : "") + '>Bot direkt</option></select></td>';
        var cb = tr.querySelector(".zp-aktiv");
        cb.addEventListener("change", function () {
            tr.querySelectorAll("input:not(.zp-aktiv), select").forEach(function (f) { f.disabled = !cb.checked; });
            tr.className = cb.checked ? "" : "zeitplan-tag-inaktiv";
        });
        tbody.appendChild(tr);
    });

    var btnSpeichern = document.getElementById("btn-zeitplan-speichern");
    if (btnSpeichern) btnSpeichern.addEventListener("click", function () {
        var neuerPlan = [];
        tbody.querySelectorAll("tr").forEach(function (tr, idx) {
            neuerPlan.push({ tag: WOCHENTAGE[idx], aktiv: tr.querySelector(".zp-aktiv").checked, von: tr.querySelector(".zp-von").value, bis: tr.querySelector(".zp-bis").value, modus: tr.querySelector(".zp-modus").value, pause_von: tr.querySelector(".zp-pause-von").value, pause_bis: tr.querySelector(".zp-pause-bis").value, pause_modus: tr.querySelector(".zp-pause-modus").value });
        });
        zeitplanSpeichern(neuerPlan);
        var erfolg = document.getElementById("zeitplan-erfolg");
        if (erfolg) { erfolg.textContent = "Zeitplan gespeichert!"; erfolg.hidden = false; setTimeout(function () { erfolg.hidden = true; }, 3000); }
        acdLiveStatusRendern();
    });

    var btnReset = document.getElementById("btn-zeitplan-reset");
    if (btnReset) btnReset.addEventListener("click", function () {
        if (!confirm("Zeitplan auf Standard zuruecksetzen?")) return;
        zeitplanSpeichern(standardZeitplan());
        initZeitplan();
        acdLiveStatusRendern();
    });
}

function acdLiveStatusRendern() {
    var container = document.getElementById("acd-live-status");
    if (!container) return;
    var aktuell = aktuellenAcdModusErmitteln();
    var config = acdConfigLaden() || {};
    var onAg = dbLaden("agenten").filter(function (a) { return a.status === "online"; }).length;
    var onSl = standortleitungLaden().filter(function (s) { return s.status === "online"; }).length;
    var mc = aktuell.modus === "alle_annehmen" ? "modus-alle" : aktuell.modus === "klingeln_dann_bot" ? "modus-klingeln" : "modus-bot";
    container.innerHTML =
        '<div class="acd-live-box"><h3><i class="fa-solid fa-signal"></i> Aktiver Modus</h3><span class="acd-live-modus ' + mc + '"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i> ' + escapeHtml(ACD_MODUS_LABEL[aktuell.modus] || aktuell.modus) + '</span><p style="margin-top:0.5rem;font-size:0.8rem;color:#64748b">Quelle: ' + escapeHtml(aktuell.quelle) + '</p></div>' +
        '<div class="acd-live-box"><h3><i class="fa-solid fa-users"></i> Verfuegbare Teilnehmer</h3><p style="font-size:0.9rem"><strong>' + onAg + '</strong> Agenten online</p><p style="font-size:0.9rem"><strong>' + onSl + '</strong> Leitung/Teamleiter online</p><p style="font-size:0.8rem;color:#64748b;margin-top:0.5rem">Verteilung: ' + escapeHtml(config.verteilung || "alle_gleichzeitig") + '</p></div>';
}

function initStandortleitungBoard() {
    var form = document.getElementById("standortleitung-form");
    if (!form) return;
    standortleitungBoardRendern();
    var btnAbbr = document.getElementById("btn-sl-abbrechen");
    if (btnAbbr) btnAbbr.addEventListener("click", function () { slFormReset(); });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var editId = document.getElementById("sl-id").value;
        var daten = { name: document.getElementById("sl-name").value, rolle: document.getElementById("sl-rolle").value, nebenstelle: document.getElementById("sl-nebenstelle").value, sip_passwort: document.getElementById("sl-sip-passwort").value, warteschlange: document.getElementById("sl-warteschlange").value, telefon: document.getElementById("sl-telefon").value, email: document.getElementById("sl-email").value };
        var erfolgDiv = document.getElementById("sl-erfolg"), fehlerDiv = document.getElementById("sl-fehler");
        if (!daten.name || !daten.nebenstelle || !daten.sip_passwort) { fehlerDiv.textContent = "Name, Nebenstelle und SIP-Passwort sind Pflicht."; fehlerDiv.hidden = false; erfolgDiv.hidden = true; return; }
        if (editId) { standortleitungAktualisierenApi(editId, daten); erfolgDiv.textContent = "Aktualisiert!"; }
        else { standortleitungSpeichernApi(daten); erfolgDiv.textContent = "Gespeichert!"; }
        erfolgDiv.hidden = false; fehlerDiv.hidden = true;
        slFormReset(); standortleitungBoardRendern(); acdLiveStatusRendern();
    });
}

function slFormReset() {
    var f = document.getElementById("standortleitung-form"); if (f) f.reset();
    document.getElementById("sl-id").value = "";
    var b = document.getElementById("btn-sl-abbrechen"); if (b) b.hidden = true;
    var s = document.getElementById("btn-sl-speichern"); if (s) s.textContent = "Speichern";
}

function slBearbeiten(sl) {
    document.getElementById("sl-id").value = sl.id;
    document.getElementById("sl-name").value = sl.name;
    document.getElementById("sl-rolle").value = sl.rolle;
    document.getElementById("sl-nebenstelle").value = sl.nebenstelle;
    document.getElementById("sl-sip-passwort").value = sl.sip_passwort;
    document.getElementById("sl-warteschlange").value = sl.warteschlange || "alle";
    document.getElementById("sl-telefon").value = sl.telefon || "";
    document.getElementById("sl-email").value = sl.email || "";
    var b = document.getElementById("btn-sl-abbrechen"); if (b) b.hidden = false;
    var s = document.getElementById("btn-sl-speichern"); if (s) s.textContent = "Aktualisieren";
    document.getElementById("standortleitung-form").scrollIntoView({ behavior: "smooth" });
}

function standortleitungBoardRendern() {
    var container = document.getElementById("standortleitung-karten");
    if (!container) return;
    var liste = standortleitungLaden();
    container.innerHTML = "";
    if (liste.length === 0) { container.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">Keine Standortleitung/Teamleiter angelegt.</p>'; return; }
    var SL_STATUS_LABELS = { online: "Verfuegbar", im_gespraech: "Im Gespraech", pause: "Pause", azu: "AZU", meeting: "Meeting", at_chris: "@Chris", offline: "Offline" };
    var SL_STATUS_ICONS = { online: "fa-circle", im_gespraech: "fa-phone", pause: "fa-pause", azu: "fa-graduation-cap", meeting: "fa-users", at_chris: "fa-at", offline: "fa-circle-xmark" };
    liste.forEach(function (sl) {
        var rl = sl.rolle === "standortleitung" ? "Standortleitung" : "Teamleiter";
        var slLabel = SL_STATUS_LABELS[sl.status] || sl.status;
        var k = document.createElement("div"); k.className = "agent-karte";
        k.innerHTML = '<h3><span class="agent-status-punkt ' + escapeHtml(sl.status) + '"></span>' + escapeHtml(sl.name) + '</h3>' +
            '<p><i class="fa-solid fa-user-tie"></i> ' + escapeHtml(rl) + '</p>' +
            '<p>NSt: ' + escapeHtml(sl.nebenstelle) + ' | Queue: ' + escapeHtml(sl.warteschlange || '-') + '</p>' +
            '<p>Status: <strong><i class="fa-solid ' + (SL_STATUS_ICONS[sl.status] || 'fa-circle') + '"></i> ' + escapeHtml(slLabel) + '</strong></p>' +
            (sl.telefon ? '<p><i class="fa-solid fa-mobile"></i> ' + escapeHtml(sl.telefon) + '</p>' : '') +
            '<div class="agent-aktionen">' +
                '<button class="btn-online" title="Verfuegbar"><i class="fa-solid fa-circle"></i> Frei</button>' +
                '<button class="btn-im_gespraech" title="Im Gespraech"><i class="fa-solid fa-phone"></i> Gespraech</button>' +
                '<button class="btn-pause" title="Pause"><i class="fa-solid fa-pause"></i> Pause</button>' +
                '<button class="btn-azu" title="AZU"><i class="fa-solid fa-graduation-cap"></i> AZU</button>' +
                '<button class="btn-meeting" title="Meeting"><i class="fa-solid fa-users"></i> Meeting</button>' +
                '<button class="btn-at_chris" title="@Chris"><i class="fa-solid fa-at"></i> @Chris</button>' +
                '<button class="btn-offline" title="Offline"><i class="fa-solid fa-circle-xmark"></i> Offline</button>' +
            '</div>' +
            '<div style="display:flex;gap:0.25rem;margin-top:0.25rem">' +
                '<button class="btn-bearbeiten" style="font-size:0.75rem;padding:0.2rem 0.5rem"><i class="fa-solid fa-pen"></i> Bearbeiten</button>' +
                '<button class="btn-loeschen" style="font-size:0.75rem;padding:0.2rem 0.5rem;background:var(--danger)"><i class="fa-solid fa-trash"></i> Loeschen</button>' +
            '</div>';
        ["online", "im_gespraech", "pause", "azu", "meeting", "at_chris", "offline"].forEach(function (s) {
            var btn = k.querySelector(".btn-" + s);
            if (btn) btn.addEventListener("click", function () { standortleitungStatusSetzen(sl.id, s); standortleitungBoardRendern(); acdLiveStatusRendern(); });
        });
        k.querySelector(".btn-bearbeiten").addEventListener("click", function () { slBearbeiten(sl); });
        k.querySelector(".btn-loeschen").addEventListener("click", function () { if (!confirm(rl + " loeschen?")) return; standortleitungLoeschenApi(sl.id); standortleitungBoardRendern(); acdLiveStatusRendern(); });
        container.appendChild(k);
    });
}

function acdStatistikenDemo() {
    var el = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    el("acd-stat-anrufe", "47"); el("acd-stat-angenommen", "32"); el("acd-stat-bot", "12"); el("acd-stat-verpasst", "3"); el("acd-stat-wartezeit", "8s");
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
        WOCHENTAGE: WOCHENTAGE, ACD_MODUS_LABEL: ACD_MODUS_LABEL,
        standardZeitplan: standardZeitplan,
        acdConfigLaden: acdConfigLaden, acdConfigSpeichern: acdConfigSpeichern,
        zeitplanLaden: zeitplanLaden, zeitplanSpeichern: zeitplanSpeichern,
        standortleitungLaden: standortleitungLaden,
        standortleitungSpeichernApi: standortleitungSpeichernApi,
        standortleitungAktualisierenApi: standortleitungAktualisierenApi,
        standortleitungLoeschenApi: standortleitungLoeschenApi,
        standortleitungStatusSetzen: standortleitungStatusSetzen,
        aktuellenAcdModusErmitteln: aktuellenAcdModusErmitteln,
    };
}

// ===== Wissensdatenbank =====

function initWissensdatenbank() {
    var btnNeu = document.getElementById("btn-kb-neu");
    var formBereich = document.getElementById("kb-formular-bereich");
    var formular = document.getElementById("kb-formular");
    var btnAbbrechen = document.getElementById("btn-kb-abbrechen");
    var suchfeld = document.getElementById("kb-suche");
    var katFilter = document.getElementById("kb-kategorie-filter");
    if (!btnNeu) return;

    var editId = null;

    function kbLaden() { return dbLaden("kb_artikel"); }
    function kbSpeichern(d) { dbSpeichern("kb_artikel", d); }

    function kbDemoLaden() {
        var artikel = kbLaden();
        if (artikel.length > 0) return;
        var demo = [
            { id: "kb1", titel: "Wie funktioniert die Terminbuchung?", kategorie: "termine", tags: "termin, buchung, online", inhalt: "Patienten koennen ueber das Web-Widget oder telefonisch Termine buchen. Der Voicebot erkennt Terminwuensche automatisch und schlaegt freie Slots vor.", botAntwort: "Sie koennen Termine online ueber unsere Webseite oder telefonisch vereinbaren. Moechten Sie einen Termin buchen?", aufrufe: 142, botNutzungen: 89, erstellt: new Date().toISOString() },
            { id: "kb2", titel: "Rezept bestellen - Ablauf", kategorie: "patienten", tags: "rezept, bestellung, wiederholung", inhalt: "Patienten koennen Folgerezepte telefonisch oder per Widget bestellen. Der Agent prueft die Patientenakte und leitet die Bestellung an den Arzt weiter.", botAntwort: "Fuer ein Folgerezept benoetigen wir Ihren Namen und die Versichertennummer. Welches Medikament benoetigen Sie?", aufrufe: 98, botNutzungen: 45, erstellt: new Date().toISOString() },
            { id: "kb3", titel: "Notfallnummern und Bereitschaft", kategorie: "notfall", tags: "notfall, bereitschaft, notruf", inhalt: "Bei lebensbedrohlichen Notfaellen: 112 anrufen. Aerztlicher Bereitschaftsdienst: 116117. Unsere Praxis ist Mo-Fr 8-18 Uhr erreichbar.", botAntwort: "Bei einem Notfall rufen Sie bitte sofort die 112 an. Den aerztlichen Bereitschaftsdienst erreichen Sie unter 116117.", aufrufe: 67, botNutzungen: 34, erstellt: new Date().toISOString() },
            { id: "kb4", titel: "ACD-Modi erklaert", kategorie: "telefonie", tags: "acd, telefonie, modus, bot", inhalt: "Es gibt 3 ACD-Modi: 1) Alle annehmen - Telefon klingelt bei allen Agenten. 2) Klingeln dann Bot - Nach X Klingeln uebernimmt der Voicebot. 3) Bot direkt - Voicebot nimmt sofort entgegen.", botAntwort: "Unsere Telefonanlage verteilt Anrufe automatisch an freie Mitarbeiter. Bei Wartezeiten uebernimmt unser KI-Assistent.", aufrufe: 23, botNutzungen: 5, erstellt: new Date().toISOString() },
            { id: "kb5", titel: "Oeffnungszeiten und Sprechstunden", kategorie: "praxisablauf", tags: "oeffnungszeiten, sprechstunde, zeiten", inhalt: "Mo-Fr: 8:00-12:00 und 14:00-18:00 Uhr. Mittwochnachmittag geschlossen. Samstag nach Vereinbarung.", botAntwort: "Unsere Sprechzeiten sind Montag bis Freitag von 8 bis 12 und 14 bis 18 Uhr. Mittwochnachmittag ist geschlossen.", aufrufe: 234, botNutzungen: 178, erstellt: new Date().toISOString() },
            { id: "kb6", titel: "Abrechnung und Privatpatienten", kategorie: "abrechnung", tags: "abrechnung, privat, kasse, igel", inhalt: "Kassenpatienten: Chipkarte mitbringen. Privatpatienten: Rechnung nach GOAe. IGeL-Leistungen werden vor Behandlung besprochen und schriftlich vereinbart.", botAntwort: "Bitte bringen Sie Ihre Versichertenkarte mit. Fuer Fragen zur Abrechnung verbinde ich Sie gerne mit der Rezeption.", aufrufe: 56, botNutzungen: 12, erstellt: new Date().toISOString() }
        ];
        kbSpeichern(demo);
    }

    var KAT_LABELS = { telefonie: "Telefonie & ACD", patienten: "Patienten", termine: "Termine", abrechnung: "Abrechnung", praxisablauf: "Praxisablauf", notfall: "Notfall", technik: "Technik" };
    var KAT_FARBEN = { telefonie: "#0891b2", patienten: "#7c3aed", termine: "#2563eb", abrechnung: "#059669", praxisablauf: "#d97706", notfall: "#dc2626", technik: "#64748b" };

    function statsAktualisieren() {
        var artikel = kbLaden();
        var el = function (id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el("kb-stat-artikel", artikel.length);
        var kats = {};
        var aufrufe = 0;
        var bot = 0;
        artikel.forEach(function (a) {
            kats[a.kategorie] = true;
            aufrufe += (a.aufrufe || 0);
            bot += (a.botNutzungen || 0);
        });
        el("kb-stat-kategorien", Object.keys(kats).length);
        el("kb-stat-aufrufe", aufrufe);
        el("kb-stat-bot", bot);
    }

    function artikelAnzeigen() {
        var liste = document.getElementById("kb-artikel-liste");
        if (!liste) return;
        var artikel = kbLaden();
        var suche = (suchfeld ? suchfeld.value.toLowerCase() : "");
        var kat = (katFilter ? katFilter.value : "");

        var gefiltert = artikel.filter(function (a) {
            if (kat && a.kategorie !== kat) return false;
            if (suche) {
                var text = (a.titel + " " + a.tags + " " + a.inhalt).toLowerCase();
                if (text.indexOf(suche) === -1) return false;
            }
            return true;
        });

        if (gefiltert.length === 0) {
            liste.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Keine Artikel gefunden.</p>';
            return;
        }

        liste.innerHTML = "";
        gefiltert.forEach(function (a) {
            var farbe = KAT_FARBEN[a.kategorie] || "#64748b";
            var katLabel = KAT_LABELS[a.kategorie] || a.kategorie;
            var div = document.createElement("div");
            div.style.cssText = "border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:0.75rem;background:var(--card);";
            div.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem">' +
                    '<div><strong style="font-size:0.95rem">' + escapeHtml(a.titel) + '</strong>' +
                    '<div style="margin-top:0.3rem"><span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.75rem;color:#fff;background:' + farbe + '">' + escapeHtml(katLabel) + '</span>' +
                    (a.tags ? ' <span style="font-size:0.75rem;color:var(--text-muted)">' + escapeHtml(a.tags) + '</span>' : '') +
                    '</div></div>' +
                    '<div style="display:flex;gap:0.3rem">' +
                        '<button type="button" onclick="kbBearbeiten(\'' + a.id + '\')" style="padding:0.3rem 0.6rem;border-radius:4px;background:var(--primary);color:#fff;border:none;font-size:0.75rem;cursor:pointer"><i class="fa-solid fa-pen"></i></button>' +
                        '<button type="button" onclick="kbLoeschen(\'' + a.id + '\')" style="padding:0.3rem 0.6rem;border-radius:4px;background:var(--danger);color:#fff;border:none;font-size:0.75rem;cursor:pointer"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>' +
                '</div>' +
                '<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;margin-bottom:0.5rem">' + escapeHtml(a.inhalt).substring(0, 200) + (a.inhalt.length > 200 ? '...' : '') + '</p>' +
                (a.botAntwort ? '<div style="background:var(--bg);padding:0.5rem 0.75rem;border-radius:6px;font-size:0.8rem;border-left:3px solid var(--primary)"><i class="fa-solid fa-robot" style="color:var(--primary)"></i> <strong>Bot:</strong> ' + escapeHtml(a.botAntwort).substring(0, 120) + '</div>' : '') +
                '<div style="display:flex;gap:1rem;margin-top:0.5rem;font-size:0.75rem;color:var(--text-muted)">' +
                    '<span><i class="fa-solid fa-eye"></i> ' + (a.aufrufe || 0) + ' Aufrufe</span>' +
                    '<span><i class="fa-solid fa-robot"></i> ' + (a.botNutzungen || 0) + ' Bot-Antworten</span>' +
                '</div>';
            liste.appendChild(div);
        });
        statsAktualisieren();
    }

    btnNeu.addEventListener("click", function () {
        editId = null;
        document.getElementById("kb-formular-titel").innerHTML = '<i class="fa-solid fa-pen"></i> Neuen Artikel erstellen';
        formular.reset();
        formBereich.hidden = false;
    });

    btnAbbrechen.addEventListener("click", function () {
        formBereich.hidden = true;
        editId = null;
    });

    formular.addEventListener("submit", function (e) {
        e.preventDefault();
        var artikel = kbLaden();
        var obj = {
            id: editId || "kb" + Date.now(),
            titel: document.getElementById("kb-titel").value.trim(),
            kategorie: document.getElementById("kb-kat").value,
            tags: document.getElementById("kb-tags").value.trim(),
            inhalt: document.getElementById("kb-inhalt").value.trim(),
            botAntwort: document.getElementById("kb-bot-antwort").value.trim(),
            aufrufe: 0,
            botNutzungen: 0,
            erstellt: new Date().toISOString()
        };
        if (editId) {
            for (var i = 0; i < artikel.length; i++) {
                if (artikel[i].id === editId) {
                    obj.aufrufe = artikel[i].aufrufe;
                    obj.botNutzungen = artikel[i].botNutzungen;
                    artikel[i] = obj;
                    break;
                }
            }
        } else {
            artikel.push(obj);
        }
        kbSpeichern(artikel);
        formBereich.hidden = true;
        editId = null;
        artikelAnzeigen();
        var erfolg = document.getElementById("kb-erfolg");
        if (erfolg) {
            erfolg.textContent = "Artikel gespeichert!";
            erfolg.hidden = false;
            setTimeout(function () { erfolg.hidden = true; }, 2000);
        }
    });

    if (suchfeld) suchfeld.addEventListener("input", artikelAnzeigen);
    if (katFilter) katFilter.addEventListener("change", artikelAnzeigen);

    window.kbBearbeiten = function (id) {
        var artikel = kbLaden();
        var a = artikel.find(function (x) { return x.id === id; });
        if (!a) return;
        editId = id;
        document.getElementById("kb-formular-titel").innerHTML = '<i class="fa-solid fa-pen"></i> Artikel bearbeiten';
        document.getElementById("kb-titel").value = a.titel;
        document.getElementById("kb-kat").value = a.kategorie;
        document.getElementById("kb-tags").value = a.tags || "";
        document.getElementById("kb-inhalt").value = a.inhalt;
        document.getElementById("kb-bot-antwort").value = a.botAntwort || "";
        formBereich.hidden = false;
    };

    window.kbLoeschen = function (id) {
        if (!confirm("Artikel wirklich loeschen?")) return;
        var artikel = kbLaden().filter(function (a) { return a.id !== id; });
        kbSpeichern(artikel);
        artikelAnzeigen();
    };

    kbDemoLaden();
    artikelAnzeigen();
}

// ===== Ansagen Generator =====

function initAnsagenGenerator() {
    var formular = document.getElementById("ans-formular");
    var vorlagenContainer = document.getElementById("ans-vorlagen");
    var vorschauBereich = document.getElementById("ans-vorschau-bereich");
    var filterTyp = document.getElementById("ans-filter-typ");
    if (!formular) return;

    function ansLaden() { return dbLaden("ansagen"); }
    function ansSpeichern(d) { dbSpeichern("ansagen", d); }

    var VORLAGEN = {
        begruessung_standard: "Willkommen in der Praxis {praxis_name}. Wie koennen wir Ihnen helfen?",
        warteschleife_standard: "Bitte haben Sie einen Moment Geduld. Ihr Anruf ist uns wichtig und wird in Kuerze entgegengenommen.",
        ab_standard: "Sie haben die Praxis {praxis_name} erreicht. Leider koennen wir Ihren Anruf gerade nicht entgegennehmen. Bitte hinterlassen Sie eine Nachricht nach dem Signalton.",
        oeffnungszeiten_standard: "Unsere Sprechzeiten sind {oeffnungszeiten}. Ausserhalb der Sprechzeiten wenden Sie sich bitte an den aerztlichen Bereitschaftsdienst unter 116117.",
        notfall_standard: "Bei einem medizinischen Notfall rufen Sie bitte umgehend die 112 an. Den aerztlichen Bereitschaftsdienst erreichen Sie unter 116117.",
        ivr_menue: "Willkommen bei {praxis_name}. Fuer einen Termin sagen Sie bitte Termin. Fuer ein Rezept sagen Sie Rezept. Fuer alle anderen Anliegen bleiben Sie bitte in der Leitung.",
        feiertag_standard: "Frohe Feiertage! Unsere Praxis ist am {datum} geschlossen. In dringenden Faellen wenden Sie sich an den aerztlichen Bereitschaftsdienst unter 116117."
    };

    var TYP_LABELS = { begruessung: "Begruessung", warteschleife: "Warteschleife", abwesenheit: "Abwesenheit", oeffnungszeiten: "Oeffnungszeiten", notfall: "Notfall", feiertag: "Feiertag", weiterleitung: "Weiterleitung", ivr_menue: "IVR-Menue" };
    var TYP_ICONS = { begruessung: "fa-hand-wave", warteschleife: "fa-clock", abwesenheit: "fa-voicemail", oeffnungszeiten: "fa-clock", notfall: "fa-triangle-exclamation", feiertag: "fa-tree", weiterleitung: "fa-arrow-right", ivr_menue: "fa-list-ol" };

    function demoDatenLaden() {
        var ansagen = ansLaden();
        if (ansagen.length > 0) return;
        var demo = [
            { id: "ans1", name: "Hauptbegruessung", typ: "begruessung", sprache: "de", stimme: "anna", tempo: "normal", text: "Willkommen in der Praxis Dr. Schmidt. Wie koennen wir Ihnen helfen?", aktiv: true, dauer: 4, erstellt: new Date().toISOString() },
            { id: "ans2", name: "Warteschleife Standard", typ: "warteschleife", sprache: "de", stimme: "sophie", tempo: "langsam", text: "Bitte haben Sie einen Moment Geduld. Ihr Anruf wird in Kuerze entgegengenommen. Sie koennen auch gerne eine Nachricht hinterlassen.", aktiv: true, dauer: 7, erstellt: new Date().toISOString() },
            { id: "ans3", name: "Notfall-Ansage", typ: "notfall", sprache: "de", stimme: "thomas", tempo: "normal", text: "Bei einem Notfall rufen Sie bitte sofort die 112 an. Den aerztlichen Bereitschaftsdienst erreichen Sie unter 116117.", aktiv: true, dauer: 6, erstellt: new Date().toISOString() },
            { id: "ans4", name: "Oeffnungszeiten", typ: "oeffnungszeiten", sprache: "de", stimme: "anna", tempo: "normal", text: "Unsere Sprechzeiten sind Montag bis Freitag 8 bis 12 Uhr und 14 bis 18 Uhr. Mittwochnachmittag geschlossen.", aktiv: true, dauer: 5, erstellt: new Date().toISOString() },
            { id: "ans5", name: "Welcome English", typ: "begruessung", sprache: "en", stimme: "anna", tempo: "normal", text: "Welcome to Dr. Schmidt's practice. How can we help you?", aktiv: false, dauer: 3, erstellt: new Date().toISOString() }
        ];
        ansSpeichern(demo);
    }

    function statsAktualisieren() {
        var ansagen = ansLaden();
        var el = function (id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el("ans-stat-gesamt", ansagen.length);
        el("ans-stat-aktiv", ansagen.filter(function (a) { return a.aktiv; }).length);
    }

    function listeAnzeigen() {
        var container = document.getElementById("ans-liste");
        if (!container) return;
        var ansagen = ansLaden();
        var filter = filterTyp ? filterTyp.value : "";
        if (filter) {
            ansagen = ansagen.filter(function (a) { return a.typ === filter; });
        }

        if (ansagen.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Keine Ansagen vorhanden.</p>';
            return;
        }

        container.innerHTML = "";
        ansagen.forEach(function (a) {
            var icon = TYP_ICONS[a.typ] || "fa-volume-high";
            var typLabel = TYP_LABELS[a.typ] || a.typ;
            var spracheLabel = { de: "Deutsch", en: "English", tr: "Tuerkisch", ar: "Arabisch", ru: "Russisch", fr: "Franzoesisch" }[a.sprache] || a.sprache;
            var div = document.createElement("div");
            div.style.cssText = "border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:0.75rem;background:var(--card);display:flex;align-items:center;gap:1rem;";
            div.innerHTML =
                '<div style="width:40px;height:40px;border-radius:8px;background:' + (a.aktiv ? 'var(--primary)' : 'var(--text-muted)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid ' + icon + '" style="color:#fff"></i></div>' +
                '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">' +
                        '<strong style="font-size:0.9rem">' + escapeHtml(a.name) + '</strong>' +
                        '<span style="padding:0.1rem 0.4rem;border-radius:4px;font-size:0.7rem;background:' + (a.aktiv ? '#dcfce7;color:#15803d' : '#f1f5f9;color:#94a3b8') + '">' + (a.aktiv ? 'Aktiv' : 'Inaktiv') + '</span>' +
                    '</div>' +
                    '<div style="font-size:0.8rem;color:var(--text-muted)">' + escapeHtml(typLabel) + ' · ' + escapeHtml(spracheLabel) + ' · ' + escapeHtml(a.stimme) + ' · ~' + (a.dauer || 0) + 's</div>' +
                    '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(a.text).substring(0, 80) + '...</div>' +
                '</div>' +
                '<div style="display:flex;gap:0.3rem;flex-shrink:0">' +
                    '<button type="button" onclick="ansVorhoeren(\'' + a.id + '\')" style="padding:0.4rem 0.6rem;border-radius:6px;background:var(--info);color:#fff;border:none;font-size:0.75rem;cursor:pointer" title="Vorhoeren"><i class="fa-solid fa-play"></i></button>' +
                    '<button type="button" onclick="ansAktivToggle(\'' + a.id + '\')" style="padding:0.4rem 0.6rem;border-radius:6px;background:' + (a.aktiv ? 'var(--warning)' : 'var(--success)') + ';color:#fff;border:none;font-size:0.75rem;cursor:pointer" title="' + (a.aktiv ? 'Deaktivieren' : 'Aktivieren') + '"><i class="fa-solid ' + (a.aktiv ? 'fa-pause' : 'fa-check') + '"></i></button>' +
                    '<button type="button" onclick="ansLoeschen(\'' + a.id + '\')" style="padding:0.4rem 0.6rem;border-radius:6px;background:var(--danger);color:#fff;border:none;font-size:0.75rem;cursor:pointer" title="Loeschen"><i class="fa-solid fa-trash"></i></button>' +
                '</div>';
            container.appendChild(div);
        });
        statsAktualisieren();
    }

    // Vorlagen-Buttons
    if (vorlagenContainer) {
        vorlagenContainer.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-vorlage]");
            if (!btn) return;
            var key = btn.dataset.vorlage;
            if (VORLAGEN[key]) {
                document.getElementById("ans-text").value = VORLAGEN[key];
            }
        });
    }

    // KI-Text generieren (Demo)
    var btnGen = document.getElementById("btn-ans-generieren");
    if (btnGen) {
        btnGen.addEventListener("click", function () {
            var typ = document.getElementById("ans-typ").value;
            var text = VORLAGEN[typ + "_standard"] || VORLAGEN.begruessung_standard;
            document.getElementById("ans-text").value = text;
        });
    }

    // Vorhoeren (Web Speech API)
    var btnVorhoeren = document.getElementById("btn-ans-vorhoeren");
    if (btnVorhoeren) {
        btnVorhoeren.addEventListener("click", function () {
            var text = document.getElementById("ans-text").value;
            if (!text) return;
            if (typeof speechSynthesis !== "undefined") {
                speechSynthesis.cancel();
                var utt = new SpeechSynthesisUtterance(text);
                utt.lang = document.getElementById("ans-sprache").value === "de" ? "de-DE" : document.getElementById("ans-sprache").value;
                var tempo = document.getElementById("ans-tempo").value;
                utt.rate = tempo === "langsam" ? 0.8 : tempo === "schnell" ? 1.3 : 1.0;
                speechSynthesis.speak(utt);
                vorschauBereich.hidden = false;
                var stimme = document.getElementById("ans-stimme");
                document.getElementById("ans-stimme-label").textContent = stimme.options[stimme.selectedIndex].text;
            }
        });
    }

    // Formular speichern
    formular.addEventListener("submit", function (e) {
        e.preventDefault();
        var ansagen = ansLaden();
        var text = document.getElementById("ans-text").value.trim();
        if (!text) return;
        var obj = {
            id: "ans" + Date.now(),
            name: document.getElementById("ans-name").value.trim() || "Neue Ansage",
            typ: document.getElementById("ans-typ").value,
            sprache: document.getElementById("ans-sprache").value,
            stimme: document.getElementById("ans-stimme").value,
            tempo: document.getElementById("ans-tempo").value,
            text: text,
            aktiv: true,
            dauer: Math.ceil(text.split(/\s+/).length / 2.5),
            erstellt: new Date().toISOString()
        };
        ansagen.push(obj);
        ansSpeichern(ansagen);
        formular.reset();
        vorschauBereich.hidden = true;
        listeAnzeigen();
        var erfolg = document.getElementById("ans-erfolg");
        if (erfolg) {
            erfolg.textContent = "Ansage gespeichert!";
            erfolg.hidden = false;
            setTimeout(function () { erfolg.hidden = true; }, 2000);
        }
    });

    if (filterTyp) filterTyp.addEventListener("change", listeAnzeigen);

    window.ansVorhoeren = function (id) {
        var a = ansLaden().find(function (x) { return x.id === id; });
        if (!a || typeof speechSynthesis === "undefined") return;
        speechSynthesis.cancel();
        var utt = new SpeechSynthesisUtterance(a.text);
        utt.lang = a.sprache === "de" ? "de-DE" : a.sprache;
        utt.rate = a.tempo === "langsam" ? 0.8 : a.tempo === "schnell" ? 1.3 : 1.0;
        speechSynthesis.speak(utt);
    };

    window.ansAktivToggle = function (id) {
        var ansagen = ansLaden();
        for (var i = 0; i < ansagen.length; i++) {
            if (ansagen[i].id === id) {
                ansagen[i].aktiv = !ansagen[i].aktiv;
                break;
            }
        }
        ansSpeichern(ansagen);
        listeAnzeigen();
    };

    window.ansLoeschen = function (id) {
        if (!confirm("Ansage wirklich loeschen?")) return;
        var ansagen = ansLaden().filter(function (a) { return a.id !== id; });
        ansSpeichern(ansagen);
        listeAnzeigen();
    };

    demoDatenLaden();
    listeAnzeigen();
}

// ===== AUSWERTUNGEN & KOSTEN =====

function initAuswertungen() {
    var container = document.getElementById("aw-agenten-body");
    if (!container) return;

    var agenten = dbLaden("agenten");

    // Demo-Daten fuer Anrufstatistik
    var DEMO_STATS = {
        heute:   { anrufe: 47, angenommen: 38, verpasst: 4, voicebot: 5, wartezeit: 8, gespraech: 195 },
        woche:   { anrufe: 312, angenommen: 267, verpasst: 22, voicebot: 23, wartezeit: 11, gespraech: 203 },
        monat:   { anrufe: 1284, angenommen: 1098, verpasst: 87, voicebot: 99, wartezeit: 13, gespraech: 198 },
        quartal: { anrufe: 3847, angenommen: 3302, verpasst: 248, voicebot: 297, wartezeit: 12, gespraech: 201 },
        jahr:    { anrufe: 15392, angenommen: 13187, verpasst: 993, voicebot: 1212, wartezeit: 11, gespraech: 200 }
    };

    // Anrufgruende
    var ANRUF_GRUENDE = [
        { grund: "Terminvergabe", prozent: 34, farbe: "var(--primary)" },
        { grund: "Rezeptbestellung", prozent: 22, farbe: "var(--success)" },
        { grund: "Befundanfrage", prozent: 15, farbe: "var(--warning)" },
        { grund: "Ueberweisung", prozent: 11, farbe: "var(--info)" },
        { grund: "Allg. Auskunft", prozent: 8, farbe: "#7c3aed" },
        { grund: "Notfall/Dringend", prozent: 6, farbe: "var(--danger)" },
        { grund: "Sonstiges", prozent: 4, farbe: "#94a3b8" }
    ];

    // Tageszeit-Erreichbarkeit
    var TAGESZEIT = [
        { zeit: "07:00-08:00", erreich: 95, anrufe: 12 },
        { zeit: "08:00-09:00", erreich: 88, anrufe: 38 },
        { zeit: "09:00-10:00", erreich: 82, anrufe: 52 },
        { zeit: "10:00-11:00", erreich: 79, anrufe: 48 },
        { zeit: "11:00-12:00", erreich: 85, anrufe: 41 },
        { zeit: "12:00-13:00", erreich: 72, anrufe: 22 },
        { zeit: "13:00-14:00", erreich: 68, anrufe: 18 },
        { zeit: "14:00-15:00", erreich: 83, anrufe: 35 },
        { zeit: "15:00-16:00", erreich: 87, anrufe: 28 },
        { zeit: "16:00-17:00", erreich: 91, anrufe: 15 },
        { zeit: "17:00-18:00", erreich: 94, anrufe: 8 }
    ];

    // EVN Demo-Daten
    var EVN_DATEN = [];
    var rufnummern = ["0171-2345678", "030-1234567", "089-9876543", "040-5551234", "0152-8765432", "0163-3456789", "0221-7654321", "069-1112233", "0711-4445566", "0351-8889900"];
    var namen = ["Hr. Weber", "Fr. Mueller", "Hr. Schmidt", "Fr. Klein", "Hr. Braun", "Fr. Fischer", "Hr. Hoffmann", "Fr. Wagner", "Hr. Becker", "Fr. Schulz"];
    var statusOptionen = ["angenommen", "angenommen", "angenommen", "angenommen", "verpasst", "voicebot", "weiterleitung"];
    var agentenNamen = agenten.map(function (a) { return a.name; });
    if (agentenNamen.length === 0) agentenNamen = ["Lisa M.", "Tom R.", "Sarah K.", "Max B."];

    for (var i = 0; i < 50; i++) {
        var d = new Date();
        d.setMinutes(d.getMinutes() - Math.floor(Math.random() * 7 * 24 * 60));
        var status = statusOptionen[Math.floor(Math.random() * statusOptionen.length)];
        var dauer = status === "verpasst" ? 0 : Math.floor(Math.random() * 420 + 15);
        var kosten = status === "voicebot" ? (Math.random() * 0.15 + 0.02).toFixed(2) : (dauer / 60 * 0.039).toFixed(2);
        EVN_DATEN.push({
            datum: d.toISOString().split("T")[0] + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2),
            rufnummer: rufnummern[Math.floor(Math.random() * rufnummern.length)],
            name: namen[Math.floor(Math.random() * namen.length)],
            richtung: Math.random() > 0.15 ? "eingehend" : "ausgehend",
            agent: status === "voicebot" ? "Voicebot" : agentenNamen[Math.floor(Math.random() * agentenNamen.length)],
            dauer: dauer,
            status: status,
            kosten: kosten
        });
    }
    EVN_DATEN.sort(function (a, b) { return b.datum.localeCompare(a.datum); });

    var aktuellerZeitraum = "woche";
    var evnSeite = 0;
    var EVN_PRO_SEITE = 10;

    function kpiAktualisieren() {
        var s = DEMO_STATS[aktuellerZeitraum] || DEMO_STATS.woche;
        setText("aw-anrufe-gesamt", s.anrufe.toLocaleString("de-DE"));
        setText("aw-angenommen", s.angenommen.toLocaleString("de-DE"));
        setText("aw-verpasst", s.verpasst.toLocaleString("de-DE"));
        setText("aw-voicebot", s.voicebot.toLocaleString("de-DE"));
        setText("aw-wartezeit", s.wartezeit + "s");
        setText("aw-gespraechsdauer", Math.floor(s.gespraech / 60) + ":" + ("0" + (s.gespraech % 60)).slice(-2));
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function chartZeichnen() {
        var chartDiv = document.getElementById("aw-chart-anrufe");
        var labelsDiv = document.getElementById("aw-chart-labels");
        if (!chartDiv) return;

        var tage = aktuellerZeitraum === "heute" ? 24 : aktuellerZeitraum === "woche" ? 7 : aktuellerZeitraum === "monat" ? 30 : aktuellerZeitraum === "quartal" ? 12 : 12;
        var labels = [];
        var daten = [];
        var wochentage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
        var monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

        for (var i = 0; i < tage; i++) {
            var ang = Math.floor(Math.random() * 30 + 20);
            var verp = Math.floor(Math.random() * 6);
            var bot = Math.floor(Math.random() * 8 + 2);
            daten.push({ angenommen: ang, verpasst: verp, voicebot: bot });

            if (aktuellerZeitraum === "heute") {
                labels.push((7 + i) + ":00");
            } else if (aktuellerZeitraum === "woche") {
                labels.push(wochentage[i % 7]);
            } else if (aktuellerZeitraum === "monat") {
                labels.push((i + 1) + ".");
            } else {
                labels.push(monate[i % 12]);
            }
        }

        var maxWert = Math.max.apply(null, daten.map(function (d) { return d.angenommen + d.verpasst + d.voicebot; }));
        if (maxWert === 0) maxWert = 1;

        var chartHtml = "";
        var labelsHtml = "";
        var barWidth = Math.max(8, Math.floor(100 / tage) - 1);

        daten.forEach(function (d, idx) {
            var gesamt = d.angenommen + d.verpasst + d.voicebot;
            var hAng = Math.round((d.angenommen / maxWert) * 180);
            var hVerp = Math.round((d.verpasst / maxWert) * 180);
            var hBot = Math.round((d.voicebot / maxWert) * 180);

            chartHtml += '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:1px" title="' + labels[idx] + ': ' + gesamt + ' Anrufe">' +
                '<div style="width:100%;max-width:' + barWidth + 'px;height:' + hBot + 'px;background:var(--info);border-radius:2px 2px 0 0"></div>' +
                '<div style="width:100%;max-width:' + barWidth + 'px;height:' + hVerp + 'px;background:var(--danger)"></div>' +
                '<div style="width:100%;max-width:' + barWidth + 'px;height:' + hAng + 'px;background:var(--primary);border-radius:0 0 2px 2px"></div>' +
                '</div>';
            labelsHtml += '<div style="flex:1;text-align:center">' + labels[idx] + '</div>';
        });

        chartDiv.innerHTML = chartHtml;
        labelsDiv.innerHTML = labelsHtml;
    }

    function agentenPerformance() {
        var body = document.getElementById("aw-agenten-body");
        if (!body) return;
        body.innerHTML = "";

        var liste = agenten.length > 0 ? agenten : [
            { name: "Lisa M." }, { name: "Tom R." }, { name: "Sarah K." }, { name: "Max B." }
        ];

        liste.forEach(function (a) {
            var anrufe = Math.floor(Math.random() * 40 + 10);
            var avgDauer = Math.floor(Math.random() * 200 + 80);
            var erreich = Math.floor(Math.random() * 15 + 85);
            var bewertung = (Math.random() * 1.5 + 3.5).toFixed(1);

            var erreichFarbe = erreich >= 90 ? "var(--success)" : erreich >= 80 ? "var(--warning)" : "var(--danger)";
            var sterne = "";
            for (var s = 1; s <= 5; s++) {
                sterne += '<i class="fa-' + (s <= Math.round(parseFloat(bewertung)) ? "solid" : "regular") + ' fa-star" style="color:' + (s <= Math.round(parseFloat(bewertung)) ? "#f59e0b" : "#d1d5db") + ';font-size:0.75rem"></i>';
            }

            var tr = document.createElement("tr");
            tr.innerHTML = '<td><strong>' + escapeHtml(a.name) + '</strong></td>' +
                '<td>' + anrufe + '</td>' +
                '<td>' + Math.floor(avgDauer / 60) + ':' + ('0' + (avgDauer % 60)).slice(-2) + '</td>' +
                '<td><span style="color:' + erreichFarbe + ';font-weight:700">' + erreich + '%</span></td>' +
                '<td>' + sterne + ' <small>' + bewertung + '</small></td>';
            body.appendChild(tr);
        });
    }

    function kostenAnzeigen() {
        var bereich = document.getElementById("aw-kosten-bereich");
        if (!bereich) return;

        var s = DEMO_STATS[aktuellerZeitraum] || DEMO_STATS.woche;
        var kostenProAnruf = 0.039;
        var kostenBot = 0.05;
        var kostenAgent = 2.80;
        var kostenOhneBot = s.anrufe * kostenAgent;
        var kostenMitBot = (s.anrufe - s.voicebot) * kostenAgent + s.voicebot * kostenBot;
        var ersparnis = kostenOhneBot - kostenMitBot;
        var prozent = Math.round((ersparnis / kostenOhneBot) * 100);

        bereich.innerHTML =
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">' +
            '<div style="background:var(--bg);border-radius:var(--radius);padding:1rem;text-align:center">' +
            '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.25rem">Telefonie-Kosten</div>' +
            '<div style="font-size:1.5rem;font-weight:700;color:var(--text)">' + kostenMitBot.toFixed(2) + ' &euro;</div>' +
            '</div>' +
            '<div style="background:#f0fdf4;border-radius:var(--radius);padding:1rem;text-align:center">' +
            '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.25rem">Ersparnis durch Bot</div>' +
            '<div style="font-size:1.5rem;font-weight:700;color:var(--success)">' + ersparnis.toFixed(2) + ' &euro; <small>(' + prozent + '%)</small></div>' +
            '</div>' +
            '</div>' +

            '<h3 style="font-size:0.9rem;margin-bottom:0.75rem"><i class="fa-solid fa-receipt"></i> Kostenaufschluesselung</h3>' +
            '<table style="width:100%;font-size:0.85rem">' +
            '<tr><td>Agenten-Gespraeche (' + (s.anrufe - s.voicebot) + ' x ' + kostenAgent.toFixed(2) + ' &euro;)</td><td style="text-align:right;font-weight:600">' + ((s.anrufe - s.voicebot) * kostenAgent).toFixed(2) + ' &euro;</td></tr>' +
            '<tr><td>Voicebot-Gespraeche (' + s.voicebot + ' x ' + kostenBot.toFixed(2) + ' &euro;)</td><td style="text-align:right;font-weight:600">' + (s.voicebot * kostenBot).toFixed(2) + ' &euro;</td></tr>' +
            '<tr><td>Telekom-Kosten (geschaetzt)</td><td style="text-align:right;font-weight:600">' + (s.anrufe * kostenProAnruf).toFixed(2) + ' &euro;</td></tr>' +
            '<tr style="border-top:2px solid var(--border);font-weight:700"><td>Gesamt</td><td style="text-align:right">' + (kostenMitBot + s.anrufe * kostenProAnruf).toFixed(2) + ' &euro;</td></tr>' +
            '</table>' +

            '<div style="margin-top:1rem;padding:0.75rem;background:#eff6ff;border-radius:var(--radius);border:1px solid #bfdbfe">' +
            '<div style="font-size:0.8rem;color:#1e40af"><i class="fa-solid fa-lightbulb"></i> <strong>Tipp:</strong> Ohne Voicebot haetten Sie ' + kostenOhneBot.toFixed(2) + ' &euro; gezahlt. Der Bot spart Ihnen <strong>' + prozent + '%</strong> der Personalkosten.</div>' +
            '</div>';
    }

    function anrufgruendeZeichnen() {
        var bereich = document.getElementById("aw-anrufgruende");
        if (!bereich) return;
        var html = "";
        ANRUF_GRUENDE.forEach(function (g) {
            html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem">' +
                '<span style="min-width:120px;font-size:0.85rem;font-weight:600">' + escapeHtml(g.grund) + '</span>' +
                '<div style="flex:1;background:var(--bg);border-radius:4px;height:20px;overflow:hidden;position:relative">' +
                '<div style="width:' + g.prozent + '%;height:100%;background:' + g.farbe + ';border-radius:4px;transition:width 0.5s"></div>' +
                '</div>' +
                '<span style="font-size:0.85rem;font-weight:700;min-width:35px;text-align:right">' + g.prozent + '%</span></div>';
        });
        bereich.innerHTML = html;
    }

    function tageszeitZeichnen() {
        var bereich = document.getElementById("aw-tageszeit");
        if (!bereich) return;
        var html = '<table style="width:100%;font-size:0.85rem"><thead><tr><th>Uhrzeit</th><th>Anrufe</th><th>Erreichbarkeit</th><th></th></tr></thead><tbody>';
        TAGESZEIT.forEach(function (t) {
            var farbe = t.erreich >= 90 ? "var(--success)" : t.erreich >= 80 ? "var(--warning)" : "var(--danger)";
            html += '<tr><td>' + t.zeit + '</td><td>' + t.anrufe + '</td>' +
                '<td style="font-weight:700;color:' + farbe + '">' + t.erreich + '%</td>' +
                '<td style="width:120px"><div style="background:var(--bg);border-radius:4px;height:6px;overflow:hidden"><div style="width:' + t.erreich + '%;height:100%;background:' + farbe + ';border-radius:4px"></div></div></td></tr>';
        });
        html += '</tbody></table>';
        bereich.innerHTML = html;
    }

    function evnAnzeigen() {
        var body = document.getElementById("aw-evn-body");
        var paging = document.getElementById("aw-evn-paging");
        if (!body) return;

        var suche = (document.getElementById("aw-evn-suche") || {}).value || "";
        var filter = (document.getElementById("aw-evn-filter") || {}).value || "";

        var gefiltert = EVN_DATEN.filter(function (e) {
            if (filter && e.status !== filter) return false;
            if (suche) {
                var s = suche.toLowerCase();
                return e.rufnummer.indexOf(s) !== -1 || e.name.toLowerCase().indexOf(s) !== -1 || e.agent.toLowerCase().indexOf(s) !== -1;
            }
            return true;
        });

        var start = evnSeite * EVN_PRO_SEITE;
        var seite = gefiltert.slice(start, start + EVN_PRO_SEITE);

        body.innerHTML = "";
        seite.forEach(function (e) {
            var statusBadge = {
                angenommen: "status-bestaetigt",
                verpasst: "status-abgesagt",
                voicebot: "status-geplant",
                weiterleitung: "status-geplant"
            };
            var richtungIcon = e.richtung === "eingehend" ? '<i class="fa-solid fa-arrow-down" style="color:var(--success)"></i>' : '<i class="fa-solid fa-arrow-up" style="color:var(--primary)"></i>';
            var tr = document.createElement("tr");
            tr.innerHTML = '<td>' + escapeHtml(e.datum) + '</td>' +
                '<td>' + escapeHtml(e.rufnummer) + '<br><small style="color:var(--text-muted)">' + escapeHtml(e.name) + '</small></td>' +
                '<td>' + richtungIcon + ' ' + escapeHtml(e.richtung) + '</td>' +
                '<td>' + escapeHtml(e.agent) + '</td>' +
                '<td>' + (e.dauer > 0 ? Math.floor(e.dauer / 60) + ':' + ('0' + (e.dauer % 60)).slice(-2) : '-') + '</td>' +
                '<td><span class="status-badge ' + (statusBadge[e.status] || "") + '">' + escapeHtml(e.status) + '</span></td>' +
                '<td>' + e.kosten + ' &euro;</td>';
            body.appendChild(tr);
        });

        if (paging) {
            var gesamtSeiten = Math.ceil(gefiltert.length / EVN_PRO_SEITE);
            paging.innerHTML = '<span>' + gefiltert.length + ' Eintraege (Seite ' + (evnSeite + 1) + '/' + Math.max(1, gesamtSeiten) + ')</span>' +
                '<div style="display:flex;gap:0.5rem">' +
                '<button type="button" id="aw-evn-zurueck" style="padding:0.3rem 0.7rem;font-size:0.8rem" ' + (evnSeite === 0 ? 'disabled' : '') + '><i class="fa-solid fa-chevron-left"></i></button>' +
                '<button type="button" id="aw-evn-vor" style="padding:0.3rem 0.7rem;font-size:0.8rem" ' + (evnSeite >= gesamtSeiten - 1 ? 'disabled' : '') + '><i class="fa-solid fa-chevron-right"></i></button></div>';

            var btnZ = document.getElementById("aw-evn-zurueck");
            var btnV = document.getElementById("aw-evn-vor");
            if (btnZ) btnZ.addEventListener("click", function () { if (evnSeite > 0) { evnSeite--; evnAnzeigen(); } });
            if (btnV) btnV.addEventListener("click", function () { evnSeite++; evnAnzeigen(); });
        }
    }

    function allesAktualisieren() {
        kpiAktualisieren();
        chartZeichnen();
        agentenPerformance();
        kostenAnzeigen();
        anrufgruendeZeichnen();
        tageszeitZeichnen();
        evnSeite = 0;
        evnAnzeigen();
    }

    // Event Listener
    var zeitraumSel = document.getElementById("aw-zeitraum");
    if (zeitraumSel) {
        zeitraumSel.addEventListener("change", function () {
            aktuellerZeitraum = this.value;
            allesAktualisieren();
        });
    }

    var btnAkt = document.getElementById("btn-aw-aktualisieren");
    if (btnAkt) btnAkt.addEventListener("click", allesAktualisieren);

    var btnExport = document.getElementById("btn-aw-export");
    if (btnExport) {
        btnExport.addEventListener("click", function () {
            var csv = "Datum;Rufnummer;Name;Richtung;Agent;Dauer (s);Status;Kosten\n";
            EVN_DATEN.forEach(function (e) {
                csv += e.datum + ";" + e.rufnummer + ";" + e.name + ";" + e.richtung + ";" + e.agent + ";" + e.dauer + ";" + e.status + ";" + e.kosten + "\n";
            });
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "auswertung_" + aktuellerZeitraum + ".csv";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    var evnSuche = document.getElementById("aw-evn-suche");
    var evnFilter = document.getElementById("aw-evn-filter");
    if (evnSuche) evnSuche.addEventListener("input", function () { evnSeite = 0; evnAnzeigen(); });
    if (evnFilter) evnFilter.addEventListener("change", function () { evnSeite = 0; evnAnzeigen(); });

    // Initialisieren
    allesAktualisieren();
}

// ===== AI Agent Engineering =====

var aiAgents = [];

function initAiAgentEngineering() {
    var container = document.getElementById("ai-agent");
    if (!container) return;

    // Tab-Navigation
    var tabs = container.querySelectorAll(".ai-tab");
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("active"); });
            container.querySelectorAll(".ai-tab-content").forEach(function (c) { c.classList.remove("active"); });
            tab.classList.add("active");
            var target = document.getElementById("tab-" + tab.getAttribute("data-tab"));
            if (target) target.classList.add("active");
        });
    });

    // Stimmen laden
    aiStimmenLaden();

    // Temperatur-Slider
    var tempSlider = document.getElementById("ab-temperatur");
    var tempWert = document.getElementById("ab-temp-wert");
    if (tempSlider && tempWert) {
        tempSlider.addEventListener("input", function () {
            tempWert.textContent = tempSlider.value;
        });
    }

    // Agent Builder Form
    var builderForm = document.getElementById("agent-builder-form");
    if (builderForm) {
        builderForm.addEventListener("submit", function (e) {
            e.preventDefault();
            aiAgentSpeichern();
        });
    }

    // Test-Button
    var testBtn = document.getElementById("ab-testen");
    if (testBtn) {
        testBtn.addEventListener("click", function () {
            // Zu Prompt-Tab wechseln und Chat oeffnen
            tabs.forEach(function (t) { t.classList.remove("active"); });
            container.querySelectorAll(".ai-tab-content").forEach(function (c) { c.classList.remove("active"); });
            var promptTab = container.querySelector('[data-tab="prompts"]');
            if (promptTab) promptTab.classList.add("active");
            var promptContent = document.getElementById("tab-prompts");
            if (promptContent) promptContent.classList.add("active");
            document.getElementById("pe-chat-input").focus();
        });
    }

    // Prompt Engineering: Speichern
    var peSpeichern = document.getElementById("pe-speichern");
    if (peSpeichern) {
        peSpeichern.addEventListener("click", aiPromptSpeichern);
    }

    // Prompt Engineering: Zuruecksetzen
    var peZurueck = document.getElementById("pe-zuruecksetzen");
    if (peZurueck) {
        peZurueck.addEventListener("click", function () {
            document.getElementById("pe-system-prompt").value = "Du bist eine freundliche Telefonistin in einer Arztpraxis. Antworte kurz, natuerlich und hilfsbereit. Sprich den Anrufer mit Sie an. Sei professionell aber warm.";
            document.getElementById("pe-regeln").value = "WICHTIG fuer dein Verhalten am Telefon:\n- Antworte KURZ (1-3 Saetze). Kein Anrufer will lange Monologe.\n- Benutze natuerliche Fuellwoerter: 'Ach so', 'Alles klar', 'Moment'.\n- Stelle eine Frage pro Antwort, nicht mehrere.\n- Wenn du etwas nicht verstehst, frag hoeflich nach.\n- Nenne NIE technische Details (API, Datenbank, etc.).\n- Sprich wie eine echte Person, nicht wie ein Computer.";
            aiErfolg("pe-erfolg", "Standard-Prompt wiederhergestellt");
        });
    }

    // Test-Chat senden
    var chatSenden = document.getElementById("pe-chat-senden");
    var chatInput = document.getElementById("pe-chat-input");
    if (chatSenden && chatInput) {
        chatSenden.addEventListener("click", function () { aiTestChatSenden(); });
        chatInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") aiTestChatSenden();
        });
    }

    // Chat leeren
    var chatLeeren = document.getElementById("pe-chat-leeren");
    if (chatLeeren) {
        chatLeeren.addEventListener("click", function () {
            var verlauf = document.getElementById("pe-chat-verlauf");
            if (verlauf) verlauf.innerHTML = "";
            aiTestVerlauf = [];
        });
    }

    // Daten laden
    aiAgentsLaden();
    aiVorlagenAnzeigen();
    aiMonitoringLaden();
    aiSystemStatusPruefen();
}

async function aiStimmenLaden() {
    var select = document.getElementById("ab-stimme");
    if (!select) return;
    try {
        var res = await fetch(API_BASE + "/voicebot/stimmen");
        var stimmen = await res.json();
        select.innerHTML = "";
        stimmen.forEach(function (s) {
            var opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name + " (" + s.geschlecht + ") — " + s.beschreibung;
            select.appendChild(opt);
        });
    } catch (_) { console.warn("Stimmen laden:", _); }
}

function aiAgentSpeichern() {
    var agent = {
        id: Date.now(),
        name: document.getElementById("ab-name").value,
        branche: document.getElementById("ab-branche").value,
        stimme: document.getElementById("ab-stimme").value,
        hintergrund: document.getElementById("ab-hintergrund").value,
        persoenlichkeit: document.getElementById("ab-persoenlichkeit").value,
        begruessung: document.getElementById("ab-begruessung").value,
        regeln: document.getElementById("ab-regeln").value,
        llm_model: document.getElementById("ab-llm-model").value,
        temperatur: parseFloat(document.getElementById("ab-temperatur").value),
        skills: {
            termine: document.getElementById("ab-skill-termine").checked,
            rezept: document.getElementById("ab-skill-rezept").checked,
            weiterleitung: document.getElementById("ab-skill-weiterleitung").checked,
            kb: document.getElementById("ab-skill-kb").checked,
            rueckruf: document.getElementById("ab-skill-rueckruf").checked,
            notfall: document.getElementById("ab-skill-notfall").checked,
        },
        status: "aktiv",
        erstellt: new Date().toISOString(),
    };

    // In localStorage speichern (Demo) oder API
    var agents = JSON.parse(localStorage.getItem("ai_agents") || "[]");
    agents.push(agent);
    localStorage.setItem("ai_agents", JSON.stringify(agents));

    // Auch als Backend-Config speichern versuchen
    aiAgentZumBackendSenden(agent);

    aiErfolg("ab-erfolg", "AI-Agent '" + escapeHtml(agent.name) + "' gespeichert!");
    document.getElementById("agent-builder-form").reset();
    document.getElementById("ab-temp-wert").textContent = "0.7";
    aiAgentsLaden();
}

async function aiAgentZumBackendSenden(agent) {
    try {
        await fetch(API_BASE + "/einstellungen/ai_agent_" + agent.id + "?wert=" + encodeURIComponent(JSON.stringify(agent)) + "&kategorie=ai_agent", { method: "PUT" });
    } catch (_) { console.warn("Agent Backend-Sync:", _); }
}

function aiAgentsLaden() {
    var agents = JSON.parse(localStorage.getItem("ai_agents") || "[]");
    aiAgents = agents;

    var tbody = document.querySelector("#ai-agents-tabelle tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var peSelect = document.getElementById("pe-agent-select");
    if (peSelect) {
        peSelect.innerHTML = '<option value="">— Agent waehlen —</option>';
    }

    agents.forEach(function (a, idx) {
        var tr = document.createElement("tr");
        var brancheLabel = BRANCHEN[a.branche] ? BRANCHEN[a.branche].label : a.branche;
        tr.innerHTML =
            "<td>" + escapeHtml(a.name) + "</td>" +
            "<td>" + escapeHtml(brancheLabel) + "</td>" +
            "<td>" + escapeHtml(a.stimme) + "</td>" +
            "<td>" + escapeHtml(a.llm_model || "Standard") + "</td>" +
            '<td><span class="badge badge-gruen">' + escapeHtml(a.status) + "</span></td>" +
            '<td><button class="btn-text ai-agent-loeschen" data-idx="' + idx + '"><i class="fa-solid fa-trash"></i></button>' +
            ' <button class="btn-text ai-agent-bearbeiten" data-idx="' + idx + '"><i class="fa-solid fa-pen"></i></button></td>';
        tbody.appendChild(tr);

        if (peSelect) {
            var opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = a.name;
            peSelect.appendChild(opt);
        }
    });

    // Loeschen-Handler
    tbody.querySelectorAll(".ai-agent-loeschen").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var i = parseInt(btn.getAttribute("data-idx"));
            agents.splice(i, 1);
            localStorage.setItem("ai_agents", JSON.stringify(agents));
            aiAgentsLaden();
        });
    });

    // Bearbeiten -> Prompt-Tab fuellen
    tbody.querySelectorAll(".ai-agent-bearbeiten").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var i = parseInt(btn.getAttribute("data-idx"));
            var a = agents[i];
            if (!a) return;
            var pePrompt = document.getElementById("pe-system-prompt");
            var peKontext = document.getElementById("pe-kontext");
            var peRegeln = document.getElementById("pe-regeln");
            if (pePrompt) pePrompt.value = a.persoenlichkeit || "";
            if (peKontext) peKontext.value = "Branche: " + (BRANCHEN[a.branche] ? BRANCHEN[a.branche].label : a.branche) + "\nBegruessung: " + (a.begruessung || "");
            if (peRegeln) peRegeln.value = a.regeln || "";
            // Tab wechseln
            document.querySelectorAll(".ai-tab").forEach(function (t) { t.classList.remove("active"); });
            document.querySelectorAll(".ai-tab-content").forEach(function (c) { c.classList.remove("active"); });
            document.querySelector('[data-tab="prompts"]').classList.add("active");
            document.getElementById("tab-prompts").classList.add("active");
        });
    });
}

function aiPromptSpeichern() {
    var prompt = document.getElementById("pe-system-prompt").value;
    var kontext = document.getElementById("pe-kontext").value;
    var regeln = document.getElementById("pe-regeln").value;

    localStorage.setItem("ai_custom_prompt", JSON.stringify({ prompt: prompt, kontext: kontext, regeln: regeln }));
    aiErfolg("pe-erfolg", "Prompt gespeichert!");
}

var aiTestVerlauf = [];

async function aiTestChatSenden() {
    var input = document.getElementById("pe-chat-input");
    var verlauf = document.getElementById("pe-chat-verlauf");
    if (!input || !verlauf || !input.value.trim()) return;

    var text = input.value.trim();
    input.value = "";

    // Anrufer-Nachricht anzeigen
    verlauf.innerHTML += '<div class="ai-chat-msg anrufer"><div class="ai-chat-bubble">' + escapeHtml(text) + '</div></div>';
    aiTestVerlauf.push({ rolle: "anrufer", text: text });
    verlauf.scrollTop = verlauf.scrollHeight;

    // An LLM senden
    var tokenEl = document.getElementById("pe-chat-tokens");
    var latenzEl = document.getElementById("pe-chat-latenz");
    var startTime = Date.now();

    try {
        var systemPrompt = (document.getElementById("pe-system-prompt").value || "") +
            "\n\n" + (document.getElementById("pe-kontext").value || "") +
            "\n\n" + (document.getElementById("pe-regeln").value || "");

        var messages = [{ role: "system", content: systemPrompt }];
        aiTestVerlauf.forEach(function (m) {
            messages.push({ role: m.rolle === "anrufer" ? "user" : "assistant", content: m.text });
        });

        var res = await fetch(API_BASE + "/ai-agent/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages }),
        });

        var daten = await res.json();
        var latenz = Date.now() - startTime;

        var antwort = daten.antwort || daten.text || "Keine Antwort erhalten.";
        aiTestVerlauf.push({ rolle: "bot", text: antwort });

        verlauf.innerHTML += '<div class="ai-chat-msg bot"><div class="ai-chat-bubble">' + escapeHtml(antwort) + '</div></div>';
        verlauf.scrollTop = verlauf.scrollHeight;

        if (latenzEl) latenzEl.textContent = "Latenz: " + latenz + " ms";
        if (tokenEl) tokenEl.textContent = "Tokens: ~" + (antwort.split(" ").length * 2);
    } catch (err) {
        console.warn("AI Chat Fehler:", err);
        verlauf.innerHTML += '<div class="ai-chat-msg bot"><div class="ai-chat-bubble">Fehler: LLM nicht erreichbar. Im Demo-Modus ist der Test-Chat nicht verfuegbar.</div></div>';
        verlauf.scrollTop = verlauf.scrollHeight;
    }
}

function aiVorlagenAnzeigen() {
    var container = document.getElementById("pe-vorlagen");
    if (!container) return;

    var vorlagen = [
        { name: "Arztpraxis Standard", desc: "Freundliche Rezeptionistin, Terminvergabe, Rezeptbestellung", prompt: "Du bist eine freundliche Telefonistin in einer Arztpraxis. Antworte kurz, natuerlich und hilfsbereit. Sprich den Anrufer mit Sie an.", regeln: "- Antworte KURZ (1-3 Saetze)\n- Stelle eine Frage pro Antwort\n- Bei Notfaellen: 112 empfehlen" },
        { name: "Kanzlei formell", desc: "Formeller Ton, Mandantenannahme, Terminvereinbarung", prompt: "Du bist die Sekretaerin einer Rechtsanwaltskanzlei. Sprich formell und praezise. Notiere Anliegen und biete Rueckruf an.", regeln: "- Keine Rechtsberatung erteilen\n- Immer Rueckrufnummer fragen\n- Dringlichkeit erfassen" },
        { name: "Werkstatt locker", desc: "Lockerer Umgangston, KFZ-Terminvergabe", prompt: "Du bist der Annahme-Mitarbeiter einer KFZ-Werkstatt. Sprich freundlich und unkompliziert. Duzen ist OK wenn der Kunde duzt.", regeln: "- Fahrzeug und Kennzeichen fragen\n- Terminvorschlag machen\n- Bei Pannen: ADAC empfehlen" },
        { name: "Minimal (nur weiterleiten)", desc: "Nimmt nur Name und Anliegen auf, leitet weiter", prompt: "Du bist eine automatische Telefonzentrale. Nimm den Namen und das Anliegen des Anrufers auf und sage, dass du einen Mitarbeiter verbindest.", regeln: "- Maximal 2 Fragen\n- Nie inhaltlich antworten\n- Immer weiterleiten" },
    ];

    container.innerHTML = "";
    vorlagen.forEach(function (v) {
        var card = document.createElement("div");
        card.className = "ai-vorlage-card";
        card.innerHTML = '<h4><i class="fa-solid fa-file-lines"></i> ' + escapeHtml(v.name) + '</h4><p>' + escapeHtml(v.desc) + '</p>';
        card.addEventListener("click", function () {
            document.getElementById("pe-system-prompt").value = v.prompt;
            document.getElementById("pe-regeln").value = v.regeln;
            aiErfolg("pe-erfolg", "Vorlage '" + v.name + "' geladen");
        });
        container.appendChild(card);
    });
}

async function aiMonitoringLaden() {
    try {
        var res = await fetch(API_BASE + "/dashboard");
        var d = await res.json();
        var el = document.getElementById("mon-gespraeche");
        if (el) el.textContent = d.anrufe_heute || 0;
    } catch (_) { console.warn("Monitoring laden:", _); }
}

async function aiSystemStatusPruefen() {
    try {
        var res = await fetch(API_BASE + "/system/status");
        var d = await res.json();

        var llmDot = document.getElementById("mon-llm-dot");
        var sttDot = document.getElementById("mon-stt-dot");
        var ttsDot = document.getElementById("mon-tts-dot");
        var llmInfo = document.getElementById("mon-llm-info");
        var sttInfo = document.getElementById("mon-stt-info");
        var ttsInfo = document.getElementById("mon-tts-info");

        if (llmDot) llmDot.classList.add("online");
        if (sttDot) sttDot.classList.add("online");
        if (ttsDot) ttsDot.classList.add("online");
        if (llmInfo) llmInfo.textContent = d.llm || "—";
        if (sttInfo) sttInfo.textContent = d.stt || "—";
        if (ttsInfo) ttsInfo.textContent = d.tts || "—";
    } catch (_) {
        console.warn("System-Status:", _);
    }
}

function aiErfolg(elementId, text) {
    var el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
        el.hidden = false;
        setTimeout(function () { el.hidden = true; }, 3000);
    }
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
        // Guard: Auth-Check auf allen Seiten ausser guard.html
        var istGuardSeite = window.location.pathname.indexOf("guard.html") !== -1;
        if (!istGuardSeite) {
            var auth = guardPruefen();
            if (!auth) return; // Redirect zur Guard-Seite
            guardInfoAnzeigen();
        }

        brancheLaden();
        brancheAnwenden();
        modusPruefen();
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
        initStandortSeite();
        initWissensdatenbank();
        initAnsagenGenerator();
        initAuswertungen();
        initAiAgentEngineering();
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
