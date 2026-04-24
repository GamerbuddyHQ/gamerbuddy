import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";
export declare const pool: Pool | null;
export declare const db: import("drizzle-orm/neon-serverless").NeonDatabase<typeof schema> & {
    $client: Pool;
};
export declare function ensureTablesCreated(): Promise<void>;
export * from "./schema";
//# sourceMappingURL=index.d.ts.map