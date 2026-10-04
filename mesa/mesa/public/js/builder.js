/* Mesa · crear un personaje paso a paso

   Al estilo de D&D Beyond: una barra con los pasos arriba (reglas, clase,
   trasfondo, especie, características, equipo, conjuros, detalles y
   resumen), tarjetas para elegir con lo que da cada opción a la vista, y la
   ficha se va calculando sola: vida, CA, competencias, salvaciones, ataques,
   espacios de conjuro y recursos de clase. Al final sale una ficha normal de
   Mesa, que se puede seguir retocando a mano.

   Lo elegido se guarda en la ficha («build»): así, para subir de nivel, se
   vuelve a abrir el creador donde se dejó. */

import { modal, esc, toast, shrinkImage, imgURL, initials, el, on } from "./util.js";
import { SKILLS, ABILITIES, normalizeChar, normalizeAttack, normalizeSpell, uid } from "./schema.js";
import {
  RULESETS, CLASSES, CLASS_BY_ID, SPECIES, BACKGROUNDS, ORIGIN_FEATS, WEAPONS, WEAPON_BY_ID, ARMORS, ARMOR_BY_ID, MASTERY,
  STANDARD_ARRAY, POINT_COST, POINT_BUDGET, SPELL_CLASSES, ABILITY_NAMES,
  byRules, featuresFor, cantripsKnown, asiCount, weaponProficient, armorProficient, spellSlots, proficiencyFor,
  computeBuild
} from "./rules.js";
import { SPELL_LIBRARY } from "./spells.js";
import { op, patchChar, uploadImage } from "./net.js";
import { icon } from "./icons.js";

const SKILL_NAME = Object.fromEntries(SKILLS.map(([id, name]) => [id, name]));
const SKILL_ABILITY = Object.fromEntries(SKILLS.map(([id, , ab]) => [id, ab]));
const AB = ABILITIES.map(([k]) => k);
const ABBR = Object.fromEntries(ABILITIES);
const signed = n => (n >= 0 ? "+" + n : String(n));
const ALIGNMENTS = ["Legal bueno", "Neutral bueno", "Caótico bueno", "Legal neutral", "Neutral", "Caótico neutral",
  "Legal malvado", "Neutral malvado", "Caótico malvado", "Sin alineamiento"];
const COLORS = ["#c89b4a", "#4f9d5d", "#8878d8", "#d99a2b", "#b8383b", "#3f8fb0", "#c06aa0", "#7a8a3a"];

/* ---------- Estado ---------- */
function freshState() {
  return {
    rules: "2024", cls: "", level: 1, subclass: "", skills: [],
    bg: "", boost: { mode: "21", two: "", one: "" },
    species: "", speciesAsi: [], speciesSkill: "", freeSkills: [],
    method: "standard", base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    asi: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, hpMode: "avg", hpRolls: [],
    armor: null, shield: null, weapons: null, kit: null, spells: [],
    name: "", player: "", alignment: "", color: COLORS[Math.floor(Math.random() * COLORS.length)], avatarId: "",
    languages: "Común", traits: "", ideals: "", bonds: "", flaws: "", appearance: ""
  };
}

/* Lo que se guarda en la ficha de Mesa */
function toChar(st, d, prev) {
  const { cls, sp, bg } = d;
  const feats = [
    ...featuresFor(cls, d.level, d.rules).map(f => `${cls.name} ${f.level} · ${f.name}: ${f.desc}`),
    ...(sp ? sp.traits.map(t => `${sp.name} · ${t.name}: ${t.desc}`) : []),
    ...(bg && bg.feature ? [`${bg.name} · ${bg.feature}`] : []),
    ...(d.feat ? [`Dote de origen · ${d.feat}: ${ORIGIN_FEATS[d.feat] || ""}`] : []),
    ...(d.rules === "2024" ? d.attacks.filter(x => x.w && byRules(cls.masteries, d.rules) && weaponProficient(cls, d.rules, x.w))
      .slice(0, byRules(cls.masteries, d.rules) || 0).map(x => `Maestría · ${x.w.name} (${x.w.mastery}): ${MASTERY[x.w.mastery]}`) : [])
  ];
  const armor = ARMOR_BY_ID.get(d.armorId);
  const spells = (st.spells || []).map(id => SPELL_LIBRARY.find(s => s.id === id)).filter(Boolean).map(s => normalizeSpell(s));
  const story = [
    st.traits && "Personalidad: " + st.traits, st.ideals && "Ideales: " + st.ideals, st.bonds && "Vínculos: " + st.bonds,
    st.flaws && "Defectos: " + st.flaws, st.appearance && "Aspecto: " + st.appearance
  ].filter(Boolean).join("\n");
  const fields = {
    kind: "pc", name: st.name.trim() || "Sin nombre", player: st.player, color: st.color, avatarId: st.avatarId,
    className: cls.name, race: sp ? sp.name : "", background: bg ? bg.name : "", alignment: st.alignment,
    subclass: st.subclass, level: d.level, rules: d.rules,
    maxHp: d.hp, ac: d.ac, speed: d.speed, proficiency: d.pb, hitDice: `${d.level}d${cls.die}`,
    ...d.scores,
    saves: [...cls.saves], skills: [...d.skills],
    vision: sp ? sp.vision || 0 : 0, size: sp ? sp.size : "Mediano",
    slots: d.slots, resources: d.resources.map(r => ({ name: r.name, uses: 0, max: r.max })),
    attacks: d.attacks.map(x => normalizeAttack(x.a)),
    weapons: d.attacks.map(x => `${x.a.name}: ${signed(x.a.atk)} al ataque, ${x.a.damage} ${x.a.type}` +
      (x.w && x.w.mastery && d.rules === "2024" ? ` (maestría: ${x.w.mastery})` : "")).join("\n"),
    inventory: [armor && armor.id ? armor.name : "", d.shield && cls.armor.includes("shield") ? "Escudo" : "", st.kit ?? byRules(cls.kit, d.rules)].filter(Boolean).join("\n"),
    languages: st.languages, features: feats.join("\n"),
    notes: story,
    castAbility: cls.cast || "", spellbook: spells.length ? spells : (prev ? prev.spellbook : []),
    spells: spells.length ? spells.map(s => `${s.level ? "Nivel " + s.level : "Truco"} · ${s.name}`).join("\n") : (prev ? prev.spells : ""),
    build: { ...st, avatarId: undefined }
  };
  return fields;
}

