export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  border: "#E5E5E5",
  text: "#171717",
  textMuted: "#737373",
  primary: "#6D28D9",
  primaryText: "#FFFFFF",
  danger: "#DC2626",
};

export const darkColors: ThemeColors = {
  background: "#0F0F12",
  surface: "#1A1A1F",
  border: "#2A2A30",
  text: "#F5F5F5",
  textMuted: "#A1A1AA",
  primary: "#8B5CF6",
  primaryText: "#FFFFFF",
  danger: "#F87171",
};
