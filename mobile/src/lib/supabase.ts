import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Release build'lerde expoConfig'in okunamadığı durumlara karşı sabit yedek değerler:
// createClient boş URL ile modül yüklenirken exception fırlatır ve uygulama hiç açılmaz.
const FALLBACK_SUPABASE_URL = "https://frzwlctzomhborhcxukd.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyendsY3R6b21oYm9yaGN4dWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NjkzNTMsImV4cCI6MjA5ODE0NTM1M30.efoxtO29POXKGKpRlzP_Mgd9wulRJpYZnUA5rJkNsPY";

const extra =
  Constants.expoConfig?.extra ??
  // Eski/manifest tabanlı erişim yolları için güvenli geri dönüş.
  (Constants as { manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } } })
    .manifest2?.extra?.expoClient?.extra ??
  {};

const supabaseUrl = (extra.supabaseUrl as string) || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = (extra.supabaseAnonKey as string) || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
