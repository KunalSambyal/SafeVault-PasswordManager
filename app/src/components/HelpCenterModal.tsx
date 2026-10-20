import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { ModalFrame } from "./ModalFrame";

interface HelpCenterModalProps {
    visible: boolean;
    onClose: () => void;
}

interface GuideSection {
    id: string;
    title: string;
    summary: string;
    content: string[];
    highlight?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
    {
        id: "keys",
        title: "1. Master Password & 12-Word Recovery Phrase",
        summary: "Why your master password and 12-word recovery phrase are critical.",
        content: [
            "Your Master Password is the main key that protects your entire vault. Losing it means you lose access to all your stored accounts.",
            "Because SafeVault works completely offline and does not store your passwords on any server, there is no 'Forgot Password' email or reset link.",
            "The 12-word recovery phrase shown during initial setup is your only safety net. If you ever forget your Master Password, those 12 words allow you to regain access and create a new password.",
            "Write down your 12-word recovery phrase on paper and store it in a safe, private location. Never share it with anyone.",
        ],
    },
    {
        id: "backups",
        title: "2. Local Rotational Backups",
        summary: "How SafeVault automatically saves rolling snapshots of your data.",
        content: [
            "SafeVault automatically saves backup snapshots of your vault before every add, edit, or delete action.",
            "It maintains 3 rolling snapshots (Slot V1, Slot V2, and Slot V3) directly on your device storage.",
        ],
        highlight:
            "If you make a mistake or accidentally delete a password, open the Menu drawer, tap Settings, scroll down to Rotational Backups, and tap Restore next to any previous snapshot to immediately recover your data.",
    },
    {
        id: "migration",
        title: "3. Cross-Device Vault Migration",
        summary: "Moving your vault to a new phone without internet.",
        content: [
            "To transfer credentials to another device:",
            "1. Open the Menu drawer and tap 'Export Vault'.",
            "2. Enter a Backup Password (at least 8 characters) to lock the export file.",
            "3. Save the exported safevault_migration.json file or send it securely to your new phone.",
            "4. On the new phone, install SafeVault and tap 'Import Existing Vault' during the initial setup screen, or use 'Import Vault' in the Menu drawer.",
            "5. Enter the Backup Password to unlock your records.",
            "6. In the existing vault menu, you can choose to Merge or Replace entries.",
        ],
    },
    {
        id: "generator",
        title: "4. Password & Passphrase Generator",
        summary: "Easily generate strong passwords or memorable passphrases.",
        content: [
            "When adding or editing an account, tap 'Generate' next to the password field.",
            "Complex Mode: Quickly creates random, hard-to-guess passwords using letters, numbers, and symbols. You can adjust the length from 12 to 24 characters.",
            "Passphrase Mode: Creates multi-word phrases that are memorable and easy to type while remaining very secure.",
            "Tap 'Regenerate' to create a new option, and tap 'Use Password' to insert it directly into your entry.",
        ],
    },
];

export function HelpCenterModal({ visible, onClose }: HelpCenterModalProps) {
    const { colors } = useTheme();
    const [expandedId, setExpandedId] = useState<string | null>("keys");

    function toggleSection(id: string) {
        setExpandedId((prev) => (prev === id ? null : id));
    }

    return (
        <ModalFrame
            visible={visible}
            onClose={onClose}
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
                            Help & Guide
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
                                ✕
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
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

                                            {section.highlight && (
                                                <View
                                                    style={[
                                                        styles.highlightBox,
                                                        {
                                                            backgroundColor:
                                                                colors.inputBackground,
                                                            borderColor:
                                                                colors.primary,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.highlightTitle,
                                                            {
                                                                color: colors.primary,
                                                            },
                                                        ]}
                                                    >
                                                        How to Restore a Previous Save:
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.highlightText,
                                                            {
                                                                color: colors.textPrimary,
                                                            },
                                                        ]}
                                                    >
                                                        {section.highlight}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
            </ScrollView>
        </ModalFrame>
    );
}

const styles = StyleSheet.create({
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
        fontSize: 18,
        fontWeight: "600",
    },
    body: {
        flexGrow: 0,
    },
    bodyContent: {
        padding: 18,
        paddingBottom: 28,
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
    highlightBox: {
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginTop: 6,
    },
    highlightTitle: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 4,
    },
    highlightText: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "500",
    },
});
