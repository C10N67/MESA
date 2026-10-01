/* Mesa · servidor de partida
   Node 18+, sin dependencias. Sirve la aplicación, guarda el estado en disco
   y mantiene al día a todos los dispositivos conectados.

   node server.js [--port 8080] [--pin 1234] [--data ./data]
*/
"use strict";

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, createReadStream, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { emptyDoc, migrate, cellKey, normalizeChar, normalizeMap, normalizeShape, normalizePin, normalizePortal, footprint } from "./public/js/schema.js";
import { visibleCells, edgesNear, gridDistance, occupied, fits } from "./public/js/los.js";
import { roll, detail } from "./public/js/dice.js";
import { normalizeAttack } from "./public/js/schema.js";
import { critDamage } from "./public/js/attacks-core.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "public");

/* ---------- Argumentos ---------- */
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = Number(process.env.PORT || arg("port", 8080));
const DATA = path.resolve(HERE, arg("data", "data"));
const IMAGES = path.join(DATA, "images");
const STATE_FILE = path.join(DATA, "mesa.json");

/* ---------- Estado ---------- */
let doc = emptyDoc();
let pin = "";
let rev = 0;
const clients = new Map();   // token -> { id, name, role, charId, res }

const MAX_BODY = 24 * 1024 * 1024;   // 24 MB: cabe un plano grande
const IMG_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

