import * as SQLite from "expo-sqlite";
import {
    CREATE_VAULT_METADATA_TABLE,
    CREATE_CREDENTIALS_TABLE,
    CREATE_INDEX_CREDENTIALS_LABEL,
    CREATE_INDEX_CREDENTIALS_IDENTITY,
    CREATE_INDEX_CREDENTIALS_PINNED,
} from "./schema";

const DATABASE_NAME = "safevault.db";

let databaseInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (databaseInstance) {
        return databaseInstance;
    }

    databaseInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Enable Write-Ahead Logging for performance and data integrity
    await databaseInstance.execAsync("PRAGMA journal_mode = WAL;");
    await databaseInstance.execAsync("PRAGMA foreign_keys = ON;");

    // Initialize tables and indexes
    await databaseInstance.execAsync(CREATE_VAULT_METADATA_TABLE);
    await databaseInstance.execAsync(CREATE_CREDENTIALS_TABLE);
    await databaseInstance.execAsync(CREATE_INDEX_CREDENTIALS_IDENTITY);
    await databaseInstance.execAsync(CREATE_INDEX_CREDENTIALS_LABEL);

    // Non-destructive migration: add is_pinned column if upgrading from earlier version
    try {
        await databaseInstance.execAsync(
            "ALTER TABLE credentials ADD COLUMN is_pinned INTEGER DEFAULT 0;",
        );
    } catch {
        // Column already exists, safe to ignore
    }

    await databaseInstance.execAsync(CREATE_INDEX_CREDENTIALS_PINNED);

    return databaseInstance;
}
