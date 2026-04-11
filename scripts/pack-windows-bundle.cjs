'use strict';

/**
 * 生成「单机离线目录」并打成 zip：api（pnpm deploy）+ web/dist + 便携 exe + serve-web + start.bat。
 * 解压后除 exe 外需 Node.js；双击 start.bat 启动 API + 静态站 + Electron。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const desktopPkg = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps/desktop/package.json'), 'utf8'),
);
const version = desktopPkg.version;
const bundleDirName = `FinanceSystem-Portable-${version}`;
const workParent = path.join(repoRoot, '..', '.finance-system-bundle-work');
const bundleRoot = path.join(workParent, bundleDirName);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

fs.mkdirSync(workParent, { recursive: true });
fs.rmSync(bundleRoot, { recursive: true, force: true });
fs.mkdirSync(bundleRoot, { recursive: true });

console.log('==> build:api');
run('pnpm', ['run', 'build:api']);

console.log('==> build:web (VITE_API_BASE=http://127.0.0.1:3000)');
run('pnpm', ['run', 'build:web'], {
  env: { ...process.env, VITE_API_BASE: 'http://127.0.0.1:3000' },
});

console.log('==> pnpm deploy @finance/api -> bundle/api');
const apiDest = path.join(bundleRoot, 'api');
fs.mkdirSync(apiDest, { recursive: true });
const dr = spawnSync('pnpm', ['--filter', '@finance/api', 'deploy', apiDest], {
  stdio: 'inherit',
  cwd: repoRoot,
});
if (dr.status !== 0) process.exit(dr.status || 1);

/** 不把开发机 SQLite / 上传目录打进分发包 */
function removeSqliteAndUploads(rootDir) {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const p = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'uploads') {
        fs.rmSync(p, { recursive: true, force: true });
        console.log('removed from bundle:', p);
      } else {
        removeSqliteAndUploads(p);
      }
    } else if (entry.name.endsWith('.db') || entry.name.endsWith('.db-journal')) {
      fs.rmSync(p, { force: true });
      console.log('removed from bundle:', p);
    }
  }
}
removeSqliteAndUploads(path.join(bundleRoot, 'api'));

console.log('==> copy web/dist');
const webDistSrc = path.join(repoRoot, 'apps/web/dist');
const webDistDest = path.join(bundleRoot, 'web', 'dist');
if (!fs.existsSync(path.join(webDistSrc, 'index.html'))) {
  console.error('Missing apps/web/dist/index.html — build:web failed?');
  process.exit(1);
}
fs.mkdirSync(path.dirname(webDistDest), { recursive: true });
fs.cpSync(webDistSrc, webDistDest, { recursive: true });

console.log('==> copy serve-web.mjs');
fs.copyFileSync(
  path.join(repoRoot, 'scripts', 'serve-web.mjs'),
  path.join(bundleRoot, 'serve-web.mjs'),
);

console.log('==> pack portable exe');
run('pnpm', ['--filter', '@finance/desktop', 'run', 'pack:win:portable']);

const releaseDir = path.join(repoRoot, 'apps/desktop/release');
const portable = fs
  .readdirSync(releaseDir)
  .filter((f) => f.includes('Windows-Portable') && f.endsWith('.exe'));
if (!portable.length) {
  console.error('No *Windows-Portable*.exe in', releaseDir);
  process.exit(1);
}
const sorted = portable.sort();
const exeName = sorted[sorted.length - 1];
fs.copyFileSync(path.join(releaseDir, exeName), path.join(bundleRoot, exeName));

const startBat = String.raw`@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js。请安装 20 及以上 LTS: https://nodejs.org
  pause
  exit /b 1
)

if not exist "api\dist\main.js" (
  echo [错误] 缺少 api\dist\main.js
  pause
  exit /b 1
)

if not exist "web\dist\index.html" (
  echo [错误] 缺少 web\dist\index.html
  pause
  exit /b 1
)

if not exist "api\.env" (
  if exist "api\.env.example" (
    copy /Y "api\.env.example" "api\.env" >nul
    echo [提示] 已生成 api\.env ，请按需编辑 JWT、数据库路径、UPLOAD_DIR 等。
  )
)

echo 正在启动 API 端口 3000 ...
start "Finance-API" /MIN cmd /c "cd /d %~dp0api && node dist\main.js"
timeout /t 5 /nobreak >nul

echo 正在启动静态页 5173 ...
start "Finance-Web" /MIN cmd /c "cd /d %~dp0 && node serve-web.mjs"
timeout /t 3 /nobreak >nul

set "PORTABLE_EXE="
for %%F in ("%~dp0FinanceSystem-*-Windows-Portable-*.exe") do set "PORTABLE_EXE=%%~fF"
if not defined PORTABLE_EXE (
  for %%F in ("%~dp0FinanceSystem*.exe") do set "PORTABLE_EXE=%%~fF"
)
if not defined PORTABLE_EXE (
  echo [错误] 未找到便携 exe
  pause
  exit /b 1
)

set FINANCE_WEB_URL=http://127.0.0.1:5173
start "" "!PORTABLE_EXE!"
echo 已启动。结束使用时请关闭 Finance-API 与 Finance-Web 窗口。
pause
`;
fs.writeFileSync(path.join(bundleRoot, 'start.bat'), startBat.replace(/\n/g, '\r\n'), 'utf8');

const readme = `# FinanceSystem Windows 单机离线包（目录版）

## 还需要什么

本 zip **不包含 Node.js**。除便携 **exe** 外，目标电脑必须安装 **Node.js 20+**（https://nodejs.org），否则无法启动 API 与静态页。

## 怎么用

1. 解压到较短路径（建议无中文）。
2. 首次双击 **start.bat**：若无 \`api/.env\` 会从 \`api/.env.example\` 复制；请编辑 JWT、\`DATABASE_URL\`、\`UPLOAD_DIR\`（上传目录建议固定到如 D:\\\\FinanceData\\\\uploads 便于备份）。
3. 日常双击 **start.bat**：最小化启动 API（3000）、静态服务（5173）、再打开 Electron。

## 包里有什么

| 路径 | 作用 |
|------|------|
| \`api/\` | Nest 生产包（pnpm deploy） |
| \`web/dist/\` | 已构建前端（请求本机 3000） |
| \`serve-web.mjs\` | Node 静态服务（5173） |
| \`FinanceSystem-*-Windows-Portable-*.exe\` | Electron 壳 |
| \`start.bat\` | 一键启动以上三项 |

数据在 SQLite 与 \`UPLOAD_DIR\`；与 exe 是否同目录无关，取决于 .env。
`;

fs.writeFileSync(path.join(bundleRoot, 'README-离线包说明.md'), readme, 'utf8');

const releaseOut = path.join(repoRoot, 'apps/desktop/release');
fs.mkdirSync(releaseOut, { recursive: true });
const zipName = `FinanceSystem-Portable-Bundle-${version}.zip`;
const zipPath = path.join(releaseOut, zipName);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

console.log('==> zip ->', zipPath);
if (process.platform === 'win32') {
  execSync(`tar -a -c -f "${zipPath}" -C "${workParent}" "${bundleDirName}"`, {
    stdio: 'inherit',
  });
} else {
  execSync(`cd "${workParent}" && zip -r "${zipPath}" "${bundleDirName}"`, {
    stdio: 'inherit',
  });
}

console.log('==> OK:', zipPath);
