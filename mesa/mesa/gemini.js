/* Mesa · ayuda de la IA con Gemini (Google), que tiene un plan gratuito

   Lo mismo que claude.js, con la API de Gemini: la misma pregunta, el mismo
   formato de respuesta y el mismo trato de la clave (solo en el ordenador del
   DM, en data/gemini.json, o en GEMINI_API_KEY).

   Sin dependencias: se llama a la API REST con fetch (Node 18+). La forma de
   la petición es la que monta el SDK oficial de Google (@google/genai) para
   generateContent en la API de Gemini:
     POST https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent
     cabecera x-goog-api-key, cuerpo { contents, systemInstruction, generationConfig }.

   El plan gratuito tiene un límite de peticiones por minuto: las partes se
   preguntan de una en una y, si Google pide calma (429), se espera y se
   reintenta. En el plan gratuito Google puede usar lo que se le manda para
   mejorar sus productos: la ventana lo avisa. */

import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { AI_SYSTEM, AI_SCHEMA, aiQuestion } from "./public/js/aiwalls.js";

/* El último Flash, que es el que tiene plan gratuito */
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const ENDPOINT = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com") + "/v1beta/models/";
const RETRIES = 3;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (status, message) => Object.assign(new Error(message), { status });

export function createGemini({ dataDir }) {
  const KEY_FILE = path.join(dataDir, "gemini.json");
  let savedKey = "";

  async function init() {
    try { savedKey = String(JSON.parse(await readFile(KEY_FILE, "utf8")).apiKey || ""); } catch { savedKey = ""; }
  }
  const envKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const key = () => savedKey || envKey();
  const keySource = () => (savedKey ? "mesa" : envKey() ? "env" : "");

  /* Siempre disponible: no depende de ningún módulo */
  const status = async () => ({ sdk: true, key: keySource(), model: MODEL });

  async function setKey(value) {
    value = String(value || "").trim();
    if (!value) { savedKey = ""; await rm(KEY_FILE, { force: true }); return status(); }
    if (!/^[\w-]{30,}$/.test(value)) throw fail(400, "Eso no parece una clave de la API de Gemini (suele empezar por AIza)");
    savedKey = value;
    await writeFile(KEY_FILE, JSON.stringify({ apiKey: value }), { encoding: "utf8", mode: 0o600 });
    return status();
  }

  async function askTile(tile) {
    const body = {
      systemInstruction: { parts: [{ text: AI_SYSTEM }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: tile.image } },
          { text: aiQuestion(tile) }
        ]
      }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: AI_SCHEMA, maxOutputTokens: 32768 }
    };
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(ENDPOINT + encodeURIComponent(MODEL) + ":generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
          body: JSON.stringify(body)
        });
      } catch {
        throw fail(502, "No se llega a Gemini: ¿hay internet en el ordenador del DM?");
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) return readAnswer(data);
      const why = (data.error && data.error.message) || "";
      /* Clave mala o sin permiso: no tiene sentido seguir con las demás */
      if (res.status === 400 && /api key/i.test(why)) throw fail(401, "La clave de la API de Gemini no es válida");
      if (res.status === 401 || res.status === 403) throw fail(403, "Esa clave no tiene permiso para usar Gemini");
      if (res.status === 404) throw fail(404, `Gemini no tiene el modelo ${MODEL}`);
      /* Demasiado deprisa para el plan gratuito, o Google ocupado: esperar */
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        const after = Number(res.headers.get("retry-after"));
        await sleep(after > 0 ? Math.min(after, 90) * 1000 : 15000 * (attempt + 1));
        continue;
      }
      if (res.status === 429) return { error: "Se ha acabado el cupo gratuito de Gemini por ahora; prueba más tarde" };
      return { error: `Error de la API de Gemini (${res.status})` };
    }
  }

  function readAnswer(data) {
    if (data.promptFeedback && data.promptFeedback.blockReason) return { error: "Gemini no ha querido analizar esta parte del plano" };
    const cand = (data.candidates || [])[0];
    if (!cand) return { error: "Gemini no ha contestado" };
    if (cand.finishReason === "MAX_TOKENS") return { error: "La respuesta de Gemini se ha cortado" };
    const text = ((cand.content && cand.content.parts) || []).filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("");
    try {
      const u = data.usageMetadata || {};
      return { answer: JSON.parse(text), usage: { input: u.promptTokenCount || 0, output: u.candidatesTokenCount || 0 } };
    } catch {
      return { error: "Gemini ha contestado algo que no se entiende" };
    }
  }

  /* De una en una: el plan gratuito no deja muchas por minuto */
  async function walls(tiles) {
    if (!keySource()) throw fail(412, "Falta la clave de la API de Gemini");
    const out = [];
    for (const tile of tiles) {
      try { out.push(await askTile(tile)); } catch (err) {
        if ([401, 403, 404, 502].includes(err.status)) throw err;
        out.push({ error: err.message });
      }
    }
    return out;
  }

  return { init, status, setKey, walls };
}
