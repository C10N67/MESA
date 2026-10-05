/* Retratos recortados: de una ilustración a una figura sin fondo, lista para
   la ficha del mapa y la página del bestiario.

   Todo pasa en el navegador, sin servicios de fuera:
   1. Si la imagen ya trae transparencia, se respeta tal cual.
   2. Si no, se toma el color del borde (el papel, el blanco, la aguada) y se
      «inunda» desde los bordes hacia dentro mientras el color se parezca al
      de al lado y no se aleje demasiado del fondo. Así se van los degradados
      suaves del papel pero se para en el contorno de la figura.
   3. Los huecos cerrados del mismo color casi exacto del fondo (entre un brazo
      y el cuerpo, por ejemplo) también se vacían.
   4. El borde se suaviza un píxel, se recorta lo que sobra y la figura se
      centra en un cuadrado con fondo transparente.

   Funciona bien con lo habitual en los manuales: una figura sobre papel o
   blanco. Con fondos de escena (un paisaje, una mazmorra) no hay forma
   fiable de saber qué es figura, y se deja la imagen como está. */

import { el, modal } from "./util.js";

const WORK = 640;         // lado máximo al que se procesa
const dist = (d, i, r, g, b) => Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b);

function load(file) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

/* Devuelve { canvas, removed }: removed dice si se quitó el fondo */
export function cutout(source) {
  const scale = Math.min(1, WORK / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale)), h = Math.max(1, Math.round(source.height * scale));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h), d = data.data, n = w * h;

  /* Por dónde empezar: el borde de la imagen o, si ya viene recortada, el
     anillo de píxeles pintados que toca lo transparente (la mancha de
     acuarela o de papel que algunas ilustraciones traen detrás). */
  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
  const isClear = p => d[p * 4 + 3] < 32;
  const cut = border.filter(isClear).length > border.length * 0.3;
  let ring = border;
  if (cut) {
    ring = [];
    for (let p = 0; p < n; p++) {
      if (d[p * 4 + 3] < 160) continue;
      const x = p % w, y = (p / w) | 0, thin = q => d[q * 4 + 3] < 160;
      if ((x > 0 && thin(p - 1)) || (x < w - 1 && thin(p + 1)) || (y > 0 && thin(p - w)) || (y < h - 1 && thin(p + w))) ring.push(p);
    }
    if (ring.length < 50) return { canvas: cv, removed: false };
  }

  /* Una mancha de fondo es gris o poco saturada, ni muy oscura ni blanca del
     todo: así se distingue de las patas, la ropa o el humo de la figura */
  const wash = j => { const mx = Math.max(d[j], d[j + 1], d[j + 2]), mn = Math.min(d[j], d[j + 1], d[j + 2]); return mx - mn < 56 && mx > 105 && mx < 246; };
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0, R = 255, G = 255, B = 255;
  const grow = accept => {
    while (head < tail) {
      const p = queue[head++], x = p % w, y = (p / w) | 0, i = p * 4;
      const look = q => {
        if (bg[q]) return;
        if (accept(q * 4, i)) { bg[q] = 1; queue[tail++] = q; }
      };
      if (x > 0) look(p - 1);
      if (x < w - 1) look(p + 1);
      if (y > 0) look(p - w);
      if (y < h - 1) look(p + w);
    }
  };

  if (cut) {
    /* Ya recortada: solo se quita la mancha si es buena parte del contorno */
    const seeds = ring.filter(p => wash(p * 4));
    if (seeds.length < ring.length * 0.25) return { canvas: cv, removed: false };
    for (let p = 0; p < n; p++) if (isClear(p)) bg[p] = 1;
    for (const p of seeds) { bg[p] = 1; queue[tail++] = p; }
    grow((j, i) => d[j + 3] < 32 || (wash(j) && dist(d, j, d[i], d[i + 1], d[i + 2]) < 34));
  } else {
    /* El color del fondo: la mediana del borde, canal a canal */
    const med = c => { const v = ring.map(p => d[p * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
    R = med(0); G = med(1); B = med(2);
    /* Si el borde es muy variado, es una escena y no un fondo: se deja */
    const near = ring.filter(p => dist(d, p * 4, R, G, B) < 70).length;
    if (near < ring.length * 0.6) return { canvas: cv, removed: false };
    /* Lo claro y poco saturado se parece más al papel que a la figura */
    const paper = j => { const mx = Math.max(d[j], d[j + 1], d[j + 2]), mn = Math.min(d[j], d[j + 1], d[j + 2]); return mx > 175 && mx - mn < 95; };
    for (const p of ring) if (dist(d, p * 4, R, G, B) < 80) { bg[p] = 1; queue[tail++] = p; }
    grow((j, i) => {
      const step = dist(d, j, d[i], d[i + 1], d[i + 2]), far = dist(d, j, R, G, B);
      return d[j + 3] < 32 || (far < 170 && (step < 30 || (step < 60 && paper(j))));
    });
  }
  const HOLE = 24;

  /* Huecos cerrados del color del fondo, si son de buen tamaño */
  const seen = new Uint8Array(n), minHole = Math.max(40, n * 0.002);
  for (let p = 0; p < n && !cut; p++) {
    if (bg[p] || seen[p] || dist(d, p * 4, R, G, B) >= HOLE) continue;
    head = tail = 0; queue[tail++] = p; seen[p] = 1;
    while (head < tail) {
      const q = queue[head++], x = q % w, y = (q / w) | 0;
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (r < 0 || seen[r] || bg[r] || dist(d, r * 4, R, G, B) >= HOLE) continue;
        seen[r] = 1; queue[tail++] = r;
      }
    }
    if (tail >= minHole) for (let k = 0; k < tail; k++) bg[queue[k]] = 1;
  }

  /* Alfa con el borde suavizado (media de 3×3) */
  const alpha = new Uint8ClampedArray(n);
  for (let p = 0; p < n; p++) alpha[p] = bg[p] ? 0 : d[p * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (bg[p]) { d[p * 4 + 3] = 0; continue; }
    let sum = 0, cnt = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      sum += alpha[yy * w + xx]; cnt++;
    }
    d[p * 4 + 3] = Math.min(alpha[p], Math.round(sum / cnt * 1.15));
  }
  ctx.putImageData(data, 0, 0);
  return { canvas: cv, removed: true };
}

