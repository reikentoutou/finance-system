import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

/** 浏览器直接打开 API 根路径时避免误以为是服务挂了（Nest 默认无 / 路由 → 404） */
@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      ok: true,
      service: '@finance/api',
      hint: '前端请访问 Vite（如 http://localhost:5173），此处为 JSON API。',
    };
  }

  @Public()
  @Get('favicon.ico')
  @HttpCode(204)
  favicon() {
    // API 无网页图标，避免控制台对 404 的噪音
  }
}
