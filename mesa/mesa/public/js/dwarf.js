/* Brokk, el ingeniero enano de la vista del DM.

   Se sienta en el borde de la barra de arriba, a la izquierda del título,
   con las piernas colgando. Sigue con la mirada lo que hace el DM
   (el puntero, los clics, lo que escribe) y, si pasa un rato sin que ocurra
   nada, se queda dormido. De vez en cuando también da una cabezada aunque
   haya jaleo, y se despierta de golpe. Pulsarlo le hace hablar.

   Es pura decoración: no toca la partida ni el servidor, y se puede quitar
   desde el menú ···. Los estilos van aquí dentro, igual que los del panel de
   dados, para que funcione aunque el navegador guarde una hoja de estilos
   vieja. */

import { t } from "./i18n.js";

const OFF_KEY = "mesa.dwarf";
const IDLE_MS = 45000;         // sin actividad: empieza a cabecear
const DOZE_MS = 5000;          // lo que tarda en dormirse del todo
const NOD_MIN = 70000, NOD_MAX = 160000;   // cabezadas sueltas, aunque haya jaleo

export const QUIPS = [
  "Ese muro no aguanta ni un estornudo.",
  "Yo ahí pondría una trampa. O dos.",
  "Mi abuelo cavaba túneles más rectos.",
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

export const dwarfEnabled = () => {
  try { return localStorage.getItem(OFF_KEY) !== "off"; } catch { return true; }
};
export function setDwarfEnabled(on) {
  try { on ? localStorage.removeItem(OFF_KEY) : localStorage.setItem(OFF_KEY, "off"); } catch {}
  document.querySelectorAll(".dwarf-slot").forEach(s => { s.hidden = !on; });
}

const CSS = `
.dwarf-slot { position: absolute; left: 0; top: 0; bottom: 0; width: 0; pointer-events: none; }
.dwarf-slot[hidden] { display: none; }
/* Sentado a la izquierda del título: el título se aparta lo justo si el margen no le basta */
.dwarf-slot:not([hidden]) ~ .brand { margin-left: max(0px, calc(36px - max(14px, 2.2vw))); }
.dwarf { position: absolute; left: -9px; bottom: -21px; width: 54px; height: 70px; pointer-events: auto; cursor: pointer;
  border: 0; padding: 0; background: none; color: inherit; -webkit-tap-highlight-color: transparent; }
.dwarf:focus-visible { outline: 2px solid var(--gold-soft, #d8b56a); outline-offset: 2px; border-radius: 8px; }
.dwarf svg { display: block; width: 54px; height: 70px; overflow: visible; filter: drop-shadow(0 4px 6px rgba(0,0,0,.55)); }
.dwarf .dw-legs { pointer-events: none; }
.dwarf .dw-all { transform-box: view-box; transform-origin: 30px 54px; }
.dwarf .dw-leg { transform-box: view-box; animation: dwSwing 2.6s ease-in-out infinite; }
.dwarf .dw-leg-l { transform-origin: 25px 53px; }
.dwarf .dw-leg-r { transform-origin: 35px 53px; animation-delay: -1.3s; }
.dwarf .dw-torso { transform-box: view-box; transform-origin: 30px 54px; animation: dwBreathe 3.6s ease-in-out infinite; }
.dwarf .dw-head { transform-box: view-box; transform-origin: 30px 34px;
  transform: rotate(var(--hr, 0deg)); transition: transform .35s ease; }
.dwarf .dw-pupil { transform: translate(var(--px, 0px), var(--py, .4px)); transition: transform .12s linear; }
.dwarf .dw-lid { transform-box: fill-box; transform-origin: 50% 0; transform: scaleY(0); transition: transform .1s ease; }
.dwarf .dw-brow { transform-box: view-box; transition: transform .2s ease; }
.dwarf .dw-sleepeye, .dwarf .dw-mouth, .dwarf .dw-zzz, .dwarf .dw-bang { opacity: 0; transition: opacity .3s; }
.dwarf .dw-zzz text { font: 700 9px/1 system-ui, sans-serif; fill: #efe2bb; stroke: #1b120c; stroke-width: .6px; paint-order: stroke; }
.dwarf .dw-bang { font: 900 11px/1 system-ui, sans-serif; fill: #f2d48c; stroke: #1b120c; stroke-width: .8px; paint-order: stroke; }

.dwarf.blink .dw-lid { transform: scaleY(1); }
.dwarf.peek .dw-head { transform: rotate(var(--hr, 0deg)) translate(0, 1.2px); }
.dwarf.peek .dw-brow { transform: translateY(-1.2px); }

.dwarf.dozy .dw-lid { transform: scaleY(.6); transition: transform 1.4s ease; }
.dwarf.dozy .dw-head { transform: rotate(6deg) translate(0, 1.5px); transition: transform 2.4s ease-in; }
.dwarf.dozy .dw-leg { animation-duration: 4.5s; }

.dwarf.asleep .dw-lid { transform: scaleY(1); transition: transform .5s ease; }
.dwarf.asleep .dw-head { transform: rotate(13deg) translate(0, 3px); transition: transform .9s ease-in; }
.dwarf.asleep .dw-sleepeye, .dwarf.asleep .dw-mouth { opacity: 1; }
.dwarf.asleep .dw-torso { animation: dwSnore 4.4s ease-in-out infinite; }
.dwarf.asleep .dw-leg { animation-play-state: paused; }
.dwarf.asleep:not(.nodding) .dw-zzz { opacity: 1; }
.dwarf.asleep:not(.nodding) .dw-zzz text { animation: dwZ 3.3s ease-out infinite both; }
.dwarf.asleep .dw-zzz text:nth-child(2) { animation-delay: 1.1s; }
.dwarf.asleep .dw-zzz text:nth-child(3) { animation-delay: 2.2s; }
.dwarf.asleep .dw-mouth { animation: dwMouth 4.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

.dwarf.startle .dw-all { animation: dwJump .5s cubic-bezier(.2, 1.6, .4, 1); }
.dwarf.startle .dw-brow { transform: translateY(-2px); }
.dwarf.startle .dw-bang { opacity: 1; transition: none; }
.dwarf.startle .dw-head { transition-duration: .12s; }

@keyframes dwSwing { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
@keyframes dwBreathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.025); } }
@keyframes dwSnore { 0%, 100% { transform: scale(1, 1); } 45% { transform: scale(1.03, 1.05); } }
@keyframes dwMouth { 0%, 100% { transform: scale(.7); } 45% { transform: scale(1.25); } }
@keyframes dwZ { 0% { opacity: 0; transform: translate(0, 4px) scale(.6); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(9px, -16px) scale(1.25); } }
@keyframes dwJump { 0% { transform: translateY(0); } 35% { transform: translateY(-7px) rotate(-3deg); } 100% { transform: translateY(0); } }

.dw-say { position: absolute; left: 74px; top: calc(100% + 8px); z-index: 40; width: max-content; max-width: 230px;
  padding: 8px 11px; border-radius: 10px; pointer-events: none;
  font: 600 12.5px/1.35 var(--sans, system-ui, sans-serif); color: #2a1d10;
  background: linear-gradient(180deg, #f3e6c4, #e6d3a3); border: 1px solid #b08a4a;
  box-shadow: 0 8px 20px rgba(0,0,0,.45); animation: dwSay .25s cubic-bezier(.2, 1.4, .4, 1) both; }
.dw-say::before { content: ""; position: absolute; left: -7px; top: 8px; width: 12px; height: 12px;
  background: #f0e1bb; border-left: 1px solid #b08a4a; border-bottom: 1px solid #b08a4a; transform: rotate(45deg); }
.dw-say.out { animation: dwSayOut .3s ease both; }
@keyframes dwSay { from { opacity: 0; transform: translateY(-6px) scale(.9); } }
@keyframes dwSayOut { to { opacity: 0; transform: translateY(-4px); } }

@media (max-width: 700px) { .dwarf-slot { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .dwarf .dw-leg, .dwarf .dw-torso, .dwarf.asleep .dw-torso, .dwarf.asleep .dw-mouth, .dwarf.startle .dw-all { animation: none; }
  .dwarf.asleep:not(.nodding) .dw-zzz text { animation: none; }
  .dwarf .dw-head, .dwarf .dw-lid { transition: none; }
}`;

/* Dibujo: 60 × 78 (se pinta a 54 × 70), el asiento (el borde de la barra) en y = 54 */
const INK = "#1b120c";
const SVG = `<svg viewBox="0 0 60 78" aria-hidden="true" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
  <defs>
    <clipPath id="dwEyeL"><ellipse cx="25.6" cy="21" rx="2.5" ry="2.2"/></clipPath>
    <clipPath id="dwEyeR"><ellipse cx="34.4" cy="21" rx="2.5" ry="2.2"/></clipPath>
  </defs>
  <g class="dw-all">
    <g class="dw-legs">
      <g class="dw-leg dw-leg-l">
        <path d="M21.5 52 L28.5 52 L28 64 L22 64 Z" fill="#4b3a2b"/>
        <path d="M20.6 63.4 Q20.2 69.5 22.5 70 L16.2 70.2 Q14.8 70.3 15.4 68.4 Q16.5 65.6 20.6 63.4 Z M20.6 63.4 L28.6 63.4 L28.8 70 L22.5 70" fill="#3a2616"/>
        <path d="M21 64.8 L28.4 64.8" stroke="#c9973f" stroke-width="1.2"/>
      </g>
      <g class="dw-leg dw-leg-r">
        <path d="M31.5 52 L38.5 52 L38 64 L32 64 Z" fill="#4b3a2b"/>
        <path d="M39.4 63.4 Q39.8 69.5 37.5 70 L43.8 70.2 Q45.2 70.3 44.6 68.4 Q43.5 65.6 39.4 63.4 Z M39.4 63.4 L31.4 63.4 L31.2 70 L37.5 70" fill="#3a2616"/>
        <path d="M31.6 64.8 L39 64.8" stroke="#c9973f" stroke-width="1.2"/>
      </g>
    </g>
    <g class="dw-torso">
      <path d="M17.5 36 Q30 31.5 42.5 36 L45 54.5 L15 54.5 Z" fill="#2a4f55"/>
      <path d="M21.5 41 L38.5 41 L40.5 54.5 L19.5 54.5 Z" fill="#6b4a2e"/>
      <path d="M24 49 L30 49 L30 53.5 L24 53.5 Z" fill="#5a3d25"/>
      <path d="M36.2 48 L39.6 37.6 M38.2 36.6 L41.4 38 L40.6 39.2 L39.3 38.6" fill="none" stroke="#9aa3a6" stroke-width="1.7"/>
      <path d="M38.6 35.6 A2.2 2.2 0 1 1 42.4 37.2" fill="none" stroke="#9aa3a6" stroke-width="1.7"/>
      <path d="M16.5 45.2 L43.5 45.2 L43.8 48 L16.2 48 Z" fill="#2b1d12"/>
      <rect x="27.6" y="44.6" width="4.8" height="4" rx=".8" fill="#d4a64a"/>
      <path d="M17.6 36.4 Q13.2 42 15.6 50.4" fill="none" stroke="${INK}" stroke-width="4.6"/>
      <path d="M17.6 36.4 Q13.2 42 15.6 50.4" fill="none" stroke="#2a4f55" stroke-width="2.6"/>
      <path d="M42.4 36.4 Q46.8 42 44.4 50.4" fill="none" stroke="${INK}" stroke-width="4.6"/>
      <path d="M42.4 36.4 Q46.8 42 44.4 50.4" fill="none" stroke="#2a4f55" stroke-width="2.6"/>
      <circle cx="16" cy="51.6" r="2.6" fill="#d9a27a"/>
      <circle cx="44" cy="51.6" r="2.6" fill="#d9a27a"/>
    </g>
    <g class="dw-head">
      <ellipse cx="19.6" cy="22" rx="2.3" ry="3.1" fill="#d9a27a"/>
      <ellipse cx="40.4" cy="22" rx="2.3" ry="3.1" fill="#d9a27a"/>
      <ellipse cx="30" cy="22" rx="10.2" ry="10.6" fill="#d9a27a"/>
      <path d="M19.4 19.5 Q19.4 8 30 7.4 Q40.6 8 40.6 19.5 Q30 16.4 19.4 19.5 Z" fill="#5a3b24"/>
      <path d="M22 11.6 Q30 9.2 38 11.6" fill="none" stroke="#3b2616" stroke-width=".8" stroke-dasharray="1.4 1.2"/>
      <path d="M19.3 15.4 Q30 12.4 40.7 15.4 L40.6 17.6 Q30 14.8 19.4 17.6 Z" fill="#2b1d12"/>
      <circle cx="25.4" cy="14.6" r="3.5" fill="#7fb6b8" stroke="#c9973f" stroke-width="1.6"/>
      <circle cx="34.6" cy="14.6" r="3.5" fill="#7fb6b8" stroke="#c9973f" stroke-width="1.6"/>
      <path d="M23.8 13.4 Q24.6 12.4 25.8 12.6 M33 13.4 Q33.8 12.4 35 12.6" fill="none" stroke="#eaf6f4" stroke-width=".9"/>
      <g clip-path="url(#dwEyeL)">
        <ellipse cx="25.6" cy="21" rx="2.5" ry="2.2" fill="#f6efe0" stroke="none"/>
        <circle class="dw-pupil" cx="25.6" cy="21" r="1.2" fill="${INK}" stroke="none"/>
        <rect class="dw-lid" x="22.8" y="18.6" width="5.6" height="5" fill="#c88f68" stroke="none"/>
      </g>
      <g clip-path="url(#dwEyeR)">
        <ellipse cx="34.4" cy="21" rx="2.5" ry="2.2" fill="#f6efe0" stroke="none"/>
        <circle class="dw-pupil" cx="34.4" cy="21" r="1.2" fill="${INK}" stroke="none"/>
        <rect class="dw-lid" x="31.6" y="18.6" width="5.6" height="5" fill="#c88f68" stroke="none"/>
      </g>
      <ellipse cx="25.6" cy="21" rx="2.5" ry="2.2" fill="none"/>
      <ellipse cx="34.4" cy="21" rx="2.5" ry="2.2" fill="none"/>
      <path class="dw-sleepeye" d="M23.4 21.6 Q25.6 23.2 27.8 21.6 M32.2 21.6 Q34.4 23.2 36.6 21.6" fill="none" stroke-width="1"/>
      <g class="dw-brow">
        <path d="M22.4 18.6 Q25 16.6 28.4 18 Q25.6 17.8 22.4 18.6 Z" fill="#8e4322" stroke-width=".8"/>
        <path d="M37.6 18.6 Q35 16.6 31.6 18 Q34.4 17.8 37.6 18.6 Z" fill="#8e4322" stroke-width=".8"/>
      </g>
      <path d="M19.8 23 Q19 34 23 39.5 Q26 44.5 30 46.5 Q34 44.5 37 39.5 Q41 34 40.2 23 Q38.6 28.6 34.6 27.4 L25.4 27.4 Q21.4 28.6 19.8 23 Z" fill="#b5562a"/>
      <path d="M23.6 31 Q24.6 36 27 40 M30 30.6 L30 44.5 M36.4 31 Q35.4 36 33 40 M21.6 28 Q21.8 32 23.6 35 M38.4 28 Q38.2 32 36.4 35" fill="none" stroke="#6e2e14" stroke-width=".8"/>
      <rect x="28" y="38.6" width="4" height="2.6" rx=".9" fill="#d4a64a" stroke-width=".8"/>
      <ellipse class="dw-mouth" cx="30" cy="30.4" rx="1.6" ry="1.4" fill="#3b1a10"/>
      <path d="M30 26.4 Q26 25 21.6 28.6 Q25 26.4 28 28.4 Q29.2 28.6 30 27.6 Q30.8 28.6 32 28.4 Q35 26.4 38.4 28.6 Q34 25 30 26.4 Z" fill="#9c4520"/>
      <ellipse cx="30" cy="24.2" rx="2.9" ry="2.5" fill="#cf8560"/>
      <path d="M28.8 23.4 Q29.4 22.8 30.2 23" fill="none" stroke="#f0c6a6" stroke-width=".7"/>
    </g>
    <g class="dw-zzz" stroke="none"><text x="42" y="12">z</text><text x="45" y="8">z</text><text x="48" y="4">Z</text></g>
    <text class="dw-bang" x="43" y="9">!</text>
  </g>
</svg>`;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export function mountDwarf(slot) {
  if (!slot || slot.dataset.dwarf) return;
  slot.dataset.dwarf = "1";
  if (!document.getElementById("dwarf-css")) {
    const style = document.createElement("style");
    style.id = "dwarf-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  slot.classList.add("dwarf-slot");
  slot.hidden = !dwarfEnabled();
  const title = "Brokk, el ingeniero enano. Si no pasa nada, se duerme.";
  slot.innerHTML = `<button type="button" class="dwarf" title="${title}" aria-label="${title}">${SVG}</button>`;
  const me = slot.querySelector(".dwarf");

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
    const ex = r.left + 27, ey = r.top + 19;
    const dx = pointer.x - ex, dy = pointer.y - ey;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 90);
    me.style.setProperty("--px", (dx / d * 1.3 * k).toFixed(2) + "px");
    me.style.setProperty("--py", (dy / d * 1.1 * k).toFixed(2) + "px");
    me.style.setProperty("--hr", Math.max(-8, Math.min(8, dx / 70)).toFixed(1) + "deg");
  }

  function activity(e) {
    if (!me.isConnected) return stop();
    if (e.type === "pointermove" || e.type === "pointerdown") {
      pointer = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(look);
    }
    /* Escribiendo: mira hacia abajo, como quien lee por encima del hombro */
    if (e.type === "keydown" && state === "awake") { me.style.setProperty("--py", "1px"); }
    if (state !== "awake" && !nodding) wake();
    if (e.type === "pointerdown" && !me.contains(e.target)) {
      set("peek", true); clearTimeout(peekT); peekT = setTimeout(() => set("peek", false), 700);
    }
    armIdle();
  }

  function say(text) {
    const old = slot.querySelector(".dw-say");
    if (old) old.remove();
    const bubble = document.createElement("div");
    bubble.className = "dw-say";
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
