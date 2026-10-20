import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { SortOrder } from "../utils/settingsStore";
import { ModalFrame } from "./ModalFrame";

interface SortModalProps {
    visible: boolean;
    onClose: () => void;
    currentSort: SortOrder;
    onSelectSort: (sort: SortOrder) => void;
    title?: string;
}

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
    { label: "Name (A to Z)", value: "name_asc" },
    { label: "Name (Z to A)", value: "name_desc" },
    { label: "Date (Newest first)", value: "date_desc" },
    { label: "Date (Oldest first)", value: "date_asc" },
];

export function SortModal({
    visible,
    onClose,
    currentSort,
    onSelectSort,
    title = "Sort By",
}: SortModalProps) {
    const { colors } = useTheme();

    return (
        <ModalFrame visible={visible} onClose={onClose}>
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
                    {title}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text
                        style={[
                            styles.closeButtonText,
                            { color: colors.textSecondary },
                        ]}
                    >
                        X
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                {SORT_OPTIONS.map((option) => {
                    const isSelected = currentSort === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.optionRow,
                                {
                                    backgroundColor: isSelected
                                        ? colors.cardBackground
                                        : "transparent",
                                    borderColor: isSelected
                                        ? colors.primary
                                        : colors.surfaceBorder,
                                },
                            ]}
                            onPress={() => {
                                onSelectSort(option.value);
                                onClose();
                            }}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    {
                                        color: isSelected
                                            ? colors.primary
                                            : colors.textPrimary,
                                        fontWeight: isSelected
                                            ? "700"
                                            : "500",
                                    },
                                ]}
                            >
                                {option.label}
                            </Text>
                            <View
                                style={[
                                    styles.radioOuter,
                                    {
                                        borderColor: isSelected
                                            ? colors.primary
                                            : colors.surfaceBorder,
                                    },
                                ]}
                            >
                                {isSelected && (
                                    <View
                                        style={[
                                            styles.radioInner,
                                            {
                                                backgroundColor:
                                                    colors.primary,
                                            },
                                        ]}
                                    />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
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
        fontSize: 16,
        fontWeight: "700",
    },
    body: {
        padding: 16,
        gap: 10,
    },
    optionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    optionText: {
        fontSize: 15,
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
