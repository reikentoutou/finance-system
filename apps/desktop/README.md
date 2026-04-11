# @finance/desktop（Electron，Windows x64）

- **开发**：未打包时仅作浏览器壳，默认打开 `http://127.0.0.1:5173`（需自行起 API + Vite），或用 **`FINANCE_WEB_URL`** / **`FINANCE_USER_DATA_DIR`**。
- **生产安装包**：已 **内嵌 Node + API + Vue 静态资源**；客户 **双击 exe** 即可（无需系统级 Node）。退出应用会结束本机 API 与静态页进程。

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

产物在 `release/`（已 gitignore）。

详见根目录 **[README.md](../../README.md)**、**[RELEASING.md](../../RELEASING.md)**。
