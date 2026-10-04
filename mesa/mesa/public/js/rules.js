/* Mesa · lo que hace falta para crear un personaje

   Clases, especies, trasfondos, armas y armaduras de la 5.ª edición, en las
   dos versiones que conviven en las mesas: la de 2014 y la revisión de 2024.
   Es la parte de reglas del documento de referencia (SRD 5.1 y SRD 5.2 de
   Wizards of the Coast, publicados con licencia Creative Commons CC-BY-4.0),
   resumida y escrita aquí en español; lo que solo está en el Manual del
   jugador va como nombre y mecánica, sin su texto.

   Sin nada del navegador: lo usan el creador de personajes y las pruebas. */

/* ---------- Habilidades y competencias ---------- */
const ALL_SKILLS = ["acrobacias", "arcanos", "atletismo", "enganio", "historia", "interpretacion", "intimidacion",
  "investigacion", "juego_de_manos", "medicina", "naturaleza", "percepcion", "perspicacia", "persuasion",
  "religion", "sigilo", "supervivencia", "trato_con_animales"];

export const RULESETS = [
  ["2024", "Reglas de 2024", "La revisión de la 5.ª edición (Manual del jugador de 2024). Las mejoras de característica vienen del trasfondo, que además da una dote de origen; la especie no las da. Todas las clases eligen subclase a nivel 3 y las armas tienen maestría."],
  ["2014", "Reglas de 2014", "La 5.ª edición original. La raza da las mejoras de característica y el trasfondo, dos habilidades y un rasgo. Cada clase elige subclase a su nivel (1, 2 o 3)."]
];

export const ABILITY_NAMES = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };

/* ---------- Armas ----------
   [id, nombre, dados, tipo de daño, «simple»/«marcial», propiedades, maestría (2024)]
   Propiedades: f sutil, l ligera, t arrojadiza, r a distancia, 2 a dos manos,
   h pesada, a alcance, v versátil (con su dado) */
const W = (id, name, dmg, type, cat, props = "", mastery = "", versatile = "") =>
  ({ id, name, dmg, type, cat, props, mastery, versatile });
export const WEAPONS = [
  W("daga", "Daga", "1d4", "perforante", "simple", "flt", "Mella"),
  W("garrote", "Garrote", "1d4", "contundente", "simple", "l", "Ralentizar"),
  W("gran-clava", "Gran clava", "1d8", "contundente", "simple", "2", "Empujar"),
  W("hacha-de-mano", "Hacha de mano", "1d6", "cortante", "simple", "lt", "Fastidiar"),
  W("jabalina", "Jabalina", "1d6", "perforante", "simple", "t", "Ralentizar"),
  W("martillo-ligero", "Martillo ligero", "1d4", "contundente", "simple", "lt", "Mella"),
  W("maza", "Maza", "1d6", "contundente", "simple", "", "Debilitar"),
  W("baston", "Bastón", "1d6", "contundente", "simple", "v", "Derribar", "1d8"),
  W("hoz", "Hoz", "1d4", "cortante", "simple", "l", "Mella"),
  W("lanza", "Lanza", "1d6", "perforante", "simple", "tv", "Debilitar", "1d8"),
  W("ballesta-ligera", "Ballesta ligera", "1d8", "perforante", "simple", "r2", "Ralentizar"),
  W("dardo", "Dardo", "1d4", "perforante", "simple", "frt", "Fastidiar"),
  W("arco-corto", "Arco corto", "1d6", "perforante", "simple", "r2", "Fastidiar"),
  W("honda", "Honda", "1d4", "contundente", "simple", "r", "Ralentizar"),
  W("hacha-de-batalla", "Hacha de batalla", "1d8", "cortante", "marcial", "v", "Derribar", "1d10"),
  W("mangual", "Mangual", "1d8", "contundente", "marcial", "", "Debilitar"),
  W("guja", "Guja", "1d10", "cortante", "marcial", "2ha", "Rozar"),
  W("gran-hacha", "Gran hacha", "1d12", "cortante", "marcial", "2h", "Hendir"),
  W("espadon", "Espadón", "2d6", "cortante", "marcial", "2h", "Rozar"),
  W("alabarda", "Alabarda", "1d10", "cortante", "marcial", "2ha", "Hendir"),
  W("espada-larga", "Espada larga", "1d8", "cortante", "marcial", "v", "Debilitar", "1d10"),
  W("mazo", "Mazo", "2d6", "contundente", "marcial", "2h", "Derribar"),
  W("lucero-del-alba", "Lucero del alba", "1d8", "perforante", "marcial", "", "Debilitar"),
  W("pica", "Pica", "1d10", "perforante", "marcial", "2ha", "Empujar"),
  W("estoque", "Estoque", "1d8", "perforante", "marcial", "f", "Fastidiar"),
  W("cimitarra", "Cimitarra", "1d6", "cortante", "marcial", "fl", "Mella"),
  W("espada-corta", "Espada corta", "1d6", "perforante", "marcial", "fl", "Fastidiar"),
  W("tridente", "Tridente", "1d6", "perforante", "marcial", "tv", "Derribar", "1d8"),
  W("pico-de-guerra", "Pico de guerra", "1d8", "perforante", "marcial", "", "Debilitar"),
  W("martillo-de-guerra", "Martillo de guerra", "1d8", "contundente", "marcial", "v", "Empujar", "1d10"),
  W("latigo", "Látigo", "1d4", "cortante", "marcial", "fa", "Ralentizar"),
  W("ballesta-de-mano", "Ballesta de mano", "1d6", "perforante", "marcial", "rl", "Fastidiar"),
  W("ballesta-pesada", "Ballesta pesada", "1d10", "perforante", "marcial", "r2h", "Empujar"),
  W("arco-largo", "Arco largo", "1d8", "perforante", "marcial", "r2h", "Ralentizar")
];
export const WEAPON_BY_ID = new Map(WEAPONS.map(w => [w.id, w]));
export const MASTERY = {
  Hendir: "Al impactar, otro ataque gratis contra una criatura a 5 pies del objetivo (una vez por turno).",
  Rozar: "Si fallas, el objetivo recibe igualmente tu modificador de característica como daño.",
  Mella: "El ataque extra de la acción adicional de luchar con dos armas sale dentro de la acción de Atacar.",
  Empujar: "Al impactar, empujas al objetivo 10 pies (si es Grande o menor).",
  Debilitar: "Al impactar, el objetivo tiene desventaja en su próxima tirada de ataque.",
  Ralentizar: "Al impactar y hacer daño, su velocidad baja 10 pies hasta tu próximo turno.",
  Derribar: "Al impactar, salvación de Constitución o cae derribado.",
  Fastidiar: "Al impactar y hacer daño, tienes ventaja en tu próximo ataque contra él."
};

/* ---------- Armaduras ---------- */
export const ARMORS = [
  { id: "", name: "Sin armadura", kind: "none", base: 10, dexMax: 99 },
  { id: "acolchada", name: "Acolchada", kind: "light", base: 11, dexMax: 99, stealth: true },
  { id: "cuero", name: "Cuero", kind: "light", base: 11, dexMax: 99 },
  { id: "cuero-tachonado", name: "Cuero tachonado", kind: "light", base: 12, dexMax: 99 },
  { id: "pieles", name: "Pieles", kind: "medium", base: 12, dexMax: 2 },
  { id: "camisa-de-malla", name: "Camisa de malla", kind: "medium", base: 13, dexMax: 2 },
  { id: "cota-de-escamas", name: "Cota de escamas", kind: "medium", base: 14, dexMax: 2, stealth: true },
  { id: "coraza", name: "Coraza", kind: "medium", base: 14, dexMax: 2 },
  { id: "media-armadura", name: "Media armadura", kind: "medium", base: 15, dexMax: 2, stealth: true },
  { id: "cota-de-anillas", name: "Cota de anillas", kind: "heavy", base: 14, dexMax: 0, stealth: true },
  { id: "cota-de-malla", name: "Cota de malla", kind: "heavy", base: 16, dexMax: 0, str: 13, stealth: true },
  { id: "bandas", name: "Bandas", kind: "heavy", base: 17, dexMax: 0, str: 15, stealth: true },
  { id: "placas", name: "Placas", kind: "heavy", base: 18, dexMax: 0, str: 15, stealth: true }
];
export const ARMOR_BY_ID = new Map(ARMORS.map(a => [a.id, a]));

