'use strict';

/**
 * 生成「自包含便携 exe」的 zip：内含已嵌入 Node/API/前端的 exe（与 NSIS 同源 prepare）。
 * 客户解压后 **双击 exe** 即可（无需再装 Node、无需 start.bat）。
 * 须在 Windows 上执行。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

if (process.platform !== 'win32') {
  console.error(
    '[pack-windows-bundle] 必须在 Windows 上执行（与 prepare-electron-bundled-resources 相同约束）。',
  );
  process.exit(1);
}

const desktopPkg = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'apps/desktop/package.json'), 'utf8'),
);
const version = desktopPkg.version;
const bundleDirName = `FinanceSystem-SelfContained-${version}`;
const workParent = path.join(repoRoot, '..', '.finance-system-bundle-work');
const bundleRoot = path.join(workParent, bundleDirName);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    shell: true,
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

fs.mkdirSync(workParent, { recursive: true });
fs.rmSync(bundleRoot, { recursive: true, force: true });
fs.mkdirSync(bundleRoot, { recursive: true });

console.log('==> prepare embedded runtime + api + web');
run('node', [path.join(repoRoot, 'scripts', 'prepare-electron-bundled-resources.cjs')]);

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

const readme = `# FinanceSystem 自包含便携版（zip）

## 使用

1. 解压到任意文件夹。
2. **双击 \`FinanceSystem-*-Windows-Portable-*.exe\`** 打开桌面应用（**无需安装 Node.js**）。

首次启动会在 **%AppData%\\\\FinanceSystem** 生成 \`.env\`（数据库与上传目录默认也在该文件夹）。交付客户前，你可先运行一次 exe 再编辑该目录下的 \`.env\`（如 \`JWT_SECRET\`），再交给客户日常使用。

## 说明

- 本 exe 已内置 Node、后端与前端静态资源；退出应用会结束本地 API 与网页服务。
- 若需安装向导版（写入「程序和功能」），请使用 Release 中的 **NSIS *-Windows-Setup-*.exe**（同样为自包含构建）。
`;

fs.writeFileSync(path.join(bundleRoot, 'README-自包含版说明.md'), readme, 'utf8');

const releaseOut = path.join(repoRoot, 'apps/desktop/release');
fs.mkdirSync(releaseOut, { recursive: true });
const zipName = `FinanceSystem-Portable-Bundle-${version}.zip`;
const zipPath = path.join(releaseOut, zipName);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

console.log('==> zip ->', zipPath);
execSync(`tar -a -c -f "${zipPath}" -C "${workParent}" "${bundleDirName}"`, {
  stdio: 'inherit',
});

run('node', [path.join(repoRoot, 'scripts', 'restore-resources-bundled-placeholder.cjs')]);

console.log('==> OK:', zipPath);
