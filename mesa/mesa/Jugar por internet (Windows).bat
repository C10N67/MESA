@echo off
title Mesa - por internet
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Mesa necesita Node.js para arrancar.
  echo  Instalalo desde https://nodejs.org ^(opcion LTS^) y vuelve a abrir este archivo.
  echo.
  pause
  exit /b
)

rem Para jugar por internet hace falta cloudflared (gratis, de Cloudflare)
where cloudflared >nul 2>nul
if errorlevel 1 if not exist "%~dp0cloudflared.exe" (
  echo.
  echo  Para jugar por internet falta un programa gratuito: cloudflared.
  where winget >nul 2>nul
  if errorlevel 1 (
    echo  Descargalo de https://github.com/cloudflare/cloudflared/releases
    echo  ^(cloudflared-windows-amd64.exe^), renombralo a cloudflared.exe
    echo  y dejalo en esta carpeta. Luego vuelve a abrir este archivo.
    echo.
    pause
    exit /b
  )
  choice /c SN /m "  Instalarlo ahora"
  if errorlevel 2 exit /b
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  echo.
  echo  Listo. Cierra esta ventana y vuelve a abrir este archivo.
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

echo  Abriendo Mesa para jugar por internet. No cierres esta ventana mientras jugais.
start "" http://localhost:8080
node server.js --internet
pause
