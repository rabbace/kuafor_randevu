// Supabase Edge Function — pg_cron tarafından her 10-15 dakikada bir tetiklenir.
// Randevu başlangıcına 2 saat kalan, henüz hatırlatma bildirimi gönderilmemiş
// onaylı randevular için Expo push bildirimi yollar.
//
// Deploy: supabase functions deploy send-appointment-reminders
// Cron (Supabase Dashboard > Database > Cron Jobs):
//   select cron.schedule('appointment-reminders', '*/10 * * * *',
//     $$ select net.http_post(
//          url:='https://<project-ref>.supabase.co/functions/v1/send-appointment-reminders',
//          headers:='{"Authorization": "Bearer <service-role-key>"}'::jsonb
--        ) $$);

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPushNotifications } from "../_shared/expoPush.ts";

const REMINDER_WINDOW_MINUTES = 5; // 2 saat öncesinden +/- bu pencere içinde olanları yakala

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const targetStart = new Date(now.getTime() + (120 - REMINDER_WINDOW_MINUTES) * 60_000);
  const targetEnd = new Date(now.getTime() + (120 + REMINDER_WINDOW_MINUTES) * 60_000);

  const { data: targets, error } = await supabase
    .from("appointment_reminder_targets")
    .select("appointment_id, start_time, salon_name, push_token")
    .gte("start_time", targetStart.toISOString())
    .lte("start_time", targetEnd.toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const { data: alreadySent } = await supabase
    .from("appointment_reminders_sent")
    .select("appointment_id")
    .in("appointment_id", (targets ?? []).map((t) => t.appointment_id));

  const sentIds = new Set((alreadySent ?? []).map((r) => r.appointment_id));
  const pending = (targets ?? []).filter((t) => !sentIds.has(t.appointment_id));

  await sendExpoPushNotifications(
    pending.map((t) => ({
      to: t.push_token,
      title: "Randevu Hatırlatması",
      body: `${t.salon_name} salonundaki randevun 2 saat sonra başlıyor.`,
      data: { appointmentId: t.appointment_id },
    }))
  );

  if (pending.length > 0) {
    await supabase
      .from("appointment_reminders_sent")
      .insert(pending.map((t) => ({ appointment_id: t.appointment_id })));
  }

  return new Response(JSON.stringify({ sent: pending.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
