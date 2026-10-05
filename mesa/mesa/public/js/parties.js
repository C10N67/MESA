/* Parties guardadas: los personajes de la mesa con sus fichas enteras
   (nivel, vida, conjuros, objetos), guardados con un nombre para traerlos
   a otra campaña. Guardar otra vez con el mismo nombre la pone al día.
   Se guardan aparte de las campañas (data/parties, o el navegador en la
   versión de prueba). */

import { esc, modal, toast, confirmBox } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { store, partyList, campaignOp } from "./net.js";
import { currentLang } from "./i18n.js";

const en = () => currentLang() === "en";
const pcs = () => ((store.doc && store.doc.chars) || []).filter(c => c.kind === "pc" && !c.probe);

function when(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const loc = en() ? "en-GB" : "es-ES";
  return d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
}

/* La ventana: guardar la party de ahora y traer una guardada */
export function openParties({ focus = "save" } = {}) {
  let list = [];
  let busy = false;
  let saved = "";            // el nombre recién guardado, hasta que llegue el estado nuevo
  const host = document.createElement("div");
  host.className = "camp-host parties";
  const m = modal({ title: "Parties", body: host, actions: [{ label: "Cerrar" }] });

  const card = p => {
    const who = (p.pcs || []).map((n, i) => `${n} (${(p.levels || [])[i] || 1})`).join(", ");
    return `<div class="camp-card">
      <div class="camp-load static">
        <span class="camp-ico">${icon("users", 18)}</span>
        <span class="camp-text">
          <b data-keep>${esc(p.name)}</b>
          <small data-keep>${esc(who)}</small>
          <small>${esc(when(p.savedAt))}</small>
        </span>
        <button type="button" class="btn sm" data-bring="${esc(p.id)}">${withIcon("userPlus", "Traer a la mesa", 15)}</button>
      </div>
      <button type="button" class="icon-btn camp-del" data-del="${esc(p.id)}" title="Borrar esta party" aria-label="Borrar esta party">${icon("trash", 16)}</button>
    </div>`;
  };

  function paint() {
    const here = pcs();
    const name = saved || (store.doc && store.doc.session.partyName) || "";
    host.innerHTML = `
      <form class="party-save">
        <p class="field-label">Guardar la party de esta mesa</p>
        ${here.length ? `
          <p class="party-chips">${here.map(c => `<span class="chip static" data-keep>${esc(c.name)} · ${en() ? "lvl" : "nv"} ${c.level}</span>`).join("")}</p>
          <div class="party-row">
            <input name="name" maxlength="60" placeholder="Los Hijos del Dragón" value="${esc(name)}" autocomplete="off" aria-label="Nombre de la party">
            <button class="btn primary" type="submit">${withIcon("bookmark", "Guardar party", 15)}</button>
          </div>
          <p class="prose party-note">Se guardan las fichas tal como están ahora. Si ya hay una con ese nombre, se pone al día.</p>`
        : `<p class="prose party-note">Todavía no hay personajes en la mesa.</p>`}
      </form>
      <p class="field-label">Parties guardadas</p>
      ${list.length ? `<div class="camp-list">${list.map(card).join("")}</div>`
        : `<p class="prose party-note">Ninguna todavía. Cuando guardes una, la podrás traer a cualquier campaña.</p>`}
      <p class="form-error hidden" role="alert"></p>`;
    const input = host.querySelector('[name="name"]');
    if (input && focus === "save") setTimeout(() => { input.focus(); input.select(); }, 0);
  }

  const fail = msg => {
    const box = host.querySelector(".form-error");
    box.innerHTML = `${icon("info", 16)}<span>${esc(msg)}</span>`;
    box.classList.remove("hidden");
  };
  const refresh = async () => { list = await partyList().catch(() => list); paint(); };
  async function run(o, done) {
    if (busy) return;
    busy = true;
    try { await campaignOp(o); await done(); }
    catch (err) { fail(err.message); }
    finally { busy = false; }
  }

  host.addEventListener("submit", e => {
    e.preventDefault();
    const name = host.querySelector('[name="name"]').value.trim();
    run({ type: "party.save", name }, async () => { saved = name; toast("Party guardada", "good"); focus = ""; await refresh(); });
  });
  host.addEventListener("click", async e => {
    const bring = e.target.closest("[data-bring]");
    if (bring) return run({ type: "party.load", id: bring.dataset.bring }, () => { toast("La party ya está en la mesa", "good"); m.close(); });
    const del = e.target.closest("[data-del]");
    if (del) {
      const p = list.find(x => x.id === del.dataset.del);
      if (!p || !await confirmBox(`¿Borrar la party «${p.name}»? Los personajes que ya están en alguna campaña se quedan.`, { okLabel: "Borrar" })) return;
      run({ type: "party.remove", id: p.id }, refresh);
    }
  });

  host.innerHTML = `<p class="prose camp-wait">Buscando parties…</p>`;
  refresh();
}
