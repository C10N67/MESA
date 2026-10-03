/* Ayuda de la IA (Claude) para los muros del plano: lo que no depende de la
   red, compartido por el navegador y el servidor.

   En planos con mucho detalle (muebles, alfombras, escombros, sombras) la
   detección por píxeles se confunde: no sabe que una mesa no es una pared.
   Claude sí lo sabe. El plano se le enseña por partes, con la cuadrícula y
   las coordenadas dibujadas encima, y de cada casilla dice si es suelo o no;
   además, dónde hay un tabique o una puerta entre dos casillas de suelo. Con
   eso salen los muros por la cuadrícula, y el trazado de wallfind.js los
   pega después a la tinta del dibujo con precisión.

   Aquí: cómo se trocea el plano, la pregunta y el formato de la respuesta, y
   cómo se juntan las respuestas en un suelo y unos muros. */

import { edgeKey } from "./schema.js";

/* Casillas por lado de cada parte, sin contar el margen de contexto */
export const TILE_CELLS = 20;
export const TILE_MARGIN = 1;

/* Partes de como mucho TILE_CELLS × TILE_CELLS casillas, del mismo tamaño
   dentro de lo posible. Cada una lleva su núcleo (lo que se pregunta) y la
   vista con un margen alrededor (para que se vea qué hay al lado). */
export function planTiles(cols, rows, max = TILE_CELLS, margin = TILE_MARGIN) {
  const nx = Math.ceil(cols / max), ny = Math.ceil(rows / max);
  const cut = (n, parts) => Array.from({ length: parts + 1 }, (_, i) => Math.round(i * n / parts));
  const xs = cut(cols, nx), ys = cut(rows, ny);
  const tiles = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const x0 = xs[i], x1 = xs[i + 1] - 1, y0 = ys[j], y1 = ys[j + 1] - 1;
      tiles.push({
        x0, y0, x1, y1,
        view: { x0: Math.max(0, x0 - margin), y0: Math.max(0, y0 - margin), x1: Math.min(cols - 1, x1 + margin), y1: Math.min(rows - 1, y1 + margin) }
      });
    }
  return tiles;
}

/* La pregunta a Claude. Fija: así se aprovecha la caché entre partes. */
export const AI_SYSTEM = `You help a tabletop role-playing app turn a battle map image into walls and doors.

Each image shows part of a top-down battle map with a coordinate grid drawn over it: thin magenta lines are the cell boundaries, the numbers along the top are column numbers (x) and the numbers along the left are row numbers (y). A cyan rectangle marks the cells you must classify; cells outside it are only there for context.

For every cell inside the cyan rectangle decide whether a creature could stand there:
- "." floor: any walkable ground. Room, corridor and cave floors, grass, dirt, stairs, bridges, shallow water, and floor that is covered by furniture or decoration: tables, chairs, beds, chests, barrels, crates, bookshelves standing in a room, rugs, carpets, rubble, debris, bones, plants, statues, pillars smaller than the cell, light and shadow effects, stains, text or symbols painted on the floor. Decoration never makes a cell solid.
- "#" solid: anything that is not walkable floor. The drawn walls themselves (thick or textured wall bands), solid rock, the area outside the building or cave, black or empty background, deep water, chasms, and anything beyond the edge of the map.
A cell that is partly floor and partly wall is floor when more than about half of it is floor.

Then list the separators: edges between two adjacent floor cells where a thin wall or a door runs along the shared edge. Typical cases are thin walls between two rooms, and doors, gates, portcullises or secret doors. A doorway through a thick wall is floor with a door separator where the door leaf is. An open archway, a gap with no door, a curtain or a change of floor texture is not a separator. Side "right" means the edge between cell (x, y) and cell (x + 1, y); side "below" means the edge between cell (x, y) and cell (x, y + 1). Only list separators whose cell (x, y) is inside the cyan rectangle.

Work carefully cell by cell; the coordinates must match the numbers drawn on the image. Use "notes" for a short remark about anything ambiguous (it may be empty).`;

