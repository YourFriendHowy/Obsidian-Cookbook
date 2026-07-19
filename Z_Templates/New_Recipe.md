<%*
(async () => {
    // --- HELPER: FORMAT STRING (Title-Case-With-Hyphens) ---
    const formatValue = (str) => {
        if (!str) return "";
        return str
            .trim()
            .split(/[\s-]+/) // Split on spaces or existing hyphens
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('-');
    };

    // --- HELPER: AUTOMATIC VAULT-WIDE SUGGESTIONS & CHECKBOX LISTS ---
    async function promptMultiSelect(keyName, titleLabel, isSingleValue = false) {
        const uniqueValues = new Set();
        const files = app.vault.getMarkdownFiles();
        
        for (const file of files) {
            const cache = app.metadataCache.getFileCache(file);
            if (cache && cache.frontmatter && cache.frontmatter[keyName]) {
                const val = cache.frontmatter[keyName];
                if (Array.isArray(val)) {
                    val.forEach(v => { if(v) uniqueValues.add(String(v).trim()); });
                } else {
                    uniqueValues.add(String(val).trim());
                }
            }
        }
        
        let pool = Array.from(uniqueValues).sort();
        let selected = [];
        let picking = true;

        while (picking) {
            let options = ["== DONE / SUBMIT ==", "➕ [Add New Custom Value]"];
            
            pool.forEach(item => {
                const isChecked = selected.includes(item) ? "☑️" : "☐";
                options.push(`${isChecked} ${item}`);
            });

            const currentSelectionText = selected.join(', ') || 'None';
            const choice = await tp.system.suggester(options, options, false, `${titleLabel} (Selected: ${currentSelectionText})`);
            
            if (choice === null || choice === "== DONE / SUBMIT ==") {
                picking = false;
            } else if (choice === "➕ [Add New Custom Value]") {
                const newVal = await tp.system.prompt(`Type new custom value(s) for ${titleLabel} (separate multiple items with commas):`);
                if (newVal && newVal.trim()) {
                    const itemsToAdd = newVal.split(',')
                        .map(s => formatValue(s.replace(/^#/, '')))
                        .filter(s => s.length > 0);

                    itemsToAdd.forEach(cleanVal => {
                        if (!pool.includes(cleanVal)) pool.push(cleanVal);
                        if (!selected.includes(cleanVal)) selected.push(cleanVal);
                    });
                    pool.sort();
                    if (isSingleValue) picking = false; 
                }
            } else {
                const rawItem = choice.replace(/^[☑️☐]\s*/, ""); 
                if (selected.includes(rawItem)) {
                    selected = selected.filter(i => i !== rawItem);
                } else {
                    if (isSingleValue) {
                        selected = [rawItem];
                        picking = false;
                    } else {
                        selected.push(rawItem);
                    }
                }
            }
        }
        return isSingleValue ? (selected[0] || "") : selected;
    }

    // 1. NAME THE RECIPE
    const hasTitle = !tp.file.title.startsWith("Untitled") && !tp.file.title.startsWith("NewRecipe");
    let title = tp.file.title;

    if (!hasTitle) {
        title = await tp.system.prompt("Enter Recipe Name");
        if (!title) return;
        await tp.file.rename(title);
    }

    // 2. GET MEAL TYPE
    const typeOptions = ["Dinner", "Breakfast", "Lunch", "Desserts", "➕ [Type Custom Meal Type]"];
    let chosenType = await tp.system.suggester(typeOptions, typeOptions, false, "Select Meal Type") || "Unsorted";
    if (chosenType === "➕ [Type Custom Meal Type]") {
        const customType = await tp.system.prompt("Type Custom Meal Type (e.g. Snacks, Drinks):");
        chosenType = customType ? formatValue(customType) : "Unsorted";
    }

    // 3. GET CUISINE
    let chosenCuisine = await promptMultiSelect("Cuisine", "Select/Add Cuisine (e.g. American, Mexican)", true);
    if (!chosenCuisine) chosenCuisine = "General";

    // 4. PROPERTY WALKTHROUGH
    let chosenPrepMethod = await promptMultiSelect("prep_method", "Prep Method (e.g. skillet-to-oven, slow-cook)", true);
    let chosenMealPrep   = await promptMultiSelect("Meal_Prep", "Meal Prep Style (e.g. raw-frozen, cooked-frozen, none)", true);
    
    const statusOptions = ["To Try", "Cooked", "Favorite", "➕ [Type Custom Status]"];
    let chosenStatus = await tp.system.suggester(statusOptions, statusOptions, false, "Select Recipe Status") || "To Try";
    if (chosenStatus === "➕ [Type Custom Status]") {
        const customStatus = await tp.system.prompt("Type Custom Status:");
        chosenStatus = customStatus ? formatValue(customStatus) : "To Try";
    }

    let chosenSource = await tp.system.prompt("Enter Recipe Source/URL (Optional):") || "";
    
    // INGREDIENTS & TAGS
    const chosenProteins     = await promptMultiSelect("proteins", "Select/Add Proteins");
    const chosenLiquidBase   = await promptMultiSelect("Liquid_base", "Select/Add Liquid Base");
    const chosenSpices       = await promptMultiSelect("spices", "Select/Add Spices & Seasonings");
    const chosenVeggies      = await promptMultiSelect("veggies", "Select/Add Vegetables");
    const chosenDairy        = await promptMultiSelect("dairy", "Select/Add Dairy Ingredients");
    const chosenGrainsLeg    = await promptMultiSelect("grains_legumes", "Select/Add Grains & Legumes");
    const chosenFruit        = await promptMultiSelect("fruit", "Select/Add Fruits");
    
    const chosenTags         = await promptMultiSelect("tags", "Select/Add Tags");

    let descriptionText      = await tp.system.prompt("Enter a brief description (Optional):") || "";

    // 5. STEPS AND INSTRUCTIONS
    let prepStepsRaw = await tp.system.prompt("Enter Preparation Steps (separate each step with a comma):") || "";
    let cookStepsRaw = await tp.system.prompt("Enter Cooking Instructions (separate each step with a comma):") || "";

    const parseStepsToList = (rawText) => {
        if (!rawText || !rawText.trim()) return "*(No steps entered)*\n";
        const steps = rawText.split(',').map(step => step.trim()).filter(step => step.length > 0);
        if (steps.length === 0) return "*(No steps entered)*\n";
        return steps.map((step, index) => `${index + 1}. ${step}`).join('\n') + "\n";
    };

    let prepListFormatted = parseStepsToList(prepStepsRaw);
    let cookListFormatted = parseStepsToList(cookStepsRaw);

    // 6. IMAGE DOWNLOADER & LOCAL VAULT PICKER
    let selectedImage = "";
    const imageUrlInput = await tp.system.prompt("Enter a web image URL to download (Or press Enter to browse local vault images):") || "";
    
    if (imageUrlInput.trim().startsWith("http")) {
        try {
            let extension = "jpg";
            const urlMatches = imageUrlInput.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
            if (urlMatches) {
                extension = urlMatches[1].toLowerCase();
            }
            
            const imageFolder = "ZZZZ images";
            const targetImageName = `${title}.${extension}`;
            const fullImagePath = `${imageFolder}/${targetImageName}`;
            
            if (!await app.vault.adapter.exists(imageFolder)) {
                await app.vault.createFolder(imageFolder);
            }
            
            const response = await requestUrl({ url: imageUrlInput.trim(), method: "GET", contentType: "arraybuffer" });
            
            if (response.status === 200) {
                if (await app.vault.adapter.exists(fullImagePath)) {
                    const oldFile = app.vault.getAbstractFileByPath(fullImagePath);
                    if (oldFile) await app.vault.delete(oldFile);
                }
                
                await app.vault.createBinary(fullImagePath, response.arrayBuffer);
                selectedImage = targetImageName;
                new Notice(`Successfully downloaded image to ${fullImagePath}!`);
            }
        } catch (err) {
            new Notice("Failed downloading image URL. Falling back to vault picker.");
            console.error("Image downloader failed:", err);
        }
    }
    
    if (!selectedImage) {
        const imageFiles = app.vault.getFiles()
            .filter(f => ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(f.extension))
            .map(f => f.path);

        if (imageFiles.length > 0) {
            const pick = await tp.system.suggester(imageFiles, imageFiles, false, "Select a food photo for the infobox (Optional)");
            if (pick) selectedImage = pick;
        }
    }

    // --- BUILD THE FULL DATA STRING ---
    let output = `---\ntitle: "${title}"\nCuisine: "${chosenCuisine}"\ntype: "${chosenType}"\nprep_method: "${chosenPrepMethod}"\n`;
    
    output += `proteins: [${chosenProteins.map(p => `"${p}"`).join(', ')}]\n`;
    output += `Liquid_base: [${chosenLiquidBase.map(b => `"${b}"`).join(', ')}]\n`;
    output += `spices: [${chosenSpices.map(s => `"${s}"`).join(', ')}]\n`;
    output += `veggies: [${chosenVeggies.map(v => `"${v}"`).join(', ')}]\n`;
    output += `dairy: [${chosenDairy.map(d => `"${d}"`).join(', ')}]\n`;
    output += `grains_legumes: [${chosenGrainsLeg.map(g => `"${g}"`).join(', ')}]\n`;
    output += `fruit: [${chosenFruit.map(f => `"${f}"`).join(', ')}]\n`;
    
    output += `Meal_Prep: "${chosenMealPrep}"\nsource: "${chosenSource}"\nstatus: "${chosenStatus}"\nDescription: "${descriptionText}"\n`;
    output += `tags: [${chosenTags.map(t => `"${t}"`).join(', ')}]\n---\n\n`;

    output += `# ${title}\n\n`;
    output += `> [!infobox|left]\n`;
    output += `> # \`=this.file.name\`\n`;
    
    if (selectedImage) {
        output += `> ![[${selectedImage}|cover small]]\n`;
    } else {
        output += `> *(No image selected)*\n`;
    }
    
    output += `> ###### Details\n`;
    output += `> | Type | Detail |\n`;
    output += `> | --- | --- |\n`;
    output += `> | Meal Type | \`=this.type\` |\n`;
    output += `> | Cuisine | \`=this.Cuisine\` |\n`;
    output += `> | Prep Method | \`=this.prep_method\` |\n`;
    output += `> ###### Ingredients\n`;
    output += `> | Type | Ingredients |\n`;
    output += `> | --- | --- |\n`;
    output += `> | Proteins | \`=this.proteins\` |\n`;
    output += `> | Liquid Base | \`=this.Liquid_base\` |\n`;
    output += `> | Spices | \`=this.spices\` |\n`;
    output += `> | Vegetables | \`=this.veggies\` |\n`;
    output += `> | Dairy | \`=this.dairy\` |\n`;
    output += `> | Grains & Legumes | \`=this.grains_legumes\` |\n`;
    output += `> | Fruits | \`=this.fruit\` |\n`;
    output += `> ###### Description\n`;
    output += `> \`=this.Description\`\n\n`;
    
    output += `## Preparation\n${prepListFormatted}\n`;
    output += `## Cooking Instructions\n${cookListFormatted}`;

    // 7. HARD WRITE DIRECTLY TO DISK
    const currentTFile = tp.file.find_tfile(tp.file.path(true));
    if (currentTFile) {
        await app.vault.modify(currentTFile, output);
        
        const cleanFolderPath = `${chosenType}/${chosenCuisine}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        const pathSegments = cleanFolderPath.split('/');
        let currentPath = "";
        
        for (const segment of pathSegments) {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            const folderExists = app.vault.getAbstractFileByPath(currentPath);
            if (!folderExists) {
                await app.vault.createFolder(currentPath);
            }
        }

        const cleanDestinationPath = `${cleanFolderPath}/${title}.md`;
        await app.fileManager.renameFile(currentTFile, cleanDestinationPath);

        // 8. SWITCH ACTIVE VIEW TO READING MODE
        setTimeout(async () => {
            const activeView = app.workspace.getActiveFileView();
            if (activeView && activeView.getState) {
                const currentState = activeView.getState();
                currentState.mode = "preview";
                await activeView.setState(currentState, { history: false });
            }
        }, 100);
    }
})();
-%>