/* ---------- Espacios de conjuro ---------- */
const FULL = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
/* Brujo: pocos espacios, todos del nivel más alto que tenga */
const PACT = [null, [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];

export function spellSlots(cls, level, rules) {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!cls || !cls.caster) return out;
  let row = [];
  if (cls.caster === "full") row = FULL[level];
  else if (cls.caster === "half") row = rules === "2014" && level < 2 ? [] : FULL[Math.ceil(level / 2)];
  else if (cls.caster === "pact") { const [n, lv] = PACT[level]; out[lv - 1] = n; return out; }
  row.forEach((n, i) => { out[i] = n; });
  return out;
}

/* Trucos que se conocen según el nivel: [nivel 1, desde 4, desde 10] */
const cantripsAt = (base, level) => base[0] + (level >= 4 ? 1 : 0) + (level >= 10 ? 1 : 0);

export const proficiencyFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);

/* ---------- Clases ----------
   features: [nivel, nombre, qué hace, versión (opcional: solo en «2014» o «2024»)] */
const F = (level, name, desc, v) => ({ level, name, desc, v });

export const CLASSES = [
  {
    id: "barbaro", name: "Bárbaro", die: 12, primary: ["str"], saves: ["str", "con"],
    blurb: "Un guerrero feroz que entra en furia en combate: aguanta golpes que tumbarían a cualquiera y pega más fuerte que nadie.",
    armor: ["light", "medium", "shield"], weapons: ["simple", "marcial"],
    skills: { n: 2, from: ["trato_con_animales", "atletismo", "intimidacion", "naturaleza", "percepcion", "supervivencia"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Senda del Berserker" },
    unarmored: "con", masteries: { 2024: 2 },
    kit: { 2014: "Gran hacha (o un arma marcial cuerpo a cuerpo), dos hachas de mano (o un arma simple), paquete de explorador y cuatro jabalinas.",
      2024: "Gran hacha, cuatro hachas de mano, paquete de explorador y 15 po." },
    gear: { armor: "", shield: false, weapons: ["gran-hacha", "hacha-de-mano"] },
    resources: (l, m, rules) => [{ name: "Furia", max: l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2 }],
    features: [
      F(1, "Furia", "Acción adicional: ventaja en pruebas y salvaciones de Fuerza, daño extra con armas de Fuerza (+2, +3 a nivel 9, +4 a nivel 16) y resistencia al daño contundente, cortante y perforante. No puedes lanzar conjuros mientras dura."),
      F(1, "Defensa sin armadura", "Sin armadura, tu CA es 10 + Destreza + Constitución. Puedes llevar escudo."),
      F(1, "Maestría con armas", "Usas la propiedad de maestría de dos tipos de arma que domines.", "2024"),
      F(2, "Ataque temerario", "En tu primer ataque del turno puedes atacar con ventaja; a cambio, los ataques contra ti la tienen hasta tu próximo turno."),
      F(2, "Sentir el peligro", "Ventaja en las salvaciones de Destreza si no estás incapacitado."),
      F(3, "Senda primaria", "Tu subclase. En el SRD: Senda del Berserker (frenesí: más daño en furia)."),
      F(3, "Conocimiento primario", "Una habilidad más de la lista de la clase y, en furia, puedes usar Fuerza para algunas pruebas de Destreza o Sabiduría.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Ataque adicional", "Atacas dos veces al usar la acción de Atacar."),
      F(5, "Movimiento rápido", "+10 pies de velocidad sin armadura pesada."),
      F(7, "Instinto salvaje", "Ventaja en la iniciativa."),
      F(9, "Crítico brutal", "Un dado de daño extra en los críticos (dos a nivel 13, tres a nivel 17).", "2014"),
      F(9, "Golpe brutal", "Si renuncias a la ventaja del ataque temerario, el golpe hace 1d10 más y añade un efecto.", "2024"),
      F(11, "Furia implacable", "Si caes a 0 PV en furia, salvación de Constitución (CD 10, sube 5 cada vez) para quedarte con vida."),
      F(15, "Furia persistente", "La furia solo acaba si caes inconsciente o tú decides."),
      F(18, "Fuerza indomable", "Si una prueba de Fuerza saca menos que tu Fuerza, usas tu Fuerza."),
      F(20, "Campeón primordial", "+4 a Fuerza y a Constitución, y su máximo sube.")
    ]
  },
  {
    id: "bardo", name: "Bardo", die: 8, primary: ["cha"], saves: ["dex", "cha"],
    blurb: "Músico, poeta y embaucador. Su magia sale de la música: inspira a los suyos, cura y confunde al enemigo, y sabe un poco de todo.",
    armor: ["light"], weapons: { 2014: ["simple", "ballesta-de-mano", "espada-larga", "estoque", "espada-corta"], 2024: ["simple"] },
    skills: { n: 3, from: ALL_SKILLS },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Colegio del Conocimiento" },
    caster: "full", cast: "cha", cantrips: [2], prepared: { 2014: 4, 2024: 4 },
    kit: { 2014: "Estoque (o espada larga o un arma simple), paquete de diplomático o de animador, un laúd u otro instrumento, armadura de cuero y una daga.",
      2024: "Armadura de cuero, dos dagas, un instrumento musical, paquete de animador y 19 po." },
    gear: { armor: "cuero", shield: false, weapons: ["estoque", "daga"] },
    resources: (l, m) => [{ name: "Inspiración bárdica", max: Math.max(1, m.cha) }],
    features: [
      F(1, "Lanzamiento de conjuros", "Conjuros de bardo con Carisma. La música o un instrumento te sirven de canalizador."),
      F(1, "Inspiración bárdica", "Acción adicional: un aliado gana un dado (d6; d8 a nivel 5, d10 a 10, d12 a 15) que suma a una tirada. Usos: tu modificador de Carisma."),
      F(2, "Aprendiz de todo", "La mitad de tu bonificador de competencia en las pruebas en las que no eres competente."),
      F(2, "Canción de descanso", "En un descanso corto, los aliados que gasten dados de golpe curan un d6 más.", "2014"),
      F(2, "Pericia", "Doble competencia en dos habilidades (dos más a nivel 9; en 2014, a niveles 3 y 10)."),
      F(3, "Colegio de bardo", "Tu subclase. En el SRD: Colegio del Conocimiento (más habilidades y palabras cortantes)."),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Fuente de inspiración", "La inspiración bárdica se recupera también con un descanso corto."),
      F(6, "Contraencantamiento", "Con tu música, ventaja contra quedar asustado o hechizado para los que te oyen.", "2014"),
      F(7, "Contraencanto", "Reacción: alguien a 30 pies repite una salvación contra quedar hechizado o asustado.", "2024"),
      F(10, "Secretos mágicos", "Aprendes conjuros de cualquier lista."),
      F(20, "Inspiración superior / Palabras de creación", "El broche de la clase: en 2014 recuperas inspiración al tirar iniciativa; en 2024 tienes siempre preparados Palabra de poder: curar y Palabra de poder: matar.")
    ]
  },
  {
    id: "clerigo", name: "Clérigo", die: 8, primary: ["wis"], saves: ["wis", "cha"],
    blurb: "La voz de un dios en el mundo. Cura, protege y castiga con magia divina, y aguanta en primera fila mejor que otros lanzadores.",
    armor: ["light", "medium", "shield"], weapons: ["simple"],
    skills: { n: 2, from: ["historia", "perspicacia", "medicina", "persuasion", "religion"] },
    subclass: { level: { 2014: 1, 2024: 3 }, srd: "Dominio de la Vida" },
    caster: "full", cast: "wis", cantrips: [3], prepared: { 2014: "wis+level", 2024: 4 },
    kit: { 2014: "Maza (o martillo de guerra), cota de escamas (o de cuero o de malla), ballesta ligera con 20 virotes (o un arma simple), paquete de sacerdote o de explorador, escudo y símbolo sagrado.",
      2024: "Camisa de malla, escudo, maza, símbolo sagrado, paquete de sacerdote y 7 po." },
    gear: { armor: "cota-de-escamas", shield: true, weapons: ["maza", "ballesta-ligera"] },
    resources: (l, m, rules) => l >= 2 ? [{ name: "Canalizar divinidad", max: rules === "2024" ? (l >= 18 ? 4 : l >= 6 ? 3 : 2) : (l >= 18 ? 3 : l >= 6 ? 2 : 1) }] : [],
    features: [
      F(1, "Lanzamiento de conjuros", "Conjuros de clérigo con Sabiduría. Un símbolo sagrado te sirve de canalizador."),
      F(1, "Dominio divino", "Tu subclase desde nivel 1. En el SRD: Dominio de la Vida (curas más fuertes, armadura pesada).", "2014"),
      F(1, "Orden divina", "Protector (armadura pesada y armas marciales) o Taumaturgo (un truco más y +Sabiduría en Arcanos y Religión).", "2024"),
      F(2, "Canalizar divinidad", "Expulsar muertos vivientes y el poder de tu dominio (en 2024 también Chispa divina: cura o daña)."),
      F(3, "Dominio divino", "Tu subclase. En el SRD: Dominio de la Vida.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Destruir muertos vivientes", "Los muertos vivientes débiles que expulses quedan destruidos."),
      F(7, "Golpes benditos", "Más daño con tus armas o con tus trucos.", "2024"),
      F(10, "Intervención divina", "Pides ayuda a tu dios y puede que te responda (en 2024 lanzas un conjuro de clérigo sin gastar espacio)."),
      F(20, "Intervención divina mejorada", "Tu dios responde siempre.")
    ]
  },
  {
    id: "druida", name: "Druida", die: 8, primary: ["wis"], saves: ["int", "wis"],
    blurb: "Guardián de la naturaleza. Lanza magia de la tierra y las tormentas y puede convertirse en animal.",
    armor: ["light", "medium", "shield"], noMetal: true,
    weapons: { 2014: ["garrote", "daga", "dardo", "jabalina", "maza", "baston", "cimitarra", "hoz", "honda", "lanza"], 2024: ["simple"] },
    skills: { n: 2, from: ["arcanos", "trato_con_animales", "perspicacia", "medicina", "naturaleza", "percepcion", "religion", "supervivencia"] },
    subclass: { level: { 2014: 2, 2024: 3 }, srd: "Círculo de la Tierra" },
    caster: "full", cast: "wis", cantrips: [2], prepared: { 2014: "wis+level", 2024: 4 },
    kit: { 2014: "Escudo de madera (o un arma simple), cimitarra (o un arma simple cuerpo a cuerpo), armadura de cuero, paquete de explorador y canalizador druídico.",
      2024: "Armadura de cuero, escudo, hoz, canalizador druídico (bastón), paquete de explorador, útiles de herborista y 9 po." },
    gear: { armor: "cuero", shield: true, weapons: ["cimitarra", "baston"] },
    resources: (l, m, rules) => l >= 2 ? [{ name: "Forma salvaje", max: rules === "2024" ? (l >= 17 ? 4 : l >= 6 ? 3 : 2) : 2 }] : [],
    features: [
      F(1, "Druídico", "El idioma secreto de los druidas."),
      F(1, "Lanzamiento de conjuros", "Conjuros de druida con Sabiduría. No llevan armadura ni escudo de metal."),
      F(1, "Orden primigenia", "Mago (un truco más y +Sabiduría en Arcanos y Naturaleza) o Guardián (armas marciales y armadura media).", "2024"),
      F(2, "Forma salvaje", "Te conviertes en una bestia que hayas visto. Dos usos (que se recuperan con descanso)."),
      F(2, "Compañero salvaje", "Gastas un uso de forma salvaje para invocar a un familiar.", "2024"),
      F(2, "Círculo druídico", "Tu subclase. En el SRD: Círculo de la Tierra (conjuros según el terreno, recuperación natural).", "2014"),
      F(3, "Círculo druídico", "Tu subclase. En el SRD: Círculo de la Tierra.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(18, "Cuerpo intemporal / Conjuros de bestia", "Envejeces más despacio y puedes lanzar conjuros transformado."),
      F(20, "Archidruida", "Forma salvaje casi sin límite.")
    ]
  },
  {
    id: "guerrero", name: "Guerrero", die: 10, primary: ["str", "dex"], saves: ["str", "con"],
    blurb: "El maestro de las armas y las armaduras. Ataca más veces que nadie y siempre tiene un último esfuerzo guardado.",
    armor: ["light", "medium", "heavy", "shield"], weapons: ["simple", "marcial"],
    skills: { n: 2, from: ["acrobacias", "trato_con_animales", "atletismo", "historia", "perspicacia", "intimidacion", "percepcion", "supervivencia", "persuasion"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Campeón" },
    masteries: { 2024: 3 }, asiExtra: [6, 14],
    kit: { 2014: "Cota de malla (o armadura de cuero, arco largo y 20 flechas), un arma marcial y escudo (o dos armas marciales), ballesta ligera con 20 virotes (o dos hachas de mano) y paquete de mazmorreo o de explorador.",
      2024: "Cota de malla, espadón, mangual, ocho jabalinas, paquete de mazmorreo y 4 po." },
    gear: { armor: "cota-de-malla", shield: true, weapons: ["espada-larga", "ballesta-ligera"] },
    resources: (l, m, rules) => [
      { name: "Tomar aliento", max: rules === "2024" ? (l >= 10 ? 4 : l >= 4 ? 3 : 2) : 1 },
      ...(l >= 2 ? [{ name: "Oleada de acción", max: l >= 17 ? 2 : 1 }] : [])
    ],
    features: [
      F(1, "Estilo de combate", "Una especialidad: Defensa (+1 CA con armadura), Duelo, Tiro con arco, Lucha con armas a dos manos…"),
      F(1, "Tomar aliento", "Acción adicional: recuperas 1d10 + tu nivel de PV."),
      F(1, "Maestría con armas", "Usas la maestría de tres tipos de arma (más a niveles altos).", "2024"),
      F(2, "Oleada de acción", "Una acción más en tu turno (dos usos a nivel 17)."),
      F(2, "Mente táctica", "Gastas un uso de tomar aliento para sumar 1d10 a una prueba fallida.", "2024"),
      F(3, "Arquetipo marcial", "Tu subclase. En el SRD: Campeón (críticos con 19 y 20)."),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Además de 8, 12, 16 y 19, también a niveles 6 y 14."),
      F(5, "Ataque adicional", "Atacas dos veces (tres a nivel 11 y cuatro a nivel 20)."),
      F(9, "Indomable", "Repites una salvación fallida (dos usos a nivel 13, tres a 17).")
    ]
  },
  {
    id: "monje", name: "Monje", die: 8, primary: ["dex", "wis"], saves: ["str", "dex"],
    blurb: "Un artista marcial que canaliza su energía interior: golpes rapidísimos, esquivas imposibles y un cuerpo convertido en arma.",
    armor: [], weapons: { 2014: ["simple", "espada-corta"], 2024: ["simple", "marcial-ligera"] },
    skills: { n: 2, from: ["acrobacias", "atletismo", "historia", "perspicacia", "religion", "sigilo"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Camino de la Mano Abierta" },
    unarmored: "wis", martialArts: true,
    kit: { 2014: "Espada corta (o un arma simple), paquete de mazmorreo o de explorador y diez dardos.",
      2024: "Lanza, cinco dagas, útiles de artesano o instrumento, paquete de explorador y 11 po." },
    gear: { armor: "", shield: false, weapons: ["espada-corta", "dardo"] },
    resources: (l, m, rules) => l >= 2 ? [{ name: rules === "2024" ? "Puntos de concentración" : "Ki", max: l }] : [],
    features: [
      F(1, "Defensa sin armadura", "Sin armadura ni escudo, tu CA es 10 + Destreza + Sabiduría."),
      F(1, "Artes marciales", "Usas Destreza con armas de monje y golpes sin armas, cuyo daño crece (1d4 en 2014, 1d6 en 2024, hasta 1d10 o 1d12), y das un golpe sin armas como acción adicional."),
      F(2, "Ki / Concentración", "Puntos para ráfaga de golpes, defensa paciente y paso del viento."),
      F(2, "Movimiento sin armadura", "+10 pies de velocidad (sube con el nivel)."),
      F(3, "Tradición monástica", "Tu subclase. En el SRD: Camino de la Mano Abierta (tus golpes derriban o empujan)."),
      F(3, "Desviar proyectiles / ataques", "Reacción para reducir el daño de un ataque a distancia (en 2024, de cualquier ataque)."),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(4, "Caída lenta", "Reacción para reducir el daño por caída."),
      F(5, "Ataque adicional", "Atacas dos veces."),
      F(5, "Golpe aturdidor", "Gastas un punto para que el objetivo haga una salvación de Constitución o quede aturdido."),
      F(7, "Evasión", "En salvaciones de Destreza por mitad del daño, no recibes nada si la superas."),
      F(14, "Alma de diamante", "Competencia en todas las salvaciones.")
    ]
  },
  {
    id: "paladin", name: "Paladín", die: 10, primary: ["str", "cha"], saves: ["wis", "cha"],
    blurb: "Un guerrero sagrado unido por un juramento. Golpea con fuerza divina, cura con las manos y protege a los suyos con su aura.",
    armor: ["light", "medium", "heavy", "shield"], weapons: ["simple", "marcial"],
    skills: { n: 2, from: ["atletismo", "perspicacia", "intimidacion", "medicina", "persuasion", "religion"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Juramento de Devoción" },
    caster: "half", cast: "cha", cantrips: [0], prepared: { 2014: "cha+half", 2024: 2 }, masteries: { 2024: 2 },
    kit: { 2014: "Un arma marcial y escudo (o dos armas marciales), cinco jabalinas (o un arma simple cuerpo a cuerpo), paquete de sacerdote o de explorador, cota de malla y símbolo sagrado.",
      2024: "Cota de malla, escudo, espada larga, seis jabalinas, símbolo sagrado, paquete de sacerdote y 9 po." },
    gear: { armor: "cota-de-malla", shield: true, weapons: ["espada-larga", "jabalina"] },
    resources: (l, m, rules) => [
      { name: "Imposición de manos", max: 5 * l },
      ...(l >= 3 ? [{ name: "Canalizar divinidad", max: rules === "2024" ? (l >= 11 ? 3 : 2) : 1 }] : [])
    ],
    features: [
      F(1, "Imposición de manos", "Una reserva de curación de 5 × tu nivel en PV; también quita venenos."),
      F(1, "Sentido divino", "Notas celestiales, infernales y muertos vivientes cerca.", "2014"),
      F(1, "Lanzamiento de conjuros", "Conjuros de paladín con Carisma.", "2024"),
      F(1, "Maestría con armas", "Usas la maestría de dos tipos de arma.", "2024"),
      F(2, "Estilo de combate", "Una especialidad de combate."),
      F(2, "Lanzamiento de conjuros", "Conjuros de paladín con Carisma.", "2014"),
      F(2, "Castigo divino", "Al impactar, gastas un espacio de conjuro para hacer 2d8 de daño radiante más (en 2024 es un conjuro, Castigo divino)."),
      F(3, "Juramento sagrado", "Tu subclase. En el SRD: Juramento de Devoción."),
      F(3, "Canalizar divinidad", "El poder de tu juramento (en 2024 también Sentido divino)."),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Ataque adicional", "Atacas dos veces."),
      F(6, "Aura de protección", "Tú y tus aliados a 10 pies sumáis tu Carisma a las salvaciones."),
      F(10, "Aura de valor", "Los de tu aura no pueden quedar asustados."),
      F(11, "Golpes radiantes", "Tus ataques con arma hacen 1d8 radiante más.")
    ]
  },
  {
    id: "explorador", name: "Explorador", die: 10, primary: ["dex", "wis"], saves: ["str", "dex"],
    blurb: "Cazador de las tierras salvajes. Rastrea, sobrevive donde otros mueren y abate a sus presas con arco o espada, con algo de magia natural.",
    armor: ["light", "medium", "shield"], weapons: ["simple", "marcial"],
    skills: { n: 3, from: ["trato_con_animales", "atletismo", "perspicacia", "investigacion", "naturaleza", "percepcion", "sigilo", "supervivencia"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Cazador" },
    caster: "half", cast: "wis", cantrips: [0], prepared: { 2014: "known", 2024: 2 }, masteries: { 2024: 2 },
    kit: { 2014: "Cota de escamas (o armadura de cuero), dos espadas cortas (o dos armas simples cuerpo a cuerpo), paquete de mazmorreo o de explorador, arco largo y carcaj con 20 flechas.",
      2024: "Armadura de cuero tachonado, cimitarra, espada corta, arco largo con 20 flechas, canalizador druídico, paquete de explorador y 7 po." },
    gear: { armor: "cuero-tachonado", shield: false, weapons: ["arco-largo", "espada-corta"] },
    resources: (l, m, rules) => rules === "2024" ? [{ name: "Marca del cazador gratis", max: l >= 17 ? 6 : l >= 13 ? 5 : l >= 9 ? 4 : l >= 5 ? 3 : 2 }] : [],
    features: [
      F(1, "Enemigo predilecto", "Ventaja para rastrear y recordar cosas de un tipo de criatura.", "2014"),
      F(1, "Explorador nato", "Te mueves y orientas mejor en tu terreno preferido.", "2014"),
      F(1, "Enemigo predilecto", "Marca del cazador siempre preparada y varias veces gratis al día.", "2024"),
      F(1, "Lanzamiento de conjuros", "Conjuros de explorador con Sabiduría.", "2024"),
      F(1, "Maestría con armas", "Usas la maestría de dos tipos de arma.", "2024"),
      F(2, "Estilo de combate", "Una especialidad de combate."),
      F(2, "Lanzamiento de conjuros", "Conjuros de explorador con Sabiduría.", "2014"),
      F(2, "Hábil explorador", "Pericia en una habilidad y dos idiomas.", "2024"),
      F(3, "Arquetipo de explorador", "Tu subclase. En el SRD: Cazador (más daño a los heridos, defensas contra hordas)."),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Ataque adicional", "Atacas dos veces."),
      F(8, "Zancada por la tierra", "El terreno difícil no mágico no te frena."),
      F(10, "Ocultarse a plena vista / Incansable", "Camuflaje (2014) o puntos de golpe temporales y menos agotamiento (2024).")
    ]
  },
  {
    id: "picaro", name: "Pícaro", die: 8, primary: ["dex"], saves: ["dex", "int"],
    blurb: "Sigiloso, astuto y preciso. Abre cerraduras, desarma trampas y aprovecha cualquier descuido para un ataque furtivo devastador.",
    armor: ["light"], weapons: { 2014: ["simple", "ballesta-de-mano", "espada-larga", "estoque", "espada-corta"], 2024: ["simple", "marcial-sutil-ligera"] },
    skills: { n: 4, from: ["acrobacias", "atletismo", "enganio", "perspicacia", "intimidacion", "investigacion", "percepcion", "interpretacion", "persuasion", "juego_de_manos", "sigilo"] },
    subclass: { level: { 2014: 3, 2024: 3 }, srd: "Ladrón" },
    masteries: { 2024: 2 }, asiExtra: [10],
    kit: { 2014: "Estoque (o espada corta), arco corto con 20 flechas (o espada corta), paquete de ladrón, de mazmorreo o de explorador, armadura de cuero, dos dagas y herramientas de ladrón.",
      2024: "Armadura de cuero, dos dagas, espada corta, arco corto con 20 flechas, herramientas de ladrón, paquete de ladrón y 8 po." },
    gear: { armor: "cuero", shield: false, weapons: ["estoque", "arco-corto", "daga"] },
    resources: () => [],
    features: [
      F(1, "Pericia", "Doble competencia en dos habilidades (o en herramientas de ladrón); dos más a nivel 6."),
      F(1, "Ataque furtivo", "Una vez por turno, +1d6 (sube 1d6 cada dos niveles) si tienes ventaja o un aliado junto al objetivo, con arma sutil o a distancia."),
      F(1, "Jerga de ladrones", "Un código secreto de gestos y palabras."),
      F(1, "Maestría con armas", "Usas la maestría de dos tipos de arma.", "2024"),
      F(2, "Acción astuta", "Correr, Destrabarse u Ocultarse como acción adicional."),
      F(3, "Arquetipo de pícaro", "Tu subclase. En el SRD: Ladrón (manos rápidas, trepar como nadie)."),
      F(3, "Apuntar con cuidado", "Acción adicional: ventaja en tu próximo ataque si no te mueves.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Además de 8, 12, 16 y 19, también a nivel 10."),
      F(5, "Esquiva asombrosa", "Reacción: recibes la mitad del daño de un ataque que ves venir."),
      F(5, "Golpe astuto", "Cambias dados de ataque furtivo por efectos: envenenar, derribar, retirarte…", "2024"),
      F(7, "Evasión", "En salvaciones de Destreza por mitad del daño, no recibes nada si la superas."),
      F(11, "Talento fiable", "En pruebas en las que eres competente, un 9 o menos en el dado cuenta como 10."),
      F(20, "Golpe de suerte", "Conviertes un fallo en éxito (una vez por descanso).")
    ]
  },
  {
    id: "hechicero", name: "Hechicero", die: 6, primary: ["cha"], saves: ["con", "cha"],
    blurb: "La magia le corre por la sangre. Conoce pocos conjuros, pero los retuerce a su antojo con la metamagia.",
    armor: [], weapons: { 2014: ["daga", "dardo", "honda", "baston", "ballesta-ligera"], 2024: ["simple"] },
    skills: { n: 2, from: ["arcanos", "enganio", "perspicacia", "intimidacion", "persuasion", "religion"] },
    subclass: { level: { 2014: 1, 2024: 3 }, srd: "Linaje dracónico" },
    caster: "full", cast: "cha", cantrips: [4], prepared: { 2014: 2, 2024: 2 },
    kit: { 2014: "Ballesta ligera con 20 virotes (o un arma simple), bolsa de componentes o canalizador arcano, paquete de mazmorreo o de explorador y dos dagas.",
      2024: "Lanza, dos dagas, canalizador arcano (cristal), paquete de mazmorreo y 28 po." },
    gear: { armor: "", shield: false, weapons: ["ballesta-ligera", "daga"] },
    resources: (l) => l >= 2 ? [{ name: "Puntos de hechicería", max: l }] : [],
    features: [
      F(1, "Lanzamiento de conjuros", "Conjuros de hechicero con Carisma."),
      F(1, "Origen hechicero", "Tu subclase desde nivel 1. En el SRD: Linaje dracónico (escamas que dan CA y un elemento propio).", "2014"),
      F(1, "Hechicería innata", "Acción adicional: durante un minuto, tus conjuros son más difíciles de resistir y atacas con ventaja.", "2024"),
      F(2, "Fuente de magia", "Puntos de hechicería: se cambian por espacios de conjuro y al revés."),
      F(2, "Metamagia", "Retuerces tus conjuros: más lejos, sin componentes, dos objetivos… (en 2014, a nivel 3)."),
      F(3, "Origen hechicero", "Tu subclase. En el SRD: Hechicería dracónica.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(20, "Restauración / Apoteosis hechicera", "Recuperas puntos de hechicería con más facilidad.")
    ]
  },
  {
    id: "brujo", name: "Brujo", die: 8, primary: ["cha"], saves: ["wis", "cha"],
    blurb: "Ha hecho un pacto con un ser poderoso. Pocos espacios de conjuro, pero se recuperan en un descanso corto, y su descarga sobrenatural es temible.",
    armor: ["light"], weapons: ["simple"],
    skills: { n: 2, from: ["arcanos", "enganio", "historia", "intimidacion", "investigacion", "naturaleza", "religion"] },
    subclass: { level: { 2014: 1, 2024: 3 }, srd: "El Infernal" },
    caster: "pact", cast: "cha", cantrips: [2], prepared: { 2014: 2, 2024: 2 },
    kit: { 2014: "Ballesta ligera con 20 virotes (o un arma simple), bolsa de componentes o canalizador arcano, paquete de erudito o de mazmorreo, armadura de cuero, un arma simple y dos dagas.",
      2024: "Armadura de cuero, hoz, dos dagas, canalizador arcano (orbe), libro de saber oculto, paquete de erudito y 15 po." },
    gear: { armor: "cuero", shield: false, weapons: ["ballesta-ligera", "daga"] },
    resources: () => [],
    features: [
      F(1, "Patrón de otro mundo", "Tu subclase desde nivel 1. En el SRD: El Infernal (PV temporales al derribar enemigos).", "2014"),
      F(1, "Magia del pacto", "Conjuros de brujo con Carisma. Pocos espacios, todos del nivel más alto que tengas, y se recuperan con un descanso corto."),
      F(1, "Invocaciones sobrenaturales", "Poderes a elegir: descarga agonizante, vista del diablo, pacto del tomo… (en 2014, a nivel 2)."),
      F(2, "Astucia mágica", "Una vez al día, recuperas espacios del pacto con un minuto de descanso.", "2024"),
      F(3, "Don del pacto", "Pacto de la cadena, del filo o del tomo.", "2014"),
      F(3, "Patrón de brujo", "Tu subclase. En el SRD: Patrón Infernal.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(11, "Arcanum místico", "Un conjuro de nivel 6 una vez al día (7.º a nivel 13, 8.º a 15, 9.º a 17)."),
      F(20, "Maestro sobrenatural", "Recuperas los espacios del pacto mucho más fácilmente.")
    ]
  },
  {
    id: "mago", name: "Mago", die: 6, primary: ["int"], saves: ["int", "wis"],
    blurb: "Un erudito de lo arcano con un libro de conjuros. Frágil, pero con la mayor variedad de magia del juego.",
    armor: [], weapons: { 2014: ["daga", "dardo", "honda", "baston", "ballesta-ligera"], 2024: ["simple"] },
    skills: { n: 2, from: ["arcanos", "historia", "perspicacia", "investigacion", "medicina", "religion", "naturaleza"] },
    subclass: { level: { 2014: 2, 2024: 3 }, srd: "Escuela de Evocación" },
    caster: "full", cast: "int", cantrips: [3], prepared: { 2014: "int+level", 2024: 4 },
    kit: { 2014: "Bastón (o daga), bolsa de componentes o canalizador arcano, paquete de erudito o de explorador y libro de conjuros.",
      2024: "Dos dagas, canalizador arcano (bastón), túnica, libro de conjuros, paquete de erudito y 5 po." },
    gear: { armor: "", shield: false, weapons: ["baston", "daga"] },
    resources: () => [{ name: "Recuperación arcana", max: 1 }],
    features: [
      F(1, "Lanzamiento de conjuros", "Conjuros de mago con Inteligencia, apuntados en tu libro de conjuros (seis al empezar)."),
      F(1, "Recuperación arcana", "Una vez al día, tras un descanso corto, recuperas espacios de conjuro (niveles sumados hasta la mitad de tu nivel)."),
      F(1, "Ritualista", "Lanzas como ritual los conjuros de ritual de tu libro.", "2024"),
      F(2, "Tradición arcana", "Tu subclase. En el SRD: Escuela de Evocación (moldeas tus conjuros para no dar a los aliados).", "2014"),
      F(2, "Erudito", "Pericia en una habilidad de conocimiento.", "2024"),
      F(3, "Subclase de mago", "Tu subclase. En el SRD: Evocador.", "2024"),
      F(4, "Mejora de característica", "+2 a una característica o +1 a dos (o una dote). Se repite a niveles 8, 12, 16 y 19."),
      F(5, "Memorizar conjuro", "Cambias un conjuro preparado tras un descanso corto.", "2024"),
      F(18, "Dominio de conjuros", "Un conjuro de nivel 1 y otro de nivel 2 a voluntad."),
      F(20, "Conjuros emblemáticos", "Dos conjuros de nivel 3 una vez por descanso sin gastar espacio.")
    ]
  }
];
export const CLASS_BY_ID = new Map(CLASSES.map(c => [c.id, c]));

/* Lo que vale para la versión elegida: algunas cosas cambian entre 2014 y 2024 */
export const byRules = (value, rules) =>
  value && typeof value === "object" && !Array.isArray(value) && ("2014" in value || "2024" in value) ? value[rules] ?? value["2024"] : value;

export const featuresFor = (cls, level, rules) =>
  cls.features.filter(f => f.level <= level && (!f.v || f.v === rules));

export const cantripsKnown = (cls, level) => (cls.cantrips && cls.cantrips[0] ? cantripsAt(cls.cantrips, level) : 0);

/* Mejoras de característica que se tienen a ese nivel */
export function asiCount(cls, level) {
  const at = [4, 8, 12, 16, 19, ...(cls.asiExtra || [])];
  return at.filter(l => l <= level).length;
}

/* ¿Sabe usar esta arma? */
export function weaponProficient(cls, rules, w) {
  const list = byRules(cls.weapons, rules) || [];
  if (list.includes(w.id) || list.includes(w.cat)) return true;
  if (list.includes("marcial-ligera") && w.cat === "marcial" && w.props.includes("l")) return true;
  if (list.includes("marcial-sutil-ligera") && w.cat === "marcial" && (w.props.includes("l") || w.props.includes("f"))) return true;
  return false;
}
export const armorProficient = (cls, armor) => armor.kind === "none" || (cls.armor || []).includes(armor.kind);

/* ---------- Especies (o razas, en 2014) ----------
   asi (2014): mejoras fijas; «choose» son las que se reparten a elegir.
   vision en casillas de 5 pies (60 pies = 12). */
const T = (name, desc) => ({ name, desc });
export const SPECIES = {
  2014: [
    { id: "enano", name: "Enano (de las colinas)", speed: 25, size: "Mediano", vision: 12, asi: { con: 2, wis: 1 }, hpPerLevel: 1,
      blurb: "Duros como la piedra de sus montañas, tercos y leales.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Resistencia enana", "Ventaja contra veneno y resistencia a su daño."),
        T("Entrenamiento de combate enano", "Hachas de batalla, hachas de mano, martillos ligeros y de guerra."),
        T("Afinidad con la piedra", "Doble competencia en Historia sobre obras de piedra."), T("Dureza enana", "+1 PV máximo por nivel.")] },
    { id: "elfo", name: "Elfo (alto elfo)", speed: 30, size: "Mediano", vision: 12, asi: { dex: 2, int: 1 }, skills: ["percepcion"],
      blurb: "Gráciles y longevos, con un pie en el mundo de las hadas.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Sentidos agudos", "Competencia en Percepción."),
        T("Linaje feérico", "Ventaja contra quedar hechizado; la magia no te duerme."), T("Trance", "Te basta con meditar cuatro horas."),
        T("Truco", "Un truco de mago a tu elección (con Inteligencia)."), T("Entrenamiento con armas élficas", "Espada larga, espada corta, arco corto y arco largo.")] },
    { id: "mediano", name: "Mediano (piesligeros)", speed: 25, size: "Pequeño", vision: 0, asi: { dex: 2, cha: 1 },
      blurb: "Pequeños, alegres y con una suerte que no se explica.",
      traits: [T("Afortunado", "Si sacas un 1 en un d20 de ataque, prueba o salvación, repites."), T("Valiente", "Ventaja contra quedar asustado."),
        T("Agilidad mediana", "Puedes pasar por el espacio de criaturas más grandes."), T("Sigiloso por naturaleza", "Te escondes detrás de criaturas más grandes que tú.")] },
    { id: "humano", name: "Humano", speed: 30, size: "Mediano", vision: 0, asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      blurb: "Ambiciosos y variados; los hay en todas partes.",
      traits: [T("Versátil", "+1 a todas las características.")] },
    { id: "draconido", name: "Dracónido", speed: 30, size: "Mediano", vision: 0, asi: { str: 2, cha: 1 },
      blurb: "Orgullosos descendientes de dragones, con su aliento y sus escamas.",
      traits: [T("Ascendencia dracónica", "Eliges un dragón: marca el tipo de daño de tu aliento y tu resistencia."),
        T("Arma de aliento", "2d6 en línea o cono (salvación CD 8 + Constitución + competencia); se recupera con descanso."),
        T("Resistencia al daño", "Al tipo de daño de tu ascendencia.")] },
    { id: "gnomo", name: "Gnomo (de las rocas)", speed: 25, size: "Pequeño", vision: 12, asi: { int: 2, con: 1 },
      blurb: "Inventores curiosos e incansables.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Astucia gnoma", "Ventaja en salvaciones de Inteligencia, Sabiduría y Carisma contra magia."),
        T("Saber del artesano", "Doble competencia en Historia sobre objetos mágicos y artefactos."), T("Manitas", "Construyes pequeños mecanismos.")] },
    { id: "semielfo", name: "Semielfo", speed: 30, size: "Mediano", vision: 12, asi: { cha: 2 }, choose: { n: 2, amount: 1, not: ["cha"] }, freeSkills: 2,
      blurb: "Entre dos mundos, con lo mejor de cada uno.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Linaje feérico", "Ventaja contra quedar hechizado; la magia no te duerme."),
        T("Versatilidad con habilidades", "Competencia en dos habilidades a tu elección."), T("Mejoras", "+2 a Carisma y +1 a otras dos características.")] },
    { id: "semiorco", name: "Semiorco", speed: 30, size: "Mediano", vision: 12, asi: { str: 2, con: 1 }, skills: ["intimidacion"],
      blurb: "Fuertes, duros y difíciles de tumbar.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Amenazador", "Competencia en Intimidación."),
        T("Aguante incansable", "Una vez por descanso largo, si caes a 0 PV te quedas a 1."), T("Ataques salvajes", "Un dado de daño más en tus críticos con arma.")] },
    { id: "tiefling", name: "Tiefling", speed: 30, size: "Mediano", vision: 12, asi: { cha: 2, int: 1 },
      blurb: "Con sangre infernal y una mirada que incomoda.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Resistencia infernal", "Resistencia al daño de fuego."),
        T("Legado infernal", "Taumaturgia; a nivel 3, reprensión infernal; a nivel 5, oscuridad (con Carisma).")] }
  ],
  2024: [
    { id: "aasimar", name: "Aasimar", speed: 30, size: "Mediano", vision: 12, blurb: "Tocados por los planos celestiales, con una chispa de luz divina.",
      traits: [T("Resistencia celestial", "Resistencia al daño necrótico y radiante."), T("Visión en la oscuridad", "60 pies."),
        T("Manos sanadoras", "Una vez por descanso largo, curas tantos d4 como tu bonificador de competencia."), T("Portador de la luz", "Conoces el truco Luz."),
        T("Revelación celestial", "A nivel 3, te transformas un minuto: alas, aura radiante o un sudario necrótico.")] },
    { id: "draconido", name: "Dracónido", speed: 30, size: "Mediano", vision: 12, blurb: "Descendientes de dragones, con su aliento y sus escamas.",
      traits: [T("Ascendencia dracónica", "Eliges un dragón: marca tu aliento y tu resistencia."),
        T("Arma de aliento", "Sustituye un ataque: 1d10 en cono o línea (sube a 2d10, 3d10 y 4d10 a niveles 5, 11 y 17). Usos: tu competencia."),
        T("Resistencia al daño", "Al tipo de tu ascendencia."), T("Visión en la oscuridad", "60 pies."), T("Vuelo dracónico", "A nivel 5, alas espectrales durante 10 minutos.")] },
    { id: "enano", name: "Enano", speed: 30, size: "Mediano", vision: 24, hpPerLevel: 1, blurb: "Duros como la piedra, tercos y leales.",
      traits: [T("Visión en la oscuridad", "120 pies."), T("Resistencia enana", "Resistencia al daño de veneno y ventaja contra quedar envenenado."),
        T("Dureza enana", "+1 PV máximo por nivel."), T("Saber de la piedra", "Acción adicional: sientes vibraciones a 60 pies durante 10 minutos (usos: tu competencia).")] },
    { id: "elfo", name: "Elfo", speed: 30, size: "Mediano", vision: 12, skillChoice: ["perspicacia", "percepcion", "supervivencia"], blurb: "Gráciles y longevos, con un pie en el mundo de las hadas.",
      traits: [T("Visión en la oscuridad", "60 pies (120 si eres drow)."), T("Linaje élfico", "Drow, alto elfo o elfo silvano: un truco y conjuros a niveles 3 y 5."),
        T("Linaje feérico", "Ventaja contra quedar hechizado."), T("Sentidos agudos", "Competencia en Perspicacia, Percepción o Supervivencia."), T("Trance", "Te basta con cuatro horas.")] },
    { id: "gnomo", name: "Gnomo", speed: 30, size: "Pequeño", vision: 12, blurb: "Inventores curiosos e incansables.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Astucia gnoma", "Ventaja en salvaciones de Inteligencia, Sabiduría y Carisma."),
        T("Linaje gnomo", "Del bosque (hablar con animales) o de las rocas (artilugios y reparar).")] },
    { id: "goliat", name: "Goliat", speed: 35, size: "Mediano", vision: 0, blurb: "Con sangre de gigantes: enormes, competitivos y fuertes.",
      traits: [T("Ascendencia gigante", "Un don de gigante: de las nubes, del fuego, de la escarcha, de las colinas, de piedra o de las tormentas."),
        T("Forma grande", "A nivel 5, creces a tamaño Grande durante 10 minutos."), T("Constitución poderosa", "Cuentas como una talla más para cargar y ventaja para acabar con un agarre.")] },
    { id: "mediano", name: "Mediano", speed: 30, size: "Pequeño", vision: 0, blurb: "Pequeños, alegres y con una suerte que no se explica.",
      traits: [T("Valiente", "Ventaja contra quedar asustado."), T("Agilidad mediana", "Pasas por el espacio de criaturas más grandes."),
        T("Afortunado", "Si sacas un 1 en un d20, repites."), T("Sigiloso por naturaleza", "Te escondes detrás de criaturas más grandes.")] },
    { id: "humano", name: "Humano", speed: 30, size: "Mediano", vision: 0, freeSkills: 1, blurb: "Ambiciosos y variados; los hay en todas partes.",
      traits: [T("Ingenioso", "Inspiración heroica cada vez que terminas un descanso largo."), T("Habilidoso", "Competencia en una habilidad a tu elección."),
        T("Versátil", "Una dote de origen más.")] },
    { id: "orco", name: "Orco", speed: 30, size: "Mediano", vision: 24, blurb: "Fuertes, resistentes y difíciles de tumbar.",
      traits: [T("Subidón de adrenalina", "Acción adicional: correr y ganar PV temporales igual a tu competencia (usos: tu competencia)."),
        T("Visión en la oscuridad", "120 pies."), T("Aguante incansable", "Una vez por descanso largo, si caes a 0 PV te quedas a 1.")] },
    { id: "tiefling", name: "Tiefling", speed: 30, size: "Mediano", vision: 12, blurb: "Con sangre de los planos inferiores y una mirada que incomoda.",
      traits: [T("Visión en la oscuridad", "60 pies."), T("Legado infernal", "Abisal, ctónico o infernal: una resistencia, un truco y conjuros a niveles 3 y 5."),
        T("Presencia sobrenatural", "Conoces el truco Taumaturgia.")] }
  ]
};

