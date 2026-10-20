export const CREATE_VAULT_METADATA_TABLE = `
CREATE TABLE IF NOT EXISTS vault_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL,
  encrypted_dek TEXT NOT NULL,
  dek_iv TEXT NOT NULL,
  dek_tag TEXT NOT NULL,
  recovery_encrypted_dek TEXT NOT NULL,
  recovery_iv TEXT NOT NULL,
  recovery_tag TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

export const CREATE_CREDENTIALS_TABLE = `
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity TEXT NOT NULL,
    label TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`;

export const CREATE_INDEX_CREDENTIALS_IDENTITY = `
CREATE INDEX IF NOT EXISTS idx_credentials_identity ON credentials (identity);
`;

export const CREATE_INDEX_CREDENTIALS_LABEL = `
CREATE INDEX IF NOT EXISTS idx_credentials_label ON credentials (label);
`;
