/* La versión va igual en el código, en la hoja de estilos y en el trabajador
   de fondo: main.js compara las dos primeras para notar si el navegador mezcla
   una hoja vieja con código nuevo.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VERSION } from "../public/js/version.js";

const read = p => readFileSync(new URL("../public/" + p, import.meta.url), "utf8");

test("la versión es la misma en version.js, mesa.css y sw.js", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(read("css/mesa.css").match(/--mesa-version:\s*"([^"]+)"/)[1], VERSION);
  assert.equal(read("sw.js").match(/const VERSION = "mesa-([^"]+)"/)[1], VERSION);
  assert.ok(read("sw.js").includes('"js/version.js"'));
});
