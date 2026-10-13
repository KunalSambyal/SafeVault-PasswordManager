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
import { exportVaultMigration } from "../utils/migrationService";

interface ExportModalProps {
    visible: boolean;
    onClose: () => void;
    dek: Uint8Array | null;
}

export function ExportModal({ visible, onClose, dek }: ExportModalProps) {
    const { colors } = useTheme();
    const [backupPassword, setBackupPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function handleReset() {
        setBackupPassword("");
        setConfirmPassword("");
        setErrorMessage("");
        setIsLoading(false);
    }

    function handleClose() {
        handleReset();
        onClose();
    }

    async function handleExport() {
        setErrorMessage("");

        if (!dek) {
            setErrorMessage("Vault is locked or decryption key is unavailable.");
            return;
        }

        if (backupPassword.length < 8) {
            setErrorMessage("Backup password must be at least 8 characters.");
            return;
        }

        if (backupPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        // Run asynchronously so UI reflects loader
        setTimeout(async () => {
            try {
                const result = await exportVaultMigration(backupPassword, dek);
                setIsLoading(false);
                handleClose();
                Alert.alert(
                    "Export Successful",
                    `Exported ${result.count} credentials into an AES-256-GCM encrypted backup container.`,
                );
            } catch (err: any) {
                setIsLoading(false);
                setErrorMessage(err?.message || "Failed to export vault backup.");
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
                            Export Encrypted Vault
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
                                [X]
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text
                            style={[
                                styles.description,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Create a portable AES-256-GCM encrypted JSON migration
                            container. You will need this Backup Password to
                            decrypt and restore your credentials on another
                            device.
                        </Text>

                        {errorMessage ? (
                            <Text
                                style={[
                                    styles.errorBanner,
                                    {
                                        color: colors.danger,
                                        backgroundColor: colors.dangerBackground,
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
                            Backup Password (min 8 characters)
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.surfaceBorder,
                                    color: colors.textPrimary,
                                },
                            ]}
                            placeholder="Enter a strong backup password"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={backupPassword}
                            onChangeText={(val) => {
                                setBackupPassword(val);
                                if (errorMessage) setErrorMessage("");
                            }}
                        />

                        <Text
                            style={[
                                styles.inputLabel,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Confirm Backup Password
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: colors.surfaceBorder,
                                    color: colors.textPrimary,
                                },
                            ]}
                            placeholder="Confirm backup password"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={(val) => {
                                setConfirmPassword(val);
                                if (errorMessage) setErrorMessage("");
                            }}
                        />

                        <View
                            style={[
                                styles.noticeBox,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.surfaceBorder,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.noticeTitle,
                                    { color: colors.primary },
                                ]}
                            >
                                Zero-Knowledge Isolation
                            </Text>
                            <Text
                                style={[
                                    styles.noticeText,
                                    { color: colors.textMuted },
                                ]}
                            >
                                SafeVault does not have access to your Backup
                                Password. If you forget this password, the
                                exported backup file cannot be recovered.
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[
                                    styles.cancelButton,
                                    {
                                        backgroundColor: colors.cardBackground,
                                        borderColor: colors.surfaceBorder,
                                    },
                                ]}
                                onPress={handleClose}
                                disabled={isLoading}
                            >
                                <Text
                                    style={[
                                        styles.cancelButtonText,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    { backgroundColor: colors.primary },
                                    isLoading && styles.buttonDisabled,
                                ]}
                                onPress={handleExport}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator
                                        color={colors.background}
                                    />
                                ) : (
                                    <Text
                                        style={[
                                            styles.submitButtonText,
                                            { color: colors.background },
                                        ]}
                                    >
                                        Export File
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
        fontSize: 14,
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
        marginBottom: 12,
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
        marginBottom: 14,
    },
    noticeBox: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 18,
    },
    noticeTitle: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 4,
    },
    noticeText: {
        fontSize: 11,
        lineHeight: 16,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "flex-end",
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },
    submitButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 110,
    },
    submitButtonText: {
        fontSize: 13,
        fontWeight: "700",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
