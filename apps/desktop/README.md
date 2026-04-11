# @finance/desktop（Electron，Windows x64）

仅面向 **Windows** 的壳应用：加载开发中的 Web（默认 `http://127.0.0.1:5173`）或通过环境变量 **`FINANCE_WEB_URL`** 指定已部署站点。

## 本地打包

在仓库根目录：

```bash
pnpm run pack:desktop:win
```

「一个 zip 单机目录」（API + 前端 + 便携 exe + `start.bat`）：

```bash
pnpm run pack:bundle:win
```

产物在 `release/`（已 gitignore）。

## CI 发布

推送标签 **`v*`**（如 `v0.0.1`）由 GitHub Actions 构建 NSIS 并上传到 **Releases**。流程与版本号对齐见根目录 **[RELEASING.md](../../RELEASING.md)**。
