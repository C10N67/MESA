/* La librería del DM: una estantería abajo a la izquierda con los libros de
   consulta puestos de lomo (el manual y el bestiario). Pulsar un lomo saca el
   libro y lo abre; mientras está abierto, en el estante queda su hueco, y
   pulsar el hueco lo devuelve (lo cierra). La estantería se guarda con el
   tirador de latón y queda una pestaña para volver a sacarla; se recuerda en
   este navegador. En el teléfono empieza guardada. */

import { icon } from "./icons.js";
import { esc } from "./util.js";

const KEY = "mesa.library";

/* books: [{ id, key (el del libro flotante), title, short, label, cls, top, bottom, toggle }] */
export function mountLibrary(host, books) {
  const spine = b => `<button type="button" class="lib-book ${b.cls}" data-book="${b.id}" aria-pressed="false"
      title="${esc(b.title)}" aria-label="${esc(b.title)}">
      <span class="lib-cap">${b.top}</span>
      <span class="lib-title">${b.label}</span>
      <span class="lib-cap">${b.bottom}</span>
    </button>`;
  const node = document.createElement("aside");
  node.className = "library";
  node.setAttribute("aria-label", "Librería");
  node.innerHTML = `
    <div class="lib-case">
      <button type="button" class="lib-hide" title="Guardar la librería" aria-label="Guardar la librería">${icon("down", 14)}</button>
      <div class="lib-row">
        <span class="lib-deco lib-stack" aria-hidden="true"><i></i><i></i><i></i></span>
        ${books.map(spine).join("")}
        <span class="lib-deco lib-lean" aria-hidden="true"></span>
        <span class="lib-deco lib-candle" aria-hidden="true"><i></i></span>
      </div>
      <div class="lib-plank"><span class="lib-plate">Librería</span></div>
    </div>
    <button type="button" class="lib-tab" title="Sacar la librería" aria-label="Sacar la librería">${icon("book", 15)}<span>Librería</span></button>`;
  host.appendChild(node);

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const hide = on => {
    node.classList.toggle("is-stowed", on);
    document.body.classList.toggle("library-shown", !on);
    node.querySelector(".lib-case").inert = on;
    try { localStorage.setItem(KEY, on ? "hidden" : "shown"); } catch {}
  };
  hide(saved ? saved === "hidden" : innerWidth <= 700);
  node.querySelector(".lib-hide").addEventListener("click", () => hide(true));
  node.querySelector(".lib-tab").addEventListener("click", () => hide(false));

  node.addEventListener("click", e => {
    const b = e.target.closest("[data-book]");
    const book = b && books.find(x => x.id === b.dataset.book);
    if (book) book.toggle();
  });
  /* Los libros avisan al abrirse y al cerrarse: el lomo sale o vuelve */
  document.addEventListener("mesa:book", e => {
    const book = books.find(x => x.key === e.detail.key);
    const el = book && node.querySelector(`[data-book="${book.id}"]`);
    if (!el) return;
    el.classList.toggle("out", e.detail.open);
    el.setAttribute("aria-pressed", String(e.detail.open));
    el.title = e.detail.open ? `Devolver ${book.short} a la estantería` : book.title;
  });
  return { hide, el: node };
}
