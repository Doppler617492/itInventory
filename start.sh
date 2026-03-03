#!/bin/bash
# Pokretanje IT nabavke (bez Dockera - koristi SQLite)
set -e
cd "$(dirname "$0")"

# Python 3.11+ (3.14 nije podržan zbog pydantic)
PYTHON=${PYTHON:-python3.11}
if ! command -v $PYTHON &>/dev/null; then
  PYTHON=python3
fi

# Venv
if [ ! -d .venv ]; then
  $PYTHON -m venv .venv
  .venv/bin/pip install -r api/requirements.txt -q
fi

# Seed ako baza prazna
.venv/bin/python api/seed_data.py 2>/dev/null || true

# Pokreni API u pozadini
.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!
sleep 3

# Frontend
npm install --silent 2>/dev/null || true
npm run dev &
VITE_PID=$!

echo ""
echo "✅ IT nabavka pokrenuta"
echo "   Frontend: http://localhost:5173"
echo "   API:      http://localhost:8000"
echo "   Login:    it@cungu.com / Dekodera1989@"
echo ""
echo "Zaustavi sa: kill $API_PID $VITE_PID"

wait