async function boot() {
  await mkdir(IMAGES, { recursive: true });
  try {
    const saved = JSON.parse(await readFile(STATE_FILE, "utf8"));
    doc = await absorbLegacyImages(migrate(saved.doc || saved));
    pin = String(saved.pin || "");
  } catch { doc = emptyDoc(); }
  if (!pin) pin = process.env.MESA_PIN || arg("pin", "") || String(randomBytes(2).readUInt16BE() % 9000 + 1000);
  await persist();
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persist().catch(e => console.error("No se pudo guardar:", e.message)), 400);
}
async function persist() {
  const tmp = STATE_FILE + ".tmp";
  const saved = { pin, doc: { ...doc, session: { ...doc.session, alert: null, ping: null } } };
  await writeFile(tmp, JSON.stringify(saved, null, 1), "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(tmp, STATE_FILE);
}

/* ---------- Redacción: qué ve cada rol ---------- */
const WOUNDS = [
  [100, "Ileso"], [75, "Con algún rasguño"], [50, "Herido"],
  [25, "Malherido"], [1, "Al borde de caer"], [0, "Fuera de combate"]
];
const woundOf = c => {
  const p = Math.max(0, Math.min(100, Math.round((c.hp / Math.max(1, c.maxHp)) * 100)));
  return (WOUNDS.find(w => p >= w[0]) || WOUNDS[5])[1];
};

/* Quién puede leer cada entrada del registro. La pantalla de la tele no lee
   nada privado, y un susurro solo llega a quien va dirigido y a quien lo manda. */
function canRead(client, e) {
  if (client.role === "dm") return true;
  if (e.private) {
    if (client.role === "screen") return false;
    if (e.actor === client.name) return true;
    return (e.to || []).includes(client.charId);
  }
  return !e.secret;
}

/* Del terreno pintado solo viaja lo que la party ya ha visto: el trazado de un
   banco de niebla al otro lado del mapa dibujaría el plano sin querer. */
function pickCells(map, seen, explored) {
  const all = map.cells || {};
  if (doc.session.revealAll) return { ...all };
  const out = {};
  for (const k of Object.keys(all)) if ((seen && seen.has(k)) || explored.includes(k)) out[k] = all[k];
  return out;
}

function redact(client) {
  if (client.role === "dm") return { ...doc, you: null };

  const map = doc.maps.find(m => m.id === doc.session.activeMapId) || null;
  const showMap = map && doc.session.showMapToParty;
  const seen = showMap && !doc.session.revealAll
    ? (seenCache.mapId === map.id && seenCache.seen ? seenCache.seen : visibleCells(doc, map))
    : null;
  const isVisible = (x, y) => !showMap ? false
    : doc.session.revealAll ? true
    : seen.has(cellKey(x, y));

  const inCombat = new Set(doc.session.combat.on ? doc.session.combat.order : []);
  const occupiedCells = c => occupied(c);
  const chars = [];
  for (const c of doc.chars) {
    if (c.kind === "pc") {
      chars.push({ ...c });
      continue;
    }
    if (c.hidden) continue;
    const placed = c.mx !== null && c.mapId === (map && map.id);
    const shown = placed && occupiedCells(c).some(([x, y]) => isVisible(x, y));
    /* Una criatura solo existe para la party cuando la han visto. Sin colocar
       en el tablero, no la han visto: aunque el DM la acabe de sacar del
       bestiario, para ellos todavía no está ahí. Una vez descubierta se queda
       en la lista de combate aunque se meta detrás de una esquina. */
    /* Recordada: se la vio y el mapa guarda memoria, así que se queda dibujada
       donde estaba la última vez, apagada. No se mueve sola: lo que la party
       recuerda es el sitio, no lo que la criatura esté haciendo ahora. */
    const memory = !shown && c.discovered && map && map.remember && !doc.session.revealAll
      && c.lastSeen && c.lastSeen.mapId === map.id;
    if (!shown && !memory && !(c.discovered && inCombat.has(c.id))) continue;
    chars.push({
      id: c.id, kind: "monster", name: c.name, color: c.color, avatarId: c.avatarId,
      hp: c.hp > 0 ? 1 : 0, maxHp: 1, tempHp: 0,
      /* Por defecto la party no sabe cuánta vida le queda a un enemigo: ni el
         aro del mapa, ni la etiqueta de herida, ni el daño acumulado. Ni
         siquiera viaja el dato, así que no hay nada que mirar en el navegador.
         El DM lo abre cuando quiere con «enseñar la vida de los enemigos». */
      ...(doc.session.showFoeHP ? {
        wound: woundOf(c),
        hpPct: Math.max(0, Math.min(100, Math.round((c.hp / Math.max(1, c.maxHp)) * 100))),
        damageTaken: Math.max(0, c.maxHp - c.hp)
      } : {}),
      conditions: c.conditions, condMeta: c.condMeta, initiative: c.initiative, concentration: "",
      ac: null, size: c.size, sizeType: c.sizeType, light: c.light, speed: c.speed,
      used: c.used, attacks: [], traits: "", actions: "",
      memory: !shown && memory ? c.lastSeen.ts : 0,
      mapId: shown || memory ? (map && map.id) || "" : "",
      mx: shown ? c.mx : memory ? c.lastSeen.x : null,
      my: shown ? c.my : memory ? c.lastSeen.y : null
    });
  }

  const maps = [];
  if (showMap) {
    const explored = map.remember ? map.explored : [];
    const visibleList = doc.session.revealAll ? null : [...seen];
    maps.push({
      id: map.id, name: map.name, imageId: map.imageId, imageW: map.imageW, imageH: map.imageH,
      cols: map.cols, rows: map.rows, radius: map.radius, remember: map.remember,
      camera: map.camera, followSpan: map.followSpan, partyZoom: map.partyZoom,
      grid: map.grid, revealAll: doc.session.revealAll,
      explored: doc.session.revealAll ? [] : explored,
      visible: visibleList,
      edges: doc.session.revealAll ? map.edges : edgesNear(map, seen, explored),
      dark: map.dark, feet: map.feet, diagonals: map.diagonals, playerZoom: map.playerZoom,
      cells: pickCells(map, seen, explored),
      shapes: (map.shapes || []).filter(sh => sh.party),
      pins: (map.pins || []).filter(pin => {
        if (!pin.party || !pin.discovered) return false;
        const k = cellKey(pin.x, pin.y);
        if (doc.session.revealAll) return true;
        if (seen && seen.has(k)) return true;
        return map.remember && (map.explored || []).includes(k);
      }),
      portals: (map.portals || []).filter(p => isVisible(p.x, p.y) || explored.includes(cellKey(p.x, p.y)))
    });
  }

  return {
    version: doc.version,
    chars,
    bestiary: [],
    maps,
    session: { ...doc.session, notes: "", alert: null, activeMapId: showMap ? map.id : "" },
    log: doc.log.filter(e => canRead(client, e)),
    you: client.charId || null
  };
}

/* ---------- Lo que la party ha llegado a ver ----------
   Se calcula una vez por difusión, antes de repartir. Aquí es donde el mapa
   se va destapando: las casillas vistas se apuntan en «explorado», y una nota
   o una criatura solo pasan a existir para la party cuando alguien las ha
   tenido delante. Después no se les olvida que estaban ahí. */
let seenCache = { mapId: null, seen: null, rev: -1 };

function observe() {
  const map = doc.maps.find(m => m.id === doc.session.activeMapId);
  if (!map) { seenCache = { mapId: null, seen: null }; return; }
  const seen = visibleCells(doc, map);
  seenCache = { mapId: map.id, seen };

  if (map.remember) {
    const memo = new Set(map.explored || []);
    let grew = false;
    for (const k of seen) if (!memo.has(k)) { memo.add(k); grew = true; }
    if (grew) map.explored = [...memo].slice(-20000);
  }

  for (const pin of map.pins || []) {
    if (pin.party && !pin.discovered && seen.has(cellKey(pin.x, pin.y))) pin.discovered = true;
  }
  for (const c of doc.chars) {
    if (c.kind !== "monster" || c.mx === null || c.mapId !== map.id) continue;
    if (c.hidden) continue;
    if (occupied(c).some(([x, y]) => seen.has(cellKey(x, y)))) {
      c.discovered = true;
      /* Dónde se la vio por última vez: si el mapa recuerda lo explorado, la
         party sigue teniéndola apuntada ahí aunque se les pierda de vista. */
      c.lastSeen = { mapId: map.id, x: c.mx, y: c.my, ts: Date.now() };
    }
  }

  /* Y la marca se borra en cuanto miran el sitio y ven que ya no está. Con
     ver la casilla vacía basta: la party sabe perfectamente que se ha movido,
     así que dejarles la marca ahí sería engañarles. */
  for (const c of doc.chars) {
    const ls = c.lastSeen;
    if (c.kind !== "monster" || !ls || ls.mapId !== map.id) continue;
    const stillThere = c.mapId === map.id && c.mx === ls.x && c.my === ls.y;
    if (!stillThere && seen.has(cellKey(ls.x, ls.y))) c.lastSeen = null;
  }
}

/* ---------- Difusión ---------- */
let pushTimer = null;
function push() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    if (doc.log.length > 150) doc.log = doc.log.slice(-150);
    observe();
    rev++;
    for (const c of clients.values()) send(c, "state", { rev, doc: redact(c) });
  }, 50);
  scheduleSave();
}
function send(client, event, payload) {
  if (!client.res || client.res.writableEnded) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch { /* se limpia al cerrarse */ }
}
function broadcastPresence() {
  const roster = [...clients.values()].map(c => ({ id: c.id, name: c.name, role: c.role, charId: c.charId }));
  for (const c of clients.values()) send(c, "presence", roster);
}

