#!/usr/bin/env python3
"""
Deploy fehlende Seiten von src/html nach docs/ mit einheitlicher Sidebar.
Aktualisiert auch bestehende Seiten in docs/ (Sidebar-Update).
"""
import re
import os

SRC = "src/html"
DOCS = "docs"

# Einheitliche Sidebar-Struktur (nav-groups)
SIDEBAR_NAV = """
            <div class="nav-group">Uebersicht</div>
            <a href="admin-dashboard.html"{active_admin_dashboard}><i class="fa-solid fa-gauge nav-icon"></i> Dashboard</a>
            <div class="nav-group">Praxis</div>
            <a href="patienten.html"{active_patienten}><i class="fa-solid fa-users nav-icon"></i> Patienten</a>
            <a href="aerzte.html"{active_aerzte}><i class="fa-solid fa-user-doctor nav-icon"></i> Aerzte</a>
            <a href="termine.html"{active_termine}><i class="fa-solid fa-calendar-days nav-icon"></i> Termine</a>
            <a href="wartezimmer.html"{active_wartezimmer}><i class="fa-solid fa-couch nav-icon"></i> Wartezimmer</a>
            <div class="nav-group">Callcenter</div>
            <a href="agenten.html"{active_agenten}><i class="fa-solid fa-headset nav-icon"></i> Agenten</a>
            <a href="voicebot.html"{active_voicebot}><i class="fa-solid fa-robot nav-icon"></i> Voicebot</a>
            <a href="voicebot-live.html"{active_voicebot_live}><i class="fa-solid fa-microphone nav-icon"></i> Voicebot Live</a>
            <a href="ansagen.html"{active_ansagen}><i class="fa-solid fa-tower-broadcast nav-icon"></i> Ansagen</a>
            <a href="softphone.html"{active_softphone}><i class="fa-solid fa-phone nav-icon"></i> Softphone</a>
            <div class="nav-group">Telefonie</div>
            <a href="asterisk.html"{active_asterisk}><i class="fa-solid fa-server nav-icon"></i> Asterisk</a>
            <a href="acd.html"{active_acd}><i class="fa-solid fa-phone-volume nav-icon"></i> ACD</a>
            <a href="standort.html"{active_standort}><i class="fa-solid fa-building nav-icon"></i> Standort</a>
            <a href="callflow.html"{active_callflow}><i class="fa-solid fa-diagram-project nav-icon"></i> Callflow</a>
            <div class="nav-group">Analyse</div>
            <a href="auswertung.html"{active_auswertung}><i class="fa-solid fa-chart-line nav-icon"></i> Auswertungen</a>
            <a href="wissensdatenbank.html"{active_wissensdatenbank}><i class="fa-solid fa-book nav-icon"></i> Wissensdatenbank</a>
            <a href="uebersetzung.html"{active_uebersetzung}><i class="fa-solid fa-language nav-icon"></i> Uebersetzer</a>
            <div class="nav-group">Admin</div>
            <a href="benutzer.html"{active_benutzer}><i class="fa-solid fa-user-gear nav-icon"></i> Benutzer</a>
            <div class="nav-group">KI</div>
            <a href="ai-agent.html"{active_ai_agent}><i class="fa-solid fa-microchip nav-icon"></i> AI Agent Hub</a>
"""

# Seiten die aus src/html nach docs/ muessen
PAGES_TO_DEPLOY = [
    # (src_filename, docs_filename, page_key, title, topbar_right)
    ("patienten.html", "patienten.html", "patienten", "Patienten", ""),
    ("aerzte.html", "aerzte.html", "aerzte", "Aerzte", ""),
    ("wartezimmer.html", "wartezimmer.html", "wartezimmer", "Wartezimmer", '<span class="badge" id="wartezimmer-anzahl">0 wartend</span>'),
    ("wissensdatenbank.html", "wissensdatenbank.html", "wissensdatenbank", '<i class="fa-solid fa-book"></i> Wissensdatenbank', ""),
    ("softphone.html", "softphone.html", "softphone", "Softphone", ""),
    ("benutzer.html", "benutzer.html", "benutzer", "Benutzer", ""),
    ("uebersetzung.html", "uebersetzung.html", "uebersetzung", '<i class="fa-solid fa-language"></i> Uebersetzer', ""),
    ("standort.html", "standort.html", "standort", '<i class="fa-solid fa-building"></i> Standort &amp; ACD', ""),
    ("dashboard.html", "dashboard.html", "dashboard", "Dashboard", ""),
    ("voicebot-live.html", "voicebot-live.html", "voicebot_live", '<i class="fa-solid fa-microphone"></i> Voicebot Live', ""),
]

# Seiten-Keys fuer Sidebar active-Markierung
ALL_PAGE_KEYS = [
    "admin_dashboard", "patienten", "aerzte", "termine", "wartezimmer",
    "agenten", "voicebot", "voicebot_live", "ansagen", "softphone",
    "asterisk", "acd", "standort", "callflow",
    "auswertung", "wissensdatenbank", "uebersetzung",
    "benutzer", "ai_agent"
]


def build_sidebar(active_key):
    """Sidebar mit aktivem Link bauen."""
    replacements = {}
    for key in ALL_PAGE_KEYS:
        replacements[f"active_{key}"] = ' class="active"' if key == active_key else ""
    return SIDEBAR_NAV.format(**replacements)


