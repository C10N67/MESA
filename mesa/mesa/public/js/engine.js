/* Mesa · motor de la partida

   Las reglas de la mesa, sin nada de red ni de disco: qué ve cada papel, qué
   puede tocar cada uno, cómo se reparte la vida, cómo se resuelve un ataque,
   cómo avanza el turno. Lo usan el servidor de Node (server.js) y la versión
   de prueba que corre entera en el navegador (local.js), así que las reglas
   están escritas una sola vez y valen igual en los dos sitios.

   createEngine({ rid, absorbImages, onPresence })
     rid(n)          identificador aleatorio de n bytes en hexadecimal
     absorbImages(d) saca las imágenes incrustadas de una copia antigua
     onPresence()    avisa de que ha cambiado quién está conectado */

import { emptyDoc, migrate, cellKey, normalizeChar, normalizeMap, normalizeShape, normalizePin, normalizePortal, normalizeAttack } from "./schema.js";
import { visibleCells, edgesNear, gridDistance, occupied, fits } from "./los.js";
import { roll, detail } from "./dice.js";
import { critDamage } from "./attacks-core.js";

export const ROLES = ["dm", "player", "screen"];

export function createEngine({ rid, absorbImages = async d => d, onPresence = () => {} } = {}) {
  let doc = emptyDoc();
  let pin = "";
  let rev = 0;
  const clients = new Map();   // testigo -> { id, name, role, charId, ... }

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
  /* Quien manda un susurro se reconoce por su sesión o por su personaje,
     nunca por el nombre: dos «Ana» en días distintos no comparten secretos. */
  function canRead(client, e) {
    if (client.role === "dm") return true;
    if (e.private) {
      if (client.role === "screen") return false;
      if (e.byClient) { if (e.byClient === client.id) return true; }
      else if (e.actor === client.name) return true;          // entradas de antes de este cambio
      if (client.charId && e.from && e.from === client.charId) return true;
      return !!client.charId && (e.to || []).includes(client.charId);
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

  /* Lo que ve la party es lo mismo para todos los jugadores y para la tele:
     solo cambian el registro (los susurros) y quién eres. Se calcula una vez
     por difusión en vez de una vez por aparato, que es lo caro (visión, muros
     cercanos, niebla). */
  let partyCache = null;

  function redact(client) {
    if (client.role === "dm") return { ...doc, you: null };
    if (!partyCache || partyCache.rev !== rev) partyCache = { rev, view: partyView() };
    return {
      ...partyCache.view,
      log: doc.log.filter(e => canRead(client, e)),
      you: client.charId || null
    };
  }

  function partyView() {
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
      session: { ...doc.session, notes: "", alert: null, activeMapId: showMap ? map.id : "" }
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
    const push = entry => doc.log.push({ id: rid(6), ts: Date.now(), actor: client.name, ...entry });

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
      doc.log.push({ id: rid(6), ts: Date.now(), actor: "Mesa", kind: "event",
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
          if (client.role !== "player") return "Solo los jugadores se hacen su ficha";
          client.charId = own.id;
          doc.chars.push(own);
          onPresence();
          break;
        }
        doc.chars.push(...list.map(normalizeChar));
        break;
      }
      case "char.remove": {
        if (!dm) return "Solo el DM";
        const ids = new Set(op.ids || [op.id]);
        doc.chars = doc.chars.filter(c => !ids.has(c.id));
        for (const cl of clients.values()) if (ids.has(cl.charId)) cl.charId = null;
        doc.session.combat.order = doc.session.combat.order.filter(id => !ids.has(id));
        break;
      }
      case "char.order":
        if (!dm) return "Solo el DM";
        doc.chars.sort((a, b) => op.ids.indexOf(a.id) - op.ids.indexOf(b.id));
        break;
      case "char.claim": {
        if (client.role !== "player") return "Solo un jugador puede quedarse con un personaje";
        const problem = takeChar(client, op.id);
        if (problem) return problem;
        onPresence();
        break;
      }
      /* El DM suelta un personaje: quien lo llevara vuelve a elegir */
      case "char.release": {
        if (!dm) return "Solo el DM";
        const c = findChar(op.id);
        if (!c) return "No existe ese personaje";
        for (const cl of clients.values()) if (cl.charId === c.id) cl.charId = null;
        c.claimedBy = "";
        onPresence();
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
            doc.session.alert = { id: rid(4), pinId: pin.id, text: pin.text, kind: pin.kind, party: pin.party, who: c.name, mapName: map.name, ts: Date.now() };
            pin.seen = true;
            if (pin.party) doc.log.push({ id: rid(6), ts: Date.now(), actor: "Mesa", kind: "note", text: `${c.name} encuentra algo: ${pin.text}` });
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
            doc.log.push({ id: rid(6), ts: Date.now(), actor: "Mesa", kind: "event",
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
        const entry = { ...op.entry, id: rid(6), ts: Date.now(), actor: client.name };
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
          id: rid(6), ts: Date.now(), actor: client.name, kind: "event",
          text: `${c.name} ${verb}${op.note ? " (" + op.note + ")" : ""}${r.dropped ? " y cae" : ""}${r.revived ? " y vuelve en sí" : ""}`,
          secret: !dm && c.kind === "monster" ? false : !!op.secret
        });
        if (r.concentrationCheck) {
          doc.log.push({ id: rid(6), ts: Date.now(), actor: "Mesa", kind: "event",
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
          id: rid(6), ts: Date.now(), actor: client.name, byClient: client.id, kind: "chat",
          text, to, from: dm ? "dm" : (client.charId || ""), private: to.length > 0,
          names: to.map(x => x === "dm" ? "DM" : (findChar(x) || {}).name).filter(Boolean)
        });
        break;
      }

      case "request.set": {
        if (!dm) return "Solo el DM";
        doc.session.requests = op.clear ? [] : [
          ...(doc.session.requests || []).filter(r => r.id !== op.request.id),
          { id: op.request.id || rid(4), ids: op.request.ids || [], label: String(op.request.label || "").slice(0, 60), formula: String(op.request.formula || "1d20"), dc: Number(op.request.dc) || 0 }
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
        doc = await absorbImages(migrate(op.doc));
        break;
      default:
        return "Operación desconocida: " + op.type;
    }
    return null;
  }


  /* ---------- Entrada y lotes de operaciones ---------- */
  /* ---------- Sesiones ----------
     Una sesión no se borra al cortarse la conexión: un móvil que se bloquea
     diez minutos tiene que volver a su sitio sin pasar por la entrada. Lo que
     sí cambia es si está conectada («online»), y eso es lo que manda:

     - Un personaje lo bloquea quien lo lleva y está conectado. Si esa sesión
       está desconectada, otro aparato puede recuperarlo (el mismo jugador que
       ha cambiado de móvil) y la sesión vieja se queda sin él.
     - No puede haber dos personas conectadas con el mismo nombre: el nombre
       es lo que se lee en el registro y en la charla.
     - El DM puede liberar cualquier personaje. */
  const online = c => !!c.online;
  /* Para bloquear un personaje o un nombre se cuenta también quien acaba de
     irse hace unos segundos: recargar la página no debe dejar el hueco libre. */
  const RELOAD_GRACE = 8000;
  const active = c => online(c) || Date.now() - (c.seen || 0) < RELOAD_GRACE;
  const holder = (charId, except = null) =>
    [...clients.values()].find(cl => cl !== except && cl.charId === charId && cl.role === "player");
  const sameName = (a, b) => a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");

  function takeChar(client, charId) {
    const c = findChar(charId);
    if (!c || c.kind !== "pc") return "Ese personaje ya no está en la mesa";
    const other = holder(charId, client);
    if (other && active(other)) return `${c.name} ya lo lleva ${other.name} en otro aparato. Si eres tú, sal allí primero o pide al DM que lo libere.`;
    for (const cl of clients.values()) if (cl !== client && cl.charId === charId) cl.charId = null;
    client.charId = charId;
    c.claimedBy = client.name;
    return null;
  }

  function hello() {
    return {
      title: doc.session.title,
      players: doc.chars.filter(c => c.kind === "pc").map(c => {
        const h = holder(c.id);
        const busy = h && active(h);
        return {
          id: c.id, name: c.name, className: c.className, race: c.race, level: c.level, color: c.color,
          avatarId: c.avatarId, taken: !!busy, takenBy: busy ? h.name : ""
        };
      })
    };
  }

  /* Devuelve { error, status } o { client, token }. Con checkPin a false (la
     versión de prueba, todo en el mismo navegador) no se pide el código. */
  function join(body = {}, { checkPin = true } = {}) {
    const role = ROLES.includes(body.role) ? body.role : "player";
    if (checkPin && role === "dm" && String(body.pin || "").trim() !== pin) return { error: "El código del DM no coincide", status: 403 };
    const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 24)
      || (role === "dm" ? "DM" : role === "screen" ? "Pantalla" : "Invitado");
    if (role !== "screen") {
      const clash = [...clients.values()].find(cl => active(cl) && cl.role !== "screen" && sameName(cl.name, name)
        && !(role === "dm" && cl.role === "dm"));
      if (clash) return { error: `Ya hay alguien conectado como «${clash.name}». Elige otro nombre.`, status: 409 };
    }
    const client = { id: rid(4), name, role, charId: null, online: false, seen: 0 };
    if (role === "player" && body.charId) {
      const problem = takeChar(client, body.charId);
      if (problem) return { error: problem, status: 409 };
    }
    const token = rid(16);
    clients.set(token, client);
    return { client, token };
  }

  /* La conexión de una sesión se abre o se cierra */
  function setOnline(client, value) {
    client.online = !!value;
    client.seen = Date.now();
  }

  /* Sesiones que nadie usa desde hace mucho: fuera */
  function purge(maxAgeMs = 30 * 24 * 3600 * 1000) {
    const now = Date.now();
    for (const [t, c] of clients) if (!online(c) && now - (c.seen || 0) > maxAgeMs) clients.delete(t);
  }

  /* Lo que se guarda en disco para que reiniciar el servidor no eche a nadie */
  const saveClients = () => [...clients.entries()].map(([t, c]) => [t, { id: c.id, name: c.name, role: c.role, charId: c.charId, seen: c.seen || Date.now() }]);
  function loadClients(list) {
    for (const [t, c] of Array.isArray(list) ? list : []) {
      if (!t || !c || !ROLES.includes(c.role)) continue;
      clients.set(t, { ...c, charId: c.charId && findChar(c.charId) ? c.charId : null, online: false });
    }
  }

  /* Aplica un lote. Si una operación falla, las anteriores ya se aplicaron y
     hay que repartirlas igual: por eso se devuelve cuántas entraron. */
  async function run(client, ops) {
    const worthRemembering = ops.some(o => o && !["ping", "chat", "log.add", "request.done", "undo"].includes(o.type));
    if (worthRemembering) remember();
    let applied = 0;
    for (const op of ops) {
      const err = await apply(client, op);
      if (err === "SKIP_HISTORY") { applied++; continue; }
      if (err) return { error: err, applied };
      applied++;
    }
    return { error: null, applied };
  }

  /* Prepara una difusión: recorta el registro, apunta lo que la party ha
     visto y sube la revisión. Después, snapshot(client) da lo de cada uno. */
  function advance() {
    if (doc.log.length > 150) doc.log = doc.log.slice(-150);
    observe();
    rev++;
    return rev;
  }

  /* Alguien acaba de conectarse: se le da la visibilidad de ahora */
  function refresh() {
    observe();
    partyCache = null;
  }

  /* Quién está conectado ahora mismo */
  const presence = () => [...clients.values()].filter(online)
    .map(c => ({ id: c.id, name: c.name, role: c.role, charId: c.charId }));

  return {
    get doc() { return doc; },
    set doc(d) { doc = d; partyCache = null; },
    get pin() { return pin; },
    set pin(v) { pin = String(v || ""); },
    get rev() { return rev; },
    clients,
    hello, join, run, advance, refresh, presence, setOnline, purge, saveClients, loadClients,
    snapshot: redact
  };
}
