'use strict';

/**
 * 为 Electron 自包含安装包准备 resources-bundled/：
 * - Windows x64 官方 Node 便携 zip → node-win/
 * - pnpm deploy → api/
 * - Vite 生产构建（直连本机 3000）→ web/dist/
 * - serve-web.mjs
 *
 * 须在 Windows 上执行（bcrypt 等原生模块需 win32）。GitHub Actions 已用 windows-latest。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync, execSync } = require('child_process');

const NODE_WIN_VERSION = process.env.NODE_WIN_VERSION || '22.14.0';

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'apps', 'desktop', 'resources-bundled');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`GET ${url} -> ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        try {
          fs.unlinkSync(dest);
        } catch (_) {}
        reject(err);
      });
  });
}

function removeSqliteAndUploads(rootDir) {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const p = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'uploads') fs.rmSync(p, { recursive: true, force: true });
      else removeSqliteAndUploads(p);
    } else if (entry.name.endsWith('.db') || entry.name.endsWith('.db-journal')) {
      fs.rmSync(p, { force: true });
    }
  }
}

function extractNodeWin(zipPath, destNodeWin) {
  const tmp = path.join(outDir, '_node_extract');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  if (process.platform === 'win32') {
    execSync(`tar -xf "${zipPath}" -C "${tmp}"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -q -o "${zipPath}" -d "${tmp}"`, { stdio: 'inherit' });
  }
  const inner = fs
    .readdirSync(tmp)
    .find((d) => d.startsWith('node-') && d.includes('win-x64'));
  if (!inner) {
    console.error('未在 zip 内找到 node-*-win-x64 目录');
    process.exit(1);
  }
  fs.rmSync(destNodeWin, { recursive: true, force: true });
  fs.renameSync(path.join(tmp, inner), destNodeWin);
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (process.platform !== 'win32') {
  console.error(
    '[prepare-electron-bundled-resources] 自包含包必须在 Windows 上准备（bcrypt 等需 win32 原生模块）。请在本机 Windows 执行，或使用 GitHub Actions（windows-latest）发版。',
  );
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const nodeZip = path.join(outDir, 'node-win-x64.zip');
const nodeUrl = `https://nodejs.org/dist/v${NODE_WIN_VERSION}/node-v${NODE_WIN_VERSION}-win-x64.zip`;

void (async () => {
  console.log('==> download', nodeUrl);
  await download(nodeUrl, nodeZip);
  console.log('==> extract Node');
  extractNodeWin(nodeZip, path.join(outDir, 'node-win'));
  fs.unlinkSync(nodeZip);

  console.log('==> build:api');
  run('pnpm', ['run', 'build:api']);
  console.log('==> build:web VITE_API_BASE=http://127.0.0.1:3000');
  run('pnpm', ['run', 'build:web'], {
    env: { ...process.env, VITE_API_BASE: 'http://127.0.0.1:3000' },
  });

  const apiDest = path.join(outDir, 'api');
  fs.mkdirSync(apiDest, { recursive: true });
  console.log('==> pnpm deploy api -> resources-bundled/api');
  // Windows 上需与 run() 一致使用 shell，否则可能找不到 pnpm 或子进程环境异常
  run('pnpm', ['--filter', '@finance/api', 'deploy', apiDest]);
  removeSqliteAndUploads(apiDest);

  const ex = path.join(repoRoot, 'apps', 'api', '.env.example');
  if (fs.existsSync(ex)) {
    fs.copyFileSync(ex, path.join(apiDest, '.env.example'));
  }

  const webSrc = path.join(repoRoot, 'apps', 'web', 'dist');
  if (!fs.existsSync(path.join(webSrc, 'index.html'))) {
    console.error('缺少 apps/web/dist/index.html');
    process.exit(1);
  }
  const webDest = path.join(outDir, 'web', 'dist');
  fs.mkdirSync(path.dirname(webDest), { recursive: true });
  fs.cpSync(webSrc, webDest, { recursive: true });

  fs.copyFileSync(
    path.join(repoRoot, 'scripts', 'serve-web.mjs'),
    path.join(outDir, 'serve-web.mjs'),
  );

  console.log('==> OK ->', outDir);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
