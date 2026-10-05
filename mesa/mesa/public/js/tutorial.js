/* El tutorial: una visita guiada por la aplicación que narra Chispa.

   Se oscurece la pantalla y se ilumina cada parte (las pestañas, los dados,
   la librería, las herramientas del mapa…) con una tarjeta que explica para
   qué sirve. Se avanza con «Siguiente» o las flechas, y se sale con
   «Salir» o Escape. Hay un recorrido para el DM y otro para los jugadores.

   El botón «Tutorial» empieza en la barra, brillando. Si se termina la
   visita, pasa al menú ···. Si en 7 minutos de uso nadie lo pulsa, se guarda
   solo en ese menú (los minutos se cuentan aunque se recargue la página).
   Todo se recuerda por aparato y por papel (DM o jugador). */

import { t } from "./i18n.js";
import { esc, toast } from "./util.js";

const WAIT_MS = 7 * 60 * 1000;
const key = role => "mesa.tutorial." + role;
const read = (role, k) => { try { return JSON.parse(localStorage.getItem(key(role)) || "{}")[k]; } catch { return undefined; } };
const write = (role, patch) => {
  try { localStorage.setItem(key(role), JSON.stringify({ ...JSON.parse(localStorage.getItem(key(role)) || "{}"), ...patch })); } catch {}
};
/* ¿El botón brillante ya se fue al menú? (visto o guardado por tiempo) */
export const tutorialInMenu = role => !!(read(role, "seen") || read(role, "stowed"));

/* ---------- Los recorridos ---------- */
const clickIf = sel => () => { const b = document.querySelector(sel); if (b && b.getAttribute("aria-selected") !== "true") b.click(); };

export const DM_STEPS = [
  { title: "¡Hola! Soy Chispa", text: "Te enseño Mesa en un par de minutos. Usa «Siguiente» o las flechas del teclado; puedes salir cuando quieras con Escape." },
  { sel: ".shell > .topbar .tabs", before: clickIf('[data-tab="mesa"]'), title: "La mesa y el mapa",
    text: "Dos pestañas: «La mesa», con las fichas de todos, y «Mapa», con el tablero que ve la party." },
  { sel: "#addBtn", title: "Personajes", text: "Crea fichas tú, o deja que cada jugador entre desde su móvil y se haga la suya." },
  { sel: "#moreBtn", title: "El menú ···", text: "Aquí está cómo entran tus jugadores (dirección y código), la pantalla de la tele, pedir tiradas, guardar o cargar la partida, el idioma y este tutorial." },
  { sel: "#presence", title: "Quién está", text: "Cuántos aparatos hay conectados. Púlsalo para ver quién lleva cada personaje." },
  { sel: "#tableView", title: "Las fichas", text: "Cada tarjeta lleva la vida, la CA y los estados. Con − y + aplicas daño y curas; ataques, conjuros y tiradas salen de cada tarjeta. Los enemigos de una misma sala del mapa van agrupados." },
  { sel: "#combatBtn", title: "Combate", text: "Tira la iniciativa de todos y lleva los turnos. La barra de espacio pasa al siguiente." },
  { sel: "#restBtn", title: "Descansos", text: "Descanso corto o largo: devuelve vida, espacios de conjuro y recursos a quien toque." },
  { sel: "#undoBtn", title: "Deshacer", text: "¿Te has equivocado? Deshace el último cambio (también con Ctrl+Z)." },
  { sel: ".dock", title: "Dados y charla", text: "Tira cualquier dado o fórmula, en secreto si quieres, y habla con la mesa. El panel se guarda en un marcapáginas con un d20." },
  { sel: ".library", title: "La librería", text: "Tus libros de consulta: el manual de la 5.5, el bestiario para invocar criaturas y los PDF que quieras añadir. Se guarda con el tirador de latón." },
  { sel: "#mapPane .map-bar", before: clickIf('[data-tab="mapa"]'), title: "Herramientas del mapa",
    text: "Fichas, regla, muros, puertas, pincel, notas, accesos y sonidos; abajo, niebla, oscuridad, luz, terreno difícil y salas que se revelan al entrar." },
  { sel: "#mapPane .map-stow", title: "Mapa despejado", text: "Guarda las herramientas en un marcapáginas y deja el mapa limpio mientras juegas." },
  { sel: "#board", title: "El tablero", text: "Pulsa una casilla para colocar fichas y arrástralas para moverlas. Rueda o + y − para acercar; botón derecho para mover la vista." },
  { sel: ".gnome", title: "Yo, de explorador", text: "Arrástrame al mapa y lo recorreré como uno más de la party: verás la niebla y las salas como las verán ellos. Lo que descubra no se queda." },
  { sel: ".shell > .topbar .voice", title: "Voz", text: "Habla con tus jugadores sin salir de Mesa, si jugáis a distancia." },
  { title: "¡Listo!", before: clickIf('[data-tab="mesa"]'), text: "Eso es lo básico. El tutorial se queda en el menú ··· para cuando lo necesites. ¡Buena partida!" }
];

