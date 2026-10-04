/* Mesa · retratos por defecto de cada especie

   Genera public/retratos/<especie>-<m|f>.svg: un busto sencillo, de frente,
   para cada especie del creador de personajes y para cada sexo. Es lo que
   sale en la ficha y en el mapa mientras el jugador no suba su retrato.

   node tools/retratos.mjs   (desde mesa/mesa)

   Están dibujados para verse dentro de un círculo pequeño: cara y hombros
   centrados, siluetas claras y pocos detalles. */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "retratos");

/* ---------- Piezas ---------- */
const P = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;

/* Cara y cuello. «w» ensancha la cabeza (enanos, orcos, goliats) y «jaw»
   la hace más cuadrada. */
function head({ skin, shade, w = 1, jaw = 0, y = 0 }) {
  const rx = 31 * w, top = 52 + y, chin = 132 + y;
  const sx = 100 - rx, ex = 100 + rx;
  const neck = `<path d="M${100 - 15 * w} ${112 + y} L${100 - 17 * w} 150 L${100 + 17 * w} 150 L${100 + 15 * w} ${112 + y} Z" fill="${shade}"/>`;
  const face = `<path d="M${sx} ${90 + y} C${sx} ${top + 8} ${sx + 12} ${top} 100 ${top} C${ex - 12} ${top} ${ex} ${top + 8} ${ex} ${90 + y}
    C${ex} ${108 + y + jaw} ${ex - 10 - jaw} ${chin - 6} 100 ${chin} C${sx + 10 + jaw} ${chin - 6} ${sx} ${108 + y + jaw} ${sx} ${90 + y} Z" fill="${skin}"/>`;
  return { neck, face };
}

/* Ojos, cejas, nariz y boca. «glow» pinta los ojos de luz (aasimar, tiefling). */
function features({ y = 0, w = 1, brow = "#2a1d16", eye = "#1c1714", glow = null, nose = "#00000022", mouth = "#7a3b34", fem = false, browY = 0, noseSize = 1 }) {
  const ex = 13 * w, ey = 93 + y;
  const eyes = glow
    ? `<ellipse cx="${100 - ex}" cy="${ey}" rx="5.2" ry="3.4" fill="${glow}"/><ellipse cx="${100 + ex}" cy="${ey}" rx="5.2" ry="3.4" fill="${glow}"/>`
    : `<ellipse cx="${100 - ex}" cy="${ey}" rx="4.6" ry="3.2" fill="#f4efe6"/><ellipse cx="${100 + ex}" cy="${ey}" rx="4.6" ry="3.2" fill="#f4efe6"/>
       <circle cx="${100 - ex}" cy="${ey}" r="2.5" fill="${eye}"/><circle cx="${100 + ex}" cy="${ey}" r="2.5" fill="${eye}"/>`;
  const lash = fem ? `<path d="M${100 - ex - 6} ${ey - 2} q6 -5 12 0 M${100 + ex - 6} ${ey - 2} q6 -5 12 0" stroke="#1a1410" stroke-width="1.6" fill="none"/>` : "";
  const bw = fem ? 1.8 : 3;
  const brows = `<path d="M${100 - ex - 7} ${ey - 9 + browY} q7 ${fem ? -4 : -3} 14 0 M${100 + ex - 7} ${ey - 9 + browY} q7 ${fem ? -4 : -3} 14 0" stroke="${brow}" stroke-width="${bw}" stroke-linecap="round" fill="none"/>`;
  const n = noseSize;
  const noseP = `<path d="M100 ${ey + 2} l${-4 * n} ${14 * n} q${4 * n} ${3 * n} ${8 * n} 0 Z" fill="${nose}"/>`;
  const mouthP = `<path d="M${fem ? 92 : 91} ${ey + 22} q${fem ? 8 : 9} ${fem ? 5 : 3} ${fem ? 16 : 18} 0" stroke="${mouth}" stroke-width="${fem ? 3 : 2.4}" stroke-linecap="round" fill="none"/>`;
  return eyes + lash + brows + noseP + mouthP;
}

/* Ropa: hombros con un manto de viaje y un broche, igual para todos */
function shoulders({ cloth, trim, w = 1 }) {
  const s = 66 * w;
  return `<path d="M${100 - s - 20} 205 C${100 - s - 16} 168 ${100 - s} 150 100 146 C${100 + s} 150 ${100 + s + 16} 168 ${100 + s + 20} 205 Z" fill="${cloth}"/>
    <path d="M${100 - 26} 150 L100 186 L${100 + 26} 150" stroke="${trim}" stroke-width="5" fill="none" stroke-linejoin="round"/>
    <circle cx="100" cy="186" r="6" fill="${trim}"/>`;
}

