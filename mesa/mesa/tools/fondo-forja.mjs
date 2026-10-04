/* Mesa · fondo de la entrada: una forja

   Genera public/fondos/forja.svg: el interior de una forja en sepia, con un
   gran ventanal en arco al fondo, haces de luz cayendo hacia un yunque con el
   hierro al rojo, cadenas y poleas colgando, engranajes y un brazo mecánico.
   Es un dibujo vectorial propio (no una foto ni una ilustración ajena): pesa
   poco, se ve nítido en cualquier pantalla y sirve sin red.

   La composición deja la columna del centro para el panel de entrada: el
   ventanal, ancho, lo enmarca; el yunque queda a la izquierda y el brazo
   mecánico a la derecha.

   node tools/fondo-forja.mjs   (desde mesa/mesa) */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "fondos");
const W = 1920, H = 1200;

/* Azar repetible: el dibujo sale igual cada vez */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = n => Math.round(n * 10) / 10;

/* ---------- Piezas ---------- */
function gear(cx, cy, r, teeth, fill, hole = 0.32, spokes = 0) {
  const ri = r * 0.84, d = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, s = Math.PI / teeth;
    const pts = [[ri, a - s * 0.95], [r, a - s * 0.5], [r, a + s * 0.5], [ri, a + s * 0.95]];
    for (const [rr, aa] of pts) d.push(`${d.length ? "L" : "M"}${f(cx + rr * Math.cos(aa))} ${f(cy + rr * Math.sin(aa))}`);
  }
  d.push("Z");
  const h = r * hole;
  d.push(`M${f(cx + h)} ${cy} A${f(h)} ${f(h)} 0 1 0 ${f(cx - h)} ${cy} A${f(h)} ${f(h)} 0 1 0 ${f(cx + h)} ${cy}Z`);
  let out = `<path d="${d.join("")}" fill="${fill}" fill-rule="evenodd"/>`;
  if (spokes) {
    // ventanas entre radios
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2 + 0.25, a1 = ((i + 1) / spokes) * Math.PI * 2 - 0.25;
      const r0 = r * 0.42, r1 = r * 0.7;
      out += `<path d="M${f(cx + r0 * Math.cos(a0))} ${f(cy + r0 * Math.sin(a0))} L${f(cx + r1 * Math.cos(a0))} ${f(cy + r1 * Math.sin(a0))}
        A${f(r1)} ${f(r1)} 0 0 1 ${f(cx + r1 * Math.cos(a1))} ${f(cy + r1 * Math.sin(a1))} L${f(cx + r0 * Math.cos(a1))} ${f(cy + r0 * Math.sin(a1))}
        A${f(r0)} ${f(r0)} 0 0 0 ${f(cx + r0 * Math.cos(a0))} ${f(cy + r0 * Math.sin(a0))}Z" fill="#0c0906" opacity=".85"/>`;
    }
  }
  return out;
}

function chain(x, y0, y1, size = 26, color = "#120d09", light = "#6b5032") {
  let out = "";
  let i = 0;
  for (let y = y0; y < y1; y += size * 0.78, i++) {
    out += i % 2
      ? `<rect x="${f(x - 3)}" y="${f(y)}" width="6" height="${f(size)}" rx="3" fill="${color}"/>`
      : `<ellipse cx="${x}" cy="${f(y + size / 2)}" rx="${f(size * 0.32)}" ry="${f(size * 0.52)}" fill="none" stroke="${color}" stroke-width="5"/>
         <ellipse cx="${x - 2}" cy="${f(y + size / 2)}" rx="${f(size * 0.32)}" ry="${f(size * 0.52)}" fill="none" stroke="${light}" stroke-width="1.2" opacity=".5"/>`;
  }
  return out;
}

function hook(x, y, color = "#120d09") {
  return `<path d="M${x} ${y} v26 a22 22 0 1 1 -30 20" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`;
}

