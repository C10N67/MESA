@echo off
title Mesa
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
