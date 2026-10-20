import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useVault } from "../hooks/useVault";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";
import {
    pickAndDecryptMigrationFile,
    MigrationCredentialItem,
} from "../utils/migrationService";

export function OnboardingScreen() {
    const { setupNewVault, setupVaultFromMigration, completeOnboarding } =
        useVault();
    const { colors } = useTheme();

    const [step, setStep] = useState<"password" | "import" | "mnemonic">(
        "password",
    );
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mnemonic, setMnemonic] = useState("");
    const [confirmedBackup, setConfirmedBackup] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Import Flow States
    const [backupPassword, setBackupPassword] = useState("");
    const [importedItems, setImportedItems] = useState<
        MigrationCredentialItem[] | null
    >(null);
    const [importedDate, setImportedDate] = useState("");

    const styles = useMemo(() => createStyles(colors), [colors]);

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

        try {
            const generatedPhrase = await setupNewVault(password);
            setMnemonic(generatedPhrase);
            setStep("mnemonic");
        } catch (err: any) {
            console.error("Setup error:", err);
            setErrorMessage(err?.message || "Failed to initialize secure vault.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDecryptMigrationFile() {
        setErrorMessage("");

        if (backupPassword.length < 8) {
            const msg = "Backup password must be at least 8 characters.";
            setErrorMessage(msg);
            Alert.alert("Password Required", msg);
            return;
        }

        setIsLoading(true);

        try {
            const result = await pickAndDecryptMigrationFile(backupPassword);
            setImportedItems(result.items);
            setImportedDate(result.exportedAt);
        } catch (err: any) {
            if (err?.message !== "File selection cancelled.") {
                const message = err?.message || "Failed to decrypt backup file.";
                setErrorMessage(message);
                Alert.alert("Import Failed", message);
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCompleteImportSetup() {
        setErrorMessage("");

        if (!importedItems) return;

        if (password.length < 8) {
            setErrorMessage(
                "Master password for this device must be at least 8 characters.",
            );
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage("Master passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const phrase = await setupVaultFromMigration(importedItems, password);
            setMnemonic(phrase);
            setStep("mnemonic");
        } catch (err: any) {
            setErrorMessage(err?.message || "Failed to initialize vault from backup.");
        } finally {
            setIsLoading(false);
        }
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

    // Step 2: Display 12-word recovery phrase
    if (step === "mnemonic") {
        const words = mnemonic.split(" ");

        return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Recovery Phrase</Text>
                <Text style={styles.subtitle}>
                    Write down these 12 words in order and store them offline. If
                    you lose your Master Password, this phrase is the only way
                    to recover your data.
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

    // Alternative Step: Import Existing Vault during Setup
    if (step === "import") {
        return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Import Existing Vault</Text>
                <Text style={styles.subtitle}>
                    Restore your credentials from an encrypted SafeVault migration
                    file created on another device.
                </Text>

                {errorMessage ? (
                    <Text style={styles.errorBanner}>{errorMessage}</Text>
                ) : null}

                {!importedItems ? (
                    <>
                        <Text style={styles.fieldLabel}>
                            Backup Password (used during export)
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter backup password"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={backupPassword}
                            onChangeText={(text) => {
                                setBackupPassword(text);
                                if (errorMessage) setErrorMessage("");
                            }}
                        />

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleDecryptMigrationFile}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Select Backup File & Decrypt
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                setStep("password");
                                setErrorMessage("");
                            }}
                            disabled={isLoading}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Back to Fresh Setup
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoCardTitle}>
                                Backup Verified
                            </Text>
                            <Text style={styles.infoCardBody}>
                                Found {importedItems.length} credentials in
                                backup.
                            </Text>
                            {importedDate ? (
                                <Text style={styles.infoCardMuted}>
                                    Exported:{" "}
                                    {new Date(importedDate).toLocaleString()}
                                </Text>
                            ) : null}
                        </View>

                        <Text style={styles.fieldLabel}>
                            Create Master Password for this Device
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Device Master Password (min 8 chars)"
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
                            placeholder="Confirm Device Master Password"
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
                            onPress={handleCompleteImportSetup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Initialize Vault from Backup
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                setImportedItems(null);
                                setBackupPassword("");
                                setErrorMessage("");
                            }}
                            disabled={isLoading}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Choose Different File
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        );
    }

    // Step 1: Default Master Password setup
    return (
        <ScrollView contentContainerStyle={styles.container}>
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

            <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                    setErrorMessage("");
                    setStep("import");
                }}
                disabled={isLoading}
            >
                <Text style={styles.secondaryButtonText}>
                    Import Existing Vault
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
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
        fieldLabel: {
            fontSize: 13,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 6,
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
        dividerRow: {
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 20,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.surfaceBorder,
        },
        dividerText: {
            marginHorizontal: 12,
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: "700",
        },
        secondaryButton: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            padding: 16,
            borderRadius: 8,
            alignItems: "center",
        },
        secondaryButtonText: {
            color: colors.textPrimary,
            fontWeight: "600",
            fontSize: 15,
        },
        infoCard: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
        },
        infoCardTitle: {
            fontSize: 14,
            fontWeight: "700",
            color: colors.primary,
            marginBottom: 4,
        },
        infoCardBody: {
            fontSize: 14,
            fontWeight: "600",
            color: colors.textPrimary,
            marginBottom: 2,
        },
        infoCardMuted: {
            fontSize: 11,
            color: colors.textMuted,
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
}
