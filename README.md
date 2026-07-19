# Obsidian Cookbook

A dynamic, fully automated recipe management and meal-planning system built for [Obsidian](https://obsidian.md/). 

Designed for modularity, speed, and ease of use, this vault leverages **Templater**, **Dataview**, **Meta Bind**, and the **ITS Theme** to create a seamless, interactive cookbook without needing to write custom code manually.

---

## Required Theme

- **[ITS Theme](https://github.com/SlRvb/Obsidian-ITS-Theme):** **Required.** Powers the custom `[!infobox]` callout layouts, recipe card formatting, and overall vault styling.

---

## Plugins

### Required Plugins
The core automation, interactive buttons, and custom link styling rely on the following community plugins:

- **[Templater](https://github.com/SilentVoid13/Templater):** Runs the script logic for recipe creation, dynamic prompt modals, and file management.
- **[Dataview](https://github.com/blacksmithgu/obsidian-dataview):** Renders dynamic tables and searches recipe frontmatter.
- **[Meta Bind](https://github.com/molerich/obsidian-meta-bind):** Drives interactive buttons and dashboard UI controls.
- **Advanced Tables:** Simplifies Markdown table editing and navigation.
- **Iconize:** Displays custom icons in the file tree and dashboard navigation.
- **Style Settings:** Unlocks customization options for the ITS Theme's callout boxes and layout parameters.
- **Supercharged Links:** Applies frontmatter-based styling and icons directly to internal recipe links.

### Recommended Plugins
- **[Omnisearch](https://github.com/scambier/obsidian-omnisearch):** Useful for fast fuzzy searching across full note body text, complementary to the structured Query Engine.

---

## Features

- **Automated Recipe Creator (`New_Recipe.md`):**
  - Interactive multi-select UI for selecting ingredients, base liquids, grains, spices, cuisines, and meal types.
  - Dynamically parses existing vault frontmatter so you never have to re-type existing ingredients.
  - Automatic singular/plural stemming (e.g., matching `Lentils` to `Lentil`).

- **Real-Time Search Engine (`Query.md`):**
  - Interactive dashboard driven by embedded Meta Bind buttons.
  - Filter recipes by Cuisines, Meal Types, Tags, or Ingredients.
  - Dynamic `AND / OR` matching logic toggle directly inside the selector.
  - Displays property origin tags (e.g., `Almond Milk [dairy]` vs `Almond Milk [Liquid_base]`) to eliminate collision duplicates.

- ** Clean & Modular Structure:**
  - Strict folder organization dividing recipes (`Breakfast`, `Lunch`, `Dinner`, `Desserts`, `Beverages`) from templates and system resources (`Z_Templates`, `Z_Resources`).
  - Targeted query insertion safeguards that keep your actual recipe files clean.

---

## How to Use

### 1. Adding a New Recipe
- Click the **Add New Recipe** button on your dashboard (or run the Templater template `Z_Templates/New_Recipe.md`).
- Complete the interactive prompts to tag ingredients, meal types, and prep methods.
- Your new recipe note will be automatically structured and moved into its proper folder.

### 2. Searching & Filtering
- Open `Query.md` (or click the **Open Search** button).
- Click **Query Database**.
- Toggle items using the `☐` / `☑️` checkboxes, switch between `[ AND ]` or `[ OR ]` logic at the top, and select `== DONE / RUN QUERY ==`.
- The page instantly generates an active Dataview table matching your criteria.

---

## AI Development Note

The Templater scripts and Dataview integration code in this repository were designed and developed in collaboration with **AI assistance (Gemini)**. The scripts are tailored specifically for Obsidian file system management, frontmatter cache parsing, and user-friendly Templater modals.

---

## License

[MIT](LICENSE) - Feel free to fork, adapt, and build upon this setup for your own Obsidian vault!