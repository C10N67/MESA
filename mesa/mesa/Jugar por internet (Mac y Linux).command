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

# La ayuda de la IA para los muros del plano usa el módulo de Claude.
# Se instala solo la primera vez; sin internet, Mesa arranca igual sin ella.
if [ ! -f node_modules/@anthropic-ai/sdk/package.json ] && command -v npm >/dev/null 2>&1; then
  echo "  Instalando la ayuda de la IA (solo la primera vez)..."
  npm install --omit=dev --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || true
fi

echo "  Abriendo Mesa para jugar por internet. No cierres esta ventana mientras jugáis."
( sleep 1; (open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null) ) &
node server.js --internet
