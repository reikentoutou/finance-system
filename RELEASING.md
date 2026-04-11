# 发布说明（Releases）

## 桌面端（Windows NSIS）

Release 由工作流 **[`.github/workflows/release-desktop-win.yml`](.github/workflows/release-desktop-win.yml)** 在推送 **以 `v` 开头的标签** 时自动执行（例如 `v0.0.1`）。

也可在 Actions 里 **手动运行**（`workflow_dispatch`）：在 **Run workflow** 中把分支/ref 选为 **已存在的标签**（如 `v0.0.1`），勿选 `main`，否则任务会因 ref 不是 `refs/tags/v*` 而被跳过。

### 下载哪个文件？（Release 里为什么有「Source code」）

GitHub **每个 Release 都会自动附带**：

- **Source code (zip)** / **Source code (tar.gz)**：当前标签下仓库的**源码快照**，不是安装程序。

**Windows 安装包**是 CI 额外上传的资产，名称类似：

- **`FinanceSystem-<版本>-Windows-Setup-x64.exe`**（NSIS 安装包）
- 可选：同版本的 **`.blockmap`**

请在 Release 页面的 **Assets** 列表里找上述 **`.exe`**；**不要**把「Source code」当成安装包。

若 **Assets 里只有 Source code、没有 `.exe`**，说明 **「Release Windows desktop」工作流失败或未运行**：打开 **Actions** 查看该标签对应运行记录的报错（常见原因：依赖安装失败、打包脚本失败等）。

### 发布前检查清单

1. 将 **`apps/desktop/package.json`** 里的 **`version`** 改为与标签一致（去掉前缀 `v`，例如标签 `v1.2.3` → `version` 为 `1.2.3`）。安装包文件名会包含该版本号。
2. 更新根目录 **`CHANGELOG.md`**：把 `[Unreleased]` 下内容移到新版本小节，并补上链接占位（或按 Keep a Changelog 维护）。
3. 提交并推送后打标签并推送标签：

```bash
git add apps/desktop/package.json CHANGELOG.md
git commit -m "chore: release desktop v0.0.2"
git push

git tag -a v0.0.2 -m "v0.0.2"
git push origin v0.0.2
```

4. 在 GitHub **Actions** 中查看 **Release Windows desktop** 是否成功；在 **Releases** 页面下载 `FinanceSystem-*-Windows-Setup-x64.exe`。

### 产物说明

- **NSIS 安装包**：`FinanceSystem-<version>-Windows-Setup-x64.exe`
- **blockmap**：与安装包同目录，用于差分更新类场景（若未来接入自动更新会用到）

便携版（`pack:win:portable`）当前未纳入 CI；需要时可再加一条 job 或单独工作流。

**整合离线 zip**（API + 前端 + 便携 exe + `start.bat`）：在开发机执行根目录 `pnpm run pack:bundle:win`，产物为 `apps/desktop/release/FinanceSystem-Portable-Bundle-<版本>.zip`；解压说明见包内 `README-离线包说明.md`（目标机仍需安装 Node.js）。

### 权限

默认使用仓库自带的 `GITHUB_TOKEN` 上传 Release，无需额外配置密钥。
