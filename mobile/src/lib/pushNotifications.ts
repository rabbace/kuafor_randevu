import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Bildirim izni ister, Expo push token alır ve public.push_tokens tablosuna kaydeder.
 * Edge Function (send-appointment-reminders) bu tablodan token'ları çekip FCM/APNs'e gönderir.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    return await registerInternal(userId);
  } catch (e) {
    // Push kaydı başarısız olsa bile uygulama akışı bozulmamalı
    // (ör. geçersiz EAS projectId ile getExpoPushTokenAsync exception fırlatır).
    console.warn("registerForPushNotificationsAsync failed", e);
    return null;
  }
}

async function registerInternal(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync();
  const token = data;

  await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: "token" }
  );

  return token;
}
