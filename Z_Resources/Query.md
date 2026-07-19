# 🔍 Recipe Search Engine

> [!abstract| small] Search Control

```meta-bind-button
label: Query Database
icon: "search"
hidden: false
class: ""
tooltip: "Click to insert a dynamic Dataview recipe table"
id: InsertRecipeTableBtn
style: primary
actions:
- type: runTemplaterFile
  templateFile: Z_Templates/Insert_Recipe_Table.md
```

---

## Active Query Results
> **Filter:** Ingredients [AND]: Bananana [fruit]

```dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, Liquid_base AS "Liquid Base", grains_legumes AS "Grains & Legumes", proteins AS "Proteins", status AS "Status"
FROM ""
WHERE (contains(lower(string(proteins)), "bananana") OR contains(lower(string(Liquid_base)), "bananana") OR contains(lower(string(Base)), "bananana") OR contains(lower(string(spices)), "bananana") OR contains(lower(string(veggies)), "bananana") OR contains(lower(string(dairy)), "bananana") OR contains(lower(string(grains_legumes)), "bananana") OR contains(lower(string(grains)), "bananana") OR contains(lower(string(fruit)), "bananana") OR contains(lower(string(proteins)), "banananas") OR contains(lower(string(Liquid_base)), "banananas") OR contains(lower(string(Base)), "banananas") OR contains(lower(string(spices)), "banananas") OR contains(lower(string(veggies)), "banananas") OR contains(lower(string(dairy)), "banananas") OR contains(lower(string(grains_legumes)), "banananas") OR contains(lower(string(grains)), "banananas") OR contains(lower(string(fruit)), "banananas"))
SORT file.name ASC
```
