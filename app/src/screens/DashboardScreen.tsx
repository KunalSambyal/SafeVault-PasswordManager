import React, { useState } from "react";
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
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";
import { IdentitySummary } from "../types/database";

type NavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    "Dashboard"
>;

export function DashboardScreen({
    navigation,
}: {
    navigation: NavigationProp;
}) {
    const { identities, lockVault } = useVault();
    const [search, setSearch] = useState("");

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
        </View>
    );
}

const styles = StyleSheet.create({
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
    searchBar: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 8,
        color: colors.textPrimary,
        padding: 12,
        marginBottom: 16,
        fontSize: 15,
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    cardLeft: {
        flex: 1,
    },
    identityText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.textPrimary,
    },
    cardRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    badge: {
        backgroundColor: colors.surfaceBorder,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "700",
    },
    chevron: {
        color: colors.textMuted,
        fontSize: 18,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 64,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
    },
    emptySubText: {
        color: colors.textMuted,
        fontSize: 14,
    },
});