/* ---------- Trasfondos ----------
   2014: dos habilidades y un rasgo. 2024: tres características entre las
   que repartir +2/+1 o +1/+1/+1, una dote de origen y dos habilidades. */
const B = (id, name, skills, extra) => ({ id, name, skills, ...extra });
export const BACKGROUNDS = {
  2014: [
    B("acolito", "Acólito", ["perspicacia", "religion"], { feature: "Refugio de los fieles: tu templo y los de tu fe te ayudan.", blurb: "Te criaste sirviendo en un templo." }),
    B("artesano", "Artesano gremial", ["perspicacia", "persuasion"], { feature: "Miembro del gremio: alojamiento y apoyo de tu gremio.", blurb: "Aprendiste un oficio en un gremio." }),
    B("animador", "Animador", ["acrobacias", "interpretacion"], { feature: "A petición del público: siempre encuentras dónde actuar a cambio de techo y comida.", blurb: "Vives de tu arte ante el público." }),
    B("charlatan", "Charlatán", ["enganio", "juego_de_manos"], { feature: "Identidad falsa: tienes otra vida documentada.", blurb: "Siempre has sabido qué quiere oír la gente." }),
    B("criminal", "Criminal", ["enganio", "sigilo"], { feature: "Contacto criminal: alguien de confianza en el hampa.", blurb: "Has vivido al margen de la ley." }),
    B("ermitano", "Ermitaño", ["medicina", "religion"], { feature: "Descubrimiento: guardas una verdad que nadie más conoce.", blurb: "Pasaste años en soledad." }),
    B("erudito", "Erudito", ["arcanos", "historia"], { feature: "Investigador: sabes dónde encontrar lo que no sabes.", blurb: "Años entre libros y maestros." }),
    B("forastero", "Forastero", ["atletismo", "supervivencia"], { feature: "Vagabundo: siempre encuentras comida y agua en la naturaleza.", blurb: "Te criaste lejos de las ciudades." }),
    B("heroe", "Héroe del pueblo", ["trato_con_animales", "supervivencia"], { feature: "Hospitalidad rústica: la gente sencilla te da cobijo.", blurb: "Plantaste cara por los tuyos." }),
    B("marinero", "Marinero", ["atletismo", "percepcion"], { feature: "Pasaje en barco: consigues travesías gratis.", blurb: "Años en cubierta." }),
    B("noble", "Noble", ["historia", "persuasion"], { feature: "Posición privilegiada: te reciben en la alta sociedad.", blurb: "Naciste con título y obligaciones." }),
    B("pilluelo", "Pilluelo", ["juego_de_manos", "sigilo"], { feature: "Secretos de la ciudad: conoces los atajos.", blurb: "Creciste solo en la calle." }),
    B("soldado", "Soldado", ["atletismo", "intimidacion"], { feature: "Rango militar: los soldados te respetan.", blurb: "Serviste en un ejército." })
  ],
  2024: [
    B("acolito", "Acólito", ["perspicacia", "religion"], { abilities: ["int", "wis", "cha"], feat: "Iniciado en la magia (clérigo)", blurb: "Te criaste sirviendo en un templo." }),
    B("artesano", "Artesano", ["investigacion", "persuasion"], { abilities: ["str", "dex", "int"], feat: "Artesano", blurb: "Aprendiste un oficio con tus manos." }),
    B("animador", "Animador", ["acrobacias", "interpretacion"], { abilities: ["str", "dex", "cha"], feat: "Músico", blurb: "Vives de tu arte ante el público." }),
    B("charlatan", "Charlatán", ["enganio", "juego_de_manos"], { abilities: ["dex", "con", "cha"], feat: "Habilidoso", blurb: "Siempre has sabido qué quiere oír la gente." }),
    B("criminal", "Criminal", ["juego_de_manos", "sigilo"], { abilities: ["dex", "con", "int"], feat: "Alerta", blurb: "Has vivido al margen de la ley." }),
    B("ermitano", "Ermitaño", ["medicina", "religion"], { abilities: ["con", "wis", "cha"], feat: "Sanador", blurb: "Pasaste años en soledad." }),
    B("erudito", "Erudito", ["arcanos", "historia"], { abilities: ["con", "int", "wis"], feat: "Iniciado en la magia (mago)", blurb: "Años entre libros y maestros." }),
    B("escriba", "Escriba", ["investigacion", "percepcion"], { abilities: ["dex", "int", "wis"], feat: "Habilidoso", blurb: "Copiabas y archivabas lo que otros escribían." }),
    B("granjero", "Granjero", ["trato_con_animales", "naturaleza"], { abilities: ["str", "con", "wis"], feat: "Duro", blurb: "Trabajaste la tierra de sol a sol." }),
    B("guardia", "Guardia", ["atletismo", "percepcion"], { abilities: ["str", "int", "wis"], feat: "Alerta", blurb: "Vigilaste murallas y puertas." }),
    B("guia", "Guía", ["sigilo", "supervivencia"], { abilities: ["dex", "con", "wis"], feat: "Iniciado en la magia (druida)", blurb: "Llevabas viajeros por caminos peligrosos." }),
    B("marinero", "Marinero", ["acrobacias", "percepcion"], { abilities: ["str", "dex", "wis"], feat: "Pendenciero de taberna", blurb: "Años en cubierta." }),
    B("mercader", "Mercader", ["trato_con_animales", "persuasion"], { abilities: ["con", "int", "cha"], feat: "Afortunado", blurb: "Compraste y vendiste por medio mundo." }),
    B("noble", "Noble", ["historia", "persuasion"], { abilities: ["str", "int", "cha"], feat: "Habilidoso", blurb: "Naciste con título y obligaciones." }),
    B("soldado", "Soldado", ["atletismo", "intimidacion"], { abilities: ["str", "dex", "con"], feat: "Atacante salvaje", blurb: "Serviste en un ejército." }),
    B("vagabundo", "Vagabundo", ["perspicacia", "sigilo"], { abilities: ["dex", "wis", "cha"], feat: "Afortunado", blurb: "Has vivido en los caminos y en la calle." })
  ]
};

