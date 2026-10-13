import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { calculatePasswordStrength } from "../utils/generator";
import { useTheme } from "../theme/ThemeContext";

export function PasswordStrengthBar({ password }: { password: string }) {
    const { colors } = useTheme();

    if (!password) return null;

    const strength = calculatePasswordStrength(password);
    const percentage = (strength.score / 4) * 100;

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.barTrack,
                    { backgroundColor: colors.surfaceBorder },
                ]}
            >
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${percentage}%`,
                            backgroundColor: strength.color,
                        },
                    ]}
                />
            </View>
            <Text style={[styles.label, { color: strength.color }]}>
                {strength.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
        marginBottom: 16,
    },
    barTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 2,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        minWidth: 70,
        textAlign: "right",
    },
});