/* Orejas: redondas, de punta (elfo, semielfo), grandes de gnomo o ninguna */
function ears({ kind, skin, shade, y = 0, w = 1 }) {
  const L = 100 - 31 * w, R = 100 + 31 * w, ey = 96 + y;
  if (kind === "none") return "";
  if (kind === "round") return `<ellipse cx="${L - 2}" cy="${ey}" rx="6" ry="10" fill="${shade}"/><ellipse cx="${R + 2}" cy="${ey}" rx="6" ry="10" fill="${shade}"/>`;
  const len = kind === "elf" ? 26 : kind === "half" ? 13 : 18, up = kind === "elf" ? 22 : kind === "half" ? 9 : 6;
  const fat = kind === "gnome" ? 12 : 8;
  return `<path d="M${L + 3} ${ey - fat} L${L - len} ${ey - up} L${L + 3} ${ey + fat} Z" fill="${shade}"/>
    <path d="M${R - 3} ${ey - fat} L${R + len} ${ey - up} L${R - 3} ${ey + fat} Z" fill="${shade}"/>`;
}

/* Pelo por detrás de la cabeza (largo, trenzas, coleta) */
function hairBack(style, color, y = 0, w = 1) {
  const L = 100 - 36 * w, R = 100 + 36 * w;
  switch (style) {
    case "long": return P(`M${L} ${92 + y} C${L - 4} ${50 + y} ${100 - 20} ${40 + y} 100 ${40 + y} C${100 + 20} ${40 + y} ${R + 4} ${50 + y} ${R} ${92 + y} L${R + 8} 172 L${L - 8} 172 Z`, color);
    case "wavy": return P(`M${L} ${92 + y} C${L - 6} ${46 + y} ${100 - 22} ${38 + y} 100 ${38 + y} C${100 + 22} ${38 + y} ${R + 6} ${46 + y} ${R} ${92 + y} C${R + 14} 120 ${R + 2} 140 ${R + 14} 160 L${L - 14} 160 C${L - 2} 140 ${L - 14} 120 ${L} ${92 + y} Z`, color);
    case "braids": return P(`M${L + 2} ${84 + y} l-7 76 l12 0 l3 -70 Z M${R - 2} ${84 + y} l7 76 l-12 0 l-3 -70 Z`, color) +
      `<circle cx="${L - 1}" cy="164" r="5" fill="#c9a24a"/><circle cx="${R + 1}" cy="164" r="5" fill="#c9a24a"/>`;
    case "bun": return `<circle cx="100" cy="${40 + y}" r="15" fill="${color}"/>`;
    case "tail": return P(`M${R - 6} ${70 + y} C${R + 22} ${86 + y} ${R + 10} ${130 + y} ${R + 18} 156 L${R + 4} 158 C${R} ${130 + y} ${R + 4} ${96 + y} ${R - 12} ${84 + y} Z`, color);
    default: return "";
  }
}

