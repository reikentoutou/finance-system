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
/** 打包态下 loadURL 使用（与 WEB_STATIC_PORT / serve-web 一致） */
let packagedWebUrl = 'http://127.0.0.1:5173';
/** 为 true 时表示正在主动结束子进程，不弹「意外退出」 */
let intentionalShutdown = false;
let crashDialogShown = false;

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

function clampPort(val, fallback) {
  const n = parseInt(String(val == null ? '' : val), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return fallback;
  return n;
}

/** 仅向子进程传递必要环境变量，避免把 Electron 父进程整表 env 泄露给 Nest */
const PROCESS_ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'WINDIR',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'USERNAME',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'COMPUTERNAME',
  'LANG',
  'LC_ALL',
];

/** 将用户 .env 中形如 VAR_NAME 的项传入子进程（扩展配置不必改 main.js） */
function buildChildEnv(userEnv) {
  const env = { NODE_ENV: 'production' };
  for (const k of PROCESS_ENV_ALLOWLIST) {
    if (process.env[k] != null && process.env[k] !== '') env[k] = process.env[k];
  }
  for (const [k, v] of Object.entries(userEnv)) {
    if (v == null || v === '') continue;
    if (/^[A-Z][A-Z0-9_]*$/.test(k)) env[k] = String(v);
  }
  return env;
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
    if (!/^WEB_STATIC_PORT=/m.test(body)) {
      body = `${body}\nWEB_STATIC_PORT=5173\n`;
    }
    fs.writeFileSync(envPath, body, 'utf8');
  }
  return envPath;
}

function loadUserEnvObject() {
  const envPath = ensureUserEnv();
  const u = parseDotenv(fs.readFileSync(envPath, 'utf8'));
  if (u.WEB_STATIC_PORT == null || u.WEB_STATIC_PORT === '') {
    u.WEB_STATIC_PORT = '5173';
  }
  return u;
}

function showCrashOnce(title, message) {
  if (crashDialogShown) return;
  crashDialogShown = true;
  try {
    dialog.showErrorBox(title, message);
  } catch (_) {
    /* ignore */
  }
}

function attachChildExitHandler(child, label) {
  if (!child) return;
  child.on('exit', (code, signal) => {
    if (intentionalShutdown) return;
    const codeStr = code == null ? 'null' : String(code);
    const sigStr = signal == null ? '无' : String(signal);
    showCrashOnce(
      `${label}已退出`,
      `${label}进程意外结束（退出码 ${codeStr}，信号 ${sigStr}）。应用将关闭。\n请查看 %AppData%\\FinanceSystem 下配置与磁盘空间，或联系管理员。`,
    );
    intentionalShutdown = true;
    killChildren();
    try {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    } catch (_) {
      /* ignore */
    }
    app.quit();
  });
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

/** 首次拉起服务：总超时 90s，失败更快反馈 */
async function waitUrl(url, totalMs = 90000) {
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

/** 子进程在就绪前崩溃时立即失败；超时则提示查看日志 */
function raceUrlOrChildExit(child, url, logPath, totalMs = 90000) {
  return new Promise((resolve, reject) => {
    const onExit = (code, sig) => {
      reject(
        new Error(
          `内置服务进程已退出（code=${code}${sig ? `, signal=${sig}` : ''}），未能就绪。\n请用记事本打开日志查看原因：\n${logPath}`,
        ),
      );
    };
    child.once('exit', onExit);
    waitUrl(url, totalMs)
      .then(() => {
        child.removeListener('exit', onExit);
        resolve();
      })
      .catch((err) => {
        child.removeListener('exit', onExit);
        reject(
          new Error(
            `${err.message}\n常见原因：对应端口被其它程序占用，或数据库/权限异常。详见：\n${logPath}`,
          ),
        );
      });
  });
}

function killChildren() {
  intentionalShutdown = true;
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

  const userEnv = loadUserEnvObject();
  const apiPort = clampPort(userEnv.PORT, 3000);
  const webPort = clampPort(userEnv.WEB_STATIC_PORT, 5173);
  if (apiPort === webPort) {
    throw new Error(`API 端口与静态页端口不能相同（均为 ${apiPort}）。请修改 .env 中 PORT 或 WEB_STATIC_PORT。`);
  }

  const envVars = buildChildEnv({ ...userEnv, PORT: String(apiPort), WEB_STATIC_PORT: String(webPort) });
  const apiUrl = `http://127.0.0.1:${apiPort}/`;
  const webUrl = `http://127.0.0.1:${webPort}/`;
  packagedWebUrl = `http://127.0.0.1:${webPort}`;

  intentionalShutdown = false;
  crashDialogShown = false;

  const userData = app.getPath('userData');
  const apiLogPath = path.join(userData, 'api-startup.log');
  const webLogPath = path.join(userData, 'web-startup.log');
  fs.appendFileSync(
    apiLogPath,
    `\n---------- API ${new Date().toISOString()} ----------\n`,
  );
  fs.appendFileSync(
    webLogPath,
    `\n---------- Web ${new Date().toISOString()} ----------\n`,
  );

  const apiLogStream = fs.createWriteStream(apiLogPath, { flags: 'a' });
  apiChild = spawn(nodeExe, ['dist/main.js'], {
    cwd: apiRoot,
    env: envVars,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  apiChild.stdout.pipe(apiLogStream);
  apiChild.stderr.pipe(apiLogStream);
  apiChild.on('error', (e) => console.error('API spawn', e));

  await raceUrlOrChildExit(apiChild, apiUrl, apiLogPath);
  attachChildExitHandler(apiChild, '后端 API');

  const webLogStream = fs.createWriteStream(webLogPath, { flags: 'a' });
  webChild = spawn(nodeExe, [serveScript], {
    cwd: bundled,
    env: {
      ...envVars,
      WEB_STATIC_PORT: String(webPort),
      WEB_STATIC_HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  webChild.stdout.pipe(webLogStream);
  webChild.stderr.pipe(webLogStream);
  webChild.on('error', (e) => console.error('Web spawn', e));

  await raceUrlOrChildExit(webChild, webUrl, webLogPath);
  attachChildExitHandler(webChild, '前端静态服务');
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
  const url = app.isPackaged ? packagedWebUrl : WEB_URL;
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  dialog.showErrorBox(
    'FinanceSystem 已在运行',
    '若未看到主窗口，请打开任务管理器，结束「FinanceSystem」或残留 node.exe 后重试。',
  );
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
