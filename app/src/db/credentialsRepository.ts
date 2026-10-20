import { getDatabase } from "./connection";
import {
    CredentialRecord,
    CredentialInput,
    IdentitySummary,
} from "../types/database";
import { performRotationalBackup } from "../utils/rotationalBackup";

export async function getIdentitiesWithCounts(): Promise<IdentitySummary[]> {
    const db = await getDatabase();
    const query = `
        SELECT identity, COUNT(*) as item_count, MAX(updated_at) as latest_updated_at
        FROM credentials
        GROUP BY identity
        ORDER BY identity ASC;
    `;

    return await db.getAllAsync<IdentitySummary>(query);
}

export async function getDistinctIdentities(): Promise<string[]> {
    const db = await getDatabase();
    const query = `
        SELECT DISTINCT identity
        FROM credentials
        ORDER BY identity COLLATE NOCASE ASC;
    `;
    const rows = await db.getAllAsync<{ identity: string }>(query);
    return rows.map((r) => r.identity);
}

export async function getCredentialsByIdentity(
    identity: string,
): Promise<CredentialRecord[]> {
    const db = await getDatabase();
    const query = `
        SELECT * FROM credentials
        WHERE identity = ?
        ORDER BY label ASC;
      `;
    return await db.getAllAsync<CredentialRecord>(query, [identity]);
}

export async function getCredentialById(
    id: number,
): Promise<CredentialRecord | null> {
    const db = await getDatabase();
    const query = `SELECT * FROM credentials WHERE id = ? LIMIT 1;`;
    return await db.getFirstAsync<CredentialRecord>(query, [id]);
}

export async function addCredential(input: CredentialInput): Promise<number> {
    await performRotationalBackup();
    const db = await getDatabase();
    const query = `
        INSERT INTO credentials (identity, label, encrypted_password, iv, auth_tag, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
    const result = await db.runAsync(query, [
        input.identity,
        input.label,
        input.encrypted_password,
        input.iv,
        input.auth_tag,
        input.is_pinned ? 1 : 0,
    ]);
    return result.lastInsertRowId;
}

export async function updateCredential(
    id: number,
    input: CredentialInput,
): Promise<void> {
    await performRotationalBackup();
    const db = await getDatabase();
    if (input.is_pinned !== undefined) {
        const query = `
            UPDATE credentials
            SET identity = ?,
                label = ?,
                encrypted_password = ?,
                iv = ?,
                auth_tag = ?,
                is_pinned = ?,
                updated_at = strftime('%s', 'now')
            WHERE id = ?;
        `;
        await db.runAsync(query, [
            input.identity,
            input.label,
            input.encrypted_password,
            input.iv,
            input.auth_tag,
            input.is_pinned ? 1 : 0,
            id,
        ]);
    } else {
        const query = `
            UPDATE credentials
            SET identity = ?,
                label = ?,
                encrypted_password = ?,
                iv = ?,
                auth_tag = ?,
                updated_at = strftime('%s', 'now')
            WHERE id = ?;
        `;
        await db.runAsync(query, [
            input.identity,
            input.label,
            input.encrypted_password,
            input.iv,
            input.auth_tag,
            id,
        ]);
    }
}

export async function toggleCredentialPin(
    id: number,
    isPinned: boolean,
): Promise<void> {
    const db = await getDatabase();
    const query = `
        UPDATE credentials
        SET is_pinned = ?
        WHERE id = ?;
    `;
    await db.runAsync(query, [isPinned ? 1 : 0, id]);
}

export async function deleteCredential(id: number): Promise<void> {
    await performRotationalBackup();
    const db = await getDatabase();
    const query = `DELETE FROM credentials WHERE id = ?;`;
    await db.runAsync(query, [id]);
}

export async function deleteCredentialsBatch(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await performRotationalBackup();
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    const query = `DELETE FROM credentials WHERE id IN (${placeholders});`;
    await db.runAsync(query, ids);
}

export async function deleteIdentitiesBatch(
    identities: string[],
): Promise<void> {
    if (identities.length === 0) return;
    await performRotationalBackup();
    const db = await getDatabase();
    const placeholders = identities.map(() => "?").join(",");
    const query = `DELETE FROM credentials WHERE identity IN (${placeholders});`;
    await db.runAsync(query, identities);
}

export async function searchCredentials(
    queryText: string,
): Promise<CredentialRecord[]> {
    const db = await getDatabase();
    const pattern = `%${queryText}%`;
    const query = `
        SELECT * FROM credentials
        WHERE identity LIKE ? OR label LIKE ?
        ORDER BY identity ASC, label ASC;
      `;
    return await db.getAllAsync<CredentialRecord>(query, [pattern, pattern]);
}

export async function getAllCredentials(): Promise<CredentialRecord[]> {
    const db = await getDatabase();
    const query = `SELECT * FROM credentials ORDER BY id ASC;`;
    return await db.getAllAsync<CredentialRecord>(query);
}
