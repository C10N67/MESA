/* La pantalla que ve la party: la tele de la mesa o el proyector.
   Solo enseña lo que el DM quiere enseñar, y no tiene ningún control con el
   que alguien pueda descuadrarla al pasar por delante. */

import { $, esc, pct, hpTone, initials, imgURL } from "./util.js";
import { store, onState, onStatus, leave } from "./net.js";
import { conditionName } from "./schema.js";
import { MapView } from "./map.js";
import { icon } from "./icons.js";
import { langPicker } from "./i18n.js";

let mapView = null;
let lastRollId = null;

const doc = () => store.doc;

export function mountScreen(root) {
  document.body.classList.add("screen");
  root.innerHTML = `
    <div class="stage">
      <div class="screen-tools">
        <span class="dot" id="sdot" title="Conexión"></span>
        <span id="stitle"></span>
        <span class="spacer"></span>
        <span id="slang"></span>
        <button class="icon-btn" id="sfull" title="Pantalla completa">${icon("screen")}</button>
        <button class="icon-btn" id="sout" title="Salir de la pantalla">${icon("exit")}</button>
      </div>
      <div class="turnbar hidden" id="turnbar">
        <div>
          <small>Ronda <span id="round">1</span> · turno de</small>
          <b id="turn">—</b>
        </div>
        <span class="spacer"></span>
        <div style="text-align:right">
          <small id="next"></small>
        </div>
      </div>
      <div class="board-wrap"><div class="board"><canvas id="scanvas"></canvas></div></div>
      <div class="handout hidden" id="handout"><img alt=""><span></span></div>
      <div class="init-strip" id="initStrip"></div>
      <div class="last-roll" id="roll"></div>
      <div class="sides" id="sides">
        <div class="side heroes"><h3 id="sideHeroesTitle">La party</h3><div class="side-list" id="roster"></div></div>
        <div class="spotlight hidden" id="spotlight"></div>
        <div class="side foes"><h3>Enemigos</h3><div class="side-list" id="foes"></div></div>
      </div>
    </div>`;

  mapView = new MapView($("#scanvas", root), { mode: "party" });
  onState(render);
  onStatus(ok => $("#sdot", root).classList.toggle("off", !ok));
  $("#slang", root).appendChild(langPicker());
  $("#sout", root).addEventListener("click", leave);
  $("#sfull", root).addEventListener("click", fullscreen);
  render();

  document.addEventListener("dblclick", e => { if (!e.target.closest("button")) fullscreen(); });
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

function render() {
  if (!doc()) return;
  const t = $("#stitle");
  if (t) t.textContent = doc().session.title || "";
  const { session, chars, maps } = doc();
  const combat = session.combat;
  const order = combat.on ? combat.order.map(id => chars.find(c => c.id === id)).filter(Boolean) : [];
  const now = order[combat.index];
  const next = order.length ? order[(combat.index + 1) % order.length] : null;

  /* Fuera de combate, arriba no va nada: el mapa se queda con toda la altura
     y la party se lee abajo, centrada. */
  $("#turnbar").classList.toggle("hidden", !combat.on);
  $("#round").textContent = combat.round;
  $("#turn").textContent = now ? now.name : "—";
  $("#next").textContent = combat.on && next ? "después: " + next.name : "";

  /* Última tirada, para que se vea desde lejos */
  const rolls = doc().log.filter(e => e.kind === "roll");
  const last = rolls[rolls.length - 1];
  const rollBox = $("#roll");
  if (last && last.id !== lastRollId) lastRollId = last.id;
  rollBox.classList.toggle("hidden", !last);
  rollBox.innerHTML = last
    ? `<small>${esc(last.actor)} · ${esc(last.label || last.formula)}</small>
       <b class="${last.crit ? "crit" : last.fumble ? "fumble" : ""}">${last.total}</b>`
    : "";

  const map = maps[0];
  const wrap = $(".board-wrap");
  if (map) {
    mapView.set({ map, chars, session, you: null });
    /* Con el plano entero a la vista, el hueco toma la forma del mapa: así no
       quedan franjas negras ni arriba ni a los lados. Siguiendo a alguien, el
       hueco manda y el encuadre se adapta. */
    const board = $(".board");
    board.style.aspectRatio = map.camera === "follow" ? "" : `${map.cols} / ${map.rows}`;
    board.classList.toggle("free", map.camera === "follow");
  }
  wrap.classList.toggle("hidden", !map);

  /* Toda la iniciativa a la vista, que es lo que la mesa mira desde lejos */
  const strip = $("#initStrip");
  strip.classList.toggle("hidden", !combat.on || !order.length);
  strip.innerHTML = order.map((x, i) => `
    <span class="turn ${i === combat.index ? "now" : ""} ${x.hp <= 0 ? "down" : ""}">
      <i style="background:${esc(x.color)}"></i>${esc(x.name)}
      <small>${x.kind === "pc" ? "" : esc(x.wound || "")}</small>
    </span>`).join("");
  const nowNode = strip.querySelector(".turn.now");
  if (nowNode && nowNode.scrollIntoView) nowNode.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });

  /* Lo que el DM enseña a la mesa */
  const hand = $("#handout");
  const hid = session.handoutId;
  hand.classList.toggle("hidden", !hid);
  if (hid && hand.querySelector("img").dataset.id !== hid) {
    hand.querySelector("img").dataset.id = hid;
    hand.querySelector("img").src = imgURL(hid);
    hand.querySelector("span").textContent = session.handoutText || "";
  }

  /* Fuera de combate, la party ocupa la fila entera. En combate se parte la
     pantalla: los suyos a un lado, los enemigos al otro y en medio, grande,
     quien tiene el turno. Desde el sofá se ve de quién va sin preguntar. */
  const sides = $("#sides");
  sides.classList.toggle("fighting", combat.on);
  const heroes = chars.filter(c => c.kind === "pc");
  const foes = chars.filter(c => c.kind === "monster");
  const fighting = new Set(order.map(c => c.id));

  $("#roster").innerHTML = heroes.map(c => whoCard(c, session, {
    inTurn: now && now.id === c.id, fighting: combat.on && fighting.has(c.id)
  })).join("");

  $("#foes").innerHTML = foes.length
    ? foes.map(c => whoCard(c, session, {
        inTurn: now && now.id === c.id, fighting: combat.on && fighting.has(c.id)
      })).join("")
    : `<p class="state" style="padding:8px">Ninguno a la vista</p>`;

  const spot = $("#spotlight");
  spot.classList.toggle("hidden", !combat.on || !now);
  if (combat.on && now) spot.innerHTML = spotlight(now, session, combat);
}

