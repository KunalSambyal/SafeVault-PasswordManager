import * as SecureStore from "expo-secure-store";

export type AutoLockTimeout = 0 | 60 | 300 | 900;
export type ThemePreference = "dark" | "light";
export type SortOrder = "name_asc" | "name_desc" | "date_desc" | "date_asc";

export interface AppSettings {
    autoLockTimeout: AutoLockTimeout;
    theme: ThemePreference;
    requireBiometricForCopy: boolean;
    pinnedIdentities: string[];
    identitySortOrder: SortOrder;
    credentialSortOrder: SortOrder;
}

const SETTINGS_KEY = "safevault_user_settings";

const DEFAULT_SETTINGS: AppSettings = {
    autoLockTimeout: 0,
    theme: "dark",
    requireBiometricForCopy: true,
    pinnedIdentities: [],
    identitySortOrder: "name_asc",
    credentialSortOrder: "name_asc",
};

let cachedSettings: AppSettings | null = null;

const VALID_SORT_ORDERS: SortOrder[] = [
    "name_asc",
    "name_desc",
    "date_desc",
    "date_asc",
];

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
                theme:
                    parsed.theme === "light" || parsed.theme === "dark"
                        ? parsed.theme
                        : DEFAULT_SETTINGS.theme,
                requireBiometricForCopy:
                    typeof parsed.requireBiometricForCopy === "boolean"
                        ? parsed.requireBiometricForCopy
                        : DEFAULT_SETTINGS.requireBiometricForCopy,
                pinnedIdentities: Array.isArray(parsed.pinnedIdentities)
                    ? parsed.pinnedIdentities
                    : DEFAULT_SETTINGS.pinnedIdentities,
                identitySortOrder: VALID_SORT_ORDERS.includes(
                    parsed.identitySortOrder,
                )
                    ? parsed.identitySortOrder
                    : DEFAULT_SETTINGS.identitySortOrder,
                credentialSortOrder: VALID_SORT_ORDERS.includes(
                    parsed.credentialSortOrder,
                )
                    ? parsed.credentialSortOrder
                    : DEFAULT_SETTINGS.credentialSortOrder,
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
