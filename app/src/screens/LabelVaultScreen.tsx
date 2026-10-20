import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useVault } from "../hooks/useVault";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";
import {
    getCredentialsByIdentity,
    deleteCredential,
    toggleCredentialPin,
    deleteCredentialsBatch,
} from "../db";
import { decryptAESGCM } from "../crypto";
import { authenticateWithBiometrics } from "../utils/biometrics";
import { copyToClipboard } from "../utils/clipboard";
import {
    getAppSettings,
    saveAppSettings,
    SortOrder,
} from "../utils/settingsStore";
import { SortModal } from "../components/SortModal";
import { CredentialRecord } from "../types/database";
import { RootStackParamList } from "../types/navigation";

type RouteProps = RouteProp<RootStackParamList, "LabelVault">;
type NavProps = NativeStackNavigationProp<RootStackParamList, "LabelVault">;

export function LabelVaultScreen({
    route,
    navigation,
}: {
    route: RouteProps;
    navigation: NavProps;
}) {
    const { identity } = route.params;
    const { dek, refreshIdentities } = useVault();
    const { colors } = useTheme();

    const [items, setItems] = useState<CredentialRecord[]>([]);
    const [revealedPasswords, setRevealedPasswords] = useState<{
        [id: number]: string;
    }>({});
    const [timers, setTimers] = useState<{ [id: number]: number }>({});

    // Selection mode state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Sort order state
    const [sortOrder, setSortOrder] = useState<SortOrder>("name_asc");
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    useFocusEffect(
        useCallback(() => {
            void loadInitialSettings();
            void loadItems();
            setRevealedPasswords({});
            setTimers({});
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }, [identity]),
    );

    async function loadInitialSettings() {
        try {
            const settings = await getAppSettings();
            setSortOrder(settings.credentialSortOrder || "name_asc");
        } catch {
            // Keep default
        }
    }

    async function handleSortOrderChange(newSort: SortOrder) {
        setSortOrder(newSort);
        await saveAppSettings({ credentialSortOrder: newSort });
    }

    useEffect(() => {
        const interval = setInterval(() => {
            setTimers((prev) => {
                const next = { ...prev };
                let changed = false;

                Object.keys(next).forEach((key) => {
                    const id = Number(key);
                    if (next[id] > 1) {
                        next[id] -= 1;
                        changed = true;
                    } else if (next[id] === 1) {
                        delete next[id];
                        setRevealedPasswords((r) => {
                            const updated = { ...r };
                            delete updated[id];
                            return updated;
                        });
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    async function loadItems() {
        try {
            const list = await getCredentialsByIdentity(identity);
            setItems(list);
            if (list.length === 0) {
                await refreshIdentities();
                navigation.goBack();
            }
        } catch {
            Alert.alert("Error", "Failed to load credentials.");
        }
    }

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const aPinned = a.is_pinned ? 1 : 0;
            const bPinned = b.is_pinned ? 1 : 0;
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }

            switch (sortOrder) {
                case "name_asc":
                    return a.label.localeCompare(b.label, undefined, {
                        sensitivity: "base",
                    });
                case "name_desc":
                    return b.label.localeCompare(a.label, undefined, {
                        sensitivity: "base",
                    });
                case "date_desc":
                    return (
                        (b.updated_at || b.created_at || 0) -
                        (a.updated_at || a.created_at || 0)
                    );
                case "date_asc":
                    return (
                        (a.updated_at || a.created_at || 0) -
                        (b.updated_at || b.created_at || 0)
                    );
                default:
                    return 0;
            }
        });
    }, [items, sortOrder]);

    async function handleTogglePin(id: number, currentPinned: boolean) {
        try {
            await toggleCredentialPin(id, !currentPinned);
            await loadItems();
        } catch {
            Alert.alert("Error", "Failed to update pin status.");
        }
    }

    function toggleSelection(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function handleToggleSelectAll() {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((i) => i.id)));
        }
    }

    async function handleViewPassword(item: CredentialRecord) {
        if (!dek) return;

        if (revealedPasswords[item.id]) {
            setRevealedPasswords((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            setTimers((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            return;
        }

        const verified = await authenticateWithBiometrics(
            `Verify identity to view ${item.label}`,
        );
        if (!verified) return;

        try {
            const plaintext = decryptAESGCM(
                {
                    ciphertext: item.encrypted_password,
                    iv: item.iv,
                    tag: item.auth_tag,
                },
                dek,
            );

            setRevealedPasswords((prev) => ({ ...prev, [item.id]: plaintext }));
            setTimers((prev) => ({ ...prev, [item.id]: 30 }));
        } catch {
            Alert.alert(
                "Decryption Error",
                "Failed to decrypt credential payload.",
            );
        }
    }

    async function handleCopyPassword(item: CredentialRecord) {
        if (!dek) return;

        try {
            const settings = await getAppSettings();
            if (settings.requireBiometricForCopy) {
                const verified = await authenticateWithBiometrics(
                    `Verify identity to copy ${item.label}`,
                );
                if (!verified) return;
            }

            const plaintext = decryptAESGCM(
                {
                    ciphertext: item.encrypted_password,
                    iv: item.iv,
                    tag: item.auth_tag,
                },
                dek,
            );

            await copyToClipboard(plaintext);
            Alert.alert("Copied", "Password copied to clipboard.");
        } catch {
            Alert.alert("Error", "Failed to copy password.");
        }
    }

    async function handleEdit(item: CredentialRecord) {
        const verified = await authenticateWithBiometrics(
            `Verify identity to edit ${item.label}`,
        );
        if (!verified) return;

        navigation.navigate("AddEditModal", {
            identity: item.identity,
            credentialId: item.id,
            initialLabel: item.label,
        });
    }

    async function handleDelete(id: number, labelName: string) {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete ${labelName}? A local rotational backup snapshot will be preserved.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const verified = await authenticateWithBiometrics(
                            `Verify identity to delete ${labelName}`,
                        );
                        if (!verified) return;

                        try {
                            await deleteCredential(id);
                            await refreshIdentities();
                            await loadItems();
                        } catch {
                            Alert.alert(
                                "Error",
                                "Failed to delete credential.",
                            );
                        }
                    },
                },
            ],
        );
    }

    async function handleDeleteBatch() {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        Alert.alert(
            "Confirm Batch Delete",
            `Are you sure you want to delete ${count} selected ${
                count === 1 ? "credential" : "credentials"
            }? A local rotational backup snapshot will be preserved.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const verified = await authenticateWithBiometrics(
                            `Verify identity to delete ${count} credentials`,
                        );
                        if (!verified) return;

                        try {
                            await deleteCredentialsBatch(
                                Array.from(selectedIds),
                            );
                            setSelectedIds(new Set());
                            setIsSelectionMode(false);
                            await refreshIdentities();
                            await loadItems();
                        } catch {
                            Alert.alert(
                                "Error",
                                "Failed to delete selected credentials.",
                            );
                        }
                    },
                },
            ],
        );
    }

    function renderCard({ item }: { item: CredentialRecord }) {
        const isRevealed = !!revealedPasswords[item.id];
        const remaining = timers[item.id];
        const isSelected = selectedIds.has(item.id);
        const isPinned = item.is_pinned === 1;

        return (
            <TouchableOpacity
                activeOpacity={isSelectionMode ? 0.7 : 1}
                style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    isPinned && styles.cardPinned,
                ]}
                onPress={() => {
                    if (isSelectionMode) {
                        toggleSelection(item.id);
                    }
                }}
                onLongPress={() => {
                    if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        setSelectedIds(new Set([item.id]));
                    }
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        {isSelectionMode && (
                            <View
                                style={[
                                    styles.checkbox,
                                    isSelected && styles.checkboxSelected,
                                ]}
                            >
                                {isSelected && (
                                    <View style={styles.checkboxIndicator} />
                                )}
                            </View>
                        )}
                        <Text style={styles.cardLabel}>{item.label}</Text>
                        {isPinned && (
                            <View style={styles.pinnedBadge}>
                                <Text style={styles.pinnedBadgeText}>
                                    PINNED
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.cardHeaderRight}>
                        {isRevealed && remaining !== undefined && (
                            <Text style={styles.timerBadge}>{remaining}s</Text>
                        )}
                        {!isSelectionMode && (
                            <TouchableOpacity
                                style={[
                                    styles.pinButton,
                                    isPinned && styles.pinButtonActive,
                                ]}
                                onPress={() =>
                                    handleTogglePin(item.id, isPinned)
                                }
                            >
                                <Text
                                    style={[
                                        styles.pinButtonText,
                                        isPinned && styles.pinButtonTextActive,
                                    ]}
                                >
                                    {isPinned ? "Unpin" : "Pin"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.passwordContainer}>
                    <Text style={styles.passwordText}>
                        {isRevealed
                            ? revealedPasswords[item.id]
                            : "••••••••••••"}
                    </Text>
                </View>

                {!isSelectionMode && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleViewPassword(item)}
                        >
                            <Text style={styles.actionText}>
                                {isRevealed ? "Hide" : "View"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCopyPassword(item)}
                        >
                            <Text style={styles.actionText}>Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEdit(item)}
                        >
                            <Text style={styles.actionText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item.id, item.label)}
                        >
                            <Text
                                style={[styles.actionText, styles.deleteText]}
                            >
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (isSelectionMode) {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                        } else {
                            navigation.goBack();
                        }
                    }}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>
                        {isSelectionMode ? "Cancel" : "< Back"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle} numberOfLines={1}>
                    {isSelectionMode
                        ? `${selectedIds.size} Selected`
                        : identity}
                </Text>

                <View style={styles.headerButtons}>
                    {!isSelectionMode ? (
                        <>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => setIsSortModalOpen(true)}
                            >
                                <Text style={styles.headerButtonText}>
                                    Sort
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => setIsSelectionMode(true)}
                            >
                                <Text style={styles.headerButtonText}>
                                    Select
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleToggleSelectAll}
                        >
                            <Text style={styles.headerButtonText}>
                                {selectedIds.size === items.length
                                    ? "Deselect"
                                    : "All"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={sortedItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCard}
                contentContainerStyle={[
                    styles.listContent,
                    isSelectionMode && selectedIds.size > 0 && { paddingBottom: 80 },
                ]}
            />

            {isSelectionMode && (
                <View
                    style={[
                        styles.bottomActionBar,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.surfaceBorder,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.deleteBatchButton,
                            selectedIds.size === 0 &&
                                styles.deleteBatchButtonDisabled,
                        ]}
                        disabled={selectedIds.size === 0}
                        onPress={handleDeleteBatch}
                    >
                        <Text style={styles.deleteBatchButtonText}>
                            Delete Selected ({selectedIds.size})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <SortModal
                visible={isSortModalOpen}
                onClose={() => setIsSortModalOpen(false)}
                currentSort={sortOrder}
                onSelectSort={handleSortOrderChange}
                title="Sort Credentials"
            />
        </View>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingTop: 48,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 10,
        },
        backButton: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 6,
        },
        backButtonText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: "600",
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: "700",
            color: colors.textPrimary,
            flex: 1,
        },
        headerButtons: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        headerButton: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 6,
        },
        headerButtonText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
        },
        listContent: {
            paddingBottom: 24,
        },
        card: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
        },
        cardSelected: {
            borderColor: colors.primary,
            backgroundColor: colors.surface,
        },
        cardPinned: {
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
        },
        cardHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
        },
        cardHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
        },
        cardHeaderRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        cardLabel: {
            fontSize: 17,
            fontWeight: "700",
            color: colors.textPrimary,
        },
        pinnedBadge: {
            backgroundColor: colors.primary,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        pinnedBadgeText: {
            color: colors.background,
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 0.5,
        },
        pinButton: {
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.inputBackground,
        },
        pinButtonActive: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.primary,
        },
        pinButtonText: {
            fontSize: 11,
            fontWeight: "600",
            color: colors.textMuted,
        },
        pinButtonTextActive: {
            color: colors.primary,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: colors.textMuted,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.inputBackground,
        },
        checkboxSelected: {
            borderColor: colors.primary,
        },
        checkboxIndicator: {
            width: 10,
            height: 10,
            borderRadius: 2,
            backgroundColor: colors.primary,
        },
        timerBadge: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        passwordContainer: {
            backgroundColor: colors.inputBackground,
            borderRadius: 6,
            padding: 12,
            marginBottom: 14,
        },
        passwordText: {
            color: colors.textPrimary,
            fontFamily: "monospace",
            fontSize: 15,
        },
        cardActions: {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 6,
        },
        actionButton: {
            flex: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
        },
        actionText: {
            color: colors.textPrimary,
            fontWeight: "600",
            fontSize: 12,
        },
        deleteButton: {
            borderColor: colors.dangerBackground,
        },
        deleteText: {
            color: colors.danger,
        },
        bottomActionBar: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
        },
        deleteBatchButton: {
            backgroundColor: colors.danger,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
        },
        deleteBatchButtonDisabled: {
            opacity: 0.4,
        },
        deleteBatchButtonText: {
            color: "#ffffff",
            fontSize: 15,
            fontWeight: "700",
        },
    });
}
