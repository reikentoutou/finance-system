# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 风格，版本号与 [语义化版本](https://semver.org/lang/zh-CN/) 对齐（与 `apps/desktop` / 各包 `version` 协调发布）。

## [Unreleased]

### 新增

- **Windows 桌面包自包含**：内置 Node、Nest API、Vue 静态页；客户 **双击 exe** 即可（无需系统 Node）。配置与数据默认 `%AppData%\FinanceSystem`。
- `prepare-electron-bundled-resources`：在 **Windows** 上生成 `resources-bundled` 并打入 NSIS / 便携 exe（`pnpm run pack:desktop:win` 等）。
- `pnpm run pack:bundle:win`（仅 Windows）：zip 内含自包含便携 exe + 说明。
- Prisma `binaryTargets` 含 `windows`；可交付桌面包仍须在 **Windows** 上 prepare（bcrypt 等）。
- Electron **portable** 与 NSIS 文件名区分（`*-Windows-Portable-*.exe`）。

### 计划中

- 按需补充：图标、自动更新、签名等。

## [0.0.2] - 2026-04-11

### 修复

- Windows 上 `prepare-electron-bundled-resources` 的 `pnpm deploy` 改为与 `run()` 一致经 shell 调用，避免本机打包时 `pnpm deploy` 失败。

## [0.0.1] - 2026-04-11

### 新增

- 单体仓库：API、Web、Windows Electron 壳。
- 日报、集计、导出（管理员）；东京时区与四班次业务规则。
- GitHub Actions：标签 `v*` 触发 Windows NSIS 构建并上传 Release 资产。

[Unreleased]: https://github.com/reikentoutou/finance-system/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.2
[0.0.1]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.1
