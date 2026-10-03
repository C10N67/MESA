/* Muros a mano alzada: cortan la vista y el paso por donde pasan, sin dejar
   casillas sin suelo, y a la party solo le llega el trozo que tiene cerca.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSight, reachableCells, fits, wallsNear, wallCell } from "../public/js/los.js";
import { cellKey, normalizeMap } from "../public/js/schema.js";

const mapWith = walls => normalizeMap({ id: "m", cols: 12, rows: 12, walls });

/* Un arco de x = 5,3 entre y = 0 y y = 12, curvado: parte el mapa en dos */
const arc = { id: "arco", points: Array.from({ length: 13 }, (_, i) => [5.3 + Math.sin(i / 12 * Math.PI) * 0.6, i]) };

test("un muro curvo corta la línea de visión", () => {
  const map = mapWith([arc]);
  assert.equal(hasSight(map, 2, 6, 9, 6), false);
  assert.equal(hasSight(map, 2, 6, 4, 2), true);
  assert.equal(hasSight(mapWith([]), 2, 6, 9, 6), true);
});

test("no se puede cruzar al otro lado andando", () => {
  const map = mapWith([arc]);
  const reach = reachableCells(map, { x: 2, y: 6 }, 100);
  assert.ok(reach.has(cellKey(4, 6)));
  assert.ok(!reach.has(cellKey(7, 6)));
  assert.ok(!reach.has(cellKey(6, 0)));
});

test("las casillas que atraviesa siguen teniendo suelo", () => {
  const map = mapWith([arc]);
  assert.equal(wallCell(map, 5, 6), false);
  assert.equal(fits(map, [], { id: "a", size: "Mediano" }, 5, 6), null);
  /* Un ogro de 2×2 cabe a un lado, pero no a caballo del muro */
  assert.equal(fits(map, [], { id: "o", size: "Grande" }, 4, 6), null);
  assert.equal(fits(map, [], { id: "o", size: "Grande" }, 5, 6), "Hay un muro por medio");
});

test("a la party solo le llega el trozo de muro que tiene cerca", () => {
  const map = mapWith([arc]);
  const seen = new Set([cellKey(4, 5), cellKey(4, 6)]);
  const near = wallsNear(map, seen);
  assert.equal(near.length, 1);
  const ys = near[0].points.map(p => p[1]);
  assert.ok(Math.min(...ys) >= 3 && Math.max(...ys) <= 9, "solo el tramo cercano: " + ys);
  assert.deepEqual(wallsNear(map, new Set([cellKey(0, 0)])), []);
});
