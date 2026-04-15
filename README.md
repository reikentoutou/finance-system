# 财务统计系统 / Finance System

> **东京时区**业务日、一日四班次日报；管理员集计与导出。  
> **主交付**：前台机获取本仓库 **源码**，使用 **`pnpm install`** 与终端命令运行，**浏览器**访问前端。  
> **备选**：Windows **Electron** 安装包（客户机须自行安装 **Node.js**）。详见 [§5](#desktop-optional)。

---

## 目录

1. [概述](#overview)
2. [技术栈与仓库结构](#repo-layout)
3. [先决条件](#prerequisites)
4. [前台机源码运行](#quickstart)
5. [Windows 桌面安装包（可选）](#desktop-optional)
6. [生产环境与安全](#production)
7. [GitHub Releases](#releases)
8. [相关文档](#docs)
9. [许可证](#license)

---

<a id="overview"></a>

## 1. 概述

| 维度 | 说明 |
|------|------|
| **用途** | 财务日报录入、班次维度汇总、管理员导出（Excel / PDF）等 |
| **主交付** | `git clone`、内网 zip、或 Release 中的 **Source code** 等源码形态 → 见 [§4](#quickstart) |
| **浏览器入口（开发）** | `http://localhost:5173`（与 `pnpm run dev` 默认一致） |
| **备选交付** | NSIS / 便携 `.exe`（Electron），见 [§5](#desktop-optional) |

---

<a id="repo-layout"></a>

## 2. 技术栈与仓库结构

| 技术 | 说明 |
|------|------|
| 后端 | **NestJS 10**、**Prisma**、**SQLite**、JWT |
| 前端 | **Vue 3**、**Vite**、**Element Plus**、Pinia、Vue Router |
| 桌面（备选） | **Electron**（仅 Windows x64 打包场景） |

### Monorepo 路径

| 路径 | 说明 |
|------|------|
| [`apps/api`](./apps/api) | REST API、`prisma/schema.prisma` |
| [`apps/web`](./apps/web) | 管理端与网管填报 SPA |
| [`apps/desktop`](./apps/desktop) | **备选**：Electron 壳与打包脚本；主交付可忽略 |
| [`docs`](./docs) | 实施计划、备份说明、发版与索引 |
| [`AGENTS.md`](./AGENTS.md) | 协作者与 AI 助手约定（Prisma、代码风格等） |

---

<a id="prerequisites"></a>

## 3. 先决条件

在**仓库根目录**操作前请安装：

| 依赖 | 版本 |
|------|------|
| [Node.js](https://nodejs.org/) | **20+**（推荐 **22**） |
| [pnpm](https://pnpm.io/) | **9**（仓库 [`package.json`](./package.json) 已声明 `packageManager`；可用 [Corepack](https://nodejs.org/api/corepack.html) 对齐） |

---

<a id="quickstart"></a>

## 4. 前台机源码运行

在克隆或解压后的**仓库根目录**执行：

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env：生产须设置 JWT_SECRET 等（见 README「6. 生产环境与安全」）
pnpm run db:push
pnpm run dev
```

然后使用浏览器打开 **`http://localhost:5173`**。

- Vite 开发服务器会将常见 API 路径代理到本机 API（见 [`apps/web/vite.config.ts`](./apps/web/vite.config.ts)），**无需**启动 `apps/desktop`。
- **常驻运行（无 watch）**：可先 `pnpm run build`，再在同一台机器上分别运行 `pnpm --filter @finance/api start` 与 `pnpm --filter @finance/web preview`。若前端与 API **不同源**或对外网提供静态资源，构建 Web 前请设置 **`VITE_API_BASE`** 指向 API 根 URL。

### 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 并行启动 API + Web（默认） |
| `pnpm run dev:api` / `pnpm run dev:web` | 单独启动 |
| `pnpm run build` | 构建 API + Web（`dist`） |
| `pnpm run db:push` | 将 Prisma schema 同步到 SQLite |
| `pnpm run db:generate` | 生成 Prisma Client（`schema.prisma` 变更后必跑） |

```bash
pnpm run db:generate
```

**说明**：根目录 `pnpm install` 会触发 `apps/api` 的 `postinstall`（含 `prisma generate`）。若 IDE 仍报模型缺字段，可尝试 **TypeScript: Restart TS Server** 或重载窗口。API 包为 **`strict: true`**，详见 [`apps/api/README.md`](./apps/api/README.md)。

**数据备份（管理员）**：ZIP 导出 / 导入见 **[`docs/data-backup-restore.md`](./docs/data-backup-restore.md)**（界面：**バックアップ・リストア**）。

**编辑器（可选）**：维护 `apps/web` 建议安装 [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（Volar）。若在线安装失败，可下载 **`.vsix`** 后使用 **Install from VSIX**。

### Windows：桌面快捷启动（无需 Electron）

在已 **`pnpm install`** 且配置好 **`.env`** 的前台机上，可用仓库内脚本一键打开 **新控制台窗口**（运行 `pnpm run dev`）并**用默认浏览器**打开前端：

| 文件 | 说明 |
|------|------|
| [`scripts/windows/start-finance-system-dev.bat`](./scripts/windows/start-finance-system-dev.bat) | 自动 `cd` 到仓库根 → `start cmd /k pnpm run dev` → 约 8 秒后打开 `http://127.0.0.1:5173/` |

**创建桌面快捷方式**：在资源管理器中 **右键** 该 `.bat` → **发送到** → **桌面快捷方式**；或手动新建快捷方式，**目标**填该 bat 的**绝对路径**（无需再包一层 `cmd.exe`）。

**注意**：关闭「FinanceSystem pnpm dev」窗口即停止 API 与 Vite；若端口被占用或启动较慢，可自行编辑 bat 中的 **`timeout /t 8`** 秒数。生产常驻建议仍用 `build` + `start` / `preview` 或进程守护，见上文。

**macOS**：可用 **Automator**「运行 Shell 脚本」执行 `cd` 到仓库根后 `pnpm run dev`，再用 **打开网页** 打开 `http://127.0.0.1:5173/`，并拖到程序坞。

---

<a id="desktop-optional"></a>

## 5. Windows 桌面安装包（可选）

> 仅在需要向客户提供 **`.exe`** 时使用；须在本机或 CI 使用 **Windows** 打可交付包（含 `bcrypt` 等原生模块）。安装包**不含** Node，客户机须安装 **Node.js x64**（或使用 **`FINANCE_NODE_EXE`**）。

### 5.1 打包命令（仓库根目录）

| 命令 | 产物 |
|------|------|
| `pnpm run pack:desktop:win` | NSIS 安装向导（x64） |
| `pnpm run pack:desktop:win:portable` | 便携 exe（x64） |
| `pnpm run pack:bundle:win` | 便携 zip + 说明（**仅 Windows**） |
| `pnpm run pack:desktop:win:shell` | 仅壳（**不可交付客户**） |

流程简述：`scripts/prepare-electron-bundled-resources.cjs`（构建 API → 构建 Web → `pnpm deploy` API → 复制静态资源）→ `electron-builder` → `scripts/restore-resources-bundled-placeholder.cjs`。

**产物目录**：[`apps/desktop/dist-release/`](./apps/desktop/dist-release/)（已 `.gitignore`）。

**本机发版 + GitHub CLI**：`pnpm run release:desktop:win:gh`，详见 **[`docs/cursor-windows-release-agent.md`](./docs/cursor-windows-release-agent.md)**。

### 5.2 桌面包首次运行（实施方）

| 项 | 说明 |
|------|------|
| Node | 客户机 **PATH** 中可执行 `node`，或设置 **`FINANCE_NODE_EXE`** |
| 数据目录 | 默认 **`%AppData%\FinanceSystem`**（可用 **`FINANCE_USER_DATA_DIR`** 覆盖） |
| 配置 | 首次可从包内模板生成 **`.env`**；交付前须编辑 **`JWT_SECRET`** 等 |

### 5.3 故障排查（API 连不上 / JSON 解析错误）

1. 查看 **`%AppData%\FinanceSystem\api-startup.log`**、**`web-startup.log`**。
2. Electron 场景下静态页端口 **5173**、API **3000**；若曾单独 `build:web` 且未带 **`VITE_API_BASE`**，请用 **`pnpm run pack:desktop:win`** 完整重建，或删除 **`apps/web/dist`** 后重打包。
3. 浏览器与 API **同域**构建时，须**显式**设置 **`VITE_API_BASE`**（可为空字符串）。

安装包体积含 **Puppeteer** 等依赖，较大属正常现象。

---

<a id="production"></a>

## 6. 生产环境与安全

| 检查项 | 说明 |
|--------|------|
| **`JWT_SECRET`** | 强随机；`NODE_ENV=production` 且未设置时 API **拒绝启动** |
| **`CORS_ORIGINS`** | 前后端不同域时配置（逗号分隔 Origin） |
| **Prisma** | `schema` 变更后对实际 **`DATABASE_URL`** 执行 `db:push` 或 migrate，并 **`db:generate`** |
| **`/setup/bootstrap`** | 完成后再次调用返回 **403**；公网建议限制 `/setup` |
| **`/uploads/`** | 当前为可猜测 URL；高敏感场景需鉴权或签名 URL（未改实现，仅提示） |

---

<a id="releases"></a>

## 7. GitHub Releases

- 每个 Release 附带的 **Source code (zip/tar.gz)** 为**源码快照**，可按 [§4](#quickstart) 部署。
- **不要**将 Source code 与 **`FinanceSystem-*-Windows-Setup-x64.exe`** 混淆；后者为可选桌面安装包（**客户机须 Node**）。
- 推送 **`v*`** 标签可触发 Actions 构建 NSIS（见 **[`RELEASING.md`](./RELEASING.md)**）。变更记录见 **[`CHANGELOG.md`](./CHANGELOG.md)**。

---

<a id="docs"></a>

## 8. 相关文档

| 文档 | 内容 |
|------|------|
| [`docs/README.md`](./docs/README.md) | 文档索引 |
| [`RELEASING.md`](./RELEASING.md) | 发版与 Release 说明 |
| [`CHANGELOG.md`](./CHANGELOG.md) | 版本变更 |
| [`docs/data-backup-restore.md`](./docs/data-backup-restore.md) | 管理员 ZIP 备份 / 恢复 |
| [`docs/实施计划-财务统计系统.md`](./docs/实施计划-财务统计系统.md) | 业务与实施计划 |

---

<a id="license"></a>

## 9. 许可证

私有项目或未声明许可证时，默认保留所有权利；若需开源请自行补充 `LICENSE` 并更新本说明。
