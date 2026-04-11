import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { SetupService } from './setup.service';

class BootstrapDto {
  @IsString()
  webmasterUsername!: string;

  @IsString()
  @MinLength(4)
  webmasterPassword!: string;

  @IsString()
  adminUsername!: string;

  @IsString()
  @MinLength(4)
  adminPassword!: string;
}

@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Public()
  @Get('status')
  status() {
    return this.setup.getStatus();
  }

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.setup.bootstrap(dto);
  }
}
