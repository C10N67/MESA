#!/bin/bash
cd "$(dirname "$0")"

# Abierto desde dentro del .zip sin descomprimir: el resto de Mesa no está al lado
if [ ! -f server.js ]; then
  echo
  echo "  No encuentro el resto de Mesa junto a este archivo."
  echo "  Descomprime el .zip entero, entra en la carpeta que se crea"
  echo "  y vuelve a abrir este archivo desde ahí."
  echo
  read -n 1 -s -r -p "Pulsa una tecla para cerrar"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Mesa necesita Node.js para arrancar."
  echo "  Instalalo desde https://nodejs.org (opcion LTS) y vuelve a abrir este archivo."
  echo
  read -n 1 -s -r -p "Pulsa una tecla para cerrar"
  exit 1
fi

echo "  Abriendo Mesa. No cierres esta ventana mientras juegas."
node server.js --open
