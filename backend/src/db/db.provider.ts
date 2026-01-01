import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as Database from 'better-sqlite3';
import * as schema from './schema';

export const dbProvider = {
  provide: 'DATABASE',
  useFactory: () => {
    const sqlite = new Database('sqlite.db');
    return drizzle(sqlite, { schema });
  },
};
