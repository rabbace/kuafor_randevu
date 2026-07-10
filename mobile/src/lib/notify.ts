import { supabase } from "@/lib/supabase";

/**
 * Randevunun karşı tarafına (müşteri↔berber) anlık bildirim gönderir.
 * Token'lar sunucu tarafı RPC ile alınır (yalnızca randevunun tarafları erişebilir).
 * Hatalar sessizce yutulur: bildirim, ana akışı asla bozmamalı.
 */
export async function notifyAppointmentParty(
  appointmentId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const { data } = await supabase.rpc("get_appointment_party_tokens", {
      p_appointment_id: appointmentId,
    });
    const tokens = ((data as { token: string }[]) ?? []).map((r) => r.token);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // Bildirim başarısızlığı ana akışı etkilemez.
  }
}

/** Randevu durum değişimlerinde karşı tarafa gidecek bildirim metinleri. */
export const STATUS_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  confirmed: { title: "Randevun Onaylandı ✅", body: "Randevu talebin onaylandı. Detaylar uygulamada." },
  rejected: { title: "Randevu Talebi Reddedildi", body: "Maalesef bu randevu talebi kabul edilemedi. Başka bir saat deneyebilirsin." },
  cancelled: { title: "Randevu İptal Edildi", body: "Bir randevu iptal edildi. Detaylar uygulamada." },
  completed: { title: "Teşekkürler! 💈", body: "Randevun tamamlandı. Deneyimini değerlendirmeyi unutma!" },
};
