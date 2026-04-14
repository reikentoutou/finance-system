import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

function assertProductionJwtSecret() {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'production' && !process.env.JWT_SECRET?.trim()) {
    console.error(
      '[FATAL] NODE_ENV=production 时必须设置 JWT_SECRET，否则拒绝启动。',
    );
    process.exit(1);
  }
}

function buildCorsOptions():
  | { origin: boolean; credentials: boolean }
  | { origin: string[]; credentials: boolean } {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return { origin: true, credentials: true };
  }
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    return { origin: true, credentials: true };
  }
  return { origin: origins, credentials: true };
}

async function bootstrap() {
  assertProductionJwtSecret();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: false,
  });
  app.enableCors(buildCorsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
