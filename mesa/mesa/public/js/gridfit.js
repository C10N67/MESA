/* Encajar la cuadrícula de Mesa con la que trae dibujada el plano.

   Busca sola la cuadrícula (gridfind.js), la pinta encima del plano y deja
   corregirla: tamaño de casilla, dónde empieza (también arrastrando sobre la
   imagen), columnas y filas. Al guardar, el mapa recuerda dónde cae la
   cuadrícula en la imagen (imgGrid) y el tablero la dibuja a esa escala, sin
   recortar ni estirar la imagen a mano. */

import { modal, toast, imgURL } from "./util.js";
import { patchMap } from "./net.js";
import { MAX_COLS, MAX_ROWS } from "./schema.js";
import { toGray, detectGrid, fitCount } from "./gridfind.js";

const mod = (a, b) => ((a % b) + b) % b;
const fmt = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ",");

async function loadImage(imageId) {
  const img = new Image();
  img.src = imgURL(imageId);
  await img.decode();
  return img;
}

function pixels(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return toGray(ctx.getImageData(0, 0, w, h).data, w, h);
}

/* Columnas y filas que caben con este tamaño y este punto de partida */
function fitAll(g, W, H) {
  const fx = fitCount(W, g.w, mod(g.x, g.w));
  const fy = fitCount(H, g.h, mod(g.y, g.h));
  return { x: fx.origin, y: fy.origin, cols: fx.count, rows: fy.count };
}

function verdict(found) {
  if (!found) return ["", ""];
  const size = `casillas de ${fmt(found.cellW, 1)} px, ${found.cols} × ${found.rows}`;
  if (found.confidence >= 0.6) return ["good", `Cuadrícula encontrada: ${size}. Comprueba que las líneas rosas pisan las del plano.`];
  if (found.confidence >= 0.25) return ["warn", `Creo que es esta (${size}), pero no lo tengo claro. Mírala de cerca antes de guardar.`];
  return ["bad", `No veo una cuadrícula clara en este plano. Te dejo la mejor apuesta (${size}): ajústala a mano o arrástrala sobre la imagen.`];
}

/* map: el mapa (id, imageId, cols, rows, imgGrid).
   onApply: avisa de las columnas y filas nuevas (para refrescar otros formularios). */
