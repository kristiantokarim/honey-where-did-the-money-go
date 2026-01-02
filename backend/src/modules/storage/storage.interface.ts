export interface IStorageService {
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
  getUrl(filename: string): Promise<string>;
  delete(filename: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
