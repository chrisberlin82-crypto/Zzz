#!/bin/bash
# ============================================================
# SSH-Verbindungspruefung fuer Deployment-Skripte
# ============================================================
# Wird von deploy-hetzner.sh und deploy-comnivox.sh verwendet.
#
# Verwendung:
#   source deploy/ssh-check.sh
#   ssh_pruefen "user@host"
#
# Oder direkt aufrufen fuer Diagnose:
#   ./deploy/ssh-check.sh user@host
# ============================================================

# Farben fuer Ausgabe (nur wenn Terminal das unterstuetzt)
if [ -t 1 ]; then
    ROT='\033[0;31m'
    GRUEN='\033[0;32m'
    GELB='\033[0;33m'
    RESET='\033[0m'
else
    ROT=''
    GRUEN=''
    GELB=''
    RESET=''
fi

# --------------------------------------------------------
# SSH-Host-Format pruefen (user@host)
# --------------------------------------------------------
ssh_format_pruefen() {
    local ssh_host="$1"

    # Leer?
    if [ -z "$ssh_host" ]; then
        echo -e "${ROT}Fehler: Kein SSH-Host angegeben.${RESET}"
        echo ""
        echo "Richtige Verwendung:"
        echo "  user@hostname     z.B. root@168.119.xxx.xxx"
        echo "  user@domain.de    z.B. chris@comnivox.de"
        return 1
    fi

    # Fehlt das @-Zeichen? (haeufiger Fehler: 'ssh root192.168.1.1')
    if [[ "$ssh_host" != *"@"* ]]; then
        echo -e "${ROT}Fehler: SSH-Host '$ssh_host' enthaelt kein @-Zeichen.${RESET}"
        echo ""
        echo "Das richtige Format ist: benutzer@host"
        echo ""
        # Versuche hilfreiche Korrektur vorzuschlagen
        if [[ "$ssh_host" =~ ^(root|admin|ubuntu|chris|deploy)(.+)$ ]]; then
            local user="${BASH_REMATCH[1]}"
            local host="${BASH_REMATCH[2]}"
            echo -e "Meinten Sie: ${GRUEN}${user}@${host}${RESET} ?"
        fi
        echo ""
        echo "Beispiele:"
        echo "  root@168.119.xxx.xxx"
        echo "  chris@comnivox.de"
        echo "  deploy@mein-server.de"
        return 1
    fi

    # user@ ohne host? (z.B. 'root@')
    local user="${ssh_host%%@*}"
    local host="${ssh_host#*@}"

    if [ -z "$user" ]; then
        echo -e "${ROT}Fehler: Kein Benutzername vor dem @-Zeichen.${RESET}"
        echo "Format: benutzer@host (z.B. root@168.119.xxx.xxx)"
        return 1
    fi

    if [ -z "$host" ]; then
        echo -e "${ROT}Fehler: Kein Hostname nach dem @-Zeichen.${RESET}"
        echo "Format: benutzer@host (z.B. root@168.119.xxx.xxx)"
        return 1
    fi

    # Hostname mit Leerzeichen?
    if [[ "$host" == *" "* ]]; then
        echo -e "${ROT}Fehler: Hostname '$host' enthaelt Leerzeichen.${RESET}"
        echo "Hostname darf keine Leerzeichen enthalten."
        return 1
    fi

    return 0
}

# --------------------------------------------------------
# DNS-Aufloesung pruefen (nur fuer Domainnamen)
# --------------------------------------------------------
ssh_dns_pruefen() {
    local host="$1"

    # Wenn es eine IP-Adresse ist, DNS-Check ueberspringen
    if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 0
    fi

    # DNS-Aufloesung testen
    if command -v dig &>/dev/null; then
        if ! dig +short "$host" 2>/dev/null | grep -q .; then
            echo -e "${ROT}Fehler: Hostname '$host' konnte nicht aufgeloest werden.${RESET}"
            echo ""
            echo "Moegliche Ursachen:"
            echo "  - Tippfehler im Hostnamen"
            echo "  - DNS-Eintrag fehlt oder ist noch nicht aktiv"
            echo "  - Netzwerkverbindung unterbrochen"
            return 1
        fi
    elif command -v host &>/dev/null; then
        if ! host "$host" &>/dev/null; then
            echo -e "${ROT}Fehler: Hostname '$host' konnte nicht aufgeloest werden.${RESET}"
            echo "Pruefen Sie den Hostnamen und Ihre Netzwerkverbindung."
            return 1
        fi
    elif command -v getent &>/dev/null; then
        if ! getent hosts "$host" &>/dev/null; then
            echo -e "${ROT}Fehler: Hostname '$host' konnte nicht aufgeloest werden.${RESET}"
            echo "Pruefen Sie den Hostnamen und Ihre Netzwerkverbindung."
            return 1
        fi
    fi

    return 0
}

