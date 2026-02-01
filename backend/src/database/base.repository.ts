import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

export abstract class BaseRepository {
  constructor(protected readonly db: Database) {}

  withTx(tx: Database): this {
    return new Proxy(this, {
      get: (target, prop: string | symbol, receiver) => {
        if (prop === 'getDb') {
          return () => tx;
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return (...args: unknown[]) => Reflect.apply(value, receiver, args);
        }
        return value;
      },
    }) as this;
  }

  protected getDb(): Database {
    return this.db;
  }
}