/* Las copias de la versión anterior llevaban los planos y los retratos dentro
   del propio archivo, en base64. Al entrar se sacan a la carpeta de imágenes:
   así el estado que viaja por la red se queda en unas pocas decenas de KB. */
async function absorbLegacyImages(d) {
  const save = async dataURL => {
    const [head, b64] = String(dataURL).split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1];
    const id = randomBytes(8).toString("hex") + "." + (IMG_TYPES[mime] || "png");
    await writeFile(path.join(IMAGES, id), Buffer.from(b64 || "", "base64"));
    return id;
  };
  for (const m of d.maps) {
    if (typeof m.image === "string" && m.image.startsWith("data:") && !m.imageId) m.imageId = await save(m.image);
    delete m.image;
  }
  for (const c of d.chars) {
    if (typeof c.avatar === "string" && c.avatar.startsWith("data:") && !c.avatarId) c.avatarId = await save(c.avatar);
    delete c.avatar;
  }
  return d;
}

/* ---------- Reparto de vida ----------
   El único sitio donde se restan puntos de vida. Así las reglas de vida
   temporal, concentración y salvaciones de muerte están escritas una sola vez,
   valen igual para el DM y para los jugadores, y nadie puede saltárselas
   mandando un char.patch a mano. */
function applyHp(c, { damage = 0, heal = 0, temp = 0 }) {
  const before = c.hp;
  const out = { concentrationCheck: 0, dropped: false, revived: false };
  if (temp) c.tempHp = Math.max(c.tempHp, Math.trunc(temp));
  if (damage > 0) {
    let rest = Math.trunc(damage);
    if (c.tempHp > 0) { const used = Math.min(c.tempHp, rest); c.tempHp -= used; rest -= used; }
    c.hp = Math.max(0, c.hp - rest);
    if (c.concentration && c.hp > 0) out.concentrationCheck = Math.max(10, Math.floor(damage / 2));
    if (c.hp === 0 && before > 0) {
      out.dropped = true;
      c.concentration = "";
      c.deathOk = 0; c.deathFail = 0;
      if (!c.conditions.includes("inconsciente")) c.conditions = [...c.conditions, "inconsciente"];
    }
  }
  if (heal > 0) {
    c.hp = Math.min(c.maxHp, c.hp + Math.trunc(heal));
    if (before <= 0 && c.hp > 0) {
      out.revived = true;
      c.deathOk = 0; c.deathFail = 0;
      c.conditions = c.conditions.filter(x => x !== "inconsciente");
    }
  }
  out.delta = c.hp - before;
  return out;
}

