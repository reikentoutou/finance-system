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

数据库迁移与客户端生成见根目录 `pnpm run db:push` / `db:generate`。

更多说明见根目录 **[README.md](../../README.md)**。
