#!/usr/bin/env python3
"""Mesa · paso 2 del manual 5.5: montar los datos en castellano.

Junta los números del SRD 5.2 (niveles, clases, características, costes…)
con los textos ya traducidos que dejó el paso 1 en <trabajo>/es/ y escribe
public/data/srd52/: conjuros, criaturas, equipo, especies y reglas.

    python3 tools/srd52/montar.py <carpeta srd-2024> [<trabajo>]

<trabajo> (por defecto tools/srd52/traduccion) guarda la traducción: en/ los
trozos en inglés que deja extraer.py, es/ los mismos trozos traducidos (y
*-fix.json, los conjuros y rasgos rehechos desde el texto completo),
nombres-conjuros.json y nombres-criaturas.json con los nombres en castellano
y glosario.md con los términos con los que se tradujo todo. El SRD 5.2 es de Wizards of the Coast, con licencia
CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). """
import glob, json, os, re, sys

src = sys.argv[1]
work = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "traduccion")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data", "srd52")
load = lambda n: json.load(open(os.path.join(src, n + ".json"), encoding="utf-8"))
short = lambda pk: pk.removeprefix("srd-2024_")

# Mesa dice «DM», no «director de juego» ni «DJ»
FIXES = [(re.compile(r"\bdirector(?:a)? de juego \(DJ\)", re.I), "DM"), (re.compile(r"\b[Dd]irector(?:a)? de juego\b"), "DM"),
         (re.compile(r"\bDJ\b"), "DM")]
def fix(text):
    if not isinstance(text, str): return text
    for pat, rep in FIXES: text = pat.sub(rep, text)
    # restos de cabeceras del documento original («### Conjuros de U a Z»)
    return re.sub(r"\s*#{2,3}\s*Conjuros de [A-Z] a [A-Z]\s*$", "", text).strip()

def deep_fix(o):
    if isinstance(o, dict): return {k: deep_fix(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_fix(v) for v in o]
    return fix(o)

def es_chunks(prefix):
    items = []
    for f in sorted(glob.glob(os.path.join(work, "es", prefix + "-[0-9]*.json"))):
        items += json.load(open(f, encoding="utf-8"))
    return {x["id"]: deep_fix(x) for x in items}

def es_fixes(name):
    f = os.path.join(work, "es", name + "-fix.json")
    return {x["id"]: deep_fix(x) for x in json.load(open(f, encoding="utf-8"))} if os.path.exists(f) else {}

def write(name, data):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"public/data/srd52/{name}.json", round(os.path.getsize(os.path.join(OUT, name + ".json")) / 1024), "KB")

problems = []
def need(cond, msg):
    if not cond: problems.append(msg)

# ---------- Vocabulario ----------
SCHOOL = {"abjuration": "Abjuración", "conjuration": "Conjuración", "divination": "Adivinación", "enchantment": "Encantamiento",
          "evocation": "Evocación", "illusion": "Ilusión", "necromancy": "Nigromancia", "transmutation": "Transmutación"}
CLASS = {"bard": "Bardo", "cleric": "Clérigo", "druid": "Druida", "paladin": "Paladín", "ranger": "Explorador",
         "sorcerer": "Hechicero", "warlock": "Brujo", "wizard": "Mago"}
TIME = {"action": "Acción", "bonus-action": "Acción adicional", "reaction": "Reacción", "1minute": "1 minuto",
        "10minutes": "10 minutos", "1hour": "1 hora", "8hours": "8 horas", "12hours": "12 horas", "24hours": "24 horas"}
DAMAGE = {"acid": "ácido", "bludgeoning": "contundente", "cold": "frío", "fire": "fuego", "force": "fuerza",
          "lightning": "relámpago", "necrotic": "necrótico", "piercing": "perforante", "poison": "veneno",
          "psychic": "psíquico", "radiant": "radiante", "slashing": "cortante", "thunder": "trueno"}
CONDITION = {"blinded": "Cegado", "charmed": "Encantado", "deafened": "Ensordecido", "exhaustion": "Agotamiento",
             "frightened": "Asustado", "grappled": "Agarrado", "incapacitated": "Incapacitado", "invisible": "Invisible",
             "paralyzed": "Paralizado", "petrified": "Petrificado", "poisoned": "Envenenado", "prone": "Derribado",
             "restrained": "Apresado", "stunned": "Aturdido", "unconscious": "Inconsciente"}