def extract_main(html):
    """Extrahiere Inhalt zwischen <main> und </main>."""
    m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)
    if m:
        return m.group(0)  # inkl. <main> tags
    return "<main></main>"


def extract_head_style(html):
    """Extrahiere embedded <style> aus <head>."""
    styles = re.findall(r'<style>(.*?)</style>', html, re.DOTALL)
    # Ignore the first style if it's a link (stylesheet)
    # Only return styles that are in the <head>
    head_match = re.search(r'<head>(.*?)</head>', html, re.DOTALL)
    if head_match:
        head_styles = re.findall(r'<style>(.*?)</style>', head_match.group(1), re.DOTALL)
        if head_styles:
            return "\n    <style>" + "\n".join(head_styles) + "</style>"
    return ""


def extract_body_scripts(html):
    """Extrahiere inline <script> (nicht src) aus dem Body."""
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
    if not body_match:
        return ""
    body = body_match.group(1)
    # Finde inline scripts (nicht die mit src="app.js")
    scripts = re.findall(r'<script>.*?</script>', body, re.DOTALL)
    return "\n    ".join(scripts)


def extract_topbar_right(html):
    """Extrahiere topbar-right Inhalt."""
    m = re.search(r'<div class="topbar-right">(.*?)</div>', html, re.DOTALL)
    if m:
        return m.group(1).strip()
    return ""


def build_page(page_key, title, main_content, topbar_right="", extra_head="", extra_scripts=""):
    """Komplette HTML-Seite bauen."""
    sidebar = build_sidebar(page_key)

    if not topbar_right:
        topbar_right = ""

    topbar_right_html = f'<div class="topbar-right">{topbar_right}</div>' if topbar_right else ""

    has_app_js = 'src="app.js"' not in extra_scripts if extra_scripts else True
    app_js = '    <script src="app.js"></script>' if has_app_js else ""

    return f'''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title.replace("<i ", "").split(">")[-1].strip() if "<i " in title else title} – MedReception</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="style.css">{extra_head}
</head>
<body>
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo" onclick="location.href=\'admin-dashboard.html\'"><div class="icon">M</div><span>MedReception</span></div>
        <nav class="sidebar-nav">{sidebar}
        </nav>
        <div class="sidebar-footer">
            <button onclick="sessionStorage.removeItem(\'mr_guard_session\');location.href=\'index.html\'" type="button"><i class="fa-solid fa-right-from-bracket nav-icon"></i> Abmelden</button>
        </div>
    </aside>
    <div class="main-wrapper">
        <header class="topbar">
            <button id="menu-toggle" type="button"><i class="fa-solid fa-bars"></i></button>
            <h1>{title}</h1>
            {topbar_right_html}
        </header>
        {main_content}
    </div>
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
{app_js}
{extra_scripts}
</body>
</html>
'''


def clean_title(raw):
    """Entferne HTML-Tags aus dem Titel fuer <title>."""
    return re.sub(r'<[^>]+>', '', raw).strip()


def deploy():
    deployed = 0
    updated = 0

    for src_file, docs_file, page_key, title, topbar_right in PAGES_TO_DEPLOY:
        src_path = os.path.join(SRC, src_file)
        docs_path = os.path.join(DOCS, docs_file)

        if not os.path.exists(src_path):
            print(f"  SKIP {src_file} (nicht in src/html)")
            continue

        with open(src_path, "r", encoding="utf-8") as f:
            html = f.read()

        main_content = extract_main(html)
        extra_head = extract_head_style(html)
        extra_scripts = extract_body_scripts(html)

        if not topbar_right:
            topbar_right = extract_topbar_right(html)

        page_html = build_page(page_key, title, main_content, topbar_right, extra_head, extra_scripts)

        with open(docs_path, "w", encoding="utf-8") as f:
            f.write(page_html)

        size = os.path.getsize(docs_path)
        existed = os.path.exists(docs_path)
        status = "UPDATE" if existed else "NEU"
        print(f"  {status}: {docs_file} ({size:,} Bytes)")
        deployed += 1

    # Bestehende docs/ Seiten: Sidebar aktualisieren
    EXISTING_PAGES = {
        "agenten.html": "agenten",
        "voicebot.html": "voicebot",
        "ansagen.html": "ansagen",
        "asterisk.html": "asterisk",
        "acd.html": "acd",
        "callflow.html": "callflow",
        "termine.html": "termine",
        "auswertung.html": "auswertung",
        "admin-dashboard.html": "admin_dashboard",
    }

    for filename, page_key in EXISTING_PAGES.items():
        filepath = os.path.join(DOCS, filename)
        if not os.path.exists(filepath):
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            html = f.read()

        # Sidebar ersetzen
        new_sidebar = build_sidebar(page_key)
        old_nav = re.search(r'<nav class="sidebar-nav">(.*?)</nav>', html, re.DOTALL)
        if old_nav:
            new_html = html[:old_nav.start(1)] + new_sidebar + "\n        " + html[old_nav.end(1):]
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_html)
            print(f"  SIDEBAR: {filename}")
            updated += 1

    print(f"\nFertig: {deployed} Seiten deployed, {updated} Sidebars aktualisiert")


if __name__ == "__main__":
    deploy()
