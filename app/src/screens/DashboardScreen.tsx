import React, { useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useVault } from "../hooks/useVault";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";
import { IdentitySummary } from "../types/database";
import { SidebarDrawer } from "../components/SidebarDrawer";
import { ExportModal } from "../components/ExportModal";
import { ImportModal } from "../components/ImportModal";
import { SettingsModal } from "../components/SettingsModal";
import { HelpCenterModal } from "../components/HelpCenterModal";
import { SortModal } from "../components/SortModal";
import {
    getAppSettings,
    saveAppSettings,
    SortOrder,
} from "../utils/settingsStore";
import { deleteIdentitiesBatch } from "../db";
import { authenticateWithBiometrics } from "../utils/biometrics";

type NavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    "Dashboard"
>;

export function DashboardScreen({
    navigation,
}: {
    navigation: NavigationProp;
}) {
    const { identities, lockVault, dek, refreshIdentities } = useVault();
    const { colors } = useTheme();

    const [search, setSearch] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Pinning and sorting
    const [pinnedIdentities, setPinnedIdentities] = useState<string[]>([]);
    const [sortOrder, setSortOrder] = useState<SortOrder>("name_asc");
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    // Multi-select batch deletion
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIdentities, setSelectedIdentities] = useState<Set<string>>(
        new Set(),
    );

    const styles = useMemo(() => createStyles(colors), [colors]);

    useFocusEffect(
        useCallback(() => {
            void loadSettings();
            void refreshIdentities();
        }, []),
    );

    async function loadSettings() {
        try {
            const settings = await getAppSettings();
            setPinnedIdentities(settings.pinnedIdentities || []);
            setSortOrder(settings.identitySortOrder || "name_asc");
        } catch {
            // Keep current
        }
    }

    async function handleSortOrderChange(newSort: SortOrder) {
        setSortOrder(newSort);
        await saveAppSettings({ identitySortOrder: newSort });
    }

    async function handleTogglePinIdentity(identity: string) {
        const isPinned = pinnedIdentities.includes(identity);
        const next = isPinned
            ? pinnedIdentities.filter((id) => id !== identity)
            : [...pinnedIdentities, identity];
        setPinnedIdentities(next);
        await saveAppSettings({ pinnedIdentities: next });
    }

    function toggleSelectIdentity(identity: string) {
        setSelectedIdentities((prev) => {
            const next = new Set(prev);
            if (next.has(identity)) {
                next.delete(identity);
            } else {
                next.add(identity);
            }
            return next;
        });
    }

    const sortedAndFiltered = useMemo(() => {
        const filtered = identities.filter((item) =>
            item.identity.toLowerCase().includes(search.toLowerCase()),
        );

        return filtered.sort((a, b) => {
            const aPinned = pinnedIdentities.includes(a.identity) ? 1 : 0;
            const bPinned = pinnedIdentities.includes(b.identity) ? 1 : 0;
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }

            switch (sortOrder) {
                case "name_asc":
                    return a.identity.localeCompare(b.identity, undefined, {
                        sensitivity: "base",
                    });
                case "name_desc":
                    return b.identity.localeCompare(a.identity, undefined, {
                        sensitivity: "base",
                    });
                case "date_desc":
                    return (
                        (b.latest_updated_at || 0) - (a.latest_updated_at || 0)
                    );
                case "date_asc":
                    return (
                        (a.latest_updated_at || 0) - (b.latest_updated_at || 0)
                    );
                default:
                    return 0;
            }
        });
    }, [identities, search, pinnedIdentities, sortOrder]);

    function handleToggleSelectAll() {
        if (selectedIdentities.size === sortedAndFiltered.length) {
            setSelectedIdentities(new Set());
        } else {
            setSelectedIdentities(
                new Set(sortedAndFiltered.map((i) => i.identity)),
            );
        }
    }

    async function handleDeleteBatchIdentities() {
        if (selectedIdentities.size === 0) return;

        const count = selectedIdentities.size;
        Alert.alert(
            "Confirm Batch Delete",
            `Are you sure you want to delete ${count} selected ${
                count === 1 ? "account" : "accounts"
            } and all associated credentials? A local rotational backup snapshot will be preserved.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const verified = await authenticateWithBiometrics(
                            `Verify identity to delete ${count} accounts`,
                        );
                        if (!verified) return;

                        try {
                            await deleteIdentitiesBatch(
                                Array.from(selectedIdentities),
                            );

                            const remainingPinned = pinnedIdentities.filter(
                                (id) => !selectedIdentities.has(id),
                            );
                            if (
                                remainingPinned.length !==
                                pinnedIdentities.length
                            ) {
                                setPinnedIdentities(remainingPinned);
                                await saveAppSettings({
                                    pinnedIdentities: remainingPinned,
                                });
                            }

                            setSelectedIdentities(new Set());
                            setIsSelectionMode(false);
                            await refreshIdentities();
                        } catch {
                            Alert.alert("Error", "Failed to delete accounts.");
                        }
                    },
                },
            ],
        );
    }

    function renderItem({ item }: { item: IdentitySummary }) {
        const isPinned = pinnedIdentities.includes(item.identity);
        const isSelected = selectedIdentities.has(item.identity);

        return (
            <TouchableOpacity
                activeOpacity={isSelectionMode ? 0.7 : 0.8}
                style={[
                    styles.card,
                    isPinned && styles.cardPinned,
                    isSelected && styles.cardSelected,
                ]}
                onPress={() => {
                    if (isSelectionMode) {
                        toggleSelectIdentity(item.identity);
                    } else {
                        navigation.navigate("LabelVault", {
                            identity: item.identity,
                        });
                    }
                }}
                onLongPress={() => {
                    if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        setSelectedIdentities(new Set([item.identity]));
                    }
                }}
            >
                <View style={styles.cardLeft}>
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
                    <View style={styles.identityContainer}>
                        <Text style={styles.identityText} numberOfLines={1}>
                            {item.identity}
                        </Text>
                        {isPinned && (
                            <View style={styles.pinnedBadge}>
                                <Text style={styles.pinnedBadgeText}>
                                    PINNED
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardRight}>
                    {!isSelectionMode && (
                        <TouchableOpacity
                            style={[
                                styles.pinButton,
                                isPinned && styles.pinButtonActive,
                            ]}
                            onPress={() =>
                                handleTogglePinIdentity(item.identity)
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

                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.item_count}</Text>
                    </View>

                    {!isSelectionMode && (
                        <Text style={styles.chevron}>{">"}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {isSelectionMode ? (
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            setIsSelectionMode(false);
                            setSelectedIdentities(new Set());
                        }}
                        style={styles.cancelSelectButton}
                    >
                        <Text style={styles.cancelSelectButtonText}>
                            Cancel
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        {selectedIdentities.size} Selected
                    </Text>

                    <TouchableOpacity
                        onPress={handleToggleSelectAll}
                        style={styles.headerActionButton}
                    >
                        <Text style={styles.headerActionButtonText}>
                            {selectedIdentities.size ===
                            sortedAndFiltered.length
                                ? "Deselect"
                                : "All"}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>SafeVault</Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() =>
                                navigation.navigate("AddEditModal", {})
                            }
                        >
                            <Text style={styles.addButtonText}>+ Add</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.lockButton}
                            onPress={() => lockVault()}
                        >
                            <Text style={styles.lockButtonText}>Lock</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => setIsSidebarOpen(true)}
                            accessibilityLabel="Open menu"
                        >
                            <View style={styles.hamburgerBar} />
                            <View style={styles.hamburgerBar} />
                            <View style={styles.hamburgerBar} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.controlsRow}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Filter accounts..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />

                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setIsSortModalOpen(true)}
                >
                    <Text style={styles.controlButtonText}>Sort</Text>
                </TouchableOpacity>

                {!isSelectionMode && (
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => setIsSelectionMode(true)}
                    >
                        <Text style={styles.controlButtonText}>Select</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={sortedAndFiltered}
                keyExtractor={(item) => item.identity}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    isSelectionMode &&
                        selectedIdentities.size > 0 && {
                            paddingBottom: 80,
                        },
                ]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            No accounts stored.
                        </Text>
                        <Text style={styles.emptySubText}>
                            Tap '+ Add' to store your first password.
                        </Text>
                    </View>
                }
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
                            selectedIdentities.size === 0 &&
                                styles.deleteBatchButtonDisabled,
                        ]}
                        disabled={selectedIdentities.size === 0}
                        onPress={handleDeleteBatchIdentities}
                    >
                        <Text style={styles.deleteBatchButtonText}>
                            Delete Selected ({selectedIdentities.size})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <SortModal
                visible={isSortModalOpen}
                onClose={() => setIsSortModalOpen(false)}
                currentSort={sortOrder}
                onSelectSort={handleSortOrderChange}
                title="Sort Accounts"
            />

            {/* Sidebar Drawer Component */}
            <SidebarDrawer
                visible={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onExportPress={() => setIsExportOpen(true)}
                onImportPress={() => setIsImportOpen(true)}
                onSettingsPress={() => setIsSettingsOpen(true)}
                onHelpPress={() => setIsHelpOpen(true)}
            />

            {/* Export Modal */}
            <ExportModal
                visible={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                dek={dek}
            />

            {/* Import Modal */}
            <ImportModal
                visible={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                dek={dek}
                onSuccess={() => {
                    void refreshIdentities();
                }}
            />

            {/* Settings Modal */}
            <SettingsModal
                visible={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onVaultStateChanged={() => {
                    void refreshIdentities();
                }}
            />

            {/* Help & Guide Modal */}
            <HelpCenterModal
                visible={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            color: colors.textPrimary,
        },
        headerButtons: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        cancelSelectButton: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 6,
        },
        cancelSelectButtonText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: "600",
        },
        headerActionButton: {
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 6,
        },
        headerActionButtonText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
        },
        addButton: {
            backgroundColor: colors.primary,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 6,
        },
        addButtonText: {
            color: colors.background,
            fontWeight: "700",
            fontSize: 14,
        },
        lockButton: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 6,
        },
        lockButtonText: {
            color: colors.textSecondary,
            fontSize: 14,
        },
        menuButton: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: 6,
            justifyContent: "center",
            alignItems: "center",
            gap: 3,
        },
        hamburgerBar: {
            width: 16,
            height: 2,
            backgroundColor: colors.textPrimary,
            borderRadius: 1,
        },
        controlsRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
        },
        searchBar: {
            flex: 1,
            backgroundColor: colors.inputBackground,
            borderColor: colors.surfaceBorder,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.textPrimary,
            fontSize: 15,
        },
        controlButton: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.surfaceBorder,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            justifyContent: "center",
            alignItems: "center",
        },
        controlButtonText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
        },
        listContent: {
            paddingBottom: 24,
        },
        card: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.surfaceBorder,
            borderWidth: 1,
            borderRadius: 8,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
        },
        cardPinned: {
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
        },
        cardSelected: {
            borderColor: colors.primary,
            backgroundColor: colors.surface,
        },
        cardLeft: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        identityContainer: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        identityText: {
            fontSize: 16,
            fontWeight: "600",
            color: colors.textPrimary,
            flexShrink: 1,
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
        cardRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
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
        badge: {
            backgroundColor: colors.inputBackground,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
        },
        badgeText: {
            color: colors.accent,
            fontSize: 13,
            fontWeight: "700",
        },
        chevron: {
            color: colors.textMuted,
            fontSize: 18,
            fontWeight: "600",
        },
        emptyContainer: {
            alignItems: "center",
            justifyContent: "center",
            marginTop: 60,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 6,
        },
        emptySubText: {
            fontSize: 14,
            color: colors.textMuted,
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
