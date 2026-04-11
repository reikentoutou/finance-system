/**
 * Windows 用 Electron シェル。
 * 開発: 先に API + Web を起動し、既定 http://127.0.0.1:5173 を開く。
 * 本番 URL: 環境変数 FINANCE_WEB_URL で上書き。
 */
const { app, BrowserWindow } = require('electron');

const WEB_URL = process.env.FINANCE_WEB_URL || 'http://127.0.0.1:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(WEB_URL);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  app.quit();
});
