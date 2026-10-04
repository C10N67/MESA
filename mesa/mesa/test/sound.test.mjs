/* Sonido del mapa: cuánto oye la party cada fuente, a través de muros y
   puertas, y qué le llega a cada aparato. También la geometría que usa la
   sombra de los muros.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { hearAt, partyHearing, mixFor, falloff } from "../public/js/hearing.js";
import { blockingSegments, crossCount } from "../public/js/los.js";
import { createEngine } from "../public/js/engine.js";
import { edgeKey, normalizeMap, normalizeSound, normalizeChar, emptyDoc } from "../public/js/schema.js";
import { synthesize } from "../public/js/synth.js";

/* Dos salas separadas por un muro en x = 6, con una puerta en (6, 6) */
function twoRooms(door = "door") {
  const edges = {};
  for (let y = 0; y < 12; y++) if (y !== 6) edges[edgeKey(6, y, "v")] = "wall";
  edges[edgeKey(6, 6, "v")] = door;
  return normalizeMap({ id: "m", cols: 14, rows: 12, edges });
}
const fire = normalizeSound({ id: "s1", x: 9, y: 3, radius: 10, volume: 1, preset: "fuego" });

test("se oye más cerca que lejos, y nada fuera del alcance", () => {
  const map = normalizeMap({ id: "m", cols: 30, rows: 12 });
  const near = hearAt(map, fire, 9, 4).gain, far = hearAt(map, fire, 15, 3).gain;
  assert.ok(near > far && far > 0, `${near} > ${far} > 0`);
  assert.equal(hearAt(map, fire, 25, 3).gain, 0);
  assert.equal(falloff(0, 10), 1);
  assert.equal(falloff(10, 10), 0);
});

test("un muro apaga el sonido y lo marca como amortiguado", () => {
  const open = normalizeMap({ id: "m", cols: 14, rows: 12 });
  const walled = twoRooms();
  const free = hearAt(open, fire, 4, 3), behind = hearAt(walled, fire, 4, 3);
  assert.ok(behind.gain < free.gain * 0.5, `${behind.gain} < ${free.gain} / 2`);
  assert.ok(behind.walls >= 1);
  assert.equal(free.walls, 0);
});

test("por una puerta abierta el sonido llega rodeando, sin amortiguar", () => {
  const closed = hearAt(twoRooms("door"), fire, 5, 6);
  const open = hearAt(twoRooms("doorOpen"), fire, 5, 6);
  assert.ok(open.gain > closed.gain, `${open.gain} > ${closed.gain}`);
  assert.equal(open.walls, 0);
  assert.ok(closed.walls > 0);
});

test("los muros a mano alzada también cuentan", () => {
  const map = normalizeMap({ id: "m", cols: 14, rows: 12, walls: [{ id: "w", points: [[7.3, 0], [7.3, 12]] }] });
  assert.equal(crossCount(map, 9, 3, 4, 3), 1);
  assert.ok(hearAt(map, fire, 4, 3).walls >= 1);
  const segs = blockingSegments(map);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].cross, true);
});

test("los segmentos que cortan la vista: muros y puertas cerradas, no ventanas ni puertas abiertas", () => {
  const map = normalizeMap({
    id: "m", cols: 6, rows: 6,
    edges: { [edgeKey(1, 1, "v")]: "wall", [edgeKey(2, 1, "h")]: "door", [edgeKey(3, 1, "v")]: "doorOpen", [edgeKey(4, 1, "v")]: "window", [edgeKey(2, 3, "d")]: "wall" }
  });
  const segs = blockingSegments(map);
  assert.equal(segs.length, 3);
  assert.deepEqual(segs.filter(s => s.cross).map(s => [s.x1, s.y1, s.x2, s.y2]), [[2, 3, 3, 4]]);
});

test("la pantalla oye a quien mejor oye; cada móvil, a su personaje", () => {
  const map = normalizeMap({ id: "m", cols: 30, rows: 12, sounds: [fire] });
  const doc = {
    chars: [
      normalizeChar({ id: "a", kind: "pc", mapId: "m", mx: 9, my: 4 }),
      normalizeChar({ id: "b", kind: "pc", mapId: "m", mx: 16, my: 3 }),
      normalizeChar({ id: "c", kind: "pc", mapId: "m", mx: 1, my: 1, hp: 0 })
    ]
  };
  const list = partyHearing(doc, map);
  assert.equal(list.length, 1);
  assert.deepEqual(Object.keys(list[0].by).sort(), ["a", "b"]);
  const screen = mixFor(list), phoneB = mixFor(list, "b");
  assert.equal(screen[0].gain, Math.round(list[0].by.a.gain * 1000) / 1000);
  assert.ok(phoneB[0].gain < screen[0].gain);
  /* No viaja dónde está la fuente */
  assert.equal(screen[0].x, undefined);
  assert.equal(screen[0].y, undefined);
});

