import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    ScrollView,
    Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 340);

const GITHUB_REPO_URL =
    "https://github.com/KunalSambyal/SafeVault-PasswordManager";
const RELEASES_URL =
    "https://github.com/KunalSambyal/SafeVault-PasswordManager/releases";
const FEEDBACK_EMAIL = "kunalsambyal9628@gmail.com";

interface SidebarDrawerProps {
    visible: boolean;
    onClose: () => void;
    onExportPress: () => void;
    onImportPress: () => void;
    onSettingsPress?: () => void;
    onHelpPress?: () => void;
}

export function SidebarDrawer({
    visible,
    onClose,
    onExportPress,
    onImportPress,
    onSettingsPress,
    onHelpPress,
}: SidebarDrawerProps) {
    const { colors, theme, setTheme } = useTheme();
    const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SIDEBAR_WIDTH);
            fadeAnim.setValue(0);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 240,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SIDEBAR_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleCopyReleases = async () => {
        await Clipboard.setStringAsync(RELEASES_URL);
        Alert.alert("Copied", "Release URL copied to clipboard.");
    };

    const handleCopyRepo = async () => {
        await Clipboard.setStringAsync(GITHUB_REPO_URL);
        Alert.alert("Copied", "GitHub repository URL copied to clipboard.");
    };

    const handleCopyEmail = async () => {
        await Clipboard.setStringAsync(FEEDBACK_EMAIL);
        Alert.alert(
            "Copied",
            "Feedback email copied to clipboard: " + FEEDBACK_EMAIL,
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                {/* Backdrop area outside sidebar */}
                <TouchableWithoutFeedback onPress={handleClose}>
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: fadeAnim,
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>

                {/* Animated Right Sidebar */}
                <Animated.View
                    style={[
                        styles.sidebar,
                        {
                            transform: [{ translateX: slideAnim }],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Menu</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            accessibilityLabel="Close menu"
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 1. Theme Toggler */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>APPEARANCE</Text>
                            <View style={styles.themeRow}>
                                <Text style={styles.itemTitle}>Theme</Text>
                                <View style={styles.themeToggleGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.themePill,
                                            theme === "dark" &&
                                                styles.themePillActive,
                                        ]}
                                        onPress={() => setTheme("dark")}
                                    >
                                        <Text
                                            style={
                                                theme === "dark"
                                                    ? styles.themePillTextActive
                                                    : styles.themePillText
                                            }
                                        >
                                            Dark
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.themePill,
                                            theme === "light" &&
                                                styles.themePillActive,
                                        ]}
                                        onPress={() => setTheme("light")}
                                    >
                                        <Text
                                            style={
                                                theme === "light"
                                                    ? styles.themePillTextActive
                                                    : styles.themePillText
                                            }
                                        >
                                            Light
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* 2. Vault Operations (Export & Import) */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>
                                VAULT ACTIONS
                            </Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    handleClose();
                                    onExportPress();
                                }}
                            >
                                <Text style={styles.itemTitle}>
                                    Export Vault
                                </Text>
                                <Text style={styles.itemSubtitle}>
                                    Create encrypted JSON backup for migration
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    handleClose();
                                    onImportPress();
                                }}
                            >
                                <Text style={styles.itemTitle}>
                                    Import Vault
                                </Text>
                                <Text style={styles.itemSubtitle}>
                                    Restore or merge credentials from backup
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 3. Settings */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>
                                CONFIGURATION
                            </Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    if (onSettingsPress) {
                                        handleClose();
                                        onSettingsPress();
                                    } else {
                                        Alert.alert(
                                            "Settings",
                                            "Vault settings and auto-lock rules panel coming in a future update.",
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.itemTitle}>Settings</Text>
                                <Text style={styles.itemSubtitle}>
                                    Security parameters, GFS snapshots, and
                                    timeouts
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 4. Help Center */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>
                                HELP CENTER
                            </Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    if (onHelpPress) {
                                        handleClose();
                                        onHelpPress();
                                    } else {
                                        Alert.alert(
                                            "Help & Guide",
                                            "This feature will be added in upcoming updates.",
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.itemTitle}>
                                    Help & Guide
                                </Text>
                                <Text style={styles.itemSubtitle}>
                                    Step-by-step zero-knowledge security guide
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 5. About (Expandable) */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>ABOUT</Text>
                            <TouchableOpacity
                                style={styles.infoCard}
                                activeOpacity={0.85}
                                onPress={() =>
                                    setIsAboutExpanded((prev) => !prev)
                                }
                            >
                                <View style={styles.accordionHeader}>
                                    <Text style={styles.infoCardTitle}>
                                        About SafeVault
                                    </Text>
                                    <Text style={styles.expandIndicator}>
                                        {isAboutExpanded ? "▲" : "▼"}
                                    </Text>
                                </View>

                                <Text style={styles.oneLinerText}>
                                    SafeVault is a 100% secure, zero-knowledge
                                    offline password manager.
                                </Text>

                                {isAboutExpanded && (
                                    <View style={styles.expandedContent}>
                                        <View style={styles.divider} />
                                        <Text style={styles.architectureTitle}>
                                            SafeVault Architecture
                                        </Text>
                                        <Text style={styles.infoLine}>
                                            1. Offline Guarantee: No internet
                                            permission is granted to this
                                            application.
                                        </Text>
                                        <Text style={styles.infoLine}>
                                            2. Zero Knowledge: Encrypted locally
                                            using your Master Password.
                                        </Text>
                                        <Text style={styles.infoLine}>
                                            3. Verifiable: Open source codebase
                                            available for review on GitHub.
                                        </Text>

                                        <Text style={styles.warningLine}>
                                            Notice: Always keep your 12-word
                                            recovery phrase backed up safely.
                                        </Text>

                                        <Text style={styles.starSupportText}>
                                            If you find SafeVault useful,
                                            consider giving the GitHub
                                            repository a star.
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.wideButton}
                                            onPress={handleCopyRepo}
                                        >
                                            <Text style={styles.wideButtonText}>
                                                Copy GitHub URL
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* 6. Feedback & Beta Notice */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>FEEDBACK</Text>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoTextMuted}>
                                    Feedbacks, bug reports, and suggestions are
                                    highly appreciated. You can post an issue on
                                    the GitHub repository or contact the
                                    developer directly:
                                </Text>

                                <View style={styles.emailRow}>
                                    <Text
                                        style={styles.emailText}
                                        numberOfLines={1}
                                        ellipsizeMode="middle"
                                    >
                                        {FEEDBACK_EMAIL}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.copySmallButton}
                                        onPress={handleCopyEmail}
                                    >
                                        <Text
                                            style={styles.copySmallButtonText}
                                        >
                                            Copy Email
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* 7. Updates */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>UPDATES</Text>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardTitle}>
                                    Release Channel
                                </Text>
                                <Text style={styles.infoTextMuted}>
                                    Current Version (v1.2.2)
                                </Text>
                                <Text style={styles.infoTextMuted}>
                                    Download latest updates or check for new
                                    updates and changes.
                                </Text>

                                <TouchableOpacity
                                    style={styles.wideButton}
                                    onPress={handleCopyReleases}
                                >
                                    <Text style={styles.wideButtonText}>
                                        Copy GitHub Release Link
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            flexDirection: "row",
        },
        backdrop: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
        },
        sidebar: {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.surface,
            borderLeftWidth: 1,
            borderLeftColor: colors.surfaceBorder,
            paddingTop: 48,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceBorder,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
        },
        closeButton: {
            paddingHorizontal: 8,
            paddingVertical: 4,
        },
        closeButtonText: {
            fontSize: 20,
            color: colors.textSecondary,
            fontWeight: "600",
        },
        scrollArea: {
            flex: 1,
        },
        scrollContent: {
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 40,
        },
        section: {
            marginBottom: 22,
        },
        sectionHeader: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
            color: colors.textMuted,
            marginBottom: 8,
            paddingLeft: 4,
        },
        themeRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
        },
        themeToggleGroup: {
            flexDirection: "row",
            backgroundColor: colors.inputBackground,
            borderRadius: 6,
            padding: 2,
        },
        themePill: {
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 4,
        },
        themePillActive: {
            backgroundColor: colors.primary,
        },
        themePillText: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: "600",
        },
        themePillTextActive: {
            fontSize: 12,
            color: colors.background,
            fontWeight: "700",
        },
        actionCard: {
            backgroundColor: colors.cardBackground,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            marginBottom: 8,
        },
        itemTitle: {
            fontSize: 15,
            fontWeight: "600",
            color: colors.textPrimary,
        },
        itemSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        infoCard: {
            backgroundColor: colors.cardBackground,
            padding: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
        },
        accordionHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
        },
        infoCardTitle: {
            fontSize: 14,
            fontWeight: "700",
            color: colors.textPrimary,
        },
        expandIndicator: {
            fontSize: 12,
            color: colors.textMuted,
            fontWeight: "700",
        },
        oneLinerText: {
            fontSize: 12,
            lineHeight: 18,
            color: colors.textSecondary,
        },
        expandedContent: {
            marginTop: 10,
        },
        divider: {
            height: 1,
            backgroundColor: colors.surfaceBorder,
            marginBottom: 10,
        },
        architectureTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 6,
        },
        infoLine: {
            fontSize: 12,
            lineHeight: 18,
            color: colors.textSecondary,
            marginBottom: 6,
        },
        starSupportText: {
            fontSize: 12,
            lineHeight: 17,
            color: colors.accent,
            marginTop: 4,
            marginBottom: 10,
        },
        wideButton: {
            marginTop: 6,
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
        },
        wideButtonText: {
            fontSize: 12,
            fontWeight: "600",
            color: colors.primary,
        },
        warningLine: {
            fontSize: 12,
            lineHeight: 18,
            color: colors.danger,
            marginBottom: 8,
        },
        infoTextMuted: {
            fontSize: 12,
            lineHeight: 17,
            color: colors.textMuted,
            marginBottom: 8,
        },
        emailRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginTop: 4,
        },
        emailText: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: "600",
            flex: 1,
            marginRight: 8,
        },
        copySmallButton: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 4,
        },
        copySmallButtonText: {
            fontSize: 11,
            fontWeight: "600",
            color: colors.textSecondary,
        },
    });
}
