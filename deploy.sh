#!/bin/bash
# ============================================
# MED Rezeption - Deployment / Update
# Verwendung: bash deploy.sh
# ============================================

set -e

echo "=== MED Rezeption Deployment ==="
echo ""

# --- Neueste Version holen ---
echo "[1/3] Neueste Version holen..."
git pull origin main

# --- Container neu bauen und starten ---
echo "[2/3] Container neu bauen..."
docker compose build --no-cache web

# --- Ohne Downtime neu starten ---
echo "[3/3] Anwendung neu starten..."
docker compose up -d

echo ""
echo "=== Deployment abgeschlossen! ==="
docker compose ps
echo ""
