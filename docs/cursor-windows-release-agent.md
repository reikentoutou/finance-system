# Cursor / Composer：在新 Windows 电脑上打包并发布 GitHub Release

本文供 **人类** 与 **AI 编码助手**（含 Cursor Composer）按同一套步骤执行，避免漏步骤。

## 先决条件（新电脑一次性准备）

1. **Git**、**Node.js 20+**（推荐 22）、**pnpm 9**（可用 `corepack enable` 后由仓库 `packageManager` 自动对齐）。
2. **GitHub CLI**：从 [https://cli.github.com/](https://cli.github.com/) 安装，在终端执行 **`gh auth login`**，勾选对仓库的 **repo** 权限（私有库同样需要）。
3. 已 **`git clone`** 本仓库，且当前 shell 的 **工作目录为仓库根目录**。
4. 能访问 **npm registry**（prepare 脚本不再下载内嵌 Node；**构建机**仍须本机 Node，见上）。

## 一键命令（本机打包 + 上传 Release 资产）

在仓库根目录：

```bash
pnpm run release:desktop:win:gh
```

等价于：`pnpm install --frozen-lockfile` → `pnpm run pack:desktop:win` → 根据 `apps/desktop/package.json` 的 **`version`** 生成标签名 **`v<version>`**，用 `gh` **创建**（尚无 Release）或 **上传覆盖**（已有同名 Release）`FinanceSystem-*-Windows-Setup-x64.exe` 与同目录下的 **`.blockmap`**。

### 可选参数（脚本直接调用时）

```bash
node scripts/gh-desktop-release-win.cjs --skip-install   # 已执行过 pnpm install
node scripts/gh-desktop-release-win.cjs --skip-pack      # 已执行过 pack:desktop:win，仅上传 apps/desktop/dist-release 内产物
```

## 发版前版本与记录（与 RELEASING.md 一致）

1. 将 **`apps/desktop/package.json`** 的 **`version`** 改为本次发布号（与将要使用的 **`v` 标签**一致，例如 `1.2.3` 对应标签 `v1.2.3`）。
2. 按团队习惯更新根目录 **`CHANGELOG.md`**。
3. **提交并推送**到默认分支（使 `gh release create` 在远端打的标签指向正确提交；若你只本地提交未推送，请先 `git push`）。

然后再执行 **`pnpm run release:desktop:win:gh`**。

## 与「仅打标签由 CI 构建」二选一说明

- **本机脚本路径**：适合「新 Windows + 必须本机打出 exe + 立刻出现在 GitHub Release」；命令见上。
- **CI 路径**：任意系统上改版本、打 `v*` 标签并 `git push origin v*`，由 **`.github/workflows/release-desktop-win.yml`** 在 `windows-latest` 上打包上传（详见 **[RELEASING.md](../RELEASING.md)**）。此路径**不要求**在新 Windows 上本地打包。

若你先 **`git push` 了 `v*` 标签**，CI 会开始构建；待 CI 完成后 Release 上通常**已有**安装包。此时若再运行本脚本且版本相同，会对**同名 Release** 执行 **`gh release upload --clobber`**，用本机产物覆盖资产（请确认本机与 CI 同源提交，避免误覆盖）。

## 可复制给 Cursor Composer 的提示词（用户粘贴）

将下面整段粘贴到 Composer，让 Agent 按仓库文件执行（你可补上目标版本号）：

```text
请在本仓库根目录、Windows 环境下完成桌面端 GitHub Release：

1. 确认已安装 Node 20+、pnpm 9、GitHub CLI（gh），且已执行 gh auth login。
2. 若尚未发版准备：将 apps/desktop/package.json 的 version 设为目标版本（与 v 标签一致），按需更新 CHANGELOG.md，提交并 git push 到远程默认分支。
3. 执行 pnpm run release:desktop:win:gh（或等价：pnpm install --frozen-lockfile、pnpm run pack:desktop:win、node scripts/gh-desktop-release-win.cjs）。
4. 根据命令输出与 gh 提示处理错误；完成后列出 Release 页面应出现的 exe 文件名。

不要猜测：prepare 的真实顺序以 scripts/prepare-electron-bundled-resources.cjs 为准（构建 API/Web → deploy；**不**再打包 node-win）；上传逻辑以 scripts/gh-desktop-release-win.cjs 为准。
```

## Agent 必读引用

- 打包步骤细节：**`scripts/prepare-electron-bundled-resources.cjs`**（顺序：构建 API → 构建 Web → deploy API → 复制静态资源等；**客户机**用系统 Node 运行）。
- 仓库协作与 Prisma：**[AGENTS.md](../AGENTS.md)**。
- 仅 CI 发版清单：**[RELEASING.md](../RELEASING.md)**。
