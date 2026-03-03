#!/bin/bash
# Pokretanje IT Procurement aplikacije - API + Frontend

set -e
cd "$(dirname "$0")/.."

echo "=== IT Procurement - Start ==="

# 1. Provjeri/Pokreni API
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "Pokrećem API server na portu 8000..."
  (cd "$(dirname "$0")/.." && python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000) &
  sleep 2
  sleep 3
  if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "API nije pokrenut. Pokreni ručno: cd api && uvicorn api.main:app --reload"
    exit 1
  fi
  echo "API pokrenut (PID $API_PID)"
else
  echo "API već radi na http://localhost:8000"
fi

# 2. Seed ako treba (prvi put)
echo "Provjera seed podataka..."
# Seed se automatski poziva pri startu init_db - lokacije i sektori
# Za puni demo seed: curl -X POST http://localhost:8000/api/seed -H "Authorization: Bearer ..."

# 3. Frontend
echo "Pokrećem frontend na http://localhost:5173..."
npm run dev
