# 财务统计系统（Finance System）

东京时区业务日、一日四班次日报、管理员集计与导出；**NestJS + Prisma（SQLite）** 后端，**Vue 3 + Element Plus** 前端，可选 **Electron** 仅 **Windows x64** 桌面壳。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/api` | Nest API、JWT、日报/集计/导出 |
| `apps/web` | Vue 管理端与网管填报 |
| `apps/desktop` | Electron 壳，默认加载本地开发 Web 或环境变量 `FINANCE_WEB_URL` |
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

## Windows 桌面安装包（本地）

在仓库根目录：

```bash
pnpm run pack:desktop:win            # NSIS 安装包
pnpm run pack:desktop:win:portable   # 便携 exe（可选）
```

产物目录：`apps/desktop/release/`（已 `.gitignore`，不上传仓库）。

### Windows「一个下载包」（单机目录 + zip）

在**开发机**（macOS / Linux / Windows 均可；已配置 Prisma `binaryTargets` 含 `windows`）仓库根目录执行：

```bash
pnpm run pack:bundle:win
```

会生成 **`apps/desktop/release/FinanceSystem-Portable-Bundle-<版本>.zip`**，解压后大致包含：

| 内容 | 说明 |
|------|------|
| **`start.bat`** | 一键启动：API（3000）+ 静态页（5173）+ 便携 **exe** |
| **`api/`** | 后端生产包（`pnpm deploy`） |
| **`web/dist/`** | 已构建前端（请求 `http://127.0.0.1:3000`） |
| **`serve-web.mjs`** | 用 Node 托管前端静态文件 |
| **`FinanceSystem-*-Windows-Portable-*.exe`** | Electron 壳 |
| **`README-离线包说明.md`** | 给前台/运维看的说明 |

**目标 Windows 电脑仍须安装 [Node.js 20+](https://nodejs.org)**（zip 里**不含** Node）。仅有 exe 无法单独跑通 API 与网页；**双击 `start.bat`** 即可（首次会复制 `api/.env.example` → `api/.env`，需按需改密钥与数据路径）。

说明：zip 体积会较大（后端依赖含 **Puppeteer** 等），属正常现象；脚本会剔除 `api` 内的本地 **`.db` / `uploads`**，避免把开发库误打进包。

## GitHub Releases

推送符合 `v*` 的标签（例如 `v0.0.1`）会触发 **GitHub Actions**，在 `windows-latest` 上打包 NSIS 安装包，并自动创建/更新 **Release**，附带 **`.exe`** 与 **`.blockmap`**。

说明：GitHub 还会在 Release 里自动附上 **Source code (zip/tar.gz)**，那是**源码快照**，不是安装程序；请下载 **`FinanceSystem-*-Windows-Setup-x64.exe`**。详见 **[RELEASING.md](./RELEASING.md)**。变更记录见 **[CHANGELOG.md](./CHANGELOG.md)**。

## 许可证

私有项目或未声明许可证时，默认保留所有权利；若需开源请自行补充 `LICENSE` 并调整本说明。
