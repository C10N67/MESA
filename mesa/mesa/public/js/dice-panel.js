/* Dados, charla y registro de la partida. Lo ven todos: cuando alguien tira,
   sale en la pantalla de los demás. El DM además puede tirar en secreto y
   cualquiera puede susurrarle sin que se entere la mesa. */

import { el, on, esc, hhmm, toast, modal } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { roll, detail } from "./dice.js";
import { store, addLog, op } from "./net.js";

let mode = "normal";
let secret = false;
let filter = "todo";
let whisperTo = [];      // identificadores de ficha, y "dm" para el máster
let logPainted = null;   // aviso al panel cada vez que se repinta el registro
const STOW_KEY = "mesa.dockStowed";

export function throwDice(formula, { label = "", mode: m = mode, secret: s = false } = {}) {
  const result = roll(formula, m);
  if (!result) { toast("No entiendo esa fórmula. Prueba con 1d20+3", "bad"); return null; }
  addLog({
    kind: "roll",
    label,
    formula: result.formula,
    mode: result.mode,
    total: result.total,
    detail: detail(result),
    crit: result.crit,
    fumble: result.fumble,
    secret: !!s
  });
  return result;
}

export function tellTable(text, { secret: s = false } = {}) {
  addLog({ kind: "event", text, secret: !!s });
}

export function say(text, to = []) {
  const clean = String(text || "").trim();
  if (!clean) return;
  op("chat", { text: clean, to });
}

/* A quién se puede susurrar: al DM y a cada personaje que no seas tú. */
function audience() {
  const doc = store.doc;
  const me = store.session || {};
  const list = [];
  if (me.role !== "dm") list.push({ id: "dm", name: "DM" });
  for (const c of (doc ? doc.chars : [])) {
    if (c.kind !== "pc" || c.id === me.charId) continue;
    list.push({ id: c.id, name: c.name, color: c.color });
  }
  return list;
}

export function dicePanel({ isDM = false, stowable = isDM } = {}) {
  const node = el(`
    <aside class="dock" id="dock">
      <header>
        <h2>${icon("dice", 18)}<span>Dados y mesa</span></h2>
        <span class="spacer"></span>
        ${isDM ? `<button class="icon-btn" data-clear title="Vaciar el registro">${icon("trash")}</button>` : ""}
        ${stowable ? `<button class="btn sm dock-stow" data-stow title="Guardar el panel en el marcapáginas del d20">${BOOKMARK}<span class="lbl">Guardar</span></button>` : ""}
        <button class="icon-btn" data-toggle title="Abrir o cerrar">${icon("up")}</button>
      </header>
      <div class="dice-pad">
        ${[4, 6, 8, 10, 12, 20, 100].map(d => `<button class="die" data-die="${d}">d${d}</button>`).join("")}
        <button class="die" data-die="20" data-many="2">2d20</button>
      </div>
      <div class="adv">
        <button data-mode="dis" aria-pressed="false">Desventaja</button>
        <button data-mode="normal" aria-pressed="true">Normal</button>
        <button data-mode="adv" aria-pressed="false">Ventaja</button>
        ${isDM ? `<button data-secret aria-pressed="false" title="En secreto: nadie más lo ve" aria-label="En secreto">${icon("eyeOff", 15)}<span>Secreto</span></button>` : ""}
      </div>
      <form class="dice-form">
        <input name="f" placeholder="1d20+5, 2d6, 8d6…" aria-label="Fórmula de dados" autocomplete="off">
        <button class="btn primary sm" type="submit">${withIcon("dice", "Tirar", 16)}</button>
      </form>
      <div class="log-tabs">
        <button data-filter="todo" aria-pressed="true">Todo</button>
        <button data-filter="roll" aria-pressed="false">Tiradas</button>
        <button data-filter="chat" aria-pressed="false">Charla</button>
      </div>
      <div class="log" id="log"></div>
      <div class="whisper-to hidden" id="whisperTo"></div>
      <form class="chat-form">
        <button type="button" class="icon-btn" data-whisper title="Susurrar a alguien en concreto" aria-pressed="false">${icon("whisper")}</button>
        <input name="t" placeholder="Escribe a la mesa…" aria-label="Mensaje" autocomplete="off" maxlength="500">
        <button class="btn sm" type="submit" title="Enviar" aria-label="Enviar">${icon("send", 16)}</button>
      </form>
    </aside>`);

  node.querySelector(".dice-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.f;
    if (throwDice(input.value.trim(), { secret })) input.select();
  });

  node.querySelector(".chat-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.t;
    say(input.value, whisperTo);
    input.value = "";
  });

  const wBtn = node.querySelector("[data-whisper]");
  const paintTo = () => {
    const bar = node.querySelector("#whisperTo");
    const people = audience().filter(p => whisperTo.includes(p.id));
    bar.classList.toggle("hidden", !people.length);
    bar.innerHTML = people.length
      ? `<span>En privado a</span>${people.map(p => `<button class="tagx" data-untag="${p.id}">${esc(p.name)} ${icon("close", 12)}</button>`).join("")}`
      : "";
    wBtn.setAttribute("aria-pressed", String(people.length > 0));
    node.querySelector(".chat-form input").placeholder = people.length
      ? `Solo lo leerán ${people.map(p => p.name).join(", ")}…`
      : "Escribe a la mesa…";
  };
  on(node, "click", "[data-untag]", (e, b) => { whisperTo = whisperTo.filter(x => x !== b.dataset.untag); paintTo(); });
  wBtn.addEventListener("click", () => openWhisperPicker(paintTo));
  paintTo();

  on(node, "click", "[data-die]", (e, b) => throwDice((b.dataset.many || 1) + "d" + b.dataset.die, { secret }));

  on(node, "click", "[data-mode]", (e, b) => {
    mode = b.dataset.mode;
    node.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });

  on(node, "click", "[data-filter]", (e, b) => {
    filter = b.dataset.filter;
    node.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    renderLog(node.querySelector("#log"));
  });

  const secretBtn = node.querySelector("[data-secret]");
  if (secretBtn) secretBtn.addEventListener("click", () => {
    secret = !secret;
    secretBtn.setAttribute("aria-pressed", String(secret));
  });

  node.querySelector("[data-toggle]").addEventListener("click", () => node.classList.toggle("open"));
  node.querySelector("header").addEventListener("click", e => {
    if (window.innerWidth <= 1080 && !e.target.closest("button")) node.classList.toggle("open");
  });
  const clear = node.querySelector("[data-clear]");
  if (clear) clear.addEventListener("click", () => op("log.clear"));

  if (stowable) stowing(node);
  return node;
}

