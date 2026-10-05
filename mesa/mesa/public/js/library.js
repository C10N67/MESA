/* La librería del DM: una estantería abajo a la izquierda con los libros de
   consulta puestos de lomo (el manual, el bestiario y los PDF que añada el
   DM). Pulsar un lomo saca el libro y lo abre; mientras está abierto, en el
   estante queda su hueco, y pulsar el hueco lo devuelve (lo cierra). La
   estantería se guarda con el tirador de latón y queda una pestaña para
   volver a sacarla; se recuerda en este navegador. En el teléfono empieza
   guardada.

   Los PDF viven en este navegador (IndexedDB), no en la partida ni en el
   servidor: son material del DM, pueden pesar cientos de megas y no tienen
   por qué viajar a nadie. Se abren como un libro más, con el visor de PDF
   del propio navegador dentro. */

import { icon } from "./icons.js";
import { esc, el, toast, confirmBox } from "./util.js";
import { floatingBook } from "./manual.js";

const KEY = "mesa.library";
/* Colores de cuero para los lomos de los PDF */
export const LEATHERS = ["#1f3a5f", "#2f4a2a", "#5a3a1a", "#3a1f3f", "#5f1f2a", "#1f4a4a", "#6a4a14", "#2b2b30"];
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------- Los PDF guardados en el navegador ---------- */
const DB = "mesa-libreria", STORE = "pdfs";
let dbp = null;
const openDb = () => dbp || (dbp = new Promise((ok, ko) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
  r.onsuccess = () => ok(r.result);
  r.onerror = () => { dbp = null; ko(r.error); };
}));
async function run(mode, fn) {
  const db = await openDb();
  return new Promise((ok, ko) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => ok(req && req.result);
    t.onerror = t.onabort = () => ko(t.error);
  });
}
export const listPdfs = () => run("readonly", s => s.getAll()).then(list => (list || []).sort((a, b) => a.added - b.added));
const savePdf = rec => run("readwrite", s => s.put(rec));
const dropPdf = id => run("readwrite", s => s.delete(id));

const titleOf = name => name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Sin título";

