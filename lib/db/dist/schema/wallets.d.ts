import { z } from "zod/v4";
export declare const walletsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "wallets";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "wallets";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "wallets";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        hiringBalance: import("drizzle-orm/pg-core").PgColumn<{
            name: "hiring_balance";
            tableName: "wallets";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        earningsBalance: import("drizzle-orm/pg-core").PgColumn<{
            name: "earnings_balance";
            tableName: "wallets";
            dataType: "number";
            columnType: "PgReal";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "wallets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const insertWalletSchema: z.ZodObject<{
    userId: z.ZodInt;
    hiringBalance: z.ZodOptional<z.ZodNumber>;
    earningsBalance: z.ZodOptional<z.ZodNumber>;
}, {
    out: {};
    in: {};
}>;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
//# sourceMappingURL=wallets.d.ts.map