export function openGridFit(map, { onApply } = {}) {
  if (!map.imageId) return toast("Este mapa no tiene imagen de fondo", "bad");

  const body = document.createElement("div");
  body.className = "gridfit";
  body.innerHTML = `
    <p class="gridfit-status">Buscando la cuadrícula del plano…</p>
    <div class="gridfit-view"><canvas></canvas></div>
    <div class="row gridfit-tools">
      <label class="check"><input type="checkbox" name="zoom"> Ver a tamaño real</label>
      <label class="check"><input type="checkbox" name="square" checked> Casillas cuadradas</label>
    </div>
    <div class="gridfit-fields">
      <label class="field"><span>Casilla, ancho (px)</span><input name="w" type="number" step="0.01" min="2"></label>
      <label class="field"><span>Casilla, alto (px)</span><input name="h" type="number" step="0.01" min="2"></label>
      <label class="field"><span>Primera línea X (px)</span><input name="x" type="number" step="0.1"></label>
      <label class="field"><span>Primera línea Y (px)</span><input name="y" type="number" step="0.1"></label>
      <label class="field"><span>Columnas</span><input name="cols" type="number" min="5" max="${MAX_COLS}"></label>
      <label class="field"><span>Filas</span><input name="rows" type="number" min="5" max="${MAX_ROWS}"></label>
    </div>
    <div class="row">
      <button type="button" class="btn sm" data-act="half">Casilla a la mitad</button>
      <button type="button" class="btn sm" data-act="double">Casilla al doble</button>
      <button type="button" class="btn sm" data-act="detect">Buscar otra vez</button>
    </div>
    <p class="hint">Arrastra sobre la imagen para mover la cuadrícula. Si las líneas rosas caen
      una sí y una no sobre las del plano, prueba «al doble» o «a la mitad».</p>`;

  const canvas = body.querySelector("canvas");
  const view = body.querySelector(".gridfit-view");
  const status = body.querySelector(".gridfit-status");
  const input = n => body.querySelector(`[name="${n}"]`);
  let img = null, W = 0, H = 0, gray = null, found = null;
  let g = null;   // { x, y, w, h, cols, rows }

  const setStatus = (tone, text) => { status.className = "gridfit-status " + tone; status.textContent = text; };

  function fillInputs() {
    input("w").value = Math.round(g.w * 100) / 100;
    input("h").value = Math.round(g.h * 100) / 100;
    input("x").value = Math.round(g.x * 10) / 10;
    input("y").value = Math.round(g.y * 10) / 10;
    input("cols").value = g.cols;
    input("rows").value = g.rows;
  }

  /* Tras tocar tamaño o posición se vuelve a contar lo que cabe */
  function refit() {
    Object.assign(g, fitAll(g, W, H));
    fillInputs();
    draw();
  }

  function draw() {
    if (!img || !g) return;
    const real = input("zoom").checked;
    const scale = real ? 1 : Math.min(1, (view.clientWidth || 800) / W);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
    const ctx = canvas.getContext("2d");
    const k = scale * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(img, 0, 0, W, H);
    /* Lo que queda fuera del tablero, en sombra */
    const bx = g.x, by = g.y, bw = g.cols * g.w, bh = g.rows * g.h;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(bx, by, bw, bh);   // agujero: el tablero
    ctx.fill("evenodd");
    /* Líneas de la cuadrícula de Mesa */
    ctx.strokeStyle = "rgba(255, 61, 200, .85)";
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    for (let i = 0; i <= g.cols; i++) { const x = bx + i * g.w; ctx.moveTo(x, by); ctx.lineTo(x, by + bh); }
    for (let j = 0; j <= g.rows; j++) { const y = by + j * g.h; ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); }
    ctx.stroke();
  }

  function detect() {
    setStatus("", "Buscando la cuadrícula del plano…");
    /* Un respiro para que se pinte el aviso antes del cálculo */
    setTimeout(() => {
      try {
        gray = gray || pixels(img);
        found = detectGrid(gray, W, H);
        g = { x: found.x, y: found.y, w: found.cellW, h: found.cellH, cols: found.cols, rows: found.rows };
        if (input("square").checked && Math.abs(g.w - g.h) / g.w > 0.01) input("square").checked = false;
        fillInputs();
        draw();
        setStatus(...verdict(found));
      } catch (err) {
        setStatus("bad", "No se pudo analizar la imagen: " + err.message);
      }
    }, 30);
  }

  /* Campos */
  for (const n of ["w", "h"]) input(n).addEventListener("change", () => {
    const v = +input(n).value;
    if (!(v >= 2)) return fillInputs();
    g[n] = v;
    if (input("square").checked) g[n === "w" ? "h" : "w"] = v;
    refit();
  });
  for (const n of ["x", "y"]) input(n).addEventListener("change", () => {
    g[n] = +input(n).value || 0;
    refit();
  });
  input("cols").addEventListener("change", () => { g.cols = Math.max(5, Math.min(MAX_COLS, Math.trunc(+input("cols").value) || g.cols)); fillInputs(); draw(); });
  input("rows").addEventListener("change", () => { g.rows = Math.max(5, Math.min(MAX_ROWS, Math.trunc(+input("rows").value) || g.rows)); fillInputs(); draw(); });
  input("zoom").addEventListener("change", draw);
  input("square").addEventListener("change", () => {
    if (input("square").checked && g) { g.h = g.w; refit(); }
  });
  body.querySelector("[data-act=half]").addEventListener("click", () => { if (g) { g.w /= 2; g.h /= 2; refit(); } });
  body.querySelector("[data-act=double]").addEventListener("click", () => { if (g) { g.w *= 2; g.h *= 2; refit(); } });
  body.querySelector("[data-act=detect]").addEventListener("click", () => { if (img) detect(); });

  /* Arrastrar para mover la cuadrícula */
  let drag = null;
  canvas.addEventListener("pointerdown", e => {
    if (!g) return;
    drag = { sx: e.clientX, sy: e.clientY, x: g.x, y: g.y, scale: canvas.clientWidth / W };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag) return;
    g.x = drag.x + (e.clientX - drag.sx) / drag.scale;
    g.y = drag.y + (e.clientY - drag.sy) / drag.scale;
    draw();
  });
  const endDrag = () => { if (drag) { drag = null; refit(); } };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  const dialog = modal({
    title: "Encajar la cuadrícula con el plano", body, wide: true,
    actions: [
      { label: "Cancelar" },
      {
        label: "Estirar sin encajar",
        run: () => {
          patchMap(map.id, { imgGrid: null });
          toast("El plano se estira para llenar el tablero, como antes");
        }
      },
      {
        label: "Guardar", tone: "primary",
        run: () => {
          if (!g) return false;
          const cols = Math.max(5, Math.min(MAX_COLS, g.cols)), rows = Math.max(5, Math.min(MAX_ROWS, g.rows));
          patchMap(map.id, { imgGrid: { x: g.x, y: g.y, w: g.w, h: g.h }, cols, rows });
          if (g.cols > MAX_COLS || g.rows > MAX_ROWS)
            toast(`Mesa admite hasta ${MAX_COLS} × ${MAX_ROWS} casillas: el tablero se queda en ${cols} × ${rows}`, "bad");
          else toast(`Cuadrícula encajada: ${cols} × ${rows}`, "good");
          if (onApply) onApply({ cols, rows });
        }
      }
    ]
  });

  addEventListener("resize", draw, { passive: true });
  const stop = () => removeEventListener("resize", draw);
  new MutationObserver((_, obs) => { if (!body.isConnected) { stop(); obs.disconnect(); } })
    .observe(document.body, { childList: true });

  loadImage(map.imageId).then(loaded => {
    img = loaded; W = img.naturalWidth; H = img.naturalHeight;
    if (map.imgGrid) {
      /* Ya estaba encajada: se enseña tal cual, sin volver a buscar */
      g = { ...map.imgGrid, cols: map.cols, rows: map.rows };
      input("square").checked = Math.abs(g.w - g.h) / g.w <= 0.01;
      fillInputs();
      draw();
      setStatus("", `Cuadrícula guardada: casillas de ${fmt(g.w, 1)} px, ${g.cols} × ${g.rows}. «Buscar otra vez» la vuelve a calcular.`);
    } else detect();
  }).catch(() => {
    setStatus("bad", "No se pudo cargar la imagen del plano.");
  });

  return dialog;
}
