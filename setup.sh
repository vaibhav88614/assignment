#!/usr/bin/env bash
# ============================================================
# AccredVerify — One-command setup (Linux / macOS)
# ============================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=========================================="
echo "  AccredVerify — Full Stack Setup"
echo "=========================================="

# ---------- Backend ----------
echo ""
echo "[1/4] Setting up Python backend..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  ✓ Virtual environment created"
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  ✓ Python dependencies installed"

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
    echo "  ✓ .env created from .env.example"
fi

# ---------- Seed ----------
echo ""
echo "[2/4] Seeding database with demo data..."
python seed.py 2>/dev/null
echo "  ✓ Database seeded"

# ---------- Frontend ----------
echo ""
echo "[3/4] Setting up React frontend..."
cd "$ROOT_DIR/frontend"
npm install --silent
echo "  ✓ Node dependencies installed"

# ---------- Done ----------
echo ""
echo "=========================================="
echo "  ✓ Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "Demo Accounts:"
echo "  investor@demo.com  / Password1!"
echo "  reviewer@demo.com  / Password1!"
echo "  admin@demo.com     / Password1!"
echo ""
