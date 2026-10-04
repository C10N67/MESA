/* Mesa · el sonido del mapa en la vista de la party

   El servidor manda a qué volumen le llega a la party cada fuente de sonido
   y cuántos muros hay en medio (hearing.js). Aquí se hace sonar: cada fuente
   es un bucle que pasa por un filtro (más apagado cuantos más muros) y por su
   volumen, que cambia suave, sin saltos, cuando alguien se mueve.

   Los navegadores no dejan sonar nada hasta que alguien toca la página: si
   hace falta, sale un botón para activar el sonido. */

import { synthesize } from "./synth.js";
import { imgURL } from "./util.js";

let ctx = null, master = null;
const voices = new Map();        // id -> { key, src, gain, filter, stopTimer }
const buffers = new Map();       // clave -> Promise<AudioBuffer>
let unlockBtn = null;
let last = null;

const SMOOTH = 0.35;             // segundos que tarda en asentarse un cambio de volumen

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const wake = () => { if (ctx.state !== "running") ctx.resume().then(syncUnlock, () => {}); };
  for (const ev of ["pointerdown", "keydown", "touchend"]) document.addEventListener(ev, wake, { passive: true });
  ctx.addEventListener && ctx.addEventListener("statechange", syncUnlock);
  return ctx;
}

/* El botón de «activar el sonido», solo mientras haga falta */
function syncUnlock() {
  const need = ctx && ctx.state !== "running" && last && last.sources.length && last.volume > 0;
  if (need && !unlockBtn) {
    unlockBtn = document.createElement("button");
    unlockBtn.type = "button";
    unlockBtn.className = "sound-unlock";
    unlockBtn.innerHTML = `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg><span>Activar el sonido</span>`;
    unlockBtn.addEventListener("click", () => ctx.resume().then(syncUnlock, () => {}));
    document.body.appendChild(unlockBtn);
  } else if (!need && unlockBtn) {
    unlockBtn.remove();
    unlockBtn = null;
  }
}

/* El bucle de cada sonido: los de serie se sintetizan una vez; los archivos
   del DM se descargan y se descodifican una vez. */
function bufferFor(c, preset, audioId) {
  const key = audioId ? "f:" + audioId : "p:" + preset;
  if (!buffers.has(key)) {
    buffers.set(key, (async () => {
      if (audioId) {
        const res = await fetch(imgURL(audioId));
        if (!res.ok) throw new Error("No se pudo descargar el sonido");
        const data = await res.arrayBuffer();
        return await new Promise((resolve, reject) => {
          const p = c.decodeAudioData(data, resolve, reject);
          if (p && p.then) p.then(resolve, reject);
        });
      }
      /* Se deja respirar a la página antes de sintetizar: tarda unas décimas */
      await new Promise(r => setTimeout(r, 30));
      const [L, R] = synthesize(preset, c.sampleRate);
      const sr = Math.min(48000, Math.max(22050, c.sampleRate || 44100));
      const buf = c.createBuffer(2, L.length, sr);
      buf.getChannelData(0).set(L);
      buf.getChannelData(1).set(R);
      return buf;
    })().catch(err => { buffers.delete(key); throw err; }));
  }
  return buffers.get(key);
}

/* Muros en medio -> hasta dónde llegan los agudos */
const cutoff = walls => (walls > 0 ? Math.max(220, 1400 / Math.pow(1.9, walls - 1)) : 20000);

function voiceFor(s) {
  const key = s.audioId ? "f:" + s.audioId : "p:" + s.preset;
  let v = voices.get(s.id);
  if (v && v.key !== key) { stopVoice(s.id, true); v = null; }
  if (!v) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.5;
    filter.frequency.value = cutoff(s.walls);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain);
    gain.connect(master);
    v = { key, src: null, gain, filter, stopTimer: null, dead: false };
    voices.set(s.id, v);
    bufferFor(ctx, s.preset, s.audioId).then(buf => {
      if (v.dead) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(filter);
      /* Cada fuente empieza en un punto distinto del bucle: dos hogueras
         iguales no suenan como una sola más fuerte */
      src.start(0, Math.random() * buf.duration);
      v.src = src;
    }, err => console.warn("Mesa · sonido:", err && err.message));
  }
  return v;
}

function stopVoice(id, now = false) {
  const v = voices.get(id);
  if (!v) return;
  const end = () => {
    v.dead = true;
    try { v.src && v.src.stop(); } catch {}
    try { v.gain.disconnect(); } catch {}
    if (voices.get(id) === v) voices.delete(id);
  };
  if (now) return end();
  if (v.stopTimer) return;
  v.gain.gain.setTargetAtTime(0, ctx.currentTime, SMOOTH);
  v.stopTimer = setTimeout(end, 4000);
}

/* Lo que manda el servidor: { volume, sources: [{ id, preset, audioId, gain, walls }] }
   o null (este aparato no tiene que sonar) */
export function playSoundscape(state) {
  last = state && Array.isArray(state.sources) ? state : null;
  if (!last || (!last.sources.length && !ctx)) {
    if (ctx) { for (const id of [...voices.keys()]) stopVoice(id); master.gain.setTargetAtTime(0, ctx.currentTime, SMOOTH); }
    syncUnlock();
    return;
  }
  if (!audio()) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, last.volume)), now, SMOOTH);
  const live = new Set();
  for (const s of last.sources) {
    live.add(s.id);
    const v = voiceFor(s);
    if (v.stopTimer) { clearTimeout(v.stopTimer); v.stopTimer = null; }
    v.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, s.gain)), now, SMOOTH);
    v.filter.frequency.setTargetAtTime(cutoff(s.walls), now, SMOOTH);
  }
  for (const id of [...voices.keys()]) if (!live.has(id)) stopVoice(id);
  syncUnlock();
}

/* Para que el DM escuche un sonido antes de ponerlo: suena en su aparato,
   tal cual, unos segundos. Devuelve con qué pararlo. */
export async function previewSound({ preset, audioId, volume = 0.8 }) {
  const c = audio();
  if (!c) throw new Error("Este navegador no reproduce sonido");
  if (c.state !== "running") await c.resume();
  const buf = await bufferFor(c, preset, audioId);
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(c.destination);
  gain.gain.setTargetAtTime(Math.max(0.05, volume), c.currentTime, 0.08);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  src.start();
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    gain.gain.setTargetAtTime(0, c.currentTime, 0.12);
    setTimeout(() => { try { src.stop(); gain.disconnect(); } catch {} }, 600);
  };
  setTimeout(stop, 12000);
  return stop;
}
