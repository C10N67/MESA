/* Varita mágica: pinchar en el suelo y que salga qué casillas son suelo,
   con muebles dentro de la sala, una alfombra y una estantería contra la
   pared.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBlocks, blockAt, wandFloor, fillHoles, edgesFromFloor } from "../public/js/wand.js";

const C = 30, COLS = 20, ROWS = 14;
/* Sala de 3..15 × 2..10 */
const isFloor = (x, y) => x >= 3 && x <= 15 && y >= 2 && y <= 10;

function plan() {
  const W = COLS * C, H = ROWS * C, data = new Uint8ClampedArray(W * H * 3);
  let seed = 3;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const put = (x, y, c) => { const i = (y * W + x) * 3; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / C), cy = Math.floor(y / C);
      if (isFloor(cx, cy)) {
        const v = x % C === 0 || y % C === 0 ? 150 : 205 + (rand() - 0.5) * 12;   // tablones con cuadrícula
        put(x, y, [v, v - 20, v - 50]);
      } else { const v = 70 + (rand() - 0.5) * 50; put(x, y, [v, v, v + 5]); }
    }
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, c); };
  rect(6 * C + 4, 4 * C + 4, 8 * C - 4, 6 * C - 4, [80, 50, 25]);          // mesa
  rect(10 * C, 6 * C, 14 * C, 9 * C, [150, 30, 35]);                       // alfombra roja de 4×3
  rect(3 * C + 2, 7 * C, 3 * C + 26, 10 * C + 26, [70, 42, 25]);           // estantería contra la pared
  return { data, W, H };
}

const grid = { x: 0, y: 0, w: C, h: C, cols: COLS, rows: ROWS };
const wrong = floor => {
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (floor[y * COLS + x] !== isFloor(x, y)) out.push(`${x},${y}`);
  return out;
};

test("un pinchazo en el suelo saca la sala, con la mesa y la alfombra dentro", () => {
  const { data, W, H } = plan();
  const blocks = makeBlocks(data, W, H, grid, 3);
  const floor = wandFloor(blocks, [blockAt(blocks, 12 * C, 3 * C)], 45);
  /* Solo falla la estantería, que toca la pared y no es un hueco dentro de la sala */
  assert.deepEqual(wrong(floor), ["3,7", "3,8", "3,9", "3,10"]);
});

test("pinchando también en la estantería sale perfecto", () => {
  const { data, W, H } = plan();
  const blocks = makeBlocks(data, W, H, grid, 3);
  const floor = wandFloor(blocks, [blockAt(blocks, 12 * C, 3 * C), blockAt(blocks, 3 * C + 14, 8 * C)], 45);
  assert.deepEqual(wrong(floor), []);
});

test("un pinchazo de más en la roca se deshace con Quitar", () => {
  const { data, W, H } = plan();
  const blocks = makeBlocks(data, W, H, grid, 3);
  const rock = blockAt(blocks, C, 12 * C);
  const floor = wandFloor(blocks, [blockAt(blocks, 12 * C, 3 * C), rock, { ...rock, remove: true }], 45);
  assert.equal(wrong(floor).length, 4);
});

test("los huecos grandes o pegados al borde no se rellenan", () => {
  const cols = 12, rows = 8;
  const floor = Array.from({ length: cols * rows }, (_, i) => { const x = i % cols, y = Math.floor(i / cols); return x >= 1 && x <= 10 && y >= 1 && y <= 6; });
  floor[3 * cols + 3] = false;                                   // un barril: hueco de 1
  for (let y = 2; y <= 5; y++) for (let x = 5; x <= 9; x++) floor[y * cols + x] = false;   // un cuarto de 20: se rellena (≤ 30)
  const out = fillHoles(floor, cols, rows, 10);
  assert.equal(out[3 * cols + 3], true);
  assert.equal(out[3 * cols + 6], false, "más grande que el límite: es otra cosa");
  assert.equal(out[0], false, "lo de fuera no es un hueco");
});

test("del suelo a muros: contorno, tabique entre suelos y puerta", () => {
  /* Dos salas de 2×2 pegadas, con un tabique con puerta entre ellas */
  const cols = 6, rows = 4;
  const floor = Array.from({ length: cols * rows }, (_, i) => { const x = i % cols, y = Math.floor(i / cols); return x >= 1 && x <= 4 && y >= 1 && y <= 2; });
  const separators = [{ x: 2, y: 1, side: "right", kind: "wall" }, { x: 2, y: 2, side: "right", kind: "door" }];
  const { edges, floor: mask } = edgesFromFloor(cols, rows, { floor, separators });
  assert.equal(edges["3,1,v"], "wall");
  assert.equal(edges["3,2,v"], "door");
  assert.equal(edges["1,1,v"], "wall");
  assert.equal(edges["1,1,h"], "wall");
  assert.equal(edges["2,2,v"], undefined, "dentro de la sala no hay muro");
  assert.equal(Object.values(edges).filter(t => t === "wall").length, 4 + 4 + 2 + 2 + 1);
  assert.equal(mask.filter(Boolean).length, 8);
});