function pulley(cx, cy, r, color = "#120d09") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="#3a2a19" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="#4a3620"/>`;
}

/* ---------- La escena ---------- */
const VP = { x: 960, y: 600 };            // punto de fuga
const back = { x0: 300, x1: 1620, y0: 150, y1: 840 };   // la pared del fondo
const win = { x0: 470, x1: 1450, spring: 430, top: 175, bottom: 820 };  // el ventanal

const parts = [];
const add = s => parts.push(s);

/* Fondo, techo y paredes */
add(`<rect width="${W}" height="${H}" fill="#0f0b08"/>`);
add(`<rect x="${back.x0}" y="${back.y0}" width="${back.x1 - back.x0}" height="${back.y1 - back.y0}" fill="url(#wall)"/>`);
// sillares de la pared del fondo
let bricks = "";
for (let y = back.y0; y < back.y1; y += 44) {
  bricks += `M${back.x0} ${y}H${back.x1}`;
  const off = ((y - back.y0) / 44) % 2 ? 0 : 60;
  for (let x = back.x0 + off; x < back.x1; x += 120) bricks += `M${x} ${y}v44`;
}
add(`<path d="${bricks}" stroke="#000" stroke-opacity=".28" stroke-width="2" fill="none"/>`);
// paredes laterales en perspectiva
add(`<path d="M0 0 L${back.x0} ${back.y0} L${back.x0} ${back.y1} L0 ${H}Z" fill="url(#sideL)"/>`);
add(`<path d="M${W} 0 L${back.x1} ${back.y0} L${back.x1} ${back.y1} L${W} ${H}Z" fill="url(#sideR)"/>`);
add(`<path d="M0 0 H${W} L${back.x1} ${back.y0} H${back.x0}Z" fill="#0a0705"/>`);
// vigas del techo
for (const [y, h] of [[40, 34], [105, 22]]) {
  add(`<path d="M0 ${y} H${W} v${h} H0Z" fill="#080604"/><path d="M0 ${y + h} H${W}" stroke="#4a3520" stroke-opacity=".35" stroke-width="2"/>`);
}

/* El ventanal */
const rx = (win.x1 - win.x0) / 2, ry = win.spring - win.top, cx = (win.x0 + win.x1) / 2;
const archPath = `M${win.x0} ${win.bottom} V${win.spring} A${rx} ${ry} 0 0 1 ${win.x1} ${win.spring} V${win.bottom}Z`;
add(`<path d="${archPath}" fill="url(#glass)"/>`);
// el resplandor del cristal
add(`<path d="${archPath}" fill="url(#glassGlow)" opacity=".9"/>`);
// parteluces y travesaños
let bars = "";
for (let x = win.x0 + 61; x < win.x1 - 20; x += 61) bars += `M${f(x)} ${win.spring - Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)) * ry}V${win.bottom}`;
for (let y = win.spring + 62; y < win.bottom; y += 62) bars += `M${win.x0} ${y}H${win.x1}`;
add(`<path d="${bars}" stroke="#1a120b" stroke-width="7" fill="none"/>`);
// arcos y radios de la tracería
let tr = "";
for (const k of [0.36, 0.68]) tr += `M${f(cx - rx * k)} ${win.spring} A${f(rx * k)} ${f(ry * k)} 0 0 1 ${f(cx + rx * k)} ${win.spring}`;
for (let i = 1; i < 12; i++) {
  const a = Math.PI - (i / 12) * Math.PI;
  tr += `M${f(cx + rx * 0.36 * Math.cos(a))} ${f(win.spring - ry * 0.36 * Math.sin(a))}L${f(cx + rx * Math.cos(a))} ${f(win.spring - ry * Math.sin(a))}`;
}
add(`<path d="${tr}" stroke="#1a120b" stroke-width="9" fill="none"/>`);
// pilares gruesos que parten el ventanal en tres
for (const x of [cx - rx / 3, cx + rx / 3]) add(`<rect x="${f(x - 9)}" y="${win.top + 40}" width="18" height="${win.bottom - win.top - 40}" fill="#140e09"/>`);
add(`<rect x="${win.x0 - 14}" y="${win.spring - 10}" width="${win.x1 - win.x0 + 28}" height="16" fill="#140e09"/>`);
// el marco
add(`<path d="${archPath}" fill="none" stroke="#0f0a06" stroke-width="30"/>`);
add(`<rect x="${win.x0 - 40}" y="${win.bottom}" width="${win.x1 - win.x0 + 80}" height="26" fill="#120c08"/>`);

/* El suelo, en perspectiva */
add(`<path d="M0 ${H} L${back.x0} ${back.y1} H${back.x1} L${W} ${H}Z" fill="url(#floor)"/>`);
let planks = "";
for (let i = -14; i <= 14; i++) {
  const xb = back.x0 + (back.x1 - back.x0) * (i + 14) / 28;
  const t = (H - VP.y) / (back.y1 - VP.y);
  planks += `M${f(xb)} ${back.y1}L${f(VP.x + (xb - VP.x) * t)} ${H}`;
}
for (const y of [880, 940, 1020, 1120]) {
  const t = (y - VP.y) / (back.y1 - VP.y);
  planks += `M${f(VP.x + (0 - VP.x))} ${y}H${W}`;
  void t;
}
add(`<path d="${planks}" stroke="#000" stroke-opacity=".35" stroke-width="2.5" fill="none" clip-path="url(#floorClip)"/>`);

/* Los haces de luz, del ventanal al suelo, inclinados hacia el yunque */
const shafts = [
  [[520, 470], [760, 470], [600, 1200], [180, 1200]],
  [[800, 440], [1010, 440], [930, 1200], [560, 1200]],
  [[1050, 450], [1240, 450], [1300, 1200], [980, 1200]],
  [[1280, 500], [1420, 500], [1640, 1200], [1360, 1200]]
];
for (const s of shafts) add(`<path d="M${s.map(p => p.join(" ")).join("L")}Z" fill="url(#shaft)" filter="url(#soft)" style="mix-blend-mode:screen"/>`);
// manchas de luz en el suelo
add(`<ellipse cx="560" cy="1040" rx="420" ry="120" fill="url(#pool)" style="mix-blend-mode:screen"/>`);
add(`<ellipse cx="1180" cy="1080" rx="380" ry="100" fill="url(#pool)" opacity=".7" style="mix-blend-mode:screen"/>`);

/* Engranajes en las paredes y en las esquinas */
add(gear(120, 150, 230, 26, "#0b0806", 0.22, 6));
add(gear(330, 330, 110, 16, "#100b08", 0.3));
add(gear(1830, 300, 170, 22, "#0b0806", 0.24, 5));
add(gear(1690, 470, 80, 12, "#110c08", 0.32));
add(gear(1840, 980, 240, 28, "#080604", 0.2, 6));

/* Tuberías a la izquierda */
for (const [x, w] of [[60, 34], [112, 22], [150, 16]]) {
  add(`<rect x="${x}" y="300" width="${w}" height="900" fill="#0d0907"/><rect x="${x + w * 0.2}" y="300" width="${w * 0.18}" height="900" fill="#5a4128" opacity=".25"/>`);
  for (const y of [420, 640, 880]) add(`<rect x="${x - 5}" y="${y}" width="${w + 10}" height="16" rx="3" fill="#120d09"/>`);
}
add(`<path d="M60 520 H260 V700" fill="none" stroke="#0d0907" stroke-width="26"/>`);
add(`<circle cx="260" cy="520" r="30" fill="#0f0b08"/><circle cx="260" cy="520" r="12" fill="none" stroke="#5a4128" stroke-width="3" opacity=".6"/>`);

/* Estante con tenazas y herramientas, a la izquierda */
add(`<rect x="190" y="740" width="230" height="12" fill="#120d09"/>`);
for (let i = 0; i < 6; i++) {
  const x = 210 + i * 36;
  add(`<path d="M${x} 752 l-8 150 M${x + 10} 752 l8 150" stroke="#0e0a07" stroke-width="6" stroke-linecap="round"/>`);
}

/* Cadenas y poleas colgando del techo */
add(pulley(470, 160, 40));
add(chain(470, 200, 640));
add(hook(470, 640));
add(chain(410, 140, 470, 22));
add(pulley(1460, 150, 44));
add(chain(1460, 194, 560));
add(hook(1460, 560));
add(chain(1530, 140, 700, 22));
add(`<path d="M0 230 Q420 300 700 210" fill="none" stroke="#0d0907" stroke-width="6"/>`);

/* El brazo mecánico, a la derecha */
add(`<rect x="1585" y="150" width="56" height="900" fill="#0c0806"/><rect x="1592" y="150" width="8" height="900" fill="#6a4c2c" opacity=".25"/>`);
add(`<circle cx="1613" cy="420" r="44" fill="#0f0b08"/><circle cx="1613" cy="420" r="18" fill="#3a2a19"/>`);
// brazo, con su pistón de vapor, y el antebrazo colgando hacia el suelo
add(`<path d="M1613 420 L1420 520" stroke="#0e0a07" stroke-width="50" stroke-linecap="round"/>`);
add(`<path d="M1613 420 L1420 520" stroke="#a87a44" stroke-opacity=".28" stroke-width="3" transform="translate(-4 -22)"/>`);
add(`<path d="M1613 520 L1500 478" stroke="#0d0907" stroke-width="22" stroke-linecap="round"/><path d="M1500 478 L1452 460" stroke="#2c2015" stroke-width="10" stroke-linecap="round"/>`);
add(`<circle cx="1613" cy="520" r="14" fill="#100b08"/><circle cx="1613" cy="520" r="5" fill="#3a2a19"/>`);
add(`<circle cx="1420" cy="520" r="38" fill="#100b08"/><circle cx="1420" cy="520" r="15" fill="#3a2a19"/>`);
add(`<path d="M1420 520 L1440 730" stroke="#0e0a07" stroke-width="36" stroke-linecap="round"/>`);
add(`<path d="M1424 540 L1442 720" stroke="#a87a44" stroke-opacity=".2" stroke-width="3" transform="translate(-14 0)"/>`);
add(`<circle cx="1440" cy="735" r="24" fill="#100b08"/><circle cx="1440" cy="735" r="8" fill="#3a2a19"/>`);
// la pinza, abierta
add(`<path d="M1440 735 q-46 30 -40 92 l14 2 q0 -52 34 -78 M1440 735 q46 30 40 92 l-14 2 q0 -52 -34 -78" fill="#0e0a07" stroke="#0e0a07" stroke-width="10" stroke-linejoin="round"/>`);
add(gear(1613, 640, 60, 12, "#100b08", 0.3));

/* El yunque, a la izquierda, con el hierro al rojo */
const ax = 470, ay = 930;
add(`<ellipse cx="${ax}" cy="${ay + 170}" rx="260" ry="34" fill="#000" opacity=".55"/>`);
// tocón y pie
add(`<path d="M${ax - 90} ${ay + 170} L${ax - 70} ${ay + 40} H${ax + 70} L${ax + 90} ${ay + 170}Z" fill="#0d0907"/>`);
add(`<path d="M${ax - 70} ${ay + 40} H${ax + 70}" stroke="#7a5630" stroke-opacity=".35" stroke-width="3"/>`);
// cuerpo del yunque: cara, cintura, cuerno y talón
add(`<path d="M${ax - 170} ${ay - 40} Q${ax - 230} ${ay - 36} ${ax - 280} ${ay - 22} Q${ax - 200} ${ay - 2} ${ax - 120} ${ay + 4}
  L${ax - 60} ${ay + 10} L${ax - 80} ${ay + 40} H${ax + 80} L${ax + 60} ${ay + 10} L${ax + 140} ${ay + 6} L${ax + 150} ${ay - 40}Z" fill="#0b0806"/>`);
