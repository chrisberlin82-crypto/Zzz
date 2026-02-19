"""Tests zur HTML-Validierung und Strukturprüfung."""

from html.parser import HTMLParser
from pathlib import Path

import pytest

HTML_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "html"


class HtmlStrukturParser(HTMLParser):
    """Einfacher HTML-Parser zur Strukturprüfung."""

    def __init__(self):
        super().__init__()
        self.tags = []
        self.open_tags = []
        self.has_doctype = False
        self.ids = []
        self.fehler = []

    def handle_decl(self, decl):
        if decl.lower().startswith("doctype"):
            self.has_doctype = True

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self_closing = tag in ("br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr")
        if not self_closing:
            self.open_tags.append(tag)
        for name, value in attrs:
            if name == "id":
                if value in self.ids:
                    self.fehler.append(f"Doppelte ID: {value}")
                self.ids.append(value)

    def handle_endtag(self, tag):
        if self.open_tags and self.open_tags[-1] == tag:
            self.open_tags.pop()


def html_dateien():
    return list(HTML_DIR.glob("*.html"))


def parse_html(dateipfad: Path) -> HtmlStrukturParser:
    parser = HtmlStrukturParser()
    inhalt = dateipfad.read_text(encoding="utf-8")
    parser.feed(inhalt)
    return parser


@pytest.fixture(params=html_dateien(), ids=lambda p: p.name)
def html_datei(request):
    return request.param


class TestHtmlStruktur:
    def test_hat_doctype(self, html_datei):
        parser = parse_html(html_datei)
        assert parser.has_doctype, f"{html_datei.name} hat kein <!DOCTYPE html>"

    def test_hat_html_tag(self, html_datei):
        parser = parse_html(html_datei)
        assert "html" in parser.tags, f"{html_datei.name} hat kein <html>-Tag"

    def test_hat_head_tag(self, html_datei):
        parser = parse_html(html_datei)
        assert "head" in parser.tags, f"{html_datei.name} hat kein <head>-Tag"

    def test_hat_body_tag(self, html_datei):
        parser = parse_html(html_datei)
        assert "body" in parser.tags, f"{html_datei.name} hat kein <body>-Tag"

    def test_hat_title(self, html_datei):
        parser = parse_html(html_datei)
        assert "title" in parser.tags, f"{html_datei.name} hat kein <title>-Tag"

    def test_hat_charset_meta(self, html_datei):
        inhalt = html_datei.read_text(encoding="utf-8")
        assert 'charset="UTF-8"' in inhalt or "charset=UTF-8" in inhalt, \
            f"{html_datei.name} hat kein charset-Meta-Tag"

    def test_hat_viewport_meta(self, html_datei):
        inhalt = html_datei.read_text(encoding="utf-8")
        assert "viewport" in inhalt, f"{html_datei.name} hat kein Viewport-Meta-Tag"

    def test_keine_doppelten_ids(self, html_datei):
        parser = parse_html(html_datei)
        assert parser.fehler == [], f"{html_datei.name}: {parser.fehler}"

    def test_hat_lang_attribut(self, html_datei):
        inhalt = html_datei.read_text(encoding="utf-8")
        assert 'lang="de"' in inhalt or 'lang="en"' in inhalt, \
            f"{html_datei.name} hat kein lang-Attribut"


class TestIndexHtml:
    def test_hat_rechner_formular(self):
        inhalt = (HTML_DIR / "index.html").read_text(encoding="utf-8")
        assert 'id="rechner-form"' in inhalt

    def test_hat_navigation(self):
        inhalt = (HTML_DIR / "index.html").read_text(encoding="utf-8")
        assert "<nav>" in inhalt

    def test_laedt_app_js(self):
        inhalt = (HTML_DIR / "index.html").read_text(encoding="utf-8")
        assert 'src="app.js"' in inhalt

    def test_laedt_style_css(self):
        inhalt = (HTML_DIR / "index.html").read_text(encoding="utf-8")
        assert 'href="style.css"' in inhalt


class TestBenutzerHtml:
    def test_hat_benutzer_formular(self):
        inhalt = (HTML_DIR / "benutzer.html").read_text(encoding="utf-8")
        assert 'id="benutzer-form"' in inhalt

    def test_hat_pflichtfelder(self):
        inhalt = (HTML_DIR / "benutzer.html").read_text(encoding="utf-8")
        assert 'id="name"' in inhalt
        assert 'id="email"' in inhalt
        assert 'id="alter"' in inhalt

    def test_hat_benutzer_tabelle(self):
        inhalt = (HTML_DIR / "benutzer.html").read_text(encoding="utf-8")
        assert 'id="benutzer-tabelle"' in inhalt

    def test_hat_plz_pattern(self):
        inhalt = (HTML_DIR / "benutzer.html").read_text(encoding="utf-8")
        assert 'pattern="[0-9]{5}"' in inhalt
