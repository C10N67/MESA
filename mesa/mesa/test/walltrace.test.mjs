/* Muros del plano a mano alzada: partiendo de los muros por la cuadrícula,
   el trazo tiene que pegarse a la tinta del plano aunque no caiga en la
   línea, y seguir una sala redonda sin escalones.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { traceWalls, detectWalls } from "../public/js/wallfind.js";

const CELL = 24;

function canvas(cols, rows, paint) {
  const W = cols * CELL, H = rows * CELL;
  const data = new Uint8ClampedArray(W * H * 3);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = paint(x, y, rand);
      const i = (y * W + x) * 3;
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }
  return { data, W, H, grid: { x: 0, y: 0, w: CELL, h: CELL, cols, rows } };
}

/* Los muros que separan las casillas de dentro de las de fuera */
function edgesOf(cols, rows, inside) {
  const edges = {};
  for (let y = 0; y < rows; y++)
    for (let x = 0; x <= cols; x++) if (inside(x - 1, y) !== inside(x, y)) edges[`${x},${y},v`] = "wall";
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x < cols; x++) if (inside(x, y - 1) !== inside(x, y)) edges[`${x},${y},h`] = "wall";
  return edges;
}

const allPoints = walls => walls.flatMap(w => w.points);

test("la pared desplazada de la cuadrícula se sigue por la tinta", () => {
  /* Sala de las casillas 3..14 × 3..10; la tinta va 7 px (0,29 casillas) hacia dentro */
  const off = 7, L = 3 * CELL + off, R = 15 * CELL - off, T = 3 * CELL + off, B = 11 * CELL - off;
  const img = canvas(18, 14, (x, y, rand) => {
    const ink = (Math.abs(x - L) <= 1 || Math.abs(x - R) <= 1) && y >= T - 1 && y <= B + 1
      || (Math.abs(y - T) <= 1 || Math.abs(y - B) <= 1) && x >= L - 1 && x <= R + 1;
    if (ink) return [25, 25, 25];
    const inRoom = x > L && x < R && y > T && y < B;
    const v = inRoom ? 230 + (rand() - 0.5) * 8 : 140 + (rand() - 0.5) * 60;
    return [v, v - 4, v - 12];
  });
  const edges = edgesOf(18, 14, (x, y) => x >= 3 && x <= 14 && y >= 3 && y <= 10);
  const { walls, doors } = traceWalls(img.data, img.W, img.H, img.grid, edges, { channels: 3 });
  assert.deepEqual(doors, {});
  const want = { left: L / CELL, right: R / CELL, top: T / CELL, bottom: B / CELL };
  for (const [x, y] of allPoints(walls)) {
    const d = Math.min(Math.abs(x - want.left), Math.abs(x - want.right), Math.abs(y - want.top), Math.abs(y - want.bottom));
    assert.ok(d < 0.08, `punto (${x}, ${y}) a ${d.toFixed(2)} casillas de la tinta`);
  }
  /* Las esquinas se mueven juntas: los tramos siguen unidos */
  const ends = walls.flatMap(w => [w.points[0], w.points[w.points.length - 1]]).map(p => p.join(","));
  for (const e of ends) assert.ok(ends.filter(o => o === e).length >= 2, "extremo suelto en " + e);
});

test("una sala redonda sale redonda, sin escalones", () => {
  const cx = 10 * CELL, cy = 9 * CELL, r = 6.2 * CELL;
  const img = canvas(20, 18, (x, y, rand) => {
    const d = Math.hypot(x - cx, y - cy);
    if (Math.abs(d - r) <= 1.5) return [25, 25, 25];
    const v = d < r ? 230 + (rand() - 0.5) * 8 : 140 + (rand() - 0.5) * 60;
    return [v, v - 4, v - 12];
  });
  const inside = (x, y) => Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy) < r;
  const edges = edgesOf(20, 18, inside);
  const { walls } = traceWalls(img.data, img.W, img.H, img.grid, edges, { channels: 3 });
  const pts = allPoints(walls);
  const err = pts.map(([x, y]) => Math.abs(Math.hypot(x * CELL - cx, y * CELL - cy) - r) / CELL);
  const mean = err.reduce((a, b) => a + b, 0) / err.length;
  /* Por la cuadrícula, el error medio de la escalera es de un cuarto de casilla */
  const gridErr = Object.keys(edges).map(k => {
    const [x, y, dir] = k.split(",").map((v, i) => (i < 2 ? +v : v));
    const mx = dir === "v" ? x : x + 0.5, my = dir === "v" ? y + 0.5 : y;
    return Math.abs(Math.hypot(mx * CELL - cx, my * CELL - cy) - r) / CELL;
  });
  const gridMean = gridErr.reduce((a, b) => a + b, 0) / gridErr.length;
  assert.ok(mean < 0.12, `error medio ${mean.toFixed(3)} casillas`);
  assert.ok(mean < gridMean / 2, `a mano alzada ${mean.toFixed(3)} frente a ${gridMean.toFixed(3)} por la cuadrícula`);
});

test("las puertas se quedan en la cuadrícula y los muros llegan hasta ellas", () => {
  const edges = { "2,1,v": "wall", "2,2,v": "door", "2,3,v": "wall" };
  const img = canvas(5, 5, () => [200, 200, 200]);
  const { walls, doors } = traceWalls(img.data, img.W, img.H, img.grid, edges, { channels: 3 });
  assert.deepEqual(doors, { "2,2,v": "door" });
  const ends = walls.flatMap(w => [w.points[0], w.points[w.points.length - 1]]).map(p => p.join(","));
  assert.ok(ends.includes("2,2") && ends.includes("2,3"), ends.join(" "));
});

test("una mesa de tinta pegada a la pared no se lleva el muro hacia dentro", () => {
  /* Sala 3..14 × 3..10 con la tinta en la línea de la cuadrícula, y una mesa
     negra a 0,6 casillas de la pared izquierda, de la fila 5 a la 8 */
  const L = 3 * CELL, R = 15 * CELL, T = 3 * CELL, B = 11 * CELL;
  const img = canvas(18, 14, (x, y, rand) => {
    const ink = (Math.abs(x - L) <= 1 || Math.abs(x - R) <= 1) && y >= T - 1 && y <= B + 1
      || (Math.abs(y - T) <= 1 || Math.abs(y - B) <= 1) && x >= L - 1 && x <= R + 1;
    const table = x >= L + 0.6 * CELL && x <= L + 1.6 * CELL && y >= 5 * CELL && y <= 9 * CELL;
    if (ink || table) return [25, 25, 25];
    const inRoom = x > L && x < R && y > T && y < B;
    const v = inRoom ? 230 + (rand() - 0.5) * 8 : 140 + (rand() - 0.5) * 60;
    return [v, v - 4, v - 12];
  });
  const edges = edgesOf(18, 14, (x, y) => x >= 3 && x <= 14 && y >= 3 && y <= 10);
  const floor = Array.from({ length: 18 * 14 }, (_, i) => { const x = i % 18, y = Math.floor(i / 18); return x >= 3 && x <= 14 && y >= 3 && y <= 10; });
  const { walls } = traceWalls(img.data, img.W, img.H, img.grid, edges, { channels: 3, floor });
  for (const [x, y] of allPoints(walls)) {
    if (y > 4 && y < 10 && x < 6) assert.ok(x < 3.3, `el muro se ha ido a (${x}, ${y})`);
  }
});
