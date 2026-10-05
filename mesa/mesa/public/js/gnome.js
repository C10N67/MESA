/* Chispa, el gnomo ingeniero de la vista del DM.

   Está justo a la izquierda del título, asomado por detrás de su mesa de
   trabajo, con las gafas de taller en la frente, una llave en la mano y un engranaje a la
   espalda. Dibujo de trazo dorado, como los iconos de Mesa. Sigue con la
   mirada lo que hace el DM (el puntero, los clics, lo que escribe) y, si pasa
   un rato sin que ocurra nada, se hunde tras la mesa y se queda dormido. De
   vez en cuando también da una cabezada aunque haya jaleo, y se despierta de
   golpe. Pulsarlo le hace hablar.

   Es pura decoración: no toca la partida ni el servidor, y se puede quitar
   desde el menú ···. Los estilos van aquí dentro, igual que los del panel de
   dados, para que funcione aunque el navegador guarde una hoja de estilos
   vieja. */

import { t } from "./i18n.js";

const OFF_KEY = "mesa.gnome";
const IDLE_MS = 45000;         // sin actividad: empieza a cabecear
const DOZE_MS = 5000;          // lo que tarda en dormirse del todo
const NOD_MIN = 70000, NOD_MAX = 160000;   // cabezadas sueltas, aunque haya jaleo

export const QUIPS = [
  "Ese muro no aguanta ni un estornudo.",
  "Yo ahí pondría una trampa. O dos.",
  "Mi abuelo hacía túneles más rectos.",
  "¿Seguro que esa puerta abre hacia ese lado?",
  "Si necesitas un puente, me avisas.",
  "Más niebla, que no se vean las chapuzas.",
  "Cuidado con esa palanca.",
  "Eso no es una mazmorra, es un sótano con ínfulas."
];
export const WAKE_QUIPS = [
  "¡No estaba dormido! Estaba calculando.",
  "¡Estoy despierto, estoy despierto!",
  "Solo descansaba los ojos."
];

export const gnomeEnabled = () => {
  try { return localStorage.getItem(OFF_KEY) !== "off"; } catch { return true; }
};
export function setGnomeEnabled(on) {
  try { on ? localStorage.removeItem(OFF_KEY) : localStorage.setItem(OFF_KEY, "off"); } catch {}
  document.querySelectorAll(".gnome-slot").forEach(s => { s.hidden = !on; });
}

