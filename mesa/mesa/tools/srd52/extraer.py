#!/usr/bin/env python3
"""Mesa · paso 1 del manual 5.5: sacar del SRD 5.2 lo que hay que traducir.

Lee los datos del SRD 5.2 (Wizards of the Coast, CC-BY-4.0) tal como los
publica Open5e (https://github.com/open5e/open5e-api, carpeta
data/v2/wizards-of-the-coast/srd-2024) y deja en <salida>/en/ los textos en
inglés partidos en trozos, cada uno con sus ids, para traducirlos.

    python3 tools/srd52/extraer.py <carpeta srd-2024> tools/srd52/traduccion

Los trozos traducidos van en <salida>/es/ con el mismo nombre; montar.py los
junta. La traducción que usa Mesa ya está en tools/srd52/traduccion.
"""
import json, os, sys

src, out = sys.argv[1], sys.argv[2]
load = lambda n: json.load(open(os.path.join(src, n + ".json"), encoding="utf-8"))
os.makedirs(os.path.join(out, "en"), exist_ok=True)
short = lambda pk: pk.removeprefix("srd-2024_")

def chunks(items, size, prefix):
    part, n, acc = [], 0, 0
    for it in items:
        s = len(json.dumps(it, ensure_ascii=False))
        if part and acc + s > size:
            write(f"{prefix}-{n:02d}", part); n += 1; part, acc = [], 0
        part.append(it); acc += s
    if part: write(f"{prefix}-{n:02d}", part)

def write(name, data):
    with open(os.path.join(out, "en", name + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

# Conjuros
spells = sorted(load("Spell"), key=lambda s: (s["fields"]["level"], s["fields"]["name"]))
sp = []
for s in spells:
    f = s["fields"]
    sp.append({k: v for k, v in {
        "id": short(s["pk"]), "name": f["name"], "desc": f["desc"], "higher": f["higher_level"] or "",
        "material": f["material_specified"] or "", "reaction": f["reaction_condition"] or "",
        "range": f["range_text"] or "", "duration": f["duration"] or ""}.items() if v})
chunks(sp, 42000, "spells")
write("spell-names", [{"id": x["id"], "name": x["name"]} for x in sp])

# Criaturas: nombre, idiomas, rasgos y acciones
creatures = sorted(load("Creature"), key=lambda c: c["fields"]["name"])
traits, actions = {}, {}
for t in load("CreatureTrait"):
    traits.setdefault(t["fields"]["parent"], []).append({"name": t["fields"]["name"], "desc": t["fields"]["desc"]})
for a in sorted(load("CreatureAction"), key=lambda a: (a["fields"]["action_type"], a["fields"]["order_in_statblock"] or 0)):
    actions.setdefault(a["fields"]["parent"], []).append({"key": short(a["pk"]), "name": a["fields"]["name"], "desc": a["fields"]["desc"]})
cr = []
for c in creatures:
    f = c["fields"]
    cr.append({k: v for k, v in {
        "id": short(c["pk"]), "name": f["name"], "languages": f["languages_desc"] or "",
        "traits": traits.get(c["pk"], []), "actions": actions.get(c["pk"], [])}.items() if v})
chunks(cr, 42000, "creatures")
write("creature-names", [{"id": x["id"], "name": x["name"]} for x in cr])

# Lo demás, pequeño: especies, propiedades de armas y estados
misc = {
    "species": [{"id": short(s["pk"]), "name": s["fields"]["name"],
                 "traits": [{"name": t["fields"]["name"], "desc": t["fields"]["desc"]} for t in sorted(load("SpeciesTrait"), key=lambda t: t["fields"]["order"]) if t["fields"]["parent"] == s["pk"]]}
                for s in load("Species")],
    "weaponProperties": [{"id": short(p["pk"]), "name": p["fields"]["name"], "desc": p["fields"]["desc"]} for p in load("WeaponProperty")],
    "conditions": [{"id": c["fields"]["describes"], "desc": c["fields"]["desc"]} for c in load("ConditionDescription")]
}
write("misc", misc)

# El reglamento: cada apartado, en el orden del documento
sets = {r["pk"]: r["fields"]["name"] for r in load("RuleSet")}
intros = {r["pk"]: r["fields"].get("desc", "") for r in load("RuleSet")}
rules = []
for pk, set_name in sets.items():
    # la entrada de cada capítulo, y luego sus apartados
    rules.append({"id": "set-" + short(pk), "set": short(pk), "setName": set_name, "name": "", "desc": intros[pk]})
    rules += [{"id": short(r["pk"]), "set": short(pk), "name": r["fields"]["name"], "desc": r["fields"]["desc"]}
              for r in sorted(load("Rule"), key=lambda r: r["fields"]["index"]) if r["fields"]["ruleset"] == pk]
chunks(rules, 46000, "rules")
print("listo:", len(sp), "conjuros,", len(cr), "criaturas")
