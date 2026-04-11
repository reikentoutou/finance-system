# 财务统计系统（Finance System）

东京时区业务日、一日四班次日报、管理员集计与导出；**NestJS + Prisma（SQLite）** 后端，**Vue 3 + Element Plus** 前端，可选 **Electron** 仅 **Windows x64** 桌面壳。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/api` | Nest API、JWT、日报/集计/导出 |
| `apps/web` | Vue 管理端与网管填报 |
| `apps/desktop` | Electron：开发时加载本地 Web；**安装包内嵌 Node + API + 前端**，客户双击 exe 即可 |
| `docs/` | 实施计划与文档索引 |

## 环境要求

- **Node.js** 20+（推荐 22）
- **pnpm** 9（仓库已声明 `packageManager`）

## 开发与构建

```bash
pnpm install
pnpm run dev          # API + Web 并行开发
pnpm run build        # 构建 API + Web（dist）
```

单独启动：

```bash
pnpm run dev:api
pnpm run dev:web
```

数据库（Prisma + SQLite，见 `apps/api/.env.example`）：

```bash
cp apps/api/.env.example apps/api/.env
pnpm run db:push
pnpm run db:generate
```

## Windows 桌面安装包（自包含，客户双击 exe）

正式安装包 / 便携 exe 已 **内置 Windows 版 Node、Nest API、Vue 静态页**。客户机器 **无需再装 Node**；打包前请在 **Windows** 上执行（含原生模块 `bcrypt` 等；也可用 GitHub Actions `windows-latest`）。

在仓库根目录：

```bash
pnpm run pack:desktop:win             # NSIS 安装向导（x64）
pnpm run pack:desktop:win:portable    # 单文件便携 exe（x64）
```

以上命令会先运行 **`scripts/prepare-electron-bundled-resources.cjs`**（下载 Node zip、pnpm deploy API、构建 Web），再打 electron；结束后会 **恢复** `apps/desktop/resources-bundled/` 占位文件，避免仓库里长期残留大文件。

仅打壳、不准备内嵌资源（例如 macOS 上试打 Windows 安装包外形，**不可交付客户**）：

```bash
pnpm run pack:desktop:win:shell
```

产物目录：`apps/desktop/release/`（已 `.gitignore`）。

### 交付前配置（你装在前台机即可）

- 首次启动后，配置与数据默认在 **`%AppData%\FinanceSystem`**（可用环境变量 **`FINANCE_USER_DATA_DIR`** 覆盖路径）。
- 首次若不存在 `.env`，会从包内模板生成；请在交给客户前编辑该目录下的 **`.env`**（至少 **`JWT_SECRET`**；`DATABASE_URL` / `UPLOAD_DIR` 已指向该目录下 `app.db` 与 `uploads`）。
- 客户日常使用：**双击快捷方式或 exe** 即可打开桌面应用；退出程序会结束本机 API 与静态页进程。

### Windows zip（便携 exe + 说明）

仅在 **Windows** 上：

```bash
pnpm run pack:bundle:win
```

生成 **`FinanceSystem-Portable-Bundle-<版本>.zip`**：内含 **自包含便携 exe** 与说明；客户同样 **只需解压后双击 exe**，无需 Node。

说明：安装包体积较大（含 **Puppeteer** 等依赖），属正常。

## GitHub Releases

推送符合 `v*` 的标签（例如 `v0.0.1`）会触发 **GitHub Actions**，在 `windows-latest` 上打包 NSIS 安装包，并自动创建/更新 **Release**，附带 **`.exe`** 与 **`.blockmap`**。

说明：GitHub 还会在 Release 里自动附上 **Source code (zip/tar.gz)**，那是**源码快照**；请下载 **`FinanceSystem-*-Windows-Setup-x64.exe`**（自包含安装包）。详见 **[RELEASING.md](./RELEASING.md)**。变更记录见 **[CHANGELOG.md](./CHANGELOG.md)**。

## 许可证

私有项目或未声明许可证时，默认保留所有权利；若需开源请自行补充 `LICENSE` 并调整本说明。