const GOLD = "#e8a93a";
const CSS = `
.gnome-slot { position: absolute; left: 0; top: 0; bottom: 0; width: 0; pointer-events: none; }
.gnome-slot[hidden] { display: none; }
/* Justo a la izquierda del título: el título se aparta lo justo si el margen no le basta */
@media (min-width: 701px) { .gnome-slot:not([hidden]) ~ .brand { margin-left: max(0px, calc(64px - max(14px, 2.2vw))); } }
.gnome { position: absolute; left: 4px; top: calc(50% - 23px); width: 54px; height: 45px;
  pointer-events: auto; cursor: pointer; border: 0; padding: 0; background: none; color: inherit;
  -webkit-tap-highlight-color: transparent; }
.gnome:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; border-radius: 8px; }
.gnome svg { display: block; width: 54px; height: 45px; overflow: visible; }
.gnome .gn-gear { transform-box: view-box; transform-origin: 60px 39px; animation: gnSpin 24s linear infinite; }
.gnome .gn-head { transform-box: view-box; transform-origin: 57.5px 75px;
  transform: rotate(var(--hr, 0deg)); transition: transform .35s ease; }
.gnome .gn-pupil { transform: translate(var(--px, 0px), var(--py, .5px)); transition: transform .12s linear; }
.gnome .gn-eye { transform-box: fill-box; transform-origin: center; transition: transform .1s ease; }
.gnome .gn-mouth { transform-box: fill-box; transform-origin: center; transition: transform .25s ease; }
.gnome .gn-wrench { transform-box: view-box; transform-origin: 94px 70px; animation: gnTap 5s ease-in-out infinite; }
.gnome .gn-sleepeye, .gnome .gn-zzz, .gnome .gn-bang { opacity: 0; transition: opacity .3s; }
.gnome .gn-zzz text { font: 800 15px/1 system-ui, sans-serif; fill: ${GOLD}; }
.gnome .gn-bang { font: 900 20px/1 system-ui, sans-serif; fill: ${GOLD}; }

.gnome:hover .gn-head { transform: rotate(var(--hr, 0deg)) translate(0, -2px); }
.gnome.blink .gn-eye { transform: scaleY(.12); }
.gnome.peek .gn-head { transform: rotate(var(--hr, 0deg)) translate(0, -3px); }

.gnome.dozy .gn-eye { transform: scaleY(.45); transition: transform 1.4s ease; }
.gnome.dozy .gn-head { transform: translate(0, 3px) rotate(4deg); transition: transform 2.4s ease-in; }
.gnome.dozy .gn-gear { animation-duration: 60s; }

.gnome.asleep .gn-eye { opacity: 0; }
.gnome.asleep .gn-sleepeye { opacity: 1; }
.gnome.asleep .gn-head { transform: translate(0, 9px) rotate(6deg); transition: transform .9s ease-in; }
.gnome.asleep .gn-mouth { animation: gnSnore 4.2s ease-in-out infinite; }
.gnome.asleep .gn-gear, .gnome.asleep .gn-wrench { animation-play-state: paused; }
.gnome.asleep:not(.nodding) .gn-zzz { opacity: 1; }
.gnome.asleep:not(.nodding) .gn-zzz text { animation: gnZ 3.3s ease-out infinite both; }
.gnome.asleep .gn-zzz text:nth-child(2) { animation-delay: 1.1s; }
.gnome.asleep .gn-zzz text:nth-child(3) { animation-delay: 2.2s; }

.gnome.startle .gn-head { transform: translate(0, -6px); transition: transform .14s cubic-bezier(.2, 1.6, .4, 1); }
.gnome.startle .gn-mouth { transform: scale(1.35); }
.gnome.startle .gn-bang { opacity: 1; transition: none; }

@keyframes gnSpin { to { transform: rotate(360deg); } }
@keyframes gnTap { 0%, 70%, 100% { transform: rotate(0); } 76% { transform: rotate(-14deg); } 82% { transform: rotate(4deg); } 88% { transform: rotate(-10deg); } 94% { transform: rotate(0); } }
@keyframes gnSnore { 0%, 100% { transform: scale(.55); } 45% { transform: scale(1.05); } }
@keyframes gnZ { 0% { opacity: 0; transform: translate(0, 6px) scale(.6); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(14px, -22px) scale(1.2); } }

.gn-say { position: absolute; left: 62px; top: calc(100% + 8px); z-index: 40; width: max-content; max-width: 260px;
  padding: 8px 11px; border-radius: 10px; pointer-events: none;
  font: 600 12.5px/1.35 var(--sans, system-ui, sans-serif); color: #2a1d10;
  background: linear-gradient(180deg, #f3e6c4, #e6d3a3); border: 1px solid #b08a4a;
  box-shadow: 0 8px 20px rgba(0,0,0,.45); animation: gnSay .25s cubic-bezier(.2, 1.4, .4, 1) both; }
.gn-say::before { content: ""; position: absolute; left: 10px; top: -7px; width: 12px; height: 12px;
  background: #f3e6c4; border-left: 1px solid #b08a4a; border-top: 1px solid #b08a4a; transform: rotate(45deg); }
.gn-say.out { animation: gnSayOut .3s ease both; }
@keyframes gnSay { from { opacity: 0; transform: translateY(-6px) scale(.9); } }
@keyframes gnSayOut { to { opacity: 0; transform: translateY(-4px); } }

@media (max-width: 700px) { .gnome-slot { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .gnome .gn-gear, .gnome .gn-wrench, .gnome.asleep .gn-mouth { animation: none; }
  .gnome.asleep:not(.nodding) .gn-zzz text { animation: none; }
  .gnome .gn-head, .gnome .gn-eye { transition: none; }
}`;

/* Dibujo: 120 × 100 (se pinta a 54 × 45). El tablero de la mesa está en y = 75;
   la cabeza se recorta ahí para poder hundirse detrás. */
