import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ParserFactory } from './parser.factory';
import {
  AIProviderFactory,
  GeminiProvider,
  ClaudeCodeProvider,
} from './providers';

@Module({
  providers: [
    GeminiProvider,
    ClaudeCodeProvider,
    AIProviderFactory,
    ParserFactory,
    ParserService,
  ],
  exports: [ParserService, ParserFactory, AIProviderFactory],
})
export class ParserModule {}