/* Dotes de origen (2024), lo que hacen en una línea */
export const ORIGIN_FEATS = {
  "Alerta": "Sumas tu competencia a la iniciativa y puedes cambiar tu turno con un aliado.",
  "Artesano": "Competencia con tres herramientas de artesano, descuento al comprar y fabricas más rápido.",
  "Atacante salvaje": "Una vez por turno, tiras dos veces el daño de un arma y te quedas con el mejor.",
  "Afortunado": "Puntos de suerte (tu competencia) para tener ventaja o dar desventaja.",
  "Duro": "+2 PV máximos por nivel.",
  "Habilidoso": "Competencia en tres habilidades o herramientas.",
  "Iniciado en la magia (clérigo)": "Dos trucos y un conjuro de nivel 1 de clérigo (una vez gratis al día).",
  "Iniciado en la magia (druida)": "Dos trucos y un conjuro de nivel 1 de druida (una vez gratis al día).",
  "Iniciado en la magia (mago)": "Dos trucos y un conjuro de nivel 1 de mago (una vez gratis al día).",
  "Músico": "Competencia con tres instrumentos; al acabar un descanso das inspiración heroica a tus aliados.",
  "Pendenciero de taberna": "Golpes sin armas más fuertes, repites unos en el daño y empujas al impactar.",
  "Sanador": "Usas un botiquín para curar como acción, y repites los unos al curar."
};

