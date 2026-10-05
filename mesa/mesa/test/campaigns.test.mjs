/* Campañas y parties: empezar una nueva o cargar otra guarda primero la de ahora, y
   «deshacer» no cruza de una campaña a otra.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../public/js/engine.js";

function setup() {
  const shelf = new Map();
  const campaigns = {
    async list() { return [...shelf.values()].map(v => v.meta); },
    async get(id) { return shelf.has(id) ? JSON.parse(JSON.stringify(shelf.get(id).doc)) : null; },
    async put(id, meta, doc) { shelf.set(id, { meta, doc }); },
    async remove(id) { shelf.delete(id); }
  };
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0"), campaigns });
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  return { engine, dm, shelf };
}
const names = engine => engine.doc.chars.filter(c => !c.probe).map(c => c.name);

test("una mesa recién estrenada no aparece en la lista ni se guarda", async () => {
  const { engine, dm, shelf } = setup();
  assert.deepEqual(await engine.listCampaigns(), []);
  await engine.run(dm, [{ type: "campaign.new", title: "La mina perdida" }]);
  assert.equal(shelf.size, 0);
  assert.equal(engine.doc.session.title, "La mina perdida");
  const list = await engine.listCampaigns();
  assert.equal(list.length, 1);
  assert.equal(list[0].current, true);
});

test("empezar otra guarda la de ahora, y se puede volver a ella", async () => {
  const { engine, dm, shelf } = setup();
  await engine.run(dm, [{ type: "campaign.new", title: "La mina perdida" }]);
  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Aria" } }]);
  const mina = engine.doc.campaignId;
  await engine.run(dm, [{ type: "campaign.new", title: "Strahd" }]);
  assert.equal(shelf.size, 1);
  assert.deepEqual(names(engine), []);
  const list = await engine.listCampaigns();
  assert.deepEqual(list.map(c => c.title), ["Strahd", "La mina perdida"]);
  assert.deepEqual(list[1].pcs, ["Aria"]);

  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Ireena" } }]);
  await engine.run(dm, [{ type: "campaign.load", id: mina }]);
  assert.equal(engine.doc.session.title, "La mina perdida");
  assert.deepEqual(names(engine), ["Aria"]);
  assert.equal(shelf.size, 2, "Strahd se ha guardado al cambiar");
});

test("deshacer no vuelve a la campaña de antes", async () => {
  const { engine, dm } = setup();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Aria" } }]);
  await engine.run(dm, [{ type: "campaign.new", title: "Dos" }]);
  const out = await engine.run(dm, [{ type: "undo" }]);
  assert.equal(out.error, "No queda nada que deshacer");
  assert.equal(engine.doc.session.title, "Dos");
});

test("un jugador con un personaje que en la otra campaña no existe se queda sin él", async () => {
  const { engine, dm } = setup();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Aria" } }]);
  const aria = engine.doc.chars.find(c => c.name === "Aria").id;
  const player = engine.join({ role: "player", name: "Ana", charId: aria }, { checkPin: false }).client;
  assert.equal(player.charId, aria);
  await engine.run(dm, [{ type: "campaign.new", title: "Dos" }]);
  assert.equal(player.charId, null);
});

test("solo el DM cambia de campaña, y la que está en juego no se borra", async () => {
  const { engine, dm } = setup();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  const player = engine.join({ role: "player", name: "Ana" }, { checkPin: false }).client;
  assert.equal((await engine.run(player, [{ type: "campaign.new", title: "Mía" }])).error, "Solo el DM");
  assert.equal((await engine.run(dm, [{ type: "campaign.remove", id: engine.doc.campaignId }])).error, "Es la campaña que está en juego");
  assert.equal((await engine.run(dm, [{ type: "campaign.load", id: "nope" }])).error, "No se encuentra esa campaña");
});

test("borrar una campaña guardada", async () => {
  const { engine, dm, shelf } = setup();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Aria" } }]);
  const uno = engine.doc.campaignId;
  await engine.run(dm, [{ type: "campaign.new", title: "Dos" }]);
  await engine.run(dm, [{ type: "campaign.remove", id: uno }]);
  assert.equal(shelf.size, 0);
  assert.deepEqual((await engine.listCampaigns()).map(c => c.title), ["Dos"]);
});

/* ---------- Parties guardadas ---------- */
function withParties() {
  const shelves = { campaigns: new Map(), parties: new Map() };
  const make = m => ({
    async list() { return [...m.values()].map(v => v.meta); },
    async get(id) { return m.has(id) ? JSON.parse(JSON.stringify(m.get(id).doc)) : null; },
    async put(id, meta, doc) { m.set(id, { meta, doc }); },
    async remove(id) { m.delete(id); }
  });
  let n = 0;
  const engine = createEngine({ rid: k => (++n).toString(16).padStart(k * 2, "0"), campaigns: make(shelves.campaigns), parties: make(shelves.parties) });
  const dm = engine.join({ role: "dm", name: "DM" }, { checkPin: false }).client;
  return { engine, dm, shelves };
}

