#!/bin/bash
# ===========================================
# Vente CRM - Lokaler Start (ohne Docker)
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Vente CRM starten ==="

# 1. PostgreSQL starten
echo "[1/6] PostgreSQL starten..."
sudo pg_ctlcluster 16 main start 2>/dev/null || sudo service postgresql start 2>/dev/null || echo "PostgreSQL läuft bereits"
sleep 1

if ! pg_isready -q; then
  echo "FEHLER: PostgreSQL konnte nicht gestartet werden!"
  exit 1
fi
echo "  -> PostgreSQL läuft"

# 2. Redis starten
echo "[2/6] Redis starten..."
if ! redis-cli -a vente_redis_2024 ping 2>/dev/null | grep -q PONG; then
  redis-server --daemonize yes --requirepass vente_redis_2024
fi
echo "  -> Redis läuft"

# 3. Datenbank und User anlegen (falls nicht vorhanden)
echo "[3/6] Datenbank prüfen..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='vente_user'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER vente_user WITH PASSWORD 'vente_secure_password_2024';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='vente_crm'" | grep -q 1 || \
  sudo -u postgres createdb vente_crm -O vente_user

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vente_crm TO vente_user;" 2>/dev/null
echo "  -> Datenbank bereit"

# 4. Backend Dependencies + Migrationen
echo "[4/6] Backend vorbereiten..."
cd "$SCRIPT_DIR/backend"
cp "$SCRIPT_DIR/.env" .env 2>/dev/null || true
npm install --silent 2>/dev/null
npx sequelize-cli db:migrate 2>/dev/null || echo "  -> Migrationen bereits ausgeführt"
npx sequelize-cli db:seed:all 2>/dev/null || echo "  -> Seeds bereits vorhanden"
echo "  -> Backend bereit"

# 5. Backend starten
echo "[5/6] Backend starten (Port 3001)..."
# Alten Prozess beenden falls vorhanden
kill $(lsof -t -i:3001) 2>/dev/null || true
node src/server.js &>/tmp/vente-backend.log &
BACKEND_PID=$!
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "FEHLER: Backend konnte nicht gestartet werden!"
  cat /tmp/vente-backend.log
  exit 1
fi
echo "  -> Backend läuft (PID: $BACKEND_PID)"

# 6. Frontend starten
echo "[6/6] Frontend starten (Port 3000)..."
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>/dev/null
kill $(lsof -t -i:3000) 2>/dev/null || true
REACT_APP_API_URL=http://localhost:3001/api PORT=3000 DANGEROUSLY_DISABLE_HOST_CHECK=true \
  npx react-scripts start &>/tmp/vente-frontend.log &
FRONTEND_PID=$!

echo ""
echo "=== Vente CRM gestartet ==="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "  Logs:"
echo "    Backend:  tail -f /tmp/vente-backend.log"
echo "    Frontend: tail -f /tmp/vente-frontend.log"
echo ""
echo "  Stoppen: kill $BACKEND_PID $FRONTEND_PID"
