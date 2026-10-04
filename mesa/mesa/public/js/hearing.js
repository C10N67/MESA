/* Mesa · cuánto se oye cada fuente de sonido del mapa

   Sin nada del navegador: lo usa el motor (engine.js), en el servidor y en la
   versión de prueba, para mandar a la pantalla solo el volumen al que le
   llega cada sonido. Dónde está la fuente no viaja: la party la oye, no la ve.

   El sonido llega por el mejor de dos caminos:

   rodeando    por el aire, sin atravesar nada: por las puertas abiertas, las
               ventanas y los huecos. Cuenta lo que se anda, así que un fuego
               en la sala de al lado se oye por la puerta, pero más flojo
               que si estuviera delante.
   atravesando en línea recta, a través de los muros y las puertas cerradas.
               Cada uno se come buena parte del volumen y apaga los agudos
               (el filtro lo pone la pantalla), como la música de un bar
               oída desde la calle. */

import { cellKey, edgeKey } from "./schema.js";
import { reachableCells, crossCount, BLOCKS } from "./los.js";

/* Lo que deja pasar cada cosa que hay en medio */
const PASS = { wall: 0.3, door: 0.5, window: 0.85, doorOpen: 1 };
const PASS_SEG = 0.3;     // muros diagonales y a mano alzada

/* A d casillas de una fuente que llega a r: entero pegado a ella y nada en
   el borde, con una caída algo más rápida al principio, como se oye. */
export const falloff = (d, r) => (d >= r ? 0 : Math.pow(1 - d / r, 1.6));

/* El borde entre dos casillas vecinas, recto */
function edgeType(map, x1, y1, x2, y2) {
  let key = null;
  if (y1 === y2 && x2 === x1 + 1) key = edgeKey(x2, y1, "v");
  else if (y1 === y2 && x2 === x1 - 1) key = edgeKey(x1, y1, "v");
  else if (x1 === x2 && y2 === y1 + 1) key = edgeKey(x1, y2, "h");
  else if (x1 === x2 && y2 === y1 - 1) key = edgeKey(x1, y1, "h");
  return key ? (map.edges || {})[key] : undefined;
}
const passOf = type => (type && PASS[type] !== undefined ? PASS[type] : 1);
const lossOf = type => (type && BLOCKS[type] ? 1 : type === "window" ? 0.3 : 0);

/* En línea recta: cuánto pasa y cuántos muros hay en medio. Se recorre igual
   que la línea de visión; en diagonal se toma el mejor de los dos rodeos. */
export function through(map, x0, y0, x1, y1) {
  let pass = 1, walls = 0;
  if (x0 !== x1 || y0 !== y1) {
    const steps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 4 + 4;
    let cx = x0, cy = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = Math.floor(x0 + 0.5 + (x1 - x0) * t);
      const ny = Math.floor(y0 + 0.5 + (y1 - y0) * t);
      if (nx === cx && ny === cy) continue;
      if (nx !== cx && ny !== cy) {
        const ax = edgeType(map, cx, cy, nx, cy), bx = edgeType(map, nx, cy, nx, ny);
        const ay = edgeType(map, cx, cy, cx, ny), by = edgeType(map, cx, ny, nx, ny);
        const viaX = passOf(ax) * passOf(bx), viaY = passOf(ay) * passOf(by);
        if (viaX >= viaY) { pass *= viaX; walls += lossOf(ax) + lossOf(bx); }
        else { pass *= viaY; walls += lossOf(ay) + lossOf(by); }
      } else {
        const type = edgeType(map, cx, cy, nx, ny);
        pass *= passOf(type);
        walls += lossOf(type);
      }
      cx = nx; cy = ny;
    }
    const n = crossCount(map, x0, y0, x1, y1);
    pass *= Math.pow(PASS_SEG, n);
    walls += n;
  }
  return { pass, walls };
}

/* Rodeando: lo que hay que andar desde la fuente hasta cada casilla, sin
   atravesar muros ni puertas cerradas. Las diagonales cuentan 5-10-5, que se
   parece más a la distancia de verdad, y el terreno difícil no importa (el
   sonido no se cansa). Solo cambia si cambian la fuente o los muros, así que
   se guarda: mover fichas no lo recalcula. */
const aroundCache = new WeakMap();     // edges -> { walls, byKey }
function around(map, s) {
  const edges = map.edges || {};
  let hit = aroundCache.get(edges);
  if (!hit || hit.walls !== map.walls || hit.cols !== map.cols || hit.rows !== map.rows) {
    hit = { walls: map.walls, cols: map.cols, rows: map.rows, byKey: new Map() };
    aroundCache.set(edges, hit);
  }
  const key = s.x + "," + s.y + "," + s.radius;
  let cells = hit.byKey.get(key);
  if (!cells) {
    const plain = { ...map, rough: null, diagonals: "alt" };
    cells = reachableCells(plain, { x: s.x, y: s.y }, 0, { budgetSquares: s.radius });
    hit.byKey.set(key, cells);
    if (hit.byKey.size > 200) hit.byKey.delete(hit.byKey.keys().next().value);
  }
  return cells;
}

/* Lo que oye alguien en (x, y): volumen de 0 a 1 (ya con el de la fuente) y
   cuántos muros apagan el sonido (0 si llega rodeando, sin atravesar nada). */
export function hearAt(map, s, x, y) {
  const r = s.radius;
  const d = Math.hypot(x - s.x, y - s.y);
  if (d >= r) return { gain: 0, walls: 0 };
  const walked = around(map, s).get(cellKey(x, y));
  const gAround = walked === undefined ? 0 : falloff(walked, r);
  const { pass, walls } = through(map, s.x, s.y, x, y);
  const gDirect = falloff(d, r) * pass;
  const vol = s.volume;
  if (gAround >= gDirect || !walls) return { gain: Math.max(gAround, gDirect) * vol, walls: 0 };
  return { gain: gDirect * vol, walls: Math.round(walls * 10) / 10 };
}

/* Lo que oye cada personaje de la party (vivo y en este mapa), fuente a
   fuente. Las que no suenan o no oye nadie no salen. */
export function partyHearing(doc, map) {
  const out = [];
  if (!map) return out;
  const heroes = doc.chars.filter(c => c.kind === "pc" && c.hp > 0 && c.mx !== null && c.mapId === map.id);
  for (const s of map.sounds || []) {
    if (!s.on || !(s.volume > 0)) continue;
    const by = {};
    let any = false;
    for (const c of heroes) {
      const h = hearAt(map, s, c.mx, c.my);
      if (h.gain > 0.002) { by[c.id] = h; any = true; }
    }
    if (any) out.push({ id: s.id, preset: s.preset, audioId: s.audioId, by });
  }
  return out;
}

/* Para un aparato: la pantalla oye lo que oiga mejor cualquiera de la party;
   el móvil de un jugador, lo que oye su personaje (si está en el mapa). */
export function mixFor(list, charId = null) {
  const out = [];
  for (const s of list) {
    let best = null;
    if (charId && s.by[charId]) best = s.by[charId];
    else if (!charId) for (const h of Object.values(s.by)) if (!best || h.gain > best.gain) best = h;
    if (!best || best.gain <= 0.002) continue;
    out.push({ id: s.id, preset: s.preset, audioId: s.audioId, gain: Math.round(best.gain * 1000) / 1000, walls: best.walls });
  }
  return out;
}
