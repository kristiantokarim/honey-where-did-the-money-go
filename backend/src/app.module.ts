import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { ParserModule } from './modules/parser/parser.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ConfigAppModule } from './modules/config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    StorageModule,
    ParserModule,
    TransactionsModule,
    ConfigAppModule,
  ],
})
export class AppModule {}
