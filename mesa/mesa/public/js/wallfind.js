/* Proponer muros y puertas a partir del plano, con la cuadrícula ya encajada.

   Con la cuadrícula conocida, cada borde entre dos casillas es un trozo de
   imagen concreto. De cada borde se mide un corte transversal (la franja
   justo encima y un poco de cada casilla a los lados) y de cada casilla, su
   color y lo que hay por su mitad. Con eso:

   1. Suelo: en los planos de batalla la cuadrícula se pinta sobre el suelo
      y casi no se ve en la roca, el agua, los escombros o el vacío. Las
      casillas donde se ve claramente son la semilla; el suelo crece desde
      ahí sin cruzar ningún muro dibujado.
   2. Muro de borde: entre una casilla de suelo y una que no lo es.
   3. Tabique: una línea dibujada (tinta, madera, piedra clara) entre dos
      suelos, recta y de al menos tres casillas. Una mesa o una alfombra
      no dan para tanto.
   4. Puerta: un tramo corto enganchado a muros por los dos extremos que no
      se parece al muro típico (una puerta blanca en un muro negro), o una
      casilla distinta en medio de un muro de una casilla de grueso.

   Lo que sale es una propuesta: la ventana de encajar la enseña para
   revisarla y se puede afinar con la sensibilidad sin volver a medir.

   No depende del navegador: trabaja sobre los píxeles en un array. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const SEED = 0.4, MIN_COHERENCE = 0.58;

const median = arr => {
  if (!arr.length) return 0;
  const s = Float64Array.from(arr).sort();
  return s[Math.floor(s.length / 2)];
};
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/* Lector de píxeles: data es RGBA (canvas) o RGB */
function reader(data, W, H, channels) {
  return (x, y) => {
    const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
}

/* Media de color de un rectángulo de la imagen (muestreo cada `step` px) */
function meanColor(px, x0, y0, x1, y1, step) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y += step)
    for (let x = x0; x <= x1; x += step) {
      const c = px(x, y);
      r += c[0]; g += c[1]; b += c[2]; n++;
    }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

/* Corte transversal de un borde. Devuelve medidas en «unidades de brillo»
   (0…255). dir "v": borde vertical en x = ex, de y0 a y0 + len. */
function measureEdge(px, dir, ex, ey, len, cross) {
  /* Coordenadas: t a lo largo del borde, u de través (negativo: casilla de
     antes, positivo: casilla de después) */
  const at = dir === "v" ? (t, u) => px(ex + u, ey + t) : (t, u) => px(ex + t, ey + u);
  const t0 = len * 0.2, t1 = len * 0.8;
  const tStep = Math.max(1, len / 24);
  const half = Math.max(1, Math.round(cross * 0.15));       // franja central
  const sideIn = Math.max(half + 1, Math.round(cross * 0.25)), sideOut = Math.max(sideIn + 1, Math.round(cross * 0.45));

  const A = [0, 0, 0], B = [0, 0, 0], C = [0, 0, 0];
  let nA = 0, nB = 0, nC = 0;
  const darkRows = [], lightRows = [], thinRows = [];
  for (let t = t0; t <= t1; t += tStep) {
    let la = 0, lb = 0, ca = 0, cb = 0;
    for (let u = sideIn; u <= sideOut; u++) {
      const a = at(t, -u), b = at(t, u);
      for (let k = 0; k < 3; k++) { A[k] += a[k]; B[k] += b[k]; }
      la += lum(a); lb += lum(b); ca++; cb++;
      nA++; nB++;
    }
    la /= ca; lb /= cb;
    /* Media de la franja central: una línea de cuadrícula de 1 px apenas la
       mueve; un muro de varios píxeles, sí */
    let sum = 0, cnt = 0, lo = Infinity;
    for (let u = -half; u <= half; u++) {
      const c = at(t, u);
      for (let k = 0; k < 3; k++) C[k] += c[k];
      nC++;
      const l = lum(c);
      sum += l; cnt++;
      if (l < lo) lo = l;
    }
    const mid = sum / cnt;
    darkRows.push(Math.min(la, lb) - mid);
    lightRows.push(mid - Math.max(la, lb));
    thinRows.push(Math.min(la, lb) - lo);
  }
  for (let k = 0; k < 3; k++) { A[k] /= nA || 1; B[k] /= nB || 1; C[k] /= nC || 1; }
  return {
    a: A, b: B, c: C,
    /* La mediana a lo largo del borde: un objeto que tape un trozo no basta */
    dark: median(darkRows),
    light: median(lightRows),
    /* Línea fina (la de la cuadrícula): lo más oscuro del centro */
    thin: median(thinRows),
    diff: dist3(A, B)
  };
}

