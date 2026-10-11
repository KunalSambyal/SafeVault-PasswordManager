import { getDatabase } from "./connection";
import { VaultMetadata } from "../types/database";

export async function getVaultMetadata(): Promise<VaultMetadata | null> {
    const db = await getDatabase();
    const query = `SELECT * FROM vault_metadata WHERE id = 1 LIMIT 1;`;
    return await db.getFirstAsync<VaultMetadata>(query);
}

export async function isVaultInitialized(): Promise<boolean> {
    const metadata = await getVaultMetadata();
    return metadata !== null;
}

export async function initializeVaultMetadata(
    metadata: Omit<VaultMetadata, "id">,
): Promise<void> {
    const db = await getDatabase();
    const query = `
        INSERT OR REPLACE INTO vault_metadata (
          id,
          salt,
          encrypted_dek,
          dek_iv,
          dek_tag,
          recovery_encrypted_dek,
          recovery_iv,
          recovery_tag,
          is_biometric_enabled,
          created_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
    await db.runAsync(query, [
        metadata.salt,
        metadata.encrypted_dek,
        metadata.dek_iv,
        metadata.dek_tag,
        metadata.recovery_encrypted_dek,
        metadata.recovery_iv,
        metadata.recovery_tag,
        metadata.is_biometric_enabled,
        metadata.created_at,
    ]);
}
