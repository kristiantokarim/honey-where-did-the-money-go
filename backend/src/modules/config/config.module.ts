import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigAppService } from './config.service';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [ParserModule],
  controllers: [ConfigController],
  providers: [ConfigAppService],
  exports: [ConfigAppService],
})
export class ConfigAppModule {}
