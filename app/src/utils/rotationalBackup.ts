import * as FileSystem from "expo-file-system/legacy";
import { getDatabase } from "../db/connection";
import { initializeVaultMetadata } from "../db/metadataRepository";
import { VaultMetadata, CredentialRecord } from "../types/database";

export interface RotationalBackupPayload {
    version: number;
    timestamp: string;
    metadata: VaultMetadata;
    credentials: CredentialRecord[];
}

export interface BackupSlotInfo {
    slot: "v1" | "v2" | "v3";
    fileName: string;
    exists: boolean;
    timestamp?: string;
    credentialCount?: number;
    sizeBytes?: number;
}

const BACKUP_SLOTS = ["v1", "v2", "v3"] as const;

function getBackupFilePath(slot: "v1" | "v2" | "v3"): string {
    const baseDir = FileSystem.documentDirectory || "";
    return `${baseDir}backup_${slot}.json`;
}

/**
 * Executes a 4-file Grandfather-Father-Son rotation before mutating SQLite.
 * Cycle:
 *   1. Remove backup_v3.json (if exists)
 *   2. Move backup_v2.json -> backup_v3.json (if exists)
 *   3. Move backup_v1.json -> backup_v2.json (if exists)
 *   4. Write current SQLite snapshot -> backup_v1.json
 */
export async function performRotationalBackup(): Promise<boolean> {
    try {
        const db = await getDatabase();
        const metadata = await db.getFirstAsync<VaultMetadata>(
            "SELECT * FROM vault_metadata WHERE id = 1 LIMIT 1;",
        );
        if (!metadata) {
            // Vault not initialized yet, nothing to snapshot
            return false;
        }

        const credentials = await db.getAllAsync<CredentialRecord>(
            "SELECT * FROM credentials ORDER BY id ASC;",
        );

        const payload: RotationalBackupPayload = {
            version: 1,
            timestamp: new Date().toISOString(),
            metadata,
            credentials,
        };

        const jsonString = JSON.stringify(payload, null, 2);

        const v1Path = getBackupFilePath("v1");
        const v2Path = getBackupFilePath("v2");
        const v3Path = getBackupFilePath("v3");

        // 1. Delete v3 if it exists
        const v3Info = await FileSystem.getInfoAsync(v3Path);
        if (v3Info.exists) {
            await FileSystem.deleteAsync(v3Path, { idempotent: true });
        }

        // 2. Move v2 to v3 if v2 exists
        const v2Info = await FileSystem.getInfoAsync(v2Path);
        if (v2Info.exists) {
            await FileSystem.moveAsync({ from: v2Path, to: v3Path });
        }

        // 3. Move v1 to v2 if v1 exists
        const v1Info = await FileSystem.getInfoAsync(v1Path);
        if (v1Info.exists) {
            await FileSystem.moveAsync({ from: v1Path, to: v2Path });
        }

        // 4. Write new state snapshot to v1
        await FileSystem.writeAsStringAsync(v1Path, jsonString);

        return true;
    } catch (err) {
        console.warn("Rotational backup failed:", err);
        return false;
    }
}

/**
 * Lists available GFS rolling backup files and their summaries.
 */
export async function listRotationalBackups(): Promise<BackupSlotInfo[]> {
    const results: BackupSlotInfo[] = [];

    for (const slot of BACKUP_SLOTS) {
        const filePath = getBackupFilePath(slot);
        const fileName = `backup_${slot}.json`;

        try {
            const info = await FileSystem.getInfoAsync(filePath);
            if (!info.exists) {
                results.push({ slot, fileName, exists: false });
                continue;
            }

            const content = await FileSystem.readAsStringAsync(filePath);
            const parsed = JSON.parse(content) as RotationalBackupPayload;

            results.push({
                slot,
                fileName,
                exists: true,
                timestamp: parsed.timestamp,
                credentialCount: Array.isArray(parsed.credentials)
                    ? parsed.credentials.length
                    : 0,
                sizeBytes: info.size,
            });
        } catch {
            results.push({ slot, fileName, exists: false });
        }
    }

    return results;
}

/**
 * Restores vault metadata and credentials from a specific rotational backup slot.
 */
export async function restoreRotationalBackup(
    slot: "v1" | "v2" | "v3",
): Promise<void> {
    const filePath = getBackupFilePath(slot);
    const info = await FileSystem.getInfoAsync(filePath);

    if (!info.exists) {
        throw new Error(`Backup snapshot ${slot} does not exist.`);
    }

    const content = await FileSystem.readAsStringAsync(filePath);
    const payload = JSON.parse(content) as RotationalBackupPayload;

    if (!payload.metadata || !Array.isArray(payload.credentials)) {
        throw new Error("Invalid backup file format.");
    }

    const db = await getDatabase();

    // Take a safety snapshot of current state before overriding
    await performRotationalBackup();

    await initializeVaultMetadata(payload.metadata);

    // Wipe and restore credentials
    await db.runAsync("DELETE FROM credentials;");

    for (const item of payload.credentials) {
        await db.runAsync(
            `INSERT INTO credentials (id, identity, label, encrypted_password, iv, auth_tag, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                item.id,
                item.identity,
                item.label,
                item.encrypted_password,
                item.iv,
                item.auth_tag,
                item.created_at || Math.floor(Date.now() / 1000),
                item.updated_at || Math.floor(Date.now() / 1000),
            ],
        );
    }
}
