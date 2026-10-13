import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface HelpCenterModalProps {
    visible: boolean;
    onClose: () => void;
}

interface GuideSection {
    id: string;
    title: string;
    summary: string;
    content: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
    {
        id: "offline",
        title: "1. Zero-Network Security Guarantee",
        summary: "Why SafeVault cannot transmit your passwords to any server.",
        content: [
            "SafeVault is compiled with zero internet permissions (android.permission.INTERNET is completely stripped at the binary level).",
            "There are no telemetry libraries, analytics trackers, or remote synchronization servers.",
            "All database records reside in the encrypted SQLite database on your device.",
            "Hardware screenshot and screen recorder blocking (FLAG_SECURE) is actively enforced across all screens.",
        ],
    },
    {
        id: "keys",
        title: "2. Master Password & 12-Word Phrase",
        summary: "Understanding your encryption keys and account recovery.",
        content: [
            "Your credentials are encrypted using an AES-256-GCM Data Encryption Key (DEK).",
            "The DEK is wrapped by a Key Encryption Key (KEK) derived from your Master Password using PBKDF2-HMAC-SHA256 with 10,000 rounds and a 32-byte cryptographic salt.",
            "During setup, a 12-word BIP-39 mnemonic recovery phrase is created as an independent fallback key wrapper.",
            "Important: If you forget both your Master Password and 12-word recovery phrase, your data cannot be retrieved by anyone.",
        ],
    },
    {
        id: "backups",
        title: "3. Local Rotational Backups (GFS)",
        summary: "How SafeVault protects against data corruption and accidental loss.",
        content: [
            "SafeVault maintains a 4-file Grandfather-Father-Son (GFS) rolling snapshot archive on your phone storage.",
            "Before every insert, update, or deletion query, SafeVault automatically rotates files:",
            "• backup_v2 becomes backup_v3",
            "• backup_v1 becomes backup_v2",
            "• The current database state is saved to backup_v1.json",
            "If an accidental deletion or database error occurs, you can revert to any of the 3 rolling snapshots inside Vault Settings.",
        ],
    },
    {
        id: "migration",
        title: "4. Cross-Device Vault Migration",
        summary: "Moving your vault to a new device without cloud syncing.",
        content: [
            "To transfer credentials to another device:",
            "1. Open the Menu drawer and tap 'Export Vault'.",
            "2. Enter a Backup Password (at least 8 characters) to encrypt the container.",
            "3. Save the exported safevault_migration.json file to your device, SD card, or transfer it securely to your new phone.",
            "4. On the new phone, install SafeVault and tap 'Import Existing Vault' during the initial setup screen, or use 'Import Vault' in the Menu drawer.",
            "5. Enter the Backup Password to decrypt your records.",
            "6. In the existing vault menu, you can choose to Merge or Replace entries.",
        ],
    },
    {
        id: "generator",
        title: "5. Password Generator & Entropy",
        summary: "Creating cryptographically secure credentials.",
        content: [
            "The password generator utilizes hardware-backed CSPRNG (Cryptographically Secure Pseudo-Random Number Generation).",
            "Standard mode lets you customize character sets (uppercase, lowercase, numbers, and symbols) and lengths up to 64 characters.",
            "Passphrase mode generates multi-word phrases chosen from the BIP-39 English dictionary.",
            "Passwords evaluated with entropy above 75 bits are highlighted as strong and resist offline brute-force attacks.",
        ],
    },
    {
        id: "clipboard",
        title: "6. Clipboard & Temporary Password Reveal",
        summary: "Preventing clipboard snooping and visual over-the-shoulder leaks.",
        content: [
            "When viewing a credential in the identity vault, the password reveals for 30 seconds before automatically reverting to masked bullets.",
            "When copying a credential, SafeVault tags the clipboard payload with EXTRA_IS_SENSITIVE to suppress Android 13+ system floating clipboard previews.",
            "A background timer automatically scrubs and wipes the primary clipboard after the configured timeout (15s, 30s, or 60s).",
        ],
    },
];

export function HelpCenterModal({ visible, onClose }: HelpCenterModalProps) {
    const { colors } = useTheme();
    const [expandedId, setExpandedId] = useState<string | null>("offline");

    function toggleSection(id: string) {
        setExpandedId((prev) => (prev === id ? null : id));
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
                            Help & Security Guide
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
                        <Text
                            style={[
                                styles.introText,
                                { color: colors.textSecondary },
                            ]}
                        >
                            SafeVault is an offline, zero-knowledge password
                            manager designed for maximum privacy. Review the
                            sections below to understand key security
                            features and operational workflows.
                        </Text>

                        {GUIDE_SECTIONS.map((section) => {
                            const isExpanded = expandedId === section.id;
                            return (
                                <View
                                    key={section.id}
                                    style={[
                                        styles.sectionCard,
                                        {
                                            backgroundColor:
                                                colors.cardBackground,
                                            borderColor: colors.surfaceBorder,
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.sectionHeader}
                                        onPress={() =>
                                            toggleSection(section.id)
                                        }
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text
                                                style={[
                                                    styles.sectionTitle,
                                                    {
                                                        color: colors.textPrimary,
                                                    },
                                                ]}
                                            >
                                                {section.title}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.sectionSummary,
                                                    {
                                                        color: colors.textSecondary,
                                                    },
                                                ]}
                                            >
                                                {section.summary}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.indicator,
                                                { color: colors.textMuted },
                                            ]}
                                        >
                                            {isExpanded ? "▲" : "▼"}
                                        </Text>
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.expandedContent}>
                                            <View
                                                style={[
                                                    styles.divider,
                                                    {
                                                        backgroundColor:
                                                            colors.surfaceBorder,
                                                    },
                                                ]}
                                            />
                                            {section.content.map(
                                                (paragraph, index) => (
                                                    <Text
                                                        key={index}
                                                        style={[
                                                            styles.paragraph,
                                                            {
                                                                color: colors.textSecondary,
                                                            },
                                                        ]}
                                                    >
                                                        {paragraph}
                                                    </Text>
                                                ),
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
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
        paddingBottom: 28,
    },
    introText: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 16,
    },
    sectionCard: {
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
        overflow: "hidden",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 3,
    },
    sectionSummary: {
        fontSize: 11,
        lineHeight: 16,
    },
    indicator: {
        fontSize: 12,
        fontWeight: "700",
    },
    expandedContent: {
        paddingHorizontal: 14,
        paddingBottom: 14,
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 8,
    },
});
