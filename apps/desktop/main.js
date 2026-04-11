/**
 * Windows Electron 壳
 * - 开发（未打包）：打开 FINANCE_WEB_URL 或默认 http://127.0.0.1:5173（需自行起 API+Web）
 * - 生产（打包）：随包内置 Node + API + 静态页；双击 exe 即起本地服务并打开窗口
 */
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/** 数据目录固定为 %AppData%/FinanceSystem（避免 @scope 包名路径难找） */
try {
  app.setPath(
    'userData',
    process.env.FINANCE_USER_DATA_DIR ||
      path.join(app.getPath('appData'), 'FinanceSystem'),
  );
} catch (_) {
  /* ignore */
}
app.setName('FinanceSystem');

const WEB_URL = process.env.FINANCE_WEB_URL || 'http://127.0.0.1:5173';

let mainWindow = null;
let apiChild = null;
let webChild = null;

function bundledRoot() {
  return path.join(process.resourcesPath, 'bundled');
}

function parseDotenv(content) {
  const out = {};
  for (const line of String(content).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function ensureUserEnv() {
  const userData = app.getPath('userData');
  const envPath = path.join(userData, '.env');
  fs.mkdirSync(userData, { recursive: true });
  const uploadsDir = path.join(userData, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(bundledRoot(), 'api', '.env.example');
    let template = '';
    if (fs.existsSync(examplePath)) {
      template = fs.readFileSync(examplePath, 'utf8');
    } else {
      template = [
        'JWT_SECRET="change-me"',
        'JWT_EXPIRES_IN="7d"',
        'PORT=3000',
        'TZ=Asia/Tokyo',
        '',
      ].join('\n');
    }
    const dbPath = path.join(userData, 'app.db');
    const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
    const upAbs = uploadsDir.replace(/\\/g, '/');
    let body = template.replace(/\r\n/g, '\n');
    if (/^DATABASE_URL=/m.test(body)) {
      body = body.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${dbUrl}"`);
    } else {
      body = `DATABASE_URL="${dbUrl}"\n${body}`;
    }
    if (/^UPLOAD_DIR=/m.test(body)) {
      body = body.replace(/^UPLOAD_DIR=.*$/m, `UPLOAD_DIR="${upAbs}"`);
    } else {
      body = `${body}\nUPLOAD_DIR="${upAbs}"\n`;
    }
    fs.writeFileSync(envPath, body, 'utf8');
  }
  return envPath;
}

function loadUserEnvObject() {
  const envPath = ensureUserEnv();
  return parseDotenv(fs.readFileSync(envPath, 'utf8'));
}

async function fetchOk(url, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal });
    return r.ok;
  } finally {
    clearTimeout(t);
  }
}

async function waitUrl(url, totalMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < totalMs) {
    try {
      if (await fetchOk(url, 2000)) return;
    } catch (_) {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`等待服务超时: ${url}`);
}

function killChildren() {
  for (const ch of [apiChild, webChild]) {
    if (!ch || ch.killed) continue;
    try {
      ch.kill();
    } catch (_) {
      /* ignore */
    }
  }
  apiChild = null;
  webChild = null;
}

async function startBundledServers() {
  const bundled = bundledRoot();
  const nodeExe = path.join(bundled, 'node-win', 'node.exe');
  const apiRoot = path.join(bundled, 'api');
  const serveScript = path.join(bundled, 'serve-web.mjs');

  if (!fs.existsSync(nodeExe)) {
    throw new Error(`未找到内置 Node：\n${nodeExe}\n请使用在 Windows 上完整构建的安装包。`);
  }
  if (!fs.existsSync(path.join(apiRoot, 'dist', 'main.js'))) {
    throw new Error('未找到 API 构建产物（dist/main.js）。');
  }
  if (!fs.existsSync(path.join(bundled, 'web', 'dist', 'index.html'))) {
    throw new Error('未找到前端静态资源。');
  }

  const envVars = {
    ...process.env,
    ...loadUserEnvObject(),
    NODE_ENV: 'production',
  };

  apiChild = spawn(nodeExe, ['dist/main.js'], {
    cwd: apiRoot,
    env: envVars,
    stdio: 'ignore',
    windowsHide: true,
  });
  apiChild.on('error', (e) => console.error('API spawn', e));

  await waitUrl('http://127.0.0.1:3000/');

  webChild = spawn(nodeExe, [serveScript], {
    cwd: bundled,
    env: {
      ...envVars,
      WEB_STATIC_PORT: '5173',
      WEB_STATIC_HOST: '127.0.0.1',
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  webChild.on('error', (e) => console.error('Web spawn', e));

  await waitUrl('http://127.0.0.1:5173/');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const url = app.isPackaged ? 'http://127.0.0.1:5173' : WEB_URL;
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', () => killChildren());

async function boot() {
  if (!app.isPackaged) {
    createWindow();
    return;
  }
  const nodeExe = path.join(bundledRoot(), 'node-win', 'node.exe');
  if (!fs.existsSync(nodeExe)) {
    dialog.showErrorBox(
      '安装包不完整',
      '缺少内置运行环境。请从 Release 下载在 Windows 上完整构建的安装包，勿使用仅含占位文件的开发构建。',
    );
    app.quit();
    return;
  }
  try {
    await startBundledServers();
    createWindow();
  } catch (e) {
    dialog.showErrorBox(
      'FinanceSystem 启动失败',
      String(e && e.message ? e.message : e),
    );
    killChildren();
    app.quit();
  }
}

app.whenReady().then(boot);

app.on('window-all-closed', () => {
  killChildren();
  app.quit();
});
