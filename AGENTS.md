# AI 助手与协作者约定（Agent / Contributor）

本文件约束在本仓库内工作的 **AI 编码助手** 与 **人类协作者**：目标是小改动可合并、行为可预期、与现有代码风格一致。若与具体任务冲突，以任务说明为准；未说明时默认遵守本文。

## 1. 仓库与包

| 路径 | 技术栈 | 说明 |
|------|--------|------|
| `apps/api` | NestJS 10、Prisma、SQLite、JWT | 后端 API；`prisma/schema.prisma` 在此包内 |
| `apps/web` | Vue 3、Vite、Element Plus、Pinia、vue-router | 管理端与网管填报 |
| `apps/desktop` | Electron（Windows x64 交付） | 内嵌 API + 静态站；打包见根 `README.md`；**本机 Windows + GitHub CLI 一键上传 Release** 见 `docs/cursor-windows-release-agent.md`（`pnpm run release:desktop:win:gh`） |
| `docs/` | Markdown | 业务与实施文档索引 |
| `.agents/skills/` | `skills` CLI 安装的 Vue 生态技能 | 各子目录含 `SKILL.md`；见下文「Vue 技能包」 |

- **包管理**：`pnpm` 9；工作区见 `pnpm-workspace.yaml`（`apps/*`）。
- **常用命令**（在仓库根目录）：`pnpm install`、`pnpm run dev`、`pnpm run build:api` / `build:web`、`pnpm run db:push`、`pnpm run db:generate`。
- **改 API 包内脚本或 Prisma**：优先在根目录用 `pnpm --filter @finance/api …`，避免在子目录误用全局 `pnpm`。

## 2. 改动原则（对 Agent 强制）

1. **只改任务需要的文件与行**：禁止顺带大重构、无关格式化、删注释「清理」、扩大范围「顺手优化」。
2. **先读后写**：打开目标文件周边实现，命名、错误类型（`BadRequestException` / `NotFoundException` 等）、模块划分与现有一致。
3. **保持类型真实**：优先用 Prisma 生成类型与 `Prisma.*Input`；仅在 Client 与 schema 暂时不同步等情况下使用窄断言，并避免滥用 `any`。
4. **不擅自新增** `README` / `CHANGELOG` / 大段文档，除非用户或任务明确要求。
5. **业务与合规**：东京时区业务日、班次与日报规则以 `docs/` 与现有服务逻辑为准；改行为前确认是否影响已有数据契约。

## 3. API（`apps/api`）

- **结构**：功能按领域分模块（`*.module.ts`、`*controller.ts`、`*service.ts`），全局守卫在 `app.module.ts`（JWT + 角色）。
- **数据访问**：通过 `PrismaService`（扩展 `PrismaClient`），不要在业务层手写 SQL，除非已有同类用法且任务明确要求。
- **Prisma 工作流**：
  - 修改 `schema.prisma` 后必须 **`pnpm run db:generate`**，并对目标库执行 **`pnpm run db:push`** 或 migrate。
  - `pnpm install` 会触发 API 包 `postinstall` 中的 `prisma generate`；若 IDE 仍报模型缺字段，重启 TS Server 或重载窗口。
- **配置与安全**：生产相关约定见根 `README.md`「生产部署检查」（`JWT_SECRET`、`CORS_ORIGINS`、`/setup` 等）。
- **TypeScript**：`apps/api/tsconfig.json` 已启用 **`strict: true`**（与 `apps/web` 一致）；改动后至少在 `apps/api` 下执行 `pnpm exec tsc --noEmit`，能跑则再 `pnpm run build:api`。

## 4. Web（`apps/web`）

- **Vue 3**：组合式 API、`<script setup>` 与现有页面一致；路由在 `src/router`。
- **HTTP**：经项目内封装的 axios/HTTP 模块调用 API，路径与后端控制器对齐。
- **UI**：Element Plus；间距、表格、表单布局与邻近页面保持一致。
- **构建**：`pnpm --filter @finance/web run build`（含 `vue-tsc`）。

