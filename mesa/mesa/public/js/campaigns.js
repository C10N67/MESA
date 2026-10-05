/* Campañas: al entrar como DM, Mesa pregunta qué se juega hoy, si una
   campaña nueva o una que ya existe. También se abre desde el menú ···.

   La campaña en juego vive donde siempre (data/mesa.json, o el navegador en
   la versión de prueba); las demás esperan guardadas aparte. Al empezar una
   nueva o cargar otra, la de ahora se guarda primero con las demás, así que
   no se pierde nada al cambiar. */

import { esc, confirmBox } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { campaignList, campaignOp } from "./net.js";
import { currentLang } from "./i18n.js";

const en = () => currentLang() === "en";
const plural = (n, es1, esN, en1, enN) => `${n} ${en() ? (n === 1 ? en1 : enN) : (n === 1 ? es1 : esN)}`;

/* «hoy 17:05», «ayer 21:30» o la fecha */
function when(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const loc = en() ? "en-GB" : "es-ES";
  const hm = d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return (en() ? "today " : "hoy ") + hm;
  if (diff === 1) return (en() ? "yesterday " : "ayer ") + hm;
  return d.toLocaleDateString(loc, { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/* Pinta el selector en «host». onDone() se llama con la campaña ya en juego. */
export function campaignChooser(host, { onDone = () => {}, inGame = false } = {}) {
  let list = [];
  let mode = "load";
  let busy = false;

  const card = c => {
    const who = c.pcs && c.pcs.length ? c.pcs.join(", ") : (en() ? "No characters yet" : "Sin personajes todavía");
    const bits = [plural(c.maps || 0, "mapa", "mapas", "map", "maps"), c.current ? "" : when(c.savedAt)].filter(Boolean).join(" · ");
    return `<div class="camp-card ${c.current ? "current" : ""}">
      <button type="button" class="camp-load" data-load="${esc(c.id)}">
        <span class="camp-ico">${icon(c.current ? "play" : "book", 18)}</span>
        <span class="camp-text">
          <b data-keep>${esc(c.title)}</b>
          <small data-keep>${esc(who)}</small>
          <small>${esc(bits)}</small>
        </span>
        ${c.current ? `<span class="camp-tag">${inGame ? (en() ? "Playing" : "En juego") : (en() ? "The last one" : "La última")}</span>` : ""}
      </button>
      ${c.current ? "" : `<button type="button" class="icon-btn camp-del" data-del="${esc(c.id)}" title="Borrar esta campaña" aria-label="Borrar esta campaña">${icon("trash", 16)}</button>`}
    </div>`;
  };

  function paint() {
    const current = list.find(c => c.current);
    host.innerHTML = `<div class="camp">
      <h2 class="camp-q">¿Qué campaña jugamos?</h2>
      <div class="roles camp-modes" role="radiogroup" aria-label="Campaña">
        <button type="button" data-mode="new" aria-pressed="${mode === "new"}">${icon("plus", 22)}<b>Nueva</b><small>empezar de cero</small></button>
        <button type="button" data-mode="load" aria-pressed="${mode === "load"}" ${list.length ? "" : "disabled"}>${icon("book", 22)}<b>Existente</b><small>${list.length ? "cargar una guardada" : "todavía no hay"}</small></button>
      </div>
      ${mode === "new" ? `
        <form class="camp-new">
          <label class="field"><span>Nombre de la campaña</span>
            <input name="title" maxlength="60" placeholder="La mina perdida de Phandelver" autocomplete="off"></label>
          ${current ? `<p class="prose camp-note">${en() ? "The current one" : "La de ahora"}, <b data-keep>«${esc(current.title)}»</b>, ${en() ? "is kept with the others: you can load it again whenever you like." : "se guarda con las demás: la puedes volver a cargar cuando quieras."}</p>` : ""}
          <button class="btn primary go" type="submit">${withIcon("plus", "Empezar la campaña")}</button>
        </form>` : `
        <div class="camp-list">${list.map(card).join("")}</div>`}
      <p class="form-error hidden" role="alert"></p>
    </div>`;
    const input = host.querySelector('[name="title"]');
    if (input) setTimeout(() => input.focus(), 0);
  }

  const fail = msg => {
    const box = host.querySelector(".form-error");
    if (!box) return;
    box.innerHTML = `${icon("info", 16)}<span>${esc(msg)}</span>`;
    box.classList.remove("hidden");
  };
  async function act(o) {
    if (busy) return;
    busy = true;
    host.querySelectorAll("button").forEach(b => { b.disabled = true; });
    try { await campaignOp(o); onDone(); }
    catch (err) { busy = false; paint(); fail(err.message); }
  }

  host.addEventListener("click", async e => {
    const m = e.target.closest("[data-mode]");
    if (m && !m.disabled) { mode = m.dataset.mode; paint(); return; }
    const load = e.target.closest("[data-load]");
    if (load) {
      const c = list.find(x => x.id === load.dataset.load);
      if (c && c.current) return onDone();
      return act({ type: "campaign.load", id: load.dataset.load });
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      const c = list.find(x => x.id === del.dataset.del);
      if (!c || !await confirmBox(`¿Borrar la campaña «${c.title}»? No se puede deshacer.`, { okLabel: "Borrar" })) return;
      try { await campaignOp({ type: "campaign.remove", id: c.id }); } catch (err) { return fail(err.message); }
      list = list.filter(x => x.id !== c.id);
      if (!list.length) mode = "new";
      paint();
    }
  });
  host.addEventListener("submit", e => {
    e.preventDefault();
    const title = (host.querySelector('[name="title"]') || {}).value || "";
    act({ type: "campaign.new", title });
  });

  host.innerHTML = `<p class="prose camp-wait">Buscando campañas…</p>`;
  campaignList()
    .then(l => { list = l; })
    .catch(() => { list = []; })
    .finally(() => { mode = list.length ? "load" : "new"; paint(); });
}
