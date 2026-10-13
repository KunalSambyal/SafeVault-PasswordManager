import React, { useEffect, useRef } from "react";
import {
    View,
    ActivityIndicator,
    AppState,
    AppStateStatus,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { VaultProvider, useVault } from "./src/hooks/useVault";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { getAppSettings } from "./src/utils/settingsStore";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { UnlockScreen } from "./src/screens/UnlockScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LabelVaultScreen } from "./src/screens/LabelVaultScreen";
import { AddEditCredentialModal } from "./src/screens/AddEditCredentialModal";
import { RootStackParamList } from "./src/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
    const { isReady, isInitialized, isUnlocked, lockVault } = useVault();
    const { colors, theme } = useTheme();
    const appState = useRef(AppState.currentState);
    const backgroundTimestamp = useRef<number | null>(null);

    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            async (nextAppState: AppStateStatus) => {
                if (
                    appState.current === "active" &&
                    nextAppState.match(/inactive|background/)
                ) {
                    backgroundTimestamp.current = Date.now();
                    const settings = await getAppSettings();
                    if (settings.autoLockTimeout === 0) {
                        if (isUnlocked) {
                            lockVault();
                        }
                    }
                } else if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === "active"
                ) {
                    if (backgroundTimestamp.current !== null) {
                        const elapsedSeconds =
                            (Date.now() - backgroundTimestamp.current) / 1000;
                        const settings = await getAppSettings();
                        if (
                            settings.autoLockTimeout > 0 &&
                            elapsedSeconds >= settings.autoLockTimeout
                        ) {
                            if (isUnlocked) {
                                lockVault();
                            }
                        }
                        backgroundTimestamp.current = null;
                    }
                }
                appState.current = nextAppState;
            },
        );

        return () => {
            subscription.remove();
        };
    }, [isUnlocked, lockVault]);

    if (!isReady) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: "fade",
                }}
            >
                {!isInitialized ? (
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingScreen}
                    />
                ) : !isUnlocked ? (
                    <Stack.Screen name="Unlock" component={UnlockScreen} />
                ) : (
                    <>
                        <Stack.Screen
                            name="Dashboard"
                            component={DashboardScreen}
                        />
                        <Stack.Screen
                            name="LabelVault"
                            component={LabelVaultScreen}
                        />
                        <Stack.Screen
                            name="AddEditModal"
                            component={AddEditCredentialModal}
                            options={{ presentation: "modal" }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <VaultProvider>
                <AppNavigator />
            </VaultProvider>
        </ThemeProvider>
    );
}
