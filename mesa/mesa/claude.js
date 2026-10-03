/* Mesa · ayuda de la IA (Claude) para los muros del plano

   Corre solo en el ordenador del DM, dentro del servidor. La clave de la API
   no sale nunca de aquí: el navegador manda las partes del plano y recibe lo
   que Claude ha visto en cada una, nunca la clave.

   La clave se toma de ANTHROPIC_API_KEY (o de la configuración del SDK), o
   de la que el DM pegue en Mesa, que se guarda en data/claude.json.

   El SDK de Anthropic es una dependencia opcional: si no está instalado,
   Mesa funciona igual y esta ayuda dice cómo instalarlo. */

import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { AI_SYSTEM, AI_SCHEMA, aiQuestion } from "./public/js/aiwalls.js";

const MODEL = "claude-opus-5-5";
const PARALLEL = 3;          // partes que se preguntan a la vez

export function createClaude({ dataDir }) {
  const KEY_FILE = path.join(dataDir, "claude.json");
  let sdk;                   // undefined: sin mirar · null: no instalado
  let savedKey = "";

  async function loadSdk() {
    if (sdk !== undefined) return sdk;
    try { sdk = (await import("@anthropic-ai/sdk")).default; } catch { sdk = null; }
    return sdk;
  }

  async function loadKey() {
    try { savedKey = String(JSON.parse(await readFile(KEY_FILE, "utf8")).apiKey || ""); } catch { savedKey = ""; }
  }

  /* De dónde sale la clave: la de Mesa manda sobre la del entorno */
  const envKey = () => process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "";
  const keySource = () => (savedKey ? "mesa" : envKey() ? "env" : "");

  async function status() {
    await loadSdk();
    return { sdk: !!sdk, key: keySource(), model: MODEL };
  }

  async function setKey(key) {
    key = String(key || "").trim();
    if (!key) { savedKey = ""; await rm(KEY_FILE, { force: true }); return status(); }
    if (!/^sk-ant-[\w-]{20,}$/.test(key)) throw Object.assign(new Error("Eso no parece una clave de la API de Claude (empieza por sk-ant-)"), { status: 400 });
    savedKey = key;
    await writeFile(KEY_FILE, JSON.stringify({ apiKey: key }), { encoding: "utf8", mode: 0o600 });
    return status();
  }

  function client() {
    const Anthropic = sdk;
    return savedKey ? new Anthropic({ apiKey: savedKey }) : new Anthropic();
  }

  /* Una parte del plano: imagen (JPEG en base64) y qué casillas se preguntan */
  async function askTile(api, tile) {
    const stream = api.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: AI_SCHEMA } },
      system: [{ type: "text", text: AI_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: tile.image } },
          { type: "text", text: aiQuestion(tile) }
        ]
      }]
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new Error("Claude no ha querido analizar esta parte del plano");
    if (message.stop_reason === "max_tokens") throw new Error("La respuesta de Claude se ha cortado");
    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    let answer;
    try { answer = JSON.parse(text); } catch { throw new Error("Claude ha contestado algo que no se entiende"); }
    return { answer, usage: { input: message.usage.input_tokens, output: message.usage.output_tokens } };
  }

  /* Todas las partes, unas pocas a la vez. Una parte que falla no tira las
     demás: se devuelve su error y el navegador usa ahí la detección. */
  async function walls(tiles) {
    if (!await loadSdk()) throw Object.assign(new Error("Falta el módulo de la IA. Vuelve a abrir Mesa con «Abrir Mesa», o ejecuta npm install en su carpeta."), { status: 503 });
    if (!keySource()) throw Object.assign(new Error("Falta la clave de la API de Claude"), { status: 412 });
    const api = client();
    const Anthropic = sdk;
    const out = new Array(tiles.length);
    let next = 0;
    const worker = async () => {
      while (next < tiles.length) {
        const i = next++;
        try {
          out[i] = await askTile(api, tiles[i]);
        } catch (err) {
          /* Clave mala o sin saldo: no tiene sentido seguir con las demás */
          if (err instanceof Anthropic.AuthenticationError) throw Object.assign(new Error("La clave de la API de Claude no es válida"), { status: 401 });
          if (err instanceof Anthropic.PermissionDeniedError) throw Object.assign(new Error("Esa clave no tiene permiso para usar Claude"), { status: 403 });
          if (err instanceof Anthropic.RateLimitError) out[i] = { error: "Demasiadas peticiones seguidas a Claude; prueba en un minuto" };
          else if (err instanceof Anthropic.APIError) out[i] = { error: `Error de la API de Claude (${err.status ?? "sin respuesta"})` };
          else out[i] = { error: err.message };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, tiles.length) }, worker));
    return out;
  }

  return { init: loadKey, status, setKey, walls };
}
