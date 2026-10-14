import * as LocalAuthentication from "expo-local-authentication";

export async function isBiometricsAvailable(): Promise<boolean> {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
            return true;
        }
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        return level > 0;
    } catch {
        return false;
    }
}

export async function authenticateWithBiometrics(
    promptMessage = "Authenticate to access SafeVault",
): Promise<boolean> {
    try {
        const available = await isBiometricsAvailable();
        if (!available) {
            return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            cancelLabel: "Cancel",
            disableDeviceFallback: false,
        });

        return result.success;
    } catch (err) {
        console.warn("Biometric authentication error", err);
        return false;
    }
}
