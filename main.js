const {app, BrowserWindow, Menu} = require('electron');
const path = require('path');
const shell = require('electron').shell;
const contextMenu = require('electron-context-menu');
const windowStateKeeper = require('electron-window-state');

function createWindow () {

  // Load the previous state with fallback to defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 900
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    title: 'Indigenous',
    icon: __dirname + '/images/icon-big.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  mainWindowState.manage(mainWindow);

  let application_menu = [
    {
      label: 'Menu',
      role: 'fileMenu',
    },
    {
      label: 'Edit',
      role: 'editMenu',
    },
    {
      label: 'View',
      role: 'viewMenu',
    },
    {
      label: 'Window',
      role: 'windowMenu',
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Search issues',
          click() {
            shell.openExternal("https://github.com/swentel/indigenous-desktop");
          }
        }
      ]
    }
  ];

  let menu = Menu.buildFromTemplate(application_menu);
  Menu.setApplicationMenu(menu);

  contextMenu({
    prepend: (defaultActions, params, browserWindow) => [
      {
        label: 'Search  for “{selection}”',
        // Only show it when right-clicking text
        visible: params.selectionText.trim().length > 0,
        click: () => {
          shell.openExternal(`https://duckduckgo.com/?q=${encodeURIComponent(params.selectionText)}`);
        }
      }
    ],
    showInspectElement: !app.isPackaged
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
});
