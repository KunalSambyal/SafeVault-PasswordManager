let isSystemActivityInProgress = false;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Temporarily pauses auto-locking while system activities
 * like DocumentPicker or the native Share sheet are open.
 */
export function pauseAutoLock(): void {
    if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    }
    isSystemActivityInProgress = true;
}

/**
 * Resumes auto-locking with a grace period to ensure the app
 * fully returns to active foreground state before checking timeouts.
 */
export function resumeAutoLock(delayMs = 2500): void {
    if (resumeTimer) {
        clearTimeout(resumeTimer);
    }
    resumeTimer = setTimeout(() => {
        isSystemActivityInProgress = false;
        resumeTimer = null;
    }, delayMs);
}

export function isAutoLockPaused(): boolean {
    return isSystemActivityInProgress;
}
