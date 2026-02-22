#!/usr/bin/env python3
"""
Build MedReception SPA - Extrahiert Content aus allen HTML-Seiten
und baut eine einzige klickbare Single-Page-App.
"""
import re, os

DOCS = "docs"

# Seiten-Definitionen: (dateiname, page_id, icon, label, rollen)
PAGES = [
    ("index.html",              "dashboard",        "fa-chart-pie",         "Dashboard",            ["admin","teamleitung","standortleitung","agent"]),
    ("patienten.html",          "patienten",        "fa-users",             "Patienten",            ["admin","teamleitung","standortleitung"]),
    ("aerzte.html",             "aerzte",           "fa-user-doctor",       "Aerzte",               ["admin","teamleitung","standortleitung"]),
    ("termine.html",            "termine",          "fa-calendar-days",     "Termine",              ["admin","teamleitung","standortleitung","agent"]),
    ("wartezimmer.html",        "wartezimmer",      "fa-couch",             "Wartezimmer",          ["admin","teamleitung","standortleitung","agent"]),
    ("wissensdatenbank.html",   "wissensdatenbank", "fa-book",              "Wissensdatenbank",     ["admin","teamleitung","standortleitung","agent"]),
    ("ansagen.html",            "ansagen",          "fa-tower-broadcast",   "Ansagen Generator",    ["admin","teamleitung"]),
    ("standort.html",           "standort",         "fa-building",          "Standort &amp; ACD",   ["admin","teamleitung","standortleitung"]),
    ("callflow.html",           "callflow",         "fa-diagram-project",   "Callflow Editor",      ["admin","teamleitung"]),
    ("voicebot.html",           "voicebot",         "fa-robot",             "Voicebot",             ["admin","teamleitung"]),
    ("agenten.html",            "agenten",          "fa-headset",           "Agenten",              ["admin","teamleitung"]),
    ("softphone.html",          "softphone",        "fa-phone",             "Softphone",            ["admin","teamleitung","standortleitung","agent"]),
    ("uebersetzung.html",       "uebersetzung",     "fa-language",          "Uebersetzer",          ["admin","teamleitung","standortleitung","agent"]),
    ("benutzer.html",           "benutzer",         "fa-user-gear",         "Benutzer",             ["admin"]),
]

def extract_main(filepath):
    """Extrahiere Inhalt zwischen <main> und </main>"""
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()
    # Try <main id="..."> or <main>
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)
    if m:
        return m.group(1).strip()
    return "<!-- Kein Content gefunden -->"

def extract_title(filepath):
    """Extrahiere H1-Titel"""
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    if m:
        return m.group(1).strip()
    return ""

def read_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()

