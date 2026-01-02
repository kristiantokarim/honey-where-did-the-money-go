import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DATABASE_TOKEN = 'DATABASE';

export const databaseProvider = {
  provide: DATABASE_TOKEN,
  useFactory: async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    return drizzle(pool, { schema });
  },
};
