import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: StorageService,
    },
    StorageService,
  ],
  exports: [STORAGE_SERVICE, StorageService],
})
export class StorageModule {}
