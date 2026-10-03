/* Pruebas del buscador de cuadrícula con planos sintéticos: textura al azar,
   cuadrícula fina con tamaño de casilla no entero, muros gruesos cada varias
   casillas (que despistan hacia un múltiplo), juntas de baldosa más claras a
   media casilla (que despistan hacia la mitad) y bloques de JPEG.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectGrid } from "../public/js/gridfind.js";

function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function synth({ w, h, cell, ox = 0, oy = 0, grid = 28, tiles = 0, walls = 3, blocks = true, seed = 1 }) {
  const rand = rng(seed);
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = 150 + (rand() - 0.5) * 50;
  /* Posiciones de las líneas (con decimales) y cuánto oscurecen */
  const lines = (start, len) => {
    const out = [];
    for (let p = start - Math.ceil(start / cell) * cell; p < len; p += cell) {
      if (grid && p >= 0) out.push([p, grid]);
      if (tiles && p + cell / 2 >= 0 && p + cell / 2 < len) out.push([p + cell / 2, tiles]);
    }
    return out;
  };
  /* Una línea de 1 px en una posición con decimales se reparte entre dos píxeles */
  for (const [x, a] of lines(ox, w)) {
    const i = Math.floor(x), f = x - i;
    for (let y = 0; y < h; y++) {
      g[y * w + i] -= a * (1 - f);
      if (i + 1 < w) g[y * w + i + 1] -= a * f;
    }
  }
  for (const [y, a] of lines(oy, h)) {
    const i = Math.floor(y), f = y - i;
    for (let x = 0; x < w; x++) {
      g[i * w + x] -= a * (1 - f);
      if (i + 1 < h) g[(i + 1) * w + x] -= a * f;
    }
  }
  /* Salas: marcos oscuros y gruesos alineados con la cuadrícula, de `walls` casillas */
  if (walls) {
    const span = cell * walls;
    for (let r = 0; r < 14; r++) {
      const cx = ox + Math.floor(rand() * (w / span)) * span, cy = oy + Math.floor(rand() * (h / span)) * span;
      for (let y = Math.max(0, Math.round(cy)); y < Math.min(h, cy + span); y++)
        for (let x = Math.max(0, Math.round(cx)); x < Math.min(w, cx + span); x++)
          if (y - cy < 4 || cy + span - y < 4 || x - cx < 4 || cx + span - x < 4) g[y * w + x] = 40;
    }
  }
  if (blocks) for (let y = 0; y < h; y++) for (let x = 7; x < w; x += 8) g[y * w + x] += 4;
  return g;
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const offBy = (got, want, cell) => {
  const d = (((got - want) % cell) + cell) % cell;
  return Math.min(d, cell - d);
};

for (const [cell, ox, oy] of [[11.15, 3.2, 7.9], [17.4, 0.6, 1.7], [30.08, 12.3, 0], [52.5, 20, 40]]) {
  test(`casilla de ${cell} px`, () => {
    const w = 900, h = 700;
    const r = detectGrid(synth({ w, h, cell, ox, oy, seed: Math.round(cell * 10) }), w, h);
    assert.ok(near(r.cellW, cell, cell * 0.005), `ancho ${r.cellW}`);
    assert.ok(near(r.cellH, cell, cell * 0.005), `alto ${r.cellH}`);
    assert.ok(offBy(r.x, ox, cell) < 1, `x ${r.x}`);
    assert.ok(offBy(r.y, oy, cell) < 1, `y ${r.y}`);
    assert.ok(r.confidence >= 0.6, `confianza ${r.confidence}`);
  });
}

test("las juntas de baldosa a media casilla no la parten en dos", () => {
  const w = 1000, h = 1000, cell = 39.4;
  const r = detectGrid(synth({ w, h, cell, ox: 5, oy: 9, grid: 30, tiles: 7, seed: 5 }), w, h);
  assert.ok(near(r.cellW, cell, 0.3), `ancho ${r.cellW}`);
  assert.ok(near(r.cellH, cell, 0.3), `alto ${r.cellH}`);
});

test("cuenta columnas y filas con trozos de casilla en el borde", () => {
  const w = 1000, h = 640, cell = 40;
  /* Primera línea en x=30 (queda un trozo de 30 px: cuenta) e y=5 (trozo de 5: no) */
  const r = detectGrid(synth({ w, h, cell, ox: 30, oy: 5, seed: 9 }), w, h);
  assert.ok(near(r.x, -10, 1), `x ${r.x}`);
  assert.ok(near(r.y, 5, 1), `y ${r.y}`);
  assert.equal(r.cols, 25);
  assert.equal(r.rows, 16);
});

test("sin cuadrícula, poca confianza", () => {
  const w = 800, h = 600;
  const r = detectGrid(synth({ w, h, cell: 20, grid: 0, walls: 0, seed: 3 }), w, h);
  assert.ok(r.confidence < 0.4, `confianza ${r.confidence}`);
});