/* Mide todos los bordes interiores del tablero.
   grid: { x, y, w, h, cols, rows } en píxeles de la imagen (como imgGrid). */
export function measureWalls(data, W, H, grid, channels = 4) {
  const px = reader(data, W, H, channels);
  const { cols, rows } = grid;
  const X = c => grid.x + c * grid.w, Y = r => grid.y + r * grid.h;
  const inside = (cx, cy) => X(cx) >= -grid.w * 0.5 && X(cx + 1) <= W + grid.w * 0.5
    && Y(cy) >= -grid.h * 0.5 && Y(cy + 1) <= H + grid.h * 0.5;

  /* Casillas: color medio del centro, y lo mismo que se mide en un borde
     pero por la mitad de la casilla, donde no pasa ninguna línea de la
     cuadrícula (sirve para saber si las líneas de los bordes son cuadrícula
     o textura que está en todas partes) */
  const step = Math.max(1, Math.round(Math.min(grid.w, grid.h) / 10));
  const cells = [], midThin = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      if (!inside(cx, cy)) { cells.push(null); midThin.push(null); continue; }
      cells.push(meanColor(px, X(cx) + grid.w * 0.25, Y(cy) + grid.h * 0.25, X(cx) + grid.w * 0.75, Y(cy) + grid.h * 0.75, step));
      const v = measureEdge(px, "v", X(cx) + grid.w / 2, Y(cy), grid.h, grid.w).thin;
      const h = measureEdge(px, "h", X(cx), Y(cy) + grid.h / 2, grid.w, grid.h).thin;
      midThin.push((v + h) / 2);
    }

  const edges = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 1; cx < cols; cx++) {
      if (!inside(cx - 1, cy) || !inside(cx, cy)) continue;
      edges.push({ key: `${cx},${cy},v`, dir: "v", cx, cy, ...measureEdge(px, "v", X(cx), Y(cy), grid.h, grid.w) });
    }
  for (let cy = 1; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      if (!inside(cx, cy - 1) || !inside(cx, cy)) continue;
      edges.push({ key: `${cx},${cy},h`, dir: "h", cx, cy, ...measureEdge(px, "h", X(cx), Y(cy), grid.w, grid.h) });
    }
  return { cols, rows, cells, midThin, edges };
}

/* Umbral de Otsu: el corte que mejor separa dos grupos de valores.
   Devuelve también cuánto se separan (0: nada, 1: dos grupos limpios). */
function otsu(values) {
  const v = Float64Array.from(values).sort();
  const n = v.length;
  if (n < 8) return { thr: -Infinity, sep: 0 };
  const total = v.reduce((a, b) => a + b, 0), mean = total / n;
  const varT = v.reduce((a, b) => a + (b - mean) ** 2, 0) / n || 1e-9;
  let best = { thr: -Infinity, sep: 0 }, left = 0;
  for (let i = 0; i < n - 1; i++) {
    left += v[i];
    if (v[i] === v[i + 1]) continue;
    const w0 = (i + 1) / n, w1 = 1 - w0;
    const m0 = left / (i + 1), m1 = (total - left) / (n - i - 1);
    const sep = (w0 * w1 * (m0 - m1) ** 2) / varT;
    if (sep > best.sep) best = { thr: (v[i] + v[i + 1]) / 2, sep, low: m0, high: m1 };
  }
  return best;
}

/* De las medidas a una propuesta de muros y puertas.
   sensitivity 0…1: más alto, más muros (umbrales más bajos). Se puede
   recalcular al mover el control sin volver a medir la imagen. */
