import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { DDL_SQL } from "./createTables";

const sqliteClient = createClient({ url: ":memory:" });

export const db = drizzle(sqliteClient, { schema });

let _initialized = false;
let _initPromise: Promise<void> | null = null;

export async function ensureTablesCreated(): Promise<void> {
  if (_initialized) return;
  if (!_initPromise) {
    _initPromise = (async () => {
      await sqliteClient.executeMultiple(DDL_SQL);
      console.log("[gamerbuddy] SQLite in-memory tables created.");
      _initialized = true;
    })();
  }
  return _initPromise;
}

export * from "./schema";
