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
import { playDemo, demoEnd, demoActive } from "./tutorial-demo.js";

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
/* La ventana de Ajustes del mapa: el tutorial la abre para recorrerla y la
   cierra sin guardar al pasar de largo o al salir */
const settingsOpen = () => document.querySelector('.modal [name="radius"]');
let openedSettings = false;
const openSettings = () => {
  if (settingsOpen()) return;
  toTools();
  const b = document.querySelector('[data-map="settings"]');
  if (b) { b.click(); openedSettings = true; }
};
const closeSettings = () => {
  const box = settingsOpen();
  if (box && openedSettings) { const x = box.closest(".modal").querySelector("[data-close]"); if (x) x.click(); }
  openedSettings = false;
};

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
  { section: "utiles", demo: "intro", sel: "#mapPane .map-bar", before: toTools, title: "Útiles: las herramientas del mapa",
    text: "Vamos una por una, y te las enseño en el tablero: bajo a mi taller, un mapa de prácticas que la tele no ve y que recojo al acabar. Tus mapas no se tocan." },
  { demo: "map", sel: "#mapPick", before: toTools, title: "Mapa activo",
    text: "El mapa en el que está jugando la party. Mira: ahora pone «Taller de Chispa», el mío. Ejemplo: cuando bajen de la taberna a las catacumbas, lo cambias aquí y la tele cambia con ellos." },
  { demo: "token", sel: '[data-tool="token"]', before: toTools, title: "Fichas",
    text: "Mueve y selecciona fichas. Mírame: camino tres casillas. Al arrastrar una ficha se pinta hasta dónde llega con su velocidad, rodeando muros, y un contador suma los pies. Un recuadro elige a varios; Mayús + clic añade o quita." },
  { demo: "measure", sel: '[data-tool="measure"]', before: toTools, title: "Regla",
    text: "Mide entre dos casillas, en pies y en casillas: arrastra de una a otra. Te marco las dos puntas, de mí a la trampa que pondré luego. Ejemplo: ¿llega la bola de fuego del mago hasta el ogro?" },
  { demo: "wall", sel: '[data-tool="wall"]', before: toTools, title: "Muro",
    text: "Junto al borde de una casilla pinta una pared recta (arrastra para hacer un tramo); empezando en el centro, un muro en diagonal. Corta la vista y el paso. Mira: levanto una sala de piedra." },
  { demo: "brush", sel: '[data-tool="wallBrush"]', before: toTools, title: "Pincel",
    text: "Muros a mano alzada, curvos o torcidos, que también cortan la vista y el paso. Mira: repaso una cueva redonda; como acabo donde empecé, se cierra sola." },
  { demo: "door", sel: '[data-tool="door"]', before: toTools, title: "Puerta",
    text: "Pulsa junto a un borde (o en el centro de una casilla, para una en diagonal). Cada pulsación la abre o la cierra: cerrada es pared, abierta deja ver y pasar. Mira: pongo una puerta en la sala, la abro y entro." },
  { demo: "erase", sel: '[data-tool="erase"]', before: toTools, title: "Borrar",
    text: "Quita muros, diagonales y puertas. Mira: tiro dos tramos del muro de arriba, como si el bárbaro derribara el tabique." },
  { demo: "pin", sel: '[data-tool="pin"]', before: toTools, title: "Nota",
    text: "Clava una nota en una casilla: secreta (solo tú) o para la party. Cuando un personaje la pisa, te salta el aviso. Mira: pongo «Trampa de foso, CD 13» y la piso… ¡ahí tienes el aviso!" },
  { demo: "portal", sel: '[data-tool="portal"]', before: toTools, title: "Acceso",
    text: "Una escalera, una trampilla o un pasadizo, a otro mapa o a otro punto de este; al pisarlo puede preguntar quién cruza. Mira: pongo una trampilla en la sala, la piso y aparezco abajo a la izquierda." },
  { demo: "sound", sel: '[data-tool="sound"]', before: toTools, title: "Sonido",
    text: "Fuentes de sonido que oye la tele: más fuerte cuanto más cerca y apagadas tras los muros. Hay sonidos de serie o los tuyos. Mira: enciendo una hoguera a mi lado." },
  { demo: "draw", sel: '[data-tool="draw"]', before: toTools, title: "Dibujar",
    text: "Dibujo a mano alzada en cinco colores, para la party o solo para ti. Mira: una flecha roja, como para marcar por dónde huyó el kobold." },
  { demo: "terrain", sel: "#terrain", before: toTools, title: "Niebla, oscuridad y luz",
    text: "Pinceles de casilla. Mira: niebla (cerca se ve todo y lejos solo retazos), oscuridad (solo las casillas de al lado) y, dentro, una luz que alumbra aunque todo esté a oscuras, como un brasero. La goma del final los quita." },
  { demo: "rough", sel: '[data-layer="rough"]', before: toTools, title: "Terreno difícil",
    text: "Entrar en esas casillas cuesta el doble de movimiento, y el alcance de las fichas ya lo descuenta. Mira: pinto escombros y los cruzo despacio." },
  { demo: "room", sel: '[data-layer="rooms"]', before: toTools, title: "Sala",
    text: "Pinta una sala: cuando alguien entra, la party la ve entera y la cámara la encuadra. Cada trozo suelto o separado por un muro es otra sala, con su nombre y color. Mira: pinto el «Salón del trono» y entro por la puerta." },
  { demo: "reveal", sel: '[data-layer="vis"][data-value="show"]', before: toTools, title: "Revelar",
    text: "La party ve esas casillas siempre, esté donde esté. Mira: marco un patio a pleno sol, arriba a la derecha." },
  { demo: "hide", sel: '[data-layer="vis"][data-value="hide"]', before: toTools, title: "Ocultar",
    text: "La party no ve esas casillas nunca, aunque las tenga delante, ni lo que haya dentro. La goma de al lado quita salas y zonas. Mira: escondo un pasadizo secreto debajo del patio." },
  { demo: "shapes", sel: "#shapes", before: toTools, title: "Plantillas de área",
    text: "Esfera, cono, línea y cubo, con su tamaño en pies. Va pegada al cursor; un clic la fija y arrastrar la gira. La ✕ las quita todas. Mira: una esfera de 15 pies, para ver al instante a quién pilla." },
  { demo: "fit", sel: '[data-map="fit"]', before: toTools, title: "Encajar y zoom",
    text: "«Encajar» centra el mapa entero; − y + acercan o alejan (también Ctrl + rueda). Mira: me acerco… y vuelvo a verlo todo." },
  { sel: '[data-map="settings"]', before: () => { closeSettings(); toTools(); }, title: "Ajustes del mapa",
    text: "Imagen de fondo, tamaño, cuadrícula, muros y puertas del plano (Mesa los detecta solos), nombre y color de las salas, mapa a oscuras y qué ve la party. Ahora te la abro y la vemos por dentro." },
  /* ---- Ajustes del mapa, por dentro ---- */
  { section: "ajustes", sel: '.modal [name="name"]', up: ".cols2", before: openSettings, title: "Nombre, visión y tamaño",
    text: "El nombre del mapa, cuántas casillas ve cada personaje a su alrededor y el tamaño en columnas y filas. Ejemplo: «Cripta de Ulthar», visión 6 casillas (30 pies) y un plano de 30 × 20." },
  { sel: "#imgBtn", up: ".row", before: openSettings, title: "El plano",
    text: "«Imagen de fondo» sube tu plano; «Encajar cuadrícula» ajusta la del tablero a la que trae dibujada; «Muros y puertas del plano» los detecta solos (con varita mágica para planos con mucho detalle). Ejemplo: subes la página del módulo y en un minuto tienes muros y puertas." },
  { sel: ".modal .room-list", optional: true, before: openSettings, title: "Salas",
    text: "Cada sala pintada con nombre y color, a tu gusto. Solo los ves tú, en el mapa y en los grupos de enemigos. Ejemplo: la sala 2 pasa a ser «Armería», en rojo." },
  { sel: '.modal [name="show"]', up: "label", before: openSettings, title: "Enseñar este mapa",
    text: "Si la tele muestra este mapa. Ejemplo: lo desmarcas mientras preparas el siguiente en secreto, y lo marcas cuando bajan." },
  { sel: '.modal [name="reveal"]', up: "label", before: openSettings, title: "Revelar el mapa entero",
    text: "Sin niebla: la party lo ve todo. Ejemplo: el mapa del pueblo, que ya conocen de sobra." },
  { sel: '.modal [name="remember"]', up: "label", before: openSettings, title: "Recordar lo explorado",
    text: "Lo que han visto se queda dibujado, con un velo. Ejemplo: activado en una mazmorra; desactivado en un laberinto mágico que cambia a sus espaldas." },
  { sel: '.modal [name="roomCam"]', up: "label", before: openSettings, title: "Encuadrar la sala",
    text: "Al entrar en una sala pintada, la cámara de la tele la encuadra entera. Ejemplo: entran en el salón del trono y la tele lo muestra completo de golpe." },
  { sel: '.modal [name="grid"]', up: "label", before: openSettings, title: "Dibujar la cuadrícula",
    text: "Las líneas de las casillas sobre el plano. Ejemplo: quítalas si tu plano ya trae su cuadrícula dibujada." },
  { sel: '.modal [name="move"]', up: "label", before: openSettings, title: "Que muevan su ficha",
    text: "Cada jugador mueve la suya desde el móvil. Ejemplo: actívalo si jugáis a distancia; desactívalo si prefieres moverlas tú en la mesa." },
  { sel: '.modal [name="draw"]', up: "label", before: openSettings, title: "Que dibujen en el mapa",
    text: "Los jugadores pueden dibujar encima. Ejemplo: que tracen el plan de ataque antes de entrar en el fuerte." },
  { sel: '.modal [name="walls"]', up: "label", before: openSettings, title: "Enseñar muros y puertas",
    text: "Si la party ve el dibujo de muros y puertas. Siguen cortando la vista igual. Ejemplo: desmárcalo con un plano de cueva muy bonito para que no tape la roca." },
  { sel: '.modal [name="dark"]', up: "label", before: openSettings, title: "Mapa a oscuras",
    text: "Solo se ve con visión en la oscuridad o con luz (antorchas, la herramienta Luz). Ejemplo: las minas abandonadas; el enano ve, el humano necesita antorcha." },
  { sel: '.modal [name="playerZoom"]', up: "label", before: openSettings, title: "Zoom de los jugadores",
    text: "Si pueden acercarse y alejarse en su móvil. Ejemplo: actívalo en mapas grandes para que encuentren su ficha." },
  { sel: '.modal [name="range"]', up: "label", before: openSettings, title: "Pintar el alcance",
    text: "Al arrastrar una ficha se pinta hasta dónde llega. Ejemplo: muy útil en combate; quítalo si prefieres contar casillas." },
  { sel: '.modal [name="foehp"]', up: "label", before: openSettings, title: "Vida de los enemigos",
    text: "Si la party ve cuánta vida les queda a los enemigos. Ejemplo: actívalo para partidas con niños o para que se note cuándo un jefe está a punto de caer." },
  { sel: '.modal [name="camera"]', up: ".field", before: openSettings, title: "Cámara de la tele",
    text: "«Todo el mapa» o «Centrada en el personaje», con cuántas casillas a lo ancho al seguir. Ejemplo: una mazmorra enorme se ve mejor siguiendo a la party con 14 casillas de ancho." },
  { sel: '.modal [name="feet"]', up: ".cols2", before: openSettings, title: "Pies y diagonales",
    text: "Cuántos pies vale una casilla y cómo cuentan las diagonales: 5 pies cada una o la variante 5-10-5. Ejemplo: un mapa de viaje con casillas de 100 pies." },
  { sel: '.modal [name="wallFade"]', up: ".field", before: openSettings, title: "Vista tras los muros",
    text: "A la izquierda la vista se corta en seco en el muro; a la derecha se difumina y asoma un poco lo de detrás. Ejemplo: en seco para una mazmorra de terror, difuminado para un bosque." },
  { sel: '.modal [name="soundVolume"]', up: "fieldset", before: openSettings, title: "Sonido",
    text: "El volumen general, silenciarlo todo, que suene también en los móviles y la lista de sonidos del mapa para encenderlos y apagarlos. Ejemplo: apagas la lluvia cuando escampa sin quitar la fuente." },
  { sel: "#resetFog", up: ".row", before: openSettings, title: "Limpiezas rápidas",
    text: "Funcionan al momento: «Restablecer niebla» olvida lo explorado, «Vaciar muros» los quita todos, «Quitar niebla y oscuridad» borra ese terreno pintado y «Cerrar contorno» pone muro por todo el borde. Ejemplo: restableces la niebla para volver a explorar el mapa con otro grupo." },
  { sel: "#newMap", up: ".row", before: openSettings, title: "Mapas",
    text: "Crea un mapa nuevo o borra este (te lo pregunta antes). Ejemplo: un mapa por piso de la torre del mago." },
  { sel: ".modal footer", before: openSettings, title: "Guardar o cerrar",
    text: "«Guardar» aplica lo que hayas cambiado arriba; «Cerrar» lo deja como estaba. Ahora la cierro yo sin tocar nada." },
  { sel: "#mapPane .map-stow", before: () => { closeSettings(); demoEnd(); toTools(); }, title: "Mapa despejado", text: "Guarda las herramientas en un marcapáginas y deja el mapa limpio mientras juegas." },
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
  back.innerHTML = `<div class="tut-hole"></div><div class="tut-ring"></div>
    <section class="tut-card" role="dialog" aria-modal="true" aria-live="polite">
      <header><img src="icons/chispa.svg" alt=""><div><small class="tut-count"></small><h3 class="tut-title"></h3></div>
        <button type="button" class="tut-x" data-tut="close" aria-label="${esc(t("Salir del tutorial"))}" title="${esc(t("Salir del tutorial"))}">×</button></header>
      <p class="tut-text"></p>
      <footer><button type="button" class="btn sm" data-tut="prev">Anterior</button><span class="spacer"></span>
        <button type="button" class="btn sm primary" data-tut="next">Siguiente</button></footer>
    </section>`;
  document.body.appendChild(back);
  const hole = back.querySelector(".tut-hole"), ring = back.querySelector(".tut-ring"), card = back.querySelector(".tut-card");
  const toolsAt = steps.findIndex(x => x.section === "utiles");
  let i = 0;

  const target = s => {
    if (!s.sel) return null;
    let node = document.querySelector(s.sel);
    if (node && s.up) node = node.closest(s.up) || node;
    if (!node) return null;
    if (node.closest(".modal-body")) node.scrollIntoView({ block: "nearest" });
    const r = node.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight ? r : null;
  };
  function place() {
    const s = steps[i], pad = 6, gap = 14, m = 12;
    /* En el taller se ilumina el tablero entero (ahí pasa lo que se
       explica), la herramienta lleva un aro y la tarjeta va a una esquina */
    const board = s.demo && document.querySelector("#board");
    const tool = board ? target(s) : null;
    ring.hidden = !tool;
    if (tool) Object.assign(ring.style, { left: tool.left - 4 + "px", top: tool.top - 4 + "px", width: tool.width + 8 + "px", height: tool.height + 8 + "px" });
    if (board) {
      const b = board.getBoundingClientRect();
      back.classList.remove("free");
      Object.assign(hole.style, { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px" });
      const cw = card.offsetWidth, ch = card.offsetHeight;
      card.style.left = Math.max(m, Math.min(innerWidth - cw - m, b.right - cw - 18)) + "px";
      card.style.top = Math.max(m, Math.min(innerHeight - ch - m, b.bottom - ch - 18)) + "px";
      return;
    }
    const r = target(s);
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
    const dir = n < i ? -1 : 1;
    i = Math.max(0, Math.min(steps.length - 1, n));
    let s = steps[i];
    if (s.before) { try { s.before(); } catch {} }
    /* Un paso opcional sin nada que enseñar (un mapa sin salas) se salta */
    while (s.optional && !document.querySelector(s.sel) && i + dir >= 0 && i + dir < steps.length) {
      i += dir; s = steps[i];
      if (s.before) { try { s.before(); } catch {} }
    }
    /* El taller de Chispa: cada paso de «Útiles» lo enseña en el tablero; si
       se vuelve atrás, antes de la sección, se recoge */
    if (s.demo) playDemo(s.demo);
    else if (demoActive() && toolsAt >= 0 && i < toolsAt) demoEnd();
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
    closeSettings();
    demoEnd();
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
