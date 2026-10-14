import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import {
    pickAndDecryptMigrationFile,
    applyMigrationToExistingVault,
    MigrationCredentialItem,
} from "../utils/migrationService";

interface ImportModalProps {
    visible: boolean;
    onClose: () => void;
    dek: Uint8Array | null;
    onSuccess: () => void;
}

export function ImportModal({
    visible,
    onClose,
    dek,
    onSuccess,
}: ImportModalProps) {
    const { colors } = useTheme();
    const [backupPassword, setBackupPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [decryptedItems, setDecryptedItems] = useState<
        MigrationCredentialItem[] | null
    >(null);
    const [exportedDate, setExportedDate] = useState("");

    function handleReset() {
        setBackupPassword("");
        setErrorMessage("");
        setDecryptedItems(null);
        setExportedDate("");
        setIsLoading(false);
    }

    function handleClose() {
        handleReset();
        onClose();
    }

    async function handleSelectAndDecrypt() {
        setErrorMessage("");

        if (!dek) {
            setErrorMessage("Vault is locked or key is unavailable.");
            return;
        }

        if (backupPassword.length < 8) {
            const msg = "Please enter the Backup Password (min 8 characters).";
            setErrorMessage(msg);
            Alert.alert("Password Required", msg);
            return;
        }

        setIsLoading(true);

        setTimeout(async () => {
            try {
                const result = await pickAndDecryptMigrationFile(backupPassword);
                setDecryptedItems(result.items);
                setExportedDate(result.exportedAt);
                setIsLoading(false);
            } catch (err: any) {
                setIsLoading(false);
                if (err?.message !== "File selection cancelled.") {
                    const message =
                        err?.message || "Failed to decrypt backup file.";
                    setErrorMessage(message);
                    Alert.alert("Import Failed", message);
                }
            }
        }, 50);
    }

    async function handleApplyImport(mode: "merge" | "replace") {
        if (!decryptedItems || !dek) return;

        setIsLoading(true);
        setErrorMessage("");

        setTimeout(async () => {
            try {
                const result = await applyMigrationToExistingVault(
                    decryptedItems,
                    dek,
                    mode,
                );

                setIsLoading(false);
                handleClose();
                onSuccess();

                if (mode === "replace") {
                    Alert.alert(
                        "Vault Restored",
                        `Replaced existing vault with ${result.importedCount} credentials.`,
                    );
                } else {
                    Alert.alert(
                        "Vault Merged",
                        `Import complete: ${result.importedCount} new entries added, ${result.updatedCount} existing entries updated.`,
                    );
                }
            } catch (err: any) {
                setIsLoading(false);
                setErrorMessage(err?.message || "Failed to import credentials.");
            }
        }, 50);
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.surfaceBorder,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.header,
                            { borderBottomColor: colors.surfaceBorder },
                        ]}
                    >
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: colors.textPrimary },
                            ]}
                        >
                            Import Encrypted Vault
                        </Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={styles.closeButton}
                        >
                            <Text
                                style={[
                                    styles.closeButtonText,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                ✕
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {!decryptedItems ? (
                            <>
                                <Text
                                    style={[
                                        styles.description,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Select a SafeVault migration JSON file to
                                    restore or merge credentials. Enter the
                                    Backup Password that was set during export.
                                </Text>

                                {errorMessage ? (
                                    <Text
                                        style={[
                                            styles.errorBanner,
                                            {
                                                color: colors.danger,
                                                backgroundColor:
                                                    colors.dangerBackground,
                                            },
                                        ]}
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Text
                                    style={[
                                        styles.inputLabel,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Backup Password
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor:
                                                colors.inputBackground,
                                            borderColor: colors.surfaceBorder,
                                            color: colors.textPrimary,
                                        },
                                    ]}
                                    placeholder="Enter backup password"
                                    placeholderTextColor={colors.textMuted}
                                    secureTextEntry
                                    value={backupPassword}
                                    onChangeText={(val) => {
                                        setBackupPassword(val);
                                        if (errorMessage) setErrorMessage("");
                                    }}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.selectButton,
                                        { backgroundColor: colors.primary },
                                        isLoading && styles.buttonDisabled,
                                    ]}
                                    onPress={handleSelectAndDecrypt}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator
                                            color={colors.background}
                                        />
                                    ) : (
                                        <Text
                                            style={[
                                                styles.selectButtonText,
                                                { color: colors.background },
                                            ]}
                                        >
                                            Choose File & Decrypt
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View
                                    style={[
                                        styles.summaryBox,
                                        {
                                            backgroundColor:
                                                colors.cardBackground,
                                            borderColor: colors.surfaceBorder,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.summaryTitle,
                                            { color: colors.primary },
                                        ]}
                                    >
                                        Backup Verified
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryText,
                                            { color: colors.textPrimary },
                                        ]}
                                    >
                                        Total credentials found:{" "}
                                        {decryptedItems.length}
                                    </Text>
                                    {exportedDate ? (
                                        <Text
                                            style={[
                                                styles.summaryDate,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            Exported:{" "}
                                            {new Date(
                                                exportedDate,
                                            ).toLocaleString()}
                                        </Text>
                                    ) : null}
                                </View>

                                {errorMessage ? (
                                    <Text
                                        style={[
                                            styles.errorBanner,
                                            {
                                                color: colors.danger,
                                                backgroundColor:
                                                    colors.dangerBackground,
                                            },
                                        ]}
                                    >
                                        {errorMessage}
                                    </Text>
                                ) : null}

                                <Text
                                    style={[
                                        styles.choiceHeader,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Choose Import Strategy:
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.optionCard,
                                        {
                                            backgroundColor:
                                                colors.cardBackground,
                                            borderColor: colors.surfaceBorder,
                                        },
                                    ]}
                                    onPress={() => handleApplyImport("merge")}
                                    disabled={isLoading}
                                >
                                    <Text
                                        style={[
                                            styles.optionTitle,
                                            { color: colors.primary },
                                        ]}
                                    >
                                        Merge Credentials
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionSubtitle,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Adds imported credentials to your current
                                        vault. Updates existing items if identity
                                        and label match.
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.optionCard,
                                        {
                                            backgroundColor:
                                                colors.cardBackground,
                                            borderColor: colors.surfaceBorder,
                                        },
                                    ]}
                                    onPress={() => {
                                        Alert.alert(
                                            "Confirm Vault Replacement",
                                            "This will clear all current credentials and replace them with the backup file. A local rotational snapshot will be taken first.",
                                            [
                                                {
                                                    text: "Cancel",
                                                    style: "cancel",
                                                },
                                                {
                                                    text: "Replace",
                                                    style: "destructive",
                                                    onPress: () =>
                                                        handleApplyImport(
                                                            "replace",
                                                        ),
                                                },
                                            ],
                                        );
                                    }}
                                    disabled={isLoading}
                                >
                                    <Text
                                        style={[
                                            styles.optionTitle,
                                            { color: colors.danger },
                                        ]}
                                    >
                                        Replace All Credentials
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionSubtitle,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Wipes existing credentials and restores
                                        only the entries from the backup file.
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.backStepButton,
                                        { borderColor: colors.surfaceBorder },
                                    ]}
                                    onPress={() => setDecryptedItems(null)}
                                    disabled={isLoading}
                                >
                                    <Text
                                        style={[
                                            styles.backStepButtonText,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Back to File Selection
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    container: {
        width: "100%",
        maxHeight: "90%",
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "600",
    },
    body: {
        flexGrow: 0,
    },
    bodyContent: {
        padding: 18,
    },
    description: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 16,
    },
    errorBanner: {
        padding: 10,
        borderRadius: 6,
        fontSize: 12,
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 16,
    },
    selectButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    selectButtonText: {
        fontSize: 14,
        fontWeight: "700",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    summaryBox: {
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 6,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    summaryDate: {
        fontSize: 11,
    },
    choiceHeader: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 10,
    },
    optionCard: {
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: 12,
        lineHeight: 17,
    },
    backStepButton: {
        borderWidth: 1,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: "center",
        marginTop: 6,
    },
    backStepButtonText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