# tipo de criatura: nombre y género, para que concuerde el tamaño
TYPE = {"aberration": ("Aberración", "f"), "beast": ("Bestia", "f"), "celestial": ("Celestial", "m"),
        "construct": ("Constructo", "m"), "dragon": ("Dragón", "m"), "elemental": ("Elemental", "m"), "fey": ("Hada", "f"),
        "fiend": ("Infernal", "m"), "giant": ("Gigante", "m"), "humanoid": ("Humanoide", "m"),
        "monstrosity": ("Monstruosidad", "f"), "ooze": ("Cieno", "m"), "plant": ("Planta", "f"), "undead": ("Muerto viviente", "m")}
SIZE = {"tiny": ("Diminuto", "Diminuta"), "small": ("Pequeño", "Pequeña"), "medium": ("Mediano", "Mediana"),
        "large": ("Grande", "Grande"), "huge": ("Enorme", "Enorme"), "gargantuan": ("Gargantuesco", "Gargantuesca")}
ALIGN = {"lawful good": "legal bueno", "neutral good": "neutral bueno", "chaotic good": "caótico bueno",
         "lawful neutral": "legal neutral", "neutral": "neutral", "chaotic neutral": "caótico neutral",
         "lawful evil": "legal malvado", "neutral evil": "neutral malvado", "chaotic evil": "caótico malvado",
         "unaligned": "sin alineamiento"}
SKILL = {"acrobatics": "Acrobacias", "animal_handling": "Trato con animales", "arcana": "Arcanos", "athletics": "Atletismo",
         "deception": "Engaño", "history": "Historia", "insight": "Perspicacia", "intimidation": "Intimidación",
         "investigation": "Investigación", "medicine": "Medicina", "nature": "Naturaleza", "perception": "Percepción",
         "performance": "Interpretación", "persuasion": "Persuasión", "religion": "Religión",
         "sleight_of_hand": "Juego de manos", "stealth": "Sigilo", "survival": "Supervivencia"}
