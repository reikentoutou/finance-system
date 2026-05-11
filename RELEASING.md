# 发布说明（Releases）

## 当前交付方式

本项目当前以**源码交付**为准。前台机获取仓库源码后，在终端执行 **`pnpm install`**、配置 **`apps/api/.env`**、运行 **`pnpm run db:push`**，再通过 **`pnpm run dev`** 或 `build + start/preview` 启动，并用**浏览器**访问前端。

对应运行说明见根 **[README.md](./README.md)**，版本变更见 **[CHANGELOG.md](./CHANGELOG.md)**。

## GitHub Release 约定

- GitHub Release 中的 **Source code (zip/tar.gz)** 是当前标签对应的**源码快照**。
- 若团队为某个版本创建 Release，应确保 **`CHANGELOG.md`** 已同步更新。
- 当前仓库不再维护 Electron / Windows `.exe` 安装包发布链路。

## 发布前检查清单

1. 确认本次改动已完成并通过必要验证。
2. 更新根目录 **`CHANGELOG.md`**，整理本次版本说明。
3. 提交并推送代码，然后创建并推送版本标签：

```bash
git add CHANGELOG.md
git commit -m "chore: release v0.0.2"
git push

git tag -a v0.0.2 -m "v0.0.2"
git push origin v0.0.2
```

## 下载说明

如需部署，请优先使用 Release 页面自带的 **Source code**，或直接从仓库获取源码；不要将 Release 视作预编译桌面安装包分发渠道。
