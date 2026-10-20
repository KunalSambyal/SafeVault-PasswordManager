import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { getAllCredentials } from "../db/credentialsRepository";
import { getDatabase } from "../db/connection";
import {
    createVaultMetadataFromEnvelope,
    initializeVaultMetadata,
} from "../db/metadataRepository";
import {
    encryptAESGCM,
    decryptAESGCM,
    generateSalt,
    deriveKeyFromPassword,
    initializeEnvelope,
    storeSessionDek,
} from "../crypto";
import { performRotationalBackup } from "./rotationalBackup";
import { pauseAutoLock, resumeAutoLock } from "./systemActivity";

export interface MigrationCredentialItem {
    identity: string;
    label: string;
    password: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface PlaintextMigrationPayload {
    format: "safevault_migration";
    version: 1;
    exportedAt: string;
    items: MigrationCredentialItem[];
}

export interface EncryptedMigrationContainer {
    format: "safevault_encrypted_migration";
    version: 1;
    exportedAt: string;
    kdf: {
        algorithm: "PBKDF2-HMAC-SHA256";
        iterations: number;
        salt: string;
    };
    cipher: {
        algorithm: "AES-256-GCM";
        ciphertext: string;
        iv: string;
        tag: string;
    };
}

const PBKDF2_MIGRATION_ITERATIONS = 10000;

type MigrationDatabase = Awaited<ReturnType<typeof getDatabase>>;

async function insertMigrationCredential(
    db: MigrationDatabase,
    item: MigrationCredentialItem,
    encrypted: ReturnType<typeof encryptAESGCM>,
    now: number,
): Promise<void> {
    await db.runAsync(
        `INSERT INTO credentials (identity, label, encrypted_password, iv, auth_tag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
            item.identity.trim(),
            item.label.trim(),
            encrypted.ciphertext,
            encrypted.iv,
            encrypted.tag,
            item.createdAt || now,
            item.updatedAt || now,
        ],
    );
}

/**
 * Exports all credentials as an AES-256-GCM encrypted JSON migration container.
 * Invokes native sharing sheet for safe export to local storage or external apps.
 */
export async function exportVaultMigration(
    backupPassword: string,
    dek: Uint8Array,
): Promise<{ filePath: string; count: number }> {
    if (!backupPassword || backupPassword.length < 8) {
        throw new Error("Backup password must be at least 8 characters.");
    }

    const records = await getAllCredentials();
    const items: MigrationCredentialItem[] = [];

    // Decrypt credentials in memory under active DEK
    for (const record of records) {
        try {
            const plaintextPassword = decryptAESGCM(
                {
                    ciphertext: record.encrypted_password,
                    iv: record.iv,
                    tag: record.auth_tag,
                },
                dek,
            );

            items.push({
                identity: record.identity,
                label: record.label,
                password: plaintextPassword,
                createdAt: record.created_at,
                updatedAt: record.updated_at,
            });
        } catch {
            // Skip corrupted or un-decryptable records
        }
    }

    const payload: PlaintextMigrationPayload = {
        format: "safevault_migration",
        version: 1,
        exportedAt: new Date().toISOString(),
        items,
    };

    const salt = generateSalt(32);
    const derivedKey = deriveKeyFromPassword(
        backupPassword,
        salt,
        PBKDF2_MIGRATION_ITERATIONS,
    );

    const encryptedPayload = encryptAESGCM(
        JSON.stringify(payload),
        derivedKey,
    );

    const container: EncryptedMigrationContainer = {
        format: "safevault_encrypted_migration",
        version: 1,
        exportedAt: payload.exportedAt,
        kdf: {
            algorithm: "PBKDF2-HMAC-SHA256",
            iterations: PBKDF2_MIGRATION_ITERATIONS,
            salt,
        },
        cipher: {
            algorithm: "AES-256-GCM",
            ciphertext: encryptedPayload.ciphertext,
            iv: encryptedPayload.iv,
            tag: encryptedPayload.tag,
        },
    };

    const fileName = `safevault_migration_${Date.now()}.json`;
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
    const filePath = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(container, null, 2),
    );

    if (await Sharing.isAvailableAsync()) {
        pauseAutoLock();
        try {
            await Sharing.shareAsync(filePath, {
                mimeType: "application/json",
                dialogTitle: "Export SafeVault Encrypted Backup",
                UTI: "public.json",
            });
        } finally {
            resumeAutoLock();
        }
    }

    return { filePath, count: items.length };
}

/**
 * Safely reads the text content of a file selected via DocumentPicker.
 * Handles content:// URIs and scoped permission restrictions across Expo Go and standalone builds.
 */
async function readPickedFileAsString(uri: string): Promise<string> {
    const cacheDir =
        FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
    const tempDest = `${cacheDir}safevault_import_${Date.now()}.json`;

    // 1. If content:// URI, copy it to app cache first via ContentResolver streaming
    if (uri.startsWith("content://")) {
        try {
            await FileSystem.copyAsync({
                from: uri,
                to: tempDest,
            });
            const content = await FileSystem.readAsStringAsync(tempDest);
            await FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(
                () => {},
            );
            return content;
        } catch {
            // If copyAsync fails, attempt other strategies
        }
    }

    // 2. Try direct read
    try {
        return await FileSystem.readAsStringAsync(uri);
    } catch {
        // 3. Fallback: try copying to cache if direct read failed
        try {
            await FileSystem.copyAsync({
                from: uri,
                to: tempDest,
            });
            const content = await FileSystem.readAsStringAsync(tempDest);
            await FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(
                () => {},
            );
            return content;
        } catch {
            // 4. Final fallback: try fetch
            try {
                const response = await fetch(uri);
                if (response.ok) {
                    return await response.text();
                }
            } catch {
                // fall through
            }
            throw new Error(
                "Unable to read selected backup file. Please ensure file permissions are granted.",
            );
        }
    }
}

/**
 * Prompts user to select a migration file and decrypts its contents using the provided backup password.
 */
export async function pickAndDecryptMigrationFile(
    backupPassword: string,
): Promise<{ items: MigrationCredentialItem[]; exportedAt: string }> {
    if (!backupPassword || backupPassword.length < 8) {
        throw new Error("Backup password must be at least 8 characters.");
    }

    pauseAutoLock();
    let pickerResult: DocumentPicker.DocumentPickerResult;
    try {
        pickerResult = await DocumentPicker.getDocumentAsync({
            type: ["application/json", "text/*", "*/*"],
            copyToCacheDirectory: false,
        });
    } finally {
        resumeAutoLock();
    }

    if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
    ) {
        throw new Error("File selection cancelled.");
    }

    const selectedFileUri = pickerResult.assets[0].uri;
    const fileContent = await readPickedFileAsString(selectedFileUri);

    let container: EncryptedMigrationContainer;
    try {
        container = JSON.parse(fileContent) as EncryptedMigrationContainer;
    } catch {
        throw new Error("Invalid file. Selected file is not a valid JSON document.");
    }

    if (container.format !== "safevault_encrypted_migration" || !container.kdf || !container.cipher) {
        throw new Error("Unrecognized migration file format.");
    }

    let derivedKey: Uint8Array;
    try {
        derivedKey = deriveKeyFromPassword(
            backupPassword,
            container.kdf.salt,
            container.kdf.iterations || PBKDF2_MIGRATION_ITERATIONS,
        );
    } catch {
        throw new Error("Failed to derive encryption key from backup password.");
    }

    let decryptedText: string;
    try {
        decryptedText = decryptAESGCM(
            {
                ciphertext: container.cipher.ciphertext,
                iv: container.cipher.iv,
                tag: container.cipher.tag,
            },
            derivedKey,
        );
    } catch {
        throw new Error("Incorrect backup password or corrupted backup file.");
    }

    let payload: PlaintextMigrationPayload;
    try {
        payload = JSON.parse(decryptedText) as PlaintextMigrationPayload;
    } catch {
        throw new Error("Decrypted payload is corrupted.");
    }

    if (payload.format !== "safevault_migration" || !Array.isArray(payload.items)) {
        throw new Error("Invalid migration payload structure.");
    }

    return {
        items: payload.items,
        exportedAt: payload.exportedAt || container.exportedAt,
    };
}

/**
 * Imports credentials into an already active and unlocked vault.
 * Supports merge (updating or adding entries) or replace (wiping and replacing credentials).
 */
export async function applyMigrationToExistingVault(
    items: MigrationCredentialItem[],
    dek: Uint8Array,
    mode: "merge" | "replace",
): Promise<{ importedCount: number; updatedCount: number }> {
    await performRotationalBackup();
    const db = await getDatabase();

    let importedCount = 0;
    let updatedCount = 0;

    if (mode === "replace") {
        await db.runAsync("DELETE FROM credentials;");
        for (const item of items) {
            const encrypted = encryptAESGCM(item.password, dek);
            const now = Math.floor(Date.now() / 1000);
            await insertMigrationCredential(db, item, encrypted, now);
            importedCount++;
        }
    } else {
        // Merge mode: check if identity + label already exists
        for (const item of items) {
            const existing = await db.getFirstAsync<{ id: number }>(
                "SELECT id FROM credentials WHERE identity = ? AND label = ? LIMIT 1;",
                [item.identity.trim(), item.label.trim()],
            );

            const encrypted = encryptAESGCM(item.password, dek);
            const now = Math.floor(Date.now() / 1000);

            if (existing) {
                await db.runAsync(
                    `UPDATE credentials
                     SET encrypted_password = ?, iv = ?, auth_tag = ?, updated_at = ?
                     WHERE id = ?;`,
                    [
                        encrypted.ciphertext,
                        encrypted.iv,
                        encrypted.tag,
                        now,
                        existing.id,
                    ],
                );
                updatedCount++;
            } else {
                await insertMigrationCredential(db, item, encrypted, now);
                importedCount++;
            }
        }
    }

    return { importedCount, updatedCount };
}

/**
 * Initializes a brand new vault on a fresh device using imported migration credentials.
 * Generates fresh DEK and 12-word recovery phrase, encrypted under user's newly chosen Master Password.
 */
export async function initializeVaultFromMigration(
    items: MigrationCredentialItem[],
    newMasterPassword: string,
): Promise<{ mnemonic: string; dek: Uint8Array; count: number }> {
    const { metadata, dek } = initializeEnvelope(newMasterPassword);

    await initializeVaultMetadata(createVaultMetadataFromEnvelope(metadata));

    await storeSessionDek(dek);

    const db = await getDatabase();
    await db.runAsync("DELETE FROM credentials;");

    let count = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const item of items) {
        const encrypted = encryptAESGCM(item.password, dek);
        await insertMigrationCredential(db, item, encrypted, now);
        count++;
    }

    return { mnemonic: metadata.mnemonic, dek, count };
}
