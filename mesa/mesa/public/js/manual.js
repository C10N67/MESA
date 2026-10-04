/* Mesa · el manual del DM, en una ventana

   Un índice por ediciones a la izquierda, el texto a la derecha y un buscador
   que mira en todas las ediciones a la vez. Recuerda dónde lo dejaste. */

import { modal, esc, el, on } from "./util.js";
import { CONDITIONS } from "./schema.js";
import { EDITIONS, SECTIONS } from "./manual-data.js";

const KEY = "mesa.manual";
const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* El formato reducido de manual-data.js, a HTML. Todo pasa antes por esc(). */
export function renderText(text) {
  const out = [];
  const blocks = String(text).trim().split(/\n\s*\n/);
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l.startsWith("## ")) { out.push(`<h4>${inline(l.slice(3))}</h4>`); i++; continue; }
      if (l.startsWith("|")) {
        const rows = [];
        while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
        const [head, ...body] = rows;
        out.push(`<div class="man-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead>
          <tbody>${body.map(r => `<tr>${r.map((c, j) => j ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (l.startsWith("- ")) {
        const items = [];
        while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
        out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ul>`);
        continue;
      }
      const para = [];
      while (i < lines.length && !/^(- |\||## )/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("");
}

const conditionsHTML = () => `<dl class="man-conds">${CONDITIONS.map(c => `<dt>${esc(c.name)}</dt><dd>${esc(c.hint)}</dd>`).join("")}</dl>`;

/* Lo que se busca: título, texto y, en la sección de estados, los estados */
const haystack = s => fold(s.title + " " + s.text + (s.conditions ? CONDITIONS.map(c => c.name + " " + c.hint).join(" ") : ""));

export function searchManual(query) {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  return SECTIONS.map((s, i) => ({ s, i })).filter(({ s }) => {
    const h = haystack(s);
    return words.every(w => h.includes(w));
  });
}

export function openManual(start) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
  let ed = start || saved.ed || "intro";
  let query = "";

  const body = el(`<div class="man">
    <aside class="man-nav">
      <input type="search" class="man-search" placeholder="Buscar: THAC0, agarrar, descanso…" aria-label="Buscar en el manual">
      <nav data-eds></nav>
    </aside>
    <article class="man-page" data-page></article>
  </div>`);

  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ ed })); } catch {} };

  function paint() {
    body.querySelector("[data-eds]").innerHTML = EDITIONS.map(e => `<button type="button" data-ed="${e.id}"
      aria-current="${!query && e.id === ed ? "page" : "false"}" title="${esc(e.name)}">${esc(e.short)}</button>`).join("");
    const page = body.querySelector("[data-page]");
    if (query) {
      const hits = searchManual(query);
      page.innerHTML = `<h3>Resultados para «${esc(query)}»</h3>` + (hits.length ? hits.map(({ s }) => {
        const e = EDITIONS.find(x => x.id === s.ed);
        return `<section><p class="man-from">${esc(e.short)}</p><h4>${esc(s.title)}</h4>${renderText(s.text)}${s.conditions ? conditionsHTML() : ""}</section>`;
      }).join("") : `<p class="prose">No aparece en ninguna edición. Prueba con otra palabra.</p>`);
      mark(page, query);
    } else {
      const e = EDITIONS.find(x => x.id === ed) || EDITIONS[0];
      page.innerHTML = `<h3>${esc(e.name)}</h3>` + SECTIONS.filter(s => s.ed === e.id)
        .map(s => `<section><h4>${esc(s.title)}</h4>${renderText(s.text)}${s.conditions ? conditionsHTML() : ""}</section>`).join("");
    }
    page.scrollTop = 0;
  }

  on(body, "click", "[data-ed]", (e, b) => {
    ed = b.dataset.ed; query = "";
    body.querySelector(".man-search").value = "";
    remember(); paint();
  });
  body.querySelector(".man-search").addEventListener("input", e => { query = e.target.value.trim(); paint(); });

  const win = modal({ title: "Manual de D&D", body, wide: true, actions: [] });
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
