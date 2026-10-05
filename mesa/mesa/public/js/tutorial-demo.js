/* El taller de Chispa: durante la sección «Útiles» del tutorial, Chispa
   baja a un mapa de prácticas y va enseñando en el tablero cómo funciona
   cada herramienta (levanta muros, abre una puerta, pisa una trampa, cruza
   una trampilla, pinta niebla, entra en una sala…).

   Nada de esto toca los mapas de verdad: el taller es un mapa aparte,
   oculto a la tele mientras dura, que se borra al acabar (o al salir del
   tutorial), y la mesa vuelve al mapa en el que estaba. Si el navegador se
   cerrara a medias, el DM lo limpia la próxima vez que entra.

   Cada paso tiene dos partes: «set», que deja el tablero como estaría al
   acabar ese paso (sin animación, para poder saltar o volver atrás), y
   «play», la demostración animada. Al llegar a un paso se aplica el «set»
   de todos los anteriores y luego se reproduce el suyo. */

import { store, op } from "./net.js";
import { t } from "./i18n.js";

const PROBE = "chispa";
let demo = null;            // { mapId, from, show }
/* La librería estaba fuera y se guardó para el taller (se apunta también
   en el navegador, por si se recarga a medias) */
const SHELF = "mesa.demo.shelf";
const shelfOut = on => { try { on ? localStorage.setItem(SHELF, "1") : localStorage.removeItem(SHELF); } catch {} };
const wasOut = () => { try { return !!localStorage.getItem(SHELF); } catch { return false; } };
let runId = 0;

const mapOf = () => store.doc && store.doc.maps.find(m => m.demo);
const mid = () => (demo && demo.mapId) || (mapOf() || {}).id;
const later = (ms, fn) => { const id = runId; setTimeout(() => { if (id === runId && demo) fn(); }, ms); };
const put = (x, y) => op("char.patch", { id: PROBE, fields: { mapId: mid(), mx: x, my: y } });
const walk = (path, start = 0, ms = 420) => path.forEach(([x, y], i) => later(start + ms * (i + 1), () => op("token.move", { id: PROBE, x, y, mapId: mid() })));
const edges = patch => op("map.edges", { mapId: mid(), patch });
const layer = (name, patch) => op("map.layer", { mapId: mid(), layer: name, patch });
const ping = (x, y) => op("ping", { x, y, mapId: mid(), color: "#e8a93a" });
const rect = (x0, y0, x1, y1, v) => { const p = {}; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p[x + "," + y] = v; return p; };
/* Pinta un rectángulo fila a fila, para que se vea crecer */
const paintRows = (fn, x0, y0, x1, y1, v, start = 0, ms = 160) => {
  for (let y = y0; y <= y1; y++) later(start + (y - y0) * ms, () => fn(rect(x0, y, x1, y, v)));
};

/* La sala de piedra del taller: casillas 8–12 × 3–9 */
const ROOM = (() => {
  const p = {};
  for (let y = 3; y <= 9; y++) { p[`8,${y},v`] = "wall"; p[`13,${y},v`] = "wall"; }
  for (let x = 8; x <= 12; x++) { p[`${x},3,h`] = "wall"; p[`${x},10,h`] = "wall"; }
  return p;
})();
/* La cueva redonda a mano alzada */
const CAVE = Array.from({ length: 25 }, (_, i) => {
  const a = i / 24 * Math.PI * 2, r = 2.6 + Math.sin(a * 3) * 0.35;
  return [Math.round((19 + Math.cos(a) * r) * 100) / 100, Math.round((4.5 + Math.sin(a) * r * 0.85) * 100) / 100];
});
const ARROW = [[6.5, 13.5], [10.5, 13.5]], HEAD = [[10, 13.1], [10.5, 13.5], [10, 13.9]];

/* Lo que se escribe en el taller, en el idioma de la mesa */
const NAME = () => t("Taller de Chispa");
const TRAP = () => t("Trampa de foso, CD 13");

/* El aviso de la nota, si está abierto */
function closeAlert() {
  for (const back of document.querySelectorAll(".modal-back")) {
    if (!back.textContent.includes(TRAP())) continue;
    const x = back.querySelector("[data-close]"); if (x) x.click();
  }
}
const tap = sel => { const b = document.querySelector(sel); if (b) b.click(); };

