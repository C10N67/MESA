/* Salas: cada trozo continuo es una sala distinta. Dos trozos pintados con
   el mismo número que no se tocan, o que separa un muro (de la cuadrícula o
   a mano alzada), pasan a ser salas distintas; el más grande se queda el
   número, y con él el nombre y el color que le haya puesto el DM.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../public/js/engine.js";
import { emptyDoc, cellKey, edgeKey, normalizeMap } from "../public/js/schema.js";
import { roomsOf, splitRooms } from "../public/js/los.js";

const paint = (rooms, x0, y0, x1, y1, id) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) rooms[cellKey(x, y)] = id; };
const ids = map => [...new Set(Object.values(map.rooms))].sort((a, b) => a - b);
const blank = () => { const m = normalizeMap({ cols: 20, rows: 12 }); m.rooms = {}; return m; };

test("dos trozos que no se tocan son dos salas", () => {
  const map = blank();
  paint(map.rooms, 1, 1, 4, 4, 1);          // 16 casillas
  paint(map.rooms, 8, 1, 9, 2, 1);          // 4 casillas, separado
  const next = splitRooms(map);
  assert.ok(next);
  map.rooms = next;
  assert.deepEqual(ids(map), [1, 2]);
  assert.equal(map.rooms[cellKey(2, 2)], 1, "el grande conserva el número");
  assert.equal(map.rooms[cellKey(8, 1)], 2);
  assert.equal(splitRooms(map), null, "ya no hay nada que separar");
});

test("una sala de una pieza no se toca", () => {
  const map = blank();
  paint(map.rooms, 1, 1, 6, 4, 3);
  assert.equal(splitRooms(map), null);
});

test("un muro de la cuadrícula parte la sala en dos", () => {
  const map = blank();
  paint(map.rooms, 1, 1, 6, 3, 1);
  for (let y = 1; y <= 3; y++) map.edges[edgeKey(4, y, "v")] = "wall";    // entre x=3 y x=4
  map.rooms = splitRooms(map);
  assert.deepEqual(ids(map), [1, 2]);
  assert.notEqual(map.rooms[cellKey(3, 2)], map.rooms[cellKey(4, 2)]);
});

test("un muro a mano alzada también la parte", () => {
  const map = blank();
  paint(map.rooms, 1, 1, 6, 3, 1);
  map.walls = [{ id: "w", points: [[4, 0.5], [4, 4.5]] }];
  assert.equal(roomsOf(map).list.length, 2);
  map.rooms = splitRooms(map);
  assert.deepEqual(ids(map), [1, 2]);
});

test("una puerta abierta en el muro sigue separándolas", () => {
  const map = blank();
  paint(map.rooms, 1, 1, 6, 1, 1);
  map.edges[edgeKey(4, 1, "v")] = "open";
  map.rooms = splitRooms(map);
  assert.deepEqual(ids(map), [1, 2]);
});

test("el motor las separa al pintar y el nombre se queda con la grande", async () => {
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0") });
  const doc = emptyDoc();
  engine.doc = doc;
  const map = doc.maps[0];
  map.roomInfo = { 1: { name: "Cripta", color: "#8fd694" } };
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  const patch = {};
  paint(patch, 1, 1, 4, 4, 1);
  paint(patch, 10, 1, 11, 2, 1);
  await engine.run(dm, [{ type: "map.layer", mapId: map.id, layer: "rooms", patch }]);
  const m = engine.doc.maps[0];
  assert.deepEqual(ids(m), [1, 2]);
  assert.equal(m.rooms[cellKey(1, 1)], 1);
  assert.equal(m.roomInfo[1].name, "Cripta");
  assert.equal(m.roomInfo[2], undefined, "la nueva estrena nombre y color");
});

test("un trazo que empieza lejos es una sola sala nueva, aunque llegue casilla a casilla", async () => {
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0") });
  const doc = emptyDoc();
  engine.doc = doc;
  const map = doc.maps[0];
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  const cell = (x, y, from) => engine.run(dm, [{ type: "map.layer", mapId: map.id, layer: "rooms", patch: { [cellKey(x, y)]: 1 }, from }]);
  /* primer trazo: una fila de 4 */
  let from = null;
  for (let x = 1; x <= 4; x++) { await cell(x, 1, from); from = cellKey(x, 1); }
  /* segundo trazo con la misma sala, lejos: 5 casillas seguidas */
  from = null;
  for (let x = 10; x <= 14; x++) { await cell(x, 1, from); from = cellKey(x, 1); }
  const m = engine.doc.maps[0];
  assert.deepEqual(ids(m), [1, 2]);
  for (let x = 10; x <= 14; x++) assert.equal(m.rooms[cellKey(x, 1)], 2);
});
