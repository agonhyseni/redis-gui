const electron = require('electron');
const { ipcRenderer } = electron;
const itemContent = document.querySelector('#item-content');
ipcRenderer.on('redis:itemOpen', (error, data) => {
    itemContent.innerHTML = data;
});