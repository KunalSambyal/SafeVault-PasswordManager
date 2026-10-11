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
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { UnlockScreen } from "./src/screens/UnlockScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LabelVaultScreen } from "./src/screens/LabelVaultScreen";
import { AddEditCredentialModal } from "./src/screens/AddEditCredentialModal";
import { RootStackParamList } from "./src/types/navigation";
import { colors } from "./src/theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
    const { isReady, isInitialized, isUnlocked, lockVault } = useVault();
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            (nextAppState: AppStateStatus) => {
                if (
                    appState.current === "active" &&
                    nextAppState.match(/inactive|background/)
                ) {
                    if (isUnlocked) {
                        lockVault();
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
        <VaultProvider>
            <StatusBar style="light" />
            <AppNavigator />
        </VaultProvider>
    );
}
