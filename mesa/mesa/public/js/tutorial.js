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
/* A la pestaña del mapa, con las herramientas a la vista */
const toTools = () => {
  clickIf('[data-tab="mapa"]')();
  const wrap = document.querySelector("#mapPane .map-wrap");
  if (wrap && wrap.classList.contains("tools-stowed")) { const b = wrap.querySelector('[data-map="unstowTools"]'); if (b) b.click(); }
};

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
  /* ---- Útiles: cada herramienta del mapa, con un ejemplo ---- */
  { section: "utiles", sel: "#mapPane .map-bar", before: toTools, title: "Útiles: las herramientas del mapa",
    text: "Vamos una por una, con un ejemplo de partida para cada una. Si las tenías guardadas en el marcapáginas, te las saco." },
  { sel: "#mapPick", before: toTools, title: "Mapa activo",
    text: "El mapa en el que está jugando la party. Ejemplo: cuando bajen de la taberna a las catacumbas, cambias aquí de «Taberna» a «Catacumbas» y la tele cambia con ellos." },
  { sel: '[data-tool="token"]', before: toTools, title: "Fichas",
    text: "Mueve y selecciona fichas. Al arrastrar una se pinta hasta dónde llega con su velocidad, rodeando muros, y un contador suma los pies. Ejemplo: arrastras al pícaro (30 pies) y ves que llega justo a la puerta. Un recuadro elige a varios; Mayús + clic añade o quita." },
  { sel: '[data-tool="measure"]', before: toTools, title: "Regla",
    text: "Mide entre dos casillas, en pies y en casillas. Ejemplo: ¿llega la bola de fuego a 150 pies? Arrastra del mago al ogro y te dice a cuántos pies y casillas está." },
  { sel: '[data-tool="wall"]', before: toTools, title: "Muro",
    text: "Junto al borde de una casilla pinta una pared recta (arrastra para hacer un tramo); empezando en el centro, un muro en diagonal. Corta la vista y el paso. Ejemplo: cierras el pasillo de la izquierda y nadie ve la sala del tesoro hasta que doblen la esquina." },
  { sel: '[data-tool="wallBrush"]', before: toTools, title: "Pincel",
    text: "Muros a mano alzada, curvos o torcidos, que también cortan la vista y el paso. Ejemplo: repasas el contorno de una cueva redonda; si acabas el trazo donde lo empezaste, se cierra solo." },
  { sel: '[data-tool="door"]', before: toTools, title: "Puerta",
    text: "Pulsa junto a un borde (o en el centro de una casilla, para una en diagonal). Cada pulsación la abre o la cierra: cerrada es pared, abierta deja ver y pasar. Ejemplo: la puerta de la cripta sigue cerrada hasta que el clérigo dice «la abro», y entonces la pulsas." },
  { sel: '[data-tool="erase"]', before: toTools, title: "Borrar",
    text: "Quita muros, diagonales y puertas. Ejemplo: el bárbaro derriba el tabique de madera; un clic sobre él y las dos salas quedan unidas." },
  { sel: '[data-tool="pin"]', before: toTools, title: "Nota",
    text: "Clava una nota en una casilla: secreta (solo tú) o para la party. Cuando un personaje la pisa, te salta el aviso. Ejemplo: «Trampa de foso, CD 13» en mitad del pasillo; al pisarla te lo recuerda y decides si enseñarla." },
  { sel: '[data-tool="portal"]', before: toTools, title: "Acceso",
    text: "Una escalera, una trampilla o un pasadizo, a otro mapa o a otro punto de este. Al pisarlo puede preguntar quién cruza. Ejemplo: la escalera del sótano lleva al mapa «Bodega»; la pisa el guerrero y elige quién baja con él." },
  { sel: '[data-tool="sound"]', before: toTools, title: "Sonido",
    text: "Fuentes de sonido que oye la tele: más fuerte cuanto más cerca y apagadas tras los muros. Hay sonidos de serie o los tuyos. Ejemplo: una hoguera en el campamento y, tras la puerta del jefe, tambores de guerra que suben al acercarse." },
  { sel: '[data-tool="draw"]', before: toTools, title: "Dibujar",
    text: "Dibujo a mano alzada en cinco colores, para la party o solo para ti. Ejemplo: una flecha roja por donde huyó el kobold, o tus apuntes de dónde está la emboscada, solo para ti." },
  { sel: "#terrain", before: toTools, title: "Niebla, oscuridad y luz",
    text: "Pinceles de casilla. Niebla: cerca se ve todo y lejos solo retazos (un pantano al amanecer). Oscuridad: solo las casillas de al lado (un conjuro de oscuridad, humo denso). Luz: alumbra aunque el mapa esté a oscuras (una hoguera, un brasero). La goma del final los quita." },
  { sel: '[data-layer="rough"]', before: toTools, title: "Terreno difícil",
    text: "Entrar en esas casillas cuesta el doble de movimiento, y el alcance de las fichas ya lo descuenta. Ejemplo: escombros tras el derrumbe; el guerrero, con 30 pies, solo avanza tres casillas por ellos." },
  { sel: '[data-layer="rooms"]', before: toTools, title: "Sala",
    text: "Pinta una sala: cuando alguien entra, la party la ve entera y la cámara la encuadra. Cada trozo suelto o separado por un muro es otra sala, y en Ajustes del mapa les pones nombre y color. Ejemplo: «Salón del trono», que se descubre de golpe al abrir las puertas." },
  { sel: '[data-layer="vis"][data-value="show"]', before: toTools, title: "Revelar",
    text: "La party ve esas casillas siempre, esté donde esté. Ejemplo: el patio de la fortaleza a pleno sol, que se ve desde todas las ventanas." },
  { sel: '[data-layer="vis"][data-value="hide"]', before: toTools, title: "Ocultar",
    text: "La party no ve esas casillas nunca, aunque las tenga delante, ni lo que haya dentro. La goma de al lado quita salas y zonas. Ejemplo: el pasadizo secreto tras la estantería, hasta que alguien lo encuentre." },
  { sel: "#shapes", before: toTools, title: "Plantillas de área",
    text: "Esfera, cono, línea y cubo, con su tamaño en pies. Va pegada al cursor; un clic la fija y arrastrar la gira. La ✕ las quita todas. Ejemplo: bola de fuego, esfera de 20 pies: ves al instante a quién pilla." },
  { sel: '[data-map="fit"]', before: toTools, title: "Encajar y zoom",
    text: "«Encajar» centra el mapa entero; − y + acercan o alejan (también Ctrl + rueda). Ejemplo: te acercas para colocar la emboscada casilla a casilla y luego encajas para verlo todo." },
  { sel: '[data-map="settings"]', before: toTools, title: "Ajustes del mapa",
    text: "Imagen de fondo, tamaño, cuadrícula, muros y puertas del plano (Mesa los detecta solos), nombre y color de las salas, mapa a oscuras y qué ve la party. Ejemplo: subes el plano de tu módulo, Mesa encaja la cuadrícula y te propone los muros." },
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

export function startTutorial(role, { section = "" } = {}) {
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
  show(Math.max(0, section ? steps.findIndex(x => x.section === section) : 0));
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