/* ---------- Ataques ----------
   Se resuelven aquí y no en el navegador por dos razones: el jugador no conoce
   la clase de armadura del monstruo (y no debe conocerla), y así nadie puede
   decidir por su cuenta que ha impactado. */
function resolveAttack(client, op) {
  const attacker = findChar(op.attackerId);
  if (!attacker) return "No existe esa ficha";
  if (client.role !== "dm" && attacker.id !== client.charId) return "Esa ficha no es tuya";
  const a = normalizeAttack(op.attack);
  const target = op.targetId ? findChar(op.targetId) : null;
  const mode = ["adv", "dis"].includes(op.mode) ? op.mode : "normal";
  const secret = client.role === "dm" && !!op.secret;
  const push = entry => doc.log.push({ id: randomBytes(6).toString("hex"), ts: Date.now(), actor: client.name, ...entry });

  if (a.save) {
    const [ability, dc] = a.save.split(" ");
    const dmg = a.damage ? roll(a.damage) : null;
    push({
      kind: "attack", secret, label: `${attacker.name} · ${a.name}`,
      text: `${a.name}: salvación de ${ability.toUpperCase()} CD ${dc}${target ? " para " + target.name : ""}` +
        (dmg ? ` · ${dmg.total} de daño${a.type ? " " + a.type : ""}` : ""),
      total: dmg ? dmg.total : 0, detail: dmg ? detail(dmg) : ""
    });
    if (target && dmg) {
      const r = applyHp(target, { damage: dmg.total });
      push({ kind: "event", secret, text: `${target.name} recibe ${dmg.total} de daño (${a.name} de ${attacker.name})${r.dropped ? " y cae" : ""}` });
    }
    return null;
  }

  const atk = roll("1d20" + (a.atk >= 0 ? "+" : "") + a.atk, mode);
  if (!atk) return "Ese ataque no tiene una fórmula válida";
  const ac = target ? target.ac : null;
  const hit = atk.crit || (!atk.fumble && ac !== null && atk.total >= ac);
  const dmg = hit && a.damage ? roll(atk.crit ? critDamage(a.damage) : a.damage) : null;

  /* Al jugador no se le dice la CA, solo si ha entrado o no. */
  push({
    kind: "attack", secret, label: `${attacker.name} · ${a.name}`,
    text: `${a.name}${target ? " contra " + target.name : ""}: ${atk.total}` +
      (target ? (atk.crit ? " · ¡CRÍTICO!" : atk.fumble ? " · pifia" : hit ? " · impacta" : " · falla") : "") +
      (dmg ? ` · ${dmg.total} de daño${a.type ? " " + a.type : ""}` : ""),
    total: atk.total, crit: atk.crit, fumble: atk.fumble,
    detail: detail(atk) + (dmg ? "  |  daño " + detail(dmg) : "")
  });

  if (dmg && target) {
    const r = applyHp(target, { damage: dmg.total });
    push({ kind: "event", secret, text: `${target.name} ${r.dropped ? "cae" : "encaja el golpe"}` });
    if (r.concentrationCheck) {
      push({ kind: "event", text: `${target.name} tiene que superar una salvación de Constitución CD ${r.concentrationCheck} o pierde la concentración en ${target.concentration}` });
    }
  }
  return null;
}

/* ---------- Turnos ----------
   Al cerrarse un turno caducan los estados que se contaban por rondas y se
   devuelven acción, acción adicional, reacción y movimiento. */
function endTurn(c) {
  if (!c) return;
  const meta = { ...(c.condMeta || {}) };
  const out = [];
  for (const [id, rounds] of Object.entries(meta)) {
    const left = Number(rounds) - 1;
    if (left <= 0) { delete meta[id]; out.push(id); } else meta[id] = left;
  }
  if (out.length) {
    c.conditions = c.conditions.filter(x => !out.includes(x));
    doc.log.push({ id: randomBytes(6).toString("hex"), ts: Date.now(), actor: "Mesa", kind: "event",
      text: `${c.name}: se le pasa ${out.map(x => x).join(", ")}` });
  }
  c.condMeta = meta;
}
function startTurn(c) {
  if (!c) return;
  c.used = { action: false, bonus: false, reaction: false, move: 0 };
}

