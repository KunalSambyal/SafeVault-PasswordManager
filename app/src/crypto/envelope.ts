import { getRandomBytes, bytesToHex, hexToBytes } from './random';
import { generateSalt, deriveKeyFromPassword } from './kdf';
import { encryptAESGCM, decryptAESGCM } from './aes';
import {
  generateRecoveryMnemonic,
  deriveKeyFromMnemonic,
} from './mnemonic';
import { EnvelopeMetadata } from '../types/crypto';

export function initializeEnvelope(masterPassword: string): EnvelopeMetadata {
  const salt = generateSalt(32);
  const kek = deriveKeyFromPassword(masterPassword, salt);

  const dek = getRandomBytes(32);
  const dekHex = bytesToHex(dek);

  const encryptedDek = encryptAESGCM(dekHex, kek);

  const mnemonic = generateRecoveryMnemonic();
  const recoveryKek = deriveKeyFromMnemonic(mnemonic);
  const recoveryEncryptedDek = encryptAESGCM(dekHex, recoveryKek);

  return {
    salt,
    encryptedDek,
    recoveryEncryptedDek,
    mnemonic,
  };
}

export function unlockDekWithPassword(
  masterPassword: string,
  saltHex: string,
  encryptedDekPayload: { ciphertext: string; iv: string; tag: string }
): Uint8Array {
  const kek = deriveKeyFromPassword(masterPassword, saltHex);
  const decryptedHex = decryptAESGCM(encryptedDekPayload, kek);
  return hexToBytes(decryptedHex);
}

export function unlockDekWithMnemonic(
  mnemonic: string,
  recoveryEncryptedDekPayload: { ciphertext: string; iv: string; tag: string }
): Uint8Array {
  const recoveryKek = deriveKeyFromMnemonic(mnemonic);
  const decryptedHex = decryptAESGCM(recoveryEncryptedDekPayload, recoveryKek);
  return hexToBytes(decryptedHex);
}