/* Pelo por delante: el casco que cubre la frente */
function hairFront(style, color, y = 0, w = 1) {
  const L = 100 - 32 * w, R = 100 + 32 * w;
  switch (style) {
    case "short": return P(`M${L} ${86 + y} C${L - 2} ${52 + y} ${100 - 18} ${44 + y} 100 ${45 + y} C${100 + 18} ${44 + y} ${R + 2} ${52 + y} ${R} ${86 + y} C${R - 4} ${72 + y} ${100 + 12} ${62 + y} 100 ${66 + y} C${100 - 14} ${60 + y} ${L + 4} ${72 + y} ${L} ${86 + y} Z`, color);
    case "parted": return P(`M${L - 2} ${96 + y} C${L - 4} ${52 + y} ${100 - 18} ${42 + y} 100 ${43 + y} C${100 + 18} ${42 + y} ${R + 4} ${52 + y} ${R + 2} ${96 + y} C${R - 6} ${78 + y} ${R - 10} ${66 + y} 102 ${60 + y} C${100 - 12} ${66 + y} ${L + 4} ${78 + y} ${L - 2} ${96 + y} Z`, color);
    case "curly": return Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * (0.95 + i * 0.1375), r = 31 * w;
      return `<circle cx="${(100 + Math.cos(a) * r).toFixed(1)}" cy="${(84 + y + Math.sin(a) * r * 1.05).toFixed(1)}" r="11" fill="${color}"/>`;
    }).join("");
    case "wild": return P(`M${L - 4} ${88 + y} l-10 -14 l10 -4 l-8 -18 l14 4 l2 -18 l14 10 l10 -16 l8 16 l12 -14 l4 18 l14 -6 l-4 18 l14 2 l-12 14 l-2 6 C${R - 6} ${70 + y} ${100 + 10} ${62 + y} 100 ${64 + y} C${100 - 12} ${62 + y} ${L + 6} ${70 + y} ${L - 4} ${88 + y} Z`, color);
    case "mohawk": return P(`M92 ${66 + y} C90 ${46 + y} 94 ${30 + y} 100 ${24 + y} C106 ${30 + y} 110 ${46 + y} 108 ${66 + y} Z`, color);
    case "crop": return P(`M${L + 2} ${78 + y} C${L + 2} ${54 + y} ${100 - 16} ${46 + y} 100 ${47 + y} C${100 + 16} ${46 + y} ${R - 2} ${54 + y} ${R - 2} ${78 + y} C${R - 10} ${64 + y} ${100 + 8} ${60 + y} 100 ${60 + y} C${100 - 8} ${60 + y} ${L + 10} ${64 + y} ${L + 2} ${78 + y} Z`, color);
    default: return "";
  }
}

/* Barba de enano: grande, trenzada; o barba corta */
function beard(kind, color, y = 0, w = 1) {
  if (kind === "dwarf") {
    return P(`M${100 - 30 * w} ${98 + y} C${100 - 32 * w} ${130 + y} ${100 - 20} 150 100 168 C${100 + 20} 150 ${100 + 32 * w} ${130 + y} ${100 + 30 * w} ${98 + y} C${100 + 20} ${112 + y} ${100 + 10} ${118 + y} 100 ${116 + y} C${100 - 10} ${118 + y} ${100 - 20} ${112 + y} ${100 - 30 * w} ${98 + y} Z`, color) +
      `<path d="M100 ${120 + y} L100 162" stroke="#00000033" stroke-width="3"/><circle cx="100" cy="164" r="5" fill="#c9a24a"/>` +
      P(`M88 ${113 + y} q12 -6 24 0 q-12 3 -24 0 Z`, color);
  }
  if (kind === "short") {
    return P(`M${100 - 30 * w} ${98 + y} C${100 - 30 * w} ${118 + y} ${100 - 16} ${134 + y} 100 ${135 + y} C${100 + 16} ${134 + y} ${100 + 30 * w} ${118 + y} ${100 + 30 * w} ${98 + y} C${100 + 20} ${112 + y} 100 ${112 + y} 100 ${112 + y} C100 ${112 + y} ${100 - 20} ${112 + y} ${100 - 30 * w} ${98 + y} Z`, color, ' opacity=".85"');
  }
  return "";
}

