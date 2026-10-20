import React, { useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    StyleProp,
    ViewStyle,
    TextStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface PasswordInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    autoFocus?: boolean;
    onSubmitEditing?: () => void;
}

export function PasswordInput({
    value,
    onChangeText,
    placeholder = "Password",
    containerStyle,
    inputStyle,
    autoFocus,
    onSubmitEditing,
}: PasswordInputProps) {
    const { colors } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [spaceAttempted, setSpaceAttempted] = useState(false);

    function handleChangeText(text: string) {
        if (/\s/.test(text)) {
            setSpaceAttempted(true);
        } else if (spaceAttempted) {
            setSpaceAttempted(false);
        }
        const cleaned = text.replace(/\s/g, "");
        onChangeText(cleaned);
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <View
                style={[
                    styles.inputRow,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.surfaceBorder,
                    },
                ]}
            >
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.textPrimary },
                        inputStyle,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!isVisible}
                    value={value}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={autoFocus}
                    onChangeText={handleChangeText}
                    onSubmitEditing={onSubmitEditing}
                />
                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setIsVisible(!isVisible)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            { color: colors.textSecondary },
                        ]}
                    >
                        {isVisible ? "Hide" : "Show"}
                    </Text>
                </TouchableOpacity>
            </View>
            {spaceAttempted ? (
                <Text style={[styles.hintText, { color: colors.danger }]}>
                    Spaces are not permitted.
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 8,
        borderWidth: 1,
        overflow: "hidden",
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
    },
    toggleButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    toggleText: {
        fontSize: 13,
        fontWeight: "600",
    },
    hintText: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});
