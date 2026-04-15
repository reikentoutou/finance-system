'use strict';

/**
 * 为 Electron 安装包准备 resources-bundled/（不再内嵌 Node，客户机须已装 Node 或在 PATH 中）：
 * - pnpm deploy → api/
 * - Vite 生产构建（直连本机 3000）→ web/dist/
 * - serve-web.mjs
 *
 * 须在 Windows 上执行（bcrypt 等原生模块需 win32）。GitHub Actions 已用 windows-latest。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

if (process.platform !== 'win32') {
  console.error(
    '[prepare-electron-bundled-resources] 可交付包须在 Windows 上准备（bcrypt 等需 win32 原生模块）。请在本机 Windows 执行，或使用 GitHub Actions（windows-latest）发版。',
  );
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log('==> build:api');
run('pnpm', ['run', 'build:api']);
console.log('==> build:web VITE_API_BASE=http://127.0.0.1:3000');
run('pnpm', ['run', 'build:web'], {
  env: { ...process.env, VITE_API_BASE: 'http://127.0.0.1:3000' },
});

const apiDest = path.join(outDir, 'api');
fs.mkdirSync(apiDest, { recursive: true });
console.log('==> pnpm deploy api -> resources-bundled/api');
run('pnpm', ['--filter', '@finance/api', 'deploy', apiDest]);
removeSqliteAndUploads(apiDest);

console.log('==> prisma generate (bundled api，写入 deploy 目录内 Client)');
const prismaCli = path.join(repoRoot, 'apps', 'api', 'node_modules', 'prisma', 'build', 'index.js');
if (!fs.existsSync(prismaCli)) {
  console.error('[prepare] 未找到 Prisma CLI:', prismaCli);
  process.exit(1);
}
const bundledSchema = path.join(apiDest, 'prisma', 'schema.prisma');
const rPrisma = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', bundledSchema], {
  cwd: apiDest,
  stdio: 'inherit',
  env: process.env,
});
if (rPrisma.status !== 0) process.exit(rPrisma.status || 1);

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