/* La varita: borra la zona del color de (x, y) que esté unida a ese punto.
   `tol` va de 5 (solo ese color casi exacto) a 100 (bastante permisiva). */
export function erase(canvas, x, y, tol = 40) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width: w, height: h } = canvas, data = ctx.getImageData(0, 0, w, h), d = data.data;
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  const s0 = (y * w + x) * 4;
  if (d[s0 + 3] < 16) return 0;
  const R = d[s0], G = d[s0 + 1], B = d[s0 + 2], n = w * h;
  const hit = new Uint8Array(n), queue = new Int32Array(n);
  let head = 0, tail = 0;
  hit[y * w + x] = 1; queue[tail++] = y * w + x;
  while (head < tail) {
    const p = queue[head++], px = p % w, py = (p / w) | 0, i = p * 4;
    const look = q => {
      if (hit[q]) return;
      const j = q * 4;
      if (d[j + 3] < 16) return;
      if (dist(d, j, R, G, B) < tol * 2.2 && dist(d, j, d[i], d[i + 1], d[i + 2]) < tol) { hit[q] = 1; queue[tail++] = q; }
    };
    if (px > 0) look(p - 1);
    if (px < w - 1) look(p + 1);
    if (py > 0) look(p - w);
    if (py < h - 1) look(p + w);
  }
  /* Lo borrado y, suavizado, un píxel de su borde */
  for (let k = 0; k < tail; k++) d[queue[k] * 4 + 3] = 0;
  for (let k = 0; k < tail; k++) {
    const p = queue[k], px = p % w, py = (p / w) | 0;
    for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]) {
      if (q >= 0 && !hit[q] && d[q * 4 + 3] > 0) d[q * 4 + 3] = Math.round(d[q * 4 + 3] * 0.6);
    }
  }
  ctx.putImageData(data, 0, 0);
  return tail;
}