export const PLAYER_STEPS = [
  { title: "¡Hola! Soy Chispa", text: "Te enseño Mesa en un minuto. Usa «Siguiente» o las flechas; puedes salir cuando quieras." },
  { sel: ".player-top .who", title: "Tú", text: "Tu nombre en la partida. El punto verde dice que estás conectado." },
  { sel: '[data-ptab="ficha"]', before: clickIf('[data-ptab="ficha"]'), title: "Tu ficha", text: "Tu vida, tus estados, tus ataques y conjuros. Pulsa una característica o una habilidad para tirarla." },
  { sel: '[data-ptab="party"]', title: "La party", text: "Cómo van tus compañeros y, en combate, el orden de los turnos." },
  { sel: '[data-ptab="mapa"]', title: "El mapa", text: "Lo que ve la party. Si el DM lo permite, mueves tu ficha y dibujas encima." },
  { sel: '[data-ptab="dados"]', title: "Dados y charla", text: "Tira dados, habla con la mesa o susurra a alguien. El número rojo avisa de mensajes nuevos." },
  { sel: ".player-top .voice", title: "Voz", text: "Habla con la mesa sin salir de Mesa, si jugáis a distancia." },
  { sel: "#plang", title: "Idioma", text: "Cambia el idioma solo en este aparato. En el móvil está dentro del menú ···." },
  { sel: "#pmoreBtn", title: "El menú ···", text: "Aquí se queda este tutorial para cuando lo necesites, y desde aquí sales de la partida." },
  { title: "¡Listo!", text: "Eso es todo. Cuando sea tu turno, Mesa te avisará. ¡Buena partida!" }
];

/* ---------- La visita ---------- */
let tour = null;

