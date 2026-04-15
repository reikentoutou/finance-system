此目录在正式打包时由脚本 scripts/prepare-electron-bundled-resources.cjs 生成并覆盖。
若仅有本说明文件，安装包不含内嵌 API/前端资源，请勿用于交付客户。
请在 Windows 上执行：pnpm run pack:desktop:win（或根目录先 prepare 再 electron-builder）。
客户机须安装 Node.js（x64，建议 20+）并可在 PATH 中执行 node，或设置 FINANCE_NODE_EXE。