add(`<path d="M${ax - 280} ${ay - 22} Q${ax - 230} ${ay - 36} ${ax - 170} ${ay - 40} H${ax + 150}" fill="none" stroke="#e0a95c" stroke-opacity=".55" stroke-width="3"/>`);
// el hierro al rojo y su resplandor
add(`<circle cx="${ax - 10}" cy="${ay - 46}" r="150" fill="url(#ember)" style="mix-blend-mode:screen">
  <animate attributeName="opacity" values=".75;1;.82;.95;.75" dur="3.2s" repeatCount="indefinite"/></circle>`);
add(`<rect x="${ax - 70}" y="${ay - 52}" width="120" height="12" rx="5" fill="#ffb347"/><rect x="${ax - 60}" y="${ay - 50}" width="96" height="5" rx="2" fill="#fff1c4"/>`);
add(`<path d="M${ax + 50} ${ay - 46} L${ax + 210} ${ay - 70}" stroke="#0b0806" stroke-width="10" stroke-linecap="round"/>`);
// chispas
let sparks = "";
for (let i = 0; i < 46; i++) {
  const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6;
  const d0 = 20 + rnd() * 40, d1 = d0 + 14 + rnd() * 60 * (1 + rnd());
  const x0 = ax - 10 + Math.cos(a) * d0, y0 = ay - 50 + Math.sin(a) * d0;
  const x1 = ax - 10 + Math.cos(a) * d1, y1 = ay - 50 + Math.sin(a) * d1 + rnd() * 12;
  sparks += `<path d="M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}" stroke="${rnd() < 0.5 ? "#ffd27a" : "#ff9a3c"}" stroke-width="${f(1 + rnd() * 1.8)}" stroke-linecap="round" opacity="${f(0.5 + rnd() * 0.5)}"/>`;
}
add(`<g filter="url(#spark)">${sparks}<animate attributeName="opacity" values="1;.55;.9;.4;1" dur="1.6s" repeatCount="indefinite"/></g>`);
// martillo apoyado en el tocón
add(`<path d="M${ax + 120} ${ay + 165} L${ax + 70} ${ay + 60}" stroke="#0b0806" stroke-width="12" stroke-linecap="round"/>
  <rect x="${ax + 40}" y="${ay + 32}" width="64" height="30" rx="5" transform="rotate(-25 ${ax + 72} ${ay + 47})" fill="#0b0806"/>`);

