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
        SELECT identity, COUNT(*) as item_count
        FROM credentials
        GROUP BY identity
        ORDER BY identity ASC;
    `;

    return await db.getAllAsync<IdentitySummary>(query);
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
        INSERT INTO credentials (identity, label, encrypted_password, iv, auth_tag)
        VALUES (?, ?, ?, ?, ?);
      `;
    const result = await db.runAsync(query, [
        input.identity,
        input.label,
        input.encrypted_password,
        input.iv,
        input.auth_tag,
    ]);
    return result.lastInsertRowId;
}

export async function updateCredential(
    id: number,
    input: CredentialInput,
): Promise<void> {
    await performRotationalBackup();
    const db = await getDatabase();
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

export async function deleteCredential(id: number): Promise<void> {
    await performRotationalBackup();
    const db = await getDatabase();
    const query = `DELETE FROM credentials WHERE id = ?;`;
    await db.runAsync(query, [id]);
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
