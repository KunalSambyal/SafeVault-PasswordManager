import React, { ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface ModalFrameProps {
    visible: boolean;
    onClose: () => void;
    children: ReactNode;
    overlayPadding?: number;
}

export function ModalFrame({
    visible,
    onClose,
    children,
    overlayPadding = 16,
}: ModalFrameProps) {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { padding: overlayPadding }]}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.surfaceBorder,
                        },
                    ]}
                >
                    {children}
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
    },
    container: {
        width: "100%",
        maxHeight: "90%",
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
    },
});
