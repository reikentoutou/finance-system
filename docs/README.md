# 文档索引

| 文档 | 说明 |
|------|------|
| [实施计划-财务统计系统.md](./实施计划-财务统计系统.md) | 业务规则、班次、向导、导出等实施说明；当前交付方式为前台机源码 + 终端 + 浏览器（与历史 Plan 同步的仓库内副本） |
| [skills-usage.md](./skills-usage.md) | `.agents/skills` 各 Skill 的用途与用法；中文用途见 [skills-catalog.zh.json](./skills-catalog.zh.json)；安装新 skill 后补全 JSON 并运行 `pnpm run docs:skills` |
| [data-backup-restore.md](./data-backup-restore.md) | 管理员 ZIP 导出/导入（SQLite + uploads）、API 路径与注意事项 |
| [AGENTS.md](../AGENTS.md) | AI 编码助手与协作者约定（范围、Prisma、**API `strict: true`**、Nest/Vue 一致性） |

仓库总览、**前台机源码交付**与版本发布说明见根目录 **[README.md](../README.md)**、**[RELEASING.md](../RELEASING.md)**、**[CHANGELOG.md](../CHANGELOG.md)**。Prisma `db:generate`、TS/IDE 排查、**Cursor 安装 Vue 扩展失败时的 VSIX 手动安装** 见根目录 README 相关小节。
