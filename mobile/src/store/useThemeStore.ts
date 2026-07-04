import { Appearance } from "react-native";
import { create } from "zustand";
import { darkColors, lightColors, type ThemeColors } from "@/theme/colors";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setSalonColors: (primary: string, secondary: string) => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "system") return Appearance.getColorScheme() === "dark";
  return mode === "dark";
}

function resolveColors(mode: ThemeMode, primaryColor: string): ThemeColors {
  const isDark = resolveIsDark(mode);
  const base = isDark ? darkColors : lightColors;
  return { ...base, primary: primaryColor };
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  primaryColor: "#6D28D9",
  secondaryColor: "#F472B6",
  isDark: resolveIsDark("system"),
  colors: resolveColors("system", "#6D28D9"),
  setMode: (mode) =>
    set({
      mode,
      isDark: resolveIsDark(mode),
      colors: resolveColors(mode, get().primaryColor),
    }),
  setSalonColors: (primaryColor, secondaryColor) =>
    set({
      primaryColor,
      secondaryColor,
      colors: resolveColors(get().mode, primaryColor),
    }),
}));

Appearance.addChangeListener(() => {
  const { mode, primaryColor } = useThemeStore.getState();
  if (mode === "system") {
    useThemeStore.setState({
      isDark: resolveIsDark(mode),
      colors: resolveColors(mode, primaryColor),
    });
  }
});