/* ---------- Deshacer ---------- */
const history = [];
function remember() {
  history.push(JSON.stringify(doc));
  if (history.length > 20) history.shift();
}

/* ---------- Operaciones ---------- */
const PLAYER_LOCKED = new Set(["id", "kind", "hidden", "xp", "cr", "mapId", "mx", "my", "claimedBy"]);
const findChar = id => doc.chars.find(c => c.id === id);

async function apply(client, op) {
  const dm = client.role === "dm";
  const owns = id => {
    const c = findChar(id);
    return c && c.kind === "pc" && c.id === client.charId;
  };

  switch (op.type) {
    case "char.patch": {
      const c = findChar(op.id);
      if (!c) return "No existe ese personaje";
      if (!dm && !owns(op.id)) return "Solo el DM puede tocar esa ficha";
      for (const [k, v] of Object.entries(op.fields || {})) {
        if (!dm && PLAYER_LOCKED.has(k)) continue;
        c[k] = v;
      }
      break;
    }
    case "char.add": {
      const list = Array.isArray(op.chars) ? op.chars : [op.char];
      if (!dm) {
        // cada jugador puede hacerse su propia ficha, una y de tipo personaje
        if (list.length !== 1 || !list[0] || list[0].kind === "monster") return "Solo el DM";
        const own = normalizeChar({ ...list[0], kind: "pc", claimedBy: client.name });
        client.charId = own.id;
        doc.chars.push(own);
        broadcastPresence();
        break;
      }
      doc.chars.push(...list.map(normalizeChar));
      break;
    }
    case "char.remove": {
      if (!dm) return "Solo el DM";
      const ids = new Set(op.ids || [op.id]);
      doc.chars = doc.chars.filter(c => !ids.has(c.id));
      doc.session.combat.order = doc.session.combat.order.filter(id => !ids.has(id));
      break;
    }
    case "char.order":
      if (!dm) return "Solo el DM";
      doc.chars.sort((a, b) => op.ids.indexOf(a.id) - op.ids.indexOf(b.id));
      break;
    case "char.claim": {
      const c = findChar(op.id);
      if (!c || c.kind !== "pc") return "Ficha no válida";
      for (const other of clients.values()) if (other !== client && other.charId === op.id) other.charId = null;
      client.charId = op.id;
      c.claimedBy = client.name;
      broadcastPresence();
      break;
    }
    case "token.move": {
      const c = findChar(op.id);
      if (!c) return "No existe esa ficha";
      if (!dm) {
        if (!owns(op.id)) return "Esa ficha no es tuya";
        if (!doc.session.allowPlayerMove) return "El DM ha desactivado el movimiento";
        const map = doc.maps.find(m => m.id === doc.session.activeMapId);
        if (!map || c.mapId !== map.id) return "Tu ficha no está en este mapa";
        const seen = visibleCells(doc, map);
        if (!seen.has(cellKey(op.x, op.y))) return "No ves esa casilla";
      }
      const map = doc.maps.find(m => m.id === (op.mapId || c.mapId || doc.session.activeMapId));
      if (map) {
        const problem = fits(map, doc.chars, c, op.x, op.y);
        if (problem) return problem;
      }
      /* lo que cuesta el paso, para el contador de movimiento del turno */
      if (map && c.mx !== null && c.mapId === map.id) {
        c.used = { action: false, bonus: false, reaction: false, move: 0, ...(c.used || {}) };
        c.used.move += gridDistance(c.mx, c.my, op.x, op.y, map.diagonals) * (map.feet || 5);
      }
      c.mapId = map ? map.id : (op.mapId || c.mapId || doc.session.activeMapId);
      c.mx = op.x; c.my = op.y;
      if (c.kind === "pc") doc.session.focusId = c.id;

      /* Notas del mapa: si alguien las pisa, al DM le salta el aviso */
      if (c.kind === "pc" && map) {
        const pin = (map.pins || []).find(p => p.x === c.mx && p.y === c.my);
        if (pin) {
          doc.session.alert = { id: randomBytes(4).toString("hex"), pinId: pin.id, text: pin.text, kind: pin.kind, party: pin.party, who: c.name, mapName: map.name, ts: Date.now() };
          pin.seen = true;
          if (pin.party) doc.log.push({ id: randomBytes(6).toString("hex"), ts: Date.now(), actor: "Mesa", kind: "note", text: `${c.name} encuentra algo: ${pin.text}` });
        }
      }

      /* Accesos: al pisar una escalera se cruza al otro mapa */
      const portal = map && (map.portals || []).find(p => p.auto && p.x === op.x && p.y === op.y && p.toMap);
      if (portal && doc.maps.some(m => m.id === portal.toMap)) {
        c.mapId = portal.toMap;
        c.mx = portal.toX === null ? op.x : portal.toX;
        c.my = portal.toY === null ? op.y : portal.toY;
        if (c.kind === "pc") {
          doc.session.activeMapId = portal.toMap;
          doc.log.push({ id: randomBytes(6).toString("hex"), ts: Date.now(), actor: "Mesa", kind: "event",
            text: `${c.name} cruza por ${portal.label}` });
        }
      }
      break;
    }
    case "map.patch": {
      if (!dm && op.fields && Object.keys(op.fields).length === 1 && "explored" in op.fields) break;
      if (!dm) return "Solo el DM";
      const m = doc.maps.find(x => x.id === op.id);
      if (!m) return "No existe ese mapa";
      Object.assign(m, op.fields || {});
      break;
    }
    case "map.add":
      if (!dm) return "Solo el DM";
      doc.maps.push(normalizeMap(op.map));
      doc.session.activeMapId = op.map.id;
      break;
    case "map.remove": {
      if (!dm) return "Solo el DM";
      if (doc.maps.length <= 1) return "Tiene que quedar al menos un mapa";
      doc.maps = doc.maps.filter(m => m.id !== op.id);
      doc.chars.forEach(c => { if (c.mapId === op.id) { c.mapId = ""; c.mx = null; c.my = null; } });
      if (doc.session.activeMapId === op.id) doc.session.activeMapId = doc.maps[0].id;
      break;
    }
    case "session.patch":
      if (!dm) return "Solo el DM";
      Object.assign(doc.session, op.fields || {});
      break;
    case "bestiary.set":
      if (!dm) return "Solo el DM";
      doc.bestiary = op.list;
      break;
    case "log.add": {
      const entry = { ...op.entry, id: randomBytes(6).toString("hex"), ts: Date.now(), actor: client.name };
      if (!dm) entry.secret = false;
      doc.log.push(entry);
      if (doc.log.length > 150) doc.log = doc.log.slice(-150);
      break;
    }
    case "log.clear":
      if (!dm) return "Solo el DM";
      doc.log = [];
      break;
    case "attack.resolve":
      return resolveAttack(client, op);

    case "hp.apply": {
      const c = findChar(op.id);
      if (!c) return "No existe esa ficha";
      const r = applyHp(c, op);
      const verb = op.damage ? `recibe ${op.damage} de daño` : op.heal ? `recupera ${r.delta} de vida` : `gana ${op.temp} de vida temporal`;
      doc.log.push({
        id: randomBytes(6).toString("hex"), ts: Date.now(), actor: client.name, kind: "event",
        text: `${c.name} ${verb}${op.note ? " (" + op.note + ")" : ""}${r.dropped ? " y cae" : ""}${r.revived ? " y vuelve en sí" : ""}`,
        secret: !dm && c.kind === "monster" ? false : !!op.secret
      });
      if (r.concentrationCheck) {
        doc.log.push({ id: randomBytes(6).toString("hex"), ts: Date.now(), actor: "Mesa", kind: "event",
          text: `${c.name} tiene que superar una salvación de Constitución CD ${r.concentrationCheck} o pierde la concentración en ${c.concentration}` });
      }
      break;
    }

    case "token.moveMany": {
      if (!dm) return "Solo el DM puede mover varias fichas";
      for (const mv of op.moves || []) {
        const c = findChar(mv.id);
        if (!c) continue;
        const mp = doc.maps.find(x => x.id === (mv.mapId || c.mapId || doc.session.activeMapId));
        if (mp && fits(mp, doc.chars, c, mv.x, mv.y)) continue;   // el que no cabe se queda donde está
        c.mapId = mp ? mp.id : (mv.mapId || c.mapId);
        c.mx = mv.x; c.my = mv.y;
      }
      break;
    }

    case "shape.add": {
      const m = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!m) return "No existe ese mapa";
      const sh = normalizeShape({ ...op.shape, party: dm ? op.shape.party !== false : true });
      m.shapes = [...(m.shapes || []).slice(-39), sh];
      break;
    }
    case "shape.remove": {
      const m = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!m) return "No existe ese mapa";
      m.shapes = (m.shapes || []).filter(x => x.id !== op.id);
      break;
    }
    case "shape.clear": {
      const m = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!m) return "No existe ese mapa";
      m.shapes = [];
      break;
    }

    case "map.cells": {
      if (!dm) return "Solo el DM";
      const mp = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!mp) return "No existe ese mapa";
      const cells = { ...(mp.cells || {}) };
      for (const [k, kind] of Object.entries(op.patch || {})) {
        if (!kind) delete cells[k]; else cells[k] = kind;
      }
      mp.cells = cells;
      break;
    }

    case "pin.set": {
      if (!dm) return "Solo el DM";
      const m = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!m) return "No existe ese mapa";
      const previous = (m.pins || []).find(p => p.id === op.pin.id);
      const pin = normalizePin({ ...op.pin, discovered: op.pin.discovered ?? (previous && previous.discovered) });
      const list = (m.pins || []).filter(p => p.id !== pin.id);
      m.pins = op.remove ? list : [...list, pin];
      break;
    }
    case "portal.set": {
      if (!dm) return "Solo el DM";
      const m = doc.maps.find(x => x.id === (op.mapId || doc.session.activeMapId));
      if (!m) return "No existe ese mapa";
      const portal = normalizePortal(op.portal);
      const list = (m.portals || []).filter(p => p.id !== portal.id);
      m.portals = op.remove ? list : [...list, portal];
      break;
    }

    case "ping":
      doc.session.ping = { x: op.x, y: op.y, mapId: op.mapId || doc.session.activeMapId, ts: Date.now(), by: client.name, color: op.color || "#ffd27f" };
      break;

    case "chat": {
      const text = String(op.text || "").slice(0, 500).trim();
      if (!text) return null;
      /* Los destinatarios son identificadores de ficha, más "dm" para ti.
         Sin destinatarios, lo lee toda la mesa. */
      /* op.whisper es la forma antigua (susurrar solo al DM): se sigue
         entendiendo por si queda alguna pestaña sin recargar. */
      const asked = Array.isArray(op.to) ? op.to : (op.whisper ? ["dm"] : []);
      const to = [...new Set(asked.filter(x => x === "dm" || doc.chars.some(c => c.id === x && c.kind === "pc")))].slice(0, 12);
      doc.log.push({
        id: randomBytes(6).toString("hex"), ts: Date.now(), actor: client.name, kind: "chat",
        text, to, from: dm ? "dm" : (client.charId || ""), private: to.length > 0,
        names: to.map(x => x === "dm" ? "DM" : (findChar(x) || {}).name).filter(Boolean)
      });
      break;
    }

    case "request.set": {
      if (!dm) return "Solo el DM";
      doc.session.requests = op.clear ? [] : [
        ...(doc.session.requests || []).filter(r => r.id !== op.request.id),
        { id: op.request.id || randomBytes(4).toString("hex"), ids: op.request.ids || [], label: String(op.request.label || "").slice(0, 60), formula: String(op.request.formula || "1d20"), dc: Number(op.request.dc) || 0 }
      ];
      break;
    }
    case "request.done": {
      doc.session.requests = (doc.session.requests || [])
        .map(r => r.id !== op.id ? r : { ...r, ids: r.ids.filter(id => id !== op.charId) })
        .filter(r => r.ids.length);
      break;
    }

    case "combat.step": {
      if (!dm) return "Solo el DM";
      const c = { ...doc.session.combat };
      if (!c.on || !c.order.length) break;
      endTurn(findChar(c.order[c.index]));
      const dir = op.dir === -1 ? -1 : 1;
      for (let n = 0; n < c.order.length; n++) {
        let i = c.index + dir;
        if (i >= c.order.length) { i = 0; c.round++; }
        if (i < 0) { i = c.order.length - 1; c.round = Math.max(1, c.round - 1); }
        c.index = i;
        const who = findChar(c.order[i]);
        if (!doc.session.autoSkipDown || !who || who.hp > 0 || who.kind === "pc") break;
      }
      doc.session.combat = c;
      const now = findChar(c.order[c.index]);
      startTurn(now);
      if (now && now.kind === "pc") doc.session.focusId = now.id;
      break;
    }

    case "undo": {
      if (!dm) return "Solo el DM";
      const prev = history.pop();
      if (!prev) return "No queda nada que deshacer";
      doc = JSON.parse(prev);
      return "SKIP_HISTORY";
    }

    case "doc.replace":
      if (!dm) return "Solo el DM";
      doc = await absorbLegacyImages(migrate(op.doc));
      break;
    default:
      return "Operación desconocida: " + op.type;
  }
  return null;
}

