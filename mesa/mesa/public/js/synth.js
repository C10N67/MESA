/* Mesa · los sonidos de serie

   No son archivos: se sintetizan en el navegador la primera vez que hacen
   falta, así que no pesan nada, no hay licencias que cuidar y funcionan sin
   internet, igual que el resto de Mesa.

   Cada uno es un bucle de unos segundos que tiene que repetirse sin que se
   note la costura. Para eso:

   - Lo que son golpes sueltos (chasquidos del fuego, gotas, pájaros, notas)
     se escribe «en círculo»: lo que se sale por el final entra por el
     principio.
   - Lo que pasa por filtros (ruidos, reverberación) se filtra dos veces
     seguidas y se queda la segunda: así el filtro empieza la vuelta con lo
     que traía del final y la costura no existe.
   - Lo que cambia despacio (rachas de viento, el fuego que sube y baja) se
     arma con ondas que dan un número entero de vueltas en el bucle.

   synthesize(id, sampleRate) -> [izquierda, derecha] (Float32Array) */

const TAU = Math.PI * 2;

/* Azar repetible: el mismo sonido sale igual cada vez */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Algo que sube y baja despacio, de 0 a 1, que da vueltas enteras en el bucle */
function slow(rand, len, maxCycles = 6, parts = 5) {
  const waves = Array.from({ length: parts }, () => ({
    k: 1 + Math.floor(rand() * maxCycles), ph: rand() * TAU, a: 0.4 + rand()
  }));
  const out = new Float32Array(len);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (const w of waves) v += w.a * Math.sin(TAU * w.k * i / len + w.ph);
    out[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  for (let i = 0; i < len; i++) out[i] = (out[i] - lo) / (hi - lo || 1);
  return out;
}

const noise = (rand, len) => {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = rand() * 2 - 1;
  return out;
};

/* Filtro de dos polos (las recetas de siempre). Se le pueden cambiar los
   coeficientes sobre la marcha, que es lo que hace el viento. */
class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q, sr) {
    const w = TAU * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }        // paso banda
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/* Pasa un bucle por un proceso dos veces y se queda la segunda vuelta */
function looped(input, step) {
  const len = input.length, out = new Float32Array(len);
  for (let i = 0; i < len; i++) step(input[i], i);
  for (let i = 0; i < len; i++) out[i] = step(input[i], i);
  return out;
}
const filtered = (input, type, f, q, sr) => {
  const bq = new Biquad().set(type, f, q, sr);
  return looped(input, x => bq.run(x));
};
/* Ruido grave (marrón): ruido blanco que se integra y se recoge al centro */
const brown = input => {
  let y = 0;
  return looped(input, x => (y = y * 0.995 + x * 0.06));
};

/* Escribe un golpe en círculo, con su paneo */
function stamp(L, R, at, samples, gain, pan = 0) {
  const len = L.length;
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < samples.length; i++) {
    const j = (at + i) % len;
    L[j] += samples[i] * gl;
    R[j] += samples[i] * gr;
  }
}
function addTo(L, R, src, gl, gr = gl) {
  for (let i = 0; i < L.length; i++) { L[i] += src[i] * gl; R[i] += src[i] * gr; }
}

/* Reverberación pequeña (Schroeder): cuatro ecos que se apagan y dos que
   emborronan. En bucle, como todo lo demás. */
function reverb(input, sr, { size = 1, decay = 0.78, wet = 0.3, spread = 0 } = {}) {
  const combs = [29.7, 37.1, 41.1, 43.7].map(ms => {
    const n = Math.round((ms + spread) * size * sr / 1000);
    return { buf: new Float32Array(n), i: 0, lp: 0 };
  });
  const alls = [5.0, 1.7].map(ms => ({ buf: new Float32Array(Math.round(ms * sr / 1000)), i: 0 }));
  return looped(input, x => {
    let sum = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.75 + c.lp * 0.25;               // los ecos pierden brillo
      c.buf[c.i] = x + c.lp * decay;
      c.i = (c.i + 1) % c.buf.length;
      sum += y;
    }
    let y = sum * 0.25;
    for (const a of alls) {
      const d = a.buf[a.i];
      const v = y + d * 0.6;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      y = d - v * 0.6;
    }
    return x * (1 - wet) + y * wet * 2.2;
  });
}

