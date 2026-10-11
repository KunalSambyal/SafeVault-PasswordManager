import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useVault } from "../hooks/useVault";
import { addCredential, updateCredential } from "../db";
import { encryptAESGCM } from "../crypto";
import { RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";

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

    const [identity, setIdentity] = useState(initialIdentity || "");
    const [label, setLabel] = useState(initialLabel || "");
    const [password, setPassword] = useState("");
    const [isMasked, setIsMasked] = useState(true);

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
            Alert.alert(
                "Save Failed",
                "Failed to encrypt and store credential.",
            );
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {credentialId ? "Update Credential" : "Add Credential"}
            </Text>

            <Text style={styles.label}>Identity (Email / Username)</Text>
            <TextInput
                style={styles.input}
                placeholder="user@example.com"
                placeholderTextColor={colors.textMuted}
                value={identity}
                onChangeText={setIdentity}
                autoCapitalize="none"
            />

            <Text style={styles.label}>Service Label</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Spotify, Work Email"
                placeholderTextColor={colors.textMuted}
                value={label}
                onChangeText={setLabel}
            />

            <Text style={styles.label}>Password</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
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
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
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