test("una fuente apagada no suena", () => {
  const map = normalizeMap({ id: "m", cols: 30, rows: 12, sounds: [{ ...fire, on: false }] });
  const doc = { chars: [normalizeChar({ id: "a", kind: "pc", mapId: "m", mx: 9, my: 4 })] };
  assert.deepEqual(partyHearing(doc, map), []);
});

test("el motor manda el sonido a la pantalla y, solo si el DM quiere, a los móviles", async () => {
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0") });
  const doc = emptyDoc();
  const map = doc.maps[0];
  doc.chars = [normalizeChar({ id: "a", kind: "pc", name: "Aria", mapId: map.id, mx: 2, my: 2 })];
  engine.doc = doc;
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  const screen = engine.join({ role: "screen" }).client;
  const phone = engine.join({ role: "player", name: "Ana", charId: "a" }).client;

  assert.equal((await engine.run(dm, [{ type: "sound.set", mapId: map.id, sound: { id: "s", x: 4, y: 2, radius: 8, preset: "lluvia" } }])).error, null);
  assert.ok((await engine.run(phone, [{ type: "sound.set", mapId: map.id, sound: { id: "x", x: 1, y: 1 } }])).error);
  engine.advance();

  const tv = engine.snapshot(screen).audio;
  assert.equal(tv.sources.length, 1);
  assert.equal(tv.sources[0].preset, "lluvia");
  assert.ok(tv.sources[0].gain > 0);
  assert.equal(engine.snapshot(phone).audio, null);
  /* La party no ve dónde están las fuentes */
  assert.equal(engine.snapshot(screen).maps[0].sounds, undefined);

  await engine.run(dm, [{ type: "session.patch", fields: { soundOnPlayers: true } }]);
  engine.advance();
  assert.equal(engine.snapshot(phone).audio.sources.length, 1);

  await engine.run(dm, [{ type: "session.patch", fields: { soundMuted: true } }]);
  engine.advance();
  assert.equal(engine.snapshot(screen).audio.volume, 0);
});

test("la vista tras los muros viaja a la party, y sus muros aunque no se dibujen", async () => {
  const engine = createEngine({ rid: k => "0".repeat(k * 2) + Math.random().toString(16).slice(2, 8) });
  const doc = emptyDoc();
  const map = doc.maps[0];
  map.edges = { [edgeKey(5, 2, "v")]: "wall", [edgeKey(5, 3, "v")]: "window" };
  map.wallFade = 0.25;
  doc.chars = [normalizeChar({ id: "a", kind: "pc", name: "Aria", mapId: map.id, mx: 3, my: 2 })];
  doc.session.showWallsToParty = false;
  engine.doc = doc;
  const screen = engine.join({ role: "screen" }).client;
  engine.advance();
  const seen = engine.snapshot(screen).maps[0];
  assert.equal(seen.wallFade, 0.25);
  assert.deepEqual(seen.edges, {});
  assert.deepEqual(seen.occluders.edges, { [edgeKey(5, 2, "v")]: "wall" });

  doc.session.showWallsToParty = true;
  map.wallFade = 1;
  engine.doc = doc;
  engine.advance();
  assert.equal(engine.snapshot(screen).maps[0].occluders, null);
});

test("los sonidos de serie salen como bucles sin costura", () => {
  for (const id of ["fuego", "viento", "laud"]) {
    const [L, R] = synthesize(id, 22050);
    assert.equal(L.length, R.length);
    assert.ok(L.length > 22050 * 8, id);
    let peak = 0, steps = 0;
    for (let i = 0; i < L.length; i++) {
      assert.ok(Number.isFinite(L[i]) && Number.isFinite(R[i]), id);
      peak = Math.max(peak, Math.abs(L[i]));
      if (i) steps += Math.abs(L[i] - L[i - 1]);
    }
    assert.ok(peak > 0.05 && peak <= 1, `${id}: pico ${peak}`);
    /* El salto del final al principio, como cualquier otro paso */
    assert.ok(Math.abs(L[0] - L[L.length - 1]) < (steps / L.length) * 12 + 0.01, id);
  }
});

test("una fuente de sonido se normaliza", () => {
  const s = normalizeSound({ x: -3, y: 2.7, radius: 99, volume: 7, preset: "nada", audioId: "../../etc/passwd" });
  assert.equal(s.x, 0);
  assert.equal(s.y, 2);
  assert.equal(s.radius, 40);
  assert.equal(s.volume, 1);
  assert.equal(s.preset, "fuego");
  assert.equal(s.audioId, "");
  assert.equal(normalizeSound({ audioId: "0123456789abcdef.mp3" }).audioId, "0123456789abcdef.mp3");
});
