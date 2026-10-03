/* Ayuda de la IA para los muros: trocear el plano, juntar las respuestas y
   pasarlas a muros. Sin red: las respuestas de Claude se simulan.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { planTiles, mergeTiles, edgesFromAI, aiQuestion, AI_SCHEMA } from "../public/js/aiwalls.js";

test("las partes cubren el mapa entero sin solaparse y no pasan de 20 casillas", () => {
  for (const [cols, rows] of [[30, 20], [61, 37], [12, 9], [20, 20], [100, 100]]) {
    const tiles = planTiles(cols, rows);
    const seen = new Uint8Array(cols * rows);
    for (const t of tiles) {
      assert.ok(t.x1 - t.x0 + 1 <= 20 && t.y1 - t.y0 + 1 <= 20, JSON.stringify(t));
      assert.ok(t.view.x0 <= t.x0 && t.view.x1 >= t.x1 && t.view.x0 >= 0 && t.view.x1 < cols, "vista");
      for (let y = t.y0; y <= t.y1; y++) for (let x = t.x0; x <= t.x1; x++) seen[y * cols + x]++;
    }
    assert.ok(seen.every(v => v === 1), `${cols}×${rows}`);
  }
});

test("la pregunta dice exactamente qué casillas y cuántas filas", () => {
  const q = aiQuestion({ x0: 20, y0: 0, x1: 29, y1: 9 });
  assert.match(q, /x from 20 to 29/);
  assert.match(q, /exactly 10 strings/);
  assert.equal(AI_SCHEMA.additionalProperties, false);
});

test("se juntan las partes y se descartan separadores de fuera", () => {
  const tiles = planTiles(6, 3, 3);       // dos partes de 3×3
  const answers = [
    { tile: tiles[0], answer: { rows: ["###", "#..", "#.."], separators: [{ x: 2, y: 1, side: "right", kind: "door" }, { x: 4, y: 1, side: "right", kind: "wall" }], notes: "" } },
    { tile: tiles[1], answer: { rows: ["###", "..#"], separators: [], notes: "" } }       // le falta una fila
  ];
  const { floor, separators } = mergeTiles(6, 3, answers);
  assert.deepEqual(floor.slice(6, 12), [false, true, true, true, true, false]);
  assert.equal(floor[2 * 6 + 3], null, "la fila que faltaba queda sin saber");
  assert.deepEqual(separators, [{ x: 2, y: 1, side: "right", kind: "door" }]);
});

test("del suelo a muros: contorno, tabique entre suelos y puerta", () => {
  /* Dos salas de 2×2 pegadas, con un tabique con puerta entre ellas */
  const cols = 6, rows = 4;
  const floor = Array.from({ length: cols * rows }, (_, i) => { const x = i % cols, y = Math.floor(i / cols); return x >= 1 && x <= 4 && y >= 1 && y <= 2; });
  const separators = [{ x: 2, y: 1, side: "right", kind: "wall" }, { x: 2, y: 2, side: "right", kind: "door" }];
  const { edges, floor: mask } = edgesFromAI(cols, rows, { floor, separators });
  assert.equal(edges["3,1,v"], "wall");
  assert.equal(edges["3,2,v"], "door");
  assert.equal(edges["1,1,v"], "wall");
  assert.equal(edges["1,1,h"], "wall");
  assert.equal(edges["2,2,v"], undefined, "dentro de la sala no hay muro");
  assert.equal(Object.values(edges).filter(t => t === "wall").length, 4 + 4 + 2 + 2 + 1);
  assert.equal(mask.filter(Boolean).length, 8);
});

test("donde Claude no contestó se usa la detección", () => {
  const cols = 3, rows = 1;
  const { edges } = edgesFromAI(cols, rows, { floor: [true, null, false], separators: [] }, [false, true, true]);
  assert.equal(edges["0,0,v"], "wall");
  assert.equal(edges["2,0,v"], "wall", "la del medio es suelo por la detección y la de la derecha roca por Claude");
  assert.equal(edges["1,0,v"], undefined);
});
