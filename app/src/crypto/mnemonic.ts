import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { sha256 } from '@noble/hashes/sha2.js';

export function generateRecoveryMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128);
}

export function validateRecoveryMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

export function deriveKeyFromMnemonic(mnemonic: string): Uint8Array {
  const normalized = mnemonic.trim().toLowerCase();
  if (!validateRecoveryMnemonic(normalized)) {
    throw new Error('Invalid recovery phrase');
  }
  const seed = bip39.mnemonicToSeedSync(normalized);
  return sha256(seed);
}
