import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
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

    const styles = useMemo(() => createStyles(colors), [colors]);

    const filtered = identities.filter((item) =>
        item.identity.toLowerCase().includes(search.toLowerCase()),
    );

    function renderItem({ item }: { item: IdentitySummary }) {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate("LabelVault", {
                        identity: item.identity,
                    })
                }
            >
                <View style={styles.cardLeft}>
                    <Text style={styles.identityText}>{item.identity}</Text>
                </View>
                <View style={styles.cardRight}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.item_count}</Text>
                    </View>
                    <Text style={styles.chevron}>{">"}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>SafeVault</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate("AddEditModal", {})}
                    >
                        <Text style={styles.addButtonText}>+ Add</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.lockButton}
                        onPress={() => lockVault()}
                    >
                        <Text style={styles.lockButtonText}>Lock</Text>
                    </TouchableOpacity>

                    {/* Hamburger 3-line Menu Button */}
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

            <TextInput
                style={styles.searchBar}
                placeholder="Filter accounts..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.identity}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
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
        searchBar: {
            backgroundColor: colors.inputBackground,
            borderColor: colors.surfaceBorder,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.textPrimary,
            fontSize: 15,
            marginBottom: 16,
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
        cardLeft: {
            flex: 1,
        },
        identityText: {
            fontSize: 17,
            fontWeight: "600",
            color: colors.textPrimary,
        },
        cardRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
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
    });
}
