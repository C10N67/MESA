#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Mesa necesita Node.js para arrancar."
  echo "  Instalalo desde https://nodejs.org (opcion LTS) y vuelve a abrir este archivo."
  echo
  read -n 1 -s -r -p "Pulsa una tecla para cerrar"
  exit 1
fi

echo "  Abriendo Mesa. No cierres esta ventana mientras juegas."
( sleep 1; (open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null) ) &
node server.js
