import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useVault } from "../hooks/useVault";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";
import {
    authenticateWithBiometrics,
    isBiometricsAvailable,
} from "../utils/biometrics";
import { getSessionDek } from "../crypto";
import { getAppSettings } from "../utils/settingsStore";

export function UnlockScreen() {
    const {
        unlockWithPassword,
        prepareRecoveryWithMnemonic,
        abortRecovery,
        resetMasterPassword,
        unlockWithBiometricSession,
    } = useVault();
    const { colors } = useTheme();

    const [password, setPassword] = useState("");
    const [useRecovery, setUseRecovery] = useState(false);
    const [mnemonic, setMnemonic] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [hasBiometrics, setHasBiometrics] = useState(false);

    // Recovery Password Reset states
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        void checkBiometrics();
    }, []);

    async function checkBiometrics() {
        const available = await isBiometricsAvailable();
        const cachedDek = await getSessionDek();
        const settings = await getAppSettings();
        setHasBiometrics(
            available && cachedDek !== null && settings.biometricsEnabled,
        );
    }

    async function handleBiometricUnlock() {
        setIsLoading(true);
        setErrorMessage("");
        const success = await authenticateWithBiometrics("Unlock SafeVault");
        if (success) {
            const ok = await unlockWithBiometricSession();
            if (ok) {
                setIsLoading(false);
                return;
            }
        }
        setIsLoading(false);
    }

    function handleUnlock() {
        setErrorMessage("");

        if (useRecovery) {
            if (!mnemonic.trim()) {
                setErrorMessage("Please enter your 12-word recovery phrase.");
                return;
            }

            setIsLoading(true);

            setTimeout(async () => {
                try {
                    // 1. Verify 12 words can decrypt the vault
                    const ok = await prepareRecoveryWithMnemonic(mnemonic);
                    if (!ok) {
                        setErrorMessage("Invalid 12-word recovery phrase.");
                        setIsLoading(false);
                        return;
                    }

                    // 2. Dual-factor verification: require device fingerprint or PIN
                    const biometricOk = await authenticateWithBiometrics(
                        "Confirm fingerprint or PIN to authorize vault recovery",
                    );

                    if (!biometricOk) {
                        abortRecovery();
                        setErrorMessage(
                            "Biometric confirmation required to authorize recovery.",
                        );
                        setIsLoading(false);
                        return;
                    }

                    // 3. Both factors passed: transition to setting a new Master Password
                    setIsResettingPassword(true);
                    setIsLoading(false);
                } catch {
                    abortRecovery();
                    setErrorMessage("Recovery verification failed.");
                    setIsLoading(false);
                }
            }, 50);
        } else {
            if (!password) {
                setErrorMessage("Please enter your Master Password.");
                return;
            }

            setIsLoading(true);

            setTimeout(async () => {
                try {
                    const ok = await unlockWithPassword(password);
                    if (!ok) {
                        setErrorMessage("Incorrect Master Password.");
                    }
                } catch {
                    setErrorMessage("An error occurred during vault unlock.");
                } finally {
                    setIsLoading(false);
                }
            }, 50);
        }
    }

    async function handleSaveNewPassword() {
        setErrorMessage("");

        if (newPassword.length < 8) {
            setErrorMessage("New master password must be at least 8 characters.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        setTimeout(async () => {
            try {
                await resetMasterPassword(newPassword);
                // Reset completes unlock and lands in Dashboard
            } catch (err: any) {
                setErrorMessage(
                    err?.message || "Failed to update Master Password.",
                );
                setIsLoading(false);
            }
        }, 50);
    }

    // Step 2 of Recovery: Set a new Master Password
    if (isResettingPassword) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Reset Master Password</Text>
                <Text style={styles.subtitle}>
                    Recovery phrase and biometric authentication verified.
                    Please choose a new Master Password for this device.
                </Text>

                {errorMessage ? (
                    <Text style={styles.errorBanner}>{errorMessage}</Text>
                ) : null}

                <TextInput
                    style={styles.input}
                    placeholder="New Master Password (min 8 chars)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={(text) => {
                        setNewPassword(text);
                        if (errorMessage) setErrorMessage("");
                    }}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm New Master Password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={confirmNewPassword}
                    onChangeText={(text) => {
                        setConfirmNewPassword(text);
                        if (errorMessage) setErrorMessage("");
                    }}
                />

                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        isLoading && styles.buttonDisabled,
                    ]}
                    onPress={handleSaveNewPassword}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.buttonText}>
                            Set New Master Password
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SafeVault</Text>
            <Text style={styles.subtitle}>
                {useRecovery
                    ? "Enter your 12-word recovery phrase to restore access."
                    : "Enter your Master Password to unlock the vault."}
            </Text>

            {errorMessage ? (
                <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            {useRecovery ? (
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="word1 word2 word3..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={mnemonic}
                    onChangeText={(text) => {
                        setMnemonic(text);
                        if (errorMessage) setErrorMessage("");
                    }}
                />
            ) : (
                <TextInput
                    style={styles.input}
                    placeholder="Master Password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (errorMessage) setErrorMessage("");
                    }}
                />
            )}

            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                ]}
                onPress={handleUnlock}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                ) : (
                    <Text style={styles.buttonText}>
                        {useRecovery ? "Verify Phrase" : "Unlock"}
                    </Text>
                )}
            </TouchableOpacity>

            {hasBiometrics && !useRecovery ? (
                <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricUnlock}
                    disabled={isLoading}
                >
                    <Text style={styles.biometricButtonText}>
                        Unlock with Fingerprint / PIN
                    </Text>
                </TouchableOpacity>
            ) : null}

            <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                    setUseRecovery(!useRecovery);
                    setErrorMessage("");
                }}
                disabled={isLoading}
            >
                <Text style={styles.switchButtonText}>
                    {useRecovery
                        ? "Use Master Password"
                        : "Lost Password? Use Recovery Phrase"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 24,
            justifyContent: "center",
        },
        title: {
            fontSize: 32,
            fontWeight: "800",
            color: colors.textPrimary,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 15,
            color: colors.textSecondary,
            marginBottom: 28,
            lineHeight: 22,
        },
        errorBanner: {
            color: colors.danger,
            backgroundColor: colors.dangerBackground,
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: "600",
        },
        input: {
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 8,
            color: colors.textPrimary,
            padding: 14,
            marginBottom: 16,
            fontSize: 16,
        },
        textArea: {
            minHeight: 80,
            textAlignVertical: "top",
        },
        primaryButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 8,
            minHeight: 52,
            justifyContent: "center",
        },
        biometricButton: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.primary,
            padding: 14,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 12,
        },
        biometricButtonText: {
            color: colors.primary,
            fontWeight: "700",
            fontSize: 15,
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        buttonText: {
            color: colors.background,
            fontWeight: "700",
            fontSize: 16,
        },
        switchButton: {
            marginTop: 20,
            alignItems: "center",
        },
        switchButtonText: {
            color: colors.accent,
            fontSize: 14,
        },
    });
}