/* Polvo flotando en la luz */
let dust = "";
for (let i = 0; i < 140; i++) {
  const s = shafts[Math.floor(rnd() * shafts.length)];
  const t = rnd(), u = rnd();
  const xa = s[0][0] + (s[3][0] - s[0][0]) * t, xb = s[1][0] + (s[2][0] - s[1][0]) * t;
  const x = xa + (xb - xa) * u, y = s[0][1] + (H - s[0][1]) * t;
  dust += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + rnd() * 2.2)}" fill="#ffe9b8" opacity="${f(0.15 + rnd() * 0.45)}"/>`;
}
add(`<g>${dust}<animateTransform attributeName="transform" type="translate" values="0 0; 6 -14; 0 0" dur="14s" repeatCount="indefinite"/></g>`);

/* Bruma, grano y viñeta */
add(`<ellipse cx="960" cy="760" rx="900" ry="240" fill="#c99a5c" opacity=".07" filter="url(#haze)"/>`);
add(`<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".5"/>`);
add(`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`);

const defs = `<defs>
  <radialGradient id="wall" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3a2a1a"/><stop offset=".6" stop-color="#21170e"/><stop offset="1" stop-color="#120d08"/></radialGradient>
  <linearGradient id="sideL" x1="0" x2="1"><stop offset="0" stop-color="#070504"/><stop offset="1" stop-color="#1a120b"/></linearGradient>
  <linearGradient id="sideR" x1="1" x2="0"><stop offset="0" stop-color="#070504"/><stop offset="1" stop-color="#1a120b"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9cf98"/><stop offset=".55" stop-color="#f3dfb0"/><stop offset="1" stop-color="#c79a5e"/></linearGradient>
  <radialGradient id="glassGlow" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fff5d8" stop-opacity=".85"/><stop offset="1" stop-color="#fff5d8" stop-opacity="0"/></radialGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d12"/><stop offset="1" stop-color="#0c0806"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b3" stop-opacity=".6"/><stop offset=".7" stop-color="#e8b878" stop-opacity=".12"/><stop offset="1" stop-color="#e8b878" stop-opacity="0"/></linearGradient>
  <radialGradient id="pool"><stop offset="0" stop-color="#f0c98a" stop-opacity=".35"/><stop offset="1" stop-color="#f0c98a" stop-opacity="0"/></radialGradient>
  <radialGradient id="ember"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".25" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette" cx="50%" cy="48%" r="75%"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".82"/></radialGradient>
  <clipPath id="floorClip"><path d="M0 ${H} L${back.x0} ${back.y1} H${back.x1} L${W} ${H}Z"/></clipPath>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="haze" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="60"/></filter>
  <filter id="spark" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
    <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .14  0 0 0 .55 0"/></filter>
</defs>`;

/* Sin animaciones si el sistema pide menos movimiento */
const style = `<style>@media (prefers-reduced-motion: reduce) { animate, animateTransform { display: none; } }</style>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<!-- Mesa · fondo de la entrada: una forja. Generado por tools/fondo-forja.mjs -->
${style}${defs}${parts.join("\n")}</svg>
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "forja.svg"), svg.replace(/\n\s+/g, " "));
console.log("public/fondos/forja.svg", Math.round(svg.length / 1024) + " KB");