export function startTutorial(role) {
  if (tour) return;
  const steps = (role === "dm" ? DM_STEPS : PLAYER_STEPS);
  const back = document.createElement("div");
  back.className = "tut";
  back.innerHTML = `<div class="tut-hole"></div>
    <section class="tut-card" role="dialog" aria-modal="true" aria-live="polite">
      <header><img src="icons/chispa.svg" alt=""><div><small class="tut-count"></small><h3 class="tut-title"></h3></div>
        <button type="button" class="tut-x" data-tut="close" aria-label="${esc(t("Salir del tutorial"))}" title="${esc(t("Salir del tutorial"))}">×</button></header>
      <p class="tut-text"></p>
      <footer><button type="button" class="btn sm" data-tut="prev">Anterior</button><span class="spacer"></span>
        <button type="button" class="btn sm primary" data-tut="next">Siguiente</button></footer>
    </section>`;
  document.body.appendChild(back);
  const hole = back.querySelector(".tut-hole"), card = back.querySelector(".tut-card");
  let i = 0;

  const target = s => {
    if (!s.sel) return null;
    const node = document.querySelector(s.sel);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight ? r : null;
  };
  function place() {
    const s = steps[i], r = target(s), pad = 6, gap = 14, m = 12;
    back.classList.toggle("free", !r);
    if (r) {
      const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad);
      Object.assign(hole.style, { left: x + "px", top: y + "px",
        width: Math.min(innerWidth - 8, r.right + pad) - x + "px", height: Math.min(innerHeight - 8, r.bottom + pad) - y + "px" });
    }
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let left, top;
    if (!r) { left = (innerWidth - cw) / 2; top = (innerHeight - ch) / 2; }
    else {
      const below = r.bottom + pad + gap, above = r.top - pad - gap - ch;
      top = below + ch <= innerHeight - m ? below : above >= m ? above : Math.max(m, Math.min(innerHeight - ch - m, r.top));
      /* Si no cabe ni arriba ni abajo (un panel muy alto), al lado */
      left = r.left + r.width / 2 - cw / 2;
      if (top === Math.max(m, Math.min(innerHeight - ch - m, r.top)) && below + ch > innerHeight - m && above < m) {
        left = r.right + pad + gap + cw <= innerWidth - m ? r.right + pad + gap : r.left - pad - gap - cw;
      }
    }
    card.style.left = Math.max(m, Math.min(innerWidth - cw - m, left)) + "px";
    card.style.top = Math.max(m, Math.min(innerHeight - ch - m, top)) + "px";
  }
  function show(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    const s = steps[i];
    if (s.before) { try { s.before(); } catch {} }
    card.querySelector(".tut-count").textContent = `${i + 1} / ${steps.length}`;
    card.querySelector(".tut-title").textContent = t(s.title);
    card.querySelector(".tut-text").textContent = t(s.text);
    card.querySelector('[data-tut="prev"]').disabled = i === 0;
    card.querySelector('[data-tut="next"]').textContent = t(i === steps.length - 1 ? "Terminar" : "Siguiente");
    card.classList.remove("tut-in"); void card.offsetWidth; card.classList.add("tut-in");
    /* El paso puede cambiar de pestaña: se coloca cuando ya está pintada */
    requestAnimationFrame(() => requestAnimationFrame(place));
  }
  function close(done) {
    removeEventListener("resize", place);
    removeEventListener("keydown", onKey, true);
    back.classList.add("out");
    setTimeout(() => back.remove(), 220);
    tour = null;
    write(role, { seen: true });
    document.dispatchEvent(new CustomEvent("mesa:tutorial", { detail: { role, done } }));
  }
  const onKey = e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); i === steps.length - 1 ? close(true) : show(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); show(i - 1); }
  };
  back.addEventListener("click", e => {
    const b = e.target.closest("[data-tut]");
    if (!b) return;
    if (b.dataset.tut === "close") return close(false);
    if (b.dataset.tut === "prev") return show(i - 1);
    if (i === steps.length - 1) return close(true);
    show(i + 1);
  });
  addEventListener("resize", place);
  addEventListener("keydown", onKey, true);
  tour = { close };
  show(0);
  card.querySelector('[data-tut="next"]').focus({ preventScroll: true });
}

/* ---------- El botón brillante ---------- */
export function tutorialButton(host, role, { before = null, menuButton = null } = {}) {
  if (!host || tutorialInMenu(role)) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tut-btn";
  btn.innerHTML = `<span>${esc(t("Tutorial"))}</span>`;
  btn.title = t("Un paseo rápido por Mesa");
  host.insertBefore(btn, before || null);

  let shown = Number(read(role, "shownMs")) || 0, last = Date.now();
  const tick = setInterval(() => {
    const now = Date.now();
    if (!document.hidden) shown += now - last;
    last = now;
    write(role, { shownMs: shown });
    if (shown >= WAIT_MS) stow();
  }, 5000);

  function remove() { clearInterval(tick); btn.remove(); }
  /* Se va volando al menú ··· */
  function stow() {
    clearInterval(tick);
    write(role, { stowed: true });
    const to = typeof menuButton === "function" ? menuButton() : menuButton;
    const a = btn.getBoundingClientRect(), b = to ? to.getBoundingClientRect() : null;
    if (b && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      btn.style.transition = "transform .6s cubic-bezier(.5,0,.3,1), opacity .6s";
      btn.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.2)`;
      btn.style.opacity = "0";
      setTimeout(() => btn.remove(), 650);
    } else btn.remove();
    toast(t("El tutorial queda en el menú ···"));
  }
  btn.addEventListener("click", () => { remove(); startTutorial(role); });
  return { remove, stow };
}
