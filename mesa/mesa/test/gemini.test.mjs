/* Ayuda con Gemini contra un servidor que imita su API: la forma de la
   petición, leer la respuesta, esperar y reintentar si pide calma (429) y
   una clave mala.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const seen = [];
let calls = 0;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", d => (body += d));
  req.on("end", () => {
    calls++;
    const b = JSON.parse(body);
    seen.push({ url: req.url, key: req.headers["x-goog-api-key"], body: b });
    if (req.headers["x-goog-api-key"] === "AIzaMALA-0123456789012345678901234") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }));
    }
    if (calls === 1) {                                   // la primera vez, «calma»
      res.writeHead(429, { "Content-Type": "application/json", "retry-after": "1" });
      return res.end(JSON.stringify({ error: { code: 429, message: "Resource exhausted", status: "RESOURCE_EXHAUSTED" } }));
    }
    const answer = { rows: ["..#", "..#"], separators: [{ x: 0, y: 0, side: "right", kind: "door" }], notes: "" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      candidates: [{ content: { role: "model", parts: [{ text: "pensando…", thought: true }, { text: JSON.stringify(answer) }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 80 }
    }));
  });
});

test("Gemini: petición, reintento tras 429, respuesta y clave mala", async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const dir = await mkdtemp(path.join(tmpdir(), "mesa-gemini-"));
  try {
    const { createGemini } = await import("../gemini.js");
    const gemini = createGemini({ dataDir: dir });
    await gemini.init();
    assert.equal((await gemini.status()).key, "");
    await assert.rejects(gemini.setKey("hola"), /no parece una clave/);
    await gemini.setKey("AIzaBUENA-012345678901234567890123");

    const tile = { x0: 4, y0: 2, x1: 6, y1: 3, image: "AAAA" };
    const [out] = await gemini.walls([tile]);
    assert.deepEqual(out.answer.rows, ["..#", "..#"]);
    assert.equal(out.usage.input, 1200);
    assert.equal(calls, 2, "reintentó tras el 429");

    const req = seen[1];
    assert.match(req.url, /^\/v1beta\/models\/gemini-flash-latest:generateContent$/);
    assert.equal(req.body.contents[0].parts[0].inlineData.mimeType, "image/jpeg");
    assert.match(req.body.contents[0].parts[1].text, /x from 4 to 6/);
    assert.equal(req.body.generationConfig.responseMimeType, "application/json");
    assert.equal(req.body.generationConfig.responseJsonSchema.type, "object");
    assert.ok(req.body.systemInstruction.parts[0].text.includes("battle map"));

    await gemini.setKey("AIzaMALA-0123456789012345678901234");
    await assert.rejects(gemini.walls([tile]), err => err.status === 401 && /no es válida/.test(err.message));
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
