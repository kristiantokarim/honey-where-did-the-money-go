import { Controller, Get } from '@nestjs/common';
import { ConfigAppService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigAppService) {}

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }
}
