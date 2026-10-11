export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface EnvelopeMetadata {
  salt: string;
  encryptedDek: EncryptedPayload;
  recoveryEncryptedDek: EncryptedPayload;
  mnemonic: string;
}

export interface DecryptedVaultKeys {
  dek: Uint8Array;
}
