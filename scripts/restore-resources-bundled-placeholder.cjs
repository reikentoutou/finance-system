'use strict';

/**
 * 打包后恢复 apps/desktop/resources-bundled 为占位说明，避免仓库内长期残留数百 MB 构建产物。
 */
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../apps/desktop/resources-bundled');
const text = `此目录在正式打包时由脚本 scripts/prepare-electron-bundled-resources.cjs 生成并覆盖。
若仅有本说明文件，安装包不含内置 Node/API，请勿用于交付客户。
请在 Windows 上执行：pnpm run pack:desktop:win（或根目录先 prepare 再 electron-builder）。
`;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'README.txt'), text, 'utf8');
console.log('==> restored placeholder:', outDir);
