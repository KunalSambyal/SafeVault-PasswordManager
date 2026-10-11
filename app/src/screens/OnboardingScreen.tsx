import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { useVault } from "../hooks/useVault";
import { colors } from "../theme/colors";

export function OnboardingScreen() {
    const { setupNewVault, completeOnboarding } = useVault();
    const [step, setStep] = useState<"password" | "mnemonic">("password");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mnemonic, setMnemonic] = useState("");
    const [confirmedBackup, setConfirmedBackup] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleCreatePassword() {
        setErrorMessage("");

        if (password.length < 8) {
            setErrorMessage("Master password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        setTimeout(async () => {
            try {
                const generatedPhrase = await setupNewVault(password);
                setMnemonic(generatedPhrase);
                setStep("mnemonic");
            } catch (err: any) {
                console.error("Setup error:", err);
                setErrorMessage(
                    err?.message || "Failed to initialize secure vault.",
                );
            } finally {
                setIsLoading(false);
            }
        }, 50);
    }

    async function handleFinishOnboarding() {
        setIsLoading(true);
        try {
            await completeOnboarding();
        } catch (err: any) {
            setErrorMessage(err?.message || "Failed to open vault.");
        } finally {
            setIsLoading(false);
        }
    }

    if (step === "mnemonic") {
        const words = mnemonic.split(" ");

        return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Recovery Phrase</Text>
                <Text style={styles.subtitle}>
                    Write down these 12 words in order and store them offline.
                    If you lose your Master Password, this phrase is the only
                    way to recover your data.
                </Text>

                <View style={styles.mnemonicGrid}>
                    {words.map((word, index) => (
                        <View key={index} style={styles.wordBadge}>
                            <Text style={styles.wordIndex}>{index + 1}.</Text>
                            <Text style={styles.wordText}>{word}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[
                        styles.checkboxContainer,
                        confirmedBackup && styles.checkboxActive,
                    ]}
                    onPress={() => setConfirmedBackup(!confirmedBackup)}
                >
                    <Text style={styles.checkboxText}>
                        [ {confirmedBackup ? "X" : "  "} ] I wrote down my
                        recovery phrase in a safe place
                    </Text>
                </TouchableOpacity>

                {errorMessage ? (
                    <Text style={styles.errorBanner}>{errorMessage}</Text>
                ) : null}

                <TouchableOpacity
                    disabled={!confirmedBackup || isLoading}
                    style={[
                        styles.primaryButton,
                        (!confirmedBackup || isLoading) &&
                            styles.buttonDisabled,
                    ]}
                    onPress={handleFinishOnboarding}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.buttonText}>Open SafeVault</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SafeVault Setup</Text>
            <Text style={styles.subtitle}>
                Create a Master Password to protect your local offline
                credentials.
            </Text>

            {errorMessage ? (
                <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            <TextInput
                style={styles.input}
                placeholder="Master Password (min 8 chars)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage("");
                }}
            />

            <TextInput
                style={styles.input}
                placeholder="Confirm Master Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage("");
                }}
            />

            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                ]}
                onPress={handleCreatePassword}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                ) : (
                    <Text style={styles.buttonText}>Generate Vault</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: 24,
        justifyContent: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
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
    primaryButton: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
        minHeight: 52,
        justifyContent: "center",
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.background,
        fontWeight: "700",
        fontSize: 16,
    },
    mnemonicGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 24,
    },
    wordBadge: {
        width: "48%",
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 8,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    wordIndex: {
        color: colors.accent,
        fontWeight: "600",
        marginRight: 6,
        width: 24,
    },
    wordText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: "500",
    },
    checkboxContainer: {
        padding: 12,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: 20,
    },
    checkboxActive: {
        borderColor: colors.primary,
    },
    checkboxText: {
        color: colors.textPrimary,
        fontSize: 14,
    },
});
