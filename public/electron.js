const { app, BrowserWindow, session, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('TORNagator');

let win;
let tray = null;

function createWindow() {
  const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
  
  let windowState = {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  };

  try {
    if (fs.existsSync(stateFilePath)) {
      windowState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load window state:', e);
  }

  let { x, y, width, height, isMaximized } = windowState;

  // Validate bounds are visible on some screen
  if (x !== undefined && y !== undefined) {
    const rect = { x, y, width, height };
    const matchingDisplay = screen.getDisplayMatching(rect);
    const bounds = matchingDisplay.bounds;
    
    // Check if there is some overlap between the window and the display bounds
    const hasOverlap = (
      x < bounds.x + bounds.width &&
      x + width > bounds.x &&
      y < bounds.y + bounds.height &&
      y + height > bounds.y
    );
    
    if (!hasOverlap) {
      x = undefined;
      y = undefined;
    }
  }

  win = new BrowserWindow({
    width: width || 1200,
    height: height || 800,
    x: x,
    y: y,
    icon: path.join(__dirname, '../img/alligator.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161616',
      symbolColor: '#e0e0e0',
      height: 40
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true, // Re-enabled because disabling it can cause Cloudflare challenges to fail
      webviewTag: true // Allow use of <webview> instead of <iframe> to fix cookie/SameSite issues
    }
  });

  if (isMaximized) {
    win.maximize();
  }

  // Set application menu
  if (process.platform === 'darwin') {
    const template = [
      {
        label: 'TORNagator',
        submenu: [
          { role: 'about', label: 'About TORNagator' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide TORNagator' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit TORNagator' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    win.setMenu(null);
  }

  // Track window state changes
  let state = {
    width: width || 1200,
    height: height || 800,
    x: x,
    y: y,
    isMaximized: !!isMaximized
  };

  const updateState = () => {
    try {
      const isMaximized = win.isMaximized();
      state.isMaximized = isMaximized;
      
      // Only track normal bounds when not maximized and not minimized
      if (!isMaximized && !win.isMinimized()) {
        const bounds = win.getBounds();
        state.width = bounds.width;
        state.height = bounds.height;
        state.x = bounds.x;
        state.y = bounds.y;
      }
    } catch (e) {
      console.error('Error updating window state:', e);
    }
  };

  win.on('resize', updateState);
  win.on('move', updateState);

  // Save state on close
  win.on('close', () => {
    updateState();
    try {
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save window state:', e);
    }
  });

  // Strip X-Frame-Options and Content-Security-Policy ONLY for Torn.com domains to allow embedding safely
  const stripTornHeaders = (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Check if the request is loading a Torn-related page/resource
    const isTornRequest = details.url.toLowerCase().includes('torn.com');

    if (isTornRequest) {
      const headersToRemove = [
        'x-frame-options', 
        'content-security-policy'
      ];
      
      for (const key of Object.keys(responseHeaders)) {
        if (headersToRemove.includes(key.toLowerCase())) {
          delete responseHeaders[key];
        }
      }
    }
    
    callback({
      cancel: false,
      responseHeaders: responseHeaders
    });
  };

  session.defaultSession.webRequest.onHeadersReceived(stripTornHeaders);
  session.fromPartition('persist:torn').webRequest.onHeadersReceived(stripTornHeaders);

  // Load the React app
  win.loadFile(path.join(__dirname, '../build/index.html'));

  // Handle catalog update requests from guest
  ipcMain.on('request-catalog-update', async (event, itemId) => {
    // Pass the request back to the main React app to fetch using its API key
    // The React app should listen for 'fetch-catalog-item' and reply with 'catalog-updated'
    win.webContents.send('fetch-catalog-item', itemId);
  });

  // Handle the reply from the React app
  ipcMain.on('catalog-item-fetched', (event, data) => {
    // Send the data back to the guest
    // In our setup, the guest and host share the same IPC due to nodeIntegration
    win.webContents.send('catalog-updated', data);
  });

  // Open the main window developer tools
  ipcMain.on('open-devtools', () => {
    win.webContents.openDevTools();
  });
}

app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  session.defaultSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  session.fromPartition('persist:torn').setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(path.join(__dirname, '../img/alligator.png'));
    } catch (e) {
      console.error('Failed to set dock icon:', e);
    }
  }

  try {
    const iconPath = path.join(__dirname, '../img/alligator.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('TORNagator');
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => { if (win) win.show(); } },
      { label: 'Quit', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
  } catch (e) {
    console.error('Failed to create tray icon:', e);
  }

  app.on('web-contents-created', (event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      webPreferences.preload = path.join(__dirname, 'preload.js');
    });

    contents.setWindowOpenHandler((details) => {
      const { url } = details;
      if (win && !win.isDestroyed()) {
        win.webContents.send('open-url-in-tab', url);
      }
      return { action: 'deny' };
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