export const DEMOS = {
  /* Baja al taller */
  intro: {
    set() { demoStart(); },
    play() {}
  },
  map: { set() {}, play() {} },
  token: {
    set() { put(6, 6); },
    play() { put(3, 6); walk([[4, 6], [5, 6], [6, 6]], 200); }
  },
  measure: {
    set() { put(6, 6); },
    play() { later(200, () => ping(6, 6)); later(900, () => ping(11, 8)); later(1600, () => ping(6, 6)); later(2300, () => ping(11, 8)); }
  },
  wall: {
    set() { edges(ROOM); },
    play() {
      const keys = Object.keys(ROOM);
      edges(Object.fromEntries(keys.map(k => [k, null])));
      keys.forEach((k, i) => later(200 + i * 70, () => edges({ [k]: "wall" })));
    }
  },
  brush: {
    set() { op("wall.remove", { mapId: mid(), id: "demo-cave" }); op("wall.add", { mapId: mid(), wall: { id: "demo-cave", points: CAVE } }); },
    play() {
      op("wall.remove", { mapId: mid(), id: "demo-cave" });
      /* El trazo crece tramo a tramo y al final queda uno solo, cerrado */
      for (let n = 3; n < CAVE.length; n += 3) later(n * 45, () => {
        op("wall.remove", { mapId: mid(), id: "demo-cave" });
        op("wall.add", { mapId: mid(), wall: { id: "demo-cave", points: CAVE.slice(0, n + 1) } });
      });
      later(CAVE.length * 45 + 100, () => {
        op("wall.remove", { mapId: mid(), id: "demo-cave" });
        op("wall.add", { mapId: mid(), wall: { id: "demo-cave", points: CAVE } });
      });
    }
  },
  door: {
    set() { edges({ "8,6,v": "doorOpen" }); put(9, 6); },
    play() {
      put(6, 6);
      edges({ "8,6,v": "door" });
      later(1200, () => edges({ "8,6,v": "doorOpen" }));
      walk([[7, 6], [8, 6], [9, 6]], 1500);
    }
  },
  erase: {
    set() { edges({ "10,3,h": null, "11,3,h": null }); },
    play() { edges({ "10,3,h": "wall", "11,3,h": "wall" }); later(700, () => edges({ "10,3,h": null })); later(1200, () => edges({ "11,3,h": null })); }
  },
  pin: {
    set() {
      op("pin.set", { mapId: mid(), pin: { id: "demo-pin", x: 11, y: 8, kind: "peligro", text: TRAP(), party: false } });
      put(11, 8);
    },
    play() {
      put(9, 6);
      op("pin.set", { mapId: mid(), pin: { id: "demo-pin", x: 11, y: 8, kind: "peligro", text: TRAP(), party: false } });
      walk([[10, 6], [10, 7], [11, 7], [11, 8]], 900);
    }
  },
  portal: {
    set() {
      closeAlert();
      op("portal.set", { mapId: mid(), portal: { id: "demo-portal", x: 12, y: 4, toMap: mid(), toX: 2, toY: 12, label: t("Trampilla"), auto: true, ask: false } });
      put(2, 12);
    },
    play() {
      closeAlert();
      put(11, 8);
      op("portal.set", { mapId: mid(), portal: { id: "demo-portal", x: 12, y: 4, toMap: mid(), toX: 2, toY: 12, label: t("Trampilla"), auto: true, ask: false } });
      walk([[11, 7], [11, 6], [11, 5], [12, 5], [12, 4]], 700);
      later(700 + 420 * 6, () => ping(2, 12));
    }
  },
  sound: {
    set() { op("sound.set", { mapId: mid(), sound: { id: "demo-fire", x: 1, y: 9, name: t("Hoguera"), preset: "fuego", radius: 6, on: true } }); },
    play() { later(300, () => { this.set(); ping(1, 9); }); }
  },
  draw: {
    set() {
      op("drawing.remove", { mapId: mid(), id: "demo-arrow" }); op("drawing.remove", { mapId: mid(), id: "demo-head" });
      op("drawing.add", { mapId: mid(), drawing: { id: "demo-arrow", points: ARROW, color: "#e56b6f", width: 0.12 } });
      op("drawing.add", { mapId: mid(), drawing: { id: "demo-head", points: HEAD, color: "#e56b6f", width: 0.12 } });
    },
    play() {
      op("drawing.remove", { mapId: mid(), id: "demo-arrow" }); op("drawing.remove", { mapId: mid(), id: "demo-head" });
      later(300, () => op("drawing.add", { mapId: mid(), drawing: { id: "demo-arrow", points: ARROW, color: "#e56b6f", width: 0.12 } }));
      later(900, () => op("drawing.add", { mapId: mid(), drawing: { id: "demo-head", points: HEAD, color: "#e56b6f", width: 0.12 } }));
    }
  },
  terrain: {
    set() { op("map.cells", { mapId: mid(), patch: { ...rect(12, 11, 14, 13, "fog"), ...rect(15, 11, 16, 13, "dark"), "15,12": "lit" } }); },
    play() {
      op("map.cells", { mapId: mid(), patch: { ...rect(12, 11, 16, 13, null) } });
      const cells = p => op("map.cells", { mapId: mid(), patch: p });
      paintRows(cells, 12, 11, 14, 13, "fog", 200);
      paintRows(cells, 15, 11, 16, 13, "dark", 1100);
      later(2100, () => cells({ "15,12": "lit" }));
    }
  },
  rough: {
    set() { layer("rough", rect(4, 11, 6, 13, 1)); put(7, 12); },
    play() {
      layer("rough", rect(4, 11, 6, 13, null));
      put(2, 12);
      paintRows(p => layer("rough", p), 4, 11, 6, 13, 1, 200);
      walk([[3, 12], [4, 12], [5, 12], [6, 12], [7, 12]], 900, 650);
    }
  },
  room: {
    set() {
      layer("rooms", rect(8, 3, 12, 9, 1));
      op("map.patch", { id: mid(), fields: { roomInfo: { 1: { name: t("Salón del trono"), color: "#d99a2b" } } } });
      put(9, 8);
    },
    play() {
      put(7, 12);
      op("map.patch", { id: mid(), fields: { roomInfo: { 1: { name: t("Salón del trono"), color: "#d99a2b" } } } });
      paintRows(p => layer("rooms", p), 8, 3, 12, 9, 1, 200, 120);
      walk([[7, 11], [7, 10], [7, 9], [7, 8], [7, 7], [7, 6], [8, 6], [9, 6], [9, 7], [9, 8]], 1200, 380);
    }
  },
  reveal: {
    set() { layer("vis", rect(22, 1, 24, 3, "show")); },
    play() { layer("vis", rect(22, 1, 24, 3, null)); paintRows(p => layer("vis", p), 22, 1, 24, 3, "show", 200); }
  },
  hide: {
    set() { layer("vis", rect(22, 5, 24, 7, "hide")); },
    play() { layer("vis", rect(22, 5, 24, 7, null)); paintRows(p => layer("vis", p), 22, 5, 24, 7, "hide", 200); }
  },
  shapes: {
    set() { op("shape.remove", { mapId: mid(), id: "demo-ball" }); op("shape.add", { mapId: mid(), shape: { id: "demo-ball", kind: "circle", x: 15.5, y: 6.5, size: 15 } }); },
    play() { op("shape.remove", { mapId: mid(), id: "demo-ball" }); later(400, () => op("shape.add", { mapId: mid(), shape: { id: "demo-ball", kind: "circle", x: 15.5, y: 6.5, size: 15 } })); }
  },
  fit: {
    set() {},
    play() { later(300, () => tap('[data-map="zoomIn"]')); later(800, () => tap('[data-map="zoomIn"]')); later(2000, () => tap('[data-map="fit"]')); }
  }
};
const ORDER = Object.keys(DEMOS);

