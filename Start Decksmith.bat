@echo off
title Decksmith
cd /d "%~dp0"

echo Starting Decksmith servers...
start "Decksmith" cmd /k "npm run dev"

echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo Opening Decksmith in browser...
start "" "http://localhost:5173"
