import React, { useEffect, useRef } from "react";
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
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 340);

const GITHUB_REPO_URL = "https://github.com/kunalsambyal/SafeVault";
const RELEASES_URL = "https://github.com/kunalsambyal/SafeVault/releases";
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
    const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
        Alert.alert("Copied", "Releases URL copied to clipboard.");
    };

    const handleCopyRepo = async () => {
        await Clipboard.setStringAsync(GITHUB_REPO_URL);
        Alert.alert("Copied", "GitHub repository URL copied to clipboard.");
    };

    const handleCopyEmail = async () => {
        await Clipboard.setStringAsync(FEEDBACK_EMAIL);
        Alert.alert("Copied", "Feedback email copied to clipboard: " + FEEDBACK_EMAIL);
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
                                    <View
                                        style={[
                                            styles.themePill,
                                            styles.themePillActive,
                                        ]}
                                    >
                                        <Text style={styles.themePillTextActive}>
                                            Dark
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.themePill}
                                        onPress={() =>
                                            Alert.alert(
                                                "Theme",
                                                "Light theme toggle will be enabled in a future update."
                                            )
                                        }
                                    >
                                        <Text style={styles.themePillText}>
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
                                <Text style={styles.itemTitle}>Export Vault</Text>
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
                                <Text style={styles.itemTitle}>Import Vault</Text>
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
                                            "Vault settings and auto-lock rules panel coming in a future update."
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.itemTitle}>Settings</Text>
                                <Text style={styles.itemSubtitle}>
                                    Security parameters and app preferences
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 4. Help */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>SUPPORT</Text>

                            <TouchableOpacity
                                style={styles.actionCard}
                                onPress={() => {
                                    if (onHelpPress) {
                                        handleClose();
                                        onHelpPress();
                                    } else {
                                        Alert.alert(
                                            "Help & Instructions",
                                            "SafeVault is a 100% offline password manager. Passwords are encrypted on your device and never leave it. Use Export to back up your data regularly."
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.itemTitle}>Help & Guide</Text>
                                <Text style={styles.itemSubtitle}>
                                    How offline zero-knowledge security works
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 5. About */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>ABOUT</Text>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardTitle}>
                                    SafeVault Architecture
                                </Text>
                                <Text style={styles.infoLine}>
                                    1. Offline Guarantee: No internet permission is granted to this application.
                                </Text>
                                <Text style={styles.infoLine}>
                                    2. Zero Knowledge: Encrypted locally using AES-256-GCM derived from your Master Password.
                                </Text>
                                <Text style={styles.infoLine}>
                                    3. Verifiable: Open source codebase available for review.
                                </Text>

                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyRepo}
                                >
                                    <Text style={styles.copyButtonText}>
                                        Copy GitHub URL
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 6. Feedback & Beta Notice */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>
                                FEEDBACK & BETA NOTICE
                            </Text>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardTitle}>
                                    Beta Testing (v1.0.0-beta)
                                </Text>
                                <Text style={styles.warningLine}>
                                    Warning: This is an early beta release. Do not fully depend on SafeVault as your sole storage for critical passwords yet, as file backup and migration are still in active development.
                                </Text>
                                <Text style={styles.infoTextMuted}>
                                    Feedbacks, bug reports, and suggestions are highly appreciated. You can post an issue on the GitHub repository or contact the developer directly:
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
                                        <Text style={styles.copySmallButtonText}>
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
                                    Download latest standalone APK updates or review version changelogs:
                                </Text>
                                <Text
                                    style={styles.urlText}
                                    numberOfLines={1}
                                    ellipsizeMode="middle"
                                >
                                    {RELEASES_URL}
                                </Text>

                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyReleases}
                                >
                                    <Text style={styles.copyButtonText}>
                                        Copy Release Link
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

const styles = StyleSheet.create({
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
    infoCardTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.textPrimary,
        marginBottom: 8,
    },
    infoLine: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.textSecondary,
        marginBottom: 6,
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
    urlText: {
        fontSize: 11,
        color: colors.primary,
        marginBottom: 10,
    },
    copyButton: {
        marginTop: 6,
        alignSelf: "flex-start",
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    copyButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
});
