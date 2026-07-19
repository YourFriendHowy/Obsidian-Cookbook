`BUTTON[NewRecipeBtn,SearchQuery]`
```meta-bind-button
label: Open Search
icon: "external-link"
hidden: true
class: ""
tooltip: "Click to open the search engine"
id: SearchQuery
style: default
action:
  type: open
  link: "Query.md"
  newTab: true
```
```meta-bind-button
label: Add New Recipe
icon: "cooking-pot"
hidden: true
class: ""
tooltip: "Click to create a new recipe note"
id: NewRecipeBtn
style: primary
actions:
  - type: templaterCreateNote
    templateFile: Z_Templates/New_Recipe.md
    folderPath: /
    fileName: "NewRecipe"
    openNote: true
```