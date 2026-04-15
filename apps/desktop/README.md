# @finance/desktop（Electron，Windows x64）

- **默认交付不经过本包**：前台机以**源码 + 终端**运行为主（根 **[README.md](../../README.md)**「前台机：源码安装与运行」）。本目录仅在仍需要 **Windows 安装包/便携 exe** 时参与构建。
- **日常开发不必使用本包**：在仓库根执行 **`pnpm run dev`**，用系统浏览器访问 Vite 地址即可。
- **开发**：未打包时仅作浏览器壳，默认打开 `http://127.0.0.1:5173`（需自行起 API + Vite），或用 **`FINANCE_WEB_URL`** / **`FINANCE_USER_DATA_DIR`**。
- **生产安装包**：**内嵌 API + Vue 静态资源**，运行时依赖系统 **Node.js**（PATH 中的 `node` 或 **`FINANCE_NODE_EXE`**）；客户 **双击 exe** 即可。退出应用会结束本机 API 与静态页进程。

## 打包（须在 Windows 上打可交付安装包）

在**仓库根目录**执行（会先 `prepare`、再打 electron、再恢复 `resources-bundled` 占位）：

```bash
pnpm run pack:desktop:win             # NSIS
pnpm run pack:desktop:win:portable    # 便携 exe
pnpm run pack:bundle:win              # zip：便携 exe + 说明（同上，仅 Windows）
```

仅打壳（**不含**完整 `resources-bundled`，不可交付客户）：

```bash
pnpm run pack:desktop:win:shell
```

产物在 **`dist-release/`**（已 gitignore；旧 `release/` 若存在可手动删除）。

详见根目录 **[README.md](../../README.md)**、**[RELEASING.md](../../RELEASING.md)**。
