/* Muros, luz, línea de visión y distancias. El servidor lo usa para decidir
   qué se manda a cada jugador: lo que no se ve no viaja por la red. */

import { cellKey, edgeKey, footprint } from "./schema.js";

export const BLOCKS = { wall: true, door: true, doorOpen: false, window: false };

/* Un muro vive en el borde de una casilla: "x,y,v" es su lado izquierdo y
   "x,y,h" el de arriba, así las paredes quedan entre casillas. */
export function blocksBetween(map, x1, y1, x2, y2) {
  let key = null;
  if (y1 === y2 && x2 === x1 + 1) key = edgeKey(x2, y1, "v");
  else if (y1 === y2 && x2 === x1 - 1) key = edgeKey(x1, y1, "v");
  else if (x1 === x2 && y2 === y1 + 1) key = edgeKey(x1, y2, "h");
  else if (x1 === x2 && y2 === y1 - 1) key = edgeKey(x1, y1, "h");
  return key ? !!BLOCKS[map.edges[key]] : false;
}

/* Se recorre el segmento entre dos casillas y se comprueba cada borde que
   cruza. En diagonal basta con que uno de los dos rodeos esté libre, para que
   una esquina no corte la vista de forma antinatural. */
export function hasSight(map, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return true;
  const steps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 4 + 4;
  let cx = x0, cy = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = Math.floor(x0 + 0.5 + (x1 - x0) * t);
    const ny = Math.floor(y0 + 0.5 + (y1 - y0) * t);
    if (nx === cx && ny === cy) continue;
    if (nx !== cx && ny !== cy) {
      const viaX = !blocksBetween(map, cx, cy, nx, cy) && !blocksBetween(map, nx, cy, nx, ny);
      const viaY = !blocksBetween(map, cx, cy, cx, ny) && !blocksBetween(map, cx, ny, nx, ny);
      if (!viaX && !viaY) return false;
    } else if (blocksBetween(map, cx, cy, nx, ny)) return false;
    cx = nx; cy = ny;
  }
  return true;
}

export const onMap = (c, map) =>
  !!map && c.mx !== null && c.mapId === map.id && c.mx < map.cols && c.my < map.rows;

/* Las casillas que ocupa una ficha: un ogro grande llena 2×2. */
export function occupied(c) {
  const n = footprint(c);
  const out = [];
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) out.push([c.mx + dx, c.my + dy]);
  return out;
}

/* ¿Cabe aquí? Una criatura grande ocupa un cuadrado de casillas, así que tiene
   que entrar en el mapa, no puede quedarse a caballo de un muro y no puede
   meterse encima de otra. Un ogro de 2×2 no pasa por una puerta de una casilla,
   que es justo lo que queremos que se note en la mesa. */
export function fits(map, chars, who, x, y) {
  const n = footprint(who);
  if (x < 0 || y < 0 || x + n > map.cols || y + n > map.rows) return "No cabe dentro del mapa";
  for (let dy = 0; dy < n; dy++) {
    for (let dx = 0; dx < n; dx++) {
      const cx = x + dx, cy = y + dy;
      if (dx && blocksBetween(map, cx - 1, cy, cx, cy)) return "Hay un muro por medio";
      if (dy && blocksBetween(map, cx, cy - 1, cx, cy)) return "Hay un muro por medio";
    }
  }
  const mine = new Set();
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) mine.add(cellKey(x + dx, y + dy));
  for (const other of chars) {
    if (other.id === who.id || other.mx === null || other.mapId !== map.id) continue;
    for (const [ox, oy] of occupied(other)) {
      if (mine.has(cellKey(ox, oy))) return `Ahí está ${other.name}`;
    }
  }
  return null;
}

/* ---------- Distancias ---------- */
/* Regla del manual básico: cada casilla en diagonal cuenta como una. Con la
   variante "alt" la segunda diagonal cuesta el doble (5-10-5). */
export function gridDistance(ax, ay, bx, by, mode = "5e") {
  const dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
  const diag = Math.min(dx, dy), straight = Math.max(dx, dy) - diag;
  return mode === "alt" ? straight + diag + Math.floor(diag / 2) : straight + diag;
}
export const feetBetween = (map, ax, ay, bx, by) =>
  gridDistance(ax, ay, bx, by, map.diagonals) * (map.feet || 5);

/* Distancia entre dos fichas, contando el tamaño de cada una. */
export function feetChars(map, a, b) {
  let best = Infinity;
  for (const [ax, ay] of occupied(a)) for (const [bx, by] of occupied(b)) {
    best = Math.min(best, gridDistance(ax, ay, bx, by, map.diagonals));
  }
  return best * (map.feet || 5);
}

