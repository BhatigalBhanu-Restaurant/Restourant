@echo off
title Kathiyawadi Restaurant Management ERP
echo ========================================================
echo   Launching Kathiyawadi Restaurant Management ERP
echo   Pure Python Server: http://localhost:5000
echo   API Documentation:  http://localhost:5000/docs
echo ========================================================

echo Starting Python ERP Application on port 5000...
start "ERP Python Server (Port 5000)" cmd /k "cd /d %~dp0 && python run.py"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5000 ...
start http://localhost:5000

echo.
echo ========================================================
echo   Restaurant Management ERP Launched Successfully!
echo   - Unified Portal:          http://localhost:5000
echo   - Daily Menu:              http://localhost:5000/daily-menu
echo   - Function Locker:         http://localhost:5000/functions
echo   - Catalog Masters:         http://localhost:5000/masters
echo   - Inventory & Stock:       http://localhost:5000/inventory
echo   - Staff & HR:              http://localhost:5000/employees
echo   - Python REST API:         http://localhost:5000/api
echo   - API Docs:                http://localhost:5000/docs
echo ========================================================
