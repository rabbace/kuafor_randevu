import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { isExpoGo } from "@/lib/ads";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { hydrateTheme, useThemeStore } from "@/store/useThemeStore";

// Native splash'ı biz kontrol edelim; bootstrap bitince gizlenir.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* zaten gizlenmiş olabilir */
});

if (!isExpoGo) {
  // Expo Go bu native modülü desteklemediği için yalnızca gerçek build'lerde yüklenir.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("react-native-google-mobile-ads")
      .default()
      .initialize()
      .catch(() => {});
  } catch (e) {
    // AdMob init hatası uygulamanın açılmasını engellememeli.
    console.warn("AdMob init failed", e);
  }
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const rootNavigationState = useRootNavigationState();
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
      let route = "/onboarding";
      try {
        await hydrateTheme();
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) {
          try {
            await loadProfile(data.session.user.id);
          } catch (e) {
            console.warn("loadProfile failed", e);
          }
        }

        const onboardingDone = await hasCompletedOnboarding();
        if (!onboardingDone) {
          route = "/onboarding";
        } else if (!data.session) {
          route = "/(auth)/register";
        } else {
          route = "/(tabs)";
        }
      } catch (e) {
        // Ne olursa olsun uygulama açılmalı; hata durumunda onboarding'e düş.
        console.warn("bootstrap failed", e);
      } finally {
        setLoading(false);
        setInitialRoute(route);
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id).catch(() => {});
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Navigator mount olduktan SONRA yönlendir; erken router.replace() exception fırlatır.
  useEffect(() => {
    if (!rootNavigationState?.key || !initialRoute) return;
    try {
      router.replace(initialRoute as never);
    } catch (e) {
      console.warn("initial redirect failed", e);
    }
    setInitialRoute(null);
  }, [rootNavigationState?.key, initialRoute]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: "700" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {!isReady && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