/* ---------- Alcance de movimiento ---------- */
/* Recorrido por anchura respetando muros: sirve para pintar hasta dónde llega
   una ficha con su velocidad, contando las diagonales como manda el mapa. */
export function reachableCells(map, from, feet, { blocked = null } = {}) {
  const step = map.feet || 5;
  const budget = Math.max(0, Math.floor(feet / step));
  const out = new Map([[cellKey(from.x, from.y), 0]]);
  if (!budget) return out;
  let edge = [{ x: from.x, y: from.y, cost: 0, diag: 0 }];
  while (edge.length) {
    const next = [];
    for (const cur of edge) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cur.x + dx, y = cur.y + dy;
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
        if (blocked && blocked(x, y)) continue;
        if (dx && dy) {
          const viaX = !blocksBetween(map, cur.x, cur.y, x, cur.y) && !blocksBetween(map, x, cur.y, x, y);
          const viaY = !blocksBetween(map, cur.x, cur.y, cur.x, y) && !blocksBetween(map, cur.x, y, x, y);
          if (!viaX && !viaY) continue;
        } else if (blocksBetween(map, cur.x, cur.y, x, y)) continue;

        let diag = cur.diag, cost = cur.cost + 1;
        if (dx && dy) {
          diag++;
          if (map.diagonals === "alt" && diag % 2 === 0) cost++;
        }
        if (cost > budget) continue;
        const k = cellKey(x, y);
        if (out.has(k) && out.get(k) <= cost) continue;
        out.set(k, cost);
        next.push({ x, y, cost, diag });
      }
    }
    edge = next;
  }
  return out;   // casilla -> casillas gastadas
}

/* ---------- Plantillas de área ---------- */
const normalizeAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

/* Qué casillas cubre un cono, un círculo, una línea o un cuadrado. Se mide
   desde el centro de cada casilla, que es como se resuelve en la mesa. */
export function shapeCells(map, shape) {
  const step = map.feet || 5;
  const r = shape.size / step;
  const set = new Set();
  const span = Math.ceil(r) + 2;
  const ox = shape.x, oy = shape.y;
  for (let y = Math.floor(oy - span); y <= Math.ceil(oy + span); y++) {
    for (let x = Math.floor(ox - span); x <= Math.ceil(ox + span); x++) {
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
      const dx = x + 0.5 - ox, dy = y + 0.5 - oy;
      const dist = Math.hypot(dx, dy);
      let inside = false;
      if (shape.kind === "circle") inside = dist <= r;
      else if (shape.kind === "square") inside = Math.abs(dx) <= r && Math.abs(dy) <= r;
      else if (shape.kind === "cone") {
        const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - shape.angle));
        inside = dist <= r && diff <= Math.PI / 6 + 0.001;    // el cono del manual
      } else if (shape.kind === "line") {
        const along = dx * Math.cos(shape.angle) + dy * Math.sin(shape.angle);
        const across = Math.abs(-dx * Math.sin(shape.angle) + dy * Math.cos(shape.angle));
        inside = along >= -0.5 && along <= r && across <= (shape.width / step) / 2;
      }
      if (inside) set.add(cellKey(x, y));
    }
  }
  return set;
}

/* ---------- Luz y visión ----------

   Tres niveles, de menos a más:

   visión verdadera   Se ve la casilla entera, pase lo que pase con el terreno.
                      La dan la visión en la oscuridad del personaje, la luz que
                      lleva encima y las casillas marcadas como luz fija.
   vista normal       El alcance del mapa, cortado por muros.
   terreno            Encima de lo anterior: la niebla deja pasar la vista a
                      medias y la oscuridad casi nada.

   La niebla no se resuelve con un sí o un no, sino con un degradado: cerca se
   ve todo, lejos solo algunas casillas sueltas, como cuando miras dentro de un
   banco de niebla de verdad. El sorteo es estable para una posición dada, de
   modo que el mapa no parpadea mientras nadie se mueve. */

export const DARK_SIGHT = 1;      // dentro de la oscuridad se ve la casilla de al lado
export const FOG_CLEAR = 2;       // dentro de la niebla se ve seguro hasta aquí
export const FOG_LIMIT = 7;       // y más allá de aquí ya no se ve nada

