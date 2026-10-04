/* Varita mágica: el DM pincha en el suelo de cada sala y se rellena hasta
   donde llegue ese color, como el bote de pintura de Paint. Con eso se sabe
   qué casillas son suelo (lo mismo que se le pregunta a la IA), gratis y sin
   internet, y el trazado de wallfind.js pega los muros a la tinta.

   - Se trabaja con bloques de unos pocos píxeles (la media de su color): así
     una línea de cuadrícula de 1 px no corta el relleno y una pared de
     tinta, que es gruesa, sí.
   - Una casilla es suelo si más de la mitad está rellena.
   - Los huecos pequeños que quedan dentro del suelo (una mesa, un barril, una
     alfombra que no se rellenó; hasta 30 casillas) se cuentan como suelo: un
     mueble no es una pared. Un hueco más grande (un cuarto aparte) no se
     toca, y lo que se quita a mano tampoco vuelve.

   Sin navegador: trabaja sobre los píxeles en un array, como wallfind.js. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Bloques del tablero: grid { x, y, w, h, cols, rows } en píxeles de la imagen */
export function makeBlocks(data, W, H, grid, channels = 4) {
  const b = Math.max(2, Math.round(Math.min(grid.w, grid.h) / 12));
  const boardW = grid.cols * grid.w, boardH = grid.rows * grid.h;
  const bw = Math.ceil(boardW / b), bh = Math.ceil(boardH / b);
  const rgb = new Float32Array(bw * bh * 3);
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) {
      let r = 0, g = 0, bl = 0, n = 0;
      const x0 = grid.x + i * b, y0 = grid.y + j * b;
      for (let y = Math.round(y0); y < Math.round(y0 + b); y++)
        for (let x = Math.round(x0); x < Math.round(x0 + b); x++) {
          const k = (clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * channels;
          r += data[k]; g += data[k + 1]; bl += data[k + 2]; n++;
        }
      const o = (j * bw + i) * 3;
      rgb[o] = r / n; rgb[o + 1] = g / n; rgb[o + 2] = bl / n;
    }
  return { b, bw, bh, rgb, grid };
}

/* El bloque que cae en un punto de la imagen (o null si es fuera del tablero) */
export function blockAt(blocks, px, py) {
  const i = Math.floor((px - blocks.grid.x) / blocks.b), j = Math.floor((py - blocks.grid.y) / blocks.b);
  return i >= 0 && j >= 0 && i < blocks.bw && j < blocks.bh ? { i, j } : null;
}

/* Relleno desde un bloque: todo lo que se parezca al color de alrededor del
   punto pinchado (tolerancia en distancia de color, 0…255) y esté unido a él */
export function wandFill(blocks, seed, tol) {
  const { bw, bh, rgb } = blocks;
  const ref = [0, 0, 0];
  let n = 0;
  for (let dj = -1; dj <= 1; dj++)
    for (let di = -1; di <= 1; di++) {
      const i = seed.i + di, j = seed.j + dj;
      if (i < 0 || j < 0 || i >= bw || j >= bh) continue;
      const o = (j * bw + i) * 3;
      ref[0] += rgb[o]; ref[1] += rgb[o + 1]; ref[2] += rgb[o + 2]; n++;
    }
  ref[0] /= n; ref[1] /= n; ref[2] /= n;
  const near = k => Math.hypot(rgb[k * 3] - ref[0], rgb[k * 3 + 1] - ref[1], rgb[k * 3 + 2] - ref[2]) <= tol;
  const mask = new Uint8Array(bw * bh);
  const start = seed.j * bw + seed.i;
  const stack = [start];
  mask[start] = 1;
  while (stack.length) {
    const k = stack.pop(), i = k % bw, j = (k - i) / bw;
    for (const [ni, nj] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (ni < 0 || nj < 0 || ni >= bw || nj >= bh) continue;
      const q = nj * bw + ni;
      if (!mask[q] && near(q)) { mask[q] = 1; stack.push(q); }
    }
  }
  return mask;
}

/* Las casillas con más de la mitad rellena */
export function cellsFromMask(blocks, mask, minFrac = 0.5) {
  const { b, bw, bh, grid } = blocks;
  const { cols, rows } = grid;
  const hit = new Float32Array(cols * rows), all = new Float32Array(cols * rows);
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) {
      const cx = Math.floor(((i + 0.5) * b) / grid.w), cy = Math.floor(((j + 0.5) * b) / grid.h);
      if (cx >= cols || cy >= rows) continue;
      all[cy * cols + cx]++;
      if (mask[j * bw + i]) hit[cy * cols + cx]++;
    }
  return Array.from(all, (n, k) => n > 0 && hit[k] / n > minFrac);
}

/* Huecos de «no suelo» rodeados de suelo y de como mucho maxCells casillas
   (muebles) pasan a ser suelo. Lo que toca el borde del mapa nunca es hueco. */
export function fillHoles(floor, cols, rows, maxCells = 30) {
  const out = floor.slice();
  const seen = new Uint8Array(cols * rows);
  for (let start = 0; start < cols * rows; start++) {
    if (out[start] || seen[start]) continue;
    const comp = [start];
    seen[start] = 1;
    let border = false;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k], x = c % cols, y = (c - x) / cols;
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) border = true;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const q = ny * cols + nx;
        if (!out[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
      }
    }
    if (!border && comp.length <= maxCells) for (const c of comp) out[c] = true;
  }
  return out;
}

/* Todos los pinchazos juntos: los de añadir suman y los de quitar restan, en
   el orden en que se hicieron */
export function wandFloor(blocks, clicks, tol, { holes = true } = {}) {
  const { bw, bh, grid } = blocks;
  const mask = new Uint8Array(bw * bh), removed = new Uint8Array(bw * bh);
  for (const c of clicks) {
    const m = wandFill(blocks, c, tol);
    for (let k = 0; k < m.length; k++) if (m[k]) { mask[k] = c.remove ? 0 : 1; removed[k] = c.remove ? 1 : 0; }
  }
  const floor = cellsFromMask(blocks, mask);
  if (!holes) return floor;
  /* Lo quitado a mano no vuelve por rellenar huecos */
  const gone = cellsFromMask(blocks, removed);
  return fillHoles(floor, grid.cols, grid.rows).map((f, k) => f && !gone[k]);
}
