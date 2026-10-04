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

# Para jugar por internet hace falta cloudflared (gratis, de Cloudflare)
if ! command -v cloudflared >/dev/null 2>&1 && [ ! -x ./cloudflared ]; then
  echo
  echo "  Para jugar por internet falta un programa gratuito: cloudflared."
  if command -v brew >/dev/null 2>&1; then
    read -r -p "  ¿Instalarlo ahora con Homebrew? [s/N] " ok
    if [[ "$ok" =~ ^[sS] ]]; then brew install cloudflared || exit 1; else exit 0; fi
  else
    echo "  Descárgalo de https://github.com/cloudflare/cloudflared/releases,"
    echo "  llámalo «cloudflared», déjalo en esta carpeta y vuelve a abrir este archivo."
    read -n 1 -s -r -p "Pulsa una tecla para cerrar"
    exit 1
  fi
fi

echo "  Abriendo Mesa para jugar por internet. No cierres esta ventana mientras jugáis."
node server.js --internet --open
