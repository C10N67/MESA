/* Creador de personajes y manual: las cuentas de la ficha (vida, CA,
   mejoras, ataques, espacios) y que el manual se pueda leer y buscar.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBuild, CLASSES, SPECIES, BACKGROUNDS, SPELL_CLASSES, WEAPON_BY_ID, ORIGIN_FEATS } from "../public/js/rules.js";
import { SPELL_LIBRARY } from "../public/js/spells.js";
import { SKILLS } from "../public/js/schema.js";
import { EDITIONS, SECTIONS } from "../public/js/manual-data.js";

const base = (over = {}) => ({
  rules: "2024", cls: "guerrero", level: 1, subclass: "", skills: [], bg: "soldado", boost: { mode: "21", two: "str", one: "con" },
  species: "humano", speciesAsi: [], speciesSkill: "", freeSkills: [], method: "standard",
  base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, asi: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  hpMode: "avg", hpRolls: [], armor: null, shield: null, weapons: null, kit: null, spells: [], ...over
});

test("guerrero de 2024 con trasfondo de soldado", () => {
  const d = computeBuild(base());
  assert.equal(d.scores.str, 17);          // 15 + 2 del trasfondo
  assert.equal(d.scores.con, 15);          // 14 + 1
  assert.equal(d.hp, 10 + 2);              // d10 entero + Constitución
  assert.equal(d.ac, 16 + 2);              // cota de malla y escudo
  assert.equal(d.pb, 2);
  assert.ok(d.skills.has("atletismo") && d.skills.has("intimidacion"));
  const sword = d.attacks.find(x => x.a.name === "Espada larga");
  assert.equal(sword.a.atk, 3 + 2);
  assert.equal(sword.a.damage, "1d8+3");
  assert.deepEqual(d.resources.map(r => r.name), ["Tomar aliento"]);
  assert.equal(d.caster, false);
});

test("en 2014 las mejoras vienen de la raza", () => {
  const d = computeBuild(base({ rules: "2014", cls: "mago", bg: "erudito", species: "elfo",
    base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 } }));
  assert.equal(d.scores.dex, 16);
  assert.equal(d.scores.int, 16);
  assert.ok(d.skills.has("percepcion"));   // sentidos agudos del elfo
  assert.equal(d.ac, 10 + 3);              // sin armadura
  assert.deepEqual(d.slots.slice(0, 2), [2, 0]);
  assert.equal(d.caster, true);
});

test("el semielfo reparte sus +1 y no puede ponerlos en Carisma", () => {
  const d = computeBuild(base({ rules: "2014", cls: "bardo", bg: "animador", species: "semielfo", speciesAsi: ["dex", "cha"] }));
  assert.equal(d.bonus.cha, 2);
  assert.equal(d.bonus.dex, 1);
});

test("defensa sin armadura del bárbaro y del monje", () => {
  const scores = { str: 15, dex: 14, con: 14, int: 8, wis: 12, cha: 10 };
  const barb = computeBuild(base({ cls: "barbaro", base: scores, boost: { mode: "111" } }));
  assert.equal(barb.ac, 10 + 2 + 2);     // Des 15 (+2) y Con 15 (+2), sin escudo
  const monk = computeBuild(base({ cls: "monje", bg: "ermitano", base: { str: 10, dex: 15, con: 13, int: 8, wis: 14, cha: 12 }, boost: { mode: "21", two: "wis", one: "con" } }));
  assert.equal(monk.ac, 10 + 2 + 3);
  assert.ok(monk.attacks.some(x => x.a.name === "Golpe sin armas" && x.a.damage.startsWith("1d6")));
});

test("subir de nivel: vida media, mejoras, competencia y espacios", () => {
  const d = computeBuild(base({ level: 5, asi: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }));
  assert.equal(d.pb, 3);
  assert.equal(d.scores.str, 19);
  assert.equal(d.hp, 12 + 4 * (6 + 2));
  const pal = computeBuild(base({ cls: "paladin", level: 5 }));
  assert.deepEqual(pal.slots.slice(0, 3), [4, 2, 0]);
  const pal14 = computeBuild(base({ rules: "2014", cls: "paladin", bg: "soldado", species: "humano", level: 1 }));
  assert.equal(pal14.slots[0], 0);        // en 2014 el paladín empieza a lanzar a nivel 2
  const lock = computeBuild(base({ cls: "brujo", level: 5 }));
  assert.deepEqual(lock.slots.slice(0, 3), [0, 0, 2]);
});

test("la dote Duro y la dureza enana suman vida", () => {
  const farmer = computeBuild(base({ bg: "granjero", boost: { mode: "21", two: "str", one: "con" }, level: 3 }));
  const plain = computeBuild(base({ level: 3 }));
  assert.equal(farmer.hp - plain.hp, 6);
  const dwarf = computeBuild(base({ species: "enano", level: 3 }));
  assert.equal(dwarf.hp - plain.hp, 3);
});

test("la armadura pesada no resta la Destreza baja", () => {
  const d = computeBuild(base({ base: { str: 15, dex: 8, con: 14, int: 13, wis: 12, cha: 10 } }));
  assert.equal(d.ac, 16 + 2);
  const light = computeBuild(base({ armor: "cuero", shield: false, base: { str: 15, dex: 8, con: 14, int: 13, wis: 12, cha: 10 } }));
  assert.equal(light.ac, 11 - 1);
});

test("ninguna característica pasa de 20", () => {
  const d = computeBuild(base({ method: "roll", base: { str: 20, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, level: 8, asi: { str: 4, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }));
  assert.equal(d.scores.str, 20);
});

test("los datos están bien enlazados", () => {
  const skills = new Set(SKILLS.map(([id]) => id));
  for (const c of CLASSES) {
    for (const k of c.skills.from) assert.ok(skills.has(k), `${c.id}: ${k}`);
    for (const k of c.saves) assert.ok(["str", "dex", "con", "int", "wis", "cha"].includes(k));
    for (const id of c.gear.weapons) assert.ok(WEAPON_BY_ID.has(id), `${c.id}: ${id}`);
    assert.ok(c.features.length > 3, c.id);
  }
  for (const rules of ["2014", "2024"]) {
    for (const b of BACKGROUNDS[rules]) {
      for (const k of b.skills) assert.ok(skills.has(k), `${b.id}: ${k}`);
      if (rules === "2024") { assert.equal(b.abilities.length, 3, b.id); assert.ok(ORIGIN_FEATS[b.feat], b.feat); }
    }
    for (const s of SPECIES[rules]) assert.ok(s.traits.length, s.id);
  }
  const ids = new Set(SPELL_LIBRARY.map(s => s.id));
  for (const id of Object.keys(SPELL_CLASSES)) assert.ok(ids.has(id), id);
  for (const s of SPELL_LIBRARY) assert.ok(SPELL_CLASSES[s.id], "sin clase: " + s.id);
});

test("el manual tiene todas las ediciones y se puede buscar", async () => {
  /* Las páginas de catálogo («page») se pintan desde los datos del SRD 5.2 */
  for (const e of EDITIONS) assert.ok(e.page || SECTIONS.some(s => s.ed === e.id), e.id);
  for (const s of SECTIONS) assert.ok(EDITIONS.some(e => e.id === s.ed), s.title);
  const fold = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const has = w => SECTIONS.filter(s => fold(s.title + s.text).includes(fold(w))).map(s => s.ed);
  assert.ok(has("THAC0").includes("add2"));
  assert.ok(has("agarrar").includes("quick"));
  assert.ok(has("CC-BY-4.0").includes("credits"));
  /* Las tablas tienen las mismas columnas en cada fila */
  for (const s of SECTIONS) {
    const rows = s.text.split("\n").map(l => l.trim()).filter(l => l.startsWith("|"));
    if (!rows.length) continue;
    const n = rows[0].replace(/^\||\|$/g, "").split("|").length;
    for (const r of rows) assert.equal(r.replace(/^\||\|$/g, "").split("|").length, n, `${s.title}: ${r}`);
  }
});

test("cada especie tiene su retrato de serie, de hombre y de mujer", async () => {
  const { existsSync } = await import("node:fs");
  const { defaultPortrait, isDefaultPortrait } = await import("../public/js/rules.js");
  for (const rules of ["2014", "2024"]) for (const s of SPECIES[rules]) for (const look of ["m", "f"]) {
    const id = defaultPortrait(s.id, look);
    assert.ok(isDefaultPortrait(id), id);
    assert.ok(existsSync(new URL("../public/" + id, import.meta.url)), "falta " + id);
  }
  assert.equal(defaultPortrait("", "f"), "");
  assert.equal(isDefaultPortrait("0123abcd.webp"), false);
});
