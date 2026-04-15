'use strict';

/**
 * Windows：安装依赖 → 打 NSIS 包（内嵌 API/Web，客户机用系统 Node）→ 用 GitHub CLI 创建或更新 Release 资源。
 * 先决条件：已安装 gh 且 `gh auth login`（需 repo 权限）；在仓库根目录执行；网络可用。
 *
 * 用法（仓库根）：
 *   node scripts/gh-desktop-release-win.cjs
 *   node scripts/gh-desktop-release-win.cjs --skip-install   # 已 pnpm install
 *   node scripts/gh-desktop-release-win.cjs --skip-pack      # 已 pack，仅上传
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status || 1);
}

function runCapture(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: repoRoot,
    shell: process.platform === 'win32',
  });
}

if (process.platform !== 'win32') {
  console.error('[gh-desktop-release-win] 仅支持在 Windows 上运行（与桌面 NSIS 打包一致）。');
  process.exit(1);
}

const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const skipPack = args.includes('--skip-pack');

const ghCheck = runCapture('gh', ['version']);
if (ghCheck.status !== 0 || !String(ghCheck.stdout || '').includes('gh version')) {
  console.error(
    '[gh-desktop-release-win] 未检测到 GitHub CLI（gh）。请安装：https://cli.github.com/ 并执行 gh auth login',
  );
  process.exit(1);
}

const desktopPkgPath = path.join(repoRoot, 'apps', 'desktop', 'package.json');
const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
const version = desktopPkg.version;
if (!version || typeof version !== 'string') {
  console.error('[gh-desktop-release-win] apps/desktop/package.json 缺少有效 version');
  process.exit(1);
}
const tag = `v${version}`;

if (!skipInstall) {
  console.log('==> pnpm install --frozen-lockfile');
  run('pnpm', ['install', '--frozen-lockfile']);
}

if (!skipPack) {
  console.log('==> pnpm run pack:desktop:win');
  run('pnpm', ['run', 'pack:desktop:win']);
}

const releaseDir = path.join(repoRoot, 'apps', 'desktop', 'dist-release');
if (!fs.existsSync(releaseDir)) {
  console.error('[gh-desktop-release-win] 缺少目录', releaseDir);
  process.exit(1);
}
const names = fs.readdirSync(releaseDir);
const setup = names.filter((f) => f.includes('Windows-Setup') && f.endsWith('.exe'));
const blockmaps = names.filter((f) => f.endsWith('.blockmap'));
if (!setup.length) {
  console.error('[gh-desktop-release-win] 未找到 *Windows-Setup*.exe，请先成功执行 pack:desktop:win');
  process.exit(1);
}
setup.sort();
const setupFile = setup[setup.length - 1];
const files = [path.join(releaseDir, setupFile)];
for (const b of blockmaps.sort()) {
  files.push(path.join(releaseDir, b));
}

const view = runCapture('gh', ['release', 'view', tag]);
if (view.status === 0) {
  console.log('==> gh release upload', tag, '(--clobber)');
  run('gh', ['release', 'upload', tag, ...files, '--clobber']);
} else {
  const title = `Desktop ${tag} (Windows x64)`;
  const notesPath = path.join(releaseDir, '_gh-release-notes.md');
  const notesBody = [
    'NSIS 安装包（本机 pnpm run pack:desktop:win + scripts/gh-desktop-release-win.cjs 上传）；内含 API/前端，**不含 Node**。',
    '客户机须安装 Node.js（x64）或设置 FINANCE_NODE_EXE；请下载 *-Windows-Setup-x64.exe，勿下载 Source code。',
    '变更说明见仓库根目录 CHANGELOG.md。',
  ].join('\n');
  fs.writeFileSync(notesPath, `${notesBody}\n`, 'utf8');
  console.log('==> gh release create', tag);
  run('gh', [
    'release',
    'create',
    tag,
    ...files,
    '--title',
    title,
    '--notes-file',
    notesPath,
  ]);
  try {
    fs.unlinkSync(notesPath);
  } catch (_) {
    /* ignore */
  }
}

console.log('[gh-desktop-release-win] 完成。请在浏览器打开仓库 Releases 核对资产：', tag);
