// Supabase Edge Function — bir randevu iptal/red edildiğinde Database Webhook
// (appointments tablosu UPDATE, status = 'cancelled' veya 'rejected') tarafından tetiklenir.
// Aynı salon + tarih için yedek listede bekleyen ilk müşteriye push bildirimi gönderir.
//
// Deploy: supabase functions deploy notify-waitlist
// Webhook (Supabase Dashboard > Database > Webhooks):
//   Table: appointments, Event: UPDATE, Condition: status in ('cancelled','rejected')
//   URL: https://<project-ref>.supabase.co/functions/v1/notify-waitlist

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendExpoPushNotifications } from "../_shared/expoPush.ts";

interface WebhookPayload {
  record: {
    id: string;
    salon_id: string;
    barber_id: string;
    start_time: string;
  };
}

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const cancelledAppointment = payload.record;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const desiredDate = cancelledAppointment.start_time.slice(0, 10);

  const { data: waitlistEntry } = await supabase
    .from("waitlist")
    .select("id, customer_id")
    .eq("salon_id", cancelledAppointment.salon_id)
    .eq("desired_date", desiredDate)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waitlistEntry) {
    return new Response(JSON.stringify({ notified: false }), { status: 200 });
  }

  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", waitlistEntry.customer_id);

  await sendExpoPushNotifications(
    (tokens ?? []).map((t) => ({
      to: t.token,
      title: "Bir Yer Açıldı!",
      body: "Yedek listesinde olduğun saatte iptal oldu. Hemen randevunu al.",
      data: { salonId: cancelledAppointment.salon_id, barberId: cancelledAppointment.barber_id },
    }))
  );

  await supabase
    .from("waitlist")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", waitlistEntry.id);

  return new Response(JSON.stringify({ notified: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
