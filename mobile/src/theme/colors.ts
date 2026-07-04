export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  danger: string;
  /** Vurgu renginin degrade çifti (butonlar, hero kartlar). */
  gradient: [string, string];
}

export interface AccentPalette {
  key: string;
  label: string;
  /** Açık temada primary */
  light: string;
  /** Koyu temada primary (genelde bir ton açık) */
  dark: string;
  gradient: [string, string];
}

// Küratörlü vurgu paletleri: her biri açık/koyu temada okunaklı kalacak
// şekilde seçildi. Serbest renk seçtirmiyoruz — kötü kombinasyon riski.
export const ACCENT_PALETTES: AccentPalette[] = [
  { key: "violet", label: "Mor", light: "#6D28D9", dark: "#8B5CF6", gradient: ["#6D28D9", "#9333EA"] },
  { key: "ocean", label: "Okyanus", light: "#0369A1", dark: "#38BDF8", gradient: ["#0369A1", "#0EA5E9"] },
  { key: "emerald", label: "Zümrüt", light: "#047857", dark: "#34D399", gradient: ["#047857", "#10B981"] },
  { key: "sunset", label: "Gün Batımı", light: "#C2410C", dark: "#FB923C", gradient: ["#C2410C", "#F97316"] },
  { key: "rose", label: "Gül", light: "#BE123C", dark: "#FB7185", gradient: ["#BE123C", "#F43F5E"] },
  { key: "graphite", label: "Grafit", light: "#334155", dark: "#94A3B8", gradient: ["#334155", "#64748B"] },
];

export const DEFAULT_ACCENT_KEY = "violet";

export function getAccentPalette(key: string): AccentPalette {
  return ACCENT_PALETTES.find((p) => p.key === key) ?? ACCENT_PALETTES[0];
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
  gradient: ["#6D28D9", "#9333EA"],
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
  gradient: ["#6D28D9", "#9333EA"],
};
