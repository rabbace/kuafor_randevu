import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import {
  DEFAULT_ACCENT_KEY,
  darkColors,
  getAccentPalette,
  lightColors,
  type ThemeColors,
} from "@/theme/colors";

type ThemeMode = "light" | "dark" | "system";

const MODE_KEY = "theme_mode";
const ACCENT_KEY = "theme_accent";

interface ThemeStore {
  mode: ThemeMode;
  accentKey: string;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accentKey: string) => void;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "system") return Appearance.getColorScheme() === "dark";
  return mode === "dark";
}

function resolveColors(mode: ThemeMode, accentKey: string): ThemeColors {
  const isDark = resolveIsDark(mode);
  const base = isDark ? darkColors : lightColors;
  const palette = getAccentPalette(accentKey);
  return {
    ...base,
    primary: isDark ? palette.dark : palette.light,
    gradient: palette.gradient,
  };
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  accentKey: DEFAULT_ACCENT_KEY,
  isDark: resolveIsDark("system"),
  colors: resolveColors("system", DEFAULT_ACCENT_KEY),
  setMode: (mode) => {
    set({
      mode,
      isDark: resolveIsDark(mode),
      colors: resolveColors(mode, get().accentKey),
    });
    AsyncStorage.setItem(MODE_KEY, mode).catch(() => {});
  },
  setAccent: (accentKey) => {
    set({
      accentKey,
      colors: resolveColors(get().mode, accentKey),
    });
    AsyncStorage.setItem(ACCENT_KEY, accentKey).catch(() => {});
  },
}));

/** Kaydedilmiş tema tercihlerini yükler; uygulama açılışında çağrılır. */
export async function hydrateTheme(): Promise<void> {
  try {
    const [mode, accent] = await Promise.all([
      AsyncStorage.getItem(MODE_KEY),
      AsyncStorage.getItem(ACCENT_KEY),
    ]);
    const nextMode = (mode as ThemeMode | null) ?? "system";
    const nextAccent = accent ?? DEFAULT_ACCENT_KEY;
    useThemeStore.setState({
      mode: nextMode,
      accentKey: nextAccent,
      isDark: resolveIsDark(nextMode),
      colors: resolveColors(nextMode, nextAccent),
    });
  } catch {
    // Tercihler okunamazsa varsayılanlarla devam.
  }
}

Appearance.addChangeListener(() => {
  const { mode, accentKey } = useThemeStore.getState();
  if (mode === "system") {
    useThemeStore.setState({
      isDark: resolveIsDark(mode),
      colors: resolveColors(mode, accentKey),
    });
  }
});