/* Una carta de personaje o de criatura */
function whoCard(c, session, { inTurn = false, fighting = false } = {}) {
  const monster = c.kind === "monster";
  const p = c.hpPct !== undefined ? c.hpPct : monster ? null : pct(c);
  const exact = monster ? false : session.showPartyHP;
  return `<div class="who-card ${c.hp <= 0 ? "down" : ""} ${inTurn ? "turn" : ""} ${fighting ? "" : "aside"} ${c.memory ? "memory" : ""}"
      style="--tone:${esc(c.color)}">
    <div class="who-top">
      ${c.avatarId ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
        : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`}
      <div style="min-width:0">
        <b>${esc(c.name)}</b>
        <span class="state">${esc(monster ? (c.memory ? "donde le visteis" : c.sizeType || "criatura") : [c.className, c.race].filter(Boolean).join(" · "))}</span>
      </div>
      ${monster ? "" : `<span class="ac">${c.ac}</span>`}
    </div>
    ${p !== null ? `<div class="bar"><i class="${hpTone(p)}" style="width:${p}%"></i></div>` : ""}
    <div class="state row-line">
      ${exact ? `<span>${c.hp}/${c.maxHp} PV</span>` : ""}
      ${monster && c.wound ? `<span>${esc(c.wound)}</span>` : ""}
      ${c.conditions.length ? `<span class="conds">${c.conditions.map(x => `<i>${esc(conditionName(x))}</i>`).join("")}</span>` : ""}
    </div>
  </div>`;
}

/* El foco del turno: quién actúa, con lo poco que hace falta saber */
function spotlight(c, session, combat) {
  const monster = c.kind === "monster";
  const used = c.used || {};
  const left = Math.max(0, (c.speed || 30) - (used.move || 0));
  const p = c.hpPct !== undefined ? c.hpPct : monster ? null : pct(c);
  return `<div class="spot-card" style="--tone:${esc(c.color)}">
    <small>Ronda ${combat.round} · le toca a</small>
    ${c.avatarId ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
      : `<div class="avatar">${initials(c.name)}</div>`}
    <b>${esc(c.name)}</b>
    <span class="state">${esc(monster ? c.sizeType || "criatura" : [c.className, c.race].filter(Boolean).join(" · "))}</span>
    ${p !== null ? `<div class="bar"><i class="${hpTone(p)}" style="width:${p}%"></i></div>` : ""}
    <div class="spot-stats">
      ${monster ? "" : `<span><i>${c.ac}</i>CA</span>`}
      <span><i>${left}</i>pies</span>
      ${monster ? "" : `<span><i>${session.showPartyHP ? c.hp : Math.round(p)}${session.showPartyHP ? "" : "%"}</i>vida</span>`}
    </div>
    <div class="spot-uses">
      <span class="${used.action ? "spent" : ""}">Acción</span>
      <span class="${used.bonus ? "spent" : ""}">Adicional</span>
      <span class="${used.reaction ? "spent" : ""}">Reacción</span>
    </div>
    ${c.conditions.length ? `<div class="spot-conds">${c.conditions.map(x => `<i>${esc(conditionName(x))}</i>`).join("")}</div>` : ""}
    ${c.concentration ? `<div class="state">Concentrado en ${esc(c.concentration)}</div>` : ""}
  </div>`;
}
