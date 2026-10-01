/* Conexión con la partida. El servidor manda el estado ya filtrado según quién
   seas, así que la vista solo tiene que pintar lo que le llega. */

import { toast } from "./util.js";

/* Una sesión por papel, no una sola para todo el navegador. Si no, al abrir la
   pantalla de la party desde el mismo ordenador se reutilizaba la sesión del
   DM y la tele entraba como DM. */
const SESSION_KEY = "mesa.sessions";
const ROLE_ORDER = ["dm", "player", "screen"];

export const store = {
  session: null,      // { token, id, role, charId, name }
  doc: null,
  presence: [],
  online: false
};

const listeners = { state: [], presence: [], status: [] };
export const onState = fn => listeners.state.push(fn);
export const onPresence = fn => listeners.presence.push(fn);
export const onStatus = fn => listeners.status.push(fn);
const emit = (kind, payload) => listeners[kind].forEach(fn => fn(payload));

function allSessions() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch { return {}; }
}

export function savedSession(role) {
  const all = allSessions();
  if (role) return all[role] || null;
  for (const r of ROLE_ORDER) if (all[r]) return all[r];
  return null;
}

export function saveSession(s) {
  store.session = s;
  const all = allSessions();
  all[s.role] = s;
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

/* Salir: se olvida esta sesión y se vuelve al menú, sin el ?role pegado en la
   dirección para que se puedan elegir los tres papeles otra vez. */
export function leave() {
  forgetSession();
  location.href = "/";
}

export function forgetSession(role) {
  const which = role || (store.session && store.session.role);
  const all = allSessions();
  if (which) delete all[which]; 
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  if (!role || !store.session || store.session.role === which) store.session = null;
}

export async function join({ name, role, pin, charId }) {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, pin, charId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo entrar");
  saveSession({ ...data, name });
  return data;
}

export async function lobby() {
  const res = await fetch("/api/hello");
  return res.json();
}

/* ---------- Flujo de estado ---------- */
let source = null;
let retry = 0;

export function connect() {
  if (!store.session) return;
  if (source) source.close();
  source = new EventSource("/api/stream?token=" + encodeURIComponent(store.session.token));

  source.addEventListener("state", e => {
    retry = 0;
    if (!store.online) { store.online = true; emit("status", true); }
    const payload = JSON.parse(e.data);
    store.doc = payload.doc;
    if (payload.doc.you) store.session.charId = payload.doc.you;
    emit("state", store.doc);
  });

  source.addEventListener("presence", e => {
    store.presence = JSON.parse(e.data);
    emit("presence", store.presence);
  });

  source.onerror = () => {
    if (store.online) { store.online = false; emit("status", false); }
    source.close();
    retry = Math.min(retry + 1, 8);
    setTimeout(async () => {
      // Si el servidor se reinició, el testigo ya no vale y hay que volver a entrar
      const alive = await fetch("/api/ping?token=" + encodeURIComponent(store.session.token))
        .then(r => r.status !== 401).catch(() => true);
      if (!alive) { forgetSession(); location.reload(); return; }
      connect();
    }, Math.min(4000, 400 * retry));
  };
}

let queue = [];
let flushing = false;

/* Las operaciones se agrupan: cien clics de daño no son cien peticiones. */
export function op(type, extra = {}) {
  queue.push({ type, ...extra });
  if (!flushing) {
    flushing = true;
    queueMicrotask(flush);
  }
  return true;
}

async function flush() {
  const ops = queue;
  queue = [];
  flushing = false;
  if (!ops.length || !store.session) return;
  try {
    const res = await fetch("/api/op", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: store.session.token, ops })
    });
    if (res.status === 401) { forgetSession(); location.reload(); return; }
    const data = await res.json();
    if (!res.ok) toast(data.error || "No se pudo aplicar el cambio", "bad");
  } catch {
    toast("Sin conexión con la partida", "bad");
  }
}

export async function uploadImage(blob) {
  const res = await fetch("/api/image?token=" + encodeURIComponent(store.session.token), {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/webp" },
    body: blob
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
  return data.imageId;
}

/* Atajos de uso frecuente */
export const patchChar = (id, fields) => op("char.patch", { id, fields });
export const patchSession = fields => op("session.patch", { fields });
export const patchMap = (id, fields) => op("map.patch", { id, fields });
export const addLog = entry => op("log.add", { entry });
