import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import mobileAds from "react-native-google-mobile-ads";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";

mobileAds().initialize();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  async function loadProfile(authId: string) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, role, gender, phone, loyalty_points")
      .eq("auth_id", authId)
      .maybeSingle();

    if (!data) return;
    setUser({
      id: data.id,
      fullName: data.full_name,
      role: data.role,
      gender: data.gender,
      loyaltyPoints: data.loyalty_points,
    });
  }

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);

      const onboardingDone = await hasCompletedOnboarding();
      if (!onboardingDone) {
        router.replace("/onboarding" as never);
      } else if (!data.session) {
        router.replace("/(auth)/login" as never);
      } else {
        router.replace("/(tabs)" as never);
      }
      setIsReady(true);
    }

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
