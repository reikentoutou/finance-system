# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 风格，版本号与 [语义化版本](https://semver.org/lang/zh-CN/) 对齐（与 `apps/desktop` / 各包 `version` 协调发布）。

## [Unreleased]

### 新增

- 根目录 `pnpm run pack:bundle:win`：生成含 API + `web/dist` + 便携 exe + `start.bat` 的 **Windows 离线 zip**（目标机仍需安装 Node.js）。
- Prisma `binaryTargets` 增加 `windows`，便于在非 Windows 上打 Windows 离线包。
- Electron **portable** 产物文件名与 NSIS 区分（`*-Windows-Portable-*.exe`）。

### 计划中

- 按需补充：图标、自动更新、签名等。

## [0.0.1] - 2026-04-11

### 新增

- 单体仓库：API、Web、Windows Electron 壳。
- 日报、集计、导出（管理员）；东京时区与四班次业务规则。
- GitHub Actions：标签 `v*` 触发 Windows NSIS 构建并上传 Release 资产。

[Unreleased]: https://github.com/reikentoutou/finance-system/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.1