test("guardar la party y empezar otra campaña con ella", async () => {
  const { engine, dm, shelves } = withParties();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  await engine.run(dm, [{ type: "char.add", chars: [{ kind: "pc", name: "Aria", level: 3, hp: 5, maxHp: 21, mx: 2, my: 2, mapId: engine.doc.maps[0].id }, { kind: "pc", name: "Borin", level: 3 }, { kind: "monster", name: "Goblin" }] }]);
  assert.equal((await engine.run(dm, [{ type: "party.save", name: "Los Hijos del Dragón" }])).error, null);
  assert.equal(shelves.parties.size, 1);
  assert.equal(engine.doc.session.partyName, "Los Hijos del Dragón");
  const [p] = await engine.listParties();
  assert.deepEqual(p.pcs, ["Aria", "Borin"], "solo los personajes, no los monstruos");

  await engine.run(dm, [{ type: "campaign.new", title: "Dos", partyId: p.id }]);
  assert.deepEqual(names(engine), ["Aria", "Borin"]);
  const aria = engine.doc.chars.find(c => c.name === "Aria");
  assert.equal(aria.level, 3);
  assert.equal(aria.hp, 5, "la ficha tal cual estaba");
  assert.equal(aria.mx, null, "sin sitio en el mapa");
  assert.equal(engine.doc.session.partyName, "Los Hijos del Dragón");
});

test("guardar otra vez con el mismo nombre la pone al día, y traerla no repite a nadie", async () => {
  const { engine, dm, shelves } = withParties();
  await engine.run(dm, [{ type: "campaign.new", title: "Uno" }]);
  await engine.run(dm, [{ type: "char.add", char: { kind: "pc", name: "Aria", level: 1 } }]);
  await engine.run(dm, [{ type: "party.save", name: "Grupo" }]);
  const id = engine.doc.chars[0].id;
  await engine.run(dm, [{ type: "char.patch", id, fields: { level: 4 } }]);
  await engine.run(dm, [{ type: "party.save", name: "grupo" }]);
  assert.equal(shelves.parties.size, 1);
  assert.deepEqual((await engine.listParties())[0].levels, [4]);
  const pid = (await engine.listParties())[0].id;
  assert.equal((await engine.run(dm, [{ type: "party.load", id: pid }])).error, "Esos personajes ya están en la mesa");
  await engine.run(dm, [{ type: "campaign.new", title: "Dos" }]);
  await engine.run(dm, [{ type: "party.load", id: pid }]);
  assert.deepEqual(names(engine), ["Aria"]);
  await engine.run(dm, [{ type: "party.remove", id: pid }]);
  assert.equal(shelves.parties.size, 0);
});

test("una party vacía no se guarda, y solo el DM guarda", async () => {
  const { engine, dm } = withParties();
  assert.equal((await engine.run(dm, [{ type: "party.save", name: "Nadie" }])).error, "No hay personajes que guardar");
  const player = engine.join({ role: "player", name: "Ana" }, { checkPin: false }).client;
  assert.equal((await engine.run(player, [{ type: "party.save", name: "Mía" }])).error, "Solo el DM");
});