ABIL = [("strength", "str"), ("dexterity", "dex"), ("constitution", "con"), ("intelligence", "int"), ("wisdom", "wis"), ("charisma", "cha")]
XP = {"0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300,
      "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
      "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
      "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000}

def cr_text(v):
    v = float(v)
    return {0.125: "1/8", 0.25: "1/4", 0.5: "1/2"}.get(v, str(int(v)))

def pb_for(cr):
    v = float(cr)
    return 2 if v < 5 else 3 if v < 9 else 4 if v < 13 else 5 if v < 17 else 6 if v < 21 else 7 if v < 25 else 8 if v < 29 else 9

sign = lambda n: ("+" if n >= 0 else "−") + str(abs(n))
mod = lambda score: (score - 10) // 2
thousands = lambda n: f"{n:,}".replace(",", ".")

# Restos de inglés que delatan una traducción a medias
ENGLISH = re.compile(r"\b(the|you|your|and|with|creature|damage|feet|spell|saving throw|attack roll|hit points?|which|each|target)\b", re.I)
def check_es(label, text):
    if text and len(ENGLISH.findall(text)) >= 2:
        problems.append(f"{label}: ¿inglés? «{text[:90]}»")

# ---------- Conjuros ----------
def higher_text(level, text):
    text = (text or "").strip()
    if not text: return ""
    text = re.sub(r"^\**(Usando un espacio de conjuro de nivel superior|Mejora de truco|Con un espacio de conjuro de nivel superior)\.?\**\.?\s*", "", text)
    return ("**Mejora de truco.** " if level == 0 else "**Usando un espacio de conjuro de nivel superior.** ") + text

spell_names = json.load(open(os.path.join(work, "nombres-conjuros.json"), encoding="utf-8"))
tr = es_chunks("spells")
# los conjuros a los que la fuente les comía párrafos, rehechos desde el texto completo
for sid, x in es_fixes("spells").items():
    tr[sid] = {**tr[sid], "desc": x["desc"], "higher": x.get("higher", "")}
spells = []
for s in sorted(load("Spell"), key=lambda s: (s["fields"]["level"], spell_names.get(short(s["pk"]), ""))):
    f, sid = s["fields"], short(s["pk"])
    t = tr.get(sid)
    need(t, f"conjuro sin traducir: {sid}")
    if not t: continue
    time = TIME.get(f["casting_time"], f["casting_time"])
    if f["casting_time"] == "reaction" and t.get("reaction"): time += ", " + t["reaction"]
    comps = [c for c, on in (("V", f["verbal"]), ("S", f["somatic"]), ("M", f["material"])) if on]
    comp = ", ".join(comps) + (f" ({t['material']})" if f["material"] and t.get("material") else "")
    duration = t.get("duration", "")
    if f["concentration"]: duration = "Concentración, hasta " + duration[:1].lower() + duration[1:]
    spell = {"id": sid, "name": spell_names[sid], "en": f["name"], "level": f["level"], "school": SCHOOL[f["school"]],
             "classes": sorted(CLASS[short(c)] for c in f["classes"]), "time": time, "ritual": f["ritual"],
             "concentration": f["concentration"], "range": t.get("range", ""), "components": comp,
             "duration": duration, "text": t.get("desc", ""), "higher": higher_text(f["level"], t.get("higher", ""))}
    for k in ("text", "higher", "range", "duration", "components"): check_es(f"conjuro {sid}.{k}", spell[k])
    spells.append(spell)
need(len(spells) == 339, f"conjuros: {len(spells)} de 339")
write("conjuros", spells)

# ---------- Criaturas ----------
creature_names = json.load(open(os.path.join(work, "nombres-criaturas.json"), encoding="utf-8"))
tr = es_chunks("creatures")
for cid, x in es_fixes("creatures").items():
    tr[cid] = {**tr[cid], "traits": tr[cid].get("traits", []) + x["traits"]}
acts_by = {}
for a in load("CreatureAction"):
    acts_by.setdefault(a["fields"]["parent"], []).append(a)
GROUP = {"ACTION": "actions", "BONUS_ACTION": "bonus", "REACTION": "reactions", "LEGENDARY_ACTION": "legendary"}

def uses_text(f):
    t, p = f["uses_type"], f["uses_param"]
    if t == "RECHARGE_ON_ROLL": return f"Recarga {p}–6" if p and p < 6 else "Recarga 6"
    if t == "PER_DAY": return f"{p}/día"
    if t == "RECHARGE": return "se recarga tras un descanso corto o largo"
    return ""

creatures = []
for c in sorted(load("Creature"), key=lambda c: creature_names.get(short(c["pk"]), "")):
    f, cid = c["fields"], short(c["pk"])
    t = tr.get(cid)
    need(t, f"criatura sin traducir: {cid}")
    if not t: continue
    tname, gender = TYPE[f["type"]]
    size = SIZE[f["size"]][1 if gender == "f" else 0]
    cr = cr_text(f["challenge_rating"])
    speed = [f"{f['walk'] or 0} pies"] + [f"{label} {f[k]} pies" + (" (levitar)" if k == "fly" and f["hover"] else "")
                                          for k, label in (("burrow", "excavar"), ("climb", "trepar"), ("fly", "volar"), ("swim", "nadar")) if f[k]]
    senses = [f"{label} {f[k]} pies" for k, label in (("blindsight_range", "vista ciega"), ("darkvision_range", "visión en la oscuridad"),
                                                      ("tremorsense_range", "sentido de la vibración"), ("truesight_range", "visión verdadera")) if f[k]]
    senses.append(f"Percepción pasiva {f['passive_perception']}")
    abilities = {}
    for long, k in ABIL:
        score = f["ability_score_" + long]
        save = f["saving_throw_" + long]
        abilities[k] = [score, mod(score), save if save is not None else mod(score)]
    skills = [f"{SKILL[k]} {sign(f['skill_bonus_' + k])}" for k in SKILL if f.get("skill_bonus_" + k) is not None]
    dmg = lambda xs: ", ".join(DAMAGE.get(x, x) for x in xs)
    imm = ", ".join(x for x in (dmg(f["damage_immunities"]), ", ".join(CONDITION.get(x, x) for x in f["condition_immunities"])) if x)
    imm = imm if not (f["damage_immunities"] and f["condition_immunities"]) else dmg(f["damage_immunities"]) + "; " + ", ".join(CONDITION.get(x, x) for x in f["condition_immunities"])
    tr_traits = t.get("traits", [])
    tr_actions = {a["key"]: a for a in t.get("actions", [])}
    groups = {"actions": [], "bonus": [], "reactions": [], "legendary": []}
    for a in sorted(acts_by.get(c["pk"], []), key=lambda a: a["fields"]["order_in_statblock"] or 0):
        ta = tr_actions.get(short(a["pk"]))
        need(ta, f"acción sin traducir: {short(a['pk'])}")
        if not ta: continue
        u = uses_text(a["fields"])
        groups[GROUP[a["fields"]["action_type"]]].append({"name": ta["name"] + (f" ({u})" if u else ""), "text": ta["desc"]})
        check_es(f"acción {short(a['pk'])}", ta["desc"])
    for x in tr_traits: check_es(f"rasgo {cid}/{x['name']}", x["desc"])
    creature = {"id": cid, "name": creature_names[cid], "en": f["name"], "group": "Animales" if f["category"] in ("Animals", "Beast") else "Monstruos",
                "type": tname, "size": size, "alignment": ALIGN.get(f["alignment"], f["alignment"]),
                "ac": f["armor_class"], "acNote": "armadura natural" if f["armor_detail"] == "natural armor" else "",
                "hp": f["hit_points"], "hd": f["hit_dice"] or "", "speed": ", ".join(speed), "init": f["initiative_bonus"],
                "abilities": abilities, "skills": ", ".join(skills),
                "vulnerable": dmg(f["damage_vulnerabilities"]), "resist": dmg(f["damage_resistances"]), "immune": imm,
                "senses": ", ".join(senses), "languages": t.get("languages", "") or "Ninguno",
                "cr": cr, "xp": XP.get(cr, 0), "pb": pb_for(f["challenge_rating"]),
                "traits": [{"name": x["name"], "text": x["desc"]} for x in tr_traits], **{k: v for k, v in groups.items() if v}}
    creatures.append(creature)
need(len(creatures) == 331, f"criaturas: {len(creatures)} de 331")
write("criaturas", creatures)

# ---------- Lo pequeño: especies, propiedades de armas, estados ----------
misc = deep_fix(json.load(open(os.path.join(work, "es", "misc.json"), encoding="utf-8")))
species = []
for s in misc["species"]:
    species.append({"id": s["id"], "name": s["name"], "traits": [{"name": t["name"], "text": t["desc"]} for t in s["traits"]]})
    for t in s["traits"]: check_es(f"especie {s['id']}", t["desc"])
need(len(species) == 9, f"especies: {len(species)}")
write("especies", species)

props_es = {p["id"]: p for p in misc["weaponProperties"]}
WEAPON = {"battleaxe": "Hacha de batalla", "blowgun": "Cerbatana", "club": "Garrote", "dagger": "Daga", "dart": "Dardo",
          "flail": "Mangual", "glaive": "Guja", "greataxe": "Gran hacha", "greatclub": "Gran clava", "greatsword": "Espadón",
          "halberd": "Alabarda", "hand-crossbow": "Ballesta de mano", "handaxe": "Hacha de mano", "heavy-crossbow": "Ballesta pesada",
          "javelin": "Jabalina", "lance": "Lanza de caballería", "light-crossbow": "Ballesta ligera", "light-hammer": "Martillo ligero",
          "longbow": "Arco largo", "longsword": "Espada larga", "mace": "Maza", "maul": "Mazo", "morningstar": "Lucero del alba",
          "musket": "Mosquete", "pike": "Pica", "pistol": "Pistola", "quarterstaff": "Bastón", "rapier": "Estoque",
          "scimitar": "Cimitarra", "shortbow": "Arco corto", "shortsword": "Espada corta", "sickle": "Hoz", "sling": "Honda",
          "spear": "Lanza", "trident": "Tridente", "war-pick": "Pico de guerra", "warhammer": "Martillo de guerra", "whip": "Látigo"}
AMMO = {"Arrow": "flecha", "Bolt": "virote", "Needle": "aguja", "Bullet, Sling": "bala de honda", "Sling Bullet": "bala de honda",
        "Bullet, Firearm": "bala", "Firearm Bullet": "bala", "Bullet": "bala"}
items = {}
for it in load("Item"):
    key = it["fields"]["weapon"] or it["fields"]["armor"]
    if key: items[key] = it["fields"]
money = lambda v: (lambda x: f"{int(x)} po" if x >= 1 else f"{int(round(x * 10))} pp" if x >= 0.1 else f"{int(round(x * 100))} pc")(float(v))
weight = lambda v: (lambda x: "—" if not x else (f"{x:g}".replace(".", ",") + " lb"))(float(v or 0))

def detail_es(prop, detail):
    if not detail: return ""
    m = re.match(r"Range (\d+/\d+)(?:; (.+))?", detail)
    if m:
        ammo = AMMO.get((m.group(2) or "").strip(), (m.group(2) or "").lower())
        return f"alcance {m.group(1)}" + (f"; {ammo}" if ammo else "")
    return detail

assign = {}
for a in load("WeaponPropertyAssignment"):
    assign.setdefault(a["fields"]["weapon"], []).append(a["fields"])
weapons = []
for w in sorted(load("Weapon"), key=lambda w: (not w["fields"]["is_simple"], WEAPON[short(w["pk"])])):
    f, wid = w["fields"], short(w["pk"])
    props, mastery = [], ""
    for a in assign.get(w["pk"], []):
        p = props_es[short(a["property"])]
        if a["property"].endswith("-mastery"): mastery = p["name"]
        else:
            d = detail_es(a["property"], a["detail"])
            props.append(p["name"] + (f" ({d})" if d else ""))
    ranged = any(a["property"].endswith("ammunition-wp") for a in assign.get(w["pk"], [])) or wid == "dart"
    it = items.get(w["pk"], {})
    weapons.append({"id": wid, "name": WEAPON[wid], "en": f["name"],
                    "category": ("Sencilla" if f["is_simple"] else "Marcial") + (" a distancia" if ranged else " cuerpo a cuerpo"),
                    "damage": f"{f['damage_dice']} {DAMAGE[f['damage_type']]}", "properties": sorted(props), "mastery": mastery,
                    "cost": money(it["cost"]) if it.get("cost") else "—", "weight": weight(it.get("weight"))})
need(len(weapons) == 38, f"armas: {len(weapons)}")

ARMOR = {"padded": ("Acolchada", "ligera"), "leather": ("Cuero", "ligera"), "studded-leather": ("Cuero tachonado", "ligera"),
         "hide": ("Pieles", "intermedia"), "chain-shirt": ("Camisa de malla", "intermedia"), "scale-mail": ("Cota de escamas", "intermedia"),
         "breastplate": ("Coraza", "intermedia"), "half-plate": ("Media armadura", "intermedia"), "ring-mail": ("Cota de anillas", "pesada"),
         "chain-mail": ("Cota de malla", "pesada"), "splint": ("Bandas", "pesada"), "plate": ("Placas", "pesada"), "shield": ("Escudo", "escudo")}
ARMOR_ALIAS = {"padded-armor": "padded", "leather-armor": "leather", "studded-leather-armor": "studded-leather", "hide-armor": "hide",
               "half-plate-armor": "half-plate", "splint-armor": "splint", "plate-armor": "plate"}
DON = {"ligera": "1 minuto / 1 minuto", "intermedia": "5 minutos / 1 minuto", "pesada": "10 minutos / 5 minutos", "escudo": "1 acción / 1 acción"}
armor = []
for a in load("Armor"):
    f, aid = a["fields"], ARMOR_ALIAS.get(short(a["pk"]), short(a["pk"]))
    name, kind = ARMOR[aid]
    ac = f"+{f['ac_base']}" if kind == "escudo" else str(f["ac_base"]) + (" + mod. de Des" if f["ac_add_dexmod"] and not f["ac_cap_dexmod"] else f" + mod. de Des (máx. {f['ac_cap_dexmod']})" if f["ac_add_dexmod"] else "")
    it = items.get(a["pk"], {})
    armor.append({"id": aid, "name": name, "en": f["name"], "kind": kind, "ac": ac,
                  "strength": f"Fue {f['strength_score_required']}" if f["strength_score_required"] else "—",
                  "stealth": "Desventaja" if f["grants_stealth_disadvantage"] else "—", "don": DON[kind],
                  "cost": money(it["cost"]) if it.get("cost") else "—", "weight": weight(it.get("weight"))})
order = list(ARMOR)
armor.sort(key=lambda a: order.index(a["id"]))
need(len(armor) == 13, f"armaduras: {len(armor)}")
write("equipo", {"weapons": weapons, "armor": armor,
                 "properties": [{"name": p["name"], "text": p["desc"], "mastery": p["id"].endswith("-mastery")} for p in misc["weaponProperties"]]})

# ---------- Reglas y estados ----------
tr = es_chunks("rules")
chapters, current = [], None
for r in sum((json.load(open(f)) for f in sorted(glob.glob(os.path.join(work, "en", "rules-[0-9]*.json")))), []):
    t = tr.get(r["id"])
    need(t, f"regla sin traducir: {r['id']}")
    if not t: continue
    check_es(f"regla {r['id']}", t["desc"])
    if r["id"].startswith("set-"):
        current = {"id": r["set"], "name": t.get("setName") or r.get("setName"), "intro": t["desc"], "sections": []}
        chapters.append(current)
    else:
        current["sections"].append({"name": t["name"], "text": t["desc"]})
# cada efecto del estado con su nombre en negrita: «* Velocidad 0. Tu velocidad…»
bold_lead = lambda t: re.sub(r"(?m)^(\s*\*\s+)([^.\n*]{2,60}\.)\s", r"\1**\2** ", t)
conditions = [{"id": c["id"], "name": CONDITION[c["id"]], "text": bold_lead(c["desc"])} for c in misc["conditions"]]
for c in conditions: check_es(f"estado {c['id']}", c["text"])
write("reglas", {"chapters": chapters, "conditions": sorted(conditions, key=lambda c: c["name"])})

if problems:
    print(f"\n{len(problems)} avisos:")
    for p in problems[:80]: print(" -", p)
    sys.exit(1)
print("todo en orden")
