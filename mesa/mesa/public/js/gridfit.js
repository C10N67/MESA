/* Encajar la cuadrícula de Mesa con la que trae dibujada el plano, y
   después proponer sus muros y puertas.

   1. Busca sola la cuadrícula (gridfind.js), la pinta encima del plano y
      deja corregirla: tamaño de casilla, dónde empieza (también arrastrando
      sobre la imagen), columnas y filas. Al guardar, el mapa recuerda dónde
      cae la cuadrícula en la imagen (imgGrid) y el tablero la dibuja a esa
      escala, sin recortar ni estirar la imagen a mano.
   2. Con la cuadrícula ya puesta, propone muros y puertas (wallfind.js) y
      los enseña sobre el plano para revisarlos antes de ponerlos. Por
      defecto los muros salen a mano alzada, como los del pincel, pegados a
      la pared dibujada; también se pueden poner por la cuadrícula. En planos
      con mucho detalle hay tres ayudas para decir qué es suelo: la varita
      mágica (wand.js: pinchar en el suelo, gratis y sin internet), Gemini
      (plan gratuito) o Claude (de pago); con las dos IA (aiwalls.js) también
      salen tabiques y puertas. Después el trazado pega los muros a la tinta
      igual que siempre. */

import { modal, toast, imgURL } from "./util.js";
import { patchMap, aiStatus, aiSetKey, aiWalls } from "./net.js";
import { MAX_COLS, MAX_ROWS } from "./schema.js";
import { toGray, detectGrid, fitCount } from "./gridfind.js";
import { measureWalls, classifyWalls, traceWalls } from "./wallfind.js";
import { planTiles, mergeTiles, edgesFromAI } from "./aiwalls.js";
import { makeBlocks, blockAt, wandFloor } from "./wand.js";

const mod = (a, b) => ((a % b) + b) % b;
const fmt = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ",");

async function loadImage(imageId) {
  const img = new Image();
  img.src = imgURL(imageId);
  await img.decode();
  return img;
}

/* Los píxeles RGBA de la imagen */
function rgba(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

/* Lienzo de vista previa: la imagen entera (o a tamaño real), con lo que
   queda fuera del tablero en sombra. Devuelve el contexto ya escalado a
   píxeles de la imagen y el factor de escala. */
function paintBase(canvas, view, img, g, real) {
  const W = img.naturalWidth, H = img.naturalHeight;
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
  const bx = g.x, by = g.y, bw = g.cols * g.w, bh = g.rows * g.h;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(bx, by, bw, bh);   // agujero: el tablero
  ctx.fill("evenodd");
  return { ctx, k };
}

/* Quitar el diálogo de la escucha de «resize» cuando se cierre */
function onResizeWhileOpen(body, fn) {
  addEventListener("resize", fn, { passive: true });
  new MutationObserver((_, obs) => {
    if (!body.isConnected) { removeEventListener("resize", fn); obs.disconnect(); }
  }).observe(document.body, { childList: true });
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

/* map: el mapa (id, imageId, cols, rows, imgGrid, edges).
   onApply: avisa de las columnas y filas nuevas (para refrescar otros formularios).
   walls: al guardar, pasar a proponer muros y puertas. */
export function openGridFit(map, { onApply, walls = false } = {}) {
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
    const { ctx, k } = paintBase(canvas, view, img, g, input("zoom").checked);
    /* Líneas de la cuadrícula de Mesa */
    const bx = g.x, by = g.y, bw = g.cols * g.w, bh = g.rows * g.h;
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
        gray = gray || toGray(rgba(img), W, H);
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
          if (walls) openWallFit({ ...map, imgGrid: { x: g.x, y: g.y, w: g.w, h: g.h }, cols, rows });
        }
      }
    ]
  });

  onResizeWhileOpen(body, draw);

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

/* ---------- Muros y puertas ---------- */

