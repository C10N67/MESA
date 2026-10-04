@echo off
title Mesa - por internet
cd /d "%~dp0"

rem Abierto desde dentro del .zip o .rar: Windows solo saca este archivo a una
rem carpeta temporal y el resto de Mesa no esta al lado
if not exist "%~dp0server.js" (
  echo.
  echo  No encuentro el resto de Mesa junto a este archivo.
  echo.
  echo  Seguramente lo has abierto desde dentro del .zip o del .rar sin
  echo  descomprimirlo. Haz esto:
  echo.
  echo    1. Cierra esta ventana.
  echo    2. Clic derecho en el .zip o .rar ^> "Extraer todo" o "Extraer aqui".
  echo    3. Entra en la carpeta que se crea y haz doble clic en este archivo.
  echo.
  pause
  exit /b
)

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

echo  Abriendo Mesa para jugar por internet. No cierres esta ventana mientras jugais.
start "" http://localhost:8080
node server.js --internet
pause
