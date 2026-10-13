import * as SecureStore from "expo-secure-store";

export type AutoLockTimeout = 0 | 60 | 300 | 900;
export type ClipboardTimeout = 15 | 30 | 60;
export type ThemePreference = "dark" | "light";

export interface AppSettings {
    autoLockTimeout: AutoLockTimeout;
    clipboardTimeout: ClipboardTimeout;
    biometricsEnabled: boolean;
    theme: ThemePreference;
}

const SETTINGS_KEY = "safevault_user_settings";

const DEFAULT_SETTINGS: AppSettings = {
    autoLockTimeout: 0,
    clipboardTimeout: 30,
    biometricsEnabled: true,
    theme: "dark",
};

let cachedSettings: AppSettings | null = null;

export async function getAppSettings(): Promise<AppSettings> {
    if (cachedSettings) {
        return cachedSettings;
    }

    try {
        const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            cachedSettings = {
                autoLockTimeout:
                    typeof parsed.autoLockTimeout === "number"
                        ? parsed.autoLockTimeout
                        : DEFAULT_SETTINGS.autoLockTimeout,
                clipboardTimeout:
                    typeof parsed.clipboardTimeout === "number"
                        ? parsed.clipboardTimeout
                        : DEFAULT_SETTINGS.clipboardTimeout,
                biometricsEnabled:
                    typeof parsed.biometricsEnabled === "boolean"
                        ? parsed.biometricsEnabled
                        : DEFAULT_SETTINGS.biometricsEnabled,
                theme:
                    parsed.theme === "light" || parsed.theme === "dark"
                        ? parsed.theme
                        : DEFAULT_SETTINGS.theme,
            };
            return cachedSettings;
        }
    } catch {
        // Fall back to defaults on read errors
    }

    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
}

export async function saveAppSettings(
    updates: Partial<AppSettings>,
): Promise<AppSettings> {
    const current = await getAppSettings();
    const updated: AppSettings = {
        ...current,
        ...updates,
    };

    try {
        await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
        // Fall back gracefully if storage is temporarily unavailable
    }

    cachedSettings = updated;
    return updated;
}