/* ---------- HTTP ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json"
};

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
};

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", d => {
      size += d.length;
      if (size > limit) { reject(new Error("Archivo demasiado grande")); req.destroy(); return; }
      chunks.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const p = url.pathname;

  try {
    if (p === "/api/hello") {
      return json(res, 200, {
        title: doc.session.title,
        players: doc.chars.filter(c => c.kind === "pc").map(c => ({
          id: c.id, name: c.name, className: c.className, level: c.level, color: c.color,
          taken: [...clients.values()].some(cl => cl.charId === c.id)
        }))
      });
    }

    if (p === "/api/ping") {
      const ok = clients.has(url.searchParams.get("token") || "");
      return json(res, ok ? 200 : 401, { ok });
    }

    if (p === "/api/join" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8192)).toString() || "{}");
      const role = ["dm", "player", "screen"].includes(body.role) ? body.role : "player";
      if (role === "dm" && String(body.pin || "").trim() !== pin) return json(res, 403, { error: "El código del DM no coincide" });
      const token = randomBytes(16).toString("hex");
      const client = {
        id: randomBytes(4).toString("hex"),
        name: String(body.name || (role === "dm" ? "DM" : "Invitado")).slice(0, 24),
        role, charId: role === "player" && body.charId ? body.charId : null, res: null
      };
      clients.set(token, client);
      if (client.charId) {
        const c = findChar(client.charId);
        if (c) c.claimedBy = client.name;
      }
      return json(res, 200, { token, id: client.id, role, charId: client.charId });
    }

    if (p === "/api/stream") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write(": mesa\n\n");
      client.res = res;
      observe();     // quien acaba de entrar recibe la visibilidad de ahora, no la de antes
      send(client, "state", { rev, doc: redact(client) });
      broadcastPresence();
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
      req.on("close", () => {
        clearInterval(ping);
        client.res = null;
        setTimeout(() => {
          if (!client.res) {
            for (const [t, c] of clients) if (c === client) clients.delete(t);
            broadcastPresence();
          }
        }, 15000);   // margen para recargar la página sin perder el sitio
      });
      return;
    }

    if (p === "/api/op" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString() || "{}");
      const client = clients.get(body.token || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const ops = Array.isArray(body.ops) ? body.ops : [body.op];
      const worthRemembering = ops.some(o => o && !["ping", "chat", "log.add", "request.done", "undo"].includes(o.type));
      if (worthRemembering) remember();
      for (const op of ops) {
        const err = await apply(client, op);
        if (err === "SKIP_HISTORY") continue;
        if (err) return json(res, 400, { error: err });
      }
      push();
      return json(res, 200, { ok: true, charId: client.charId });
    }

    if (p === "/api/image" && req.method === "POST") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const mime = String(req.headers["content-type"] || "").split(";")[0];
      const ext = IMG_TYPES[mime];
      if (!ext) return json(res, 415, { error: "Formato de imagen no admitido" });
      const buf = await readBody(req);
      const id = randomBytes(8).toString("hex") + "." + ext;
      await writeFile(path.join(IMAGES, id), buf);
      return json(res, 200, { imageId: id, bytes: buf.length });
    }

    if (p.startsWith("/img/")) {
      const name = path.basename(p.slice(5));
      const file = path.join(IMAGES, name);
      if (!existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(name)] || "application/octet-stream",
        "Content-Length": statSync(file).size,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      return createReadStream(file).pipe(res);
    }

    /* Estático */
    const rel = p === "/" ? "index.html" : decodeURIComponent(p).replace(/^\/+/, "");
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No está aquí");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    createReadStream(file).pipe(res);
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

/* ---------- Arranque ---------- */
const lanIP = () => {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) if (net.family === "IPv4" && !net.internal) return net.address;
  }
  return "localhost";
};

await boot();
server.listen(PORT, "0.0.0.0", () => {
  const ip = lanIP();
  console.log(`
  Mesa está en marcha.

  Tú (DM)        http://localhost:${PORT}
  Tus jugadores  http://${ip}:${PORT}
  Código del DM  ${pin}

  Los datos se guardan en ${DATA}
  Para parar: Ctrl+C
`);
});

process.on("SIGINT", async () => { await persist(); process.exit(0); });