/* books: [{ id, key (el del libro flotante), title, short, label, cls, top, bottom, toggle }] */
export function mountLibrary(host, books) {
  let pdfs = [];
  const opened = new Set();          // claves de los libros abiertos
  const reading = new Map();         // id del PDF → su libro flotante

  const node = document.createElement("aside");
  node.className = "library";
  node.setAttribute("aria-label", "Librería");
  node.innerHTML = `
    <div class="lib-case">
      <button type="button" class="lib-hide" title="Guardar la librería" aria-label="Guardar la librería">${icon("down", 14)}</button>
      <div class="lib-row"></div>
      <div class="lib-plank"><span class="lib-plate">Librería</span></div>
    </div>
    <button type="button" class="lib-tab" title="Sacar la librería" aria-label="Sacar la librería">${icon("book", 15)}<span>Librería</span></button>
    <input type="file" accept="application/pdf,.pdf" multiple hidden>`;
  host.appendChild(node);
  const row = node.querySelector(".lib-row"), picker = node.querySelector("input[type=file]");

  const pdfBook = p => {
    const h = hash(p.id), mb = (p.size || 0) / 1048576;
    return {
      id: "pdf:" + p.id, key: "mesa.pdf." + p.id, title: `${p.title} (PDF)`, short: `«${p.title}»`,
      cls: "book-pdf", pdf: p,
      style: `--leather:${p.color};width:${Math.round(Math.min(44, 28 + Math.log2(mb + 1) * 3))}px;height:${112 + h % 20}px`,
      label: `<span class="lib-clip">${esc(p.title)}</span>`, top: '<i class="lib-band2"></i>', bottom: '<small class="lib-pdf">PDF</small>'
    };
  };
  const all = () => [...books, ...pdfs.map(pdfBook)];
  const spine = b => {
    const out = opened.has(b.key);
    const title = out ? `Devolver ${b.short} a la estantería` : b.title;
    return `<button type="button" class="lib-book ${b.cls}${out ? " out" : ""}" data-book="${esc(b.id)}" aria-pressed="${out}"
      title="${esc(title)}" aria-label="${esc(title)}"${b.style ? ` style="${b.style}"` : ""}>
      <span class="lib-cap">${b.top}</span>
      <span class="lib-title">${b.label}</span>
      <span class="lib-cap">${b.bottom}</span>
    </button>`;
  };
  function paint() {
    row.innerHTML = `<span class="lib-deco lib-stack" aria-hidden="true"><i></i><i></i><i></i></span>
      ${all().map(spine).join("")}
      <button type="button" class="lib-add" title="Añadir un PDF a la librería" aria-label="Añadir un PDF a la librería">${icon("plus", 16)}</button>
      <span class="lib-deco lib-lean" aria-hidden="true"></span>
      <span class="lib-deco lib-candle" aria-hidden="true"><i></i></span>`;
    edge();
  }

  /* Hasta dónde llega la librería: el mapa aparta sus coordenadas a la derecha */
  function edge() {
    requestAnimationFrame(() => {
      const part = node.classList.contains("is-stowed") ? node.querySelector(".lib-tab") : node.querySelector(".lib-case");
      const right = part ? Math.round(part.getBoundingClientRect().right) : 0;
      document.documentElement.style.setProperty("--lib-right", right + "px");
    });
  }
  new ResizeObserver(edge).observe(node);
  addEventListener("resize", edge);

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const hide = on => {
    node.classList.toggle("is-stowed", on);
    document.body.classList.toggle("library-shown", !on);
    node.querySelector(".lib-case").inert = on;
    try { localStorage.setItem(KEY, on ? "hidden" : "shown"); } catch {}
    edge();
  };
  hide(saved ? saved === "hidden" : innerWidth <= 700);
  node.querySelector(".lib-hide").addEventListener("click", () => hide(true));
  node.querySelector(".lib-tab").addEventListener("click", () => hide(false));

  row.addEventListener("click", e => {
    if (e.target.closest(".lib-add")) return picker.click();
    const b = e.target.closest("[data-book]");
    const book = b && all().find(x => x.id === b.dataset.book);
    if (!book) return;
    if (book.pdf) openPdf(book.pdf); else book.toggle();
  });
  /* Con la rueda, la estantería se recorre de lado si no cabe */
  row.addEventListener("wheel", e => {
    if (row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    row.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });

  /* Los libros avisan al abrirse y al cerrarse: el lomo sale o vuelve */
  document.addEventListener("mesa:book", e => {
    if (e.detail.open) opened.add(e.detail.key); else opened.delete(e.detail.key);
    const book = all().find(x => x.key === e.detail.key);
    const spineEl = book && row.querySelector(`[data-book="${CSS.escape(book.id)}"]`);
    if (spineEl) spineEl.outerHTML = spine(book);
  });

  /* ---------- Añadir PDF: con el «+» del estante o soltándolos encima ---------- */
  async function add(files) {
    const list = [...files].filter(f => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (!list.length) return toast("Solo caben PDF en la librería", "bad");
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch {}
    let n = 0;
    for (const f of list) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const rec = { id, title: titleOf(f.name), color: LEATHERS[hash(f.name) % LEATHERS.length], size: f.size, added: Date.now(), blob: f };
      try { await savePdf(rec); pdfs.push(rec); n++; }
      catch (err) {
        toast(/quota/i.test(String(err && err.name)) ? `«${rec.title}» no cabe: el navegador no deja guardar más` : `No se ha podido guardar «${rec.title}»`, "bad");
      }
    }
    if (n) { paint(); toast(n === 1 ? "PDF añadido a la librería" : `${n} PDF añadidos a la librería`, "good"); }
  }
  picker.addEventListener("change", () => { if (picker.files.length) add(picker.files); picker.value = ""; });
  const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  node.addEventListener("dragover", e => { if (!hasFiles(e)) return; e.preventDefault(); node.classList.add("dropping"); });
  node.addEventListener("dragleave", e => { if (!node.contains(e.relatedTarget)) node.classList.remove("dropping"); });
  node.addEventListener("drop", e => {
    if (!hasFiles(e)) return;
    e.preventDefault(); node.classList.remove("dropping");
    add(e.dataTransfer.files);
  });

  /* ---------- Leer un PDF: un libro flotante con el visor del navegador ---------- */
  function openPdf(p) {
    if (reading.has(p.id)) { reading.get(p.id).close(); return; }
    const url = URL.createObjectURL(p.blob);
    const content = el(`<div class="pdf-read">
      <div class="pdf-tools">
        <input class="pdf-name" value="${esc(p.title)}" aria-label="Título del libro" title="Título del libro">
        <span class="pdf-colors" role="group" aria-label="Color del lomo">${LEATHERS.map(c =>
          `<button type="button" data-color="${c}" style="--c:${c}" aria-pressed="${c === p.color}" title="Color del lomo" aria-label="Color del lomo"></button>`).join("")}</span>
        <span class="spacer"></span>
        <a class="btn sm" href="${url}" target="_blank" rel="noopener">Abrir aparte</a>
        <button type="button" class="btn sm" data-pdf-drop>Quitar de la librería</button>
      </div>
      <iframe class="pdf-frame" src="${url}#navpanes=0&view=FitH" title="${esc(p.title)}"></iframe>
    </div>`);
    const book = floatingBook(content, {
      key: "mesa.pdf." + p.id, label: p.title, title: esc(p.title), closeLabel: "Cerrar el libro", cls: "pdf-book",
      cover: `<span>${esc(p.title)}</span>`,
      onClose: () => { reading.delete(p.id); setTimeout(() => URL.revokeObjectURL(url), 2000); }
    });
    book.el.style.setProperty("--leather", p.color);
    reading.set(p.id, book);

    const keep = async () => { try { await savePdf(p); } catch { toast("No se ha podido guardar el cambio", "bad"); } paint(); };
    content.querySelector(".pdf-name").addEventListener("change", e => {
      p.title = e.target.value.trim() || titleOf("");
      e.target.value = p.title;
      book.el.querySelector(".grim-title").textContent = p.title;
      book.el.setAttribute("aria-label", p.title);
      keep();
    });
    content.querySelector(".pdf-colors").addEventListener("click", e => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      p.color = b.dataset.color;
      content.querySelectorAll("[data-color]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      book.el.style.setProperty("--leather", p.color);
      keep();
    });
    content.querySelector("[data-pdf-drop]").addEventListener("click", async () => {
      if (!await confirmBox(`¿Quitar «${p.title}» de la librería? Se borra de este navegador; el archivo original no se toca.`)) return;
      try { await dropPdf(p.id); } catch { return toast("No se ha podido quitar", "bad"); }
      pdfs = pdfs.filter(x => x.id !== p.id);
      try { localStorage.removeItem("mesa.pdf." + p.id); } catch {}
      book.close();
      paint();
    });
  }

  paint();
  listPdfs().then(list => { pdfs = list; paint(); }).catch(() => {});
  return { hide, el: node };
}
