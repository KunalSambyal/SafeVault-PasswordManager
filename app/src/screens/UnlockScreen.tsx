import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useVault } from "../hooks/useVault";
import {
    authenticateWithBiometrics,
    isBiometricsAvailable,
} from "../utils/biometrics";
import { getSessionDek } from "../crypto";
import { colors } from "../theme/colors";

export function UnlockScreen() {
    const {
        unlockWithPassword,
        unlockWithMnemonicPhrase,
        unlockWithBiometricSession,
    } = useVault();
    const [password, setPassword] = useState("");
    const [useRecovery, setUseRecovery] = useState(false);
    const [mnemonic, setMnemonic] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [hasBiometrics, setHasBiometrics] = useState(false);

    useEffect(() => {
        checkBiometrics();
    }, []);

    async function checkBiometrics() {
        const available = await isBiometricsAvailable();
        const cachedDek = await getSessionDek();
        const canUse = available && cachedDek !== null;
        setHasBiometrics(canUse);

        if (canUse) {
            handleBiometricUnlock();
        }
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

        if (useRecovery && !mnemonic.trim()) {
            setErrorMessage("Please enter your 12-word recovery phrase.");
            return;
        }

        if (!useRecovery && !password.trim()) {
            setErrorMessage("Please enter your Master Password.");
            return;
        }

        setIsLoading(true);

        setTimeout(async () => {
            try {
                if (useRecovery) {
                    const ok = await unlockWithMnemonicPhrase(mnemonic);
                    if (!ok) {
                        setErrorMessage("Invalid 12-word mnemonic phrase.");
                    }
                } else {
                    const ok = await unlockWithPassword(password);
                    if (!ok) {
                        setErrorMessage("Incorrect Master Password.");
                    }
                }
            } catch (err: any) {
                setErrorMessage(err?.message || "Failed to unlock vault.");
            } finally {
                setIsLoading(false);
            }
        }, 50);
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
                        {useRecovery ? "Recover Vault" : "Unlock"}
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

const styles = StyleSheet.create({
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
        marginBottom: 24,
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
