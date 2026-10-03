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
      con mucho detalle se puede pedir ayuda a Claude (aiwalls.js): dice qué
      casillas son suelo y dónde hay tabiques y puertas, y el trazado los pega
      a la tinta igual que siempre. */

import { modal, toast, imgURL } from "./util.js";
import { patchMap, aiStatus, aiSetKey, aiWalls } from "./net.js";
import { MAX_COLS, MAX_ROWS } from "./schema.js";
import { toGray, detectGrid, fitCount } from "./gridfind.js";
import { measureWalls, classifyWalls, traceWalls } from "./wallfind.js";
import { planTiles, mergeTiles, edgesFromAI } from "./aiwalls.js";

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
      <legend>Ayuda de la IA (Claude)</legend>
      <div class="gridfit-ai-body"><p class="hint">Mirando si está disponible…</p></div>
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
  let ai = null;             // lo que ha dicho Claude: { floor, separators, failed }
  let proposal = null;       // muros y puertas por la cuadrícula, y el suelo
  const brush = () => body.querySelector('[name="fit"]:checked').value === "brush";

  function classify() {
    result = classifyWalls(measured, { sensitivity: +input("sens").value });
    proposal = ai ? edgesFromAI(g.cols, g.rows, ai, result.floor) : { edges: result.edges, floor: result.floor };
    traced = brush() ? traceWalls(pixels, img.naturalWidth, img.naturalHeight, g, proposal.edges, { floor: proposal.floor }) : null;
    if (ai) return aiSummary();
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

  /* ---------- Ayuda de la IA ---------- */
  const aiBox = body.querySelector(".gridfit-ai-body");
  const tiles = planTiles(g.cols, g.rows);

  function aiSummary() {
    const walls = traced ? traced.walls.length : Object.values(proposal.edges).filter(t => t === "wall").length;
    const doors = Object.values(proposal.edges).filter(t => t !== "wall").length;
    const what = `${walls} ${walls === 1 ? "muro" : "muros"}${traced ? " a mano alzada" : ""} y ${doors} ${doors === 1 ? "puerta" : "puertas"}`;
    if (ai.failed) setStatus("warn", `Con la ayuda de Claude propongo ${what}. ${ai.failed} de ${tiles.length} partes no se pudieron analizar: ahí va la detección automática.`);
    else setStatus("good", `Con la ayuda de Claude propongo ${what}. Revísalos sobre el plano antes de ponerlos.`);
    draw();
  }

  async function paintAI(known) {
    let st = known;
    if (!st) {
      try { st = await aiStatus(); } catch (err) { st = { error: err.message }; }
    }
    if (st.error) {
      aiBox.innerHTML = `<p class="hint"></p>`;
      aiBox.querySelector("p").textContent = st.error;
      return;
    }
    if (!st.sdk) {
      aiBox.innerHTML = `<p class="hint">Falta el módulo de la IA en el ordenador del DM. Cierra Mesa y vuelve a abrirla con
        «Abrir Mesa», que lo instala (hace falta internet), o ejecuta <code>npm install</code> en la carpeta de Mesa.</p>`;
      return;
    }
    if (!st.key) {
      aiBox.innerHTML = `
        <p class="hint">Claude distingue las paredes de los muebles, las alfombras y los escombros, que es donde la detección
          automática se confunde. Hace falta una clave de la API de Claude (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>).
          Se guarda solo en este ordenador, en la carpeta de datos de Mesa, y no se le manda a nadie.</p>
        <div class="row"><input name="aiKey" type="password" autocomplete="off" placeholder="sk-ant-…" style="flex:1;min-width:0">
          <button type="button" class="btn sm" data-ai="key">Guardar clave</button></div>`;
      return;
    }
    const parts = tiles.length;
    aiBox.innerHTML = `
      <p class="hint">Claude mira el plano en ${parts} ${parts === 1 ? "parte" : "partes"} y dice qué es suelo y dónde hay paredes y puertas;
        después los muros se ajustan a la tinta como siempre. Se usa tu clave (${st.key === "env" ? "la del sistema" : "la guardada en Mesa"}):
        cada parte cuesta unos céntimos y tarda un poco.</p>
      <div class="row">
        <button type="button" class="btn sm primary" data-ai="run">${ai ? "Preguntar otra vez" : "Pedir ayuda a Claude"}</button>
        ${ai ? `<button type="button" class="btn sm" data-ai="off">Volver a la detección automática</button>` : ""}
        ${st.key === "mesa" ? `<button type="button" class="btn sm" data-ai="forget">Olvidar la clave</button>` : ""}
      </div>`;
  }

  /* Una parte del plano para Claude: la imagen con la cuadrícula, las
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

  async function runAI() {
    if (!img || !measured) return;
    aiBox.innerHTML = `<p class="hint">Claude está mirando el plano (${tiles.length} ${tiles.length === 1 ? "parte" : "partes"}). Puede tardar un par de minutos…</p>`;
    setStatus("", "Esperando a Claude…");
    try {
      const { tiles: answers } = await aiWalls(tiles.map(t => ({ x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1, image: tileImage(t) })));
      const merged = mergeTiles(g.cols, g.rows, tiles.map((tile, i) => ({ tile, answer: answers[i] && answers[i].answer })));
      const failed = answers.filter(a => !a || a.error).length;
      if (failed === tiles.length) throw new Error((answers[0] && answers[0].error) || "Claude no ha contestado");
      ai = { ...merged, failed };
      classify();
    } catch (err) {
      setStatus("bad", "No se pudo usar la ayuda de Claude: " + err.message);
      if (err.status === 401) { await paintAI({ sdk: true, key: "" }); return; }
    }
    paintAI();
  }

  aiBox.addEventListener("click", async e => {
    const b = e.target.closest("[data-ai]");
    if (!b) return;
    const what = b.dataset.ai;
    if (what === "run") return runAI();
    if (what === "off") { ai = null; if (measured) classify(); return paintAI(); }
    try {
      if (what === "key") paintAI(await aiSetKey(aiBox.querySelector('[name="aiKey"]').value));
      if (what === "forget") paintAI(await aiSetKey(""));
    } catch (err) { toast(err.message, "bad"); }
  });
  paintAI();

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