const GEAR = Array.from({ length: 12 }, (_, i) =>
  `<rect x="57" y="4.5" width="6" height="7" rx="1" transform="rotate(${i * 30} 60 39)"/>`).join("");
const SVG = `<svg viewBox="0 0 120 100" aria-hidden="true" fill="none" stroke="${GOLD}" stroke-linecap="round" stroke-linejoin="round">
  <defs><clipPath id="gnDesk"><rect x="-20" y="-30" width="160" height="104"/></clipPath></defs>
  <g class="gn-gear" fill="#4b5874" stroke="none">${GEAR}
    <circle cx="60" cy="39" r="27" fill="none" stroke="#4b5874" stroke-width="4.5"/></g>
  <g clip-path="url(#gnDesk)">
    <g class="gn-head">
      <path d="M38 39 L19 32.5 L37 55" fill="#151923" stroke-width="4"/>
      <path d="M77 39 L96 32.5 L78 55" fill="#151923" stroke-width="4"/>
      <path d="M36 80 V45 Q36 23.5 57.5 23.5 Q79 23.5 79 45 V80" fill="#151923" stroke-width="4.2"/>
      <g class="gn-goggles"><circle cx="49" cy="43.5" r="6.4" stroke-width="3.3"/><circle cx="49" cy="43.5" r="2.3" stroke-width="2.6"/>
        <circle cx="66" cy="43.5" r="6.4" stroke-width="3.3"/><circle cx="66" cy="43.5" r="2.3" stroke-width="2.6"/></g>
      <g class="gn-eye"><circle class="gn-pupil" cx="50" cy="57.5" r="2" fill="${GOLD}" stroke="none"/></g>
      <g class="gn-eye"><circle class="gn-pupil" cx="67.5" cy="57.5" r="2" fill="${GOLD}" stroke="none"/></g>
      <path class="gn-sleepeye" d="M47.4 57.2 Q50 59.6 52.6 57.2 M64.9 57.2 Q67.5 59.6 70.1 57.2" stroke-width="2"/>
      <circle class="gn-mouth" cx="58.8" cy="63.6" r="3.9" stroke-width="3"/>
    </g>
  </g>
  <path d="M15 76 V97 M100 76 V97" stroke-width="4"/>
  <path d="M2.5 75 H117.5" stroke-width="4.8"/>
  <rect x="25" y="68" width="13" height="7" rx="3.2" fill="#151923" stroke-width="3.4"/>
  <g class="gn-wrench"><path d="M94 70 L97.5 57 M97.5 57 L95.5 49 M97.5 57 Q103 56 105.5 50" stroke-width="3.6"/></g>
  <rect x="80" y="68" width="13" height="7" rx="3.2" fill="#151923" stroke-width="3.4"/>
  <g class="gn-zzz" stroke="none"><text x="84" y="22">z</text><text x="92" y="13">z</text><text x="100" y="4">Z</text></g>
  <text class="gn-bang" x="86" y="22" stroke="none">!</text>
</svg>`;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export function mountGnome(slot) {
  if (!slot || slot.dataset.gnome) return;
  slot.dataset.gnome = "1";
  if (!document.getElementById("gnome-css")) {
    const style = document.createElement("style");
    style.id = "gnome-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  slot.classList.add("gnome-slot");
  slot.hidden = !gnomeEnabled();
  const title = "Chispa, el gnomo ingeniero. Si no pasa nada, se duerme.";
  slot.innerHTML = `<button type="button" class="gnome" title="${title}" aria-label="${title}">${SVG}</button>`;
  const me = slot.querySelector(".gnome");

  let state = "awake";          // awake · dozy · asleep
  let idle = 0, doze = 0, nod = 0, blinkT = 0, peekT = 0, startleT = 0, sayT = 0, frame = 0;
  let pointer = null, nodding = false;
  const set = (cls, on) => me.classList.toggle(cls, on);
  const visible = () => !slot.hidden && me.isConnected;

  function goTo(next) {
    state = next;
    set("dozy", next === "dozy");
    set("asleep", next === "asleep");
    if (next === "awake") { nodding = false; set("nodding", false); }
  }

  function armIdle() {
    clearTimeout(idle); clearTimeout(doze);
    idle = setTimeout(() => {
      goTo("dozy");
      doze = setTimeout(() => goTo("asleep"), DOZE_MS);
    }, IDLE_MS);
  }

  /* Una cabezada: se le cierran los ojos, se le cae la cabeza y se despierta
     de un respingo. Pasa aunque el DM esté trabajando. */
  function armNod() {
    clearTimeout(nod);
    nod = setTimeout(() => {
      if (state === "awake" && visible() && !document.hidden) {
        goTo("dozy"); nodding = true;
        nod = setTimeout(() => {
          if (state !== "dozy") return armNod();
          goTo("asleep"); set("nodding", true);
          nod = setTimeout(() => { if (state === "asleep") wake(); armNod(); }, rnd(1400, 2600));
        }, rnd(1600, 2600));
      } else armNod();
    }, rnd(NOD_MIN, NOD_MAX));
  }

  function blinkLoop() {
    clearTimeout(blinkT);
    blinkT = setTimeout(() => {
      if (state === "awake") { set("blink", true); setTimeout(() => set("blink", false), 130); }
      blinkLoop();
    }, rnd(2500, 6500));
  }

  function wake() {
    const was = state;
    goTo("awake");
    if (was !== "awake") {
      set("startle", false); void me.offsetWidth; set("startle", true);
      clearTimeout(startleT);
      startleT = setTimeout(() => set("startle", false), 900);
    }
    return was;
  }

  /* Hacia dónde mira: las pupilas apuntan al puntero y la cabeza se ladea un poco */
  function look() {
    frame = 0;
    if (!pointer || state !== "awake" || !visible()) return;
    const r = me.getBoundingClientRect();
    const ex = r.left + r.width * .49, ey = r.top + r.height * .575;
    const dx = pointer.x - ex, dy = pointer.y - ey;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 90);
    me.style.setProperty("--px", (dx / d * 1.7 * k).toFixed(2) + "px");
    me.style.setProperty("--py", (dy / d * 1.3 * k).toFixed(2) + "px");
    me.style.setProperty("--hr", Math.max(-6, Math.min(6, dx / 90)).toFixed(1) + "deg");
  }

  function activity(e) {
    if (!me.isConnected) return stop();
    if (e.type === "pointermove" || e.type === "pointerdown") {
      pointer = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(look);
    }
    /* Escribiendo: mira hacia abajo, como quien lee por encima del hombro */
    if (e.type === "keydown" && state === "awake") { me.style.setProperty("--py", "1.3px"); }
    if (state !== "awake" && !nodding) wake();
    if (e.type === "pointerdown" && !me.contains(e.target)) {
      set("peek", true); clearTimeout(peekT); peekT = setTimeout(() => set("peek", false), 700);
    }
    armIdle();
  }

  function say(text) {
    const old = slot.querySelector(".gn-say");
    if (old) old.remove();
    const bubble = document.createElement("div");
    bubble.className = "gn-say";
    bubble.textContent = t(text);
    slot.appendChild(bubble);
    clearTimeout(sayT);
    sayT = setTimeout(() => { bubble.classList.add("out"); setTimeout(() => bubble.remove(), 320); }, 3600);
  }

  me.addEventListener("click", () => {
    const was = wake();
    say(was === "awake" ? pick(QUIPS) : pick(WAKE_QUIPS));
    armIdle(); armNod();
  });

  const EVENTS = ["pointermove", "pointerdown", "keydown", "wheel"];
  EVENTS.forEach(ev => addEventListener(ev, activity, { passive: true, capture: true }));
  function stop() {
    EVENTS.forEach(ev => removeEventListener(ev, activity, { capture: true }));
    [idle, doze, nod, blinkT, peekT, startleT, sayT].forEach(clearTimeout);
  }

  armIdle(); armNod(); blinkLoop();
  return { wake, sleep: () => goTo("asleep"), doze: () => goTo("dozy"), stop, get state() { return state; } };
}
