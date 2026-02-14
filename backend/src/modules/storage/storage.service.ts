import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { IStorageService } from './storage.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('minio.endpoint', 'localhost'),
      port: this.configService.get<number>('minio.port', 9000),
      useSSL: this.configService.get<boolean>('minio.useSSL', false),
      accessKey: this.configService.get<string>('minio.accessKey', 'minio_admin'),
      secretKey: this.configService.get<string>('minio.secretKey', 'minio_password'),
    });
    this.bucket = this.configService.get<string>('minio.bucket', 'receipts');
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket '${this.bucket}' created successfully`);
      }
    } catch (error) {
      this.logger.warn(`Could not initialize MinIO bucket: ${error.message}`);
    }
  }

  async upload(file: Buffer, originalFilename: string, mimeType: string, householdId?: string): Promise<string> {
    const extension = originalFilename.split('.').pop() || 'jpg';
    const prefix = householdId ? `${householdId}/` : '';
    const filename = `${prefix}${randomUUID()}.${extension}`;

    await this.client.putObject(this.bucket, filename, file, file.length, {
      'Content-Type': mimeType,
    });

    this.logger.log(`File uploaded: ${filename}`);
    return filename;
  }

  async getUrl(filename: string): Promise<string> {
    // Generate presigned URL valid for 7 days
    return await this.client.presignedGetObject(this.bucket, filename, 7 * 24 * 60 * 60);
  }

  async delete(filename: string): Promise<void> {
    await this.client.removeObject(this.bucket, filename);
    this.logger.log(`File deleted: ${filename}`);
  }
}
