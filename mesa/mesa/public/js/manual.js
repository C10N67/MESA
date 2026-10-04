/* Mesa · el manual del DM, en una ventana

   Centrado en la 5.5 (D&D 2024): la chuleta, el reglamento entero, los
   estados, todos los conjuros, las armas y armaduras, las especies y todas
   las criaturas del SRD 5.2, traducidos. Las ediciones anteriores quedan en
   un apartado propio. A la izquierda el índice, a la derecha la página, y
   un buscador que mira en todo a la vez. Recuerda dónde lo dejaste.

   Los catálogos (public/data/srd52/*.json) pesan: se piden la primera vez
   que se abren, no al cargar Mesa. */

import { modal, esc, el, on } from "./util.js";
import { EDITIONS, SECTIONS } from "./manual-data.js";
import { conditionIcon, conditionTone } from "./icons.js";

const KEY = "mesa.manual";
const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/* Los nombres se buscan por el principio de cada palabra: «lobo» da «Lobo
   terrible», no «Globo de invulnerabilidad» */
const nameHas = (name, words) => { const f = " " + fold(name).replace(/[^a-z0-9]+/g, " "); return words.every(w => f.includes(" " + w)); };

/* ---------- Texto con formato ----------
   Lo justo de Markdown para el manual y para el SRD: párrafos, listas («- »,
   «* » y «1. »), tablas (la fila |---| se salta), subtítulos (##, ###),
   **negrita** y *cursiva*. Todo pasa antes por esc(). */
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/(^|[^*\w])[*_]([^*_\n]+?)[*_](?![*\w])/g, "$1<i>$2</i>")
  .replace(/(https?:\/\/[^\s)<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const isSep = l => /^\|?\s*:?-{2,}/.test(l);

export function renderText(text) {
  const out = [];
  const blocks = String(text || "").trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      const h = l.match(/^(#{2,4})\s+(.*)/);
      if (h) { out.push(h[1].length === 2 ? `<h4>${inline(h[2])}</h4>` : `<h5>${inline(h[2])}</h5>`); i++; continue; }
      if (/^(Tabla|Table):/.test(l)) { out.push(`<p class="man-caption">${inline(l.replace(/^(Tabla|Table):\s*/, ""))}</p>`); i++; continue; }
      if (l.startsWith("|")) {
        const rows = [];
        while (i < lines.length && lines[i].startsWith("|")) {
          const row = lines[i++];
          if (!isSep(row)) rows.push(row.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
        }
        const [head, ...body] = rows;
        out.push(`<div class="man-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead>
          <tbody>${body.map(r => `<tr>${r.map((c, j) => j ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (/^[-*] /.test(l)) {
        const items = [];
        while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2));
        out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ul>`);
        continue;
      }
      if (/^\d+\. /.test(l)) {
        const items = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
        out.push(`<ol>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ol>`);
        continue;
      }
      const para = [];
      while (i < lines.length && !/^([-*] |\||#{2,4}\s|\d+\. |(Tabla|Table):)/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("");
}

/* ---------- Datos del SRD 5.2 ---------- */
const cache = {};
export function loadSrd(name) {
  if (!cache[name]) {
    const base = typeof document !== "undefined" ? document.baseURI : "http://localhost/";
    cache[name] = fetch(new URL(`data/srd52/${name}.json`, base)).then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).catch(err => { delete cache[name]; throw err; });
  }
  return cache[name];
}

const sign = n => (n >= 0 ? "+" : "−") + Math.abs(n);
const LEVEL = l => l ? `Nivel ${l}` : "Truco";
const CLASSES = ["Bardo", "Brujo", "Clérigo", "Druida", "Explorador", "Hechicero", "Mago", "Paladín"];
const SCHOOLS = ["Abjuración", "Adivinación", "Conjuración", "Encantamiento", "Evocación", "Ilusión", "Nigromancia", "Transmutación"];
const TYPES = ["Aberración", "Bestia", "Celestial", "Cieno", "Constructo", "Dragón", "Elemental", "Gigante", "Hada", "Humanoide", "Infernal", "Monstruosidad", "Muerto viviente", "Planta"];
const CR_BANDS = [["", "Cualquier desafío"], ["0-0.5", "VD 0 a 1/2"], ["1-4", "VD 1 a 4"], ["5-10", "VD 5 a 10"], ["11-16", "VD 11 a 16"], ["17-30", "VD 17 o más"]];
const crNum = cr => cr.includes("/") ? 1 / Number(cr.split("/")[1]) : Number(cr);

/* Un conjuro: la cabecera siempre; el cuerpo, al abrirlo */
const spellHead = s => `<details class="srd" data-kind="spell" data-id="${esc(s.id)}">
  <summary><b>${esc(s.name)}</b><span class="srd-tags">${LEVEL(s.level)} · ${esc(s.school)}</span>${s.concentration ? '<span class="srd-flag" title="Concentración">C</span>' : ""}${s.ritual ? '<span class="srd-flag" title="Ritual">R</span>' : ""}</summary>
  <div class="srd-body"></div></details>`;
const spellBody = s => `
  <p class="srd-sub">${s.level ? `${esc(s.school)} de nivel ${s.level}` : `Truco de ${esc(s.school.toLowerCase())}`} (${esc(s.classes.join(", "))})</p>
  <dl class="srd-meta">
    <dt>Tiempo de lanzamiento</dt><dd>${esc(s.time)}${s.ritual ? " o ritual" : ""}</dd>
    <dt>Alcance</dt><dd>${esc(s.range)}</dd>
    <dt>Componentes</dt><dd>${esc(s.components)}</dd>
    <dt>Duración</dt><dd>${esc(s.duration)}</dd>
  </dl>
  ${renderText(s.text)}${s.higher ? renderText(s.higher) : ""}
  <p class="srd-en">En inglés: ${esc(s.en)}</p>`;

const creatureHead = c => `<details class="srd" data-kind="creature" data-id="${esc(c.id)}">
  <summary><b>${esc(c.name)}</b><span class="srd-tags">${esc(c.type)} ${esc(c.size.toLowerCase())} · VD ${esc(c.cr)}</span></summary>
  <div class="srd-body"></div></details>`;
const ABIL = [["str", "FUE"], ["dex", "DES"], ["con", "CON"], ["int", "INT"], ["wis", "SAB"], ["cha", "CAR"]];
const block = (title, list, intro = "") => list && list.length ? `<h5 class="srd-part">${title}</h5>${intro ? `<p class="srd-intro">${intro}</p>` : ""}
  ${list.map(a => `<div class="srd-act"><b><i>${esc(a.name)}.</i></b> ${renderText(a.text)}</div>`).join("")}` : "";
const creatureBody = c => `
  <p class="srd-sub">${esc(c.type)} ${esc(c.size.toLowerCase())}, ${esc(c.alignment)}</p>
  <dl class="srd-meta">
    <dt>CA</dt><dd>${c.ac}${c.acNote ? ` (${esc(c.acNote)})` : ""}</dd>
    <dt>Iniciativa</dt><dd>${sign(c.init)} (${10 + c.init})</dd>
    <dt>PG</dt><dd>${c.hp}${c.hd ? ` (${esc(c.hd)})` : ""}</dd>
    <dt>Velocidad</dt><dd>${esc(c.speed)}</dd>
  </dl>
  <div class="srd-abil">${ABIL.map(([k, label]) => { const [score, mod, save] = c.abilities[k]; return `<div><b>${label}</b><span>${score}</span><small>mod ${sign(mod)} · salv ${sign(save)}</small></div>`; }).join("")}</div>
  <dl class="srd-meta">
    ${c.skills ? `<dt>Habilidades</dt><dd>${esc(c.skills)}</dd>` : ""}
    ${c.vulnerable ? `<dt>Vulnerable a</dt><dd>${esc(c.vulnerable)}</dd>` : ""}
    ${c.resist ? `<dt>Resistencias</dt><dd>${esc(c.resist)}</dd>` : ""}
    ${c.immune ? `<dt>Inmunidades</dt><dd>${esc(c.immune)}</dd>` : ""}
    <dt>Sentidos</dt><dd>${esc(c.senses)}</dd>
    <dt>Idiomas</dt><dd>${esc(c.languages)}</dd>
    <dt>Desafío</dt><dd>${esc(c.cr)} (${c.xp.toLocaleString("es-ES")} PX; bonificador por competencia ${sign(c.pb)})</dd>
  </dl>
  ${block("Rasgos", c.traits)}${block("Acciones", c.actions)}${block("Acciones adicionales", c.bonus)}${block("Reacciones", c.reactions)}
  ${block("Acciones legendarias", c.legendary, "Usos de acciones legendarias: normalmente 3 (4 en su guarida). Justo después del turno de otra criatura, puede gastar un uso para hacer una de estas acciones. Recupera todos los usos al empezar su turno.")}
  <p class="srd-en">En inglés: ${esc(c.en)} · ${esc(c.group === "Animales" ? "animal" : "monstruo")} del SRD 5.2</p>`;

/* Rellena el cuerpo de un <details> la primera vez que se abre */
function lazyBodies(root, lookup) {
  root.addEventListener("toggle", e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open || !d.dataset.id) return;
    const body = d.querySelector(".srd-body");
    if (body.childElementCount) return;
    const item = lookup(d.dataset.kind, d.dataset.id);
    if (item) body.innerHTML = d.dataset.kind === "spell" ? spellBody(item) : creatureBody(item);
  }, true);
}

/* ---------- Páginas de catálogo ---------- */
const PAGES = {
  async spells(page, state) {
    const all = await loadSrd("conjuros");
    const f = state.spells || (state.spells = { q: "", level: "", cls: "", school: "", ritual: false, conc: false });
    page.innerHTML = `<h3>Conjuros</h3>
      <p class="prose">Los ${all.length} conjuros y trucos del SRD 5.2, el reglamento libre de la 5.5. Pulsa uno para leerlo entero. <b>C</b>: concentración · <b>R</b>: ritual.</p>
      <div class="srd-filters">
        <input type="search" data-f="q" placeholder="Nombre (también en inglés)" value="${esc(f.q)}" aria-label="Filtrar conjuros por nombre">
        <select data-f="level" aria-label="Nivel"><option value="">Todos los niveles</option><option value="0">Trucos</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}">Nivel ${n}</option>`).join("")}</select>
        <select data-f="cls" aria-label="Clase"><option value="">Todas las clases</option>${CLASSES.map(c => `<option>${c}</option>`).join("")}</select>
        <select data-f="school" aria-label="Escuela"><option value="">Todas las escuelas</option>${SCHOOLS.map(c => `<option>${c}</option>`).join("")}</select>
        <label class="check"><input type="checkbox" data-f="conc"> Concentración</label>
        <label class="check"><input type="checkbox" data-f="ritual"> Ritual</label>
      </div>
      <p class="srd-count" aria-live="polite"></p><div class="srd-list"></div>`;
    for (const k of ["level", "cls", "school"]) page.querySelector(`[data-f="${k}"]`).value = f[k];
    for (const k of ["conc", "ritual"]) page.querySelector(`[data-f="${k}"]`).checked = f[k];
    const paintList = () => {
      const words = fold(f.q).split(/\s+/).filter(Boolean);
      const hits = all.filter(s => (f.level === "" || s.level === +f.level) && (!f.cls || s.classes.includes(f.cls))
        && (!f.school || s.school === f.school) && (!f.conc || s.concentration) && (!f.ritual || s.ritual)
        && nameHas(s.name + " " + s.en, words));
      page.querySelector(".srd-count").textContent = hits.length === all.length ? `${all.length} conjuros` : `${hits.length} de ${all.length} conjuros`;
      const byLevel = {};
      for (const s of hits) (byLevel[s.level] ||= []).push(s);
      page.querySelector(".srd-list").innerHTML = Object.keys(byLevel).map(l => `<h4>${+l ? `Nivel ${l}` : "Trucos"} <small>(${byLevel[l].length})</small></h4>${byLevel[l].map(spellHead).join("")}`).join("")
        || `<p class="prose">Ningún conjuro cumple todo eso.</p>`;
    };
    filters(page, f, paintList);
    paintList();
  },

  async creatures(page, state) {
    const all = await loadSrd("criaturas");
    const f = state.creatures || (state.creatures = { q: "", type: "", cr: "", sort: "name" });
    page.innerHTML = `<h3>Criaturas</h3>
      <p class="prose">Las ${all.length} criaturas del SRD 5.2: animales, monstruos y gente con la que cruzarse. Pulsa una para ver su ficha completa.</p>
      <div class="srd-filters">
        <input type="search" data-f="q" placeholder="Nombre (también en inglés)" value="${esc(f.q)}" aria-label="Filtrar criaturas por nombre">
        <select data-f="type" aria-label="Tipo"><option value="">Todos los tipos</option><option value="Animales">Animales</option>${TYPES.map(t => `<option>${t}</option>`).join("")}</select>
        <select data-f="cr" aria-label="Desafío">${CR_BANDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
        <select data-f="sort" aria-label="Orden"><option value="name">Por nombre</option><option value="cr">Por desafío</option></select>
      </div>
      <p class="srd-count" aria-live="polite"></p><div class="srd-list"></div>`;
    for (const k of ["type", "cr", "sort"]) page.querySelector(`[data-f="${k}"]`).value = f[k];
    const paintList = () => {
      const words = fold(f.q).split(/\s+/).filter(Boolean);
      const [lo, hi] = f.cr ? f.cr.split("-").map(Number) : [0, 99];
      let hits = all.filter(c => (!f.type || (f.type === "Animales" ? c.group === "Animales" : c.type === f.type))
        && crNum(c.cr) >= lo && crNum(c.cr) <= hi && nameHas(c.name + " " + c.en, words));
      if (f.sort === "cr") hits = [...hits].sort((a, b) => crNum(a.cr) - crNum(b.cr) || a.name.localeCompare(b.name, "es"));
      page.querySelector(".srd-count").textContent = hits.length === all.length ? `${all.length} criaturas` : `${hits.length} de ${all.length} criaturas`;
      page.querySelector(".srd-list").innerHTML = hits.map(creatureHead).join("") || `<p class="prose">Ninguna criatura cumple todo eso.</p>`;
    };
    filters(page, f, paintList);
    paintList();
  },

  async gear(page) {
    const { weapons, armor, properties } = await loadSrd("equipo");
    const cats = ["Sencilla cuerpo a cuerpo", "Sencilla a distancia", "Marcial cuerpo a cuerpo", "Marcial a distancia"];
    const plural = { "Sencilla cuerpo a cuerpo": "Armas sencillas cuerpo a cuerpo", "Sencilla a distancia": "Armas sencillas a distancia",
      "Marcial cuerpo a cuerpo": "Armas marciales cuerpo a cuerpo", "Marcial a distancia": "Armas marciales a distancia" };
    const row = cells => `| ${cells.join(" | ")} |`;
    const weaponTable = cat => [row(["Arma", "Daño", "Propiedades", "Maestría", "Peso", "Coste"]),
      ...weapons.filter(w => w.category === cat).map(w => row([w.name, w.damage, w.properties.join(", ") || "—", w.mastery || "—", w.weight, w.cost]))].join("\n");
    const kinds = [["ligera", "Armaduras ligeras"], ["intermedia", "Armaduras intermedias"], ["pesada", "Armaduras pesadas"], ["escudo", "Escudo"]];
    const armorTable = [row(["Armadura", "CA", "Fuerza", "Sigilo", "Ponerse / quitarse", "Peso", "Coste"]),
      ...kinds.flatMap(([k, label]) => [row([`**${label}**`, "", "", "", "", "", ""]),
        ...armor.filter(a => a.kind === k).map(a => row([a.name, a.ac, a.strength, a.stealth, a.don, a.weight, a.cost]))])].join("\n");
    page.innerHTML = `<h3>Armas y armaduras</h3>
      <p class="prose">Las armas y armaduras del SRD 5.2, con sus propiedades y la maestría de cada arma.</p>
      ${cats.map(c => `<section><h4>${plural[c]}</h4>${renderText(weaponTable(c))}</section>`).join("")}
      <section><h4>Armaduras y escudo</h4>${renderText(armorTable)}
        <p class="prose">Sin la competencia necesaria, una armadura da desventaja en toda prueba de d20 de Fuerza o Destreza y no te deja lanzar conjuros. Si tu Fuerza es menor que la indicada, tu velocidad baja 10 pies.</p></section>
      <section><h4>Propiedades de las armas</h4>${properties.filter(p => !p.mastery).map(p => `<div class="srd-act"><b><i>${esc(p.name)}.</i></b> ${renderText(p.text)}</div>`).join("")}</section>
      <section><h4>Maestrías</h4>${properties.filter(p => p.mastery).map(p => `<div class="srd-act"><b><i>${esc(p.name)}.</i></b> ${renderText(p.text)}</div>`).join("")}</section>`;
  },

  async species(page) {
    const list = await loadSrd("especies");
    page.innerHTML = `<h3>Especies</h3>
      <p class="prose">Las especies (antes «razas») de la 5.5. Ya no dan mejoras de característica: esas salen del trasfondo. Todas son de tipo humanoide.</p>
      <nav class="srd-jump">${list.map(s => `<button type="button" data-jump="sp-${esc(s.id)}">${esc(s.name)}</button>`).join("")}</nav>
      ${list.map(s => `<section id="sp-${esc(s.id)}"><h4>${esc(s.name)}</h4>${s.traits.map(t => `<div class="srd-act"><b><i>${esc(t.name)}.</i></b> ${renderText(t.text)}</div>`).join("")}</section>`).join("")}`;
  },

  async rules(page) {
    const { chapters } = await loadSrd("reglas");
    page.innerHTML = `<h3>Reglamento</h3>
      <p class="prose">Las reglas de juego del SRD 5.2, completas y traducidas. Para consultas rápidas tienes la chuleta.</p>
      <nav class="srd-jump">${chapters.map(c => `<button type="button" data-jump="rl-${esc(c.id)}">${esc(c.name)}</button>`).join("")}</nav>
      ${chapters.map(c => `<section id="rl-${esc(c.id)}"><h4>${esc(c.name)}</h4>${renderText(c.intro)}
        ${c.sections.map(s => `<h5>${esc(s.name)}</h5>${renderText(s.text)}`).join("")}</section>`).join("")}`;
  },

  async conditions(page) {
    const { conditions } = await loadSrd("reglas");
    page.innerHTML = `<h3>Estados</h3>
      <p class="prose">Los quince estados de la 5.5, tal como los define el SRD 5.2. En Mesa se ponen desde el bocadillo de cada ficha o desde su hoja.</p>
      ${conditions.map(c => `<section class="srd-cond"><h4><span class="srd-cond-ico" style="--tone:${conditionTone(c.name.toLowerCase())}">${conditionIcon(c.name.toLowerCase(), 16)}</span>${esc(c.name)}</h4>${renderText(c.text)}</section>`).join("")}`;
  }
};

/* Los filtros de una página: cada cambio se guarda y repinta la lista */
function filters(page, state, paint) {
  let t = 0;
  page.querySelector(".srd-filters").addEventListener("input", e => {
    const k = e.target.dataset.f;
    if (!k) return;
    state[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    clearTimeout(t);
    t = setTimeout(paint, e.target.type === "search" ? 120 : 0);
  });
}

/* ---------- Búsqueda ---------- */
export function searchManual(query) {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  return SECTIONS.map((s, i) => ({ s, i })).filter(({ s }) => {
    const h = fold(s.title + " " + s.text);
    return words.every(w => h.includes(w));
  });
}

/* En los catálogos se busca por nombre (en castellano y en inglés); en el
   reglamento, también por el texto */
async function searchSrd(query) {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return null;
  const [spells, creatures, gear, species, rules] = await Promise.all(["conjuros", "criaturas", "equipo", "especies", "reglas"].map(loadSrd));
  const has = s => words.every(w => fold(s).includes(w));
  return {
    spells: spells.filter(s => nameHas(s.name + " " + s.en, words)),
    creatures: creatures.filter(c => nameHas(c.name + " " + c.en, words)),
    gear: [...gear.weapons, ...gear.armor].filter(x => nameHas(x.name + " " + x.en, words)),
    species: species.filter(s => nameHas(s.name, words)),
    conditions: rules.conditions.filter(c => has(c.name + " " + c.text)),
    rules: rules.chapters.flatMap(c => c.sections.map(s => ({ ...s, chapter: c.name }))).filter(s => has(s.name + " " + s.text))
  };
}

export function openManual(start) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
  let ed = start || saved.ed || "intro";
  if (!EDITIONS.some(e => e.id === ed)) ed = "intro";
  let query = "", searchRun = 0;
  const state = {};
  const byKind = {};

  const body = el(`<div class="man">
    <aside class="man-nav">
      <input type="search" class="man-search" placeholder="Buscar en todo el manual" aria-label="Buscar en el manual">
      <nav data-eds></nav>
    </aside>
    <article class="man-page" data-page></article>
  </div>`);
  const page = body.querySelector("[data-page]");

  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ ed })); } catch {} };
  const lookup = (kind, id) => (byKind[kind] || []).find(x => x.id === id);
  loadSrd("conjuros").then(list => { byKind.spell = list; }).catch(() => {});
  loadSrd("criaturas").then(list => { byKind.creature = list; }).catch(() => {});
  lazyBodies(page, lookup);

  function paintNav() {
    let group = null;
    body.querySelector("[data-eds]").innerHTML = EDITIONS.map(e => {
      const head = e.group !== group ? `<p class="man-group">${esc(e.group || "")}</p>` : "";
      group = e.group;
      return `${e.group ? head : ""}<button type="button" data-ed="${e.id}"
        aria-current="${!query && e.id === ed ? "page" : "false"}" title="${esc(e.name)}">${esc(e.short)}</button>`;
    }).join("");
  }

  async function paint() {
    paintNav();
    page.scrollTop = 0;
    if (query) return paintSearch();
    const e = EDITIONS.find(x => x.id === ed) || EDITIONS[0];
    if (e.page) {
      page.innerHTML = `<h3>${esc(e.name)}</h3><p class="prose">Cargando…</p>`;
      try { await PAGES[e.page](page, state); } catch {
        page.innerHTML = `<h3>${esc(e.name)}</h3><p class="prose">No se ha podido cargar. Comprueba la conexión con la partida y vuelve a abrir esta página.</p>`;
      }
      return;
    }
    page.innerHTML = `<h3>${esc(e.name)}</h3>` + SECTIONS.filter(s => s.ed === e.id)
      .map(s => `<section><h4>${esc(s.title)}</h4>${renderText(s.text)}</section>`).join("");
  }

  async function paintSearch() {
    const run = ++searchRun, q = query;
    const hits = searchManual(q);
    const textHits = hits.map(({ s }) => {
      const e = EDITIONS.find(x => x.id === s.ed);
      return `<section><p class="man-from">${esc(e.short)}</p><h4>${esc(s.title)}</h4>${renderText(s.text)}</section>`;
    }).join("");
    page.innerHTML = `<h3>Resultados para «${esc(q)}»</h3>${textHits}<p class="prose srd-wait">Buscando en el reglamento y los catálogos…</p>`;
    let srd = null;
    try { srd = await searchSrd(q); } catch {}
    if (run !== searchRun) return;
    const MAX = 25;
    const more = (n, page) => n > MAX ? `<p class="prose">Y ${n - MAX} más: <button type="button" class="linkish" data-ed="${page}">ver en su página</button>.</p>` : "";
    const parts = [];
    if (srd) {
      if (srd.conditions.length) parts.push(`<section><h4>Estados</h4>${srd.conditions.map(c => `<h5>${esc(c.name)}</h5>${renderText(c.text)}`).join("")}</section>`);
      if (srd.spells.length) parts.push(`<section><h4>Conjuros (${srd.spells.length})</h4>${srd.spells.slice(0, MAX).map(spellHead).join("")}${more(srd.spells.length, "conjuros")}</section>`);
      if (srd.creatures.length) parts.push(`<section><h4>Criaturas (${srd.creatures.length})</h4>${srd.creatures.slice(0, MAX).map(creatureHead).join("")}${more(srd.creatures.length, "criaturas")}</section>`);
      if (srd.gear.length) parts.push(`<section><h4>Armas y armaduras</h4><ul>${srd.gear.map(x => `<li><b>${esc(x.name)}</b>: ${esc(x.damage ? `${x.damage}; ${x.properties.join(", ") || "sin propiedades"}; maestría ${x.mastery}` : `CA ${x.ac}; ${x.kind}`)}; ${esc(x.cost)}</li>`).join("")}</ul></section>`);
      if (srd.species.length) parts.push(`<section><h4>Especies</h4><p>${srd.species.map(s => `<button type="button" class="linkish" data-ed="especies">${esc(s.name)}</button>`).join(" · ")}</p></section>`);
      if (srd.rules.length) parts.push(`<section><h4>Reglamento (${srd.rules.length})</h4>${srd.rules.slice(0, 12).map(s => `<p class="man-from">${esc(s.chapter)}</p><h5>${esc(s.name)}</h5>${renderText(s.text)}`).join("")}${srd.rules.length > 12 ? `<p class="prose">Hay más en el <button type="button" class="linkish" data-ed="reglamento">reglamento</button>.</p>` : ""}</section>`);
    }
    /* Primero lo que más se busca (conjuros, criaturas…), luego los textos */
    page.innerHTML = `<h3>Resultados para «${esc(q)}»</h3>${parts.join("")}${textHits}`
      + (!hits.length && !parts.length ? `<p class="prose">No aparece en ninguna parte. Prueba con otra palabra.</p>` : "");
    mark(page, q);
  }

  on(body, "click", "[data-ed]", (e, b) => {
    ed = b.dataset.ed; query = "";
    body.querySelector(".man-search").value = "";
    remember(); paint();
  });
  on(body, "click", "[data-jump]", (e, b) => {
    const target = page.querySelector("#" + CSS.escape(b.dataset.jump));
    if (target) page.scrollTop = target.offsetTop - page.offsetTop - 8;
  });
  let typing = 0;
  body.querySelector(".man-search").addEventListener("input", e => {
    clearTimeout(typing);
    typing = setTimeout(() => { query = e.target.value.trim(); paint(); }, 180);
  });

  const win = modal({ title: "Manual de D&D 5.5", body, wide: true, actions: [] });
  win.body.closest(".modal").classList.add("manual");
  paint();
  return win;
}

/* Resalta lo buscado en el texto ya pintado */
function mark(root, query) {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  for (const n of nodes) {
    const text = n.nodeValue, f = fold(text);
    let hit = -1, len = 0;
    for (const w of words) { const at = f.indexOf(w); if (at >= 0 && (hit < 0 || at < hit)) { hit = at; len = w.length; } }
    if (hit < 0) continue;
    const span = document.createElement("mark");
    span.textContent = text.slice(hit, hit + len);
    const after = n.splitText(hit);
    after.nodeValue = after.nodeValue.slice(len);
    n.parentNode.insertBefore(span, after);
  }
}
