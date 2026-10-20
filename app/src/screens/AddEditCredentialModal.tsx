import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useVault } from "../hooks/useVault";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";
import { addCredential, updateCredential, getDistinctIdentities } from "../db";
import { encryptAESGCM } from "../crypto";
import { PasswordStrengthBar } from "../components/PasswordStrengthBar";
import { PasswordGeneratorModal } from "../components/PasswordGeneratorModal";
import { RootStackParamList } from "../types/navigation";

type RouteProps = RouteProp<RootStackParamList, "AddEditModal">;
type NavProps = NativeStackNavigationProp<RootStackParamList, "AddEditModal">;

export function AddEditCredentialModal({
    route,
    navigation,
}: {
    route: RouteProps;
    navigation: NavProps;
}) {
    const {
        identity: initialIdentity,
        credentialId,
        initialLabel,
    } = route.params;
    const { dek, refreshIdentities } = useVault();
    const { colors } = useTheme();

    const [identity, setIdentity] = useState(initialIdentity || "");
    const [label, setLabel] = useState(initialLabel || "");
    const [password, setPassword] = useState("");
    const [isMasked, setIsMasked] = useState(true);
    const [generatorVisible, setGeneratorVisible] = useState(false);
    const [existingIdentities, setExistingIdentities] = useState<string[]>([]);

    useEffect(() => {
        let isMounted = true;
        getDistinctIdentities()
            .then((list) => {
                if (isMounted) setExistingIdentities(list);
            })
            .catch((err) => {
                console.warn("Failed to load distinct identities", err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const visibleSuggestions = useMemo(() => {
        if (!identity.trim()) {
            return existingIdentities;
        }
        return existingIdentities.filter((item) =>
            item.toLowerCase().includes(identity.toLowerCase()),
        );
    }, [existingIdentities, identity]);

    async function handleSave() {
        if (!identity.trim() || !label.trim() || !password.trim()) {
            Alert.alert("Incomplete Entry", "Please fill in all fields.");
            return;
        }

        if (!dek) {
            Alert.alert("Vault Error", "Vault is not unlocked.");
            return;
        }

        try {
            const encrypted = encryptAESGCM(password, dek);

            if (credentialId) {
                await updateCredential(credentialId, {
                    identity: identity.trim(),
                    label: label.trim(),
                    encrypted_password: encrypted.ciphertext,
                    iv: encrypted.iv,
                    auth_tag: encrypted.tag,
                });
            } else {
                await addCredential({
                    identity: identity.trim(),
                    label: label.trim(),
                    encrypted_password: encrypted.ciphertext,
                    iv: encrypted.iv,
                    auth_tag: encrypted.tag,
                });
            }

            await refreshIdentities();
            navigation.goBack();
        } catch {
            Alert.alert("Save Error", "Failed to encrypt and store credential.");
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {credentialId ? "Edit Credential" : "Add Credential"}
            </Text>

            <Text style={styles.label}>Account Identity</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. user@example.com or username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={identity}
                onChangeText={setIdentity}
            />

            {visibleSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionTitle}>Existing Accounts</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionList}
                    >
                        {visibleSuggestions.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[
                                    styles.suggestionPill,
                                    identity === item &&
                                        styles.suggestionPillSelected,
                                ]}
                                onPress={() => setIdentity(item)}
                            >
                                <Text
                                    style={[
                                        styles.suggestionPillText,
                                        identity === item &&
                                            styles.suggestionPillTextSelected,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <Text style={styles.label}>Service Label</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Personal Banking or Spotify"
                placeholderTextColor={colors.textMuted}
                value={label}
                onChangeText={setLabel}
            />

            <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => setGeneratorVisible(true)}>
                    <Text style={styles.generateLink}>Generate</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.passwordRow}>
                <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={isMasked}
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity
                    style={styles.maskToggle}
                    onPress={() => setIsMasked(!isMasked)}
                >
                    <Text style={styles.maskToggleText}>
                        {isMasked ? "Show" : "Hide"}
                    </Text>
                </TouchableOpacity>
            </View>

            <PasswordStrengthBar password={password} />

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>

            <PasswordGeneratorModal
                visible={generatorVisible}
                onClose={() => setGeneratorVisible(false)}
                onApplyPassword={(generatedPassword) => {
                    setPassword(generatedPassword);
                    setIsMasked(false);
                }}
            />
        </View>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 24,
            paddingTop: 48,
        },
        title: {
            fontSize: 24,
            fontWeight: "800",
            color: colors.textPrimary,
            marginBottom: 24,
        },
        label: {
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 6,
            fontWeight: "600",
        },
        passwordHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
        },
        generateLink: {
            color: colors.primary,
            fontSize: 13,
            fontWeight: "700",
        },
        input: {
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 8,
            color: colors.textPrimary,
            padding: 14,
            marginBottom: 16,
            fontSize: 16,
        },
        suggestionsContainer: {
            marginTop: -8,
            marginBottom: 14,
        },
        suggestionTitle: {
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 6,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        suggestionList: {
            flexDirection: "row",
            gap: 8,
            paddingVertical: 2,
        },
        suggestionPill: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
        },
        suggestionPillSelected: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        suggestionPillText: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: "500",
        },
        suggestionPillTextSelected: {
            color: colors.background,
            fontWeight: "700",
        },
        passwordRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
        },
        passwordInput: {
            flex: 1,
            marginBottom: 0,
        },
        maskToggle: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderRadius: 8,
        },
        maskToggleText: {
            color: colors.accent,
            fontWeight: "600",
            fontSize: 14,
        },
        buttonRow: {
            flexDirection: "row",
            gap: 12,
            marginTop: 16,
        },
        cancelButton: {
            flex: 1,
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            alignItems: "center",
        },
        cancelButtonText: {
            color: colors.textSecondary,
            fontWeight: "600",
            fontSize: 16,
        },
        saveButton: {
            flex: 1,
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 8,
            alignItems: "center",
        },
        saveButtonText: {
            color: colors.background,
            fontWeight: "700",
            fontSize: 16,
        },
    });
}
