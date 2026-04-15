# Agent Skills 使用说明

本仓库在 **Cursor** 等环境里使用一组 **Agent Skills**（每个技能通常是目录下的 `SKILL.md` + 参考附件），用来约束助手在特定任务上的工作方式（例如 Vue 规范、前端视觉与排版、代码风格等）。

更通用的协作约定见根目录 **[AGENTS.md](../AGENTS.md)**（与本文冲突时以 **AGENTS.md** 为准）。

前台机**交付形态**（源码 + 终端 + 浏览器为主、桌面包备选）见根 **[README.md](../README.md)**。

---

## 1. Skills 放在哪里

| 位置 | 说明 |
| --- | --- |
| `.agents/skills/**/SKILL.md` | 本仓库主要使用的技能包安装目录（默认被根 `.gitignore` 忽略，属本机产物；团队若要入库可调整忽略规则）。 |
| `.cursor/rules/*.mdc` | Cursor 规则（例如匹配 `apps/web/**` 时自动附带 Vue 相关约定），与 skills **互补**：规则偏「常驻约束」，skills 偏「按任务加载的长说明」。 |

上游 Vue 技能安装说明见 **AGENTS.md** 中的「Vue 技能包」小节。

---

## 2. 怎么使用（人类与助手）

### 2.1 在对话里点名某个 Skill

1. **用 `@` 引用文件**：在 Cursor 输入框里 `@` 选择  
   `.agents/skills/<技能名>/SKILL.md`（或子路径，如 `coding-standards/typescript/SKILL.md`），让该文件进入上下文。
2. **直接下任务**：说明「按该 SKILL 的工作流执行」，助手应在动手前 **Read** 完整 `SKILL.md`（长文件可再按需 Read 其 `references/`）。

### 2.2 何时用哪个 Skill（原则）

- 任务涉及 **Vue / Pinia / Router / Vite / 组件与组合式函数** → 优先 `vue-*` 与 `create-adaptable-composable`。
- 任务涉及 **页面观感、布局、动效、文案、无障碍与性能审计** → 选 `impeccable`、`layout`、`polish` 等设计向技能（见下表）。
- 任务涉及 **语言级风格**（TS/Go/Python…）→ `coding-standards` 下对应子技能。

具体「每个文件干什么」见下文 **自动维护的技能目录表**。

### 2.3 安装或新增技能之后（重要）

1. 按上游文档安装或复制技能到 `.agents/skills/`（例如根目录执行  
   `npx skills add vuejs-ai/skills --yes`）。
2. 在仓库根目录执行：

   ```bash
   pnpm run docs:skills
   ```

   该命令会扫描所有 `SKILL.md` 的 YAML 前言（`name`、`user-invocable`、`argument-hint` 等），并**自动重写本文档中标记区域内的目录表**，无需手改表格。

3. **中文「用途」列**：以 YAML 里的 `name` 为键，在 **[`skills-catalog.zh.json`](./skills-catalog.zh.json)** 中维护一句中文说明；新增 skill 后请在该 JSON 里补一条再执行 `pnpm run docs:skills`（脚本会对缺失键给出控制台警告）。

若你新增了一个 `SKILL.md` 但未跑命令，目录表会过期；提交前建议跑一遍以保持文档与磁盘一致。

---

## 3. 技能目录（自动生成）

以下区块由脚本维护，**请勿手动编辑**（会被覆盖）。表中 **用途（中文）** 来自 [`skills-catalog.zh.json`](./skills-catalog.zh.json)。

<!-- SKILLS_CATALOG_START -->

本表由 `pnpm run docs:skills` 扫描 `SKILL.md` 生成；**用途（中文）** 来自 [`skills-catalog.zh.json`](./skills-catalog.zh.json)，以各 skill 的 YAML `name` 为键维护。