/* ---------- Generar características ---------- */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUDGET = 27;

/* ---------- Conjuros de la biblioteca por clase ----------
   Las listas de clase del SRD para los conjuros que trae Mesa (spells.js). */
export const SPELL_CLASSES = {
  "rayo-de-fuego": ["hechicero", "mago"], "rayo-de-escarcha": ["hechicero", "mago"], "llama-sagrada": ["clerigo"],
  "burla-danina": ["bardo"], "toque-helado": ["hechicero", "brujo", "mago"], "descarga-sobrenatural": ["brujo"],
  "rociada-venenosa": ["druida", "hechicero", "brujo", "mago"], "salpicadura-acida": ["hechicero", "mago"],
  "proyectil-magico": ["hechicero", "mago"], "manos-ardientes": ["hechicero", "mago"], "ola-atronadora": ["bardo", "druida", "hechicero", "mago"],
  "curar-heridas": ["bardo", "clerigo", "druida", "paladin", "explorador"], "palabra-curativa": ["bardo", "clerigo", "druida"],
  "saeta-guia": ["clerigo"], "infligir-heridas": ["clerigo"], "dormir": ["bardo", "hechicero", "mago"],
  "hechizar-persona": ["bardo", "druida", "hechicero", "brujo", "mago"], "orden-imperiosa": ["clerigo", "paladin"],
  "enmaranar": ["druida"], "bendecir": ["clerigo", "paladin"], "escudo-de-fe": ["clerigo", "paladin"],
  "inmovilizar-persona": ["bardo", "clerigo", "druida", "hechicero", "brujo", "mago"], "rayo-abrasador": ["hechicero", "mago"],
  "telarana": ["hechicero", "mago"], "ceguera-sordera": ["bardo", "clerigo", "hechicero", "mago"],
  "romper": ["bardo", "hechicero", "brujo", "mago"], "arma-espiritual": ["clerigo"], "bola-de-fuego": ["hechicero", "mago"],
  "relampago": ["hechicero", "mago"], "miedo": ["bardo", "hechicero", "brujo", "mago"], "espiritus-guardianes": ["clerigo"],
  "palabra-curativa-en-masa": ["clerigo"], "revivificar": ["clerigo", "paladin"], "tormenta-de-hielo": ["druida", "hechicero", "mago"],
  "destierro": ["clerigo", "paladin", "hechicero", "brujo", "mago"], "cono-de-frio": ["hechicero", "mago"],
  "golpe-flamigero": ["clerigo"], "curar-heridas-en-masa": ["bardo", "clerigo", "druida"],
  "inmovilizar-monstruo": ["bardo", "hechicero", "brujo", "mago"]
};

