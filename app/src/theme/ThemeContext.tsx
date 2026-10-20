import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { ThemeColors, darkColors, lightColors } from "./colors";
import {
    getAppSettings,
    saveAppSettings,
    ThemePreference,
} from "../utils/settingsStore";

interface ThemeContextType {
    theme: ThemePreference;
    colors: ThemeColors;
    setTheme: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    colors: darkColors,
    setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemePreference>("dark");

    useEffect(() => {
        void loadTheme();
    }, []);

    async function loadTheme() {
        try {
            const settings = await getAppSettings();
            setThemeState(settings.theme);
        } catch {
            // Keep default dark theme
        }
    }

    async function setTheme(preference: ThemePreference) {
        setThemeState(preference);
        await saveAppSettings({ theme: preference });
    }

    const currentColors = theme === "light" ? lightColors : darkColors;

    return (
        <ThemeContext.Provider
            value={{
                theme,
                colors: currentColors,
                setTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}
