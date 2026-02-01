import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './common/config/configuration';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { ParserModule } from './modules/parser/parser.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ConfigAppModule } from './modules/config/config.module';
import { ScanModule } from './modules/scan/scan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    ParserModule,
    TransactionsModule,
    ConfigAppModule,
    ScanModule,
  ],
})
export class AppModule {}