/* El tablero como quedaría al acabar los pasos anteriores, y la
   demostración del paso */
export function playDemo(key) {
  runId++;
  if (!store.doc) return;
  const k = ORDER.indexOf(key);
  if (k < 0) return;
  for (let j = 0; j < k; j++) DEMOS[ORDER[j]].set();
  if (key === "intro") demoStart();
  DEMOS[key].play();
}

/* La librería tapa la esquina del taller: se guarda mientras dura */
function stowShelf(on) {
  const lib = document.querySelector(".library");
  if (!lib) return;
  if (on && !lib.classList.contains("is-stowed")) { shelfOut(true); tap(".library .lib-hide"); }
  if (!on && wasOut()) { shelfOut(false); if (lib.classList.contains("is-stowed")) tap(".library .lib-tab"); }
}

export function demoStart() {
  if (demo) return demo;
  const doc = store.doc;
  if (!doc) return null;
  stowShelf(true);
  const old = mapOf();
  if (old) { demo = { mapId: old.id, from: old.demoFrom, show: old.demoShow }; return demo; }
  const id = "taller-" + Math.random().toString(36).slice(2, 8);
  demo = { mapId: id, from: doc.session.activeMapId, show: !!doc.session.showMapToParty };
  op("map.add", { map: { id, name: NAME(), cols: 26, rows: 15, radius: 5, remember: true,
    demo: true, demoFrom: demo.from, demoShow: demo.show } });
  op("session.patch", { fields: { showMapToParty: false, activeMapId: id } });
  op("probe.place", { mapId: id, x: 3, y: 6 });
  return demo;
}

/* Fin del taller: Chispa a su mesa, el mapa de prácticas fuera y la mesa
   donde estaba */
export function demoEnd() {
  runId++;
  const map = mapOf();
  const info = demo || (map && { mapId: map.id, from: map.demoFrom, show: map.demoShow });
  demo = null;
  stowShelf(false);
  if (!info || !store.doc) return;
  closeAlert();
  if (store.doc.chars.some(c => c.probe && c.mapId === info.mapId)) op("probe.recall", {});
  const back = store.doc.maps.find(m => m.id === info.from && !m.demo) || store.doc.maps.find(m => !m.demo);
  op("session.patch", { fields: { activeMapId: back ? back.id : "", showMapToParty: !!info.show } });
  if (store.doc.maps.some(m => m.id === info.mapId)) op("map.remove", { id: info.mapId });
}

/* Un taller que se quedó a medias (se cerró el navegador en mitad del
   tutorial): se recoge al entrar */
export function cleanupStaleDemo() {
  if (!demo && mapOf()) demoEnd();
  else if (!demo) stowShelf(false);
}
export const demoActive = () => !!demo;