/* Los estilos de guardar el panel viajan con este código y no en mesa.css: si
   el navegador se quedara con una hoja de estilos vieja (una copia a medio
   actualizar, una caché terca), el botón seguiría funcionando igual. Por lo
   mismo, los dos iconos van aquí por si icons.js no los tuviera aún. */
const STOW_CSS = `
@media (min-width: 1081px) { .dock.can-stow [data-toggle] { display: none; } }
.dock-stow { gap: 5px; padding: 5px 10px; }
.dock-stow .ico { color: var(--gold-soft); }

.layout.dock-stowed { grid-template-columns: minmax(0, 1fr); }
.dock.stowed { display: contents; }
.dock.stowed > :not(.dock-mark) { display: none !important; }
.dock-mark { display: none; }
.dock.stowed .dock-mark {
  display: block; position: fixed; z-index: 34; top: var(--bm-top, 57px); right: 22px;
  padding: 0; border: 0; background: none; cursor: pointer;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .5));
  animation: markDrop .35s cubic-bezier(.22, 1.3, .36, 1) both;
}
.dock-mark-ribbon {
  display: grid; justify-items: center; align-content: start; gap: 4px;
  width: 46px; height: 78px; padding-top: 12px; color: #f2d48c;
  background:
    linear-gradient(90deg, transparent 4px, rgba(242, 212, 140, .55) 4px 5.5px, transparent 5.5px calc(100% - 5.5px), rgba(242, 212, 140, .55) calc(100% - 5.5px) calc(100% - 4px), transparent calc(100% - 4px)),
    linear-gradient(180deg, #5c1519, #8a2329 40%, #741c22);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
  transition: height .18s ease, padding-top .18s ease;
}
.dock-mark:hover .dock-mark-ribbon, .dock-mark:focus-visible .dock-mark-ribbon { height: 88px; padding-top: 20px; }
.dock-mark:focus-visible { outline: none; }
.dock-mark:focus-visible .dock-mark-ribbon { color: #fff4d6; }
.dock-mark .ico { filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .5)); }
.dock-mark-count {
  min-width: 20px; padding: 0 5px; border-radius: 99px; text-align: center;
  font: 700 11px/18px var(--sans); color: #2a1a08; background: #f2d48c;
}
.dock-mark-count[hidden] { display: none; }
@keyframes markDrop { from { transform: translateY(-100%); } }
@media (min-width: 1081px) { .layout.dock-stowed > main { padding-right: 84px; } }
@media (max-width: 1080px) {
  .dock.stowed .dock-mark { top: auto; bottom: 0; right: 16px; animation-name: markRise; }
  .dock-mark-ribbon { align-content: end; padding: 0 0 14px; clip-path: polygon(0 20%, 50% 0, 100% 20%, 100% 100%, 0 100%); }
  .dock-mark:hover .dock-mark-ribbon, .dock-mark:focus-visible .dock-mark-ribbon { padding: 0 0 20px; }
  .dock-mark-count { order: -1; }
}
@keyframes markRise { from { transform: translateY(100%); } }
@media (prefers-reduced-motion: reduce) { .dock.stowed .dock-mark { animation: none; } .dock-mark-ribbon { transition: none; } }
`;
const BOOKMARK = '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9Z"/></svg>';
const D20 = '<svg class="ico" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.4 20.6 7.2v9.6L12 21.6 3.4 16.8V7.2Z"/><path d="M12 7.6 16.8 15.6H7.2Z"/><path d="M12 2.4v5.2M20.6 7.2l-3.8 8.4M3.4 7.2l3.8 8.4M3.4 16.8l3.8-1.2M20.6 16.8l-3.8-1.2M7.2 15.6 12 21.6l4.8-6"/></svg>';
function stowStyles() {
  if (document.getElementById("mesa-dock-stow")) return;
  const style = document.createElement("style");
  style.id = "mesa-dock-stow";
  style.textContent = STOW_CSS;
  document.head.appendChild(style);
}

