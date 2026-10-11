import * as SecureStore from "expo-secure-store";
import { bytesToHex, hexToBytes } from "./random";

const SESSION_DEK_KEY = "safevault_session_dek";

export async function storeSessionDek(dek: Uint8Array): Promise<void> {
    const dekHex = bytesToHex(dek);
    try {
        await SecureStore.setItemAsync(SESSION_DEK_KEY, dekHex);
    } catch (err) {
        console.warn("Failed to store session key in SecureStore", err);
    }
}

export async function getSessionDek(): Promise<Uint8Array | null> {
    try {
        const dekHex = await SecureStore.getItemAsync(SESSION_DEK_KEY);
        if (!dekHex) {
            return null;
        }
        return hexToBytes(dekHex);
    } catch {
        return null;
    }
}

export async function clearSessionDek(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(SESSION_DEK_KEY);
    } catch {
        // Ignore cleanup failures
    }
}
