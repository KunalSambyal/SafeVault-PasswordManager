import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import {
    getAppSettings,
    saveAppSettings,
    AutoLockTimeout,
    ClipboardTimeout,
    AppSettings,
} from "../utils/settingsStore";
import {
    listRotationalBackups,
    performRotationalBackup,
    restoreRotationalBackup,
    BackupSlotInfo,
} from "../utils/rotationalBackup";
import { isBiometricsAvailable } from "../utils/biometrics";
import { getDatabase } from "../db/connection";

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onVaultStateChanged?: () => void;
}

const AUTO_LOCK_OPTIONS: { label: string; value: AutoLockTimeout }[] = [
    { label: "Immediate", value: 0 },
    { label: "1 min", value: 60 },
    { label: "5 min", value: 300 },
    { label: "15 min", value: 900 },
];

const CLIPBOARD_OPTIONS: { label: string; value: ClipboardTimeout }[] = [
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
];

export function SettingsModal({
    visible,
    onClose,
    onVaultStateChanged,
}: SettingsModalProps) {
    const { colors, theme, setTheme } = useTheme();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [hasBiometricsHardware, setHasBiometricsHardware] = useState(false);
    const [backups, setBackups] = useState<BackupSlotInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            void loadData();
        }
    }, [visible]);

    async function loadData() {
        setIsLoading(true);
        try {
            const currentSettings = await getAppSettings();
            setSettings(currentSettings);

            const bioAvailable = await isBiometricsAvailable();
            setHasBiometricsHardware(bioAvailable);

            const backupList = await listRotationalBackups();
            setBackups(backupList);
        } catch {
            // Keep current UI state
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAutoLockChange(timeout: AutoLockTimeout) {
        if (!settings) return;
        const updated = await saveAppSettings({ autoLockTimeout: timeout });
        setSettings(updated);
    }

    async function handleClipboardTimeoutChange(seconds: ClipboardTimeout) {
        if (!settings) return;
        const updated = await saveAppSettings({ clipboardTimeout: seconds });
        setSettings(updated);
    }

    async function handleBiometricsToggle(enabled: boolean) {
        if (!settings) return;
        try {
            const updated = await saveAppSettings({
                biometricsEnabled: enabled,
            });
            setSettings(updated);

            // Also synchronize with SQLite metadata
            const db = await getDatabase();
            await db.runAsync(
                "UPDATE vault_metadata SET is_biometric_enabled = ? WHERE id = 1;",
                [enabled ? 1 : 0],
            );
        } catch {
            Alert.alert(
                "Error",
                "Failed to update biometric unlock preference.",
            );
        }
    }

    async function handleThemeChange(newTheme: "dark" | "light") {
        await setTheme(newTheme);
        if (settings) {
            setSettings({ ...settings, theme: newTheme });
        }
    }

    async function handleCreateSnapshotNow() {
        setIsLoading(true);
        const ok = await performRotationalBackup();
        setIsLoading(false);
        if (ok) {
            const updated = await listRotationalBackups();
            setBackups(updated);
            Alert.alert("Success", "Local rotational snapshot created.");
        } else {
            Alert.alert("Error", "Failed to create rotational snapshot.");
        }
    }

    async function handleRestoreSlot(slot: "v1" | "v2" | "v3") {
        Alert.alert(
            "Restore Snapshot",
            `Are you sure you want to restore snapshot ${slot.toUpperCase()}? Current state will be backed up before restoration.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Restore",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await restoreRotationalBackup(slot);
                            const updated = await listRotationalBackups();
                            setBackups(updated);
                            if (onVaultStateChanged) {
                                onVaultStateChanged();
                            }
                            Alert.alert(
                                "Restored",
                                `Database restored to snapshot ${slot.toUpperCase()}.`,
                            );
                        } catch (err: any) {
                            Alert.alert(
                                "Error",
                                err?.message || "Failed to restore snapshot.",
                            );
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ],
        );
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
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
                            Vault Settings
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
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
                        {isLoading && !settings ? (
                            <ActivityIndicator
                                size="large"
                                color={colors.primary}
                                style={{ marginVertical: 30 }}
                            />
                        ) : (
                            <>
                                {/* 1. Appearance Section */}
                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: colors.textMuted },
                                        ]}
                                    >
                                        APPEARANCE
                                    </Text>
                                    <View
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor:
                                                    colors.cardBackground,
                                                borderColor:
                                                    colors.surfaceBorder,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.rowLabel,
                                                { color: colors.textPrimary },
                                            ]}
                                        >
                                            Theme Mode
                                        </Text>
                                        <View style={styles.segmentedControl}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.segmentButton,
                                                    theme === "dark" && {
                                                        backgroundColor:
                                                            colors.primary,
                                                    },
                                                ]}
                                                onPress={() =>
                                                    handleThemeChange("dark")
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.segmentText,
                                                        theme === "dark"
                                                            ? {
                                                                  color: colors.background,
                                                                  fontWeight:
                                                                      "700",
                                                              }
                                                            : {
                                                                  color: colors.textSecondary,
                                                              },
                                                    ]}
                                                >
                                                    Dark
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.segmentButton,
                                                    theme === "light" && {
                                                        backgroundColor:
                                                            colors.primary,
                                                    },
                                                ]}
                                                onPress={() =>
                                                    handleThemeChange("light")
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.segmentText,
                                                        theme === "light"
                                                            ? {
                                                                  color: colors.background,
                                                                  fontWeight:
                                                                      "700",
                                                              }
                                                            : {
                                                                  color: colors.textSecondary,
                                                              },
                                                    ]}
                                                >
                                                    Light
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {/* 2. Security Section */}
                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: colors.textMuted },
                                        ]}
                                    >
                                        SECURITY PREFERENCES
                                    </Text>

                                    {/* Auto-Lock */}
                                    <View
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor:
                                                    colors.cardBackground,
                                                borderColor:
                                                    colors.surfaceBorder,
                                                marginBottom: 10,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.rowLabel,
                                                { color: colors.textPrimary },
                                            ]}
                                        >
                                            Auto-Lock on Background
                                        </Text>
                                        <Text
                                            style={[
                                                styles.rowHint,
                                                { color: colors.textSecondary },
                                            ]}
                                        >
                                            Locks vault after app is switched or
                                            idle
                                        </Text>
                                        <View style={styles.optionsRow}>
                                            {AUTO_LOCK_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[
                                                        styles.optionPill,
                                                        {
                                                            borderColor:
                                                                colors.surfaceBorder,
                                                            backgroundColor:
                                                                settings?.autoLockTimeout ===
                                                                opt.value
                                                                    ? colors.primary
                                                                    : colors.inputBackground,
                                                        },
                                                    ]}
                                                    onPress={() =>
                                                        handleAutoLockChange(
                                                            opt.value,
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.optionPillText,
                                                            settings?.autoLockTimeout ===
                                                            opt.value
                                                                ? {
                                                                      color: colors.background,
                                                                      fontWeight:
                                                                          "700",
                                                                  }
                                                                : {
                                                                      color: colors.textSecondary,
                                                                  },
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Clipboard Wipe */}
                                    <View
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor:
                                                    colors.cardBackground,
                                                borderColor:
                                                    colors.surfaceBorder,
                                                marginBottom: 10,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.rowLabel,
                                                { color: colors.textPrimary },
                                            ]}
                                        >
                                            Clipboard Scrub Timer
                                        </Text>
                                        <Text
                                            style={[
                                                styles.rowHint,
                                                { color: colors.textSecondary },
                                            ]}
                                        >
                                            Clears copied passwords from memory
                                        </Text>
                                        <View style={styles.optionsRow}>
                                            {CLIPBOARD_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[
                                                        styles.optionPill,
                                                        {
                                                            borderColor:
                                                                colors.surfaceBorder,
                                                            backgroundColor:
                                                                settings?.clipboardTimeout ===
                                                                opt.value
                                                                    ? colors.primary
                                                                    : colors.inputBackground,
                                                        },
                                                    ]}
                                                    onPress={() =>
                                                        handleClipboardTimeoutChange(
                                                            opt.value,
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.optionPillText,
                                                            settings?.clipboardTimeout ===
                                                            opt.value
                                                                ? {
                                                                      color: colors.background,
                                                                      fontWeight:
                                                                          "700",
                                                                  }
                                                                : {
                                                                      color: colors.textSecondary,
                                                                  },
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Biometrics Toggle */}
                                    {hasBiometricsHardware && (
                                        <View
                                            style={[
                                                styles.card,
                                                styles.switchRow,
                                                {
                                                    backgroundColor:
                                                        colors.cardBackground,
                                                    borderColor:
                                                        colors.surfaceBorder,
                                                },
                                            ]}
                                        >
                                            <View style={{ flex: 1, paddingRight: 10 }}>
                                                <Text
                                                    style={[
                                                        styles.rowLabel,
                                                        {
                                                            color: colors.textPrimary,
                                                        },
                                                    ]}
                                                >
                                                    Biometric Quick Unlock
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.rowHint,
                                                        {
                                                            color: colors.textSecondary,
                                                        },
                                                    ]}
                                                >
                                                    Allow fingerprint or device PIN
                                                    on startup
                                                </Text>
                                            </View>
                                            <Switch
                                                value={
                                                    settings?.biometricsEnabled ??
                                                    true
                                                }
                                                onValueChange={
                                                    handleBiometricsToggle
                                                }
                                                trackColor={{
                                                    false: colors.surfaceBorder,
                                                    true: colors.primary,
                                                }}
                                                thumbColor={colors.background}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* 3. GFS Rotational Backups */}
                                <View style={styles.section}>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 6,
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.sectionTitle,
                                                {
                                                    color: colors.textMuted,
                                                    marginBottom: 0,
                                                },
                                            ]}
                                        >
                                            ROTATIONAL BACKUPS (GFS)
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleCreateSnapshotNow}
                                        >
                                            <Text
                                                style={[
                                                    styles.snapshotLink,
                                                    { color: colors.primary },
                                                ]}
                                            >
                                                + Snapshot Now
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text
                                        style={[
                                            styles.backupExplainer,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        SafeVault rotates local rolling snapshots
                                        prior to any database mutation:
                                    </Text>

                                    {backups.map((b) => (
                                        <View
                                            key={b.slot}
                                            style={[
                                                styles.backupSlotCard,
                                                {
                                                    backgroundColor:
                                                        colors.cardBackground,
                                                    borderColor:
                                                        colors.surfaceBorder,
                                                },
                                            ]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.slotTitle,
                                                        {
                                                            color: colors.textPrimary,
                                                        },
                                                    ]}
                                                >
                                                    Slot {b.slot.toUpperCase()} (
                                                    {b.fileName})
                                                </Text>
                                                {b.exists ? (
                                                    <Text
                                                        style={[
                                                            styles.slotDetails,
                                                            {
                                                                color: colors.textMuted,
                                                            },
                                                        ]}
                                                    >
                                                        {b.credentialCount} items
                                                        •{" "}
                                                        {b.timestamp
                                                            ? new Date(
                                                                  b.timestamp,
                                                              ).toLocaleDateString() +
                                                              " " +
                                                              new Date(
                                                                  b.timestamp,
                                                              ).toLocaleTimeString()
                                                            : "Stored"}
                                                    </Text>
                                                ) : (
                                                    <Text
                                                        style={[
                                                            styles.slotDetails,
                                                            {
                                                                color: colors.textMuted,
                                                            },
                                                        ]}
                                                    >
                                                        Empty snapshot slot
                                                    </Text>
                                                )}
                                            </View>

                                            {b.exists && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.restoreButton,
                                                        {
                                                            borderColor:
                                                                colors.surfaceBorder,
                                                        },
                                                    ]}
                                                    onPress={() =>
                                                        handleRestoreSlot(b.slot)
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.restoreButtonText,
                                                            {
                                                                color: colors.accent,
                                                            },
                                                        ]}
                                                    >
                                                        Restore
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
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
        padding: 16,
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
    section: {
        marginBottom: 22,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        marginBottom: 8,
        paddingLeft: 2,
    },
    card: {
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    rowHint: {
        fontSize: 11,
        marginBottom: 10,
    },
    optionsRow: {
        flexDirection: "row",
        gap: 8,
    },
    optionPill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    optionPillText: {
        fontSize: 12,
        fontWeight: "600",
    },
    segmentedControl: {
        flexDirection: "row",
        borderRadius: 6,
        padding: 2,
        marginTop: 8,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: "center",
    },
    segmentText: {
        fontSize: 12,
    },
    snapshotLink: {
        fontSize: 12,
        fontWeight: "600",
    },
    backupExplainer: {
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 10,
    },
    backupSlotCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    slotTitle: {
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 2,
    },
    slotDetails: {
        fontSize: 11,
    },
    restoreButton: {
        borderWidth: 1,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    restoreButtonText: {
        fontSize: 11,
        fontWeight: "600",
    },
});
