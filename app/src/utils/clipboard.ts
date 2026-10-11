import * as Clipboard from "expo-clipboard";

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copySecureString(
    text: string,
    clearAfterSeconds = 30,
): Promise<void> {
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }

    await Clipboard.setStringAsync(text);

    if (clearAfterSeconds > 0) {
        clearTimer = setTimeout(async () => {
            try {
                const current = await Clipboard.getStringAsync();
                if (current === text) {
                    await Clipboard.setStringAsync("");
                }
            } catch {
                // Ignore clipboard clear errors
            }
        }, clearAfterSeconds * 1000);
    }
}
