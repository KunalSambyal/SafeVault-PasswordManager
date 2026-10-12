import { AppState, AppStateStatus } from "react-native";
import * as Clipboard from "expo-clipboard";

let lastCopyTime = 0;
let clearDurationMs = 30000;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let isListenerInitialized = false;

function cancelExistingTimer(): void {
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
}

async function performClear(): Promise<void> {
    cancelExistingTimer();
    lastCopyTime = 0;

    try {
        // Directly overwrite the primary clip with an empty string.
        // Do not call getStringAsync() first, as Android 10+ blocks reading
        // before window focus and causes the clear check to fail.
        await Clipboard.setStringAsync("");
    } catch {
        // Ignore clipboard access errors
    }
}

function scheduleClearTimer(delayMs: number): void {
    cancelExistingTimer();

    if (delayMs <= 0) {
        void performClear();
        return;
    }

    clearTimer = setTimeout(() => {
        void performClear();
    }, delayMs);
}

async function checkAndClearClipboard(): Promise<void> {
    if (lastCopyTime === 0) {
        return;
    }

    const elapsed = Date.now() - lastCopyTime;
    if (elapsed >= clearDurationMs) {
        // More than 30 seconds elapsed while the user was away
        await performClear();
    } else {
        // User came back before 30 seconds; schedule for the remaining time
        scheduleClearTimer(clearDurationMs - elapsed);
    }
}

function ensureLifecycleListener(): void {
    if (isListenerInitialized) {
        return;
    }
    isListenerInitialized = true;

    AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
            void checkAndClearClipboard();
        }
    });
}

export async function copySecureString(
    text: string,
    clearAfterSeconds = 30,
): Promise<void> {
    ensureLifecycleListener();
    cancelExistingTimer();

    lastCopyTime = Date.now();
    clearDurationMs = clearAfterSeconds * 1000;

    await Clipboard.setStringAsync(text);

    if (clearAfterSeconds > 0) {
        scheduleClearTimer(clearDurationMs);
    }
}

export async function clearClipboardNow(): Promise<void> {
    await performClear();
}
