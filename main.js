// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu} = require('electron')
const path = require('path')
const shell = require('electron').shell;

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    title: 'Indigenous',
    icon: __dirname + '/images/icon-big.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

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
          label: 'About',
          click() {
            const modalPath = path.join('file://', __dirname, 'about.html');
            let win = new BrowserWindow({ frame: false });
            win.on('close', () => { win = null });
            win.loadURL(modalPath);
            win.show();
          }
        },
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
