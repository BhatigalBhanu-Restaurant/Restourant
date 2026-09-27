# PowerShell Launcher for Kathiyawadi Restaurant Management ERP System (Pure Python)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Launching Kathiyawadi Restaurant Management ERP       " -ForegroundColor Cyan
Write-Host "  Full Python Server:        http://localhost:5000      " -ForegroundColor Cyan
Write-Host "  API Documentation:         http://localhost:5000/docs " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start Pure Python Application
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python run.py"

Start-Sleep -Seconds 3

# Open default browser
Start-Process "http://localhost:5000"

Write-Host "Restaurant Management ERP Launched Successfully!" -ForegroundColor Green
Write-Host "Unified Portal:           http://localhost:5000" -ForegroundColor Yellow
Write-Host "Daily Menu:               http://localhost:5000/daily-menu" -ForegroundColor Yellow
Write-Host "Function Locker:          http://localhost:5000/functions" -ForegroundColor Yellow
Write-Host "Catalog Masters:          http://localhost:5000/masters" -ForegroundColor Yellow
Write-Host "Inventory & Stock:        http://localhost:5000/inventory" -ForegroundColor Yellow
Write-Host "Staff & HR:               http://localhost:5000/employees" -ForegroundColor Yellow
Write-Host "Python REST API:          http://localhost:5000/api" -ForegroundColor Yellow
Write-Host "API Interactive Docs:     http://localhost:5000/docs" -ForegroundColor Yellow
