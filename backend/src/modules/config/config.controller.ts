import { Controller, Get } from '@nestjs/common';
import { ConfigAppService } from './config.service';
import { CurrentHousehold } from '../auth/decorators/current-household.decorator';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigAppService) {}

  @Get()
  async getConfig(@CurrentHousehold() householdId: string) {
    return this.configService.getConfig(householdId);
  }
}
