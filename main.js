const electron = require('electron');
const path = require('path');
const url = require('url');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);

// SET ENV
process.env.NODE_ENV = 'development';

const { app, BrowserWindow, Menu, ipcMain } = electron;

let mainWindow;
let addWindow;
let openItemWindow;
let client;

app.on('ready', function () {
  mainWindow = new BrowserWindow({});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, './views/mainWindow.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.on('closed', function () {
    app.quit();
  });

  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
});

function createAddWindow() {
  addWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Connect to redis database'
  });
  addWindow.loadURL(url.format({
    pathname: path.join(__dirname, './views/addWindow.html'),
    protocol: 'file:',
    slashes: true
  }));

  addWindow.on('close', function () {
    addWindow = null;
  });
}

function diconnectFromRedis() {
  if (!client.connected) {
    return;
  }

  client.end(true);
  if (!client.connected) {
    client = null;
    mainWindow.webContents.send('redis:disconnected');
  }
}

function parseKeyspaces(lines) {
  const dbstats = {};
  lines.forEach((line) => {
    if (line.length > 0 && !line.startsWith("#")) {
      parts = line.split(/[\:\=\,]/);
      value = {}
      value[parts[1]] = parseInt(parts[2]);
      value[parts[3]] = parseInt(parts[4]);
      value[parts[5]] = parseInt(parts[6]);
      dbstats[parts[0].slice(2)] = value;
    }
  });
  return dbstats;
}

ipcMain.on('redis:connect', function (error, data) {
  client = redis.createClient({
    host: data.host,
    port: data.port,
    password: data.password,
    retry_strategy: function (options) {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        // End reconnecting with built in error
        return undefined;
      }
      // reconnect after
      return Math.min(options.attempt * 100, 3000);
    }
  });

  client.on('connect', async () => {
    try {
      const keyspace = await client.infoAsync('keyspace');
      const lines = keyspace.split(/\r\n/);
      const dbstats = parseKeyspaces(lines);
      const response = {
        dbstats
      };
      mainWindow.webContents.send('redis:connected', response);
      addWindow.close();
      const keys = await client.keysAsync('*');
      mainWindow.webContents.send('redis:keys', keys);
    } catch (err) {
      console.error(err);
      return;
    }
  });

  client.on('error', (error) => {
    if (!client.connected) {
      console.log(`Error: ${error}`)
    }
  });
});

ipcMain.on('redis:delete', async function (error, item) {
  if (!client.connected) {
    return;
  }
  const response = await client.delAsync(item);
  mainWindow.webContents.send('redis:deleted', response);
});

ipcMain.on('redis:changeDb', async function (error, key) {
  await client.selectAsync(key);
  const keys = await client.keysAsync('*');
  mainWindow.webContents.send('redis:keys', keys);
});

/*
ipcMain.on('redis:openItem', function (error, item) {
  openItemWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Connect to redis database'
  });

  openItemWindow.once('did-finish-load', () => {
    openItemWindow.webContents.send('redis:itemOpen', item);
  });

  openItemWindow.loadURL(url.format({
    pathname: path.join(__dirname, './views/openItemWindow.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Handle garbage collection
  openItemWindow.on('close', function () {
    openItemWindow = null;
  });
});
*/

const mainMenuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Add Redis DB',
        accelerator: process.platform == 'darwin' ? 'Command+O' : 'Ctrl+O',
        click() {
          createAddWindow();
        }
      },
      {
        label: 'Diconnect',
        click() {
          diconnectFromRedis();
        }
      },
      {
        label: 'Quit',
        accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click() {
          app.quit();
        }
      }
    ]
  }
];

if (process.platform == 'darwin') {
  mainMenuTemplate.unshift({});
}

if (process.env.NODE_ENV !== 'production') {
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu: [
      {
        role: 'reload'
      },
      {
        label: 'Toggle DevTools',
        accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}