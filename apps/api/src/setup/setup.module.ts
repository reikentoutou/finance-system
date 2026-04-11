import { Module, OnModuleInit } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule implements OnModuleInit {
  constructor(private readonly setup: SetupService) {}

  async onModuleInit() {
    await this.setup.ensureSeedData();
  }
}
