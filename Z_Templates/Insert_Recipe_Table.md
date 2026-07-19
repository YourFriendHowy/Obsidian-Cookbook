<%*
(async () => {
    // HELPER: Generates singular and plural stems for precise matching
    const getStemVariants = (term) => {
        const clean = term.trim().toLowerCase().replace(/^#/, '').replace(/"/g, '\\"');
        if (!clean) return [];
        const variants = new Set([clean]);

        if (clean.endsWith('ies') && clean.length > 3) {
            variants.add(clean.slice(0, -3) + 'y');
        } else if (clean.endsWith('y') && clean.length > 2) {
            variants.add(clean.slice(0, -1) + 'ies');
        } else if (clean.endsWith('es') && clean.length > 3) {
            variants.add(clean.slice(0, -2));
            variants.add(clean.slice(0, -1));
        } else if (clean.endsWith('s') && clean.length > 2) {
            variants.add(clean.slice(0, -1));
        } else {
            variants.add(clean + 's');
        }

        return Array.from(variants);
    };

    const buildFieldCondition = (term, fields) => {
        const variants = getStemVariants(term);
        const checks = [];

        variants.forEach(variant => {
            fields.forEach(field => {
                checks.push(`contains(lower(string(${field})), "${variant}")`);
            });
        });

        return `(${checks.join(" OR ")})`;
    };

    const allFields = [
        "proteins", "Liquid_base", "Base", "spices", "veggies", "dairy", 
        "grains_legumes", "grains", "fruit", "Cuisine", "type", 
        "prep_method", "Description", "tags", "file.tags"
    ];
    const ingredientFields = [
        "proteins", "Liquid_base", "Base", "spices", "veggies", "dairy", 
        "grains_legumes", "grains", "fruit"
    ];

    // --- HELPER: DYNAMIC VAULT FRONTMATTER PARSER WITH PROPERTY TAGS ---
    const getDynamicValuesFromVault = (targetKeys = []) => {
        const uniqueEntries = new Set();
        const files = app.vault.getMarkdownFiles();

        for (const file of files) {
            const cache = app.metadataCache.getFileCache(file);
            if (cache && cache.frontmatter) {
                targetKeys.forEach(key => {
                    const val = cache.frontmatter[key];
                    if (val) {
                        const addValue = (v) => {
                            const trimmed = String(v).trim();
                            if (trimmed) {
                                // Formats display as: "Almond Milk [dairy]"
                                uniqueEntries.add(`${trimmed} [${key}]`);
                            }
                        };

                        if (Array.isArray(val)) {
                            val.forEach(v => addValue(v));
                        } else {
                            addValue(val);
                        }
                    }
                });
            }
        }
        return Array.from(uniqueEntries).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    };

    // --- HELPER: DYNAMIC MULTI-SELECT WITH LOGIC TOGGLE (AND / OR) ---
    const promptDynamicMultiSelect = async (optionsList, promptTitle) => {
        let pool = [...optionsList];
        let selected = [];
        let useOrLogic = false; // Default logic is AND
        let picking = true;

        if (pool.length === 0) {
            new Notice(`No existing frontmatter values found for ${promptTitle}`);
            return { selected: [], useOrLogic: false };
        }

        while (picking) {
            const logicLabel = useOrLogic 
                ? "🔀 Match Logic: [ OR ] (Matches ANY selected)" 
                : "🎯 Match Logic: [ AND ] (Matches ALL selected)";

            let options = [
                "== DONE / RUN QUERY ==",
                logicLabel
            ];
            
            pool.forEach(item => {
                const isChecked = selected.includes(item) ? "☑️" : "☐";
                options.push(`${isChecked} ${item}`);
            });

            const currentSelectionText = selected.join(', ') || 'None';
            const choice = await tp.system.suggester(
                options, 
                options, 
                false, 
                `${promptTitle} (Selected: ${currentSelectionText})`
            );
            
            if (choice === null || choice === "== DONE / RUN QUERY ==") {
                picking = false;
            } else if (choice === logicLabel) {
                useOrLogic = !useOrLogic;
            } else {
                const rawItem = choice.replace(/^[☑️☐]\s*/, ""); 
                if (selected.includes(rawItem)) {
                    selected = selected.filter(i => i !== rawItem);
                } else {
                    selected.push(rawItem);
                }
            }
        }

        // Clean off the "[property]" suffix when passing terms to Dataview search
        const cleanSelectedTerms = selected.map(item => item.replace(/\s*\[.*?\]$/, '').trim());

        return { selected: cleanSelectedTerms, displaySelected: selected, useOrLogic };
    };

    // 1. SELECT SEARCH MODE
    const searchOptions = [
        "🔍 Universal Search (Ingredients, Tags, Cuisine, etc.)",
        "🏷️ Search by Tag Only (#keto, #comfort-food, etc.)",
        "🥩 Search by Ingredients & Spices Only",
        "📂 Filter by Cuisine / Meal Type",
        "📋 Show All Recipes"
    ];

    const chosenMode = await tp.system.suggester(searchOptions, searchOptions, false, "Select Search Method");
    if (!chosenMode) return;

    let dataviewQuery = "";
    let searchLabel = "";

    // 2. BUILD QUERY BASED ON SELECTION
    if (chosenMode.startsWith("🔍 Universal Search")) {
        const dynamicAll = getDynamicValuesFromVault(allFields);
        const { selected, displaySelected, useOrLogic } = await promptDynamicMultiSelect(dynamicAll, "Select Universal Criteria");
        if (selected.length === 0) return;

        const operator = useOrLogic ? " OR\n" : " AND\n";
        const logicTag = useOrLogic ? "OR" : "AND";

        searchLabel = `Universal [${logicTag}]: ${displaySelected.join(", ")}`;
        const conditions = selected.map(term => buildFieldCondition(term, allFields)).join(operator);

        dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, tags AS "Tags", type AS "Meal Type", Cuisine, status AS "Status"
FROM ""
WHERE ${conditions}
SORT file.name ASC
\`\`\``;

    } else if (chosenMode.startsWith("🏷️ Search by Tag")) {
        const dynamicTags = getDynamicValuesFromVault(["tags"]);
        const { selected, displaySelected, useOrLogic } = await promptDynamicMultiSelect(dynamicTags, "Select Tags");
        if (selected.length === 0) return;

        const operator = useOrLogic ? " OR\n" : " AND\n";
        const logicTag = useOrLogic ? "OR" : "AND";

        searchLabel = `Tags [${logicTag}]: ${displaySelected.join(", ")}`;
        const conditions = selected.map(tag => buildFieldCondition(tag, ["tags", "file.tags"])).join(operator);

        dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, tags AS "Tags", type AS "Meal Type", status AS "Status"
FROM ""
WHERE ${conditions}
SORT file.name ASC
\`\`\``;

    } else if (chosenMode.startsWith("🥩 Search by Ingredients")) {
        const dynamicIngredients = getDynamicValuesFromVault(ingredientFields);
        const { selected, displaySelected, useOrLogic } = await promptDynamicMultiSelect(dynamicIngredients, "Select Ingredients & Spices");
        if (selected.length === 0) return;

        const operator = useOrLogic ? " OR\n" : " AND\n";
        const logicTag = useOrLogic ? "OR" : "AND";

        searchLabel = `Ingredients [${logicTag}]: ${displaySelected.join(", ")}`;
        const conditions = selected.map(ing => buildFieldCondition(ing, ingredientFields)).join(operator);

        dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, Liquid_base AS "Liquid Base", grains_legumes AS "Grains & Legumes", proteins AS "Proteins", status AS "Status"
FROM ""
WHERE ${conditions}
SORT file.name ASC
\`\`\``;

    } else if (chosenMode.startsWith("📂 Filter by Cuisine")) {
        const dynamicCuisines = getDynamicValuesFromVault(["type", "Cuisine"]);
        const { selected, displaySelected, useOrLogic } = await promptDynamicMultiSelect(dynamicCuisines, "Select Cuisine / Meal Types");
        if (selected.length === 0) return;

        const operator = useOrLogic ? " OR\n" : " AND\n";
        const logicTag = useOrLogic ? "OR" : "AND";

        searchLabel = `Cuisine/Type [${logicTag}]: ${displaySelected.join(", ")}`;
        const conditions = selected.map(val => buildFieldCondition(val, ["type", "Cuisine"])).join(operator);

        dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, type AS "Meal Type", Cuisine, prep_method AS "Prep Method", status AS "Status"
FROM ""
WHERE ${conditions}
SORT file.name ASC
\`\`\``;

    } else {
        searchLabel = "All Recipes";
        dataviewQuery = `\`\`\`dataview
TABLE WITHOUT ID link(file.name) AS "Recipe", Description, tags AS "Tags", type AS "Meal Type", Cuisine, status AS "Status"
FROM ""
WHERE type != null OR Cuisine != null
SORT file.name ASC
\`\`\``;
    }

    // 3. TARGET RESOLUTION: ALLOW QUERY OR ROOT NOTES
    const isAllowedTargetNote = (file) => {
        if (!file) return false;
        const path = file.path.toLowerCase();
        const name = file.basename.toLowerCase();
        
        if (name === "query" || path.includes("z_resources/query")) return true;

        const isInRoot = !file.path.includes("/");
        const isSystem = name.includes("button") || 
                         name.includes("template") || 
                         name === "insert_recipe_table" || 
                         name === "new_recipe";

        return isInRoot && !isSystem;
    };

    let targetFile = null;

    const activeLeaf = app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view?.file) {
        const file = activeLeaf.view.file;
        if (isAllowedTargetNote(file)) targetFile = file;
    }

    if (!targetFile) {
        const mainLeaves = app.workspace.getLeavesOfType("markdown")
            .filter(leaf => leaf.getRoot() === app.workspace.rootSplit);

        for (const leaf of mainLeaves) {
            const file = leaf.view?.file;
            if (isAllowedTargetNote(file)) {
                targetFile = file;
                break;
            }
        }
    }

    // 4. PRESERVE HEADER & OVERWRITE QUERY SECTION
    if (targetFile) {
        const existingContent = await app.vault.read(targetFile);
        
        const defaultHeader = `# 🔍 Recipe Search Engine\n\n> [!abstract] Search Control\n> \`\`\`meta-bind-button\n> label: "Run Search Query"\n> icon: "search"\n> style: primary\n> action:\n>   type: templater\n>   file: "Z_Templates/Insert_Recipe_Table.md"\n> \`\`\`\n\n---`;

        let headerPart = defaultHeader;

        if (existingContent.includes("---")) {
            headerPart = existingContent.split("---")[0].trim() + "\n\n---";
        }

        const newResultsPart = `\n\n## Active Query Results\n> **Filter:** ${searchLabel}\n\n${dataviewQuery}\n`;

        const finalNoteContent = headerPart + newResultsPart;

        await app.vault.modify(targetFile, finalNoteContent);
        new Notice(`Updated query in "${targetFile.basename}"`);
    } else {
        new Notice("Error: Please open Query or a valid root note first!");
    }
})();
-%>