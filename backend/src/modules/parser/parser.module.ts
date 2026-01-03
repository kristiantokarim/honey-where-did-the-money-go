import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ParserFactory } from './parser.factory';

@Module({
  providers: [ParserFactory, ParserService],
  exports: [ParserService, ParserFactory],
})
export class ParserModule {}
