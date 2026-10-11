import * as SecureStore from 'expo-secure-store';
import { bytesToHex, hexToBytes } from './random';

const SESSION_DEK_KEY = 'safevault_session_dek';

export async function storeSessionDek(dek: Uint8Array): Promise<void> {
  const dekHex = bytesToHex(dek);
  await SecureStore.setItemAsync(SESSION_DEK_KEY, dekHex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSessionDek(): Promise<Uint8Array | null> {
  const dekHex = await SecureStore.getItemAsync(SESSION_DEK_KEY);
  if (!dekHex) {
    return null;
  }
  return hexToBytes(dekHex);
}

export async function clearSessionDek(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_DEK_KEY);
}
