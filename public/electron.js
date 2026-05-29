const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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

  // Remove menu bar
  win.setMenu(null);

  // Strip X-Frame-Options and Content-Security-Policy to allow embedding Torn.com
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Headers to remove
    const headersToRemove = [
      'x-frame-options', 
      'content-security-policy'
    ];
    
    for (const key of Object.keys(responseHeaders)) {
      if (headersToRemove.includes(key.toLowerCase())) {
        delete responseHeaders[key];
      }
    }
    
    callback({
      cancel: false,
      responseHeaders: responseHeaders
    });
  });

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
}

app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  session.defaultSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
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