### Vue 技能包（`.agents/skills`）

本仓库可通过 [vuejs-ai/skills](https://github.com/vuejs-ai/skills) 安装一组 **Agent Skills**（与 `npx skills` / Cursor 等集成）。**处理 `apps/web` 的 Vue、Pinia、Router、测试或可组合逻辑时**，应先阅读与任务匹配的 **`SKILL.md`**，再动手改代码。

| 目录（节选） | 用途 |
|--------------|------|
| `vue-best-practices` | SFC、组合式、性能与通用模式 |
| `vue-router-best-practices` | 路由与导航守卫 |
| `vue-pinia-best-practices` | 状态管理 |
| `vue-testing-best-practices` | 测试策略（如 Vitest） |
| `vue-debug-guides` | 常见坑与排错 |
| `vue-jsx-best-practices` / `vue-options-api-best-practices` | 非默认写法时的规范 |
| `create-adaptable-composable` | 可组合函数设计 |

**约定**：

1. **本文优先于 skill 中与仓库冲突的泛化建议**（例如本项目的目录结构、`AGENTS.md` 改动范围、Prisma 流程以 §3 为准）。
2. **安装 / 更新**（在仓库根目录）：`npx skills add vuejs-ai/skills --yes`（详见上游文档）；安装后审阅 skill 内容，**勿盲信**远程脚本权限说明。
3. **在 Cursor 中使用**：项目已含 **`.cursor/rules/vue-web-skills.mdc`**（匹配 `apps/web/**` 时自动带上 Vue skills 约定）；对话中仍可用 `@` 引用具体 `SKILL.md`（例如 `@.agents/skills/vue-best-practices/SKILL.md`）。全仓库总则见 **`.cursor/rules/finance-agents-core.mdc`**（`alwaysApply`）。
4. **是否纳入 Git**：仓库根 `.gitignore` 已默认忽略 `.agents/`、`skills/`、`skills-lock.json`（体积大、属本机安装产物）。若团队希望技能路径进库，可删除对应忽略规则后再提交。

## 5. 代码风格与一致性

- **TypeScript**：`strict` 相关选项已开；新代码勿引入可避免的 `any`。
- **格式**：无仓库级 ESLint/Prettier 配置时，**缩进、引号、分号与相邻文件一致**。
- **命名**：Nest 类 `PascalCase`，文件 `kebab-case` 与现有目录一致；变量/函数语义清晰，避免缩写过度。
- **注释**：仅在为非显而易见的不变量、业务规则或 Prisma/SQLite 坑做短注释；不写显而易见的英文/中文废话注释。
- **用户可见文案**：产品面向中文时保持简体一致；错误信息若已有英文 key 或后端固定文案，不要随意改契约。

## 6. 桌面端（`apps/desktop`）

- 勿在 macOS 上假设 Windows 打包产物可交付；完整桌面包须在 **Windows** 上 prepare（见根 `README.md`）。
- 勿把大体积 `resources-bundled` 实文件提交进 Git（仓库已有脚本与 `.gitignore` 约定）。

## 7. 提交与文档

- **Commit / PR 描述**：完整句子、说明「改了什么、为什么」；与用户任务无关的改动不要混入同一提交。
- **版本与发布**：`CHANGELOG.md`、`RELEASING.md` 随发布流程更新；日常小修不必强行改 `CHANGELOG`，除非用户要求。

## 8. 测试

- 当前仓库**未**建立统一单元测试目录约定；新增测试前先看是否已有同目录 `*.spec.ts` 或 `e2e` 模式，并与用户确认再引入框架。

---

**摘要**：小步、对齐现有模式、`schema` 改完必 `db:generate`，API/Web 各自能 `build`/`tsc` 再交卷。做 **Web/Vue** 相关任务时结合 **`.agents/skills/*/SKILL.md`**。人类维护者可将本文件路径加入 Cursor / Copilot 的「项目说明」或 Rules，以便模型默认加载。
