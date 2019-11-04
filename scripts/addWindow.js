const electron = require('electron');
const { ipcRenderer } = electron;

document.querySelector('form').addEventListener('submit', submitForm);

function submitForm(e) {
    e.preventDefault();
    const host = document.querySelector('#host').value;
    const port = parseInt(document.querySelector('#port').value);
    const password = document.querySelector('#password').value;
    if (!host || !port || !password) {
        alert('Please fill all inputs');
        return;
    }
    const data = { host, port, password }
    ipcRenderer.send('redis:connect', data);
}