<#
.SYNOPSIS
    AccredVerify - One-command setup (Windows PowerShell)
#>
$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$TEMP_DIR = Join-Path $ROOT ".tmp"

if (-not (Test-Path $TEMP_DIR)) {
    New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null
}

$env:TEMP = $TEMP_DIR
$env:TMP = $TEMP_DIR

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AccredVerify - Full Stack Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---------- Backend ----------
Write-Host ""
Write-Host "[1/4] Setting up Python backend..." -ForegroundColor Yellow
Set-Location "$ROOT\backend"

if ((Test-Path "venv") -and -not (Test-Path "venv\Scripts\Activate.ps1")) {
    Remove-Item -Recurse -Force "venv"
}

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    py -m venv venv
    Write-Host "  [OK] Virtual environment created" -ForegroundColor Green
}

& "$ROOT\backend\venv\Scripts\Activate.ps1"
pip install -q -r requirements.txt
Write-Host "  [OK] Python dependencies installed" -ForegroundColor Green

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  [OK] .env created from .env.example" -ForegroundColor Green
}

# ---------- Seed ----------
Write-Host ""
Write-Host "[2/4] Seeding database with demo data..." -ForegroundColor Yellow
python seed.py 2>$null
Write-Host "  [OK] Database seeded" -ForegroundColor Green

# ---------- Frontend ----------
Write-Host ""
Write-Host "[3/4] Setting up React frontend..." -ForegroundColor Yellow
Set-Location "$ROOT\frontend"
npm install --silent 2>$null
Write-Host "  [OK] Node dependencies installed" -ForegroundColor Green

# ---------- Done ----------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  [OK] Setup Complete!" -ForegroundColor Green
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