/* map: el mapa con su cuadrícula ya encajada (imgGrid, cols, rows, edges) */
export function openWallFit(map) {
  if (!map.imageId) return toast("Este mapa no tiene imagen de fondo", "bad");
  if (!map.imgGrid) return toast("Primero encaja la cuadrícula con el plano", "bad");
  const g = { ...map.imgGrid, cols: map.cols, rows: map.rows };
  const existing = Object.keys(map.edges || {}).length + (map.walls || []).length;

  const body = document.createElement("div");
  body.className = "gridfit";
  body.innerHTML = `
    <p class="gridfit-status">Buscando muros y puertas en el plano…</p>
    <div class="gridfit-view"><canvas></canvas></div>
    <div class="row gridfit-tools">
      <label class="check"><input type="checkbox" name="zoom"> Ver a tamaño real</label>
      <span class="gridfit-legend"><i class="wall"></i>Muro <i class="diag"></i>Muro en diagonal <i class="door"></i>Puerta</span>
    </div>
    <fieldset>
      <legend>Cómo se ponen los muros</legend>
      <label class="check"><input type="radio" name="fit" value="brush" checked> Siguiendo la pared del plano, a mano alzada (como el pincel)</label>
      <label class="check" style="margin-top:6px"><input type="radio" name="fit" value="grid"> Por los bordes de la cuadrícula</label>
    </fieldset>
    <fieldset class="gridfit-ai">
      <legend>Ayuda para planos con mucho detalle</legend>
      <div class="row gridfit-help" role="radiogroup">
        <label class="check"><input type="radio" name="help" value="wand" checked> Varita mágica <small>(gratis)</small></label>
        <label class="check"><input type="radio" name="help" value="gemini"> Gemini <small>(gratis, con límites)</small></label>
        <label class="check"><input type="radio" name="help" value="claude"> Claude <small>(de pago)</small></label>
      </div>
      <div class="gridfit-ai-body"></div>
    </fieldset>
    <label class="field gridfit-range"><span>Sensibilidad</span>
      <span class="gridfit-range-row"><small>Menos muros</small>
      <input name="sens" type="range" min="0" max="1" step="0.05" value="0.5">
      <small>Más muros</small></span></label>
    ${existing ? `<fieldset>
      <legend>Este mapa ya tiene ${existing} muros o puertas</legend>
      <label class="check"><input type="radio" name="mode" value="replace" checked> Sustituirlos por los propuestos</label>
      <label class="check" style="margin-top:6px"><input type="radio" name="mode" value="add"> Añadir los propuestos y dejar los que hay</label>
    </fieldset>` : ""}
    <p class="hint">Es una propuesta: después se corrige con las herramientas Muro, Pincel, Puerta y Borrar
      del mapa. Las puertas salen cerradas y van siempre por la cuadrícula.</p>`;

  const canvas = body.querySelector("canvas");
  const view = body.querySelector(".gridfit-view");
  const status = body.querySelector(".gridfit-status");
  const input = n => body.querySelector(`[name="${n}"]`);
  const setStatus = (tone, text) => { status.className = "gridfit-status " + tone; status.textContent = text; };
  let img = null, pixels = null, measured = null, result = null, traced = null;
  let proposal = null;       // muros y puertas por la cuadrícula, y el suelo
  /* De dónde sale el suelo: la detección automática, la varita o una IA */
  let source = null;         // null · "wand" · "ai"
  const wand = { clicks: [], blocks: null, remove: false, tol: 45, holes: true };
  let ai = null;             // lo que ha dicho la IA: { floor, separators, failed, provider }
  const brush = () => body.querySelector('[name="fit"]:checked').value === "brush";
  const helpKind = () => body.querySelector('[name="help"]:checked').value;
  const NAMES = { claude: "Claude", gemini: "Gemini" };

  /* Las puertas que vio la detección, como separadores (para la varita) */
  const detectedDoors = edges => Object.entries(edges).filter(([k, t]) => t !== "wall" && /,(v|h)$/.test(k)).map(([k]) => {
    const [x, y, dir] = k.split(",");
    return dir === "v" ? { x: +x - 1, y: +y, side: "right", kind: "door" } : { x: +x, y: +y - 1, side: "below", kind: "door" };
  }).filter(sep => sep.x >= 0 && sep.y >= 0);

  function classify() {
    result = classifyWalls(measured, { sensitivity: +input("sens").value });
    if (source === "wand" && wand.clicks.length) {
      const floor = wandFloor(wand.blocks, wand.clicks, wand.tol, { holes: wand.holes });
      proposal = edgesFromAI(g.cols, g.rows, { floor, separators: detectedDoors(result.edges) });
    } else if (source === "ai" && ai) proposal = edgesFromAI(g.cols, g.rows, ai, result.floor);
    else proposal = { edges: result.edges, floor: result.floor };
    traced = brush() ? traceWalls(pixels, img.naturalWidth, img.naturalHeight, g, proposal.edges, { floor: proposal.floor }) : null;
    if (source === "wand" && wand.clicks.length) return helpSummary("Con la varita");
    if (source === "ai" && ai) return helpSummary(`Con la ayuda de ${NAMES[ai.provider]}`);
    const { walls, doors, diagonals, floorMask } = result.stats;
    const what = traced
      ? `${traced.walls.length} ${traced.walls.length === 1 ? "muro" : "muros"} a mano alzada y ${doors} ${doors === 1 ? "puerta" : "puertas"}`
      : `${walls} ${walls === 1 ? "muro" : "muros"}${diagonals ? ` (${diagonals} en diagonal)` : ""} y ${doors} ${doors === 1 ? "puerta" : "puertas"}`;
    if (!walls && !doors) setStatus("bad", "No encuentro muros claros en este plano. Prueba a subir la sensibilidad o ponlos a mano.");
    else if (floorMask) setStatus("good", `Propongo ${what}. Revísalos sobre el plano antes de ponerlos.`);
    else setStatus("warn", `Propongo ${what}. En este plano no distingo el suelo de lo que no lo es, así que solo
      salen muros dibujados como líneas largas: seguramente falten algunos.`);
    draw();
  }

  function draw() {
    if (!img) return;
    const { ctx, k } = paintBase(canvas, view, img, g, input("zoom").checked);
    if (!result) return;
    const X = c => g.x + c * g.w, Y = r => g.y + r * g.h;
    /* Con la varita: el suelo que sale, en verde, y dónde se ha pinchado */
    if (source === "wand" && wand.clicks.length) {
      ctx.fillStyle = "rgba(80,220,120,.22)";
      proposal.floor.forEach((f, i) => { if (f) ctx.fillRect(X(i % g.cols), Y(Math.floor(i / g.cols)), g.w, g.h); });
      for (const c of wand.clicks) {
        ctx.fillStyle = c.remove ? "#ff5a5a" : "#3ddc84";
        ctx.beginPath();
        ctx.arc(g.x + (c.i + 0.5) * wand.blocks.b, g.y + (c.j + 0.5) * wand.blocks.b, Math.max(4 / k, g.w * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (traced) {
      ctx.strokeStyle = "#ff3b3b";
      ctx.lineWidth = Math.max(2 / k, g.w * 0.1);
      ctx.beginPath();
      for (const w of traced.walls) {
        ctx.moveTo(X(w.points[0][0]), Y(w.points[0][1]));
        for (const [x, y] of w.points.slice(1)) ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
    }
    for (const [key, type] of Object.entries(traced ? traced.doors : proposal.edges)) {
      const [cx, cy, dir] = key.split(",");
      const x = +cx, y = +cy;
      ctx.strokeStyle = type === "door" ? "#3fd2ff" : dir === "d" || dir === "a" ? "#ffa31a" : "#ff3b3b";
      ctx.lineWidth = Math.max(2 / k, g.w * (type === "door" ? 0.22 : 0.14));
      ctx.beginPath();
      if (dir === "v") { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x), Y(y + 1)); }
      else if (dir === "d") { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + 1), Y(y + 1)); }
      else if (dir === "a") { ctx.moveTo(X(x + 1), Y(y)); ctx.lineTo(X(x), Y(y + 1)); }
      else { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + 1), Y(y)); }
      ctx.stroke();
    }
  }

  input("sens").addEventListener("input", () => { if (measured) classify(); });
  body.querySelectorAll('[name="fit"]').forEach(r => r.addEventListener("change", () => { if (measured) classify(); }));
  input("zoom").addEventListener("change", draw);

  const dialog = modal({
    title: "Muros y puertas del plano", body, wide: true,
    actions: [
      { label: "Ahora no" },
      {
        label: "Poner muros y puertas", tone: "primary",
        run: host => {
          if (!result) return false;
          const now = map.edges || {};
          const add = existing && host.querySelector('[name="mode"]:checked').value === "add";
          const nd = Object.values(proposal.edges).filter(t => t !== "wall").length;
          const doorsText = `${nd} ${nd === 1 ? "puerta" : "puertas"}`;
          if (traced) {
            /* Muros a mano alzada; las puertas, por la cuadrícula */
            patchMap(map.id, {
              edges: add ? { ...traced.doors, ...now } : { ...traced.doors },
              walls: add ? [...(map.walls || []), ...traced.walls] : traced.walls
            });
            const nw = traced.walls.length;
            toast(`${nw === 1 ? "Puesto 1 muro" : `Puestos ${nw} muros`} a mano alzada y ${doorsText}`, "good");
          } else {
            patchMap(map.id, add ? { edges: { ...proposal.edges, ...now } } : { edges: { ...proposal.edges }, walls: [] });
            const nw = Object.values(proposal.edges).filter(t => t === "wall").length;
            toast(`Puestos ${nw} muros y ${doorsText}`, "good");
          }
        }
      }
    ]
  });

  /* ---------- Ayudas: varita, Gemini y Claude ---------- */
  const aiBox = body.querySelector(".gridfit-ai-body");
  const tiles = planTiles(g.cols, g.rows);
  let aiInfo = null;         // lo que dice el servidor de cada IA

  function helpSummary(how) {
    const walls = traced ? traced.walls.length : Object.values(proposal.edges).filter(t => t === "wall").length;
    const doors = Object.values(proposal.edges).filter(t => t !== "wall").length;
    const what = `${walls} ${walls === 1 ? "muro" : "muros"}${traced ? " a mano alzada" : ""} y ${doors} ${doors === 1 ? "puerta" : "puertas"}`;
    if (source === "ai" && ai.failed) setStatus("warn", `${how} propongo ${what}. ${ai.failed} de ${tiles.length} partes no se pudieron analizar: ahí va la detección automática.`);
    else setStatus("good", `${how} propongo ${what}. Revísalos sobre el plano antes de ponerlos.`);
    draw();
  }

  /* ---- Varita mágica ---- */
  function paintWand() {
    aiBox.innerHTML = `
      <p class="hint">Pincha sobre el plano, en el suelo de cada sala y de cada pasillo: se rellena hasta donde llegue ese color
        (en verde). Si algo se queda fuera (una estantería contra la pared, una alfombra de otro color), pincha también encima.
        Los muebles sueltos dentro de una sala cuentan como suelo solos. Gratis y sin internet.</p>
      <div class="row">
        <button type="button" class="btn sm" data-wand="add" aria-pressed="${!wand.remove}">Añadir suelo</button>
        <button type="button" class="btn sm" data-wand="remove" aria-pressed="${wand.remove}">Quitar</button>
        <button type="button" class="btn sm" data-wand="undo" ${wand.clicks.length ? "" : "disabled"}>Deshacer</button>
        <button type="button" class="btn sm" data-wand="clear" ${wand.clicks.length ? "" : "disabled"}>Empezar de nuevo</button>
      </div>
      <label class="field gridfit-range"><span>Tolerancia del color</span>
        <span class="gridfit-range-row"><small>Menos</small>
        <input name="wandTol" type="range" min="10" max="120" step="5" value="${wand.tol}">
        <small>Más</small></span></label>
      <label class="check"><input type="checkbox" name="wandHoles" ${wand.holes ? "checked" : ""}> Contar los muebles sueltos como suelo</label>`;
    input("wandTol").addEventListener("input", e => { wand.tol = +e.target.value; if (wand.clicks.length && measured) classify(); });
    input("wandHoles").addEventListener("change", e => { wand.holes = e.target.checked; if (wand.clicks.length && measured) classify(); });
  }

  canvas.addEventListener("click", e => {
    if (helpKind() !== "wand" || !img || !pixels || !measured) return;
    const box = canvas.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width * img.naturalWidth, py = (e.clientY - box.top) / box.height * img.naturalHeight;
    if (!wand.blocks) wand.blocks = makeBlocks(pixels, img.naturalWidth, img.naturalHeight, g);
    const at = blockAt(wand.blocks, px, py);
    if (!at) return;
    wand.clicks.push({ ...at, remove: wand.remove });
    source = "wand";
    classify();
    paintWand();
  });

  /* ---- Gemini y Claude ---- */
  const KEY_HELP = {
    gemini: `Gemini, la IA de Google, distingue las paredes de los muebles, las alfombras y los escombros. Su plan gratuito no pide
      tarjeta: saca una clave en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>
      y pégala aquí. Tiene un límite de consultas por minuto y por día, así que las partes van de una en una. Ojo: en el plan
      gratuito Google puede usar lo que le mandas (las partes del plano, nada más) para mejorar sus productos.`,
    claude: `Claude, la IA de Anthropic, distingue las paredes de los muebles, las alfombras y los escombros. Es de pago: hace falta
      una clave de la API (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>)
      con saldo; cada parte cuesta unos céntimos.`
  };

  async function paintAI(provider, known) {
    if (known && aiInfo && !aiInfo.error) aiInfo = { ...aiInfo, [provider]: known };
    if (!aiInfo || aiInfo.error) {
      aiBox.innerHTML = `<p class="hint">Mirando si está disponible…</p>`;
      try { aiInfo = await aiStatus(); } catch (err) { aiInfo = { error: err.message }; }
      if (helpKind() !== provider) return;
    }
    if (aiInfo.error) {
      aiBox.innerHTML = `<p class="hint"></p>`;
      aiBox.querySelector("p").textContent = aiInfo.error;
      return;
    }
    const st = aiInfo[provider], name = NAMES[provider];
    if (!st.sdk) {
      aiBox.innerHTML = `<p class="hint">Falta el módulo de ${name} en el ordenador del DM. Cierra Mesa y vuelve a abrirla con
        «Abrir Mesa», que lo instala (hace falta internet), o ejecuta <code>npm install</code> en la carpeta de Mesa.</p>`;
      return;
    }
    if (!st.key) {
      aiBox.innerHTML = `
        <p class="hint">${KEY_HELP[provider]} La clave se guarda solo en este ordenador, en la carpeta de datos de Mesa, y no se le
          manda a nadie.</p>
        <div class="row"><input name="aiKey" type="password" autocomplete="off" placeholder="${provider === "claude" ? "sk-ant-…" : "AIza…"}" style="flex:1;min-width:0">
          <button type="button" class="btn sm" data-ai="key">Guardar clave</button></div>`;
      return;
    }
    const parts = tiles.length, mine = source === "ai" && ai && ai.provider === provider;
    aiBox.innerHTML = `
      <p class="hint">${name} mira el plano en ${parts} ${parts === 1 ? "parte" : "partes"} y dice qué es suelo y dónde hay paredes y
        puertas; después los muros se ajustan a la tinta como siempre. Se usa tu clave (${st.key === "env" ? "la del sistema" : "la guardada en Mesa"}).
        ${provider === "gemini" ? "Con el plan gratuito no cuesta nada, pero tiene un límite de consultas." : "Cada parte cuesta unos céntimos."}</p>
      <div class="row">
        <button type="button" class="btn sm primary" data-ai="run">${mine ? "Preguntar otra vez" : `Pedir ayuda a ${name}`}</button>
        ${mine ? `<button type="button" class="btn sm" data-ai="off">Volver a la detección automática</button>` : ""}
        ${st.key === "mesa" ? `<button type="button" class="btn sm" data-ai="forget">Olvidar la clave</button>` : ""}
      </div>`;
  }

  /* Una parte del plano para la IA: la imagen con la cuadrícula, las
     coordenadas y un recuadro en lo que se pregunta */
  function tileImage(t) {
    const v = t.view, vw = v.x1 - v.x0 + 1, vh = v.y1 - v.y0 + 1;
    const LABEL = 30;
    const S = Math.max(24, Math.min(72, Math.floor((1500 - LABEL) / Math.max(vw, vh))));
    const c = document.createElement("canvas");
    c.width = LABEL + vw * S; c.height = LABEL + vh * S;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#000"; ctx.fillRect(LABEL, LABEL, vw * S, vh * S);
    ctx.drawImage(img, g.x + v.x0 * g.w, g.y + v.y0 * g.h, vw * g.w, vh * g.h, LABEL, LABEL, vw * S, vh * S);
    ctx.strokeStyle = "rgba(255,0,255,.6)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= vw; i++) { ctx.moveTo(LABEL + i * S + 0.5, LABEL); ctx.lineTo(LABEL + i * S + 0.5, LABEL + vh * S); }
    for (let j = 0; j <= vh; j++) { ctx.moveTo(LABEL, LABEL + j * S + 0.5); ctx.lineTo(LABEL + vw * S, LABEL + j * S + 0.5); }
    ctx.stroke();
    ctx.fillStyle = "#000"; ctx.font = `bold ${S >= 40 ? 13 : 11}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < vw; i++) ctx.fillText(String(v.x0 + i), LABEL + (i + 0.5) * S, LABEL / 2);
    for (let j = 0; j < vh; j++) ctx.fillText(String(v.y0 + j), LABEL / 2, LABEL + (j + 0.5) * S);
    ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 3;
    ctx.strokeRect(LABEL + (t.x0 - v.x0) * S, LABEL + (t.y0 - v.y0) * S, (t.x1 - t.x0 + 1) * S, (t.y1 - t.y0 + 1) * S);
    return c.toDataURL("image/jpeg", 0.88).split(",")[1];
  }

  async function runAI(provider) {
    if (!img || !measured) return;
    const name = NAMES[provider];
    aiBox.innerHTML = `<p class="hint">${name} está mirando el plano (${tiles.length} ${tiles.length === 1 ? "parte" : "partes"}).
      Puede tardar un par de minutos${provider === "gemini" ? ", más si hay que esperar al límite del plan gratuito" : ""}…</p>`;
    setStatus("", `Esperando a ${name}…`);
    try {
      const { tiles: answers } = await aiWalls(provider, tiles.map(t => ({ x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1, image: tileImage(t) })));
      const merged = mergeTiles(g.cols, g.rows, tiles.map((tile, i) => ({ tile, answer: answers[i] && answers[i].answer })));
      const failed = answers.filter(a => !a || a.error).length;
      if (failed === tiles.length) throw new Error((answers[0] && answers[0].error) || `${name} no ha contestado`);
      ai = { ...merged, failed, provider };
      source = "ai";
      classify();
    } catch (err) {
      setStatus("bad", `No se pudo usar la ayuda de ${name}: ${err.message}`);
      if (err.status === 401) return paintAI(provider, { sdk: true, key: "" });
    }
    if (helpKind() === provider) paintAI(provider);
  }

  aiBox.addEventListener("click", async e => {
    const w = e.target.closest("[data-wand]");
    if (w) {
      const what = w.dataset.wand;
      if (what === "add" || what === "remove") wand.remove = what === "remove";
      if (what === "undo") wand.clicks.pop();
      if (what === "clear") wand.clicks = [];
      if ((what === "undo" || what === "clear") && measured) classify();
      return paintWand();
    }
    const b = e.target.closest("[data-ai]");
    if (!b) return;
    const what = b.dataset.ai, provider = helpKind();
    if (what === "run") return runAI(provider);
    if (what === "off") { source = null; ai = null; if (measured) classify(); return paintAI(provider); }
    try {
      if (what === "key") paintAI(provider, await aiSetKey(provider, aiBox.querySelector('[name="aiKey"]').value));
      if (what === "forget") paintAI(provider, await aiSetKey(provider, ""));
    } catch (err) { toast(err.message, "bad"); }
  });

  /* Al cambiar de ayuda se enseña la suya; la varita se queda con lo pinchado */
  function paintHelp() {
    const kind = helpKind();
    canvas.style.cursor = kind === "wand" ? "crosshair" : "";
    if (kind === "wand") {
      paintWand();
      if (wand.clicks.length && source !== "wand") { source = "wand"; if (measured) classify(); }
    } else paintAI(kind);
  }
  body.querySelectorAll('[name="help"]').forEach(r => r.addEventListener("change", paintHelp));
  paintHelp();

  onResizeWhileOpen(body, draw);

  loadImage(map.imageId).then(loaded => {
    img = loaded;
    draw();
    setTimeout(() => {
      try {
        pixels = rgba(img);
        measured = measureWalls(pixels, img.naturalWidth, img.naturalHeight, g);
        classify();
      } catch (err) {
        setStatus("bad", "No se pudo analizar la imagen: " + err.message);
      }
    }, 30);
  }).catch(() => setStatus("bad", "No se pudo cargar la imagen del plano."));

  return dialog;
}
