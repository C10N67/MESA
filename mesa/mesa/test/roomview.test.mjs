/* Vista de sala: al entrar alguien en una sala pintada, la cámara de la party
   la encuadra entera; se suelta cuando alguien se mueve fuera, vuelve cuando
   alguien se mueve dentro, y el DM puede soltarla y recuperarla.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../public/js/engine.js";
import { emptyDoc, normalizeChar, cellKey } from "../public/js/schema.js";

function setup() {
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0") });
  const doc = emptyDoc();
  const map = doc.maps[0];
  map.cols = 20; map.rows = 12;
  map.rooms = {};
  for (let y = 2; y <= 6; y++) for (let x = 5; x <= 9; x++) map.rooms[cellKey(x, y)] = 1;
  doc.chars = [
    normalizeChar({ id: "a", kind: "pc", name: "Aria", mapId: map.id, mx: 1, my: 1 }),
    normalizeChar({ id: "b", kind: "pc", name: "Borin", mapId: map.id, mx: 2, my: 9 })
  ];
  engine.doc = doc;
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  const screen = engine.join({ role: "screen" }).client;
  engine.advance();
  const move = async (id, x, y) => { await engine.run(dm, [{ type: "token.move", id, x, y, mapId: map.id }]); engine.advance(); };
  const view = () => engine.snapshot(screen).session.roomView;
  return { engine, dm, map, move, view };
}

test("entrar en una sala la encuadra entera", async () => {
  const { move, view } = setup();
  assert.equal(view(), null);
  await move("a", 6, 3);
  assert.deepEqual({ ...view(), mapId: undefined, key: undefined }, { mapId: undefined, key: undefined, x0: 5, y0: 2, x1: 9, y1: 6 });
});

test("se suelta cuando alguien se mueve fuera y vuelve al moverse dentro", async () => {
  const { move, view } = setup();
  await move("a", 6, 3);
  await move("b", 3, 9);                 // otro jugador se mueve fuera de la sala
  assert.equal(view(), null);
  await move("a", 7, 4);                 // alguien vuelve a moverse dentro
  assert.equal(view().x0, 5);
  await move("a", 12, 4);                // y sale
  assert.equal(view(), null);
});

test("el DM la suelta y la recupera", async () => {
  const { engine, dm, move, view } = setup();
  await move("a", 6, 3);
  await engine.run(dm, [{ type: "roomview.set", off: true }]); engine.advance();
  assert.equal(view(), null);
  await move("a", 7, 4);                 // soltada: moverse dentro ya no la encuadra
  assert.equal(view(), null);
  await engine.run(dm, [{ type: "roomview.set", off: false }]); engine.advance();
  assert.equal(view().x1, 9);            // recuperada, con Aria dentro
  /* A la party no le llega la lista de salas soltadas */
  assert.deepEqual(engine.snapshot(engine.join({ role: "screen" }).client).session.roomViewOff, []);
});

test("sin la opción del mapa no se encuadra nada", async () => {
  const { map, move, view } = setup();
  map.roomCam = false;
  await move("a", 6, 3);
  assert.equal(view(), null);
});
