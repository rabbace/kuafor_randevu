import { createClient } from "@/lib/supabase/server";
import { AddEmployeeForm } from "@/components/employees/AddEmployeeForm";
import { Badge } from "@/components/ui/Card";
import type { BarberRow, UserRow } from "@/lib/types/database";

export default async function EmployeesPage() {
  const supabase = createClient();

  const { data: authData } = await supabase.auth.getUser();

  const { data: ownerSalon } = await supabase
    .from("salons")
    .select("id, name")
    .eq("owner_id", authData.user?.id ?? "")
    .maybeSingle();

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, title, speed_multiplier, auto_approve_appointments, user:users!barbers_user_id_fkey(full_name, phone)")
    .eq("salon_id", ownerSalon?.id ?? "");

  type BarberWithUser = BarberRow & { user: Pick<UserRow, "full_name" | "phone"> };
  const list = (barbers ?? []) as unknown as BarberWithUser[];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Çalışanlar</h1>
        <p className="text-sm text-neutral-500">{ownerSalon?.name}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {list.map((barber) => (
            <div
              key={barber.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                  {(barber.user.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{barber.user.full_name}</p>
                  <p className="text-sm text-neutral-500">{barber.title}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <span className="font-medium text-neutral-900">Hız ×{barber.speed_multiplier}</span>
                <Badge
                  className={
                    barber.auto_approve_appointments
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }
                >
                  {barber.auto_approve_appointments ? "Otomatik Onay" : "Manuel Onay"}
                </Badge>
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <p className="text-sm text-neutral-500">Henüz çalışan eklenmedi.</p>
          )}
        </section>

        {ownerSalon && <AddEmployeeForm salonId={ownerSalon.id} />}
      </div>
    </div>
  );
}