/* ---------- Cuentas de la ficha ---------- */
export const mod = score => Math.floor((score - 10) / 2);

/* Vida máxima: el dado entero a nivel 1 y la media (redondeada arriba) en
   los siguientes, más Constitución en cada nivel; o lo que haya salido en las
   tiradas, si se han tirado */
export function maxHpFor({ die, level, con, perLevel = 0, rolls = null }) {
  const c = mod(con);
  let hp = die + c;
  for (let l = 2; l <= level; l++) hp += Math.max(1, (rolls && rolls[l - 2]) || (die / 2 + 1)) + c;
  return Math.max(1, hp + perLevel * level);
}

/* Clase de armadura con lo que lleva puesto */
export function armorClass({ armor, shield, scores, cls }) {
  const a = ARMOR_BY_ID.get(armor || "") || ARMORS[0];
  const dex = mod(scores.dex);
  let ac;
  if (a.kind === "none" && cls && cls.unarmored) {
    if (cls.unarmored === "wis" && shield) ac = 10 + dex;
    else ac = 10 + dex + mod(scores[cls.unarmored]);
  } else ac = a.base + (a.kind === "heavy" ? 0 : Math.min(dex, a.dexMax));   // la pesada no suma ni resta Destreza
  return ac + (shield ? 2 : 0);
}

