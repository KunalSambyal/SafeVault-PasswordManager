import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { getRandomBytes } from "./random";

export function generateRecoveryMnemonic(): string {
    // 128 bits = 16 bytes of entropy generates a standard 12-word phrase
    const entropy = getRandomBytes(16);
    return bip39.entropyToMnemonic(entropy, wordlist);
}

export function validateRecoveryMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

export function deriveKeyFromMnemonic(mnemonic: string): Uint8Array {
    const normalized = mnemonic.trim().toLowerCase();
    if (!validateRecoveryMnemonic(normalized)) {
        throw new Error("Invalid recovery phrase");
    }
    const seed = bip39.mnemonicToSeedSync(normalized);
    return sha256(seed);
}