/* Recorta lo transparente y centra la figura en un cuadrado de `size` */
export function framed(canvas, size = 256) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width: w, height: h } = canvas, d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] < 24) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, pad = size * 0.04;
  const s = Math.min((size - pad * 2) / bw, (size - pad * 2) / bh);
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const o = out.getContext("2d");
  o.imageSmoothingQuality = "high";
  o.drawImage(canvas, x0, y0, bw, bh, (size - bw * s) / 2, (size - bh * s) / 2, bw * s, bh * s);
  return out;
}

/* De un archivo a un retrato listo para subir: { blob, removed } */
export async function portraitFromFile(file, size = 256) {
  const img = await load(file);
  const { canvas, removed } = cutout(img);
  const out = framed(canvas, size);
  const blob = await new Promise((ok, ko) => out.toBlob(b => b ? ok(b) : ko(new Error("No se pudo procesar la imagen")), "image/webp", 0.9));
  return { blob, removed };
}

/* El taller del retrato: enseña el recorte automático sobre un damero y deja
   pulsar lo que quede de fondo para borrarlo, deshacer o volver al original.
   Devuelve el retrato listo para subir (un Blob) o null si se cancela. */
export async function editPortrait(file, { size = 256, title = "Retrato" } = {}) {
  const img = await load(file);
  const original = document.createElement("canvas");
  const scale = Math.min(1, WORK / Math.max(img.width, img.height));
  original.width = Math.max(1, Math.round(img.width * scale));
  original.height = Math.max(1, Math.round(img.height * scale));
  original.getContext("2d").drawImage(img, 0, 0, original.width, original.height);
  const auto = cutout(img);
  const view = auto.canvas;
  const vctx = view.getContext("2d", { willReadFrequently: true });
  const history = [];
  const snap = () => { history.push(vctx.getImageData(0, 0, view.width, view.height)); if (history.length > 20) history.shift(); };
  const restore = source => { snap(); vctx.clearRect(0, 0, view.width, view.height); vctx.drawImage(source, 0, 0); };

  const body = el(`<div class="cut-ed">
    <div class="cut-stage"></div>
    <p class="cut-hint"><span>${auto.removed ? "El fondo se ha quitado solo." : "No se ha visto un fondo claro que quitar."}</span>
      <span>Pulsa sobre lo que quede de fondo para borrarlo.</span></p>
    <div class="cut-tools">
      <label class="cut-tol"><span>Tolerancia</span><input type="range" min="5" max="100" value="40"></label>
      <button type="button" class="btn sm" data-cut="undo">Deshacer</button>
      <button type="button" class="btn sm" data-cut="auto">Fondo automático</button>
      <button type="button" class="btn sm" data-cut="orig">Imagen original</button>
    </div>
  </div>`);
  body.querySelector(".cut-stage").appendChild(view);
  view.className = "cut-canvas";
  const tol = body.querySelector("input[type=range]");
  view.addEventListener("click", e => {
    const r = view.getBoundingClientRect();
    const x = (e.clientX - r.left) * view.width / r.width, y = (e.clientY - r.top) * view.height / r.height;
    snap();
    if (!erase(view, x, y, +tol.value)) history.pop();
  });
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-cut]");
    if (!b) return;
    if (b.dataset.cut === "undo") { const last = history.pop(); if (last) vctx.putImageData(last, 0, 0); }
    if (b.dataset.cut === "auto") restore(cutout(img).canvas);
    if (b.dataset.cut === "orig") restore(original);
  });

  return new Promise(resolve => {
    let done = false, saving = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const m = modal({
      title, body, wide: true,
      actions: [{ label: "Cancelar", run: () => finish(null) }, {
        label: "Guardar retrato", tone: "primary",
        run: () => { saving = true; framed(view, size).toBlob(b => finish(b), "image/webp", 0.9); }
      }]
    });
    /* Cerrado con la ×, con Escape o pulsando fuera: como cancelar */
    const back = m.body.closest(".modal-back");
    const watch = new MutationObserver(() => { if (!back.isConnected) { watch.disconnect(); if (!saving) finish(null); } });
    watch.observe(document.body, { childList: true });
  });
}