# --------------------------------------------------------
# SSH-Verbindung testen (mit Timeout)
# --------------------------------------------------------
ssh_verbindung_testen() {
    local ssh_host="$1"
    local timeout_sek="${2:-10}"

    echo "Teste SSH-Verbindung zu $ssh_host (Timeout: ${timeout_sek}s)..."

    if ssh -o ConnectTimeout="$timeout_sek" \
           -o BatchMode=yes \
           -o StrictHostKeyChecking=accept-new \
           "$ssh_host" "echo ok" 2>/dev/null; then
        echo -e "${GRUEN}SSH-Verbindung erfolgreich.${RESET}"
        return 0
    else
        local exit_code=$?
        echo -e "${ROT}SSH-Verbindung fehlgeschlagen (Exit-Code: $exit_code).${RESET}"
        echo ""
        echo "Moegliche Ursachen:"
        echo "  - Server ist nicht erreichbar (Firewall, Port 22 blockiert)"
        echo "  - SSH-Key nicht hinterlegt (ssh-copy-id $ssh_host)"
        echo "  - Falscher Benutzername oder Hostname"
        echo "  - Server ist ausgeschaltet oder startet gerade neu"
        echo ""
        echo "Diagnose-Befehle:"
        echo "  ssh -v $ssh_host          # Ausfuehrliche Verbindungsinfo"
        echo "  ping ${ssh_host#*@}       # Erreichbarkeit pruefen"
        echo "  ssh-copy-id $ssh_host     # SSH-Key hinterlegen"
        return 1
    fi
}

# --------------------------------------------------------
# Pruefen ob benoetigte Tools installiert sind
# --------------------------------------------------------
ssh_tools_pruefen() {
    local fehlend=()

    for tool in ssh rsync; do
        if ! command -v "$tool" &>/dev/null; then
            fehlend+=("$tool")
        fi
    done

    if [ ${#fehlend[@]} -gt 0 ]; then
        echo -e "${ROT}Fehler: Folgende Programme sind nicht installiert: ${fehlend[*]}${RESET}"
        echo ""
        echo "Installation:"
        echo "  Ubuntu/Debian: sudo apt install openssh-client rsync"
        echo "  macOS:         brew install rsync  (ssh ist vorinstalliert)"
        echo "  Windows:       SSH ist in Windows 10+ enthalten"
        echo "                 rsync via WSL oder Git Bash verfuegbar"
        return 1
    fi

    return 0
}

# --------------------------------------------------------
# Hauptfunktion: Alle Pruefungen durchfuehren
# --------------------------------------------------------
ssh_pruefen() {
    local ssh_host="$1"
    local skip_connection="${2:-false}"

    echo "=== SSH-Verbindungspruefung ==="
    echo ""

    # 1) Tools vorhanden?
    echo "[1/4] Pruefe benoetigte Tools..."
    if ! ssh_tools_pruefen; then
        return 1
    fi
    echo -e "${GRUEN}  Tools vorhanden (ssh, rsync).${RESET}"

    # 2) Format korrekt?
    echo "[2/4] Pruefe SSH-Host-Format..."
    if ! ssh_format_pruefen "$ssh_host"; then
        return 1
    fi
    echo -e "${GRUEN}  Format korrekt: $ssh_host${RESET}"

    # 3) DNS-Aufloesung (nur fuer Domainnamen)
    local host="${ssh_host#*@}"
    echo "[3/4] Pruefe DNS-Aufloesung fuer '$host'..."
    if ! ssh_dns_pruefen "$host"; then
        return 1
    fi
    echo -e "${GRUEN}  Host erreichbar.${RESET}"

    # 4) SSH-Verbindung testen
    if [ "$skip_connection" = "false" ]; then
        echo "[4/4] Teste SSH-Verbindung..."
        if ! ssh_verbindung_testen "$ssh_host"; then
            return 1
        fi
    else
        echo "[4/4] SSH-Verbindungstest uebersprungen (--skip-connect)."
    fi

    echo ""
    echo -e "${GRUEN}=== Alle Pruefungen bestanden ===${RESET}"
    echo ""
    return 0
}

# --------------------------------------------------------
# Wenn direkt aufgerufen (nicht per source)
# --------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "SSH-Verbindungspruefung fuer MED Rezeption Deployment"
        echo ""
        echo "Verwendung:"
        echo "  $0 user@host               Vollstaendige Pruefung"
        echo "  $0 user@host --skip-connect Nur Format und DNS pruefen"
        echo "  $0 --help                   Diese Hilfe anzeigen"
        echo ""
        echo "Beispiele:"
        echo "  $0 root@46.225.86.170"
        echo "  $0 chris@comnivox.de"
        echo "  $0 root@168.119.xxx.xxx --skip-connect"
        exit 0
    fi

    ssh_host="${1:?Fehler: SSH-Host angeben (z.B. root@168.119.xxx.xxx)}"
    skip="${2:-false}"
    if [ "$skip" = "--skip-connect" ]; then
        skip="true"
    fi

    ssh_pruefen "$ssh_host" "$skip"
fi
