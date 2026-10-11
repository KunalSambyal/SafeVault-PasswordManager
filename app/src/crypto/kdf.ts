import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { getRandomBytes, bytesToHex, hexToBytes } from "./random";

const PBKDF2_ITERATIONS = 10000;
const KEY_LENGTH_BYTES = 32;

export function generateSalt(byteCount = 32): string {
    return bytesToHex(getRandomBytes(byteCount));
}

export function deriveKeyFromPassword(
    password: string,
    saltHex: string,
    iterations = PBKDF2_ITERATIONS,
): Uint8Array {
    const salt = hexToBytes(saltHex);
    const passwordBytes = new TextEncoder().encode(password);
    return pbkdf2(sha256, passwordBytes, salt, {
        c: iterations,
        dkLen: KEY_LENGTH_BYTES,
    });
}