| 路径（仓库内） | `name` | 用途（中文） | 建议使用方式 |
| --- | --- | --- | --- |
| `.agents/skills/adapt/SKILL.md` | `adapt` | 针对不同屏幕、设备与场景做响应式与适配：断点、流式布局、触控区域等。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target] [context (mobile, tablet, print...)]`。 |
| `.agents/skills/animate/SKILL.md` | `animate` | 为界面补充有目的的动效与微交互，在可用性前提下提升生动感。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/audit/SKILL.md` | `audit` | 从无障碍、性能、主题、响应式与反模式等维度做技术质量检查，输出分级结论与改进计划。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[area (feature, page, component...)]`。 |
| `.agents/skills/bolder/SKILL.md` | `bolder` | 在保持可用的前提下加强视觉张力，让偏保守或单调的设计更有辨识度。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/clarify/SKILL.md` | `clarify` | 优化界面文案：标签、说明、错误提示与微文案，降低理解成本。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/coding-standards/go/SKILL.md` | `go-coding-standards` | Go 语言惯用法：错误处理、并发、工具链与可测试的整洁代码。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/javascript/SKILL.md` | `javascript-coding-standards` | 现代 JavaScript/ES6+ 与常见工程实践（风格、模式、测试等；文档偏通用 JS 生态）。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/kotlin/SKILL.md` | `kotlin-coding-standards` | Kotlin 规范：空安全、协程与 JVM/Android 下的惯用写法。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/python/SKILL.md` | `python-coding-standards` | Python 规范：PEP 8、类型标注、测试与现代工程习惯。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/rust/SKILL.md` | `rust-coding-standards` | Rust 所有权与类型系统、异步、测试等写出安全且高性能代码的要点。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/shell/SKILL.md` | `shell-scripting-standards` | Shell 脚本可靠性：可移植 shebang、错误处理、引号与 ShellCheck 等。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/SKILL.md` | `coding-standards` | 跨语言的通用编码规范与可维护性实践（总览；具体语言见子项）。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/swift/SKILL.md` | `swift-coding-standards` | Swift 规范：Apple 指南、面向协议设计与现代并发。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/coding-standards/typescript/SKILL.md` | `typescript-coding-standards` | TypeScript 严格类型、泛型、装饰器等，面向可维护的类型安全代码。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/colorize/SKILL.md` | `colorize` | 在偏灰或单调的界面上策略性用色，让层次与情绪更鲜明。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/create-adaptable-composable/SKILL.md` | `create-adaptable-composable` | 编写可复用的 Vue 组合式函数：支持 MaybeRef/Getter 等入参，在 watch 内用 toValue/toRef 归一化。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/critique/SKILL.md` | `critique` | 从 UX 视角评审设计：信息架构、视觉层次、认知负荷等，并给出可执行反馈。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[area (feature, page, component...)]`。 |
| `.agents/skills/delight/SKILL.md` | `delight` | 在功能完备之上增加小惊喜与个性，让界面更易记住、用起来更愉悦。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/distill/SKILL.md` | `distill` | 做减法：去掉多余复杂度，让界面更干净、焦点更突出。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/impeccable/SKILL.md` | `impeccable` | 高完成度前端界面与创意视觉落地；可配合 craft/teach/extract 等子流程，并强调先补齐设计语境。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[craft\|teach\|extract]`。 |
| `.agents/skills/layout/SKILL.md` | `layout` | 优化版式与留白：栅格、对齐、节奏与视觉层次，缓解拥挤或松散。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/optimize/SKILL.md` | `optimize` | 诊断并优化前端性能：加载、渲染、动画、图片与包体等。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/overdrive/SKILL.md` | `overdrive` | 高表现力、偏技术向的视觉实现（如复杂动效、物理感、滚动驱动等），在「要惊艳」时使用。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/polish/SKILL.md` | `polish` | 发布前精修：对齐、间距、一致性与微细节，把「差不多」打磨到可交付。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/quieter/SKILL.md` | `quieter` | 降低视觉侵略感：在保留品质的前提下让界面更克制、沉稳。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/shape/SKILL.md` | `shape` | 写代码前先梳理功能：通过结构化访谈产出设计简报，约束后续实现方向。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[feature to shape]`。 |
| `.agents/skills/typeset/SKILL.md` | `typeset` | 字体与排版：字号层级、字重、行高与可读性，让文字层级更清晰。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 YAML 标记为 `user-invocable: true`：若你的客户端支持「/技能名」类入口，可按产品说明唤起。 参数提示：`[target]`。 |
| `.agents/skills/vue-best-practices/SKILL.md` | `vue-best-practices` | Vue 3 任务必读：默认组合式 API 与 `<script setup>` + TypeScript，并配套核心参考文档。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-debug-guides/SKILL.md` | `vue-debug-guides` | Vue 3 运行时错误、警告、异步失败与 SSR/水合等问题的排查与处理。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-jsx-best-practices/SKILL.md` | `vue-jsx-best-practices` | 在 Vue 中使用 JSX 的写法与配置要点（如 class 等差异）。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-options-api-best-practices/SKILL.md` | `vue-options-api-best-practices` | 在必须使用 Options API 时，data/methods/this 等写法与参考。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-pinia-best-practices/SKILL.md` | `vue-pinia-best-practices` | Pinia 状态管理：store 结构、组合式用法与和组件的响应式协作。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-router-best-practices/SKILL.md` | `vue-router-best-practices` | Vue Router 4：路由定义、导航守卫、参数与路由组件生命周期。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |
| `.agents/skills/vue-testing-best-practices/SKILL.md` | `vue-testing-best-practices` | Vue 测试：Vitest、Vue Test Utils、组件测试与 Playwright 等 E2E 思路。 | 在任务相关时让助手 **Read** 该 `SKILL.md`（或你在对话里用 `@` 引用该文件）。 |

**共 34 个** `SKILL.md`（含子目录，例如 `coding-standards/*`）。

<!-- SKILLS_CATALOG_END -->

---

## 4. 脚本说明

| 项目 | 说明 |
| --- | --- |
| 脚本路径 | `scripts/update-skills-usage-doc.cjs` |
| 中文用途映射 | `docs/skills-catalog.zh.json`（键 = 各 `SKILL.md` 前言中的 `name`） |
| pnpm 命令 | `pnpm run docs:skills`（定义在根 `package.json`） |
| 标记 | 仅替换 `<!-- SKILLS_CATALOG_START -->` 与 `<!-- SKILLS_CATALOG_END -->` 之间的内容 |
| 无 skills 时 | 若本机未安装 `.agents/skills`，脚本会提示并退出（不写文档），属正常情况 |
