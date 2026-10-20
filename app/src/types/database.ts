export interface VaultMetadata {
    id: number;
    salt: string;
    encrypted_dek: string;
    dek_iv: string;
    dek_tag: string;
    recovery_encrypted_dek: string;
    recovery_iv: string;
    recovery_tag: string;
    created_at: number;
}

export interface CredentialRecord {
    id: number;
    identity: string;
    label: string;
    encrypted_password: string;
    iv: string;
    auth_tag: string;
    created_at: number;
    updated_at: number;
}

export interface CredentialInput {
    identity: string;
    label: string;
    encrypted_password: string;
    iv: string;
    auth_tag: string;
}

export interface IdentitySummary {
    identity: string;
    item_count: number;
}