/* Todos al mismo volumen aparente, sin pasarse de rosca */
function finish(L, R, target = 0.16) {
  let sum = 0;
  for (let i = 0; i < L.length; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / (L.length * 2)) || 1;
  const k = target / rms;
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * k * 1.1) / 1.1;
    R[i] = Math.tanh(R[i] * k * 1.1) / 1.1;
  }
  return [L, R];
}

/* ---------- Los sonidos ---------- */
const PRESETS = {
  /* Hoguera: un rumor grave que sube y baja, siseo y chasquidos sueltos */
  fuego(sr) {
    const len = Math.round(sr * 12), rand = rng(11);
    const L = new Float32Array(len), R = new Float32Array(len);
    const bed = filtered(brown(noise(rand, len)), "lp", 380, 0.7, sr);
    const flick = slow(rand, len, 14, 7);
    for (let i = 0; i < len; i++) { const v = bed[i] * (0.55 + 0.45 * flick[i]); L[i] += v; R[i] += v; }
    const hiss = filtered(noise(rand, len), "hp", 3000, 0.7, sr);
    addTo(L, R, hiss, 0.012, 0.01);
    const crack = (n, a, f) => {
      const tau = sr * (0.0015 + rand() * 0.006), dur = Math.round(tau * 6);
      const bq = new Biquad().set("bp", f, 1.2, sr);
      const s = new Float32Array(dur);
      for (let i = 0; i < dur; i++) s[i] = bq.run((rand() * 2 - 1) * Math.exp(-i / tau));
      stamp(L, R, n, s, a, rand() * 1.6 - 0.8);
    };
    for (let i = 0; i < 12 * 7; i++) crack(Math.floor(rand() * len), 0.25 + Math.pow(rand(), 2) * 1.6, 1500 + rand() * 4000);
    for (let i = 0; i < 6; i++) crack(Math.floor(rand() * len), 1.8 + rand() * 1.4, 500 + rand() * 900);
    return finish(L, R, 0.14);
  },

  /* Lluvia: un siseo ancho y miles de gotitas */
  lluvia(sr) {
    const len = Math.round(sr * 10), rand = rng(23);
    const L = new Float32Array(len), R = new Float32Array(len);
    const swell = slow(rand, len, 4, 3);
    const a = filtered(filtered(noise(rand, len), "hp", 600, 0.6, sr), "lp", 9000, 0.6, sr);
    const b = filtered(filtered(noise(rand, len), "hp", 600, 0.6, sr), "lp", 9000, 0.6, sr);
    for (let i = 0; i < len; i++) { const g = 0.75 + 0.25 * swell[i]; L[i] += a[i] * g * 0.5; R[i] += b[i] * g * 0.5; }
    const low = filtered(brown(noise(rand, len)), "lp", 250, 0.7, sr);
    addTo(L, R, low, 0.5);
    for (let k = 0; k < 10 * 45; k++) {
      const f = 1800 + rand() * 5000, dur = Math.round(sr * 0.006), s = new Float32Array(dur);
      for (let i = 0; i < dur; i++) s[i] = Math.sin(TAU * f * i / sr) * Math.exp(-i / (dur / 5));
      stamp(L, R, Math.floor(rand() * len), s, 0.05 + rand() * 0.18, rand() * 2 - 1);
    }
    return finish(L, R, 0.13);
  },

  /* Viento: ruido por un filtro que se abre y se cierra a rachas */
  viento(sr) {
    const len = Math.round(sr * 16), rand = rng(37);
    const L = new Float32Array(len), R = new Float32Array(len);
    for (const [side, seed] of [[0, 1], [1, 2]]) {
      const r2 = rng(37 + seed);
      const src = noise(r2, len), gust = slow(r2, len, 5, 4), pitch = slow(r2, len, 7, 4);
      const bq = new Biquad();
      const out = looped(src, (x, i) => {
        if (i % 32 === 0) bq.set("bp", 220 + 700 * pitch[i] * (0.4 + 0.6 * gust[i]), 2.2 + 3 * gust[i], sr);
        return bq.run(x) * (0.15 + 0.85 * gust[i] * gust[i]);
      });
      addTo(L, R, out, side === 0 ? 1 : 0.35, side === 0 ? 0.35 : 1);
    }
    const low = filtered(brown(noise(rand, len)), "lp", 140, 0.7, sr);
    addTo(L, R, low, 0.6);
    return finish(L, R, 0.13);
  },

  /* Río: el chorro de agua y burbujas que suben de tono */
  rio(sr) {
    const len = Math.round(sr * 10), rand = rng(41);
    const L = new Float32Array(len), R = new Float32Array(len);
    const bedL = filtered(filtered(noise(rand, len), "bp", 900, 0.6, sr), "lp", 3000, 0.7, sr);
    const bedR = filtered(filtered(noise(rand, len), "bp", 1100, 0.6, sr), "lp", 3000, 0.7, sr);
    const ripple = slow(rand, len, 30, 8);
    for (let i = 0; i < len; i++) { const g = 0.6 + 0.4 * ripple[i]; L[i] += bedL[i] * g; R[i] += bedR[i] * g; }
    addTo(L, R, filtered(brown(noise(rand, len)), "lp", 300, 0.7, sr), 0.5);
    for (let k = 0; k < 10 * 30; k++) {
      const f0 = 350 + rand() * 1100, dur = Math.round(sr * (0.02 + rand() * 0.05)), s = new Float32Array(dur);
      let ph = 0;
      for (let i = 0; i < dur; i++) {
        const t = i / dur;
        ph += TAU * f0 * (1 + t * 0.8) / sr;
        s[i] = Math.sin(ph) * Math.sin(Math.PI * t) * Math.exp(-t * 2);
      }
      stamp(L, R, Math.floor(rand() * len), s, 0.04 + rand() * 0.12, rand() * 1.6 - 0.8);
    }
    return finish(L, R, 0.13);
  },

  /* Cueva: un rumor muy grave, gotas que caen de vez en cuando y su eco */
  cueva(sr) {
    const len = Math.round(sr * 16), rand = rng(53);
    let L = new Float32Array(len), R = new Float32Array(len);
    const drips = new Float32Array(len), dripsR = new Float32Array(len);
    for (let k = 0; k < 11; k++) {
      const f = 900 + rand() * 1400, dur = Math.round(sr * 0.09), s = new Float32Array(dur);
      let ph = 0;
      for (let i = 0; i < dur; i++) {
        const t = i / sr;
        ph += TAU * f * (1 + Math.min(1, t / 0.012) * 0.7) / sr;
        s[i] = Math.sin(ph) * Math.exp(-t / 0.025);
      }
      stamp(drips, dripsR, Math.floor(rand() * len), s, 0.5 + rand() * 0.5, rand() * 1.4 - 0.7);
    }
    const wetL = reverb(drips, sr, { size: 2.6, decay: 0.86, wet: 0.55 });
    const wetR = reverb(dripsR, sr, { size: 2.6, decay: 0.86, wet: 0.55, spread: 2.3 });
    addTo(L, R, wetL, 1, 0); addTo(L, R, wetR, 0, 1);
    const rumble = filtered(brown(noise(rand, len)), "lp", 110, 0.7, sr);
    const swell = slow(rand, len, 3, 3);
    for (let i = 0; i < len; i++) { const v = rumble[i] * (0.5 + 0.5 * swell[i]) * 0.9; L[i] += v; R[i] += v; }
    return finish(L, R, 0.12);
  },

  /* Bosque: hojas que se mueven y pájaros que cantan a ratos */
  bosque(sr) {
    const len = Math.round(sr * 18), rand = rng(67);
    const L = new Float32Array(len), R = new Float32Array(len);
    const sway = slow(rand, len, 6, 4);
    const leavesL = filtered(filtered(noise(rand, len), "bp", 2600, 0.8, sr), "lp", 6000, 0.7, sr);
    const leavesR = filtered(filtered(noise(rand, len), "bp", 2900, 0.8, sr), "lp", 6000, 0.7, sr);
    for (let i = 0; i < len; i++) { const g = 0.08 + 0.25 * sway[i] * sway[i]; L[i] += leavesL[i] * g; R[i] += leavesR[i] * g; }
    addTo(L, R, filtered(brown(noise(rand, len)), "lp", 160, 0.7, sr), 0.25);
    const chirp = (f0, f1, ms) => {
      const dur = Math.round(sr * ms / 1000), s = new Float32Array(dur);
      let ph = 0;
      for (let i = 0; i < dur; i++) {
        const t = i / dur;
        ph += TAU * (f0 + (f1 - f0) * t) / sr;
        s[i] = Math.sin(ph + 0.4 * Math.sin(ph * 0.5)) * Math.pow(Math.sin(Math.PI * t), 1.5);
      }
      return s;
    };
    const birds = [
      () => { const f = 2800 + rand() * 800; return [[f, f * 1.35, 70], [f * 1.1, f * 1.5, 60], [f, f * 1.35, 70]]; },
      () => { const f = 4200 + rand() * 900; return Array.from({ length: 4 + Math.floor(rand() * 4) }, () => [f, f * 0.75, 45]); },
      () => { const f = 2000 + rand() * 600; return [[f, f * 1.6, 160], [f * 1.6, f * 1.2, 220]]; }
    ];
    let at = Math.floor(rand() * sr);
    while (at < len) {
      const bird = birds[Math.floor(rand() * birds.length)];
      const pan = rand() * 1.8 - 0.9, gain = 0.12 + rand() * 0.18;
      let t = at;
      for (const [a, b, ms] of bird()) {
        stamp(L, R, t, chirp(a, b, ms), gain, pan);
        t += Math.round(sr * (ms + 40 + rand() * 50) / 1000);
      }
      at += Math.round(sr * (1.2 + rand() * 3));
    }
    return finish(L, R, 0.1);
  },

  /* Zumbido arcano: un acorde que late despacio y un brillo que va y viene.
     Las frecuencias dan vueltas enteras en los 12 segundos: no hay costura. */
  arcano(sr) {
    const T = 12, len = Math.round(sr * T);
    const L = new Float32Array(len), R = new Float32Array(len);
    const tones = [[55, 0.5, 0], [110, 0.6, 0.3], [110.5, 0.5, -0.3], [165, 0.35, 0.2], [220.25, 0.25, -0.2], [261.75, 0.12, 0.4],
      [1320, 0.05, -0.6], [1980.25, 0.04, 0.6], [2640.5, 0.03, 0]];
    for (const [f, a, pan] of tones) {
      const k = Math.round(f * T) / T;                // vueltas enteras
      const lfo = (1 + Math.floor(f % 3)) / T;
      const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const v = Math.sin(TAU * k * t + 0.6 * Math.sin(TAU * k * 2 * t)) * a * (0.6 + 0.4 * Math.sin(TAU * lfo * t + f));
        L[i] += v * gl; R[i] += v * gr;
      }
    }
    return finish(L, R, 0.11);
  },

  /* Tambores de guerra: un ritmo pesado, con su eco en la sala */
  tambores(sr) {
    const bpm = 96, beat = 60 / bpm, bars = 4, len = Math.round(sr * beat * 4 * bars), rand = rng(79);
    const L = new Float32Array(len), R = new Float32Array(len);
    const drum = (f, decay, click) => {
      const dur = Math.round(sr * decay * 5), s = new Float32Array(dur);
      let ph = 0;
      for (let i = 0; i < dur; i++) {
        const t = i / sr;
        ph += TAU * f * (1 + 1.2 * Math.exp(-t / 0.03)) / sr;
        s[i] = Math.sin(ph) * Math.exp(-t / decay) + (rand() * 2 - 1) * click * Math.exp(-t / 0.006);
      }
      return s;
    };
    const big = drum(52, 0.32, 0.35), mid = drum(88, 0.2, 0.3), high = drum(140, 0.12, 0.4);
    /* El compás: BUM . bum bum | BUM . tac . (en corcheas) */
    const pattern = [[0, big, 1, 0], [1, mid, 0.55, -0.3], [1.5, mid, 0.6, 0.3], [2, big, 0.9, 0], [3, high, 0.5, 0.4], [3.5, high, 0.35, -0.4]];
    for (let bar = 0; bar < bars; bar++) {
      for (const [b, s, g, pan] of pattern) {
        const accent = bar === bars - 1 && b >= 3 ? 1.25 : 1;
        stamp(L, R, Math.round((bar * 4 + b) * beat * sr), s, g * accent * (0.9 + rand() * 0.2), pan);
      }
    }
    const wetL = reverb(L, sr, { size: 1.8, decay: 0.8, wet: 0.35 });
    const wetR = reverb(R, sr, { size: 1.8, decay: 0.8, wet: 0.35, spread: 2.1 });
    return finish(wetL, wetR, 0.15);
  },

  /* Laúd: arpegios en re menor (re, do, si bemol, la), de cuerda pulsada */
  laud(sr) {
    const bpm = 92, eighth = 30 / bpm, len = Math.round(sr * eighth * 6 * 8), rand = rng(97);
    const L = new Float32Array(len), R = new Float32Array(len);
    const pluck = (f, secs, bright) => {
      const n = Math.round(sr * secs), p = Math.max(2, Math.round(sr / f));
      const line = new Float32Array(p);
      for (let i = 0; i < p; i++) line[i] = (rand() * 2 - 1) * (1 - bright) + (i < p / 2 ? 1 : -1) * bright;
      const s = new Float32Array(n);
      let prev = 0;
      for (let i = 0; i < n; i++) {
        const j = i % p, v = line[j];
        const next = 0.5 * (v + prev) * 0.997;
        prev = v;
        line[j] = next;
        s[i] = v * Math.min(1, i / 40);
      }
      return s;
    };
    const midi = m => 440 * Math.pow(2, (m - 69) / 12);
    /* Cada compás: bajo y un arpegio de seis corcheas */
    const chords = [
      [38, [50, 53, 57, 62, 57, 53]],      // re menor
      [36, [48, 52, 55, 60, 55, 52]],      // do
      [34, [46, 50, 53, 58, 53, 50]],      // si bemol
      [33, [45, 49, 52, 57, 52, 49]]       // la
    ];
    const tunes = [[], [64, 62, 60, 58], [65, 64, 62, 61], [69, 67, 65, 64]];
    for (let bar = 0; bar < 8; bar++) {
      const [bass, notes] = chords[bar % 4];
      const t0 = bar * 6 * eighth;
      stamp(L, R, Math.round(t0 * sr), pluck(midi(bass), 3, 0.2), 0.55, -0.25);
      notes.forEach((m, i) => stamp(L, R, Math.round((t0 + i * eighth) * sr), pluck(midi(m), 1.6, 0.35), 0.32, 0.15 + i * 0.03));
      /* Una melodía que entra en la segunda vuelta */
      if (bar >= 4) {
        const tune = tunes[bar % 4];
        tune.forEach((m, i) => { if (m) stamp(L, R, Math.round((t0 + i * eighth * 1.5) * sr), pluck(midi(m + 12), 1.2, 0.5), 0.3, 0.35); });
      } else if (bar === 3) {
        stamp(L, R, Math.round((t0 + 4.5 * eighth) * sr), pluck(midi(73), 1, 0.5), 0.25, 0.35);
      }
    }
    const wetL = reverb(L, sr, { size: 1.4, decay: 0.78, wet: 0.28 });
    const wetR = reverb(R, sr, { size: 1.4, decay: 0.78, wet: 0.28, spread: 1.7 });
    return finish(wetL, wetR, 0.12);
  }
};

export const hasPreset = id => Object.prototype.hasOwnProperty.call(PRESETS, id);

export function synthesize(id, sampleRate) {
  const make = PRESETS[id] || PRESETS.fuego;
  return make(Math.min(48000, Math.max(22050, sampleRate || 44100)));
}
