import * as Crypto from "expo-crypto";

// Polyfill globalThis.crypto.getRandomValues for third-party crypto libraries
if (typeof globalThis.crypto !== "object" || globalThis.crypto === null) {
    (globalThis as any).crypto = {};
}

if (typeof (globalThis as any).crypto.getRandomValues !== "function") {
    (globalThis as any).crypto.getRandomValues = <
        T extends ArrayBufferView | null,
    >(
        array: T,
    ): T => {
        if (!array) return array;
        const uint8 = new Uint8Array(
            array.buffer,
            array.byteOffset,
            array.byteLength,
        );
        const randomBytes = Crypto.getRandomBytes(uint8.length);
        uint8.set(randomBytes);
        return array;
    };
}

export function getRandomBytes(byteCount: number): Uint8Array {
    return Crypto.getRandomBytes(byteCount);
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hexadecimal string");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
