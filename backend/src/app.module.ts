import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ParserService } from './parser.service';
import { dbProvider } from './db/db.provider';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [dbProvider, ParserService],
})
export class AppModule {}
