function parseFile() {
    const fileInput = document.getElementById('file-upload');
    const excludeInput = document.getElementById('exclude-models');

    const excludeModels = new Set(excludeInput.value.split(',').map(id => id.trim()));

    if (!fileInput.files.length) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        const { luaCode, editedMapContent } = parseMapToLua(fileContent, excludeModels);

        downloadLua(luaCode);
        downloadMap(editedMapContent);
    };
    reader.readAsText(file);
}

function parseMapToLua(mapContent, excludeModels) {
    const objectPattern = /<object[^>]*model="(\d+)"[^>]*posX="([^"]+)"[^>]*posY="([^"]+)"[^>]*posZ="([^"]+)"[^>]*rotX="([^"]+)"[^>]*rotY="([^"]+)"[^>]*rotZ="([^"]+)"[^>]*>/g;
    let luaCode = ['addEventHandler("onClientPreRender", root, function()'];
    const modelData = {};
    let editedMapContent = mapContent;

    let match;
    while ((match = objectPattern.exec(mapContent)) !== null) {
        const model = match[1];

        if (excludeModels.has(model)) continue;

        const posX = match[2];
        const posY = match[3];
        const posZ = match[4];
        const rotX = match[5];
        const rotY = match[6];
        const rotZ = match[7];

        if (!modelData[model]) {
            modelData[model] = [];
        }
        modelData[model].push([posX, posY, posZ, rotX, rotY, rotZ]);

        const objectLine = match[0];
        editedMapContent = editedMapContent.replace(objectLine + '\n', '');
    }

    const sortedModels = Object.keys(modelData).sort((a, b) => parseInt(a) - parseInt(b));

    sortedModels.forEach(model => {
        luaCode.push(`    engineStreamingRequestModel(${model})`);
        modelData[model].forEach(coords => {
            luaCode.push(`    dxDrawModel3D(${model}, ${coords.join(', ')})`);
        });
    });

    luaCode.push("end)");

    return { luaCode: luaCode.join("\n"), editedMapContent };
}

function downloadLua(luaCode) {

    const blob = new Blob([luaCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'output.lua';
    link.click();


    URL.revokeObjectURL(url);
}

function downloadMap(editedMapContent) {

    const blob = new Blob([editedMapContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'edited_map.map';
    link.click();

    URL.revokeObjectURL(url);
}
