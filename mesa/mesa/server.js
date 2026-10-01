/* Mesa · servidor de partida
   Node 18+, sin dependencias. Sirve la aplicación, guarda el estado en disco
   y mantiene al día a todos los dispositivos conectados.

   node server.js [--port 8080] [--pin 1234] [--data ./data] [--cert cert.pem --key key.pem]

   Con --cert y --key (o MESA_CERT y MESA_KEY) sirve por HTTPS, que es lo que
   necesitan los móviles para instalar Mesa como aplicación.
*/
"use strict";

import { createServer } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync, createReadStream, statSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "./public/js/schema.js";
import { createEngine } from "./public/js/engine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "public");

/* ---------- Argumentos ---------- */
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = Number(process.env.PORT || arg("port", 8080));
const DATA = path.resolve(HERE, arg("data", "data"));
const IMAGES = path.join(DATA, "images");
const STATE_FILE = path.join(DATA, "mesa.json");
const CERT = process.env.MESA_CERT || arg("cert", "");
const KEY = process.env.MESA_KEY || arg("key", "");

/* ---------- Estado ----------
   Las reglas viven en public/js/engine.js; aquí solo hay red y disco. */
const rid = n => randomBytes(n).toString("hex");
const engine = createEngine({ rid, absorbImages: d => absorbLegacyImages(d), onPresence: () => broadcastPresence() });
const clients = engine.clients;   // testigo -> { id, name, role, charId, res }

const MAX_BODY = 24 * 1024 * 1024;   // 24 MB: cabe un plano grande
const IMG_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

async function boot() {
  await mkdir(IMAGES, { recursive: true });
  try {
    const saved = JSON.parse(await readFile(STATE_FILE, "utf8"));
    engine.doc = await absorbLegacyImages(migrate(saved.doc || saved));
    engine.pin = saved.pin || "";
    engine.loadClients(saved.clients);
    engine.purge();
  } catch { /* partida nueva */ }
  if (!engine.pin) engine.pin = process.env.MESA_PIN || arg("pin", "") || String(randomBytes(2).readUInt16BE() % 9000 + 1000);
  await persist();
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persist().catch(e => console.error("No se pudo guardar:", e.message)), 400);
}
async function persist() {
  const tmp = STATE_FILE + ".tmp";
  const doc = engine.doc;
  const saved = { pin: engine.pin, clients: engine.saveClients(), doc: { ...doc, session: { ...doc.session, alert: null, ping: null } } };
  await writeFile(tmp, JSON.stringify(saved, null, 1), "utf8");
  await rename(tmp, STATE_FILE);
}

/* ---------- Difusión ---------- */
let pushTimer = null;
function push() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const rev = engine.advance();
    for (const c of clients.values()) send(c, "state", { rev, doc: engine.snapshot(c) });
  }, 50);
  scheduleSave();
}
function send(client, event, payload) {
  if (!client.res || client.res.writableEnded) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch { /* se limpia al cerrarse */ }
}
function broadcastPresence() {
  const roster = engine.presence();
  for (const c of clients.values()) send(c, "presence", roster);
}

/* Las copias de la versión anterior llevaban los planos y los retratos dentro
   del propio archivo, en base64. Al entrar se sacan a la carpeta de imágenes:
   así el estado que viaja por la red se queda en unas pocas decenas de KB. */
async function absorbLegacyImages(d) {
  const save = async dataURL => {
    const [head, b64] = String(dataURL).split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1];
    const id = randomBytes(8).toString("hex") + "." + (IMG_TYPES[mime] || "png");
    await writeFile(path.join(IMAGES, id), Buffer.from(b64 || "", "base64"));
    return id;
  };
  for (const m of d.maps) {
    if (typeof m.image === "string" && m.image.startsWith("data:") && !m.imageId) m.imageId = await save(m.image);
    delete m.image;
  }
  for (const c of d.chars) {
    if (typeof c.avatar === "string" && c.avatar.startsWith("data:") && !c.avatarId) c.avatarId = await save(c.avatar);
    delete c.avatar;
  }
  return d;
}

/* ---------- HTTP ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json"
};

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
};

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", d => {
      size += d.length;
      if (size > limit) { reject(new Error("Archivo demasiado grande")); req.destroy(); return; }
      chunks.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* La aplicación se pide entera cada vez que alguien entra o recarga. Con
   ETag, el navegador pregunta «¿ha cambiado?» y el servidor contesta 304 sin
   mandar nada; y lo que sí viaja, va comprimido (unos 360 KB de código se
   quedan en menos de 100). Se guarda comprimido en memoria mientras el
   archivo no cambie. */
const gzCache = new Map();   // ruta -> { mtime, size, etag, gz }
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".webmanifest"]);

