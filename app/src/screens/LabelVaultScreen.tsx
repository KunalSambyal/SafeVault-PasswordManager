import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useVault } from "../hooks/useVault";
import { getCredentialsByIdentity, deleteCredential } from "../db";
import { decryptAESGCM } from "../crypto";
import { CredentialRecord } from "../types/database";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";

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
    const [items, setItems] = useState<CredentialRecord[]>([]);
    const [revealedPasswords, setRevealedPasswords] = useState<{
        [id: number]: string;
    }>({});
    const [timers, setTimers] = useState<{ [id: number]: number }>({});

    useEffect(() => {
        loadItems();
    }, [identity]);

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
        const records = await getCredentialsByIdentity(identity);
        setItems(records);
    }

    function handleViewPassword(item: CredentialRecord) {
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

    function handleDelete(id: number, label: string) {
        Alert.alert(
            "Confirm Deletion",
            `Permanently remove ${label}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteCredential(id);
                        await loadItems();
                        await refreshIdentities();
                    },
                },
            ],
        );
    }

    function renderCard({ item }: { item: CredentialRecord }) {
        const isRevealed = !!revealedPasswords[item.id];
        const countdown = timers[item.id] || 0;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    {countdown > 0 && (
                        <Text style={styles.timerBadge}>{countdown}s</Text>
                    )}
                </View>

                <View style={styles.passwordContainer}>
                    <Text style={styles.passwordText} selectable={isRevealed}>
                        {isRevealed
                            ? revealedPasswords[item.id]
                            : "••••••••••••"}
                    </Text>
                </View>

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
                        onPress={() =>
                            navigation.navigate("AddEditModal", {
                                credentialId: item.id,
                                identity: item.identity,
                                initialLabel: item.label,
                            })
                        }
                    >
                        <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item.id, item.label)}
                    >
                        <Text style={[styles.actionText, styles.deleteText]}>
                            Delete
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>{"< Back"}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {identity}
                </Text>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCard}
                contentContainerStyle={styles.listContent}
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
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
    },
    backButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: colors.cardBackground,
        borderRadius: 6,
    },
    backButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.textPrimary,
        flex: 1,
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
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.textPrimary,
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
        gap: 8,
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
        fontSize: 13,
    },
    deleteButton: {
        borderColor: colors.dangerBackground,
    },
    deleteText: {
        color: colors.danger,
    },
});
