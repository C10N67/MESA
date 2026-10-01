@echo off
title Mesa
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Mesa necesita Node.js para arrancar.
  echo  Instalalo desde https://nodejs.org ^(opcion LTS, siguiente-siguiente-terminar^)
  echo  y vuelve a hacer doble clic en este archivo.
  echo.
  pause
  exit /b
)

echo  Abriendo Mesa. No cierres esta ventana mientras juegas.
start "" http://localhost:8080
node server.js
pause
