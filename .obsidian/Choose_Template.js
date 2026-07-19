module.exports = async (tp) => {  // Declare async function
    const selectedTemplate = await tp.system.suggester(
        ["Government Template", "Economics Template", "Factions Template"], // Template names for user selection
        ["Z_Templates/Government_Template.md", "Z_Templates/Economics_Template.md", "Z_Templates/Factions_Template.md"] // Full template paths
    );

    if (selectedTemplate) {
        const content = await tp.file.include(selectedTemplate); // Fetch content of the selected template
        return content;  // Return the content for insertion into the active file
    } else {
        return "No template selected."; // Return a fallback message if nothing is selected
    }
};

