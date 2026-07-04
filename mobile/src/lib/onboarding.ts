import AsyncStorage from "@react-native-async-storage/async-storage";

// v2: anahtar versiyonlandı — eski kurulumlardan/yedeklerden kalan
// "onboarding_completed" kaydı yeni tanıtım akışını gizlemesin.
const ONBOARDING_KEY = "onboarding_completed_v2";

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === "true";
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
}