/* Guardar el panel: desaparece, el resto de la vista gana su ancho y queda un
   marcapáginas con un d20 colgando del borde de arriba. Pulsarlo lo vuelve a
   abrir. Mientras está guardado, el marcapáginas cuenta lo que ha pasado en
   la mesa (tiradas y mensajes de los demás). Se recuerda en este navegador. */
function stowing(node) {
  stowStyles();
  node.classList.add("can-stow");
  const mark = el(`<button type="button" class="dock-mark" title="Abrir dados y mesa" aria-label="Abrir dados y mesa">
    <span class="dock-mark-ribbon">${D20}<span class="dock-mark-count" hidden></span></span></button>`);
  node.appendChild(mark);
  /* Hasta cuándo se ha visto el registro (la hora de su última entrada; null:
     aún no ha llegado la partida, y se toma en cuanto llegue). Por hora y no
     por entrada, porque el registro se recorta y la entrada puede irse. */
  let seen = 0;
  const lastTs = () => { const log = (store.doc && store.doc.log) || []; return log.length ? log[log.length - 1].ts : 0; };
  const unread = () => {
    if (!store.doc) return 0;
    if (seen === null) seen = lastTs();
    const me = store.session && store.session.name;
    return (store.doc.log || []).filter(e => e.ts > seen && ["roll", "attack", "chat"].includes(e.kind) && e.actor !== me).length;
  };
  const paintCount = () => {
    const n = node.classList.contains("stowed") ? unread() : 0;
    const badge = mark.querySelector(".dock-mark-count");
    badge.hidden = !n;
    badge.textContent = n > 99 ? "99+" : String(n);
    mark.setAttribute("aria-label", n ? `Abrir dados y mesa (${n} nuevos)` : "Abrir dados y mesa");
  };
  /* Cuelga justo debajo de la barra de arriba, mida lo que mida */
  const hang = () => {
    const bar = document.querySelector(".topbar");
    mark.style.setProperty("--bm-top", Math.round(bar ? bar.getBoundingClientRect().bottom : 57) + "px");
  };
  const stow = on => {
    node.classList.toggle("stowed", on);
    /* En el móvil vuelve ya desplegado: para eso se ha pulsado el marcapáginas */
    node.classList.toggle("open", !on && window.innerWidth <= 1080);
    if (node.parentElement) node.parentElement.classList.toggle("dock-stowed", on);
    seen = on && store.doc ? lastTs() : on ? null : 0;
    try { on ? localStorage.setItem(STOW_KEY, "1") : localStorage.removeItem(STOW_KEY); } catch {}
    hang();
    paintCount();
    if (!on) node.querySelector(".dice-form input").focus({ preventScroll: true });
  };
  node.querySelector("[data-stow]").addEventListener("click", e => { e.stopPropagation(); stow(true); });
  mark.addEventListener("click", () => stow(false));
  addEventListener("resize", hang);
  logPainted = paintCount;
  let saved = false;
  try { saved = localStorage.getItem(STOW_KEY) === "1"; } catch {}
  /* Se aplica cuando ya está dentro de la vista, para poder ensanchar el resto */
  if (saved) queueMicrotask(() => stow(true));
}

