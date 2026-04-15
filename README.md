# 财务统计系统（Finance System）

东京时区业务日、一日四班次日报、管理员集计与导出；**NestJS + Prisma（SQLite）** 后端，**Vue 3 + Element Plus** 前端，可选 **Electron** 仅 **Windows x64** 桌面壳。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/api` | Nest API、JWT、日报/集计/导出 |
| `apps/web` | Vue 管理端与网管填报 |
| `apps/desktop` | Electron：开发时加载本地 Web；**安装包内嵌 Node + API + 前端**，客户双击 exe 即可 |
| `docs/` | 实施计划与文档索引 |
| 根目录 **[AGENTS.md](./AGENTS.md)** | AI 助手与协作者约定（改动范围、Prisma、风格一致性） |

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

**`schema.prisma` 变更后**须执行 `pnpm run db:generate`（根目录 `pnpm install` 会触发 `apps/api` 的 `postinstall`，也会生成 Client）。若 `@prisma/client` 与当前 schema 不同步，可能出现日报等代码里「缺少字段」（例如 `TaxFreeCardTier.active`、`DailyReport.taxFreeCouponCounts`）的 TypeScript 误报；生成后若 IDE 仍红线，可执行 **TypeScript: Restart TS Server** 或重载窗口。

**API 包 TypeScript**：`apps/api/tsconfig.json` 已启用 **`strict: true`**（与 `apps/web` 一致）；本地校验与 Prisma 流程见 **[apps/api/README.md](./apps/api/README.md)**。

**Cursor / VS Code（可选）**：编辑 `apps/web` 建议安装扩展 **Vue - Official**（原 Volar），以获得 `.vue` 语法高亮与类型提示。若扩展市场在线安装失败（日志中常见 `marketplace.cursorapi.com` 或 `net::ERR_FAILED`），可在浏览器下载对应 **`.vsix`**，再在编辑器中执行 **Extensions: Install from VSIX…** 手动安装。

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

## 生产部署检查（Code review 落实项）

| 项 | 说明 |
|------|------|
| **JWT_SECRET** | 设置强随机密钥；`NODE_ENV=production` 时若未设置 `JWT_SECRET`，API **拒绝启动**。 |
| **CORS** | 前后端不同域时设置 `CORS_ORIGINS`（逗号分隔 Origin）；不设时开发态仍允许任意来源（与原先一致）。 |
| **Prisma / DB** | `schema.prisma` 变更后必须对**实际使用的** `DATABASE_URL` 执行 `pnpm run db:push` 或 migrate，并执行 **`pnpm run db:generate`**，避免列不一致导致 500 或 TS 类型与库表脱节。 |
| **/setup/bootstrap** | 初始化完成后再次调用会返回 **403**；公网部署时建议在网关限制 `/setup` 仅内网或一次性开放。 |
| **上传文件** | `/uploads/` 下文件为可猜测 URL；高敏感场景需改为鉴权下载或短期签名 URL（当前未改实现，仅提醒）。 |

## GitHub Releases

推送符合 `v*` 的标签（例如 `v0.0.1`）会触发 **GitHub Actions**，在 `windows-latest` 上打包 NSIS 安装包，并自动创建/更新 **Release**，附带 **`.exe`** 与 **`.blockmap`**。

说明：GitHub 还会在 Release 里自动附上 **Source code (zip/tar.gz)**，那是**源码快照**；请下载 **`FinanceSystem-*-Windows-Setup-x64.exe`**（自包含安装包）。详见 **[RELEASING.md](./RELEASING.md)**。变更记录见 **[CHANGELOG.md](./CHANGELOG.md)**。

## 许可证

私有项目或未声明许可证时，默认保留所有权利；若需开源请自行补充 `LICENSE` 并调整本说明。
