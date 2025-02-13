function parseFile() {
    const fileInput = document.getElementById('file-upload');
    const excludeInput = document.getElementById('exclude-models');

    const excludeModels = new Set(excludeInput.value.split(',').map(id => id.trim()));

    if (!fileInput.files.length) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];
    const originalFileName = file.name.replace('.map', '');

    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        const { luaCode, editedMapContent } = parseMapToLua(fileContent, excludeModels);

        // ZIP-Datei erstellen und herunterladen
        createAndDownloadZip(luaCode, editedMapContent, originalFileName);
    };
    reader.readAsText(file);
}

function parseMapToLua(mapContent, excludeModels) {
    const objectPattern = /<object[^>]*model="(\d+)"[^>]*scale="([^"]+)"[^>]*posX="([^"]+)"[^>]*posY="([^"]+)"[^>]*posZ="([^"]+)"[^>]*rotX="([^"]+)"[^>]*rotY="([^"]+)"[^>]*rotZ="([^"]+)"[^>]*><\/object>/g;
    let luaCode = ['addEventHandler("onClientPreRender", root, function()'];
    const modelData = {};
    let editedMapContent = mapContent;

    let match;
    while ((match = objectPattern.exec(mapContent)) !== null) {
        const model = match[1];

        // Überspringe ausgeschlossene Modelle
        if (excludeModels.has(model)) continue;

        const scale = match[2];
        const posX = match[3];
        const posY = match[4];
        const posZ = match[5];
        const rotY = match[6];
        const rotX = match[7];
        const rotZ = match[8];

        if (!modelData[model]) {
            modelData[model] = [];
        }
        modelData[model].push([posX, posY, posZ, rotX, rotY, rotZ, scale, scale, scale]);

        // Entfernen der gesamten <object> Zeile aus der Map-Datei
        const objectLine = match[0];
        editedMapContent = editedMapContent.replace(objectLine, '');
    }

    // Entfernen von leeren Zeilen
    editedMapContent = editedMapContent
        .split('\n') // Datei in Zeilen aufteilen
        .filter(line => line.trim() !== '') // Nur nicht-leere Zeilen behalten
        .join('\n'); // Zeilen wieder zusammensetzen

    // Modelle nach ID sortieren
    const sortedModels = Object.keys(modelData).sort((a, b) => parseInt(a) - parseInt(b));

    // Lua-Code generieren
    sortedModels.forEach(model => {
        luaCode.push(`    engineStreamingRequestModel(${model})`);
        modelData[model].forEach(coords => {
            luaCode.push(`    dxDrawModel3D(${model}, ${coords.join(', ')})`);
        });
    });

    luaCode.push("end)");

    return { luaCode: luaCode.join("\n"), editedMapContent };
}

function createAndDownloadZip(luaCode, editedMapContent, originalFileName) {
    const zip = new JSZip();

    // Lua-Datei hinzufügen
    zip.file("DxDrawModel3D.lua", luaCode);

    // Bearbeitete Map-Datei hinzufügen (mit dynamischem Namen)
    const editedMapName = `${originalFileName}_edited.map`;
    zip.file(editedMapName, editedMapContent);

    // ZIP-Datei generieren und herunterladen
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "converted_files.zip"; // Name der ZIP-Datei
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(function(err) {
            console.error("Error while creating the ZIP-File:", err);
        });
}
