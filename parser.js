let luaCodeForDownload = "";

function parseFile() {
    const fileInput = document.getElementById('file-upload');
    const excludeInput = document.getElementById('exclude-models');
    const output = document.getElementById('output');
    const downloadButton = document.getElementById('download-button');

    const excludeModels = new Set(excludeInput.value.split(',').map(id => id.trim()));

    if (!fileInput.files.length) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onload = function(event) {
        const fileContent = event.target.result;
        luaCodeForDownload = parseMapToLua(fileContent, excludeModels);

        output.textContent = luaCodeForDownload;

        downloadButton.style.display = 'inline-block';
    };
    reader.readAsText(file);
}

function parseMapToLua(mapContent, excludeModels) {
    const objectPattern = /<object[^>]*model="(\d+)"[^>]*posX="([^"]+)"[^>]*posY="([^"]+)"[^>]*posZ="([^"]+)"[^>]*rotX="([^"]+)"[^>]*rotY="([^"]+)"[^>]*rotZ="([^"]+)"[^>]*>/g;
    let luaCode = ['addEventHandler("onClientPreRender", root, function()'];
    const modelData = {};

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
    }

    const sortedModels = Object.keys(modelData).sort((a, b) => parseInt(a) - parseInt(b));

    sortedModels.forEach(model => {
        luaCode.push(`    engineStreamingRequestModel(${model})`);
        modelData[model].forEach(coords => {
            luaCode.push(`    dxDrawModel3D(${model}, ${coords.join(', ')})`);
        });
    });

    luaCode.push("end)");

    return luaCode.join("\n");
}

function downloadLua() {

    const blob = new Blob([luaCodeForDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);


    const link = document.createElement('a');
    link.href = url;
    link.download = 'output.lua';  
    link.click();

    URL.revokeObjectURL(url);
}
