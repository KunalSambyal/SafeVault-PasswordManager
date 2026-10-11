import { gcm } from '@noble/ciphers/aes.js';
import { getRandomBytes, bytesToHex, hexToBytes } from './random';
import { EncryptedPayload } from '../types/crypto';

const IV_LENGTH_BYTES = 12;

export function encryptAESGCM(
  plaintext: string,
  keyBytes: Uint8Array
): EncryptedPayload {
  const iv = getRandomBytes(IV_LENGTH_BYTES);
  const data = new TextEncoder().encode(plaintext);

  const cipher = gcm(keyBytes, iv);
  const encryptedWithTag = cipher.encrypt(data);

  const ciphertextBytes = encryptedWithTag.slice(0, -16);
  const tagBytes = encryptedWithTag.slice(-16);

  return {
    ciphertext: bytesToHex(ciphertextBytes),
    iv: bytesToHex(iv),
    tag: bytesToHex(tagBytes),
  };
}

export function decryptAESGCM(
  payload: EncryptedPayload,
  keyBytes: Uint8Array
): string {
  const iv = hexToBytes(payload.iv);
  const ciphertextBytes = hexToBytes(payload.ciphertext);
  const tagBytes = hexToBytes(payload.tag);

  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  const cipher = gcm(keyBytes, iv);
  const decryptedBytes = cipher.decrypt(combined);

  return new TextDecoder().decode(decryptedBytes);
}
