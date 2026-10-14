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
import { getCredentialsByIdentity, deleteCredential } from "../db";
import { decryptAESGCM } from "../crypto";
import { authenticateWithBiometrics } from "../utils/biometrics";
import { copyToClipboard } from "../utils/clipboard";
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

    const styles = useMemo(() => createStyles(colors), [colors]);

    useFocusEffect(
        useCallback(() => {
            void loadItems();
            setRevealedPasswords({});
            setTimers({});
        }, [identity])
    );

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

        const verified = await authenticateWithBiometrics(
            `Verify identity to copy ${item.label}`,
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
        const verified = await authenticateWithBiometrics(
            `Verify identity to delete ${labelName}`,
        );
        if (!verified) return;

        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete ${labelName}? A local rotational backup snapshot will be preserved.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
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

    function renderCard({ item }: { item: CredentialRecord }) {
        const isRevealed = !!revealedPasswords[item.id];
        const remaining = timers[item.id];

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    {isRevealed && remaining !== undefined && (
                        <Text style={styles.timerBadge}>{remaining}s</Text>
                    )}
                </View>

                <View style={styles.passwordContainer}>
                    <Text style={styles.passwordText}>
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
    });
}