function serveStatic(req, res, file) {
  const st = statSync(file);
  const ext = path.extname(file);
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
    ETag: etag,
    Vary: "Accept-Encoding"
  };
  if (path.basename(file) === "sw.js") headers["Service-Worker-Allowed"] = "/";
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }

  const gzipOK = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
  if (gzipOK) {
    let hit = gzCache.get(file);
    if (!hit || hit.etag !== etag) {
      hit = { etag, gz: gzipSync(readFileSync(file), { level: 9 }) };
      gzCache.set(file, hit);
    }
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": hit.gz.length });
    return res.end(req.method === "HEAD" ? undefined : hit.gz);
  }
  res.writeHead(200, { ...headers, "Content-Length": st.size });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

const handler = async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const p = url.pathname;

  try {
    /* Con las direcciones de red del DM: «localhost» no le sirve a nadie más */
    if (p === "/api/hello") return json(res, 200, { ...engine.hello(), addresses: lanAddresses() });

    if (p === "/api/ping") {
      const ok = clients.has(url.searchParams.get("token") || "");
      return json(res, ok ? 200 : 401, { ok });
    }

    if (p === "/api/join" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8192)).toString() || "{}");
      const out = engine.join(body);
      if (out.error) return json(res, out.status || 403, { error: out.error });
      out.client.res = null;
      scheduleSave();
      return json(res, 200, { token: out.token, id: out.client.id, role: out.client.role, charId: out.client.charId });
    }

    if (p === "/api/stream") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write(": mesa\n\n");
      if (client.res && client.res !== res) { try { client.res.end(); } catch {} }
      client.res = res;
      engine.setOnline(client, true);
      engine.refresh();     // quien acaba de entrar recibe la visibilidad de ahora, no la de antes
      send(client, "state", { rev: engine.rev, doc: engine.snapshot(client) });
      broadcastPresence();
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
      req.on("close", () => {
        clearInterval(ping);
        /* Al reconectar, la conexión vieja puede cerrarse después de abrirse
           la nueva: solo cuenta si sigue siendo la suya. La sesión no se
           borra: un móvil bloqueado vuelve a su sitio al desbloquearse. */
        if (client.res !== res) return;
        client.res = null;
        engine.setOnline(client, false);
        broadcastPresence();
        scheduleSave();
      });
      return;
    }

    if (p === "/api/op" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString() || "{}");
      const client = clients.get(body.token || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const ops = Array.isArray(body.ops) ? body.ops : [body.op];
      const out = await engine.run(client, ops);
      if (out.applied) push();
      if (out.error) return json(res, 400, { error: out.error });
      return json(res, 200, { ok: true, charId: client.charId });
    }

    if (p === "/api/image" && req.method === "POST") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const mime = String(req.headers["content-type"] || "").split(";")[0];
      const ext = IMG_TYPES[mime];
      if (!ext) return json(res, 415, { error: "Formato de imagen no admitido" });
      const buf = await readBody(req);
      const id = randomBytes(8).toString("hex") + "." + ext;
      await writeFile(path.join(IMAGES, id), buf);
      return json(res, 200, { imageId: id, bytes: buf.length });
    }

    if (p.startsWith("/img/")) {
      const name = path.basename(p.slice(5));
      const file = path.join(IMAGES, name);
      if (!existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(name)] || "application/octet-stream",
        "Content-Length": statSync(file).size,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      return createReadStream(file).pipe(res);
    }

    /* Estático */
    const rel = p === "/" ? "index.html" : decodeURIComponent(p).replace(/^\/+/, "");
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC + path.sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No está aquí");
    }
    return serveStatic(req, res, file);
  } catch (err) {
    if (!res.headersSent) json(res, 500, { error: err.message });
    else res.end();
  }
};

const secure = !!(CERT && KEY);
const server = secure
  ? createSecureServer({ cert: readFileSync(path.resolve(CERT)), key: readFileSync(path.resolve(KEY)) }, handler)
  : createServer(handler);

/* ---------- Arranque ---------- */
function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) if (net.family === "IPv4" && !net.internal) out.push(`${secure ? "https" : "http"}://${net.address}:${PORT}`);
  }
  return out;
}
const lanIP = () => {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) if (net.family === "IPv4" && !net.internal) return net.address;
  }
  return "localhost";
};

await boot();
setInterval(() => engine.purge(), 3600 * 1000).unref();
server.listen(PORT, "0.0.0.0", () => {
  const ip = lanIP();
  const scheme = secure ? "https" : "http";
  console.log(`
  Mesa está en marcha${secure ? " (HTTPS)" : ""}.

  Tú (DM)        ${scheme}://localhost:${PORT}
  Tus jugadores  ${scheme}://${ip}:${PORT}
  Código del DM  ${engine.pin}

  Los datos se guardan en ${DATA}
  Para parar: Ctrl+C
`);
});

/* Al cerrar (Ctrl+C, o el sistema parando el proceso) se guarda lo último */
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    clearTimeout(saveTimer);
    try { await persist(); } catch (e) { console.error("No se pudo guardar:", e.message); }
    process.exit(0);
  });
}