export function classifyWalls(m, { sensitivity = 0.5 } = {}) {
  const { cols, rows, edges } = m;
  const f = 1.6 - 1.2 * clamp(sensitivity, 0, 1);
  const n = cols * rows;
  const side = e => e.dir === "v"
    ? [e.cy * cols + e.cx - 1, e.cy * cols + e.cx]
    : [(e.cy - 1) * cols + e.cx, e.cy * cols + e.cx];
  const line = e => Math.max(e.dark, e.light);

  /* 1. Suelo. En los planos de batalla la cuadrícula se pinta sobre el suelo
     y apenas se ve en la roca, el agua o el vacío. Cada casilla puntúa por
     lo marcadas que están las líneas finas de sus bordes menos lo que hay
     por su mitad (un rayado o unos escombros tienen líneas en todas partes,
     el suelo solo en el borde); si los valores se parten en dos grupos
     claros, el de arriba es suelo. Si no (una ciudad, un plano sin roca),
     todo cuenta como suelo. */
  const perCell = Array.from({ length: n }, () => []);
  for (const e of edges) for (const i of side(e)) perCell[i].push(e.thin);
  const lowMed = v => { const s = [...v].sort((a, b) => a - b); return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2; };
  const gridness = perCell.map((v, i) => (v.length && m.midThin[i] !== null ? lowMed(v) - m.midThin[i] : null));
  /* Las casillas sin ningún rastro de línea en el borde (≤ 0) no son suelo
     seguro y no cuentan para buscar el corte */
  const known = gridness.filter(v => v !== null && v > 0).map(v => Math.log(1 + v));
  const split = otsu(known);
  const useMask = split.sep >= 0.5;
  const score = gridness.map(v => (v === null ? null : Math.log(1 + Math.max(0, v))));
  const neighbors4 = i => {
    const cx = i % cols, cy = Math.floor(i / cols), out = [];
    if (cx > 0) out.push(i - 1);
    if (cx < cols - 1) out.push(i + 1);
    if (cy > 0) out.push(i - cols);
    if (cy < rows - 1) out.push(i + cols);
    return out;
  };

  /* 2. Lo que hay en cada borde: algo dibujado encima (más que una línea de
     cuadrícula normal entre dos suelos) o dos lados que no se parecen */
  const rough = score.map(v => v !== null && (!useMask || v >= split.thr));
  const plain = edges.filter(e => side(e).every(i => rough[i]) && e.diff < 30).map(line);
  const base = plain.length ? median(plain) : 0;
  const tLine = Math.max(16, base + 14) * f;
  const tDiff = f * Math.max(45, 2.2 * median(edges.map(e => e.diff)));
  const between = new Map();
  for (const e of edges) {
    e.isLine = line(e) >= tLine;
    e.isDiff = e.diff >= tDiff;
    const [a, b] = side(e);
    between.set(a < b ? a + "," + b : b + "," + a, e);
  }
  const edgeBetween = (a, b) => between.get(a < b ? a + "," + b : b + "," + a);

  /* El suelo crece desde las casillas donde la cuadrícula se ve con toda
     claridad hacia las vecinas que pasan el corte, pero nunca a través de
     un borde con un muro dibujado o un cambio brusco: así no se cuela en la
     roca ni en los rayados de alrededor. */
  let floor = rough;
  if (useMask) {
    const seed = split.thr + SEED * (split.high - split.thr);
    floor = new Array(n).fill(false);
    const stack = [];
    for (let i = 0; i < n; i++) if (score[i] !== null && score[i] >= seed) { floor[i] = true; stack.push(i); }
    while (stack.length) {
      const i = stack.pop();
      for (const j of neighbors4(i)) {
        if (floor[j] || score[j] === null || score[j] < split.thr) continue;
        const e = edgeBetween(i, j);
        if (e && (e.isLine || e.isDiff)) continue;
        floor[j] = true;
        stack.push(j);
      }
    }
  }

  /* Limpieza: huecos pequeños de «no suelo» rodeados de suelo (una mesa, un
     barril) son suelo; islas pequeñas de «suelo» en la roca (grietas,
     rayados) no lo son. */
  const flipSmall = (want, maxSize, needEnclosed) => {
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (seen[i] || floor[i] !== want || gridness[i] === null) continue;
      const comp = [i], stack = [i];
      seen[i] = 1;
      let touchesEdge = false;
      while (stack.length) {
        const j = stack.pop(), cx = j % cols, cy = Math.floor(j / cols);
        if (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1 || gridness[j] === null) touchesEdge = true;
        for (const k of neighbors4(j)) if (!seen[k] && floor[k] === want && gridness[k] !== null) {
          seen[k] = 1; comp.push(k); stack.push(k);
        }
      }
      if (comp.length <= maxSize && (!needEnclosed || !touchesEdge)) for (const j of comp) floor[j] = !want;
    }
  };
  if (useMask) {
    flipSmall(false, 4, true);
    flipSmall(true, 8, false);
  }

  /* ¿La máscara dibuja salas o manchas? Se compara cuántas casillas vecinas
     coinciden con lo que coincidirían al azar (kappa de Cohen). Con la
     cuadrícula muy tenue (una ciudad de noche) sale a manchas y es mejor no
     usarla: entonces todo es suelo y solo cuentan las líneas de muro. */
  let coherence = 0;
  if (useMask) {
    let same = 0, pairs = 0, on = 0, all = 0;
    for (let i = 0; i < n; i++) {
      if (gridness[i] === null) continue;
      all++; if (floor[i]) on++;
      const cx = i % cols;
      for (const j of [cx < cols - 1 ? i + 1 : -1, i + cols < n ? i + cols : -1]) {
        if (j < 0 || gridness[j] === null) continue;
        pairs++; if (floor[i] === floor[j]) same++;
      }
    }
    const p = on / (all || 1), chance = p * p + (1 - p) * (1 - p);
    coherence = pairs && chance < 1 ? (same / pairs - chance) / (1 - chance) : 0;
    if (coherence < MIN_COHERENCE) floor = gridness.map(v => v !== null);
  }
  const masked = useMask && coherence >= MIN_COHERENCE;

  /* Cada borde: dentro del suelo, en su borde o fuera */
  const byKey = new Map(edges.map(e => [e.key, e]));
  for (const e of edges) {
    const [a, b] = side(e);
    e.kind = floor[a] && floor[b] ? "in" : floor[a] || floor[b] ? "rim" : "out";
  }
  const along = (e, step) => byKey.get(e.dir === "v" ? `${e.cx},${e.cy + step},v` : `${e.cx + step},${e.cy},h`);
  const ends = e => e.dir === "v"
    ? [`${e.cx},${e.cy}`, `${e.cx},${e.cy + 1}`]
    : [`${e.cx},${e.cy}`, `${e.cx + 1},${e.cy}`];

  const out = new Map();
  /* 3. Borde del suelo: suelo a un lado y roca, agua o vacío al otro. No
     hace falta más prueba: por ahí no se pasa. Sin máscara (todo es suelo)
     no hay bordes de este tipo. */
  for (const e of edges) if (e.kind === "rim") out.set(e.key, "wall");

  /* 4. Tabiques: una línea dibujada entre dos suelos. Los muros son largos y
     rectos; el borde de una mesa o de una alfombra, no: hacen falta al
     menos 3 bordes seguidos en la misma línea. */
  const inner = e => e && e.kind === "in" && e.isLine;
  const runs = [];
  for (const e of edges) {
    if (!inner(e) || inner(along(e, -1))) continue;   // solo desde el principio de cada tramo
    const run = [e];
    for (let nx = along(e, 1); inner(nx); nx = along(nx, 1)) run.push(nx);
    runs.push(run);
  }
  for (const run of runs) if (run.length >= 3) for (const r of run) out.set(r.key, "wall");

  /* 5. Tramos cortos (1 o 2 bordes) enganchados a muros por los dos
     extremos: si no se parecen al muro típico (una puerta blanca en un muro
     negro, una tabla de madera en uno de piedra), puerta; si se parecen,
     un trozo de tabique que cierra el hueco. */
  const degree = new Map();
  for (const k of out.keys()) for (const v of ends(byKey.get(k))) degree.set(v, (degree.get(v) || 0) + 1);
  const wallColor = [0, 1, 2].map(k => median([...out.keys()].map(key => byKey.get(key).c[k])));
  const tColor = Math.max(40, 60 * f);
  for (const run of runs) {
    if (run.length > 2) continue;
    const startV = ends(run[0])[0], endV = ends(run[run.length - 1])[1];
    if (!degree.get(startV) || !degree.get(endV)) continue;
    const mean = [0, 1, 2].map(k => run.reduce((s, r) => s + r.c[k], 0) / run.length);
    const flank = [along(run[0], -1), along(run[run.length - 1], 1)].filter(x => x && out.has(x.key));
    const door = dist3(mean, wallColor) >= tColor && flank.every(x => dist3(mean, x.c) >= tColor);
    for (const r of run) out.set(r.key, door ? "door" : "wall");
  }

  /* Puertas dentro de un tabique largo: un borde que no se parece a sus dos
     vecinos de tramo ni al muro típico */
  for (const run of runs) {
    if (run.length < 3) continue;
    for (let i = 0; i < run.length; i++) {
      const e = run[i], nb = [run[i - 1], run[i + 1]].filter(Boolean);
      if (dist3(e.c, wallColor) >= tColor && nb.every(x => dist3(e.c, x.c) >= tColor)) out.set(e.key, "door");
    }
  }

  /* Puertas que ocupan una casilla: muros gruesos de una casilla de ancho
     (una franja de escombros o de sillares) con una casilla distinta en
     medio, suelo a los dos lados y la franja siguiendo por los otros dos.
     La puerta se pone en un lado y el otro queda abierto. */
  if (masked) {
    const cellAt = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows ? y * cols + x : -1);
    for (let i = 0; i < n; i++) {
      if (floor[i] || !m.cells[i]) continue;
      const x = i % cols, y = Math.floor(i / cols);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const a = cellAt(x - dx, y - dy), b = cellAt(x + dx, y + dy);       // lados de paso
        const p = cellAt(x - dy, y - dx), q = cellAt(x + dy, y + dx);       // la franja
        if (a < 0 || b < 0 || p < 0 || q < 0 || !floor[a] || !floor[b] || floor[p] || floor[q]) continue;
        if (!m.cells[p] || !m.cells[q]) continue;
        const odd = dist3(m.cells[i], m.cells[p]) >= tColor && dist3(m.cells[i], m.cells[q]) >= tColor;
        if (!odd) continue;
        const ea = edgeBetween(a, i), eb = edgeBetween(i, b);
        if (!ea || !eb) continue;
        out.set(ea.key, "door");
        out.delete(eb.key);
      }
    }
  }

  /* 6. Trozos sueltos: grupos de menos de 3 bordes sin tocar nada más */
  const vertexEdges = new Map();
  for (const k of out.keys()) for (const v of ends(byKey.get(k))) {
    if (!vertexEdges.has(v)) vertexEdges.set(v, []);
    vertexEdges.get(v).push(k);
  }
  const visited = new Set();
  for (const k of [...out.keys()]) {
    if (visited.has(k)) continue;
    const comp = [k], stack = [k];
    visited.add(k);
    while (stack.length) {
      const cur = stack.pop();
      for (const v of ends(byKey.get(cur))) for (const o of vertexEdges.get(v)) {
        if (!visited.has(o)) { visited.add(o); comp.push(o); stack.push(o); }
      }
    }
    if (comp.length < 3) for (const c of comp) out.delete(c);
  }

  const result = Object.fromEntries(out);
  const walls = [...out.values()].filter(t => t === "wall").length;
  return {
    edges: result, floor,
    stats: { walls, doors: out.size - walls, floorMask: masked, coherence: +coherence.toFixed(2), split: +split.sep.toFixed(2), tLine: +tLine.toFixed(1), tDiff: +tDiff.toFixed(1) }
  };
}

/* Todo de una vez, para quien tenga los píxeles a mano */
export function detectWalls(data, W, H, grid, opts = {}) {
  return classifyWalls(measureWalls(data, W, H, grid, opts.channels || 4), opts);
}
