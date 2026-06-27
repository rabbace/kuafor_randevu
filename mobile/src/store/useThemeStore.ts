import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  setMode: (mode: ThemeMode) => void;
  setSalonColors: (primary: string, secondary: string) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: "system",
  primaryColor: "#6D28D9",
  secondaryColor: "#F472B6",
  setMode: (mode) => set({ mode }),
  setSalonColors: (primaryColor, secondaryColor) => set({ primaryColor, secondaryColor }),
}));
