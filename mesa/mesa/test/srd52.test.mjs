/* Manual 5.5: los datos del SRD 5.2 traducidos (public/data/srd52) están
   completos, en castellano y bien enlazados.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = name => JSON.parse(readFileSync(new URL(`../public/data/srd52/${name}.json`, import.meta.url), "utf8"));
const spells = load("conjuros"), creatures = load("criaturas"), gear = load("equipo"), species = load("especies"), rules = load("reglas");

/* Si quedan varias palabras así en un texto, es que se quedó sin traducir */
const ENGLISH = /\b(the|you|your|with|creature|damage|feet|spell|which|each)\b/gi;
const english = text => (String(text).match(ENGLISH) || []).length >= 2;
const all = o => typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(all) : o && typeof o === "object" ? Object.entries(o).filter(([k]) => k !== "en" && k !== "id").flatMap(([, v]) => all(v)) : [];

test("están todos los conjuros, con sus datos", () => {
  assert.equal(spells.length, 339);
  assert.equal(new Set(spells.map(s => s.name)).size, 339, "nombres repetidos");
  assert.equal(spells.filter(s => s.level === 0).length, 27);
  const classes = new Set(["Bardo", "Brujo", "Clérigo", "Druida", "Explorador", "Hechicero", "Mago", "Paladín"]);
  for (const s of spells) {
    assert.ok(s.level >= 0 && s.level <= 9, s.id);
    assert.ok(s.classes.length && s.classes.every(c => classes.has(c)), s.id);
    for (const k of ["name", "school", "time", "range", "components", "duration", "text"]) assert.ok(s[k], `${s.id}: falta ${k}`);
  }
  const fireball = spells.find(s => s.id === "fireball");
  assert.equal(fireball.name, "Bola de fuego");
  assert.match(fireball.text, /8d6 de daño de fuego/);
  assert.match(fireball.higher, /^\*\*Usando un espacio de conjuro de nivel superior\.\*\*/);
  /* Los que a la fuente le faltaban párrafos, completos */
  assert.match(spells.find(s => s.id === "greater-invisibility").text, /Invisible/);
  assert.match(spells.find(s => s.id === "moonbeam").text, /cilindro/i);
});

test("están todas las criaturas, con su ficha", () => {
  assert.equal(creatures.length, 331);
  assert.ok(creatures.filter(c => c.group === "Animales").length > 80);
  for (const c of creatures) {
    assert.ok(c.ac > 0 && c.hp > 0, c.id);
    assert.equal(Object.keys(c.abilities).length, 6, c.id);
    /* Solo el chillón (una reacción) y la mosca gigante (una montura) no tienen acciones */
    if (!["shrieker-fungus", "giant-fly"].includes(c.id)) assert.ok(c.actions && c.actions.length, `${c.id}: sin acciones`);
    assert.ok(c.xp >= 10, c.id);
  }
  const wolf = creatures.find(c => c.id === "wolf");
  assert.equal(wolf.name, "Lobo");
  assert.match(wolf.actions[0].text, /^Tirada de ataque cuerpo a cuerpo: \+4/);
  const red = creatures.find(c => c.id === "adult-red-dragon");
  assert.ok(red.actions.some(a => a.name === "Aliento de fuego (Recarga 5–6)"));
  assert.ok(red.legendary.length >= 3);
  /* Las sagas recuperan su Magia de aquelarre, que faltaba en la fuente */
  for (const id of ["green-hag", "night-hag", "sea-hag"]) assert.ok(creatures.find(c => c.id === id).traits.some(t => /aquelarre/i.test(t.name)), id);
});

test("armas, armaduras, especies y reglas", () => {
  assert.equal(gear.weapons.length, 38);
  assert.equal(gear.armor.length, 13);
  const masteries = new Set(["Hendir", "Rozar", "Mella", "Empujar", "Debilitar", "Ralentizar", "Derribar", "Fastidiar"]);
  for (const w of gear.weapons) assert.ok(masteries.has(w.mastery), `${w.id}: ${w.mastery}`);
  assert.equal(gear.properties.filter(p => p.mastery).length, 8);
  assert.equal(species.length, 9);
  assert.equal(rules.conditions.length, 15);
  assert.ok(rules.chapters.length >= 10);
});

test("todo está en castellano", () => {
  const leftovers = [spells, creatures, gear, species, rules].flatMap(all).filter(english);
  assert.deepEqual(leftovers.slice(0, 5), []);
  /* Mesa dice «DM» */
  assert.ok(![spells, creatures, rules].flatMap(all).some(t => /director de juego|\bDJ\b/i.test(t)));
});