/* Cuernos: curvos hacia atrás (tiefling) o rectos hacia atrás (dracónido) */
function horns(kind, color, y = 0) {
  if (kind === "ram") {
    return `<path d="M76 ${66 + y} C62 ${40 + y} 40 ${44 + y} 46 ${66 + y} C50 ${80 + y} 64 ${74 + y} 62 ${64 + y}" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M124 ${66 + y} C138 ${40 + y} 160 ${44 + y} 154 ${66 + y} C150 ${80 + y} 136 ${74 + y} 138 ${64 + y}" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  }
  if (kind === "straight") {
    return `<path d="M82 ${62 + y} L60 ${26 + y} L92 ${56 + y} Z M118 ${62 + y} L140 ${26 + y} L108 ${56 + y} Z" fill="${color}"/>`;
  }
  if (kind === "back") {
    return `<path d="M76 ${66 + y} L46 ${40 + y} L84 ${58 + y} Z M124 ${66 + y} L154 ${40 + y} L116 ${58 + y} Z M70 ${78 + y} L44 ${64 + y} L74 ${70 + y} Z M130 ${78 + y} L156 ${64 + y} L126 ${70 + y} Z" fill="${color}"/>`;
  }
  return "";
}

/* Cabeza de dracónido: hocico, escamas y crestas */
function dragonHead({ skin, shade, belly, eye, fem }) {
  return `<path d="M86 112 L82 150 L118 150 L114 112 Z" fill="${shade}"/>
    <path d="M100 48 C124 48 134 64 134 84 C134 96 130 102 126 108 C122 122 112 134 100 136 C88 134 78 122 74 108 C70 102 66 96 66 84 C66 64 76 48 100 48 Z" fill="${skin}"/>
    <path d="M84 112 C88 126 94 132 100 133 C106 132 112 126 116 112 C110 116 106 118 100 118 C94 118 90 116 84 112 Z" fill="${belly}"/>
    ${[0, 1, 2].map(i => `<path d="M${88 + i * 12} ${62 + (i === 1 ? -2 : 0)} l6 -6 l6 6 Z" fill="${shade}"/>`).join("")}
    <path d="M80 92 l14 -4 l-2 6 Z M120 92 l-14 -4 l2 6 Z" fill="#1a1410"/>
    <ellipse cx="88" cy="96" rx="5" ry="3.4" fill="${eye}"/><ellipse cx="112" cy="96" rx="5" ry="3.4" fill="${eye}"/>
    <path d="M87 93 v6 M113 93 v6" stroke="#1a1410" stroke-width="1.6"/>
    <circle cx="95" cy="114" r="1.8" fill="#1a1410"/><circle cx="105" cy="114" r="1.8" fill="#1a1410"/>
    <path d="M86 124 q14 6 28 0" stroke="#1a1410" stroke-width="2" fill="none" opacity=".6"/>
    ${fem ? `<path d="M66 84 L50 74 L60 92 L48 98 L68 100 Z M134 84 L150 74 L140 92 L152 98 L132 100 Z" fill="${shade}"/>` : ""}`;
}

/* ---------- Las especies ----------
   Cada una con lo que la hace reconocible de un vistazo, en dos versiones. */
const SPECIES = {
  humano: {
    bg: ["#3a4a66", "#1c2433"],
    m: { skin: "#d9a77f", shade: "#b98663", hair: "#4a2f1e", front: "short", beard: "short", cloth: "#5a3d2a", trim: "#c89b4a", ears: "round" },
    f: { skin: "#e3b48f", shade: "#c39070", hair: "#6b3a1f", back: "long", front: "parted", cloth: "#3f5a46", trim: "#d8c08a", ears: "round" }
  },
  elfo: {
    bg: ["#2f5a4a", "#16271f"],
    m: { skin: "#f0d6bd", shade: "#d5b79c", hair: "#e8d79a", back: "long", front: "parted", cloth: "#2f5c3e", trim: "#d8c08a", ears: "elf" },
    f: { skin: "#f3dcc6", shade: "#d8bca2", hair: "#d9e1ea", back: "wavy", front: "parted", cloth: "#4a3f78", trim: "#c8d4e6", ears: "elf", circlet: "#c8d4e6" }
  },
  semielfo: {
    bg: ["#4a4366", "#211d30"],
    m: { skin: "#e0b48c", shade: "#c19370", hair: "#7a3a1c", back: "tail", front: "short", cloth: "#384a6a", trim: "#c89b4a", ears: "half" },
    f: { skin: "#e8bf98", shade: "#c99e7a", hair: "#2b1d16", back: "long", front: "parted", cloth: "#6a3a4a", trim: "#d8c08a", ears: "half" }
  },
  enano: {
    w: 1.12, jaw: 4, y: 6,
    bg: ["#6a4a2a", "#2e1f12"],
    m: { skin: "#d39a78", shade: "#b27b5c", hair: "#8a3b1a", front: "crop", beard: "dwarf", cloth: "#5a5f6a", trim: "#c9a24a", ears: "round", noseSize: 1.3 },
    f: { skin: "#dca482", shade: "#bb8464", hair: "#a24a1e", back: "braids", front: "parted", cloth: "#4a5568", trim: "#c9a24a", ears: "round", noseSize: 1.1 }
  },
  mediano: {
    w: 1.05, y: 12,
    bg: ["#5a6a2f", "#262d14"],
    m: { skin: "#e6b48e", shade: "#c79470", hair: "#5a3a1e", front: "curly", cloth: "#7a5a2a", trim: "#e0c070", ears: "half", cheeks: true },
    f: { skin: "#eebe98", shade: "#cf9c78", hair: "#8a4a22", back: "long", front: "curly", cloth: "#4a6a3a", trim: "#e0c070", ears: "half", cheeks: true }
  },
  gnomo: {
    w: 1.08, y: 12,
    bg: ["#2f5a6a", "#13262d"],
    m: { skin: "#ecc29c", shade: "#cda07c", hair: "#eae6dc", front: "wild", beard: "short", cloth: "#6a3a6a", trim: "#7fd0d8", ears: "gnome", noseSize: 1.5, goggles: true },
    f: { skin: "#f0c8a4", shade: "#d1a682", hair: "#e05a8a", back: "bun", front: "wild", cloth: "#2f6a5a", trim: "#f0c060", ears: "gnome", noseSize: 1.25, goggles: true }
  },
  draconido: {
    bg: ["#6a2f2f", "#2a1212"],
    dragon: true,
    m: { skin: "#b06a2c", shade: "#8a4e1c", belly: "#e0b070", eye: "#ffd04a", horn: "#e8d8b0", horns: "back", cloth: "#4a2a1e", trim: "#e0b070" },
    f: { skin: "#4a7aa8", shade: "#345a80", belly: "#bcd6ea", eye: "#bff0ff", horn: "#e6eef4", horns: "back", cloth: "#2a3a5a", trim: "#bcd6ea" }
  },
  tiefling: {
    bg: ["#5a2a4a", "#24101e"],
    m: { skin: "#b8473f", shade: "#933530", hair: "#1e1424", front: "parted", back: "tail", horns: "ram", horn: "#2a2228", glow: "#ffcf5a", cloth: "#2a1e2e", trim: "#c84a4a", ears: "half", tail: true },
    f: { skin: "#8a5aa8", shade: "#6a4086", hair: "#14101e", back: "long", front: "parted", horns: "ram", horn: "#e8dcc8", glow: "#f0f0ff", cloth: "#3a1e3e", trim: "#d8a0e0", ears: "half", tail: true }
  },
  semiorco: {
    w: 1.08, jaw: 6,
    bg: ["#4a5a3a", "#1e2618"],
    m: { skin: "#9aa47a", shade: "#7c8660", hair: "#1e1a14", front: "mohawk", cloth: "#5a3a2a", trim: "#b8a070", ears: "half", tusks: 7 },
    f: { skin: "#a8b088", shade: "#8a926c", hair: "#2a2018", back: "tail", front: "crop", cloth: "#3a4a5a", trim: "#b8a070", ears: "half", tusks: 5 }
  },
  orco: {
    w: 1.14, jaw: 8,
    bg: ["#3a5a2a", "#162410"],
    m: { skin: "#6f8f4a", shade: "#56723a", hair: "#141210", back: "tail", front: "crop", cloth: "#4a3020", trim: "#a83a2a", ears: "half", tusks: 11, brow: true },
    f: { skin: "#7a9a56", shade: "#5f7c44", hair: "#1a1612", back: "braids", front: "crop", cloth: "#3a2a20", trim: "#a83a2a", ears: "half", tusks: 8, brow: true }
  },
  aasimar: {
    bg: ["#6a5a2a", "#2a2412"],
    halo: "#ffe9a8",
    m: { skin: "#f2d2b2", shade: "#d4b292", hair: "#f4e6c0", front: "short", cloth: "#e6e0d0", trim: "#d8b04a", ears: "round", glow: "#fff2b0" },
    f: { skin: "#a8735a", shade: "#8a5a44", hair: "#f6f0e0", back: "wavy", front: "parted", cloth: "#d8d2c4", trim: "#d8b04a", ears: "round", glow: "#fff2b0" }
  },
  goliat: {
    w: 1.12, jaw: 6,
    bg: ["#4a5566", "#1d222b"],
    m: { skin: "#a8aeb6", shade: "#868c96", hair: null, cloth: "#5a4a3a", trim: "#8ab0c8", ears: "round", marks: "#3e4652", brow: true },
    f: { skin: "#b4b8be", shade: "#92969e", hair: "#2a2a30", back: "bun", front: "crop", cloth: "#3a4a5a", trim: "#8ab0c8", ears: "round", marks: "#3e4652" }
  }
};

/* ---------- Componer ---------- */
function portrait(id, sex) {
  const sp = SPECIES[id], o = sp[sex];
  const w = sp.w || 1, jaw = sp.jaw || 0, y = sp.y || 0, fem = sex === "f";
  const parts = [];
  /* Un nombre propio para el degradado: si varios retratos acaban en la
     misma página, cada uno conserva su fondo */
  const g = `fondo-${id}-${sex}`;
  parts.push(`<defs><radialGradient id="${g}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${sp.bg[0]}"/><stop offset="1" stop-color="${sp.bg[1]}"/></radialGradient></defs>`);
  parts.push(`<rect width="200" height="200" fill="url(#${g})"/>`);
  if (sp.halo) parts.push(`<circle cx="100" cy="${58 + y}" r="52" fill="none" stroke="${sp.halo}" stroke-width="5" opacity=".55"/><circle cx="100" cy="${58 + y}" r="60" fill="${sp.halo}" opacity=".08"/>`);
  if (o.tail) parts.push(`<path d="M150 205 C160 170 176 150 168 120 C164 104 176 96 182 104" stroke="${o.shade}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M182 104 l8 -12 l-2 16 Z" fill="${o.shade}"/>`);
  if (sp.dragon) {
    parts.push(horns(o.horns, o.horn, 0));
    parts.push(shoulders({ cloth: o.cloth, trim: o.trim, w: 1.08 }));
    parts.push(dragonHead({ ...o, fem }));
  } else {
    const h = head({ skin: o.skin, shade: o.shade, w, jaw, y });
    if (o.back && o.hair) parts.push(hairBack(o.back, o.hair, y, w));
    parts.push(shoulders({ cloth: o.cloth, trim: o.trim, w }));
    parts.push(h.neck);
    parts.push(ears({ kind: o.ears || "round", skin: o.skin, shade: o.shade, y, w }));
    parts.push(h.face);
    if (o.marks) parts.push(`<path d="M${100 - 26 * w} ${80 + y} l12 6 l-4 8 M${100 + 26 * w} ${80 + y} l-12 6 l4 8 M100 ${56 + y} l0 12 M${100 - 18} ${112 + y} l6 6" stroke="${o.marks}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    if (o.cheeks) parts.push(`<circle cx="${100 - 19 * w}" cy="${106 + y}" r="6" fill="#e0706a" opacity=".35"/><circle cx="${100 + 19 * w}" cy="${106 + y}" r="6" fill="#e0706a" opacity=".35"/>`);
    parts.push(features({ y, w, fem, glow: o.glow, browY: o.brow ? 3 : 0, brow: o.hair && o.hair !== null ? shadeOf(o.hair) : "#2a2420", noseSize: o.noseSize || 1, mouth: fem ? "#9a4a48" : "#6a3a30" }));
    if (o.tusks) parts.push(`<path d="M${100 - 10} ${118 + y} l-2 ${-o.tusks} l5 ${o.tusks - 1} Z M${100 + 10} ${118 + y} l2 ${-o.tusks} l-5 ${o.tusks - 1} Z" fill="#f2ead8"/>`);
    if (o.beard && o.hair) parts.push(beard(o.beard, o.hair, y, w));
    if (o.front && o.hair) parts.push(hairFront(o.front, o.hair, y, w));
    if (o.horns) parts.push(horns(o.horns, o.horn, y));
    if (o.circlet) parts.push(`<path d="M${100 - 30} ${70 + y} q30 -10 60 0" stroke="${o.circlet}" stroke-width="3" fill="none"/><circle cx="100" cy="${65 + y}" r="4" fill="#7fd0ff"/>`);
    if (o.goggles) parts.push(`<path d="M${100 - 33 * w} ${66 + y} L${100 + 33 * w} ${66 + y}" stroke="#4a3a2a" stroke-width="5"/><circle cx="${100 - 12}" cy="${64 + y}" r="9" fill="#7fd0d8" stroke="#8a6a3a" stroke-width="3"/><circle cx="${100 + 12}" cy="${64 + y}" r="9" fill="#7fd0d8" stroke="#8a6a3a" stroke-width="3"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><!-- Mesa · retrato por defecto: ${id} (${fem ? "mujer" : "hombre"}) -->${parts.join("")}</svg>\n`;
}

/* Cejas un poco más oscuras que el pelo */
function shadeOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.round(c * 0.7)).toString(16).padStart(2, "0");
  return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}

mkdirSync(OUT, { recursive: true });
let n = 0;
for (const id of Object.keys(SPECIES)) for (const sex of ["m", "f"]) {
  writeFileSync(path.join(OUT, `${id}-${sex}.svg`), portrait(id, sex).replace(/\n\s+/g, " "));
  n++;
}
console.log(`${n} retratos en ${path.relative(process.cwd(), OUT)}`);
