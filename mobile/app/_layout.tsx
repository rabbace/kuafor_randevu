import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import mobileAds from "react-native-google-mobile-ads";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

mobileAds().initialize();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
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
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