/* Sorteo repetible: depende solo de la casilla y de quién mira. */
function jitter(ox, oy, x, y) {
  let h = (ox * 73856093) ^ (oy * 19349663) ^ (x * 83492791) ^ (y * 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const cellKind = (map, x, y) => (map.cells || {})[cellKey(x, y)];

/* Recorre el segmento y cuenta lo que estorba. Solo los muros cortan el
   camino: la niebla y la oscuridad se apuntan y las decide quien mira, porque
   la visión verdadera pasa por encima de ellas y la vista normal no. */
function trace(map, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return { steps: 0, fog: 0, darkThrough: 0, dark: false };
  const steps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 4 + 4;
  let cx = x0, cy = y0, hops = 0, fog = 0, darkThrough = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = Math.floor(x0 + 0.5 + (x1 - x0) * t);
    const ny = Math.floor(y0 + 0.5 + (y1 - y0) * t);
    if (nx === cx && ny === cy) continue;
    if (nx !== cx && ny !== cy) {
      const viaX = !blocksBetween(map, cx, cy, nx, cy) && !blocksBetween(map, nx, cy, nx, ny);
      const viaY = !blocksBetween(map, cx, cy, cx, ny) && !blocksBetween(map, cx, ny, nx, ny);
      if (!viaX && !viaY) return null;
    } else if (blocksBetween(map, cx, cy, nx, ny)) return null;
    cx = nx; cy = ny;
    hops++;
    const kind = cellKind(map, cx, cy);
    if (cx === x1 && cy === y1) {
      return { steps: hops, fog, darkThrough, dark: kind === "dark", fogHere: kind === "fog" };
    }
    if (kind === "dark") darkThrough++;
    else if (kind === "fog") fog++;
  }
  return { steps: hops, fog, darkThrough, dark: false };
}

/* ¿Se ve esta casilla desde ahí? */
function visible(map, ox, oy, x, y, { trueSight = 0, range = 0 } = {}) {
  const path = trace(map, ox, oy, x, y);
  if (!path) return false;                            // un muro por medio, y no hay más que hablar

  /* Visión verdadera: la visión en la oscuridad y la antorcha atraviesan tanto
     la niebla como la oscuridad, hasta donde alcanzan. */
  if (path.steps <= trueSight) return true;

  /* Las ocho de alrededor se ven siempre. La cuenta de pasos de un trazo en
     diagonal pasa por una casilla intermedia, y si esa casilla era oscura las
     esquinas se quedaban a ciegas: dentro de una nube se veían los lados pero
     no las diagonales. */
  const cheb = Math.max(Math.abs(x - ox), Math.abs(y - oy));
  if (cheb <= DARK_SIGHT) return true;

  if (path.darkThrough) return false;                 // la vista normal no atraviesa la oscuridad
  if (path.steps > range) return false;
  if (path.dark) return false;                        // y dentro de ella solo alcanza lo pegado
  if (path.fog || path.fogHere) {
    if (path.steps <= FOG_CLEAR) return true;
    if (path.steps >= FOG_LIMIT) return false;
    const p = 1 - (path.steps - FOG_CLEAR) / (FOG_LIMIT - FOG_CLEAR);
    return jitter(ox, oy, x, y) < p;                  // el degradado
  }
  return true;
}

/* Compatibilidad: sigue habiendo quien solo pregunta si hay pared de por medio */
export const sightPath = (map, x0, y0, x1, y1) => {
  const p = trace(map, x0, y0, x1, y1);
  return p ? p.steps + p.fog * 2 : null;
};

/* Las casillas de luz fija: se ven siempre, sin más condición. */
export function litCells(doc, map) {
  const set = new Set();
  for (const [k, kind] of Object.entries(map.cells || {})) if (kind === "lit") set.add(k);
  return set;
}

/* Casillas que la party alcanza a ver ahora mismo. */
export function visibleCells(doc, map) {
  const set = new Set();
  if (!map) return set;

  /* La luz fija se ve siempre: es una antorcha de pared, y está encendida. */
  for (const k of litCells(doc, map)) set.add(k);

  const heroes = doc.chars.filter(c => c.kind === "pc" && c.hp > 0 && onMap(c, map));
  for (const c of heroes) {
    const trueSight = Math.min(40, Math.max(c.vision || 0, c.light || 0));
    const range = Math.min(60, map.dark ? trueSight : Math.max(map.radius, trueSight));
    const reach = Math.max(trueSight, range);
    if (!reach) continue;
    const lim = reach * reach + reach * 0.6;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy > lim) continue;
        const x = c.mx + dx, y = c.my + dy;
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
        const k = cellKey(x, y);
        if (set.has(k)) continue;
        if (visible(map, c.mx, c.my, x, y, { trueSight, range })) set.add(k);
      }
    }
  }
  return set;
}

/* Solo se mandan los muros que tocan lo que ya se ha visto: el plano completo
   no sale del servidor mientras la party no lo haya explorado. */
export function edgesNear(map, seen, explored = []) {
  const cells = new Set([...(seen || []), ...explored]);
  const out = {};
  for (const key of cells) {
    const [x, y] = key.split(",").map(Number);
    for (const k of [edgeKey(x, y, "v"), edgeKey(x + 1, y, "v"), edgeKey(x, y, "h"), edgeKey(x, y + 1, "h")]) {
      if (map.edges[k]) out[k] = map.edges[k];
    }
  }
  return out;
}
