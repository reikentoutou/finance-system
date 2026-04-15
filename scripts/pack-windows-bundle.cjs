'use strict';

/**
 * 生成便携 exe 的 zip：内含 API/前端资源的 exe（与 NSIS 同源 prepare；**不**内嵌 Node）。
 * 客户机须安装 Node.js（x64）或在 PATH 中可执行 node（亦可 FINANCE_NODE_EXE）。
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

const releaseDir = path.join(repoRoot, 'apps/desktop/dist-release');
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

const readme = `# FinanceSystem 便携版（zip）

## 使用

1. 在前台机安装 **Node.js（Windows x64，建议 20+）**，确保命令行可执行 \`node\`（或设置环境变量 **FINANCE_NODE_EXE** 为 node.exe 完整路径）。
2. 解压到任意文件夹。
3. **双击 \`FinanceSystem-*-Windows-Portable-*.exe\`** 打开桌面应用。

首次启动会在 **%AppData%\\\\FinanceSystem** 生成 \`.env\`（数据库与上传目录默认也在该文件夹）。交付客户前，可先运行一次 exe 再编辑该目录下的 \`.env\`（如 \`JWT_SECRET\`）。

## 说明

- 本 exe **不**自带 Node；随包包含后端构建产物与前端静态资源，由系统 Node 拉起本地 API 与静态服务；退出应用会结束相关子进程。
- 若需安装向导版（写入「程序和功能」），请使用 Release 中的 **NSIS *-Windows-Setup-*.exe**（同样依赖系统 Node）。
`;

fs.writeFileSync(path.join(bundleRoot, 'README-自包含版说明.md'), readme, 'utf8');

const releaseOut = path.join(repoRoot, 'apps/desktop/dist-release');
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
