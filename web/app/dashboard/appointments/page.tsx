import { createClient } from "@/lib/supabase/server";
import { AppointmentApprovalCard } from "@/components/appointments/AppointmentApprovalCard";
import type { AppointmentWithRelations } from "@/lib/types/database";

export default async function AppointmentsPage() {
  const supabase = createClient();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id, customer_id, salon_id, barber_id, service_id, start_time, end_time, status, notes, created_at, updated_at,
      customer:users!appointments_customer_id_fkey ( id, full_name, phone, avatar_url ),
      barber:barbers!appointments_barber_id_fkey ( id, title, user:users!barbers_user_id_fkey ( full_name ) ),
      service:services!appointments_service_id_fkey ( id, name, base_duration_minutes, price )
    `
    )
    .order("start_time", { ascending: true });

  if (error) {
    return <p className="p-6 text-red-500">Randevular yüklenemedi: {error.message}</p>;
  }

  const list = (appointments ?? []) as unknown as AppointmentWithRelations[];
  const pending = list.filter((a) => a.status === "pending");
  const others = list.filter((a) => a.status !== "pending");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Randevular</h1>
        <p className="text-sm text-neutral-500">Onay bekleyen randevuları yönetin.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Onay Bekleyenler ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-neutral-500">Onay bekleyen randevu yok.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {pending.map((appointment) => (
            <AppointmentApprovalCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Geçmiş / Diğer
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((appointment) => (
            <AppointmentApprovalCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      </section>
    </div>
  );
}