/* Quién va a leerlo: se eligen uno o varios; sin nadie marcado, lo lee la mesa. */
function openWhisperPicker(done) {
  const people = audience();
  if (!people.length) return toast("No hay nadie más en la mesa todavía");
  const body = el(`<div>
    <div class="cond-grid">
      ${people.map(p => `<label><input type="checkbox" value="${p.id}" ${whisperTo.includes(p.id) ? "checked" : ""}>${esc(p.name)}</label>`).join("")}
    </div>
    <p class="prose" style="font-size:12px;margin-top:10px">
      Sin marcar a nadie, el mensaje lo lee toda la mesa. Lo que susurres no llega
      siquiera al navegador de los demás, y la pantalla de la tele nunca lo enseña.
    </p>
  </div>`);
  modal({
    title: "¿A quién se lo dices?", body, wide: true,
    actions: [
      { label: "A toda la mesa", run: host => { whisperTo = []; done(); } },
      { label: "Susurrar", tone: "primary", run: host => {
        whisperTo = [...host.querySelectorAll("input:checked")].map(i => i.value);
        done();
      } }
    ]
  });
}

export const currentMode = () => mode;
export const isSecret = () => secret;

export function renderLog(host) {
  const doc = store.doc;
  if (!host || !doc) return;
  if (logPainted) logPainted();
  const keep = e => filter === "todo" ? true
    : filter === "chat" ? e.kind === "chat"
    : e.kind === "roll" || e.kind === "attack";
  const stick = host.scrollHeight - host.scrollTop - host.clientHeight < 60;

  host.innerHTML = doc.log.filter(keep).slice(-70).map(e => {
    const cls = [e.kind, e.crit ? "crit" : "", e.fumble ? "fumble" : "", e.secret ? "secret" : ""].join(" ");
    if (e.kind === "chat") {
      const mine = store.session && e.actor === store.session.name;
      const who = (e.names || []).join(", ");
      return `<div class="entry chat ${e.private ? "secret" : ""}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span>
          ${e.private ? `<span class="detail">${mine ? "solo a " + esc(who) : "en privado"}</span>` : ""}
          <span class="time">${hhmm(e.ts)}</span></div>
        <p class="said">${esc(e.text)}</p></div>`;
    }
    if (e.kind === "note") {
      return `<div class="entry event">
        <div class="top"><span class="who">${esc(e.actor || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p></div>`;
    }
    if (e.kind === "event") {
      return `<div class="entry ${cls}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p></div>`;
    }
    if (e.kind === "attack") {
      return `<div class="entry ${cls}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span>
          <span class="detail">${esc(e.label || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p>
        <div class="detail">${esc(e.detail || "")}</div></div>`;
    }
    const tag = e.mode === "adv" ? " con ventaja" : e.mode === "dis" ? " con desventaja" : "";
    return `<div class="entry ${cls}">
      <div class="top">
        <span class="who">${esc(e.actor || "")}</span>
        <span class="detail">${esc(e.label || e.formula)}${tag}${e.secret ? " · en secreto" : ""}</span>
        <span class="time">${hhmm(e.ts)}</span>
      </div>
      <div><span class="result tnum">${e.total}</span>
        <span class="detail">${esc(e.detail)}</span>
        ${e.crit ? '<span class="detail"> · crítico</span>' : ""}${e.fumble ? '<span class="detail"> · pifia</span>' : ""}
      </div>
    </div>`;
  }).join("");

  if (stick) host.scrollTop = host.scrollHeight;
}
