import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { generatePassword, generatePassphrase } from "../utils/generator";
import { colors } from "../theme/colors";

interface PasswordGeneratorModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyPassword: (password: string) => void;
}

export function PasswordGeneratorModal({
    visible,
    onClose,
    onApplyPassword,
}: PasswordGeneratorModalProps) {
    const [length, setLength] = useState(16);
    const [mode, setMode] = useState<"password" | "passphrase">("password");
    const [generated, setGenerated] = useState(() =>
        generatePassword({
            length: 16,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
        }),
    );

    function handleRegenerate() {
        if (mode === "passphrase") {
            setGenerated(generatePassphrase(4));
        } else {
            setGenerated(
                generatePassword({
                    length,
                    includeUppercase: true,
                    includeLowercase: true,
                    includeNumbers: true,
                    includeSymbols: true,
                }),
            );
        }
    }

    function handleSwitchMode(newMode: "password" | "passphrase") {
        setMode(newMode);
        if (newMode === "passphrase") {
            setGenerated(generatePassphrase(4));
        } else {
            setGenerated(
                generatePassword({
                    length,
                    includeUppercase: true,
                    includeLowercase: true,
                    includeNumbers: true,
                    includeSymbols: true,
                }),
            );
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <Text style={styles.title}>Password Generator</Text>

                    <View style={styles.modeTabs}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                mode === "password" && styles.activeTab,
                            ]}
                            onPress={() => handleSwitchMode("password")}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    mode === "password" && styles.activeTabText,
                                ]}
                            >
                                Complex
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                mode === "passphrase" && styles.activeTab,
                            ]}
                            onPress={() => handleSwitchMode("passphrase")}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    mode === "passphrase" &&
                                        styles.activeTabText,
                                ]}
                            >
                                Passphrase
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.previewContainer}>
                        <Text style={styles.previewText} selectable>
                            {generated}
                        </Text>
                    </View>

                    {mode === "password" ? (
                        <View style={styles.lengthRow}>
                            <Text style={styles.lengthLabel}>
                                Length: {length}
                            </Text>
                            <View style={styles.lengthButtons}>
                                {[12, 16, 20, 24].map((len) => (
                                    <TouchableOpacity
                                        key={len}
                                        style={[
                                            styles.lengthChip,
                                            length === len &&
                                                styles.lengthChipActive,
                                        ]}
                                        onPress={() => {
                                            setLength(len);
                                            setGenerated(
                                                generatePassword({
                                                    length: len,
                                                    includeUppercase: true,
                                                    includeLowercase: true,
                                                    includeNumbers: true,
                                                    includeSymbols: true,
                                                }),
                                            );
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.lengthChipText,
                                                length === len &&
                                                    styles.lengthChipTextActive,
                                            ]}
                                        >
                                            {len}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={styles.regenerateButton}
                        onPress={handleRegenerate}
                    >
                        <Text style={styles.regenerateButtonText}>
                            Regenerate
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => {
                                onApplyPassword(generated);
                                onClose();
                            }}
                        >
                            <Text style={styles.applyButtonText}>
                                Use Password
                            </Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 20,
    },
    modalCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.textPrimary,
        marginBottom: 16,
    },
    modeTabs: {
        flexDirection: "row",
        backgroundColor: colors.inputBackground,
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: "center",
    },
    activeTab: {
        backgroundColor: colors.surfaceBorder,
    },
    tabText: {
        color: colors.textSecondary,
        fontWeight: "600",
        fontSize: 14,
    },
    activeTabText: {
        color: colors.textPrimary,
    },
    previewContainer: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
    },
    previewText: {
        color: colors.primary,
        fontFamily: "monospace",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    lengthRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    lengthLabel: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    lengthButtons: {
        flexDirection: "row",
        gap: 8,
    },
    lengthChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    lengthChipActive: {
        borderColor: colors.primary,
        backgroundColor: colors.surfaceBorder,
    },
    lengthChipText: {
        color: colors.textSecondary,
        fontWeight: "600",
        fontSize: 13,
    },
    lengthChipTextActive: {
        color: colors.primary,
    },
    regenerateButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 16,
    },
    regenerateButtonText: {
        color: colors.accent,
        fontWeight: "700",
        fontSize: 14,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: "center",
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontWeight: "600",
        fontSize: 15,
    },
    applyButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    applyButtonText: {
        color: colors.background,
        fontWeight: "700",
        fontSize: 15,
    },
});