/* ---------- La ventana ---------- */
const STEPS = [
  ["rules", "Reglas"], ["class", "Clase"], ["background", "Trasfondo"], ["species", "Especie"],
  ["abilities", "Características"], ["equipment", "Equipo"], ["spells", "Conjuros"], ["details", "Detalles"], ["review", "Resumen"]
];

export function openBuilder({ char = null, isDM = true, onManual = null } = {}) {
  const st = { ...freshState(), ...(char && char.build ? JSON.parse(JSON.stringify(char.build)) : {}) };
  if (char) {
    st.name = char.name; st.player = char.player || ""; st.color = char.color; st.avatarId = char.avatarId || "";
    st.alignment = char.alignment || st.alignment;
  }
  const levelUp = !!(char && char.build);
  let step = levelUp ? "class" : "rules";

  const body = el(`<div class="bld">
    <nav class="bld-steps" data-steps></nav>
    <div class="bld-main" data-main></div>
    <footer class="bld-foot">
      <div class="bld-mini" data-mini></div>
      <span class="spacer"></span>
      <button type="button" class="btn" data-go="-1">Atrás</button>
      <button type="button" class="btn primary" data-go="1">Siguiente</button>
    </footer>
  </div>`);

  const stepsOn = () => {
    const d = computeBuild(st);
    return STEPS.filter(([id]) => id !== "spells" || d.caster);
  };
  const done = id => {
    if (id === "rules") return !!st.rules;
    if (id === "class") return !!st.cls;
    if (id === "background") return !!st.bg;
    if (id === "species") return !!st.species;
    if (id === "abilities") return st.method !== "standard" || new Set(Object.values(st.base)).size === 6;
    if (id === "details") return !!st.name.trim();
    return true;
  };

  function paint() {
    const list = stepsOn();
    if (!list.some(([id]) => id === step)) step = "details";
    const d = computeBuild(st);
    body.querySelector("[data-steps]").innerHTML = list.map(([id, label], i) => `<button type="button" data-step="${id}"
      aria-current="${id === step ? "step" : "false"}" class="${done(id) && id !== "review" ? "ok" : ""}">
      <span class="n">${done(id) && id !== "review" && id !== step ? icon("check", 13) : i + 1}</span>${label}</button>`).join("");
    const main = body.querySelector("[data-main]");
    main.innerHTML = VIEWS[step](d);
    main.scrollTop = 0;
    const idx = list.findIndex(([id]) => id === step);
    body.querySelector('[data-go="-1"]').disabled = idx === 0;
    const next = body.querySelector('[data-go="1"]');
    next.textContent = step === "review" ? (levelUp ? "Guardar cambios" : "Crear personaje") : "Siguiente";
    body.querySelector("[data-mini]").innerHTML = mini(d);
    const cur = body.querySelector('[aria-current="step"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  /* Lo esencial siempre a la vista, abajo */
  const mini = d => d.cls ? `<b>${esc(st.name || "Sin nombre")}</b> · ${esc(d.cls.name)} ${d.level}${d.sp ? " · " + esc(d.sp.name) : ""}
    <span class="pill">${icon("heart", 12)} ${d.hp} PV</span><span class="pill">${icon("shield", 12)} CA ${d.ac}</span>` : `<span class="muted">Elige una clase para empezar</span>`;

  /* ---------- Cada paso ---------- */
  const card = (attr, id, on, title, sub, extra = "") => `<button type="button" class="bld-card" ${attr}="${esc(id)}" aria-pressed="${on}">
    <b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}${extra}</button>`;

  const VIEWS = {
    rules: () => `<h3>¿Con qué reglas jugáis?</h3>
      <p class="prose small"><span>Como en D&amp;D Beyond, puedes crear el personaje con las reglas de 2024 o con las de 2014. Cambian sobre todo de dónde salen las mejoras de característica y algunos rasgos de clase.</span></p>
      <div class="bld-cards two">${RULESETS.map(([id, name, text]) => card("data-rules", id, st.rules === id, name, text)).join("")}</div>
      ${onManual && !levelUp ? `<p class="prose small" style="margin-top:16px"><span>¿Prefieres rellenar la ficha a mano, campo a campo?</span>
        <button type="button" class="btn sm" data-manual>Ficha en blanco</button></p>` : ""}`,

    class: d => {
      const cls = d.cls;
      return `<div class="row" style="align-items:end;margin-bottom:10px">
        <h3 style="margin:0;flex:1">Elige una clase</h3>
        <label class="field" style="margin:0;max-width:120px"><span>Nivel</span><input type="number" min="1" max="20" value="${d.level}" data-level></label>
      </div>
      <div class="bld-cards">${CLASSES.map(c => card("data-cls", c.id, st.cls === c.id, c.name,
        `d${c.die} · ${c.primary.map(k => ABILITY_NAMES[k]).join(" o ")}${c.caster ? " · conjuros" : ""}`)).join("")}</div>
      ${cls ? `<div class="bld-detail">
        <p class="prose"><span>${esc(cls.blurb)}</span></p>
        <dl class="bld-facts">
          <dt>Dado de golpe</dt><dd>d${cls.die} (${d.hp} PV a nivel ${d.level} con tu Constitución)</dd>
          <dt>Salvaciones</dt><dd>${cls.saves.map(k => ABILITY_NAMES[k]).join(" y ")}</dd>
          <dt>Armaduras</dt><dd>${(cls.armor || []).length ? cls.armor.map(k => ({ light: "ligeras", medium: "medias", heavy: "pesadas", shield: "escudos" })[k]).join(", ") : "ninguna"}</dd>
          <dt>Armas</dt><dd>${esc(weaponText(cls, d.rules))}</dd>
          ${cls.caster ? `<dt>Conjuros</dt><dd>con ${ABILITY_NAMES[cls.cast]}${cls.caster === "pact" ? " (magia del pacto)" : cls.caster === "half" ? " (medio lanzador)" : ""}</dd>` : ""}
        </dl>
        <h4>Habilidades: elige ${cls.skills.n}</h4>
        <div class="cond-grid">${cls.skills.from.map(k => {
          const lock = d.fixed.has(k);
          return `<label class="${lock ? "muted" : ""}" title="${lock ? "Ya la tienes por tu trasfondo o tu especie" : ""}">
            <input type="checkbox" data-skill="${k}" ${st.skills.includes(k) || lock ? "checked" : ""} ${lock ? "disabled" : ""}>${SKILL_NAME[k]}</label>`;
        }).join("")}</div>
        <p class="small muted">${st.skills.length} de ${cls.skills.n} elegidas</p>
        ${d.level >= byRules(cls.subclass.level, d.rules) ? `<label class="field"><span>Subclase (nivel ${byRules(cls.subclass.level, d.rules)})</span>
          <input data-subclass value="${esc(st.subclass)}" placeholder="${esc(cls.subclass.srd)}" list="bldSub"></label>
          <datalist id="bldSub"><option value="${esc(cls.subclass.srd)}"></datalist>` : `<p class="small muted">Subclase a nivel ${byRules(cls.subclass.level, d.rules)}.</p>`}
        <h4>Rasgos hasta nivel ${d.level}</h4>
        <div class="bld-feats">${featuresFor(cls, d.level, d.rules).map(f => `<details><summary><span class="pill">${f.level}</span> ${esc(f.name)}</summary><p>${esc(f.desc)}</p></details>`).join("")}</div>
        ${d.level > 1 ? `<h4>Vida</h4>
          <div class="row"><label class="check"><input type="radio" name="hpMode" value="avg" ${st.hpMode !== "roll" ? "checked" : ""}> Media fija</label>
          <label class="check"><input type="radio" name="hpMode" value="roll" ${st.hpMode === "roll" ? "checked" : ""}> Tirar los dados</label>
          ${st.hpMode === "roll" ? `<button type="button" class="btn sm" data-roll-hp>${icon("dice", 14)} Tirar ${d.level - 1}d${cls.die}</button>
            <span class="small muted">${(st.hpRolls || []).slice(0, d.level - 1).join(", ")}</span>` : ""}</div>` : ""}
      </div>` : ""}`;
    },

    background: d => {
      const list = BACKGROUNDS[st.rules];
      const bg = d.bg;
      return `<h3>Elige un trasfondo</h3>
      <p class="prose small"><span>${st.rules === "2024" ? "De dónde vienes: te da dos habilidades, una dote de origen y las mejoras de característica." : "De dónde vienes: te da dos habilidades y un rasgo."}</span></p>
      <div class="bld-cards">${list.map(b => card("data-bg", b.id, st.bg === b.id, b.name, b.skills.map(k => SKILL_NAME[k]).join(", "))).join("")}</div>
      ${bg ? `<div class="bld-detail">
        <p class="prose"><span>${esc(bg.blurb)}</span></p>
        <dl class="bld-facts">
          <dt>Habilidades</dt><dd>${bg.skills.map(k => SKILL_NAME[k]).join(" y ")}</dd>
          ${bg.feature ? `<dt>Rasgo</dt><dd>${esc(bg.feature)}</dd>` : ""}
          ${bg.feat ? `<dt>Dote de origen</dt><dd><b>${esc(bg.feat)}</b>: ${esc(ORIGIN_FEATS[bg.feat] || "")}</dd>` : ""}
        </dl>
        ${bg.abilities ? `<h4>Mejoras de característica</h4>
          <div class="row">
            <label class="check"><input type="radio" name="boost" value="21" ${st.boost.mode !== "111" ? "checked" : ""}> +2 a una y +1 a otra</label>
            <label class="check"><input type="radio" name="boost" value="111" ${st.boost.mode === "111" ? "checked" : ""}> +1 a las tres</label>
          </div>
          ${st.boost.mode !== "111" ? `<div class="cols2">
            <label class="field"><span>+2 a</span><select data-boost="two"><option value="">—</option>${bg.abilities.map(k => `<option value="${k}" ${st.boost.two === k ? "selected" : ""}>${ABILITY_NAMES[k]}</option>`).join("")}</select></label>
            <label class="field"><span>+1 a</span><select data-boost="one"><option value="">—</option>${bg.abilities.filter(k => k !== st.boost.two).map(k => `<option value="${k}" ${st.boost.one === k ? "selected" : ""}>${ABILITY_NAMES[k]}</option>`).join("")}</select></label>
          </div>` : `<p class="small">+1 a ${bg.abilities.map(k => ABILITY_NAMES[k]).join(", ")}.</p>`}` : ""}
      </div>` : ""}`;
    },

    species: d => {
      const list = SPECIES[st.rules];
      const sp = d.sp;
      return `<h3>Elige una ${st.rules === "2014" ? "raza" : "especie"}</h3>
      <div class="bld-cards">${list.map(s => card("data-species", s.id, st.species === s.id, s.name,
        `${s.size} · ${s.speed} pies${s.vision ? " · visión " + s.vision * 5 + " pies" : ""}`)).join("")}</div>
      ${sp ? `<div class="bld-detail">
        <p class="prose"><span>${esc(sp.blurb)}</span></p>
        ${st.rules === "2014" && sp.asi ? `<p class="small"><b>Mejoras:</b> ${Object.entries(sp.asi).map(([k, v]) => `${ABILITY_NAMES[k]} +${v}`).join(", ")}</p>` : ""}
        <div class="bld-feats">${sp.traits.map(t => `<details open><summary>${esc(t.name)}</summary><p>${esc(t.desc)}</p></details>`).join("")}</div>
        ${sp.choose ? `<h4>+${sp.choose.amount} a ${sp.choose.n} características</h4><div class="cond-grid">${AB.filter(k => !sp.choose.not.includes(k)).map(k =>
          `<label><input type="checkbox" data-sp-asi="${k}" ${st.speciesAsi.includes(k) ? "checked" : ""}>${ABILITY_NAMES[k]}</label>`).join("")}</div>` : ""}
        ${sp.skillChoice ? `<label class="field"><span>Sentidos agudos</span><select data-sp-skill><option value="">—</option>${sp.skillChoice.map(k => `<option value="${k}" ${st.speciesSkill === k ? "selected" : ""}>${SKILL_NAME[k]}</option>`).join("")}</select></label>` : ""}
        ${sp.freeSkills ? `<h4>Habilidades a tu elección: ${sp.freeSkills}</h4><div class="cond-grid">${SKILLS.map(([k, n]) => {
          const lock = d.fixed.has(k) || st.skills.includes(k);
          return `<label class="${lock ? "muted" : ""}"><input type="checkbox" data-free-skill="${k}" ${st.freeSkills.includes(k) || lock ? "checked" : ""} ${lock ? "disabled" : ""}>${n}</label>`;
        }).join("")}</div>` : ""}
      </div>` : ""}`;
    },

    abilities: d => {
      const used = Object.values(st.base);
      const spent = AB.reduce((n, k) => n + (POINT_COST[st.base[k]] ?? 99), 0);
      const asiN = d.cls ? asiCount(d.cls, d.level) : 0;
      const asiSpent = AB.reduce((n, k) => n + (st.asi[k] || 0), 0);
      return `<h3>Características</h3>
      <div class="row" style="margin-bottom:12px">
        ${[["standard", "Serie estándar"], ["points", "Compra por puntos"], ["roll", "Tirar o a mano"]].map(([k, l]) =>
          `<button type="button" class="chip" data-method="${k}" aria-pressed="${st.method === k}">${l}</button>`).join("")}
      </div>
      <p class="prose small"><span>${{
        standard: "Reparte 15, 14, 13, 12, 10 y 8, uno a cada característica.",
        points: `Todas empiezan en 8 y tienes ${POINT_BUDGET} puntos: subir a 13 cuesta 1 punto cada uno; 14 y 15, dos. Llevas ${spent} de ${POINT_BUDGET}.`,
        roll: "Tira 4d6 y quédate con los tres mejores, seis veces, o escribe los valores que hayáis acordado."
      }[st.method]}</span></p>
      ${st.method === "roll" ? `<button type="button" class="btn sm" data-roll-stats style="margin-bottom:10px">${icon("dice", 14)} Tirar 4d6 seis veces</button>` : ""}
      <table class="bld-scores">
        <thead><tr><th></th><th>Base</th><th>${d.rules === "2014" ? "Especie" : "Trasfondo"}</th>${asiN ? "<th>Mejoras</th>" : ""}<th>Total</th><th>Mod.</th></tr></thead>
        <tbody>${AB.map(k => `<tr${d.cls && d.cls.primary.includes(k) ? ' class="primary"' : ""}>
          <th>${ABILITY_NAMES[k]}</th>
          <td>${st.method === "standard"
            ? `<select data-base="${k}">${STANDARD_ARRAY.map(v => `<option value="${v}" ${st.base[k] === v ? "selected" : ""}>${v}${used.filter(x => x === v).length > 1 && st.base[k] === v ? " ⚠" : ""}</option>`).join("")}</select>`
            : st.method === "points"
              ? `<span class="stepper"><button type="button" data-pt="${k}" data-d="-1" ${st.base[k] <= 8 ? "disabled" : ""}>−</button><b>${st.base[k]}</b><button type="button" data-pt="${k}" data-d="1" ${st.base[k] >= 15 || spent + (POINT_COST[st.base[k] + 1] - POINT_COST[st.base[k]]) > POINT_BUDGET ? "disabled" : ""}>+</button></span>`
              : `<input type="number" min="3" max="20" value="${st.base[k]}" data-base="${k}">`}</td>
          <td>${d.bonus[k] ? "+" + d.bonus[k] : "—"}</td>
          ${asiN ? `<td><span class="stepper"><button type="button" data-asi="${k}" data-d="-1" ${!st.asi[k] ? "disabled" : ""}>−</button><b>${st.asi[k] ? "+" + st.asi[k] : "0"}</b><button type="button" data-asi="${k}" data-d="1" ${asiSpent >= asiN * 2 || d.scores[k] >= 20 ? "disabled" : ""}>+</button></span></td>` : ""}
          <td><b>${d.scores[k]}</b></td><td>${signed(d.mods[k])}</td></tr>`).join("")}</tbody>
      </table>
      ${st.method === "standard" && new Set(used).size !== 6 ? `<p class="small warn">Cada valor de la serie se usa una sola vez.</p>` : ""}
      ${asiN ? `<p class="small muted">Mejoras de característica por nivel: ${asiN} (${asiSpent} de ${asiN * 2} puntos repartidos). En vez de una mejora se puede coger una dote: apúntala en los rasgos.</p>` : ""}
      ${d.cls ? `<p class="small muted">${esc(d.cls.name)}: lo importante es ${d.cls.primary.map(k => ABILITY_NAMES[k]).join(" y ")}${d.cls.caster ? `; sus conjuros van con ${ABILITY_NAMES[d.cls.cast]}` : ""}.</p>` : ""}`;
    },

    equipment: d => {
      const cls = d.cls;
      if (!cls) return `<p class="prose">Elige primero una clase.</p>`;
      const kit = st.kit ?? byRules(cls.kit, d.rules);
      const canShield = (cls.armor || []).includes("shield");
      const masteries = byRules(cls.masteries, d.rules) || 0;
      return `<h3>Equipo</h3>
      <p class="prose small"><span><b>Equipo inicial de ${esc(cls.name)}:</b> ${esc(byRules(cls.kit, d.rules))}</span></p>
      <div class="cols2">
        <label class="field"><span>Armadura</span><select data-armor>${ARMORS.map(a => {
          const ok = armorProficient(cls, a);
          return `<option value="${a.id}" ${d.armorId === a.id ? "selected" : ""}>${esc(a.name)}${a.kind !== "none" ? ` (CA ${a.base}${a.dexMax ? a.dexMax < 99 ? " + Des máx. " + a.dexMax : " + Des" : ""})` : ""}${ok ? "" : " — sin competencia"}</option>`;
        }).join("")}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" data-shield ${d.shield ? "checked" : ""} ${canShield ? "" : "disabled"}> Escudo (+2 CA)${canShield ? "" : " — sin competencia"}</label>
      </div>
      ${cls.noMetal ? `<p class="small muted">Los druidas no llevan armadura ni escudo de metal.</p>` : ""}
      <p class="bld-big">${icon("shield", 18)} CA <b>${d.ac}</b>${cls.unarmored && !d.armorId ? ` <span class="small muted">defensa sin armadura</span>` : ""}</p>
      <h4>Armas${masteries && d.rules === "2024" ? ` <span class="small muted">· maestría con ${masteries}</span>` : ""}</h4>
      <div class="bld-weapons">${["simple", "marcial"].map(cat => `<div><h5>${cat === "simple" ? "Sencillas" : "Marciales"}</h5>
        ${WEAPONS.filter(w => w.cat === cat).map(w => {
          const prof = weaponProficient(cls, d.rules, w);
          return `<label class="${prof ? "" : "muted"}" title="${esc(w.dmg + " " + w.type + (d.rules === "2024" ? " · maestría: " + w.mastery : ""))}">
            <input type="checkbox" data-weapon="${w.id}" ${d.weaponIds.includes(w.id) ? "checked" : ""}> ${esc(w.name)} <small>${w.dmg}</small></label>`;
        }).join("")}</div>`).join("")}</div>
      ${d.attacks.length ? `<h4>Así atacas</h4><ul class="bld-attacks">${d.attacks.map(x => `<li><b>${esc(x.a.name)}</b> ${signed(x.a.atk)} al ataque · ${esc(x.a.damage)} ${esc(x.a.type)}${x.w && d.rules === "2024" && x.w.mastery ? ` <small class="muted">maestría: ${esc(x.w.mastery)}</small>` : ""}</li>`).join("")}</ul>` : ""}
      <label class="field"><span>Mochila y demás</span><textarea data-kit rows="3">${esc(kit)}</textarea></label>`;
    },

    spells: d => {
      const cls = d.cls;
      const lib = SPELL_LIBRARY.filter(s => (SPELL_CLASSES[s.id] || []).includes(cls.id) && (s.level === 0 ? cantripsKnown(cls, d.level) : s.level <= d.maxSpell));
      const prepared = byRules(cls.prepared, d.rules);
      const prepText = prepared === "wis+level" ? `${Math.max(1, d.mods.wis + d.level)} (Sabiduría + nivel)`
        : prepared === "int+level" ? `${Math.max(1, d.mods.int + d.level)} (Inteligencia + nivel) de tu libro`
          : prepared === "cha+half" ? `${Math.max(1, d.mods.cha + Math.floor(d.level / 2))} (Carisma + mitad de nivel)` : prepared === "known" ? "los que conozcas" : prepared;
      const chosen = new Set(st.spells);
      const nCantrips = lib.filter(s => !s.level && chosen.has(s.id)).length;
      return `<h3>Conjuros</h3>
      <p class="prose small"><span>${esc(cls.name)} lanza con ${ABILITY_NAMES[cls.cast]}: CD de salvación <b>${8 + d.pb + d.mods[cls.cast]}</b>, ataque de conjuro <b>${signed(d.pb + d.mods[cls.cast])}</b>.
        ${cantripsKnown(cls, d.level) ? `Trucos: <b>${cantripsKnown(cls, d.level)}</b>. ` : ""}${d.maxSpell ? `Conjuros preparados o conocidos a este nivel: <b>${esc(String(prepText))}</b>, hasta nivel ${d.maxSpell}.` : ""}</span></p>
      <div class="slots" style="margin-bottom:12px">${d.slots.map((n, i) => n ? `<span class="slot">${i + 1}º <b>${n}</b></span>` : "").join("")}</div>
      <p class="small muted">Estos son los de la biblioteca de Mesa (los que la mesa sabe resolver sola). Los demás se pueden añadir después a mano en la ficha.</p>
      ${[0, 1, 2, 3, 4, 5].filter(lv => lib.some(s => s.level === lv)).map(lv => `<h4>${lv ? "Nivel " + lv : `Trucos (${nCantrips}/${cantripsKnown(cls, d.level)})`}</h4>
        <div class="cond-grid">${lib.filter(s => s.level === lv).map(s => `<label title="${esc(s.desc)}"><input type="checkbox" data-spell="${s.id}" ${chosen.has(s.id) ? "checked" : ""}>${esc(s.name)}</label>`).join("")}</div>`).join("")}`;
    },

    details: () => `<h3>Detalles</h3>
      <div class="row" style="align-items:flex-start">
        <div style="flex:0 0 96px">
          <div class="avatar" data-avatar style="width:78px;height:78px;font-size:22px;--tone:${esc(st.color)};${st.avatarId ? `background-image:url(${imgURL(st.avatarId)});background-size:cover` : ""}">${st.avatarId ? "" : initials(st.name || "?")}</div>
          <button type="button" class="btn sm" data-pick-avatar style="margin-top:8px;width:78px">Retrato</button>
          <input type="file" data-avatar-file accept="image/*" hidden>
        </div>
        <div style="flex:1 1 300px">
          <div class="cols2">
            <label class="field"><span>Nombre</span><input data-text="name" value="${esc(st.name)}" placeholder="¿Cómo se llama?" maxlength="40"></label>
            <label class="field"><span>Jugador</span><input data-text="player" value="${esc(st.player)}"></label>
            <label class="field"><span>Alineamiento</span><select data-text="alignment"><option value="">—</option>${ALIGNMENTS.map(a => `<option ${st.alignment === a ? "selected" : ""}>${a}</option>`).join("")}</select></label>
            <label class="field"><span>Idiomas</span><input data-text="languages" value="${esc(st.languages)}"></label>
          </div>
          <div class="row">${COLORS.map(c => `<button type="button" class="swatch" data-color="${c}" aria-pressed="${st.color === c}" style="--sw:${c}" title="Color de la ficha"></button>`).join("")}</div>
        </div>
      </div>
      <div class="cols2">
        <label class="field"><span>Personalidad</span><textarea data-text="traits" rows="2">${esc(st.traits)}</textarea></label>
        <label class="field"><span>Ideales</span><textarea data-text="ideals" rows="2">${esc(st.ideals)}</textarea></label>
        <label class="field"><span>Vínculos</span><textarea data-text="bonds" rows="2">${esc(st.bonds)}</textarea></label>
        <label class="field"><span>Defectos</span><textarea data-text="flaws" rows="2">${esc(st.flaws)}</textarea></label>
      </div>
      <label class="field"><span>Aspecto</span><textarea data-text="appearance" rows="2">${esc(st.appearance)}</textarea></label>`,

    review: d => {
      if (!d.cls) return `<p class="prose">Falta la clase.</p>`;
      const missing = [!d.bg && "trasfondo", !d.sp && (st.rules === "2014" ? "raza" : "especie"), !st.name.trim() && "nombre",
        st.skills.length < d.cls.skills.n && "habilidades de clase"].filter(Boolean);
      return `<div class="bld-sheet">
        <header><div class="avatar" style="--tone:${esc(st.color)};${st.avatarId ? `background-image:url(${imgURL(st.avatarId)});background-size:cover` : ""}">${st.avatarId ? "" : initials(st.name || "?")}</div>
          <div><h3>${esc(st.name || "Sin nombre")}</h3><small>${esc([d.sp && d.sp.name, d.cls.name + " " + d.level, st.subclass, d.bg && d.bg.name].filter(Boolean).join(" · "))} · reglas de ${d.rules}</small></div></header>
        <div class="bld-stats">
          <span><small>PV</small><b>${d.hp}</b></span><span><small>CA</small><b>${d.ac}</b></span>
          <span><small>Velocidad</small><b>${d.speed}</b></span><span><small>Competencia</small><b>+${d.pb}</b></span>
          <span><small>Iniciativa</small><b>${signed(d.mods.dex + (d.feat === "Alerta" ? d.pb : 0))}</b></span>
        </div>
        <div class="abilities">${AB.map(k => `<div class="abil"><span>${ABBR[k]}</span><b>${d.scores[k]}</b><small>${signed(d.mods[k])}</small></div>`).join("")}</div>
        <dl class="bld-facts">
          <dt>Salvaciones</dt><dd>${d.cls.saves.map(k => `${ABILITY_NAMES[k]} ${signed(d.mods[k] + d.pb)}`).join(", ")}</dd>
          <dt>Habilidades</dt><dd>${[...d.skills].map(k => `${SKILL_NAME[k]} ${signed(d.mods[SKILL_ABILITY[k]] + d.pb)}`).join(", ") || "—"}</dd>
          <dt>Ataques</dt><dd>${d.attacks.map(x => `${esc(x.a.name)} ${signed(x.a.atk)} (${esc(x.a.damage)})`).join(", ") || "—"}</dd>
          ${d.resources.length ? `<dt>Recursos</dt><dd>${d.resources.map(r => `${esc(r.name)} ${r.max}`).join(", ")}</dd>` : ""}
          ${d.slots.some(Boolean) ? `<dt>Espacios</dt><dd>${d.slots.map((n, i) => n ? `${i + 1}º×${n}` : "").filter(Boolean).join(" ")}</dd>` : ""}
          ${st.spells.length ? `<dt>Conjuros</dt><dd>${st.spells.map(id => esc((SPELL_LIBRARY.find(s => s.id === id) || {}).name || id)).join(", ")}</dd>` : ""}
          ${d.feat ? `<dt>Dote</dt><dd>${esc(d.feat)}</dd>` : ""}
          ${d.sp && d.sp.vision ? `<dt>Visión</dt><dd>en la oscuridad, ${d.sp.vision * 5} pies</dd>` : ""}
        </dl>
        ${missing.length ? `<p class="warn small">Falta: ${missing.join(", ")}. Puedes crearlo igual y completarlo luego.</p>` : ""}
      </div>`;
    }
  };

  /* ---------- Interacción ---------- */
  const set = (fn, repaint = true) => { fn(); if (repaint) paint(); };
  on(body, "click", "[data-step]", (e, b) => set(() => { step = b.dataset.step; }));
  on(body, "click", "[data-rules]", (e, b) => set(() => {
    if (st.rules !== b.dataset.rules) { st.rules = b.dataset.rules; st.bg = ""; st.species = ""; st.speciesAsi = []; st.speciesSkill = ""; st.freeSkills = []; st.boost = { mode: "21", two: "", one: "" }; }
  }));
  on(body, "click", "[data-cls]", (e, b) => set(() => {
    if (st.cls !== b.dataset.cls) { st.cls = b.dataset.cls; st.skills = []; st.subclass = ""; st.armor = null; st.shield = null; st.weapons = null; st.kit = null; st.spells = []; }
  }));
  on(body, "click", "[data-bg]", (e, b) => set(() => { st.bg = b.dataset.bg; st.boost = { mode: st.boost.mode, two: "", one: "" }; st.skills = st.skills.filter(k => !(BACKGROUNDS[st.rules].find(x => x.id === st.bg) || { skills: [] }).skills.includes(k)); }));
  on(body, "click", "[data-species]", (e, b) => set(() => { st.species = b.dataset.species; st.speciesAsi = []; st.speciesSkill = ""; st.freeSkills = []; }));
  on(body, "click", "[data-method]", (e, b) => set(() => {
    st.method = b.dataset.method;
    st.base = st.method === "points" ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } : st.method === "standard" ? { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } : { ...st.base };
  }));
  on(body, "click", "[data-pt]", (e, b) => set(() => { const k = b.dataset.pt; st.base[k] = Math.max(8, Math.min(15, st.base[k] + +b.dataset.d)); }));
  on(body, "click", "[data-asi]", (e, b) => set(() => { const k = b.dataset.asi; st.asi[k] = Math.max(0, (st.asi[k] || 0) + +b.dataset.d); }));
  on(body, "click", "[data-roll-stats]", () => set(() => {
    for (const k of AB) {
      const r = [1, 2, 3, 4].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
      st.base[k] = r[1] + r[2] + r[3];
    }
  }));
  on(body, "click", "[data-roll-hp]", () => set(() => {
    const cls = CLASS_BY_ID.get(st.cls);
    st.hpRolls = Array.from({ length: 19 }, () => 1 + Math.floor(Math.random() * cls.die));
  }));
  on(body, "click", "[data-color]", (e, b) => set(() => { st.color = b.dataset.color; }));
  on(body, "click", "[data-manual]", () => { win.close(); onManual(); });
  on(body, "click", "[data-pick-avatar]", () => body.querySelector("[data-avatar-file]").click());
  on(body, "change", "[data-avatar-file]", async (e, input) => {
    if (!input.files[0]) return;
    try {
      const { blob } = await shrinkImage(input.files[0], 192);
      st.avatarId = await uploadImage(blob);
      paint();
    } catch (err) { toast(err.message, "bad"); }
  });
  on(body, "change", "input, select, textarea", (e, t) => {
    const ds = t.dataset;
    if ("level" in ds) return set(() => { st.level = Math.max(1, Math.min(20, Math.trunc(+t.value || 1))); });
    if ("skill" in ds) return set(() => {
      const cls = CLASS_BY_ID.get(st.cls);
      if (t.checked && st.skills.length >= cls.skills.n) { t.checked = false; toast(`${cls.name}: ${cls.skills.n} habilidades`, "bad"); return; }
      st.skills = t.checked ? [...st.skills, ds.skill] : st.skills.filter(k => k !== ds.skill);
    });
    if ("freeSkill" in ds) return set(() => {
      const sp = SPECIES[st.rules].find(s => s.id === st.species);
      if (t.checked && st.freeSkills.length >= sp.freeSkills) { t.checked = false; return; }
      st.freeSkills = t.checked ? [...st.freeSkills, ds.freeSkill] : st.freeSkills.filter(k => k !== ds.freeSkill);
    });
    if ("spAsi" in ds) return set(() => {
      const sp = SPECIES[st.rules].find(s => s.id === st.species);
      if (t.checked && st.speciesAsi.length >= sp.choose.n) { t.checked = false; return; }
      st.speciesAsi = t.checked ? [...st.speciesAsi, ds.spAsi] : st.speciesAsi.filter(k => k !== ds.spAsi);
    });
    if ("spSkill" in ds) return set(() => { st.speciesSkill = t.value; });
    if ("subclass" in ds) return set(() => { st.subclass = t.value.slice(0, 60); }, false);
    if (t.name === "hpMode") return set(() => { st.hpMode = t.value; if (t.value === "roll" && !st.hpRolls.length) st.hpRolls = []; });
    if (t.name === "boost") return set(() => { st.boost = { mode: t.value, two: "", one: "" }; });
    if ("boost" in ds) return set(() => { st.boost[ds.boost] = t.value; if (ds.boost === "two" && st.boost.one === t.value) st.boost.one = ""; });
    if ("base" in ds) return set(() => { st.base[ds.base] = Math.max(3, Math.min(20, Math.trunc(+t.value || 8))); });
    if ("armor" in ds) return set(() => { st.armor = t.value; });
    if ("shield" in ds) return set(() => { st.shield = t.checked; });
    if ("weapon" in ds) return set(() => {
      const d = computeBuild(st);
      st.weapons = t.checked ? [...d.weaponIds, ds.weapon] : d.weaponIds.filter(id => id !== ds.weapon);
    });
    if ("kit" in ds) return set(() => { st.kit = t.value; }, false);
    if ("spell" in ds) return set(() => { st.spells = t.checked ? [...st.spells, ds.spell] : st.spells.filter(id => id !== ds.spell); });
    if ("text" in ds) return set(() => { st[ds.text] = t.value.slice(0, 500); }, ds.text === "alignment");
  });
  /* El nombre y los textos se apuntan al escribir, sin repintar */
  on(body, "input", "[data-text]", (e, t) => { st[t.dataset.text] = t.value; body.querySelector("[data-mini]").innerHTML = mini(computeBuild(st)); });

  on(body, "click", "[data-go]", (e, b) => {
    const list = stepsOn();
    const idx = list.findIndex(([id]) => id === step);
    if (+b.dataset.go > 0 && step === "review") return finish();
    if (+b.dataset.go > 0 && step === "class" && !st.cls) return toast("Elige una clase", "bad");
    const next = list[Math.max(0, Math.min(list.length - 1, idx + +b.dataset.go))];
    step = next[0];
    paint();
  });

  function finish() {
    const d = computeBuild(st);
    if (!d.cls) { step = "class"; paint(); return toast("Falta la clase", "bad"); }
    if (!st.name.trim()) { step = "details"; paint(); return toast("Ponle un nombre", "bad"); }
    const fields = toChar(st, d, char);
    if (char) {
      /* Al subir de nivel se conserva el daño que lleve encima */
      const lost = Math.max(0, (char.maxHp || 0) - (char.hp || 0));
      patchChar(char.id, { ...fields, hp: Math.max(0, fields.maxHp - lost), slotsUsed: fields.slots.map((n, i) => Math.min(n, (char.slotsUsed || [])[i] || 0)) });
      toast(`${fields.name} actualizado`, "good");
    } else {
      const fresh = normalizeChar({ ...fields, id: uid(), hp: fields.maxHp });
      op("char.add", { char: fresh });
      toast(fresh.name + " se sienta a la mesa", "good");
    }
    win.close();
  }

  const win = modal({
    title: levelUp ? `${char.name}: subir de nivel o cambiar` : "Crear personaje",
    body, wide: true,
    actions: []
  });
  win.body.closest(".modal").classList.add("builder");
  if (levelUp) { st.level = Math.min(20, (char.level || st.level) + 1); toast(`Nivel ${st.level}: revisa la vida, las mejoras y los conjuros`); }
  paint();
  return win;
}

function weaponText(cls, rules) {
  const list = byRules(cls.weapons, rules) || [];
  return list.map(x => x === "simple" ? "sencillas" : x === "marcial" ? "marciales" : x === "marcial-ligera" ? "marciales ligeras"
    : x === "marcial-sutil-ligera" ? "marciales sutiles o ligeras" : (WEAPON_BY_ID.get(x) || { name: x }).name.toLowerCase()).join(", ");
}
