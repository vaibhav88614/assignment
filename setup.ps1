<# 
.SYNOPSIS
    AccredVerify — One-command setup (Windows PowerShell)
#>
$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AccredVerify — Full Stack Setup"         -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---------- Backend ----------
Write-Host ""
Write-Host "[1/4] Setting up Python backend..." -ForegroundColor Yellow
Set-Location "$ROOT\backend"

if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
}

& "$ROOT\backend\venv\Scripts\Activate.ps1"
pip install -q -r requirements.txt
Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green

# Copy .env if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  ✓ .env created from .env.example" -ForegroundColor Green
    }
}

# ---------- Seed ----------
Write-Host ""
Write-Host "[2/4] Seeding database with demo data..." -ForegroundColor Yellow
python seed.py 2>$null
Write-Host "  ✓ Database seeded" -ForegroundColor Green

# ---------- Frontend ----------
Write-Host ""
Write-Host "[3/4] Setting up React frontend..." -ForegroundColor Yellow
Set-Location "$ROOT\frontend"
npm install --silent 2>$null
Write-Host "  ✓ Node dependencies installed" -ForegroundColor Green

# ---------- Done ----------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ✓ Setup Complete!"                       -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "    cd backend"
Write-Host "    .\venv\Scripts\Activate.ps1"
Write-Host "    uvicorn app.main:app --reload --port 8000"
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Then open: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Accounts:" -ForegroundColor Yellow
Write-Host "  investor@demo.com  / Password1!"
Write-Host "  reviewer@demo.com  / Password1!"
Write-Host "  admin@demo.com     / Password1!"
Write-Host ""

Set-Location $ROOT