/* Un ataque listo para la mesa con un arma: Fuerza o Destreza, la mejor
   que permita el arma, más la competencia si la tiene */
export function weaponAttack(w, { scores, pb, proficient, monk = false }) {
  const str = mod(scores.str), dex = mod(scores.dex);
  const ranged = w.props.includes("r");
  const finesse = w.props.includes("f") || (monk && (w.cat === "simple" || w.props.includes("l")) && !w.props.includes("2") && !w.props.includes("h"));
  const m = ranged ? dex : finesse ? Math.max(str, dex) : str;
  const atk = m + (proficient ? pb : 0);
  const sign = m >= 0 ? "+" + m : String(m);
  return { name: w.name, atk, damage: m ? w.dmg + sign : w.dmg, type: w.type };
}

const AB = ["str", "dex", "con", "int", "wis", "cha"];
const signedMod = n => (n >= 0 ? "+" + n : String(n));

/* ---------- La ficha que sale de lo elegido ---------- */
export function computeBuild(st) {
  const rules = st.rules;
  const cls = CLASS_BY_ID.get(st.cls) || null;
  const sp = (SPECIES[rules] || []).find(s => s.id === st.species) || null;
  const bg = (BACKGROUNDS[rules] || []).find(b => b.id === st.bg) || null;
  const level = Math.max(1, Math.min(20, st.level || 1));
  const pb = proficiencyFor(level);

  /* Características: base + especie (2014) o trasfondo (2024) + mejoras */
  const bonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  if (rules === "2014" && sp) {
    for (const [k, v] of Object.entries(sp.asi || {})) bonus[k] += v;
    if (sp.choose) for (const k of (st.speciesAsi || []).slice(0, sp.choose.n)) if (!sp.choose.not.includes(k)) bonus[k] += sp.choose.amount;
  }
  if (rules === "2024" && bg && bg.abilities) {
    const b = st.boost || {};
    if (b.mode === "111") for (const k of bg.abilities) bonus[k] += 1;
    else {
      if (bg.abilities.includes(b.two)) bonus[b.two] += 2;
      if (bg.abilities.includes(b.one) && b.one !== b.two) bonus[b.one] += 1;
    }
  }
  const scores = {};
  for (const k of AB) scores[k] = Math.min(20, (st.base[k] || 8) + bonus[k] + (st.asi[k] || 0));
  if (cls && cls.id === "barbaro" && level >= 20) { scores.str = Math.min(24, scores.str + 4); scores.con = Math.min(24, scores.con + 4); }
  const mods = Object.fromEntries(AB.map(k => [k, mod(scores[k])]));

  /* Habilidades: las de la clase elegidas, las del trasfondo y las de la especie */
  const fixed = new Set([...(bg ? bg.skills : []), ...((sp && sp.skills) || [])]);
  if (sp && sp.skillChoice && st.speciesSkill) fixed.add(st.speciesSkill);
  const skills = new Set([...fixed, ...(st.skills || []), ...(st.freeSkills || [])]);

  const feat = rules === "2024" && bg ? bg.feat : "";
  const perLevel = (sp && sp.hpPerLevel || 0) + (feat === "Duro" ? 2 : 0);
  const hp = cls ? maxHpFor({ die: cls.die, level, con: scores.con, perLevel, rolls: st.hpMode === "roll" ? st.hpRolls : null }) : 0;

  const armorId = st.armor ?? (cls ? cls.gear.armor : "");
  const shield = st.shield ?? (cls ? cls.gear.shield : false);
  const ac = armorClass({ armor: armorId, shield: !!shield && (!cls || (cls.armor || []).includes("shield")), scores, cls });

  const weaponIds = st.weapons ?? (cls ? cls.gear.weapons : []);
  const attacks = cls ? weaponIds.map(id => WEAPON_BY_ID.get(id)).filter(Boolean)
    .map(w => ({ w, a: weaponAttack(w, { scores, pb, proficient: weaponProficient(cls, rules, w), monk: !!cls.martialArts }) })) : [];
  if (cls && cls.martialArts) {
    const die = rules === "2024" ? ["1d6", "1d8", "1d10", "1d12"] : ["1d4", "1d6", "1d8", "1d10"];
    const d = die[level >= 17 ? 3 : level >= 11 ? 2 : level >= 5 ? 1 : 0];
    const m = Math.max(mods.str, mods.dex);
    attacks.push({ w: null, a: { name: "Golpe sin armas", atk: m + pb, damage: d + (m ? signedMod(m) : ""), type: "contundente" } });
  }

  const slots = spellSlots(cls, level, rules);
  const maxSpell = slots.reduce((top, n, i) => (n ? i + 1 : top), 0);
  const caster = !!(cls && cls.caster && (maxSpell || cantripsKnown(cls, level)));
  const resources = cls ? cls.resources(level, mods, rules).filter(r => r.max > 0) : [];

  const speed = sp ? sp.speed + (cls && cls.id === "barbaro" && level >= 5 ? 10 : 0)
    + (cls && cls.id === "monje" && level >= 2 ? (level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : 10) : 0) : 30;

  return { rules, cls, sp, bg, level, pb, scores, mods, bonus, skills, fixed, feat, hp, ac, armorId, shield, weaponIds, attacks,
    slots, maxSpell, caster, resources, speed };
}