def build():
    # CSS + JS laden
    css = read_file(os.path.join(DOCS, "style.css"))
    js = read_file(os.path.join(DOCS, "app.js"))

    # Guard-Seite extrahieren
    guard_html = read_file(os.path.join(DOCS, "guard.html"))
    guard_body = re.search(r'<body[^>]*>(.*?)</body>', guard_html, re.DOTALL)
    guard_content = guard_body.group(1).strip() if guard_body else ""
    # Entferne das <script src="app.js"> aus guard content
    guard_content = re.sub(r'<script\s+src="app\.js"[^>]*></script>', '', guard_content)

    # Seiten-Content extrahieren
    pages_content = {}
    pages_titles = {}
    for filename, page_id, icon, label, rollen in PAGES:
        filepath = os.path.join(DOCS, filename)
        if os.path.exists(filepath):
            content = extract_main(filepath)
            # Dashboard ist dynamisch - lasse es so
            if page_id == "dashboard":
                content = '<div id="dashboard">' + content + '</div>'
            pages_content[page_id] = content
            pages_titles[page_id] = extract_title(filepath)

    # Navigation generieren
    def nav_items(rolle):
        items = []
        for filename, page_id, icon, label, rollen in PAGES:
            if rolle in rollen:
                items.append(f'<a href="#" class="spa-nav-link" data-page="{page_id}"><i class="fa-solid {icon} nav-icon"></i> {label}</a>')
        return "\n            ".join(items)

    # SPA HTML zusammenbauen
    spa = f'''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MED Rezeption - Komplette Demo</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
{css}

/* ===== SPA Styles ===== */
.spa-page {{ display: none; }}
.spa-page.active {{ display: block; }}
.spa-nav-link.active {{
    background: var(--primary) !important;
    color: #fff !important;
}}
#spa-guard {{
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--sidebar-bg);
}}
#spa-guard.hidden {{ display: none; }}
.spa-rolle-select {{
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    font-size: 0.85rem;
    margin: 0.5rem 0;
}}
    </style>
</head>
<body>

<!-- ===== GUARD/LOGIN OVERLAY ===== -->
<div id="spa-guard">
{guard_content}
</div>

<!-- ===== MAIN APP ===== -->
<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo"><h2>MED Rezeption</h2><small>Praxisverwaltung</small></div>
    <div style="padding:0 0.75rem">
        <label style="font-size:0.7rem;color:var(--sidebar-text);text-transform:uppercase;letter-spacing:1px">Rolle</label>
        <select class="spa-rolle-select" id="spa-rolle-select" onchange="spaRolleWechseln(this.value)">
            <option value="admin">Admin</option>
            <option value="teamleitung">Teamleiter</option>
            <option value="standortleitung">Standortleitung</option>
            <option value="agent">Agent</option>
        </select>
    </div>
    <nav class="sidebar-nav" id="spa-nav">
        {nav_items("admin")}
    </nav>
    <div class="sidebar-footer"><button id="btn-demo-reset" type="button">Demo zuruecksetzen</button></div>
</aside>
<div class="main-wrapper">
    <header class="topbar">
        <button id="menu-toggle" type="button"><i class="fa-solid fa-bars"></i></button>
        <h1 id="spa-page-title">Dashboard</h1>
        <div class="topbar-right" id="guard-info-bereich">Demo-Modus</div>
    </header>
    <main>
'''

    # Alle Seiten als hidden divs einbauen
    for filename, page_id, icon, label, rollen in PAGES:
        content = pages_content.get(page_id, "")
        active = ' active' if page_id == "dashboard" else ''
        spa += f'        <div class="spa-page{active}" id="spa-{page_id}" data-title="{label}">\n'
        spa += f'            {content}\n'
        spa += f'        </div>\n\n'

    spa += '''    </main>
</div>

<!-- Chat Widget -->
<button id="chat-toggle" type="button"><i class="fa-solid fa-comment-dots"></i></button>
<div id="chat-fenster">
    <div class="chat-header"><span><i class="fa-solid fa-robot"></i> Praxis-Assistent</span><button id="chat-schliessen" type="button"><i class="fa-solid fa-xmark"></i></button></div>
    <div id="chat-nachrichten"></div>
    <div class="chat-eingabe">
        <input id="chat-input" type="text" placeholder="Frage stellen oder sprechen...">
        <button id="chat-mikrofon" type="button" title="Sprechen"><i class="fa-solid fa-microphone"></i></button>
        <button id="chat-senden" type="button"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
</div>

<script>
'''
    spa += js

    # SPA-Navigation und Rollen-Logik
    spa += '''

// ===== SPA Navigation =====
var SPA_PAGES = ''' + str({p[1]: {"icon": p[2], "label": p[3], "rollen": p[4]} for p in PAGES}).replace("'", '"') + ''';

function spaNavigieren(pageId) {
    document.querySelectorAll(".spa-page").forEach(function (p) { p.classList.remove("active"); });
    var page = document.getElementById("spa-" + pageId);
    if (page) page.classList.add("active");

    document.querySelectorAll(".spa-nav-link").forEach(function (l) { l.classList.remove("active"); });
    document.querySelectorAll('.spa-nav-link[data-page="' + pageId + '"]').forEach(function (l) { l.classList.add("active"); });

    var titel = document.getElementById("spa-page-title");
    if (titel && page) titel.textContent = page.dataset.title || pageId;
}

function spaRolleWechseln(rolle) {
    var nav = document.getElementById("spa-nav");
    if (!nav) return;
    nav.innerHTML = "";
    Object.keys(SPA_PAGES).forEach(function (id) {
        var p = SPA_PAGES[id];
        if (p.rollen.indexOf(rolle) !== -1) {
            var a = document.createElement("a");
            a.href = "#";
            a.className = "spa-nav-link";
            a.dataset.page = id;
            a.innerHTML = '<i class="fa-solid ' + p.icon + ' nav-icon"></i> ' + p.label;
            a.addEventListener("click", function (e) { e.preventDefault(); spaNavigieren(id); });
            nav.appendChild(a);
        }
    });
    // Erste sichtbare Seite aktivieren
    var ersteSeite = Object.keys(SPA_PAGES).find(function (id) { return SPA_PAGES[id].rollen.indexOf(rolle) !== -1; });
    if (ersteSeite) spaNavigieren(ersteSeite);
}

// Nav-Links Event Listener
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".spa-nav-link").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            spaNavigieren(this.dataset.page);
        });
    });

    // Guard ausblenden wenn auth vorhanden
    var guard = document.getElementById("spa-guard");
    var auth = sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth");
    if (auth && guard) {
        guard.classList.add("hidden");
    }

    // Original guardPruefen ueberschreiben damit es nicht redirected
    if (typeof window.guardPruefen === "function") {
        var origGuard = window.guardPruefen;
        window.guardPruefen = function () {
            var a = sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth");
            if (!a) {
                var g = document.getElementById("spa-guard");
                if (g) g.classList.remove("hidden");
                return null;
            }
            return JSON.parse(a);
        };
    }

    // Erste Seite aktiv markieren
    var ersterLink = document.querySelector(".spa-nav-link");
    if (ersterLink) ersterLink.classList.add("active");
});

// Guard Login-Erfolg abfangen - statt redirect, guard ausblenden
var origGuardLogin = window.guardLoginHandler;
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
        var form = document.getElementById("guard-login-form");
        if (form) {
            form.addEventListener("submit", function (e) {
                // Nach kurzem Delay pruefen ob auth gesetzt
                setTimeout(function () {
                    var auth = sessionStorage.getItem("med_guard_auth") || localStorage.getItem("med_guard_auth");
                    if (auth) {
                        var guard = document.getElementById("spa-guard");
                        if (guard) guard.classList.add("hidden");
                        // Seite neu initialisieren
                        if (typeof initDashboard === "function") initDashboard();
                    }
                }, 500);
            });
        }
    });
}
</script>
</body>
</html>
'''

    # Schreibe SPA
    output = os.path.join(DOCS, "spa.html")
    with open(output, "w", encoding="utf-8") as f:
        f.write(spa)

    size = os.path.getsize(output)
    print(f"SPA erstellt: {output} ({size:,} Bytes)")
    print(f"Seiten: {len(pages_content)}")

if __name__ == "__main__":
    build()
