# @finance/api（NestJS）

财务系统后端：JWT 认证、Prisma + SQLite、日报与附件、集计、导出（管理员）等。

## 开发

在**仓库根目录**：

```bash
cp apps/api/.env.example apps/api/.env   # 若尚无 .env（在仓库根目录执行）
pnpm run dev:api
```

## 构建与生产启动

```bash
pnpm run build:api
pnpm --filter @finance/api run start:prod
```

数据库迁移与 Client 生成见根目录 `pnpm run db:push`、`pnpm run db:generate`。

### Prisma 与类型检查

- 修改 `prisma/schema.prisma` 后：除同步数据库外，务必 **`pnpm run db:generate`**（本包 `postinstall` 已含 `prisma generate`，新克隆请先 `pnpm install`）。
- 若命令行 `tsc` / `nest build` 正常但编辑器仍报 Prisma 模型缺字段，多为语言服务缓存；可 **Restart TS Server** 或重载窗口。

更多说明见根目录 **[README.md](../../README.md)**。