export function aiQuestion(tile) {
  const w = tile.x1 - tile.x0 + 1, h = tile.y1 - tile.y0 + 1;
  return `Classify the cells inside the cyan rectangle: x from ${tile.x0} to ${tile.x1} and y from ${tile.y0} to ${tile.y1} (${w} columns × ${h} rows). Return "rows" with exactly ${h} strings, one per row from y = ${tile.y0} to y = ${tile.y1}, each exactly ${w} characters long ("." or "#"), going from x = ${tile.x0} to x = ${tile.x1}.`;
}

/* Formato de la respuesta (salida estructurada) */
export const AI_SCHEMA = {
  type: "object",
  properties: {
    rows: { type: "array", items: { type: "string" } },
    separators: {
      type: "array",
      items: {
        type: "object",
        properties: {
          x: { type: "integer" },
          y: { type: "integer" },
          side: { type: "string", enum: ["right", "below"] },
          kind: { type: "string", enum: ["wall", "door"] }
        },
        required: ["x", "y", "side", "kind"],
        additionalProperties: false
      }
    },
    notes: { type: "string" }
  },
  required: ["rows", "separators", "notes"],
  additionalProperties: false
};

/* Junta las respuestas de las partes. Devuelve el suelo (true, false o null
   donde no se sabe) y los separadores, todo en coordenadas del mapa. Una
   respuesta con filas de menos o de más se aprovecha en lo que encaje. */
export function mergeTiles(cols, rows, answers) {
  const floor = new Array(cols * rows).fill(null);
  const separators = [];
  for (const { tile, answer } of answers) {
    if (!answer || !Array.isArray(answer.rows)) continue;
    for (let y = tile.y0; y <= tile.y1; y++) {
      const line = String(answer.rows[y - tile.y0] || "");
      for (let x = tile.x0; x <= tile.x1; x++) {
        const ch = line[x - tile.x0];
        if (ch === ".") floor[y * cols + x] = true;
        else if (ch === "#") floor[y * cols + x] = false;
      }
    }
    for (const s of Array.isArray(answer.separators) ? answer.separators : []) {
      const x = Math.trunc(s.x), y = Math.trunc(s.y);
      if (!(x >= tile.x0 && x <= tile.x1 && y >= tile.y0 && y <= tile.y1)) continue;
      if (s.side === "right" ? x + 1 >= cols : y + 1 >= rows) continue;
      separators.push({ x, y, side: s.side === "right" ? "right" : "below", kind: s.kind === "door" ? "door" : "wall" });
    }
  }
  return { floor, separators };
}

/* Del suelo y los separadores a muros y puertas de la cuadrícula. Donde
   Claude no contestó se usa el suelo que haya encontrado la detección
   (fallback), y si tampoco, se da por roca. */
export function edgesFromAI(cols, rows, { floor, separators }, fallback = null) {
  const isFloor = (x, y) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    const v = floor[y * cols + x];
    return v === null || v === undefined ? !!(fallback && fallback[y * cols + x]) : v;
  };
  const edges = {};
  for (let y = 0; y < rows; y++)
    for (let x = 0; x <= cols; x++) if (isFloor(x - 1, y) !== isFloor(x, y)) edges[edgeKey(x, y, "v")] = "wall";
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x < cols; x++) if (isFloor(x, y - 1) !== isFloor(x, y)) edges[edgeKey(x, y, "h")] = "wall";
  for (const s of separators) {
    const key = s.side === "right" ? edgeKey(s.x + 1, s.y, "v") : edgeKey(s.x, s.y + 1, "h");
    const other = s.side === "right" ? [s.x + 1, s.y] : [s.x, s.y + 1];
    const a = isFloor(s.x, s.y), b = isFloor(other[0], other[1]);
    if (s.kind === "door" && (a || b)) edges[key] = "door";      // también en el borde de una sala
    else if (a && b) edges[key] = "wall";                         // tabique entre dos suelos
  }
  const mask = Array.from({ length: cols * rows }, (_, i) => isFloor(i % cols, Math.floor(i / cols)));
  return { edges, floor: mask };
}
