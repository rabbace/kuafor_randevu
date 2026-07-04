import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_TO = "kuaforrandevu://auth-callback";

/** Deep link URL'inden Supabase oturumu kurar (OAuth dönüşü ve şifre sıfırlama). */
export async function createSessionFromUrl(url: string): Promise<{ ok: boolean; type?: string }> {
  try {
    // Parametreler fragment (#) veya query (?) içinde gelebilir.
    const paramsPart = url.includes("#") ? url.split("#")[1] : url.split("?")[1];
    if (!paramsPart) return { ok: false };
    const params = new URLSearchParams(paramsPart);

    const code = params.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { ok: !error, type: params.get("type") ?? undefined };
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { ok: !error, type: params.get("type") ?? undefined };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Google ile giriş: OAuth URL'ini uygulama içi tarayıcıda açar, dönüş
 * deep link'inden oturumu kurar.
 */
export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: REDIRECT_TO, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { ok: false, error: "Google girişi başlatılamadı. Lütfen tekrar dene." };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);
  if (result.type !== "success" || !result.url) {
    return { ok: false, error: result.type === "cancel" ? "" : "Giriş tamamlanamadı." };
  }

  const session = await createSessionFromUrl(result.url);
  return session.ok
    ? { ok: true }
    : { ok: false, error: "Oturum oluşturulamadı. Lütfen tekrar dene." };
}
