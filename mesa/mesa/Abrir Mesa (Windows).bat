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

rem La ayuda de la IA para los muros del plano usa el modulo de Claude.
rem Se instala solo la primera vez; sin internet, Mesa arranca igual sin ella.
if not exist "node_modules\@anthropic-ai\sdk\package.json" (
  where npm >nul 2>nul && (
    echo  Instalando la ayuda de la IA ^(solo la primera vez^)...
    call npm install --omit=dev --no-audit --no-fund --loglevel=error >nul 2>nul
  )
)

echo  Abriendo Mesa. No cierres esta ventana mientras juegas.
start "" http://localhost:8080
node server.js
pause
